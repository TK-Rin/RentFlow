"""The RentFlow billing engine.

Every function here is a pure calculation with no database or HTTP
dependency, on purpose: the correctness of rent billing is the core
business logic of the product, and it needs to be testable (see
tests/test_billing.py) independently of routes, auth, or Postgres.

The edge cases each function guards against are the ones named in the
project proposal and are the cases we expect to be probed on during the
live demo:

  - a meter reading that goes backwards
  - a lease that starts partway through a billing period (proration)
  - a partial payment that should not flip an invoice to paid
  - a late fee that must never compound twice for the same period
"""

from calendar import monthrange
from dataclasses import dataclass
from datetime import date
from decimal import ROUND_HALF_UP, Decimal


def _money(value) -> Decimal:
    return Decimal(str(value)).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)


@dataclass
class InvoiceLine:
    type: str
    description: str
    quantity: Decimal
    unit_price: Decimal
    amount: Decimal


class MeterRollbackError(ValueError):
    """Raised when a current meter reading is lower than the previous one."""


def period_bounds(period: str) -> tuple[date, date]:
    """"YYYY-MM" -> (first day, last day) of that calendar month."""

    year, month = (int(part) for part in period.split("-"))
    last_day = monthrange(year, month)[1]
    return date(year, month, 1), date(year, month, last_day)


def prorate_rent(rent_amount, period: str, lease_start: date, lease_end: date | None) -> Decimal:
    """Full rent unless the lease starts or ends inside this period, in
    which case rent is charged for the days actually occupied."""

    period_start, period_end = period_bounds(period)
    billed_start = max(period_start, lease_start)
    billed_end = min(period_end, lease_end) if lease_end else period_end

    if billed_start > billed_end:
        return Decimal("0.00")

    days_in_period = (period_end - period_start).days + 1
    days_billed = (billed_end - billed_start).days + 1

    if days_billed >= days_in_period:
        return _money(rent_amount)

    daily_rate = Decimal(str(rent_amount)) / days_in_period
    return _money(daily_rate * days_billed)


def calc_utility_charge(previous_reading, current_reading, rate) -> Decimal:
    """Consumption x rate. Rejects a reading lower than the previous one
    instead of silently producing negative consumption."""

    previous_reading = Decimal(str(previous_reading))
    current_reading = Decimal(str(current_reading))

    if current_reading < previous_reading:
        raise MeterRollbackError(
            "Current meter reading is lower than the previous reading "
            f"({current_reading} < {previous_reading})"
        )

    consumption = current_reading - previous_reading
    return _money(consumption * Decimal(str(rate)))


def calc_late_fee(outstanding_balance, rate: Decimal) -> Decimal:
    """Applied once, against whatever balance is still unpaid on a prior
    overdue invoice. Callers must apply this only once per invoice - see
    build_monthly_invoice, which only adds it for a lease's own prior
    unpaid invoice, never cumulatively across many periods at once."""

    if outstanding_balance <= 0:
        return Decimal("0.00")
    return _money(Decimal(str(outstanding_balance)) * Decimal(str(rate)))


def build_monthly_invoice(
    *,
    period: str,
    rent_amount,
    lease_start: date,
    lease_end: date | None,
    water_prev,
    water_curr,
    water_rate,
    elec_prev,
    elec_curr,
    elec_rate,
    prior_outstanding_balance=0,
    late_fee_rate=Decimal("0.02"),
) -> list[InvoiceLine]:
    """Assemble the itemised lines for one lease for one billing period."""

    lines: list[InvoiceLine] = []

    rent = prorate_rent(rent_amount, period, lease_start, lease_end)
    is_prorated = rent != _money(rent_amount)
    lines.append(
        InvoiceLine(
            type="rent",
            description=f"Rent for {period}" + (" (prorated)" if is_prorated else ""),
            quantity=Decimal("1"),
            unit_price=rent,
            amount=rent,
        )
    )

    water_amount = calc_utility_charge(water_prev, water_curr, water_rate)
    water_units = Decimal(str(water_curr)) - Decimal(str(water_prev))
    lines.append(
        InvoiceLine(
            type="water",
            description=f"Water ({water_units} units x {water_rate})",
            quantity=water_units,
            unit_price=Decimal(str(water_rate)),
            amount=water_amount,
        )
    )

    elec_amount = calc_utility_charge(elec_prev, elec_curr, elec_rate)
    elec_units = Decimal(str(elec_curr)) - Decimal(str(elec_prev))
    lines.append(
        InvoiceLine(
            type="electric",
            description=f"Electricity ({elec_units} units x {elec_rate})",
            quantity=elec_units,
            unit_price=Decimal(str(elec_rate)),
            amount=elec_amount,
        )
    )

    late_fee = calc_late_fee(prior_outstanding_balance, late_fee_rate)
    if late_fee > 0:
        lines.append(
            InvoiceLine(
                type="late_fee",
                description="Late fee on prior unpaid balance",
                quantity=Decimal("1"),
                unit_price=late_fee,
                amount=late_fee,
            )
        )

    return lines


def invoice_total(lines: list[InvoiceLine]) -> Decimal:
    return _money(sum((line.amount for line in lines), Decimal("0.00")))


def apply_payment(invoice_total_amount, already_paid, new_payment) -> tuple[Decimal, str]:
    """Returns (new_total_paid, new_status). A payment smaller than the
    remaining balance leaves the invoice "partial", never "paid"."""

    total_paid = _money(Decimal(str(already_paid)) + Decimal(str(new_payment)))
    total_due = _money(invoice_total_amount)

    if total_paid >= total_due:
        return total_paid, "paid"
    if total_paid > 0:
        return total_paid, "partial"
    return total_paid, "sent"
