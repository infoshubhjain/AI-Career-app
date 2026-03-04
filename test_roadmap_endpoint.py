"""Optional live integration test for roadmap endpoint.

Run only when backend is already running:
RUN_LIVE_ROADMAP_TEST=1 pytest -q test_roadmap_endpoint.py
"""

from __future__ import annotations

import os
import time

import pytest
import requests


API_URL = os.getenv("ROADMAP_API_URL", "http://localhost:8000/api/roadmap/generate")


@pytest.mark.integration
def test_roadmap_endpoint_live() -> None:
    if os.getenv("RUN_LIVE_ROADMAP_TEST") != "1":
        pytest.skip("Set RUN_LIVE_ROADMAP_TEST=1 to run live roadmap endpoint test")

    payload = {"query": "competetive coding"}
    headers = {"Content-Type": "application/json"}

    start_time = time.time()
    response = requests.post(API_URL, json=payload, headers=headers, timeout=180)
    duration = time.time() - start_time

    assert response.status_code == 200, response.text

    data = response.json()
    assert isinstance(data, dict)
    assert "roadmap" in data
    assert "existing" in data
    assert isinstance(data["roadmap"].get("domains", []), list)
    assert len(data["roadmap"].get("domains", [])) >= 1
    assert duration < 180
