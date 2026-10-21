"""Encode one deterministic moving scene at three resolutions; test media only."""

from fractions import Fraction
import json
from pathlib import Path
import sys

import av  # Use HA's pinned media dependency, not a production encoder service.

ROOT = Path(__file__).with_name("custom_components") / "marao_test_camera"
FPS, SECONDS = 20, 12
TIERS = {"low": ("live.mp4", 320, 180, 100_000),
         "medium": ("medium.mp4", 480, 270, 300_000),
         "high": ("high.mp4", 640, 360, 750_000)}


def scene(tick):
    """Binary frame counter and moving texture; counter is independent of PTS."""
    frame = av.VideoFrame(640, 360, "yuv420p")
    for plane_index, plane in enumerate(frame.planes):
        pixels = bytearray(plane.buffer_size)
        for y in range(plane.height):
            for x in range(plane.width):
                value = (32 + ((x // 12 * 17 + y // 12 * 11 + tick * 7) % 160)
                         if plane_index == 0 else 128)
                # Eight large black/white cells encode 0..239 at every quality.
                if plane_index == 0 and 16 <= y < 64 and 16 <= x < 624:
                    value = 235 if tick & (1 << ((x - 16) // 76)) else 16
                pixels[y * plane.line_size + x] = value
        plane.update(pixels)
    return frame


def generate(qualities):
    outputs = {}
    try:
        for quality in qualities:
            name, width, height, bitrate = TIERS[quality]
            container = av.open(str(ROOT / name), mode="w")
            stream = container.add_stream("libx264", rate=FPS)
            stream.width, stream.height, stream.pix_fmt = width, height, "yuv420p"
            stream.bit_rate = bitrate
            stream.options = {"preset": "fast", "tune": "zerolatency",
                              "x264-params": "keyint=20:min-keyint=20:scenecut=0:bframes=0"}
            outputs[quality] = container, stream
        for tick in range(FPS * SECONDS):
            source = scene(tick)
            for container, stream in outputs.values():
                frame = source.reformat(stream.width, stream.height, "yuv420p")
                frame.pts, frame.time_base = tick, Fraction(1, FPS)
                for packet in stream.encode(frame):
                    container.mux(packet)
        for container, stream in outputs.values():
            for packet in stream.encode():
                container.mux(packet)
    finally:
        for container, _ in outputs.values():
            container.close()
    metadata_path = ROOT / "live-profiles.json"
    profiles = json.loads(metadata_path.read_text()) if metadata_path.exists() else {}
    for quality in qualities:
        name, width, height, _ = TIERS[quality]
        with av.open(str(ROOT / name)) as container:
            stream = container.streams.video[0]
            packets = [packet for packet in container.demux(stream) if packet.dts is not None]
            duration = float(stream.duration * stream.time_base)
            # BANDWIDTH covers the worst one-second encoded GOP, including 10% mux headroom.
            peak = max(sum(packet.size for packet in packets if second <= float(packet.dts * packet.time_base) < second + 1)
                       for second in range(SECONDS)) * 8
            codec = stream.codec_context.extradata
            profiles[quality] = {"file": name, "width": width, "height": height, "fps": FPS,
                                 "frames": len(packets), "duration": duration,
                                 "bandwidth": (peak * 11 + 9) // 10,
                                 "average_bandwidth": round(sum(packet.size for packet in packets) * 8 / duration),
                                 "codec": f"avc1.{codec[1:4].hex()}"}
    metadata_path.write_text(json.dumps(profiles, indent=2, sort_keys=True) + "\n")


if __name__ == "__main__":
    generate(["high"] if "--high" in sys.argv else TIERS)
