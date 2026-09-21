from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from database import database
from routes.properties import _get_owned_property
from security import get_current_user, tier_limit

router = APIRouter()


class UnitIn(BaseModel):
    unit_no: str = Field(min_length=1, max_length=50)
    base_rent: float = Field(ge=0)
    water_rate: float = Field(ge=0, default=0)
    elec_rate: float = Field(ge=0, default=0)
    status: str = Field(default="vacant", pattern="^(vacant|occupied)$")


class UnitOut(UnitIn):
    id: int
    property_id: int


async def _get_owned_unit(unit_id: int, owner_id: int):
    row = await database.fetch_one(
        """
        SELECT units.* FROM units
        JOIN properties ON properties.id = units.property_id
        WHERE units.id = :unit_id AND properties.owner_id = :owner_id
        """,
        {"unit_id": unit_id, "owner_id": owner_id},
    )
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Unit not found")
    return row


@router.get("/properties/{property_id}/units", response_model=list[UnitOut])
async def list_units(property_id: int, user=Depends(get_current_user)):
    await _get_owned_property(property_id, user["id"])
    rows = await database.fetch_all(
        "SELECT * FROM units WHERE property_id = :property_id ORDER BY unit_no",
        {"property_id": property_id},
    )
    return [UnitOut(**dict(row)) for row in rows]


@router.post(
    "/properties/{property_id}/units", response_model=UnitOut, status_code=status.HTTP_201_CREATED
)
async def create_unit(property_id: int, payload: UnitIn, user=Depends(get_current_user)):
    await _get_owned_property(property_id, user["id"])

    limit = tier_limit(user, "max_units")
    if limit is not None:
        count = await database.fetch_val(
            """
            SELECT COUNT(*) FROM units
            JOIN properties ON properties.id = units.property_id
            WHERE properties.owner_id = :owner_id
            """,
            {"owner_id": user["id"]},
        )
        if count >= limit:
            raise HTTPException(
                status_code=status.HTTP_402_PAYMENT_REQUIRED,
                detail=(
                    f"The Free plan allows up to {limit} units across all your "
                    "properties. Upgrade to Pro for unlimited units."
                ),
            )

    row = await database.fetch_one(
        """
        INSERT INTO units (property_id, unit_no, base_rent, water_rate, elec_rate, status)
        VALUES (:property_id, :unit_no, :base_rent, :water_rate, :elec_rate, :status)
        RETURNING *
        """,
        {"property_id": property_id, **payload.model_dump()},
    )
    return UnitOut(**dict(row))


@router.put("/units/{unit_id}", response_model=UnitOut)
async def update_unit(unit_id: int, payload: UnitIn, user=Depends(get_current_user)):
    await _get_owned_unit(unit_id, user["id"])
    row = await database.fetch_one(
        """
        UPDATE units
        SET unit_no = :unit_no, base_rent = :base_rent, water_rate = :water_rate,
            elec_rate = :elec_rate, status = :status
        WHERE id = :id
        RETURNING *
        """,
        {"id": unit_id, **payload.model_dump()},
    )
    return UnitOut(**dict(row))


@router.delete("/units/{unit_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_unit(unit_id: int, user=Depends(get_current_user)):
    await _get_owned_unit(unit_id, user["id"])
    await database.execute("DELETE FROM units WHERE id = :id", {"id": unit_id})
