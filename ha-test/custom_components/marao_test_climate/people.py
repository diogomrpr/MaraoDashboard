"""Fictional person states for the disposable dashboard; no tracker data."""
def setup_people(hass):
    for suffix, name, place in (("alex", "Alex", "home"), ("sam", "Sam", "not_home"), ("jules", "Jules", "Work"), ("taylor", "Taylor", "unavailable")):
        hass.states.async_set("person.marao_dashboard_test_" + suffix, place, {"friendly_name": name, "icon": "mdi:account"})

    hass.states.async_set("sensor.marao_dashboard_test_current_area", "Living room", {"friendly_name": "Test current room", "area_id": "test_living_room"})
