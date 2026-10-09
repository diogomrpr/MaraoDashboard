"""Disposable UniFi media-source fixture; not a physical-device integration."""

MARAO_DISPOSABLE_FIXTURE = True


async def async_setup(hass, config):
    """Let Home Assistant discover the fixture's standard media-source platform."""
    return True
