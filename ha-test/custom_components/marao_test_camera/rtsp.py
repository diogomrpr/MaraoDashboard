"""Bounded loopback RTSP/RTCP sender for the disposable three-tier camera."""
from __future__ import annotations

import asyncio
import base64
import math
from pathlib import Path
import socket
import socketserver
import struct
from threading import BoundedSemaphore, Event, Thread
import time

from .live import PROFILES, SOURCE_EPOCH


class RTSPFixture(socketserver.ThreadingTCPServer):
    allow_reuse_address = True
    daemon_threads = True

    def __init__(self):
        import av

        self.stop = Event()
        self.admission = BoundedSemaphore(6)
        self.clients = set()
        self.sources = {}
        self.unix_epoch = time.time() - (time.monotonic() - SOURCE_EPOCH)
        for quality, profile in PROFILES.items():
            with av.open(str(Path(__file__).with_name(profile["file"]))) as source:
                video = source.streams.video[0]
                extra, parameters, offset = video.codec_context.extradata, [], 6
                for count in (extra[5] & 31,):
                    for _ in range(count):
                        size = int.from_bytes(extra[offset:offset + 2], "big")
                        offset += 2
                        parameters.append(extra[offset:offset + size])
                        offset += size
                count, offset = extra[offset], offset + 1
                for _ in range(count):
                    size = int.from_bytes(extra[offset:offset + 2], "big")
                    offset += 2
                    parameters.append(extra[offset:offset + size])
                    offset += size
                packets = []
                for packet in source.demux(video):
                    if packet.dts is None:
                        continue
                    raw, nals, offset = bytes(packet), [], 0
                    while offset < len(raw):
                        size = int.from_bytes(raw[offset:offset + 4], "big")
                        offset += 4
                        nals.append(raw[offset:offset + size])
                        offset += size
                    packets.append(nals)
                self.sources[quality] = parameters, packets
        super().__init__(("127.0.0.1", 0), _RTSPConsumer)
        self.thread = Thread(target=self.serve_forever, kwargs={"poll_interval": .1}, daemon=True)
        self.thread.start()

    @property
    def port(self):
        return self.server_address[1]

    def process_request(self, request, address):
        if not self.admission.acquire(blocking=False):
            request.sendall(b"RTSP/1.0 503 Service Unavailable\r\n\r\n")
            self.shutdown_request(request)
            return
        self.clients.add(request)
        super().process_request(request, address)

    def process_request_thread(self, request, address):
        try:
            super().process_request_thread(request, address)
        finally:
            self.clients.discard(request)
            self.admission.release()

    def close(self):
        self.stop.set()
        self.shutdown()
        for client in tuple(self.clients):
            try:
                client.shutdown(socket.SHUT_RDWR)
            except OSError:
                pass  # A consumer may have closed between snapshot and shutdown.
        self.server_close()
        self.thread.join(timeout=2)


