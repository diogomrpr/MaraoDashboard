"""One private registry owner for disposable synthetic devices."""

from homeassistant import config_entries


class FixtureConfigFlow(config_entries.ConfigFlow, domain="marao_test_camera"):
    VERSION = 1

    async def async_step_import(self, user_input):
        await self.async_set_unique_id("marao_disposable_fixtures")
        self._abort_if_unique_id_configured()
        return self.async_create_entry(title="Marao disposable fixtures", data={})
