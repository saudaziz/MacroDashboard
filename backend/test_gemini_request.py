import httpx
import json

resp = httpx.post('http://127.0.0.1:8000/api/generate-dashboard', json={'provider': 'Gemini'}, timeout=240.0)
print('Status', resp.status_code, resp.reason_code)
print(resp.text)
