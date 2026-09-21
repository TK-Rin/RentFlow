import os

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-me")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_MINUTES = int(os.getenv("JWT_EXPIRE_MINUTES", "60"))

# PromptPay ID (mobile number or national ID) that receives simulated
# subscription payments. Format: 10-digit phone (0812345678) or 13-digit ID.
PROMPTPAY_ID = os.getenv("PROMPTPAY_ID", "0812345678")

PRO_MONTHLY_PRICE = 299.00

# Free-tier portfolio limits. `None` means unlimited (used for Pro).
TIER_LIMITS = {
    "free": {"max_properties": 1, "max_units": 3},
    "pro": {"max_properties": None, "max_units": None},
}

LATE_FEE_RATE = 0.02  # 2% of the outstanding balance per overdue period
