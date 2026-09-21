from datetime import date

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from database import database
from routes.tenants import _get_owned_tenant
from routes.units import _get_owned_unit
from security import get_current_user

router = APIRouter()


class LeaseIn(BaseModel):
    unit_id: int
    tenant_id: int
    start_date: date
    end_date: date | None = None
    deposit: float = Field(ge=0, default=0)
    rent_amount: float = Field(gt=0)
    billing_day: int = Field(ge=1, le=28, default=1)


class LeaseOut(LeaseIn):
    id: int
    status: str


async def _get_owned_lease(lease_id: int, owner_id: int):
    row = await database.fetch_one(
        """
        SELECT leases.* FROM leases
        JOIN units ON units.id = leases.unit_id
        JOIN properties ON properties.id = units.property_id
        WHERE leases.id = :lease_id AND properties.owner_id = :owner_id
        """,
        {"lease_id": lease_id, "owner_id": owner_id},
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Lease not found")
    return row


@router.get("/leases", response_model=list[LeaseOut])
async def list_leases(unit_id: int | None = None, user=Depends(get_current_user)):
    query = """
        SELECT leases.* FROM leases
        JOIN units ON units.id = leases.unit_id
        JOIN properties ON properties.id = units.property_id
        WHERE properties.owner_id = :owner_id
    """
    values = {"owner_id": user["id"]}
    if unit_id is not None:
        query += " AND leases.unit_id = :unit_id"
        values["unit_id"] = unit_id
    query += " ORDER BY leases.start_date DESC"

    rows = await database.fetch_all(query, values)
    return [LeaseOut(**dict(row)) for row in rows]


@router.post("/leases", response_model=LeaseOut, status_code=status.HTTP_201_CREATED)
async def create_lease(payload: LeaseIn, user=Depends(get_current_user)):
    await _get_owned_unit(payload.unit_id, user["id"])
    await _get_owned_tenant(payload.tenant_id, user["id"])

    row = await database.fetch_one(
        """
        INSERT INTO leases (unit_id, tenant_id, start_date, end_date, deposit, rent_amount, billing_day)
        VALUES (:unit_id, :tenant_id, :start_date, :end_date, :deposit, :rent_amount, :billing_day)
        RETURNING *
        """,
        payload.model_dump(),
    )
    await database.execute(
        "UPDATE units SET status = 'occupied' WHERE id = :id", {"id": payload.unit_id}
    )
    return LeaseOut(**dict(row))


@router.post("/leases/{lease_id}/end", response_model=LeaseOut)
async def end_lease(lease_id: int, user=Depends(get_current_user)):
    lease = await _get_owned_lease(lease_id, user["id"])
    row = await database.fetch_one(
        """
        UPDATE leases SET status = 'ended', end_date = COALESCE(end_date, CURRENT_DATE)
        WHERE id = :id
        RETURNING *
        """,
        {"id": lease_id},
    )
    await database.execute(
        "UPDATE units SET status = 'vacant' WHERE id = :id", {"id": lease["unit_id"]}
    )
    return LeaseOut(**dict(row))
