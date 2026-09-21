from datetime import date, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from config import LATE_FEE_RATE
from database import database
from security import get_current_user, require_tier
from services.billing import MeterRollbackError, build_monthly_invoice, invoice_total, apply_payment

router = APIRouter()


class InvoiceLineOut(BaseModel):
    id: int
    type: str
    description: str
    quantity: float
    unit_price: float
    amount: float


class InvoiceOut(BaseModel):
    id: int
    lease_id: int
    period: str
    issue_date: date
    due_date: date
    subtotal: float
    late_fee: float
    total: float
    status: str
    lines: list[InvoiceLineOut] = []


class PaymentIn(BaseModel):
    amount: float = Field(gt=0)
    method: str = "promptpay"
    note: str | None = None


class PaymentOut(PaymentIn):
    id: int
    invoice_id: int


async def _lease_for_owner(lease_id: int, owner_id: int):
    row = await database.fetch_one(
        """
        SELECT leases.*, units.water_rate, units.elec_rate, units.id AS unit_id
        FROM leases
        JOIN units ON units.id = leases.unit_id
        JOIN properties ON properties.id = units.property_id
        WHERE leases.id = :lease_id AND properties.owner_id = :owner_id
        """,
        {"lease_id": lease_id, "owner_id": owner_id},
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lease not found")
    return row


async def _prior_outstanding_balance(lease_id: int) -> float:
    row = await database.fetch_one(
        """
        SELECT total FROM invoices
        WHERE lease_id = :lease_id AND status IN ('sent', 'partial', 'overdue')
        ORDER BY period DESC
        LIMIT 1
        """,
        {"lease_id": lease_id},
    )
    return float(row["total"]) if row else 0.0


async def _generate_invoice_for_lease(lease_id: int, period: str, owner_id: int) -> dict:
    lease = await _lease_for_owner(lease_id, owner_id)

    existing = await database.fetch_one(
        "SELECT id FROM invoices WHERE lease_id = :lease_id AND period = :period",
        {"lease_id": lease_id, "period": period},
    )
    if existing is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An invoice for {period} already exists for this lease",
        )

    reading = await database.fetch_one(
        "SELECT * FROM meter_readings WHERE unit_id = :unit_id AND period = :period",
        {"unit_id": lease["unit_id"], "period": period},
    )
    if reading is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No meter reading recorded for this unit and period yet",
        )

    prior_balance = await _prior_outstanding_balance(lease_id)

    try:
        lines = build_monthly_invoice(
            period=period,
            rent_amount=lease["rent_amount"],
            lease_start=lease["start_date"],
            lease_end=lease["end_date"],
            water_prev=reading["water_prev"],
            water_curr=reading["water_curr"],
            water_rate=lease["water_rate"],
            elec_prev=reading["elec_prev"],
            elec_curr=reading["elec_curr"],
            elec_rate=lease["elec_rate"],
            prior_outstanding_balance=prior_balance,
            late_fee_rate=LATE_FEE_RATE,
        )
    except MeterRollbackError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    total = invoice_total(lines)
    late_fee_line = next((line for line in lines if line.type == "late_fee"), None)
    late_fee = late_fee_line.amount if late_fee_line else 0
    subtotal = total - late_fee
    issue_date = date.today()
    due_date = issue_date + timedelta(days=7)

    invoice = await database.fetch_one(
        """
        INSERT INTO invoices (lease_id, period, issue_date, due_date, subtotal, late_fee, total, status)
        VALUES (:lease_id, :period, :issue_date, :due_date, :subtotal, :late_fee, :total, 'sent')
        RETURNING *
        """,
        {
            "lease_id": lease_id,
            "period": period,
            "issue_date": issue_date,
            "due_date": due_date,
            "subtotal": subtotal,
            "late_fee": late_fee,
            "total": total,
        },
    )

    for line in lines:
        await database.execute(
            """
            INSERT INTO invoice_lines (invoice_id, type, description, quantity, unit_price, amount)
            VALUES (:invoice_id, :type, :description, :quantity, :unit_price, :amount)
            """,
            {
                "invoice_id": invoice["id"],
                "type": line.type,
                "description": line.description,
                "quantity": line.quantity,
                "unit_price": line.unit_price,
                "amount": line.amount,
            },
        )

    return dict(invoice)


