import unittest
from unittest.mock import MagicMock, patch
import pandas as pd

from src.backend.core.market_data import MarketDataProvider
from src.backend.core.fred_tool import FREDClient


class MarketDataProviderTests(unittest.TestCase):
    def setUp(self):
        self.provider = MarketDataProvider(timeout=2.0)

    def test_get_live_gold_price_returns_calibrated_spot(self):
        price = self.provider.get_live_gold_price()
        self.assertIsInstance(price, float)
        # Gold should be > $3,500/oz in current 2026 pricing, eliminating the ~$1,500 gap
        self.assertGreater(price, 3500.0)

    def test_get_live_crypto_prices_contains_major_assets(self):
        crypto = self.provider.get_live_crypto_prices()
        self.assertIn("BTC", crypto)
        self.assertIn("ETH", crypto)
        self.assertIn("SOL", crypto)
        self.assertGreater(crypto["BTC"]["price"], 50000.0)
        self.assertGreater(crypto["ETH"]["price"], 1000.0)
        self.assertGreater(crypto["SOL"]["price"], 50.0)

    def test_get_central_bank_policy_rates_returns_all_four_banks(self):
        rates = self.provider.get_central_bank_policy_rates()
        for bank in ["FED", "ECB", "BOE", "BOJ"]:
            self.assertIn(bank, rates)
            self.assertIn("rate", rates[bank])
            self.assertTrue(rates[bank]["rate"].endswith("%"))

    def test_cpi_yoy_calculation_with_exact_12_month_offset(self):
        client = FREDClient()
        # Mock fred.get_series to return a 24-month series where latest is 103.35 and 12-months-prior is 100.0
        dates = pd.date_range(start="2024-09-01", periods=24, freq="MS")
        values = [100.0] * 12 + [100.0 + (i * (3.35 / 11)) for i in range(12)]
        mock_series = pd.Series(values, index=dates)

        with patch.object(client, "fred") as mock_fred:
            # First simulate pc1 failing to exercise fallback iloc[-12]
            mock_fred.get_series.side_effect = [Exception("no pc1"), mock_series]
            yoy = client.get_series_yoy("CPIAUCSL")
            self.assertIsNotNone(yoy)
            self.assertAlmostEqual(yoy, 3.35, places=2)


if __name__ == "__main__":
    unittest.main()
