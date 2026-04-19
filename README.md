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
cd backend
cp .env.example .env
# Edit .env and add your GOOGLE_API_KEY and ANTHROPIC_API_KEY

#### 🔑 API Key Configuration (Windows)

To avoid setting your keys every time you restart your system, choose one of these methods:

**Method 1: Using the `.env` file (Recommended for Development)**
1. In the `backend` folder, rename `.env.example` to `.env`.
2. Open `.env` and paste your keys: `GOOGLE_API_KEY=your_key_here`.
3. The application will automatically load these using `python-dotenv`.

**Method 2: Permanent System Variables (Universal)**
1. Search for **"Edit the system environment variables"** in the Windows Start menu.
2. Click **Environment Variables**.
3. Under **User variables**, click **New**.
4. Variable name: `GOOGLE_API_KEY`, Variable value: `your_actual_key`.
5. Restart your terminal/IDE for changes to take effect.

**Method 3: PowerShell Profile (CLI Only)**
1. Run `notepad $PROFILE` in PowerShell.
2. Add this line to the file: `$env:GOOGLE_API_KEY="your_key_here"`.
3. Save and restart PowerShell.
```

### 2. Frontend Setup
```bash
cd frontend
npm install
```

#### Configure API URL (Optional)
The frontend is configured to talk to the backend at `http://localhost:8000` by default. If your backend is running on a different port, update the `API_BASE_URL` in `frontend/src/App.tsx`.

## 🏃 Running the Application

To run the full application, you need to start both the backend and the frontend.

### 1. Start the Backend
```bash
cd backend

# Activate virtual environment
# Windows:
.\venv\Scripts\activate
# Unix/macOS:
source venv/bin/activate

# Optional: Ensure latest search tools are installed
pip install -U ddgs

python main.py
```
*The backend API will be available at http://localhost:8000*

### 2. Start the Frontend
```bash
cd frontend
npm run dev
```
*The dashboard will be available at http://localhost:5173*

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
