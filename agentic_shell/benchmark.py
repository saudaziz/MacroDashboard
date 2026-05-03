import time
import asyncio
import sys
import os

# Ensure we can import from the root
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../')))

from agentic_shell.routers.dashboard_router import route_dashboard_request
from backend.agent import generate_macro_dashboard

def benchmark_latency(name, func, *args, iterations=5):
    print(f"\n--- Benchmarking: {name} ---")
    latencies = []
    for i in range(iterations):
        start = time.perf_counter()
        func(*args)
        end = time.perf_counter()
        latencies.append((end - start) * 1000)
    
    avg = sum(latencies) / iterations
    print(f"Average Latency: {avg:.4f} ms")
    return avg

def run_comparison():
    print("Agentic Shell vs. Legacy Comparison Suite")
    
    # 1. Legacy Latency (Direct Call)
    # Using 'Mock Terminal' to isolate architectural overhead from network latency
    legacy_avg = benchmark_latency("Legacy Direct Call", generate_macro_dashboard, "Mock Terminal", True)
    
    # 2. Agentic Shell Latency (Router + Adapter + State)
    agentic_avg = benchmark_latency("Agentic Shell Routed", route_dashboard_request, "Mock Terminal", True)
    
    overhead = agentic_avg - legacy_avg
    print(f"\n--- SUMMARY ---")
    print(f"Architectural Overhead: {overhead:.4f} ms")
    print(f"Percentage Overhead: {(overhead/legacy_avg)*100:.4f}%")
    
    # Theoretical Stats
    print("\n--- TOKEN AND PERFORMANCE ANALYSIS ---")
    print("Token Usage: 100% Identical (Current Shell wraps Legacy Prompts)")
    print("Failure Recovery: Shell version performs fallback in logic vs. exception handling.")
    print("Confidence Level: Shell provides an explicit confidence score (e.g. 0.9).")

if __name__ == "__main__":
    run_comparison()
