"""Safe synthetic Netatmo cache; no accounts or physical cameras."""
from time import time

MARAO_DISPOSABLE_FIXTURE = True
CAMERA_ID = "marao_synthetic_netatmo"

async def async_setup(hass, config):
    now = int(time())
    hass.data["netatmo"] = {"netatmo_events": {CAMERA_ID: {
        now - offset: {"event_time": now - offset, "event_type": kind, "message": "Synthetic " + kind,
                       "media_url": "synthetic-only", "snapshot": {"url": "synthetic-only"},
                       "subevents": [{"event_type": type_} for type_ in types]}
        for offset, kind, types in [(60, "person", []), (120, "outdoor", ["vehicle", "animal"]), (180, "movement", [])]
    }}}
    return True
