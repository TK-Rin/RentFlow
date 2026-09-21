import os

import bcrypt
from databases import Database

POSTGRES_USER = os.getenv("POSTGRES_USER", "temp")
POSTGRES_PASSWORD = os.getenv("POSTGRES_PASSWORD", "temp")
POSTGRES_DB = os.getenv("POSTGRES_DB", "advcompro")
POSTGRES_HOST = os.getenv("POSTGRES_HOST", "db")

DATABASE_URL = (
    f"postgresql+asyncpg://{POSTGRES_USER}:{POSTGRES_PASSWORD}"
    f"@{POSTGRES_HOST}/{POSTGRES_DB}"
)

database = Database(DATABASE_URL)


async def connect_db():
    await database.connect()


async def disconnect_db():
    await database.disconnect()


# ---------------------------------------------------------------------------
# Schema
#
# Ownership chain: users -> properties -> units -> leases -> invoices ->
# invoice_lines. Every list/read query in the route layer is scoped by the
# authenticated landlord id at the top of this chain, so one landlord can
# never read another landlord's data.
# ---------------------------------------------------------------------------

SCHEMA_STATEMENTS = [
    """
    CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        email         VARCHAR(255) UNIQUE NOT NULL,
        full_name     VARCHAR(255) NOT NULL,
        password_hash TEXT NOT NULL,
        role          VARCHAR(20) NOT NULL DEFAULT 'user'
                      CHECK (role IN ('admin', 'user')),
        tier          VARCHAR(20) NOT NULL DEFAULT 'free'
                      CHECK (tier IN ('free', 'pro')),
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS properties (
        id         SERIAL PRIMARY KEY,
        owner_id   INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        name       VARCHAR(255) NOT NULL,
        address    TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS units (
        id          SERIAL PRIMARY KEY,
        property_id INTEGER NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
        unit_no     VARCHAR(50) NOT NULL,
        base_rent   NUMERIC(12, 2) NOT NULL DEFAULT 0,
        water_rate  NUMERIC(12, 2) NOT NULL DEFAULT 0,
        elec_rate   NUMERIC(12, 2) NOT NULL DEFAULT 0,
        status      VARCHAR(20) NOT NULL DEFAULT 'vacant'
                    CHECK (status IN ('vacant', 'occupied')),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (property_id, unit_no)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS tenants (
        id           SERIAL PRIMARY KEY,
        owner_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        full_name    VARCHAR(255) NOT NULL,
        phone        VARCHAR(50),
        line_user_id VARCHAR(255),
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS leases (
        id          SERIAL PRIMARY KEY,
        unit_id     INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
        tenant_id   INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
        start_date  DATE NOT NULL,
        end_date    DATE,
        deposit     NUMERIC(12, 2) NOT NULL DEFAULT 0,
        rent_amount NUMERIC(12, 2) NOT NULL,
        billing_day SMALLINT NOT NULL DEFAULT 1 CHECK (billing_day BETWEEN 1 AND 28),
        status      VARCHAR(20) NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'ended')),
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS meter_readings (
        id          SERIAL PRIMARY KEY,
        unit_id     INTEGER NOT NULL REFERENCES units(id) ON DELETE CASCADE,
        period      VARCHAR(7) NOT NULL,
        water_prev  NUMERIC(12, 2) NOT NULL DEFAULT 0,
        water_curr  NUMERIC(12, 2) NOT NULL,
        elec_prev   NUMERIC(12, 2) NOT NULL DEFAULT 0,
        elec_curr   NUMERIC(12, 2) NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (unit_id, period)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS invoices (
        id         SERIAL PRIMARY KEY,
        lease_id   INTEGER NOT NULL REFERENCES leases(id) ON DELETE CASCADE,
        period     VARCHAR(7) NOT NULL,
        issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
        due_date   DATE NOT NULL,
        subtotal   NUMERIC(12, 2) NOT NULL DEFAULT 0,
        late_fee   NUMERIC(12, 2) NOT NULL DEFAULT 0,
        total      NUMERIC(12, 2) NOT NULL DEFAULT 0,
        status     VARCHAR(20) NOT NULL DEFAULT 'sent'
                   CHECK (status IN ('draft', 'sent', 'partial', 'paid', 'overdue')),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE (lease_id, period)
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS invoice_lines (
        id          SERIAL PRIMARY KEY,
        invoice_id  INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        type        VARCHAR(20) NOT NULL
                    CHECK (type IN ('rent', 'water', 'electric', 'late_fee', 'other')),
        description VARCHAR(255) NOT NULL,
        quantity    NUMERIC(12, 4) NOT NULL DEFAULT 1,
        unit_price  NUMERIC(12, 4) NOT NULL DEFAULT 0,
        amount      NUMERIC(12, 2) NOT NULL
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS payments (
        id         SERIAL PRIMARY KEY,
        invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
        amount     NUMERIC(12, 2) NOT NULL,
        paid_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        method     VARCHAR(50) NOT NULL DEFAULT 'promptpay',
        note       TEXT
    )
    """,
    """
    CREATE TABLE IF NOT EXISTS transactions (
        id            SERIAL PRIMARY KEY,
        user_id       INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        plan          VARCHAR(20) NOT NULL DEFAULT 'pro',
        amount        NUMERIC(12, 2) NOT NULL,
        status        VARCHAR(20) NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending', 'paid', 'failed')),
        promptpay_ref VARCHAR(64) UNIQUE NOT NULL,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        paid_at       TIMESTAMPTZ
    )
    """,
]


async def setup_db():
    for statement in SCHEMA_STATEMENTS:
        await database.execute(statement)

    demo_password = bcrypt.hashpw(b"password", bcrypt.gensalt()).decode("utf-8")

    await database.execute(
        """
        INSERT INTO users (email, full_name, password_hash, role, tier)
        VALUES (:email, :full_name, :password_hash, :role, :tier)
        ON CONFLICT (email) DO NOTHING
        """,
        {
            "email": "admin@rentflow.app",
            "full_name": "RentFlow Admin",
            "password_hash": demo_password,
            "role": "admin",
            "tier": "pro",
        },
    )
    await database.execute(
        """
        INSERT INTO users (email, full_name, password_hash, role, tier)
        VALUES (:email, :full_name, :password_hash, :role, :tier)
        ON CONFLICT (email) DO NOTHING
        """,
        {
            "email": "demo@example.com",
            "full_name": "Khun Nok (Demo Landlord)",
            "password_hash": demo_password,
            "role": "user",
            "tier": "free",
        },
    )


# ---------------------------------------------------------------------------
# Users
# ---------------------------------------------------------------------------

async def get_user_by_email(email: str):
    return await database.fetch_one(
        "SELECT * FROM users WHERE email = :email", {"email": email}
    )


async def get_user_by_id(user_id: int):
    return await database.fetch_one(
        "SELECT * FROM users WHERE id = :id", {"id": user_id}
    )


async def create_user(email: str, full_name: str, password_hash: str):
    return await database.fetch_one(
        """
        INSERT INTO users (email, full_name, password_hash)
        VALUES (:email, :full_name, :password_hash)
        RETURNING *
        """,
        {"email": email, "full_name": full_name, "password_hash": password_hash},
    )


async def set_user_tier(user_id: int, tier: str):
    await database.execute(
        "UPDATE users SET tier = :tier WHERE id = :id",
        {"id": user_id, "tier": tier},
    )
