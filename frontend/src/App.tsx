import { useState } from 'react';
import type { 
  MacroDashboardResponse 
} from './types';
import { Calendar } from './components/Calendar';
import { RiskGauge } from './components/RiskGauge';
import { CreditPanel } from './components/CreditPanel';
import { EventsFeed } from './components/EventsFeed';
import { PortfolioAdvice } from './components/PortfolioAdvice';
import { Settings, RefreshCw, Loader2, AlertTriangle } from 'lucide-react';

const API_BASE_URL = 'http://localhost:8000';

function App() {
  const [data, setData] = useState<MacroDashboardResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('Agent is researching...');
  const [provider, setProvider] = useState('Gemini');
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    setData(null);
    setStatus('Initializing agent...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/stream-dashboard`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider })
      });

      if (!response.ok) throw new Error('Failed to connect to agent stream.');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      
      if (!reader) throw new Error('Stream reader not available.');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const jsonStr = line.replace('data: ', '');
            try {
              const payload = JSON.parse(jsonStr);
              if (payload.status === 'research_start' || payload.status === 'research_complete' || payload.status === 'analysis_start') {
                setStatus(payload.message);
              } else if (payload.status === 'analysis_complete') {
                setData(payload.data);
                setLoading(false);
              } else if (payload.status === 'error') {
                setError(payload.message);
                setLoading(false);
              }
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to fetch dashboard data. Make sure the backend is running.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500/30">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg">
              <RefreshCw className={loading ? "animate-spin text-white" : "text-white"} size={20} />
            </div>
            <h1 className="text-xl font-black tracking-tighter uppercase italic">Macro<span className="text-blue-500">Dashboard</span></h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 bg-slate-800 px-3 py-1.5 rounded-full border border-slate-700">
              <Settings size={14} className="text-slate-400" />
              <select 
                className="bg-transparent text-sm font-medium focus:outline-none cursor-pointer"
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                disabled={loading}
              >
                <option value="Gemini" className="bg-slate-900">Gemini 2.0 Flash</option>
                <option value="Claude" className="bg-slate-900">Claude 3.5 Sonnet</option>
                <option value="Ollama" className="bg-slate-900">Ollama (Gemma 2)</option>
              </select>
            </div>
            
            <button 
              onClick={fetchDashboard}
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-4 py-1.5 rounded-full font-bold text-sm transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95"
            >
              {loading ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
              {data ? 'Refresh' : 'Generate'}
            </button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        {!data && !loading && !error && (
          <div className="flex flex-col items-center justify-center py-20 text-center opacity-70">
            <div className="bg-slate-800 p-8 rounded-full mb-6">
              <RefreshCw size={64} className="text-slate-600" />
            </div>
            <h2 className="text-3xl font-bold mb-2">Ready to Analyze</h2>
            <p className="text-slate-400 max-w-md mx-auto">
              Click 'Generate' to trigger the agentic web search and compile your macro-economic dashboard.
            </p>
          </div>
        )}

        {loading && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Loader2 size={48} className="animate-spin text-blue-500 mb-4" />
            <h2 className="text-xl font-bold mb-1 italic">{status}</h2>
            <p className="text-slate-500 text-sm animate-pulse">Scanning the web for the latest data...</p>
          </div>
        )}

        {error && (
          <div className="bg-red-950/30 border border-red-500/50 p-6 rounded-lg text-center my-10 max-w-2xl mx-auto">
            <AlertTriangle className="text-red-500 mx-auto mb-4" size={48} />
            <h2 className="text-xl font-bold text-red-200 mb-2">Analysis Failed</h2>
            <p className="text-red-300 text-sm">{error}</p>
            <button 
              onClick={fetchDashboard}
              className="mt-6 bg-red-600 hover:bg-red-700 text-white px-6 py-2 rounded-full font-bold transition-all"
            >
              Try Again
            </button>
          </div>
        )}

        {data && !loading && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <RiskGauge data={data.risk} />
            
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <Calendar data={data.calendar} />
              <CreditPanel data={data.credit} />
            </div>

            <EventsFeed events={data.events} />
            
            <PortfolioAdvice suggestions={data.portfolio_suggestions} risks={data.risk_mitigation_steps} />
            
            <footer className="text-center pt-8 pb-12 border-t border-slate-900 text-slate-500 text-[10px] uppercase tracking-[0.2em]">
              Dynamic Macro Report Generated via {provider} Agent • Built with React, FastAPI & LangGraph
            </footer>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
