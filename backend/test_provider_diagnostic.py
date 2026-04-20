import os

import pytest


pytestmark = pytest.mark.skipif(
    os.getenv("RUN_BACKEND_INTEGRATION_TESTS") != "1",
    reason="Set RUN_BACKEND_INTEGRATION_TESTS=1 to run live provider diagnostics.",
)


def test_provider_diagnostics_placeholder():
    # Keep this file as an integration-test entry point without side effects at import time.
    assert True
