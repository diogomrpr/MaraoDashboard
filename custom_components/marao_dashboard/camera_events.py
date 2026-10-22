"""Read-only Netatmo metadata; media remains on Home Assistant's media-source API."""

from html import unescape
import math
import re

from homeassistant.auth.permissions.const import POLICY_READ
from homeassistant.helpers import entity_registry as er


def netatmo_events(hass, user, entity_id, limit):
    """Read only the selected, permitted camera's existing provider cache."""
    if not entity_id.startswith("camera."):
        raise ValueError("Select a Netatmo camera")
    if not user.permissions.check_entity(entity_id, POLICY_READ):
        raise PermissionError("Camera access denied")
    registered = er.async_get(hass).async_get(entity_id)
    state = hass.states.get(entity_id)
    if not registered or registered.platform != "netatmo" or not state:
        raise ValueError("Select a Netatmo camera")
    camera_id = state.attributes.get("id")
    if not isinstance(camera_id, str) or not re.fullmatch(r"[a-zA-Z0-9:_-]+", camera_id):
        raise ValueError("Netatmo camera identifier is unavailable")
    entry = hass.config_entries.async_get_entry(registered.config_entry_id) if registered.config_entry_id else None
    runtime = getattr(entry, "runtime_data", None)
    events = getattr(runtime, "events", None)
    if events is None:
        # Netatmo used this cache before moving it to config-entry runtime_data.
        events = hass.data.get("netatmo", {}).get("netatmo_events")
    if not isinstance(events, dict):
        raise ValueError("Netatmo event data is unavailable")
    camera_events = events.get(camera_id, {})
    if not isinstance(camera_events, dict):
        raise ValueError("Netatmo event data is unavailable")
    return normalize_netatmo_events(camera_events, camera_id, limit)


def normalize_netatmo_events(events, camera_id, limit):
    """Expose typed metadata without camera URLs, credentials or person IDs."""
    aliases = {"human": "person", "person_away": "person", "movement": "motion",
               "car": "vehicle", "incoming_call": "ring", "accepted_call": "ring", "missed_call": "ring"}
    result = []
    for key, event in events.items():
        if not isinstance(event, dict) or not event.get("media_url"):
            continue
        try:
            identifier, timestamp = int(key), float(event["event_time"])
        except (KeyError, TypeError, ValueError, OverflowError):
            continue
        if identifier <= 0 or not math.isfinite(timestamp) or timestamp <= 0:
            continue
        types = []
        subevents = event.get("subevents")
        for item in [event, *(subevents if isinstance(subevents, list) else [])]:
            if not isinstance(item, dict):
                continue
            kind = item.get("event_type", item.get("type", "event"))
            kind = getattr(kind, "value", kind)
            kind = kind if isinstance(kind, str) else "event"
            kind = aliases.get(kind, kind)
            if kind not in types:
                types.append(kind)
        if len(types) > 1 and "outdoor" in types:
            types.remove("outdoor")
        snapshot = event.get("snapshot")
        has_thumbnail = bool(snapshot.get("url") if isinstance(snapshot, dict) else getattr(snapshot, "url", None))
        result.append({"id": str(identifier), "provider": "netatmo", "start_time": timestamp, "hasThumbnail": has_thumbnail,
                       "eventTypes": types or ["event"], "label": unescape(re.sub(r"<[^>]*>", "", str(event.get("message") or ""))),
                       "mediaContentId": f"media-source://netatmo/events/{camera_id}/{identifier}"})
    return sorted(result, key=lambda item: item["start_time"], reverse=True)[:limit]
