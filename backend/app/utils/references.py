from datetime import date


def make_reference(prefix: str) -> str:
    return f"{prefix}-{date.today():%Y%m%d}"
