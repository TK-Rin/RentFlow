from fastapi import APIRouter, Depends
from pydantic import BaseModel

from database import database
from security import require_role

router = APIRouter()


class TierCount(BaseModel):
    tier: str
    count: int


class MonthlyPoint(BaseModel):
    month: str
    value: float


class RecentTransaction(BaseModel):
    id: int
    user_email: str
    amount: float
    status: str
    created_at: str


class AdminStats(BaseModel):
    total_users: int
    users_by_tier: list[TierCount]
    active_users_30d: int
    mrr: float
    arr: float
    conversion_rate: float
    total_rent_volume: float
    occupancy_rate: float
    mrr_trend: list[MonthlyPoint]
    signups_by_tier_weekly: list[MonthlyPoint]
    recent_transactions: list[RecentTransaction]


@router.get("/admin/stats", response_model=AdminStats, dependencies=[Depends(require_role("admin"))])
async def admin_stats():
    total_users = await database.fetch_val("SELECT COUNT(*) FROM users")

    tier_rows = await database.fetch_all(
        "SELECT tier, COUNT(*) AS count FROM users GROUP BY tier"
    )
    users_by_tier = [TierCount(tier=row["tier"], count=row["count"]) for row in tier_rows]

    active_users_30d = await database.fetch_val(
        """
        SELECT COUNT(DISTINCT owner_id) FROM (
            SELECT owner_id FROM properties WHERE created_at >= NOW() - INTERVAL '30 days'
            UNION
            SELECT owner_id FROM tenants WHERE created_at >= NOW() - INTERVAL '30 days'
        ) AS active
        """
    )

    pro_count = await database.fetch_val(
        "SELECT COUNT(*) FROM users WHERE tier = 'pro' AND role = 'user'"
    )
    mrr_row = await database.fetch_val(
        """
        SELECT COALESCE(SUM(amount), 0) FROM transactions
        WHERE status = 'paid' AND date_trunc('month', paid_at) = date_trunc('month', NOW())
        """
    )
    mrr = float(mrr_row or 0)
    arr = mrr * 12

    conversion_rate = (pro_count / total_users * 100) if total_users else 0.0

    total_rent_volume = float(
        await database.fetch_val("SELECT COALESCE(SUM(amount), 0) FROM payments") or 0
    )

    occupied = await database.fetch_val("SELECT COUNT(*) FROM units WHERE status = 'occupied'")
    total_units = await database.fetch_val("SELECT COUNT(*) FROM units")
    occupancy_rate = (occupied / total_units * 100) if total_units else 0.0

    mrr_trend_rows = await database.fetch_all(
        """
        SELECT to_char(date_trunc('month', paid_at), 'YYYY-MM') AS month,
               SUM(amount) AS value
        FROM transactions
        WHERE status = 'paid'
        GROUP BY 1
        ORDER BY 1
        LIMIT 12
        """
    )
    mrr_trend = [MonthlyPoint(month=row["month"], value=float(row["value"])) for row in mrr_trend_rows]

    signup_rows = await database.fetch_all(
        """
        SELECT to_char(date_trunc('week', created_at), 'YYYY-MM-DD') AS week,
               tier, COUNT(*) AS count
        FROM users
        GROUP BY 1, tier
        ORDER BY 1
        LIMIT 24
        """
    )
    signups_by_tier_weekly = [
        MonthlyPoint(month=f"{row['week']} ({row['tier']})", value=row["count"])
        for row in signup_rows
    ]

    tx_rows = await database.fetch_all(
        """
        SELECT transactions.id, users.email AS user_email, transactions.amount,
               transactions.status, transactions.created_at
        FROM transactions
        JOIN users ON users.id = transactions.user_id
        ORDER BY transactions.created_at DESC
        LIMIT 20
        """
    )
    recent_transactions = [
        RecentTransaction(
            id=row["id"],
            user_email=row["user_email"],
            amount=float(row["amount"]),
            status=row["status"],
            created_at=row["created_at"].isoformat(),
        )
        for row in tx_rows
    ]

    return AdminStats(
        total_users=total_users,
        users_by_tier=users_by_tier,
        active_users_30d=active_users_30d,
        mrr=mrr,
        arr=arr,
        conversion_rate=round(conversion_rate, 2),
        total_rent_volume=total_rent_volume,
        occupancy_rate=round(occupancy_rate, 2),
        mrr_trend=mrr_trend,
        signups_by_tier_weekly=signups_by_tier_weekly,
        recent_transactions=recent_transactions,
    )


class UserAdminOut(BaseModel):
    id: int
    email: str
    full_name: str
    role: str
    tier: str


@router.get(
    "/admin/users", response_model=list[UserAdminOut], dependencies=[Depends(require_role("admin"))]
)
async def list_users():
    rows = await database.fetch_all("SELECT * FROM users ORDER BY created_at DESC")
    return [UserAdminOut(**dict(row)) for row in rows]
