"""Synthetic quality tiers for the disposable Protect fixture; no NVR access."""
from homeassistant.helpers import device_registry as dr, entity_registry as er
from custom_components.marao_test_camera.camera import MaraoTestCamera


async def async_setup_platform(hass, config, async_add_entities, discovery_info=None):
    async_add_entities([QualityCamera(config["name"], live=True, quality=config["quality"])])


class QualityCamera(MaraoTestCamera):
    async def async_added_to_hass(self):
        await super().async_added_to_hass()
        # The fixture device belongs to the already-installed disposable dashboard.
        entries = self.hass.config_entries.async_entries("marao_dashboard")
        if not entries:
            raise RuntimeError("Quality fixtures require the disposable Marao installation")
        device = dr.async_get(self.hass).async_get_or_create(
            config_entry_id=entries[0].entry_id,
            identifiers={("unifiprotect", "marao_synthetic_quality")},
            manufacturer="Marao synthetic fixture", name="Synthetic quality camera",
        )
        er.async_get(self.hass).async_update_entity(self.entity_id, device_id=device.id)
