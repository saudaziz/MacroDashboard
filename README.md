# MacroDashboard

A professional-grade, agentic macro-economic dashboard that leverages **LangGraph**, **Microsoft AutoGen**, **FastAPI**, and **React** to perform autonomous real-time research and deliver high-precision financial insights.

## 🚀 Key Features
- **Hybrid Multi-Agent Orchestration:** Combines **LangGraph** (for deterministic workflow control) with **Microsoft AutoGen** (for autonomous, self-correcting research teams).
- **Self-Healing Sub-Agents:** Enhanced robustness with a multi-turn JSON validation loop that automatically detects and repairs malformed LLM outputs.
- **Real-time Thinking & Progress Streaming:** Uses Server-Sent Events (SSE) to stream live status updates and raw model "reasoning_content" directly to the dashboard.
- **Multi-Model Intelligence:** Support for high-performance models including **DeepSeek V3**, **Qwen 3.5 397B**, and **Bytedance Seed** via NVIDIA AI Foundation Endpoints.
- **Dynamic Risk Sentiment:** AI-driven score (1-10) with automated deep-dives into Gold, USD (DXY), and Oil technicals.
- **Credit Health Monitoring:** Analysis of Mid-Cap Interest Coverage Ratios (ICR), PIK debt issuance, and CRE delinquency trends.

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
2. **Research Phase (AutoGen):** The "Smart Researcher" team executes. The **Lead Researcher** gathers web data, while the **Verification Analyst** rejects stale or irrelevant findings (e.g., ensuring 2026 data over 2025).
3. **Analysis Phase (LangGraph):** Data is passed to four parallel expert agents. Each agent generates a JSON-structured report.
4. **Self-Healing:** If an agent returns malformed JSON or invalid types, the system utilizes a multi-candidate parsing strategy to repair and validate the data against strict Pydantic schemas.
5. **Aggregation:** The Aggregator combines all expert insights, appends model reasoning, saves to local cache, and returns the final `MacroDashboardResponse`.

## ⚠️ Stability Features
- **Staggered Search:** queries are executed with a 1.0s delay to prevent rate-limiting and connection errors.
- **Extended Retries:** Sub-agents utilize a 5-attempt retry logic with exponential backoff.
- **Type Coercion:** Models automatically handle `null` values and coerce mixed types (e.g., bool-to-string) for technical fields.

---
*Built with ❤️ for Macro Analysts and Software Engineers.*
