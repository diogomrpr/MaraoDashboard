"""Clocked, bounded synthetic native-stream source; never real camera media."""

from __future__ import annotations

import asyncio
from ipaddress import ip_address
from pathlib import Path
from queue import Empty, Full, Queue
from threading import Event
import time

from aiohttp import web
from homeassistant.components.http import HomeAssistantView
from homeassistant.components.http.const import KEY_HASS

LIVE_PATH = "/api/marao_test_camera/live.ts"
LIVE_FILE = Path(__file__).with_name("live.mp4")
# Normal, delayed and missing-still sources plus one bounded recovery overlap.
MAX_LIVE_CONNECTIONS = 4


def remux_live(stop: Event, chunks: Queue) -> None:
    """Reuse HA stream's PyAV to loop encoded packets with advancing timestamps."""
    import av  # HA's stream dependency; no fixture-only installation.

    class Sink:
        def write(self, data):
            for offset in range(0, len(data), 65536):
                while not stop.is_set():
                    try:
                        chunks.put(bytes(data[offset:offset + 65536]), timeout=0.1)
                        break
                    except Full:
                        continue
                else:
                    raise BrokenPipeError("Synthetic source consumer closed")
            return len(data)

        def writable(self):
            return True

    try:
        with av.open(str(LIVE_FILE)) as template:
            with av.open(Sink(), mode="w", format="mpegts", options={"flush_packets": "1", "mpegts_flags": "resend_headers"}) as output:
                target = output.add_stream_from_template(template.streams.video[0])
                timeline = 0
                started = time.monotonic()
                while not stop.is_set():
                    first_dts = None
                    end = timeline
                    with av.open(str(LIVE_FILE)) as source:
                        video = source.streams.video[0]
                        for packet in source.demux(video):
                            if packet.dts is None:
                                continue
                            if first_dts is None:
                                first_dts = packet.dts
                            duration = max(1, packet.duration or int(1 / float(video.average_rate or 20) / video.time_base))
                            packet.pts = (packet.pts if packet.pts is not None else packet.dts) - first_dts + timeline
                            packet.dts = packet.dts - first_dts + timeline
                            end = max(end, packet.dts + duration, packet.pts + duration)
                            if stop.wait(max(0, float(packet.dts * packet.time_base) - (time.monotonic() - started))):
                                return
                            packet.stream = target
                            output.mux(packet)
                    if first_dts is None:
                        raise RuntimeError("The synthetic live fixture has no encoded video packets")
                    timeline = end
    except BrokenPipeError:
        if not stop.is_set():
            raise


class FixtureLiveView(HomeAssistantView):
    """Only HA's physical loopback socket can consume this paced source."""

    url = LIVE_PATH
    name = "api:marao_test_camera:live"
    requires_auth = False

    def __init__(self):
        self._active = 0

    async def get(self, request):
        peer = request.transport.get_extra_info("peername") if request.transport else None
        if not peer or not ip_address(peer[0]).is_loopback:
            raise web.HTTPForbidden(text="Synthetic live media is loopback-only")
        if self._active >= MAX_LIVE_CONNECTIONS:
            raise web.HTTPTooManyRequests(text="Synthetic stream capacity reached")
        self._active += 1
        stop = Event()
        chunks = Queue(maxsize=8)  # At most 512 KiB queued per admitted consumer.
        worker = None
        response = web.StreamResponse(headers={"Content-Type": "video/mp2t", "Cache-Control": "no-store"})
        try:
            await response.prepare(request)
            worker = request.app[KEY_HASS].async_add_executor_job(remux_live, stop, chunks)
            while True:
                try:
                    data = await asyncio.to_thread(chunks.get, True, 0.25)
                except Empty:
                    if worker.done():
                        await worker  # Preserve actual source failures.
                        break
                    continue
                await response.write(data)
        except (ConnectionResetError, BrokenPipeError):
            # Normal native-client disposal ends its loopback source.
            pass
        finally:
            stop.set()
            try:
                if worker is not None:
                    await worker
            finally:
                self._active -= 1
        return response
