"""Native History with isolated, authenticated disposable fixture cases."""

from __future__ import annotations

import asyncio
from datetime import timedelta

from aiohttp import web

from homeassistant.components import history as core_history
from homeassistant.util import dt as dt_util

MARAO_DISPOSABLE_FIXTURE = True
CONFIG_SCHEMA = core_history.CONFIG_SCHEMA


ENERGY_HISTORY = {
    "sensor.marao_dashboard_test_energy_format_mixed": ((.1, "1000.001", "Wh"), (.3, "unavailable", None), (.5, "3600007.2", "J"), (.7, "unknown", None), (.9, "1000.003", "Wh")),
    "sensor.marao_dashboard_test_energy_format_power": ((.1, "1000", "W"), (.3, "unknown", None), (.5, "1.5", "kW"), (.7, "unavailable", None), (.9, "1500", "W")),
    "sensor.marao_dashboard_test_energy_format_export": ((.1, "-1000", "Wh"), (.5, "-7200000", "J"), (.9, "0", "Wh")),
    "sensor.marao_dashboard_test_energy_format_zero": ((.1, "0", "W"), (.5, "0", "kW"), (.9, "0", "W")),
    "sensor.marao_dashboard_test_energy_format_cost": ((.1, "1.23001", "EUR"), (.5, "1.23002", "EUR"), (.9, "1.2345", "EUR")),
    "sensor.marao_dashboard_test_energy_format_missing_history": ((.1, "1000", None), (.5, "2000", None), (.9, "2345", None)),
    "sensor.marao_dashboard_test_energy_format_incompatible_history": ((.1, "1000", "Wh"), (.5, "1500", "W"), (.9, "3456", "Wh")),
}

ENERGY_DEMO = {
    "sensor.marao_dashboard_test_energy_demo_today": (.3, "kWh", "day"),
    "sensor.marao_dashboard_test_energy_demo_month": (.3, "kWh", "month"),
    "sensor.marao_dashboard_test_energy_demo_kitchen": (.1, "kWh", None),
    "sensor.marao_dashboard_test_energy_demo_heating": (.15, "kWh", None),
    "sensor.marao_dashboard_test_energy_demo_kitchen_cost": (.025, "EUR", None),
}


def energy_demo_value(entity, timestamp, before_reset=False):
    """Match the safe templates: alternating days and breakfast/evening peaks."""
    rate, _unit, period = ENERGY_DEMO[entity]

    def cumulative(instant):
        hours = (instant.timestamp() - 1767225600) / 3600
        days, hour = divmod(hours, 24)
        weighted = hour + min(max(hour - 6, 0), 3) + 2 * min(max(hour - 17, 0), 5)
        return 37 * (days // 2 * 3 + days % 2) + (1 + days % 2) * weighted

    value = cumulative(timestamp)
    if period:
        local = dt_util.as_local(timestamp - timedelta(milliseconds=1) if before_reset else timestamp)
        boundary = local.replace(hour=0, minute=0, second=0, microsecond=0)
        if period == "month":
            boundary = boundary.replace(day=1)
        value -= cumulative(boundary)
    return round(value * rate, 4)


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
        energy = ENERGY_HISTORY.get(entity)
        demo = ENERGY_DEMO.get(entity)
        if case is None and energy is None and demo is None:
            return await super().get(request, datetime)
        if case == "empty":
            return self.json([])
        if case == "error":
            return web.Response(text="{simulated malformed history response", content_type="application/json")
        if energy is None and demo is None:
            await asyncio.sleep(5)
        now = dt_util.utcnow()
        start = dt_util.parse_datetime(datetime) if datetime else now - timedelta(days=1)
        end = dt_util.parse_datetime(request.query.get("end_time", "")) if "end_time" in request.query else now
        if start is None or end is None:
            return await super().get(request, datetime)
        end = min(end, now)
        records = []
        if case == "loading":
            # Hourly energy buckets need a baseline and observations inside each hour.
            cursor = start
            while cursor <= end:
                stamp = cursor.isoformat()
                records.append({"entity_id": entity, "state": str(21 + (cursor - start).total_seconds() / 3600), "attributes": {}, "last_changed": stamp, "last_updated": stamp})
                if cursor == end:
                    break
                cursor = min(cursor + timedelta(minutes=15), end)
            return self.json([records])
        if demo:
            cursor = start
            previous = None
            while cursor <= end:
                value = energy_demo_value(entity, cursor)
                if previous is not None and value < previous:
                    # Preserve the last interval's consumption before the utility meter resets.
                    stamp = (cursor - timedelta(milliseconds=1)).isoformat()
                    records.append({"entity_id": entity, "state": str(energy_demo_value(entity, cursor, True)), "attributes": {"unit_of_measurement": demo[1]}, "last_changed": stamp, "last_updated": stamp})
                stamp = cursor.isoformat()
                records.append({"entity_id": entity, "state": str(value), "attributes": {"unit_of_measurement": demo[1]}, "last_changed": stamp, "last_updated": stamp})
                if cursor == end:
                    break
                previous = value
                cursor = min(cursor + timedelta(hours=1), end)
            return self.json([records])
        for fraction, value, unit in energy or ((0.1, "21", None), (0.5, "25", None), (0.9, "22", None)):
            timestamp = (start + (end - start) * fraction).isoformat()
            records.append({"entity_id": entity, "state": value, "attributes": {"unit_of_measurement": unit} if unit is not None else {}, "last_changed": timestamp, "last_updated": timestamp})
        return self.json([records])
