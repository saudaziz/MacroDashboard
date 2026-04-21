# MacroDashboard

A high-frequency macroeconomic intelligence platform that synthesizes fragmented global market data—including economic calendars, credit stress indicators, and liquidity signals—into a unified real-time dashboard. Engineered with an autonomous multi-agent research layer to perform deep-dive analysis on emerging market trends, replacing manual data aggregation with automated, LLM-driven insights.

## 🚀 Key Features
- **Agent-UI Protocol (New):** Implements an open event-streaming protocol for real-time visibility into multi-agent workflows, featuring **Active Agent Spotlights** and live **Multi-Agent Trace** logs.
- **Human-in-the-Loop (HITL):** Integrated "Interrupt" pattern that pauses the workflow for critical alerts (e.g., low ICR detected), allowing users to approve deep-dives or reject risky strategies.
- **Progressive Data Rendering:** Uses **Snapshot Cards** to populate the dashboard live as each sub-agent finishes, reducing perceived latency from minutes to seconds.
- **Hybrid Multi-Agent Orchestration:** Combines **LangGraph** (for deterministic workflow control) with **Microsoft AutoGen** (for autonomous, self-correcting research teams).
- **Self-Healing Sub-Agents:** Enhanced robustness with a multi-turn JSON validation loop that automatically detects and repairs malformed LLM outputs.
- **Real-time Thinking & Progress Streaming:** Uses Server-Sent Events (SSE) to stream live status updates and raw model "reasoning_content" directly to the dashboard.
- **Multi-Model Intelligence:** Support for high-performance models including **DeepSeek V3**, **Qwen 3.5 397B**, and **Bytedance Seed** via NVIDIA AI Foundation Endpoints.

## 🏗️ High-Level Architecture
```text
[ React SPA Frontend ] (Vite, TS, Tailwind v4)
         |
         |  REST (Config/State) & Server-Sent Events (SSE) (Data Streams)
         v
[ FastAPI Backend ] (Uvicorn, async)
         |
         |--> [ LLM Provider Factory ] (providers.py) 
         |      |-> NVIDIA (Qwen, DeepSeek, Bytedance)
         |      |-> Anthropic (Claude), Google (Gemini), Local (Ollama)
         |
         |--> [ LangGraph Orchestrator ] (agent.py)
                |
                |--> Node: Researcher (Microsoft AutoGen Team)
                |      |-> Agent: Lead Researcher (Search Tooling)
                |      |-> Agent: Verification Analyst (Quality Control)
                |
                |--> Node: Sub-Agents (Parallel Execution)
                |      |-> Experts: Calendar, Risk, Credit, Strategy
                |      |-> Logic: Self-healing JSON Parsing & Retries
                |
                |--> Node: Aggregator (Pydantic validation & Cache save)
         |
         |--> [ File System Cache ] (JSON artifacts per provider/date)
```

## 🛠️ Tech Stack

### Backend (Agentic Engine)
- **Framework:** Python 3.13 + FastAPI.
- **Orchestration:** [LangGraph](https://github.com/langchain-ai/langgraph) + [Microsoft AutoGen 0.10](https://microsoft.github.io/autogen/).
- **Model Clients:** `autogen-ext` with `OpenAIChatCompletionClient`.
- **Search Engine:** `DuckDuckGo Search` (with staggered query execution for reliability).
- **Data Models:** Pydantic v2 with flexible validators and type coercion.

### Frontend (Dashboard)
- **Framework:** React 19 + TypeScript 6.
- **Styling:** **Tailwind CSS v4** (using native `@tailwindcss/vite`).
- **Data Visualization:** Recharts.
- **Icons:** Lucide React.
- **State Management:** Custom `useDashboard` hook with streaming `ReadableStream` integration.

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 20+

### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate # Unix/macOS

# Install dependencies
python -m pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env and add your API Keys (NVIDIA_API_KEY, GOOGLE_API_KEY, etc.)
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```

## 🔍 Internal Workflow (Execution Flow)
1. **Bootstrap:** Frontend fetches active providers and last-saved dashboard.
2. **Research Phase (AutoGen):** The "Smart Researcher" team executes. The **Lead Researcher** gathers web data, while the **Verification Analyst** rejects stale findings. Live logs are streamed to the **Agent Trace** panel.
3. **Analysis Phase (LangGraph):** Data is passed to four parallel expert agents.
    - **Progressive Updates:** As each agent (e.g., Calendar) finishes, a `snapshot` is emitted to populate the UI immediately.
    - **HITL Interrupt:** If the **Credit Agent** flags a critical risk, the workflow pauses. A modal appears in the UI asking for user approval to proceed with a deep-dive stress test.
4. **Self-Healing:** If an agent returns malformed JSON, the system utilizes a multi-candidate parsing strategy to repair and validate the data against strict Pydantic schemas.
5. **Aggregation:** The Aggregator combines all expert insights, appends model reasoning, saves to local cache, and returns the final `MacroDashboardResponse`.

## ⚠️ Stability Features
- **Staggered Search:** queries are executed with a 1.0s delay to prevent rate-limiting and connection errors.
- **Extended Retries:** Sub-agents utilize a 5-attempt retry logic with exponential backoff.
- **Type Coercion:** Models automatically handle `null` values and coerce mixed types (e.g., bool-to-string) for technical fields.

---
*Built with ❤️ for Macro Analysts and Software Engineers.*
