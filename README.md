# MacroDashboard

A professional-grade, agentic macro-economic dashboard that leverages **LangGraph**, **FastAPI**, and **React** to perform real-time web research and deliver actionable financial insights.

## 🚀 Key Features
- **Stateful Agent Workflow:** Powered by LangGraph, utilizing a multi-node architecture (`Researcher` -> `Analyst`) for high-precision data gathering.
- **Real-time Progress Streaming:** Uses Server-Sent Events (SSE) to stream live status updates ("Agent is researching...", "Analyst is processing...") directly to the UI.
- **Macro Calendar & G7 Rates:** Tracks next dates for CPI, PPI, Jobs, and central bank guidance (FED, BOJ, BOE, ECB).
- **Intelligent Risk Sentiment:** AI-driven score (1-10) that triggers a "Safe Haven Deep-Dive" (Gold/USD) when risk levels exceed 8/10.
- **Credit Health Monitoring:** Deep analysis of Mid-Cap Interest Coverage Ratios (ICR), PIK debt issuance, and CRE delinquency rates.
- **Actionable Portfolio Strategy:** Dynamic allocation suggestions based on live macro conditions.

## 🛠️ Tech Stack

### Backend (Agentic Engine)
- **Framework:** Python 3.13 + FastAPI.
- **AI Orchestration:** [LangGraph](https://github.com/langchain-ai/langgraph) for stateful workflows.
- **Search Engine:** `DuckDuckGo Search` (via `ddgs`).
- **Data Models:** Pydantic v2 for strict schema validation.
- **Providers:** **Gemini (Default)**, Claude, and Ollama.

### Frontend (Dashboard)
- **Framework:** React 19 + TypeScript 6.
- **Styling:** **Tailwind CSS v4** (utilizing the native `@tailwindcss/vite` plugin).
- **Build Tool:** Vite 8.
- **Icons:** Lucide React.
- **State Management:** React Hooks with streaming `ReadableStream` integration.

## ⚙️ Setup & Installation

### Prerequisites
- Python 3.11+
- Node.js 20+
- Anthropic API Key (for Claude)

### 1. Backend Setup
```bash
cd backend
python -m venv venv
.\venv\Scripts\activate  # Windows
source venv/bin/activate # Unix/macOS

# Install dependencies
pip install -r requirements.txt
pip install -U ddgs  # Ensure latest search tools are installed

# Configure environment
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY and ANTHROPIC_API_KEY
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

## 🏃 Running the Application

1. **Start the Backend:**
   ```bash
   cd backend
   python main.py
   ```
   *Runs at http://localhost:8000*

2. **Start the Frontend:**
   ```bash
   cd frontend
   npm run dev
   ```
   *Runs at http://localhost:5173*

## 🔍 Internal Workflow (LangGraph)
The agent follows a strict state machine:
1. **Research Node:** Executes a batch of 9 targeted web queries (Macro dates, ICRs, Geopolitical events).
2. **Analyst Node:** Consumes research data and maps it to the `MacroDashboardResponse` Pydantic model.
3. **Streaming:** The `stream_macro_dashboard` generator yields JSON status chunks to the FastAPI `StreamingResponse`.

## ⚠️ Troubleshooting
- **Blank White Page:** Ensure you have performed a hard refresh (`Ctrl+F5`) after the Tailwind v4 upgrade. Check browser console for CSS loading errors.
- **Search Errors:** If you see "Please install ddgs", run `pip install -U ddgs` in your virtual environment.
- **API Failures:** Verify that your `ANTHROPIC_API_KEY` is correctly set in `backend/.env`.

---
*Built with ❤️ for Macro Analysts and Software Engineers.*
