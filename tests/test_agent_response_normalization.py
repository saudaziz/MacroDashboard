import unittest

from src.backend.agents.agent import (
    _is_quota_error,
    _message_content_to_text,
    _try_parse_json_payload,
)


class AgentResponseNormalizationTests(unittest.TestCase):
    def test_gemini_list_parts_are_joined_for_json_parsing(self):
        content = [
            {"type": "text", "text": '```json\n{"ok": true}\n```', "extras": {"signature": "ignored"}},
        ]

        parsed, raw = _try_parse_json_payload(content)

        self.assertEqual(parsed, {"ok": True})
        self.assertEqual(raw, '{"ok": true}')

    def test_mixed_content_parts_preserve_text(self):
        content = [
            {"type": "text", "text": '{"a": 1,'},
            {"type": "text", "text": '"b": 2}'},
        ]

        self.assertEqual(_message_content_to_text(content), '{"a": 1,\n"b": 2}')

    def test_quota_errors_are_detected(self):
        self.assertTrue(_is_quota_error(Exception("429 RESOURCE_EXHAUSTED: Quota exceeded")))
        self.assertFalse(_is_quota_error(Exception("JSON Parse Error")))


if __name__ == "__main__":
    unittest.main()
