"""Loopback-only SOCKS5 link to disposable Home Assistant, including WebSockets."""
import asyncio
import ipaddress
import json
import sys
import time


class Link:
    """Reserve bandwidth on one shared timeline for each direction."""

    def __init__(self, bits_per_second, round_trip_ms):
        self.rate = bits_per_second
        self.latency = round_trip_ms / 2000
        self.available = 0

    def due(self, size):
        duration = size * 8 / self.rate if self.rate else 0
        self.available = max(self.available, time.monotonic()) + duration
        return self.available + self.latency


class WebSocketSizes:
    """Report only large incoming on-wire frame lengths, after an HTTP upgrade."""

    def __init__(self):
        self.buffer = bytearray()
        self.upgraded = None
        self.remaining = 0
        self.frame_size = 0

    def feed(self, block):
        if self.upgraded is False:
            return
        self.buffer.extend(block)
        if self.upgraded is None:
            prefix = b"HTTP/1.1 101"
            if not self.buffer.startswith(prefix[:len(self.buffer)]):
                self.upgraded = False
                self.buffer.clear()
                return
            boundary = self.buffer.find(b"\r\n\r\n")
            if boundary < 0:
                if len(self.buffer) > 8192:
                    self.upgraded = False
                    self.buffer.clear()
                return
            self.upgraded = True
            del self.buffer[:boundary + 4]
        while self.buffer:
            if not self.remaining:
                if len(self.buffer) < 2:
                    return
                length = self.buffer[1] & 127
                extra = 8 if length == 127 else 2 if length == 126 else 0
                if len(self.buffer) < 2 + extra:
                    return
                self.frame_size = int.from_bytes(self.buffer[2:2 + extra], "big") if extra else length
                self.remaining = self.frame_size
                del self.buffer[:2 + extra]
            consumed = min(self.remaining, len(self.buffer))
            del self.buffer[:consumed]
            self.remaining -= consumed
            if not self.remaining and self.frame_size >= 8192:
                print(json.dumps({"time": time.time_ns() // 1_000_000, "bytes": self.frame_size}), flush=True)


async def relay(source, target, link, observe=None):
    # Scheduling ahead of writes pipelines propagation delay while bounding memory.
    queue = asyncio.Queue(maxsize=4)

    async def read():
        while True:
            block = await source.read(8192)
            await queue.put((link.due(len(block)), block))
            if not block:
                return

    async def write():
        while True:
            due, block = await queue.get()
            if not block:
                return
            await asyncio.sleep(max(0, due - time.monotonic()))
            target.write(block)
            if observe:
                observe(block)
            await target.drain()

    tasks = [asyncio.create_task(read()), asyncio.create_task(write())]
    try:
        await asyncio.gather(*tasks)
    finally:
        for task in tasks:
            task.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)


async def serve(port, down, up, rtt, trace=0):
    upload = Link(up, rtt)
    download = Link(down, rtt)

    async def accept(reader, writer):
        remote = None
        tasks = []
        try:
            version, count = await reader.readexactly(2)
            if version != 5 or 0 not in await reader.readexactly(count):
                return
            writer.write(bytes([5, 0]))  # SOCKS5 with no proxy authentication.
            await writer.drain()
            version, command, _, kind = await reader.readexactly(4)
            if version != 5 or command != 1:
                return
            if kind == 3:
                size = (await reader.readexactly(1))[0]
                host = (await reader.readexactly(size)).decode("ascii")
            elif kind in (1, 4):
                host = str(ipaddress.ip_address(await reader.readexactly(4 if kind == 1 else 16)))
            else:
                return
            requested_port = int.from_bytes(await reader.readexactly(2), "big")
            if host != "192.168.0.28" or requested_port != port:
                writer.write(bytes([5, 2, 0, 1, 0, 0, 0, 0, 0, 0]))  # Disallowed destination.
                await writer.drain()
                return
            try:
                upstream, remote = await asyncio.open_connection("192.168.0.28", port)
            except OSError:
                writer.write(bytes([5, 5, 0, 1, 0, 0, 0, 0, 0, 0]))  # Connection refused.
                await writer.drain()
                return
            writer.write(bytes([5, 0, 0, 1, 0, 0, 0, 0, 0, 0]))
            await writer.drain()
            tasks = [
                asyncio.create_task(relay(reader, remote, upload)),
                asyncio.create_task(relay(upstream, writer, download, WebSocketSizes().feed if trace else None)),
            ]
            await asyncio.wait(tasks, return_when=asyncio.FIRST_COMPLETED)
        except (OSError, asyncio.IncompleteReadError, ValueError):
            # A browser may abandon a socket during reloads or close its context.
            pass
        finally:
            for task in tasks:
                task.cancel()
            await asyncio.gather(*tasks, return_exceptions=True)
            writer.close()
            if remote:
                remote.close()

    server = await asyncio.start_server(accept, "127.0.0.1", 0)
    print(server.sockets[0].getsockname()[1], flush=True)
    async with server:
        await server.serve_forever()


async def calibrate():
    """Measure two concurrent 32 KiB responses through the same relay."""
    class Sink:
        def __init__(self):
            self.size = 0

        def write(self, data):
            self.size += len(data)

        async def drain(self):
            pass

    async def transfer(size, link):
        source = asyncio.StreamReader()
        source.feed_data(bytes(size))
        source.feed_eof()
        sink = Sink()
        await relay(source, sink, link)
        assert sink.size == size

    for profile, down, up, rtt in (("4g", 1600000, 750000, 150), ("3g", 400000, 250000, 350)):
        download = Link(down, rtt)
        start = time.monotonic()
        await transfer(1, Link(up, rtt))
        await asyncio.gather(transfer(32768, download), transfer(32768, download))
        duration = time.monotonic() - start
        expected = rtt / 1000 + 65536 * 8 / down + 8 / up
        print(json.dumps({"profile": profile, "bytes": 65536, "streams": 2,
                          "expected": round(expected, 3), "actual": round(duration, 3)}))
        if abs(duration / expected - 1) > 0.15:
            raise RuntimeError("Shared-bandwidth calibration exceeds 15% tolerance")


if __name__ == "__main__":
    if sys.argv[1:] == ["--calibrate"]:
        asyncio.run(calibrate())
    else:
        asyncio.run(serve(*map(int, sys.argv[1:])))
