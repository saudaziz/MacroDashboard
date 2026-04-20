import os

import pytest


pytestmark = pytest.mark.skipif(
    os.getenv("RUN_BACKEND_INTEGRATION_TESTS") != "1",
    reason="Set RUN_BACKEND_INTEGRATION_TESTS=1 to run live HTTP integration checks.",
)


def test_generate_dashboard_endpoint_placeholder():
    assert True
