# RentFlow

Rent and utility billing for landlords who own 3-50 units and are still
running the business from a notebook, a calculator, and a wall of LINE
chats. RentFlow turns a monthly meter reading into an itemised invoice
with a PromptPay QR code, tracks who has paid, and shows the landlord
(and, separately, the business behind RentFlow itself) one dashboard
instead of a dozen scattered records.

Built for the Advanced Computer Programming Mini Project, Department of
Robotics and AI Engineering, KMITL, on top of the
[acpapp boilerplate](https://github.com/syanyong/acpapp).

**Live demo:** _add the deployed URL here before the Week 5 submission_
**Design document:** _add the design document link here_

## Team

| Name | Student ID | Role |
| --- | --- | --- |
| _TBD_ | _TBD_ | Team lead / Backend |
| _TBD_ | _TBD_ | Backend / Database |
| _TBD_ | _TBD_ | Frontend |
| _TBD_ | _TBD_ | Frontend / Design |

## What it does

- **Portfolio registry** - properties, units, tenants, and leases, scoped
  per landlord.
- **Meter reading to invoice** - record a water/electric reading and the
  billing engine calculates consumption, prorates rent for mid-period
  move-ins, and applies a late fee to any prior unpaid balance.
- **PromptPay checkout** - a real EMVCo-format QR code on every invoice
  and on the Pro-plan upgrade flow.
- **Free / Pro tiers** - Free is capped at 3 units and 1 property with
  manual invoicing; Pro unlocks unlimited units and one-click bulk
  billing. Enforced server-side, not just hidden in the UI.
- **Admin analytics** - MRR/ARR, conversion rate, occupancy, and rent
  volume processed, admin-role only.

See the [design document](#) for the full requirements, schema, and
business rationale.

## Stack

- Next.js (Pages Router) + shadcn-style components + Tailwind CSS
- FastAPI + [`databases`](https://github.com/encode/databases) (async,
  raw SQL) + PostgreSQL
- JWT authentication, bcrypt password hashing
- Docker Compose for local development

## Run locally

```bash
git clone <this-repo-url>
cd "Mini Project"
docker compose up --build
```

Open:

- Frontend: `http://localhost:3000`
- FastAPI: `http://localhost:8000`
- FastAPI docs: `http://localhost:8000/docs`

### Demo accounts

| Role | Email | Password |
| --- | --- | --- |
| Landlord | `demo@example.com` | `password` |
| Admin | `admin@rentflow.app` | `password` |

### Running the backend outside Docker

```bash
cd backend-api
python -m venv .venv && .venv/Scripts/activate  # or source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # then point POSTGRES_HOST at your own Postgres
uvicorn app:app --reload
```

### Running the frontend outside Docker

```bash
cd nextjs
npm install
BACKEND_URL=http://127.0.0.1:8000 npm run dev
```

### Backend tests

The billing engine (proration, late fees, meter-rollback rejection,
partial payments) is pure and unit tested independently of the database:

```bash
cd backend-api
pip install -r requirements.txt
pytest tests/ -v
```

## Project structure

```text
.
├── docker-compose.yaml
├── backend-api/
│   ├── app.py                 # FastAPI app, router registration
│   ├── config.py               # env vars, tier limits, late fee rate
│   ├── database.py             # connection + schema + user queries
│   ├── security.py             # JWT auth, RBAC/tier dependencies
│   ├── services/
│   │   ├── billing.py          # the billing engine (pure functions)
│   │   └── promptpay.py        # EMVCo PromptPay QR payload generator
│   ├── routes/                 # one module per resource
│   └── tests/test_billing.py
└── nextjs/
    ├── components/ui/          # hand-rolled shadcn-style primitives
    ├── components/app-shell.js # auth-gated layout + nav for app pages
    ├── lib/api.js               # fetch wrapper, token storage
    └── pages/
        ├── index.js             # public landing page
        ├── login.js / register.js
        ├── app.js               # main workspace (properties/units/.../invoices)
        ├── pricing.js           # plans + simulated PromptPay checkout
        ├── account.js           # profile, tier, billing history
        └── admin.js             # admin-only business analytics
```

## Known limitations (by design, for this project's scope)

- PromptPay QR codes are generated in the real payload format, but
  *payment confirmation* is a mock endpoint standing in for a bank
  webhook - stated explicitly in the design document, Section 6.
- LINE notifications and PDF export are Pro-tier features planned for
  Week 3-4; the checkpoint above tracks what is wired so far.
