import unittest
from unittest.mock import MagicMock, patch

from src.backend.core import playbook_data as pd_mod
from src.backend.core.playbook_data import compute_icsa_spike_pct, compute_sahm_gap


class SahmGapTests(unittest.TestCase):
    def test_flat_series_has_zero_gap(self):
        self.assertAlmostEqual(compute_sahm_gap([4.0] * 15), 0.0)

    def test_gap_is_current_3m_avg_minus_prior_12m_low(self):
        # 13 months at 4.0, then 4.5, 4.5 -> current 3m avg 4.333, prior low 4.0, gap 1/3
        series = [4.0] * 13 + [4.5, 4.5]
        self.assertAlmostEqual(compute_sahm_gap(series), round(1 / 3, 4), places=4)

    def test_short_history_returns_none(self):
        self.assertIsNone(compute_sahm_gap([4.0, 4.1, 4.2]))


class IcsaSpikeTests(unittest.TestCase):
    def test_flat_claims_have_zero_spike(self):
        self.assertAlmostEqual(compute_icsa_spike_pct([220_000.0] * 30), 0.0)

    def test_spike_above_six_month_low(self):
        weekly = [200_000.0] * 27 + [240_000.0] * 3
        # current 4-wk avg = (200k + 240k*3)/4 = 230k; prior low 4-wk avg = 200k -> +15%
        self.assertAlmostEqual(compute_icsa_spike_pct(weekly), 15.0)

    def test_short_history_returns_none(self):
        self.assertIsNone(compute_icsa_spike_pct([200_000.0] * 10))


class UnavailableTests(unittest.TestCase):
    def test_missing_api_key_reports_unavailable_without_mock_values(self):
        fake_client = MagicMock()
        fake_client.fred = None
        with patch.object(pd_mod, "FREDClient", return_value=fake_client):
            snapshot = pd_mod._build_snapshot()
        self.assertEqual(snapshot["source"], "unavailable")
        self.assertIsNone(snapshot["sahm_gap"]["value"])
        for reading in snapshot["readings"].values():
            self.assertIsNone(reading["value"])


if __name__ == "__main__":
    unittest.main()
