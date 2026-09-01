"""Tests for the Marao Dashboard config flow."""

from homeassistant import config_entries
from homeassistant.data_entry_flow import FlowResultType
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.marao_dashboard import DOMAIN


async def test_user_flow_creates_empty_entry(hass) -> None:
    """The user flow exposes a form and creates an empty entry."""

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "user"

    result = await hass.config_entries.flow.async_configure(result["flow_id"], {})
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Marao Dashboard"
    assert result["data"] == {}


async def test_user_flow_allows_one_entry(hass) -> None:
    """A second entry is rejected."""

    MockConfigEntry(domain=DOMAIN, title="Marao Dashboard", data={}).add_to_hass(hass)

    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": config_entries.SOURCE_USER}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "single_instance_allowed"
