"""Keep pytest-cov data filenames safe on hosts with invalid hostnames."""

from __future__ import annotations

import os
import socket
from types import SimpleNamespace

from coverage import sqldata


_ORIGINAL_COVERAGE_SOCKET = sqldata.socket
_HOSTNAME = socket.gethostname()
_SAFE_HOSTNAME = _HOSTNAME
for _separator in (os.sep, os.altsep):
    if _separator:
        _SAFE_HOSTNAME = _SAFE_HOSTNAME.replace(_separator, "_")

if _SAFE_HOSTNAME != _HOSTNAME:
    sqldata.socket = SimpleNamespace(gethostname=lambda: _SAFE_HOSTNAME)


def pytest_unconfigure() -> None:
    """Restore coverage's socket module after its final report is written."""

    sqldata.socket = _ORIGINAL_COVERAGE_SOCKET
