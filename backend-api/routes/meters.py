from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field

from database import database
from routes.units import _get_owned_unit
from security import get_current_user
from services.billing import MeterRollbackError, calc_utility_charge

router = APIRouter()


class MeterReadingIn(BaseModel):
    unit_id: int
    period: str = Field(pattern=r"^\d{4}-\d{2}$")
    water_curr: float = Field(ge=0)
    elec_curr: float = Field(ge=0)


class MeterReadingOut(BaseModel):
    id: int
    unit_id: int
    period: str
    water_prev: float
    water_curr: float
    elec_prev: float
    elec_curr: float


async def _previous_reading(unit_id: int, period: str):
    """The most recent reading strictly before this period becomes the
    "previous" baseline; falls back to 0 for a unit's first-ever reading."""

    return await database.fetch_one(
        """
        SELECT water_curr, elec_curr FROM meter_readings
        WHERE unit_id = :unit_id AND period < :period
        ORDER BY period DESC
        LIMIT 1
        """,
        {"unit_id": unit_id, "period": period},
    )


@router.get("/units/{unit_id}/meter-readings", response_model=list[MeterReadingOut])
async def list_readings(unit_id: int, user=Depends(get_current_user)):
    await _get_owned_unit(unit_id, user["id"])
    rows = await database.fetch_all(
        "SELECT * FROM meter_readings WHERE unit_id = :unit_id ORDER BY period DESC",
        {"unit_id": unit_id},
    )
    return [MeterReadingOut(**dict(row)) for row in rows]


@router.post(
    "/units/{unit_id}/meter-readings",
    response_model=MeterReadingOut,
    status_code=status.HTTP_201_CREATED,
)
async def record_reading(unit_id: int, payload: MeterReadingIn, user=Depends(get_current_user)):
    if payload.unit_id != unit_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="unit_id mismatch")

    await _get_owned_unit(unit_id, user["id"])
    previous = await _previous_reading(unit_id, payload.period)
    water_prev = previous["water_curr"] if previous else 0
    elec_prev = previous["elec_curr"] if previous else 0

    # Reject the reading up front with a clear message; calc_utility_charge
    # is the same guard the billing engine itself relies on, so the
    # validation here and at invoice time can never disagree.
    try:
        calc_utility_charge(water_prev, payload.water_curr, 1)
        calc_utility_charge(elec_prev, payload.elec_curr, 1)
    except (MeterRollbackError, ValueError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    row = await database.fetch_one(
        """
        INSERT INTO meter_readings (unit_id, period, water_prev, water_curr, elec_prev, elec_curr)
        VALUES (:unit_id, :period, :water_prev, :water_curr, :elec_prev, :elec_curr)
        ON CONFLICT (unit_id, period) DO UPDATE
        SET water_curr = EXCLUDED.water_curr, elec_curr = EXCLUDED.elec_curr
        RETURNING *
        """,
        {
            "unit_id": unit_id,
            "period": payload.period,
            "water_prev": water_prev,
            "water_curr": payload.water_curr,
            "elec_prev": elec_prev,
            "elec_curr": payload.elec_curr,
        },
    )
    return MeterReadingOut(**dict(row))
