"""Native History with three isolated, authenticated disposable fixture cases."""

from __future__ import annotations

import asyncio
from datetime import timedelta

from aiohttp import web

from homeassistant.components import history as core_history
from homeassistant.util import dt as dt_util

MARAO_DISPOSABLE_FIXTURE = True
CONFIG_SCHEMA = core_history.CONFIG_SCHEMA


async def async_setup(hass, config):
    """Register the fixture view before native routes; retain native UI and WS."""
    hass.http.register_view(FixtureHistoryPeriodView())
    return await core_history.async_setup(hass, config)


class FixtureHistoryPeriodView(core_history.HistoryPeriodView):
    """Use native authentication/delegation and only intercept exact test IDs.

    The error case deliberately returns malformed JSON with HTTP 200 to exercise
    ordinary callApi parsing rejection and the card's readable error boundary.
    The wrapper does not modify real Recorder data or ordinary history requests.
    """

    name = "api:marao_test_history:view-period"

    async def get(self, request, datetime=None):
        entity = request.query.get("filter_entity_id", "")
        case = {
            "sensor.marao_dashboard_test_history_empty": "empty",
            "sensor.marao_dashboard_test_history_loading": "loading",
            "sensor.marao_dashboard_test_history_error": "error",
        }.get(entity)
        if case is None:
            return await super().get(request, datetime)
        if case == "empty":
            return self.json([])
        if case == "error":
            return web.Response(text="{simulated malformed history response", content_type="application/json")
        await asyncio.sleep(5)
        now = dt_util.utcnow()
        start = dt_util.parse_datetime(datetime) if datetime else now - timedelta(days=1)
        end = dt_util.parse_datetime(request.query.get("end_time", "")) if "end_time" in request.query else now
        if start is None or end is None:
            return await super().get(request, datetime)
        end = min(end, now)
        records = []
        for fraction, value in ((0.1, "21"), (0.5, "25"), (0.9, "22")):
            timestamp = (start + (end - start) * fraction).isoformat()
            records.append({"entity_id": entity, "state": value, "attributes": {}, "last_changed": timestamp, "last_updated": timestamp})
        return self.json([records])
