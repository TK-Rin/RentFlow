from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from database import database
from security import get_current_user

router = APIRouter()


class TenantIn(BaseModel):
    full_name: str = Field(min_length=1, max_length=255)
    phone: str | None = None
    line_user_id: str | None = None


class TenantOut(TenantIn):
    id: int
    owner_id: int


async def _get_owned_tenant(tenant_id: int, owner_id: int):
    row = await database.fetch_one(
        "SELECT * FROM tenants WHERE id = :id AND owner_id = :owner_id",
        {"id": tenant_id, "owner_id": owner_id},
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Tenant not found")
    return row


@router.get("/tenants", response_model=list[TenantOut])
async def list_tenants(user=Depends(get_current_user)):
    rows = await database.fetch_all(
        "SELECT * FROM tenants WHERE owner_id = :owner_id ORDER BY full_name",
        {"owner_id": user["id"]},
    )
    return [TenantOut(**dict(row)) for row in rows]


@router.post("/tenants", response_model=TenantOut, status_code=status.HTTP_201_CREATED)
async def create_tenant(payload: TenantIn, user=Depends(get_current_user)):
    row = await database.fetch_one(
        """
        INSERT INTO tenants (owner_id, full_name, phone, line_user_id)
        VALUES (:owner_id, :full_name, :phone, :line_user_id)
        RETURNING *
        """,
        {"owner_id": user["id"], **payload.model_dump()},
    )
    return TenantOut(**dict(row))


@router.put("/tenants/{tenant_id}", response_model=TenantOut)
async def update_tenant(tenant_id: int, payload: TenantIn, user=Depends(get_current_user)):
    await _get_owned_tenant(tenant_id, user["id"])
    row = await database.fetch_one(
        """
        UPDATE tenants SET full_name = :full_name, phone = :phone, line_user_id = :line_user_id
        WHERE id = :id
        RETURNING *
        """,
        {"id": tenant_id, **payload.model_dump()},
    )
    return TenantOut(**dict(row))


@router.delete("/tenants/{tenant_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_tenant(tenant_id: int, user=Depends(get_current_user)):
    await _get_owned_tenant(tenant_id, user["id"])
    await database.execute("DELETE FROM tenants WHERE id = :id", {"id": tenant_id})
