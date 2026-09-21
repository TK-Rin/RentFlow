from contextlib import asynccontextmanager

from fastapi import FastAPI

from database import connect_db, disconnect_db, setup_db
from routes.admin import router as admin_router
from routes.auth import router as auth_router
from routes.billing import router as billing_router
from routes.leases import router as leases_router
from routes.meters import router as meters_router
from routes.properties import router as properties_router
from routes.subscriptions import router as subscriptions_router
from routes.tenants import router as tenants_router
from routes.units import router as units_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await connect_db()
    await setup_db()
    yield
    await disconnect_db()


app = FastAPI(title="RentFlow API", lifespan=lifespan)

app.include_router(auth_router, prefix="/api")
app.include_router(properties_router, prefix="/api")
app.include_router(units_router, prefix="/api")
app.include_router(tenants_router, prefix="/api")
app.include_router(leases_router, prefix="/api")
app.include_router(meters_router, prefix="/api")
app.include_router(billing_router, prefix="/api")
app.include_router(subscriptions_router, prefix="/api")
app.include_router(admin_router, prefix="/api")


@app.get("/")
async def root():
    return {"message": "RentFlow API"}
