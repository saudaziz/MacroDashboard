
import asyncio
import json
import os
import pytest
from backend.agent import stream_macro_dashboard

@pytest.mark.asyncio
async def test_bytedance():
    print("Testing Bytedance Seed Provider...")
    # Skip cache to force a fresh API call
    async for chunk in stream_macro_dashboard("Bytedance Seed", skip_cache=True):
        data = json.loads(chunk)
        status = data.get("status")
        message = data.get("message", "")
        
        if status == "error":
            print(f"\n[ERROR] {message}")
            if "raw_response" in data:
                print(f"Raw Response: {data['raw_response']}")
            return
            
        if status == "analysis_progress":
            print(f"  > {message}")
            
        if status == "analysis_complete":
            print("\n[SUCCESS] Data retrieved successfully!")
            # Check if reasoning exists
            if "reasoning" in data.get("data", {}):
                print("Reasoning content found.")
            print(f"Calendar events found: {len(data['data'].get('calendar', {}).get('dates', []))}")
            return

if __name__ == "__main__":
    asyncio.run(test_bytedance())
