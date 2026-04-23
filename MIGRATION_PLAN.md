# Technical Specification: MacroDashboard Migration (.NET 10 & Angular 19)

## 1. Vision
Migrate the existing Python/React MacroDashboard to a .NET 10 (LTS) backend and an Angular 19 frontend. The goal is to leverage fine-grained reactivity (Signals), enterprise-grade agent orchestration (Microsoft Agent Framework), and superior runtime performance.

## 2. Backend Architecture (.NET 10)
- **Framework:** ASP.NET Core Web API (.NET 10).
- **Agent Orchestration:** Microsoft Agent Framework (MAF).
- **AI Abstractions:** `Microsoft.Extensions.AI` (IChatClient).
- **Resilience:** Polly for retries and circuit breakers.
- **Data Models:** C# Records with `System.Text.Json` source generation.
- **Key Features:**
    - Graph-based multi-agent workflows (Researcher -> Verifier).
    - SSE (Server-Sent Events) streaming via `IAsyncEnumerable`.
    - Native AOT compatibility for minimal startup time.

## 3. Frontend Architecture (Angular 19)
- **Framework:** Angular 19 (Standalone, Zoneless).
- **State Management:** Angular Signals + NgRx Signal Store.
- **Async Data:** Angular `resource()` API for stream management.
- **Styling:** Tailwind CSS 4.0 (CSS-first engine).
- **Visualization:** ngx-charts or Chart.js for reactive data rendering.

## 4. Key Improvements
- **Performance:** Surgical UI updates via Signals vs. VDOM reconciliation.
- **Cost Control:** Deep `CancellationToken` integration to stop LLM tasks on client disconnect.
- **Agnosticity:** Dynamic year calculation and configuration-driven model selection.

5. **Roadmap**
1. [x] **Phase 1:** Initialize .NET 10 solution and C# Data Models.
2. [x] **Phase 2:** Implement FRED and Search `AITools`.
3. [x] **Phase 3:** Construct the MAF Agent Graph.
4. [x] **Phase 4:** Scaffold Angular 19 project and Signal Store.
5. [x] **Phase 5:** Implement the Streaming Resource Loader.
6. [ ] **Phase 6:** Parity testing and validation.
