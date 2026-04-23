# MacroDashboard v2

A high-performance macroeconomic intelligence dashboard powered by a multi-agent .NET 10 backend and a reactive Angular 19 frontend.

## 🚀 Architecture Overview

This project has been migrated from a Python/React stack to a modern, enterprise-ready architecture:

- **Backend:** .NET 10 (LTS) Web API utilizing the **Microsoft Agent Framework (MAF)** for multi-agent orchestration.
- **Frontend:** Angular 19 using **Signals** for fine-grained reactivity and the new **Resource API** for asynchronous data management.
- **AI Engine:** Microsoft.Extensions.AI abstraction supporting Azure OpenAI, Anthropic, and local models.
- **Tools:** Integrated FRED (Federal Reserve) API and real-time Web Search via specialized C# agents.

## 🛠️ Tech Stack

| Layer | Technology |
| :--- | :--- |
| **Backend** | .NET 10.0, C# 14, Microsoft Agent Framework, Polly |
| **Frontend** | Angular 19.1, Signals, NgRx Signal Store, Tailwind 4.0 |
| **Orchestration** | Graph-based Agent Workflows (Researcher + Verifier) |
| **Streaming** | Server-Sent Events (SSE) via IAsyncEnumerable |

## 🏁 Getting Started

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download/dotnet/10.0)
- [Node.js](https://nodejs.org/) (v20+ recommended)
- [Angular CLI](https://angular.io/cli) (`npm install -g @angular/cli`)

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend_dotnet/MacroDashboard.Backend
   ```
2. Configure your credentials in `appsettings.json` (or via environment variables):
   ```json
   {
     "AI": {
       "Endpoint": "YOUR_AZURE_OPENAI_ENDPOINT",
       "ApiKey": "YOUR_API_KEY",
       "ModelName": "gpt-4o"
     },
     "Fred": {
       "ApiKey": "YOUR_FRED_API_KEY"
     }
   }
   ```
3. Run the API:
   ```bash
   dotnet run
   ```
   The API will be available at `http://localhost:5000`.

### Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend_angular
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm start
   ```
   Open `http://localhost:4200` in your browser.

## 🧠 Key Features

- **Agentic Reasoning Stream:** Watch the agents' step-by-step research and verification process in real-time.
- **Surgical UI Updates:** Angular Signals ensure that only the specific DOM nodes changing in the data stream are re-rendered, providing extreme performance.
- **Resilient Workflows:** Built-in retries and self-healing logic via the Microsoft Agent Framework.
- **Cost Efficient:** Native `CancellationToken` support cancels expensive LLM calls immediately if the user closes the dashboard.

---
*Note: The original Python/React implementation is preserved in the `main` branch for reference.*