async def _hydrate_invoice(invoice_row: dict) -> InvoiceOut:
    lines = await database.fetch_all(
        "SELECT * FROM invoice_lines WHERE invoice_id = :invoice_id ORDER BY id",
        {"invoice_id": invoice_row["id"]},
    )
    return InvoiceOut(
        **invoice_row,
        lines=[InvoiceLineOut(**dict(line)) for line in lines],
    )


class GenerateInvoiceRequest(BaseModel):
    lease_id: int
    period: str = Field(pattern=r"^\d{4}-\d{2}$")


@router.post("/billing/generate", response_model=InvoiceOut, status_code=status.HTTP_201_CREATED)
async def generate_invoice(payload: GenerateInvoiceRequest, user=Depends(get_current_user)):
    """Free-tier flow: generate one invoice for one lease at a time."""

    invoice = await _generate_invoice_for_lease(payload.lease_id, payload.period, user["id"])
    return await _hydrate_invoice(invoice)


class GenerateBulkRequest(BaseModel):
    property_id: int
    period: str = Field(pattern=r"^\d{4}-\d{2}$")


@router.post("/billing/generate-bulk", response_model=list[InvoiceOut])
async def generate_bulk_invoices(
    payload: GenerateBulkRequest, user=Depends(require_tier("pro"))
):
    """Pro-only flow: one click bills every active lease in a property."""

    leases = await database.fetch_all(
        """
        SELECT leases.id FROM leases
        JOIN units ON units.id = leases.unit_id
        WHERE units.property_id = :property_id AND leases.status = 'active'
        """,
        {"property_id": payload.property_id},
    )

    results = []
    errors = []
    for lease in leases:
        try:
            invoice = await _generate_invoice_for_lease(lease["id"], payload.period, user["id"])
            results.append(await _hydrate_invoice(invoice))
        except HTTPException as exc:
            errors.append({"lease_id": lease["id"], "detail": exc.detail})

    if not results and errors:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=errors)

    return results


@router.get("/invoices", response_model=list[InvoiceOut])
async def list_invoices(
    property_id: int | None = None,
    lease_id: int | None = None,
    user=Depends(get_current_user),
):
    query = """
        SELECT invoices.* FROM invoices
        JOIN leases ON leases.id = invoices.lease_id
        JOIN units ON units.id = leases.unit_id
        JOIN properties ON properties.id = units.property_id
        WHERE properties.owner_id = :owner_id
    """
    values = {"owner_id": user["id"]}
    if property_id is not None:
        query += " AND properties.id = :property_id"
        values["property_id"] = property_id
    if lease_id is not None:
        query += " AND leases.id = :lease_id"
        values["lease_id"] = lease_id
    query += " ORDER BY invoices.period DESC, invoices.id DESC"

    rows = await database.fetch_all(query, values)
    return [await _hydrate_invoice(dict(row)) for row in rows]


async def _owned_invoice(invoice_id: int, owner_id: int):
    row = await database.fetch_one(
        """
        SELECT invoices.* FROM invoices
        JOIN leases ON leases.id = invoices.lease_id
        JOIN units ON units.id = leases.unit_id
        JOIN properties ON properties.id = units.property_id
        WHERE invoices.id = :invoice_id AND properties.owner_id = :owner_id
        """,
        {"invoice_id": invoice_id, "owner_id": owner_id},
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invoice not found")
    return dict(row)


@router.get("/invoices/{invoice_id}", response_model=InvoiceOut)
async def get_invoice(invoice_id: int, user=Depends(get_current_user)):
    invoice = await _owned_invoice(invoice_id, user["id"])
    return await _hydrate_invoice(invoice)


@router.post(
    "/invoices/{invoice_id}/payments", response_model=PaymentOut, status_code=status.HTTP_201_CREATED
)
async def record_payment(invoice_id: int, payload: PaymentIn, user=Depends(get_current_user)):
    invoice = await _owned_invoice(invoice_id, user["id"])

    already_paid = await database.fetch_val(
        "SELECT COALESCE(SUM(amount), 0) FROM payments WHERE invoice_id = :invoice_id",
        {"invoice_id": invoice_id},
    )

    _, new_status = apply_payment(invoice["total"], already_paid, payload.amount)

    payment = await database.fetch_one(
        """
        INSERT INTO payments (invoice_id, amount, method, note)
        VALUES (:invoice_id, :amount, :method, :note)
        RETURNING *
        """,
        {"invoice_id": invoice_id, **payload.model_dump()},
    )
    await database.execute(
        "UPDATE invoices SET status = :status WHERE id = :id",
        {"status": new_status, "id": invoice_id},
    )

    return PaymentOut(**dict(payment))
