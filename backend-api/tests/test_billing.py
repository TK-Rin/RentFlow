"""Unit tests for the pure billing engine (services/billing.py).

These map directly to the edge cases promised in the project proposal,
Section 5.2, and are meant to be run with plain `pytest` - no database or
running server required.
"""

from datetime import date
from decimal import Decimal

import pytest

from services.billing import (
    MeterRollbackError,
    apply_payment,
    build_monthly_invoice,
    calc_late_fee,
    calc_utility_charge,
    invoice_total,
    prorate_rent,
)


def test_meter_rollback_is_rejected():
    with pytest.raises(MeterRollbackError):
        calc_utility_charge(previous_reading=120, current_reading=100, rate=7)


def test_normal_utility_charge():
    assert calc_utility_charge(previous_reading=100, current_reading=115, rate=7) == Decimal("105.00")


def test_full_month_rent_is_not_prorated():
    rent = prorate_rent(
        rent_amount=6000,
        period="2026-10",
        lease_start=date(2026, 1, 1),
        lease_end=None,
    )
    assert rent == Decimal("6000.00")


def test_mid_period_move_in_is_prorated():
    # Lease starts on the 17th of a 31-day month: 15 of 31 days billed.
    rent = prorate_rent(
        rent_amount=3100,
        period="2026-10",
        lease_start=date(2026, 10, 17),
        lease_end=None,
    )
    assert rent == Decimal("1500.00")


def test_mid_period_move_out_is_prorated():
    rent = prorate_rent(
        rent_amount=3000,
        period="2026-10",
        lease_start=date(2026, 1, 1),
        lease_end=date(2026, 10, 10),
    )
    # 10 of 31 days billed.
    assert rent == Decimal("967.74")


def test_late_fee_is_zero_with_no_outstanding_balance():
    assert calc_late_fee(0, Decimal("0.02")) == Decimal("0.00")


def test_late_fee_applies_once_against_prior_balance():
    fee = calc_late_fee(5000, Decimal("0.02"))
    assert fee == Decimal("100.00")


def test_partial_payment_leaves_invoice_partial_not_paid():
    total_paid, invoice_status = apply_payment(
        invoice_total_amount=5000, already_paid=0, new_payment=2000
    )
    assert total_paid == Decimal("2000.00")
    assert invoice_status == "partial"


def test_full_payment_marks_invoice_paid():
    total_paid, invoice_status = apply_payment(
        invoice_total_amount=5000, already_paid=2000, new_payment=3000
    )
    assert total_paid == Decimal("5000.00")
    assert invoice_status == "paid"


def test_overpayment_still_marks_paid_not_negative():
    total_paid, invoice_status = apply_payment(
        invoice_total_amount=5000, already_paid=4000, new_payment=2000
    )
    assert total_paid == Decimal("6000.00")
    assert invoice_status == "paid"


def test_build_monthly_invoice_end_to_end():
    lines = build_monthly_invoice(
        period="2026-10",
        rent_amount=6000,
        lease_start=date(2026, 1, 1),
        lease_end=None,
        water_prev=100,
        water_curr=115,
        water_rate=7,
        elec_prev=500,
        elec_curr=560,
        elec_rate=8,
        prior_outstanding_balance=0,
        late_fee_rate=Decimal("0.02"),
    )
    types = {line.type for line in lines}
    assert types == {"rent", "water", "electric"}  # no late_fee line when balance is 0
    assert invoice_total(lines) == Decimal("6000.00") + Decimal("105.00") + Decimal("480.00")


def test_build_monthly_invoice_adds_late_fee_when_prior_balance_unpaid():
    lines = build_monthly_invoice(
        period="2026-10",
        rent_amount=6000,
        lease_start=date(2026, 1, 1),
        lease_end=None,
        water_prev=100,
        water_curr=115,
        water_rate=7,
        elec_prev=500,
        elec_curr=560,
        elec_rate=8,
        prior_outstanding_balance=6585,
        late_fee_rate=Decimal("0.02"),
    )
    late_fee_lines = [line for line in lines if line.type == "late_fee"]
    assert len(late_fee_lines) == 1
    assert late_fee_lines[0].amount == Decimal("131.70")


def test_build_monthly_invoice_rejects_meter_rollback():
    with pytest.raises(MeterRollbackError):
        build_monthly_invoice(
            period="2026-10",
            rent_amount=6000,
            lease_start=date(2026, 1, 1),
            lease_end=None,
            water_prev=200,
            water_curr=150,  # went backwards
            water_rate=7,
            elec_prev=500,
            elec_curr=560,
            elec_rate=8,
        )