class _RTSPConsumer(socketserver.StreamRequestHandler):
    def handle(self):
        self.closed = Event()
        sender = None
        self.request.settimeout(60)
        try:
            while not self.server.stop.is_set():
                first = self.rfile.read(1)
                if not first:
                    break
                if first == b"$":
                    header = self.rfile.read(3)
                    if len(header) != 3:
                        break
                    length = int.from_bytes(header[1:], "big")
                    if length > 8192:
                        break
                    self.rfile.read(length)
                    continue
                line = first + self.rfile.readline(8192)
                method, url, _ = line.decode().strip().split()
                url = url.rstrip("/")
                quality = url.split("/")[-1]
                if quality == "trackID=0":
                    quality = url.split("/")[-2]
                if quality not in self.server.sources:
                    break
                headers = {}
                for _ in range(32):
                    line = self.rfile.readline(8192)
                    if line in (b"\r\n", b""):
                        break
                    key, value = line.decode().split(":", 1)
                    headers[key.lower()] = value.strip()
                extra, body = "", ""
                if method == "OPTIONS":
                    extra = "Public: OPTIONS, DESCRIBE, SETUP, PLAY, TEARDOWN\r\n"
                elif method == "DESCRIBE":
                    parameters, _ = self.server.sources[quality]
                    body = ("v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=Marao synthetic clock\r\n"
                            "c=IN IP4 127.0.0.1\r\nt=0 0\r\na=control:*\r\nm=video 0 RTP/AVP 96\r\n"
                            "a=rtpmap:96 H264/90000\r\na=fmtp:96 packetization-mode=1;sprop-parameter-sets="
                            + ",".join(base64.b64encode(p).decode() for p in parameters)
                            + "\r\na=control:trackID=0\r\n")
                    extra = "Content-Type: application/sdp\r\nContent-Base: " + url + "/\r\n"
                elif method == "SETUP":
                    if "RTP/AVP/TCP" not in headers.get("transport", ""):
                        break
                    extra = "Transport: RTP/AVP/TCP;unicast;interleaved=0-1\r\nSession: 12345678\r\n"
                elif method == "PLAY":
                    extra = "Session: 12345678\r\nRange: npt=0.000-\r\n"
                elif method == "TEARDOWN":
                    break
                else:
                    break
                self.wfile.write(("RTSP/1.0 200 OK\r\nCSeq: " + headers.get("cseq", "1") + "\r\n"
                                  + extra + "Content-Length: " + str(len(body)) + "\r\n\r\n" + body).encode())
                self.wfile.flush()
                if method == "PLAY" and sender is None:
                    sender = Thread(target=self.send, args=(quality,), daemon=True)
                    sender.start()
        except (OSError, ValueError):
            pass  # Closing or malformed loopback clients release this bounded source.
        finally:
            self.closed.set()
            if sender:
                sender.join(timeout=2)

    def send(self, quality):
        parameters, packets = self.server.sources[quality]
        tick, sequence, octets, ssrc = math.ceil(time.monotonic() - SOURCE_EPOCH) * 20, 0, 0, 1234

        def interleaved(channel, payload):
            self.request.sendall(b"$" + bytes([channel]) + struct.pack("!H", len(payload)) + payload)

        def rtp(payload, last, timestamp):
            nonlocal sequence, octets
            interleaved(0, struct.pack("!BBHII", 0x80, 96 | (128 if last else 0), sequence % 65536, timestamp, ssrc) + payload)
            sequence += 1
            octets += len(payload)

        try:
            while not self.closed.wait(max(0, SOURCE_EPOCH + tick / 20 - time.monotonic())) and not self.server.stop.is_set():
                capture = self.server.unix_epoch + tick / 20
                timestamp = round(capture * 90000) & 0xffffffff
                if tick % 20 == 0:
                    ntp = capture + 2208988800
                    interleaved(1, struct.pack("!BBHIIIIII", 0x80, 200, 6, ssrc, int(ntp), int((ntp % 1) * 2**32), timestamp, sequence, octets))
                nals = (parameters if tick % 20 == 0 else []) + packets[tick % len(packets)]
                for index, nal in enumerate(nals):
                    if len(nal) <= 1200:
                        rtp(nal, index == len(nals) - 1, timestamp)
                        continue
                    pieces = [nal[offset:offset + 1198] for offset in range(1, len(nal), 1198)]
                    for part, payload in enumerate(pieces):
                        flags = (nal[0] & 31) | (128 if part == 0 else 0) | (64 if part == len(pieces) - 1 else 0)
                        rtp(bytes([(nal[0] & 0xe0) | 28, flags]) + payload, index == len(nals) - 1 and part == len(pieces) - 1, timestamp)
                tick += 1
        except OSError:
            self.closed.set()


async def async_rtsp_source(hass, quality):
    data = hass.data.setdefault("marao_test_camera", {})
    async with data.setdefault("rtsp_lock", asyncio.Lock()):
        if "rtsp" not in data:
            worker = hass.async_add_executor_job(RTSPFixture)
            try:
                data["rtsp"] = await asyncio.shield(worker)
            except asyncio.CancelledError:
                server = await worker
                await hass.async_add_executor_job(server.close)
                raise
    return f"rtsp://127.0.0.1:{data['rtsp'].port}/{quality}"
