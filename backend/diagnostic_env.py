import os
from dotenv import load_dotenv

print("--- DIAGNOSTIC START ---")
print(f"Current Working Directory: {os.getcwd()}")
print(f"Looking for .env at: {os.path.join(os.getcwd(), '.env')}")

# Explicitly load from backend/.env if possible
backend_env = os.path.join(os.getcwd(), "backend", ".env")
if os.path.exists(backend_env):
    print(f"Found backend/.env, loading it...")
    load_dotenv(backend_env)
else:
    print(f"No backend/.env found at {backend_env}, falling back to default load_dotenv()")
    load_dotenv()

keys_to_check = [
    "BYTEDANCE_API_KEY",
    "NVIDIA_API_KEY",
    "QWEN_API_KEY",
    "DEEPSEEK_API_KEY",
    "GOOGLE_API_KEY",
    "ANTHROPIC_API_KEY",
    "FRED_API_KEY"
]

for key in keys_to_check:
    val = os.getenv(key)
    if val:
        # Mask key for safety
        masked = val[:4] + "*" * (len(val) - 8) + val[-4:] if len(val) > 8 else "****"
        print(f"✅ {key}: {masked}")
    else:
        print(f"❌ {key}: NOT FOUND")

print("--- DIAGNOSTIC END ---")
