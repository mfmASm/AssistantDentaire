from urllib.parse import quote


def clean_moroccan_phone(phone: str | None) -> str:
    digits = "".join(ch for ch in (phone or "") if ch.isdigit())
    if digits.startswith("00"):
        digits = digits[2:]
    if digits.startswith("212"):
        return digits
    if digits.startswith("0") and len(digits) == 10:
        return f"212{digits[1:]}"
    if len(digits) == 9 and digits[0] in {"5", "6", "7"}:
        return f"212{digits}"
    return digits


def make_wa_me_url(phone: str, message: str) -> str:
    return f"https://wa.me/{clean_moroccan_phone(phone)}?text={quote(message)}"
