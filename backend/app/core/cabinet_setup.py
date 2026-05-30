def clean_text(value: str | None) -> str | None:
    if not isinstance(value, str):
        return None
    value = value.strip()
    return value or None


def cabinet_setup_complete(cabinet: dict | None) -> bool:
    if not cabinet:
        return False
    name = clean_text(cabinet.get("name"))
    required_values = [
        name if name != "Nouveau cabinet" else None,
        clean_text(cabinet.get("dentist_name")),
        clean_text(cabinet.get("phone")),
        clean_text(cabinet.get("whatsapp_number")),
        clean_text(cabinet.get("city")),
        clean_text(cabinet.get("address")),
    ]
    return all(required_values)
