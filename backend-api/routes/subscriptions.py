import secrets

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel

from config import PRO_MONTHLY_PRICE, PROMPTPAY_ID, TIER_LIMITS
from database import database, set_user_tier
from security import get_current_user
from services.promptpay import generate_promptpay_payload

router = APIRouter()


class PlanOut(BaseModel):
    id: str
    name: str
    price_per_month: float
    max_properties: int | None
    max_units: int | None
    features: list[str]


@router.get("/subscriptions/plans", response_model=list[PlanOut])
async def list_plans():
    return [
        PlanOut(
            id="free",
            name="Free",
            price_per_month=0,
            max_properties=TIER_LIMITS["free"]["max_properties"],
            max_units=TIER_LIMITS["free"]["max_units"],
            features=[
                "Up to 3 units",
                "Manual invoice generation, one at a time",
                "PromptPay QR on every invoice",
            ],
        ),
        PlanOut(
            id="pro",
            name="Pro",
            price_per_month=PRO_MONTHLY_PRICE,
            max_properties=TIER_LIMITS["pro"]["max_properties"],
            max_units=TIER_LIMITS["pro"]["max_units"],
            features=[
                "Unlimited units and properties",
                "Bulk monthly invoice run",
                "Automatic utility calculation from meter readings",
                "PDF invoice and receipt export",
                "LINE notifications to tenants",
                "Payment history export",
            ],
        ),
    ]


class CheckoutResponse(BaseModel):
    transaction_ref: str
    amount: float
    promptpay_payload: str


@router.post("/subscriptions/checkout", response_model=CheckoutResponse)
async def start_checkout(user=Depends(get_current_user)):
    if user["tier"] == "pro":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Already on Pro")

    ref = secrets.token_hex(8)
    await database.execute(
        """
        INSERT INTO transactions (user_id, plan, amount, status, promptpay_ref)
        VALUES (:user_id, 'pro', :amount, 'pending', :ref)
        """,
        {"user_id": user["id"], "amount": PRO_MONTHLY_PRICE, "ref": ref},
    )

    payload = generate_promptpay_payload(PROMPTPAY_ID, PRO_MONTHLY_PRICE)
    return CheckoutResponse(transaction_ref=ref, amount=PRO_MONTHLY_PRICE, promptpay_payload=payload)


class ConfirmRequest(BaseModel):
    transaction_ref: str


class ConfirmResponse(BaseModel):
    status: str
    tier: str


@router.post("/subscriptions/confirm", response_model=ConfirmResponse)
async def confirm_checkout(payload: ConfirmRequest, user=Depends(get_current_user)):
    """Stands in for a bank/payment-gateway webhook. In production this
    endpoint would be called by PromptPay's payment provider with a signed
    request, not by the client - see the design document, Section 6."""

    transaction = await database.fetch_one(
        """
        SELECT * FROM transactions
        WHERE promptpay_ref = :ref AND user_id = :user_id AND status = 'pending'
        """,
        {"ref": payload.transaction_ref, "user_id": user["id"]},
    )
    if transaction is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No pending transaction with that reference for this account",
        )

    await database.execute(
        "UPDATE transactions SET status = 'paid', paid_at = NOW() WHERE id = :id",
        {"id": transaction["id"]},
    )
    await set_user_tier(user["id"], "pro")

    return ConfirmResponse(status="paid", tier="pro")


class TransactionOut(BaseModel):
    id: int
    plan: str
    amount: float
    status: str
    promptpay_ref: str


@router.get("/subscriptions/transactions", response_model=list[TransactionOut])
async def my_transactions(user=Depends(get_current_user)):
    rows = await database.fetch_all(
        "SELECT * FROM transactions WHERE user_id = :user_id ORDER BY created_at DESC",
        {"user_id": user["id"]},
    )
    return [TransactionOut(**dict(row)) for row in rows]
