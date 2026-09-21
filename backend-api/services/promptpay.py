"""Generates a Thai PromptPay QR payload string (EMVCo Merchant
Presented Mode format).

The payload this produces is structurally real and will scan as a valid
PromptPay QR in a banking app. What RentFlow simulates is the *settlement*
side: nothing here confirms that money actually moved. Confirmation is a
mock endpoint (see routes/subscriptions.py) standing in for a bank
webhook, because real settlement requires a bank or payment-gateway
integration that is not available to a student project. This trade-off is
called out explicitly in the design document and should be repeated
plainly if asked about it live.
"""

import re


def _tlv(id_: str, value: str) -> str:
    return f"{id_}{len(value):02d}{value}"


def _crc16(payload: str) -> str:
    """CRC-16/CCITT-FALSE over the payload, as required by the EMVCo spec."""

    crc = 0xFFFF
    for char in payload.encode("utf-8"):
        crc ^= char << 8
        for _ in range(8):
            if crc & 0x8000:
                crc = ((crc << 1) ^ 0x1021) & 0xFFFF
            else:
                crc = (crc << 1) & 0xFFFF
    return format(crc, "04X")


def _normalize_promptpay_id(promptpay_id: str) -> tuple[str, str]:
    """Returns (merchant-account sub-tag, normalized value)."""

    digits = re.sub(r"\D", "", promptpay_id)

    if len(digits) == 10:
        # Mobile number, e.g. 0812345678 -> 0066812345678 (13 digits, no
        # leading zero after the country code). Sub-tag 01.
        return "01", "0066" + digits[1:]
    if len(digits) == 13:
        # National ID / tax ID, used as-is. Sub-tag 02.
        return "02", digits

    raise ValueError(
        "PromptPay ID must be a 10-digit mobile number or a 13-digit "
        f"national ID, got {len(digits)} digits"
    )


def generate_promptpay_payload(promptpay_id: str, amount: float | None = None) -> str:
    id_sub_tag, target_id = _normalize_promptpay_id(promptpay_id)

    merchant_account_info = (
        _tlv("00", "A000000677010111")  # PromptPay AID
        + _tlv(id_sub_tag, target_id)
    )

    fields = (
        _tlv("00", "01")  # Payload Format Indicator
        + _tlv("01", "12" if amount else "11")  # Point of Initiation: 12 = dynamic (amount set), 11 = static
        + _tlv("29", merchant_account_info)
        + _tlv("53", "764")  # Currency: THB (ISO 4217 numeric)
    )

    if amount is not None:
        fields += _tlv("54", f"{amount:.2f}")

    fields += _tlv("58", "TH")  # Country code

    payload_without_crc = fields + "6304"
    checksum = _crc16(payload_without_crc)
    return payload_without_crc + checksum
