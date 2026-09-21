from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from database import database
from security import get_current_user, tier_limit

router = APIRouter()


class PropertyIn(BaseModel):
    name: str = Field(min_length=1, max_length=255)
    address: str | None = None


class PropertyOut(PropertyIn):
    id: int
    owner_id: int


async def _get_owned_property(property_id: int, owner_id: int):
    row = await database.fetch_one(
        "SELECT * FROM properties WHERE id = :id AND owner_id = :owner_id",
        {"id": property_id, "owner_id": owner_id},
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Property not found")
    return row


@router.get("/properties", response_model=list[PropertyOut])
async def list_properties(user=Depends(get_current_user)):
    rows = await database.fetch_all(
        "SELECT * FROM properties WHERE owner_id = :owner_id ORDER BY created_at DESC",
        {"owner_id": user["id"]},
    )
    return [PropertyOut(**dict(row)) for row in rows]


@router.post("/properties", response_model=PropertyOut, status_code=status.HTTP_201_CREATED)
async def create_property(payload: PropertyIn, user=Depends(get_current_user)):
    limit = tier_limit(user, "max_properties")
    if limit is not None:
        count = await database.fetch_val(
            "SELECT COUNT(*) FROM properties WHERE owner_id = :owner_id",
            {"owner_id": user["id"]},
        )
        if count >= limit:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    f"The Free plan allows up to {limit} propert"
                    f"{'y' if limit == 1 else 'ies'}. Upgrade to Pro for unlimited properties."
                ),
            )

    row = await database.fetch_one(
        """
        INSERT INTO properties (owner_id, name, address)
        VALUES (:owner_id, :name, :address)
        RETURNING *
        """,
        {"owner_id": user["id"], "name": payload.name, "address": payload.address},
    )
    return PropertyOut(**dict(row))


@router.get("/properties/{property_id}", response_model=PropertyOut)
async def get_property(property_id: int, user=Depends(get_current_user)):
    row = await _get_owned_property(property_id, user["id"])
    return PropertyOut(**dict(row))


@router.put("/properties/{property_id}", response_model=PropertyOut)
async def update_property(property_id: int, payload: PropertyIn, user=Depends(get_current_user)):
    await _get_owned_property(property_id, user["id"])
    row = await database.fetch_one(
        """
        UPDATE properties SET name = :name, address = :address
        WHERE id = :id
        RETURNING *
        """,
        {"id": property_id, "name": payload.name, "address": payload.address},
    )
    return PropertyOut(**dict(row))


@router.delete("/properties/{property_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_property(property_id: int, user=Depends(get_current_user)):
    await _get_owned_property(property_id, user["id"])
    await database.execute("DELETE FROM properties WHERE id = :id", {"id": property_id})
