"""Config flow for Marao Dashboard."""

from typing import Any

import voluptuous as vol

from homeassistant import config_entries

from . import DOMAIN


class MaraoDashboardConfigFlow(config_entries.ConfigFlow, domain=DOMAIN):
    """Create the single Marao Dashboard entry."""

    VERSION = 1

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> config_entries.ConfigFlowResult:
        """Handle the user setup step."""

        if self._async_current_entries():
            return self.async_abort(reason="single_instance_allowed")
        if user_input is None:
            return self.async_show_form(step_id="user", data_schema=vol.Schema({}))
        return self.async_create_entry(title="Marao Dashboard", data={})
