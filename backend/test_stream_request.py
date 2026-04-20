import httpx
import json

def test_stream():
    url = 'http://127.0.0.1:8000/api/stream-dashboard'
    data = {'provider': 'Bytedance', 'skip_cache': True}
    
    with httpx.stream('POST', url, json=data, timeout=300.0) as response:
        for line in response.iter_lines():
            if line.startswith('data: '):
                payload = json.loads(line[6:])
                print(f"[{payload.get('status')}] {payload.get('message', '')}")
                if payload.get('status') == 'analysis_complete':
                    print("SUCCESS")
                    break
                if payload.get('status') == 'error':
                    print(f"ERROR: {payload.get('message')}")
                    break

if __name__ == "__main__":
    test_stream()
