import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { DashboardStore } from '../../store/dashboard.store';
import { CalendarComponent } from '../ui/calendar.component';
import { CreditPanelComponent } from '../ui/credit-panel.component';
import { EventsFeedComponent } from '../ui/events-feed.component';
import { MacroIndicatorsComponent } from '../ui/macro-indicators.component';
import { PortfolioAdviceComponent } from '../ui/portfolio-advice.component';
import { RiskGaugeComponent } from '../ui/risk-gauge.component';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    CalendarComponent, 
    CreditPanelComponent, 
    EventsFeedComponent, 
    MacroIndicatorsComponent, 
    PortfolioAdviceComponent, 
    RiskGaugeComponent
  ],
  template: `
    <div class="min-h-screen bg-[#020617] text-slate-300 font-sans selection:bg-amber-500/30">
      <!-- Top Navigation/Header -->
      <nav class="sticky top-0 z-50 bg-[#020617]/80 backdrop-blur-md border-b border-slate-800/60 px-6 py-4">
        <div class="max-w-[1600px] mx-auto flex items-center justify-between">
          <div class="flex items-center gap-4">
            <div class="w-10 h-10 bg-amber-500 rounded flex items-center justify-center text-black font-black text-xl italic">MD</div>
            <div>
              <h1 class="font-display text-3xl tracking-tight text-white leading-none">MACRO DASHBOARD</h1>
              <div class="flex items-center gap-2 mt-1">
                <span class="w-2 h-2 rounded-full" [class]="store.isLoading() ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'"></span>
                <span class="font-mono text-[10px] uppercase tracking-[0.2em] text-slate-500">
                  {{ store.isLoading() ? 'Analysis in Progress' : 'System Ready' }}
                  <span class="ml-2 text-slate-600">
                    | {{ store.data()?.reasoning ? (store.data()?.reasoning?.split('(')[1]?.split(')')[0]) : store.provider() }}
                  </span>
                </span>
              </div>
            </div>
          </div>

          <div class="flex items-center gap-6">
            <div class="flex bg-slate-900/50 p-1 rounded-lg border border-slate-800">
              @for (p of providers; track p) {
                <button 
                  (click)="store.setProvider(p)"
                  [class]="store.provider() === p ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-500 hover:text-slate-300'"
                  class="px-4 py-1.5 rounded-md text-[11px] font-bold uppercase tracking-widest transition-all">
                  {{ p }}
                </button>
              }
            </div>
            
            <button 
              (click)="store.refreshDashboard()"
              [disabled]="store.isLoading()"
              class="group relative px-6 py-2 bg-white text-black font-bold uppercase text-xs tracking-widest rounded-md overflow-hidden disabled:opacity-50">
              <span class="relative z-10 flex items-center gap-2">
                {{ store.isLoading() ? 'Analyzing...' : 'Refresh Intelligence' }}
              </span>
            </button>
          </div>
        </div>
      </nav>

      <!-- Main Content -->
      <main class="max-w-[1600px] mx-auto p-8">
        @if (store.error()) {
          <div class="mb-8 p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-sm font-mono flex items-center gap-3">
            <span class="font-bold">ERROR:</span> {{ store.error() }}
          </div>
        }

        @if (!store.data() && !store.isLoading()) {
          <div class="h-[60vh] flex flex-col items-center justify-center text-center">
            <div class="text-slate-700 font-display text-9xl mb-4 opacity-20 uppercase tracking-tighter">Standby</div>
            <p class="text-slate-500 font-mono text-sm max-w-md uppercase tracking-[0.2em] leading-relaxed">
              Initiate intelligence gathering to populate macroeconomic visualizations and risk assessment models.
            </p>
          </div>
        }

        @if (store.isLoading() && !store.data()) {
          <div class="h-[60vh] flex flex-col items-center justify-center gap-8">
             <div class="relative w-24 h-24">
               <div class="absolute inset-0 border-4 border-amber-500/20 rounded-full"></div>
               <div class="absolute inset-0 border-4 border-t-amber-500 rounded-full animate-spin"></div>
             </div>
             
             <div class="max-w-md w-full space-y-4">
                @for (step of store.agentSteps().slice(-3); track step.message) {
                  <div class="flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <div class="text-[10px] font-mono text-amber-500/60 uppercase">[{{ step.agent || 'SYSTEM' }}]</div>
                    <div class="text-xs text-slate-400 uppercase tracking-wider">{{ step.message }}</div>
                  </div>
                }
             </div>
          </div>
        }

        @if (store.data()) {
          <div class="space-y-8 animate-in fade-in duration-700">
            <!-- Top Row: Full-Width Macro Indicators -->
            @if (store.data()?.macro_indicators) {
              <app-macro-indicators [data]="store.data()!.macro_indicators!"></app-macro-indicators>
            }

            <div class="grid grid-cols-12 gap-8">
              <!-- Left Column: Risk & Timing -->
              <div class="col-span-12 lg:col-span-4 xl:col-span-3 space-y-8">
                <!-- Risk Overview Card -->
                <div class="bg-[#0f172a] rounded-xl border border-slate-800 p-6 shadow-xl">
                   <div class="flex items-center justify-between mb-8">
                     <h3 class="font-display text-2xl tracking-wider text-slate-100 uppercase">Systemic Risk</h3>
                     <div class="px-3 py-1 bg-slate-900 border border-slate-700 rounded text-[10px] font-mono text-slate-500 uppercase">
                       {{ store.data()?.risk?.label }}
                     </div>
                   </div>
                   
                   <div class="flex flex-col items-center gap-8">
                     <app-risk-gauge [data]="store.data()!.risk"></app-risk-gauge>
                     <p class="text-xs text-slate-400 leading-relaxed text-center font-serif italic">
                       "{{ store.data()?.risk?.summary }}"
                     </p>
                   </div>
                </div>

                <app-calendar [data]="store.data()!.calendar"></app-calendar>
              </div>

              <!-- Center Column: Core Credit Data -->
              <div class="col-span-12 lg:col-span-8 xl:col-span-6 space-y-8">
                <app-credit-panel [data]="store.data()!.credit"></app-credit-panel>
              </div>

              <!-- Right Column: Strategy & Alerts -->
              <div class="col-span-12 lg:col-span-12 xl:col-span-3 space-y-8">
                <app-portfolio-advice 
                  [suggestions]="store.data()!.portfolio_suggestions"
                  [mitigation]="store.data()!.risk_mitigation_steps">
                </app-portfolio-advice>

                <app-events-feed [events]="store.data()!.events"></app-events-feed>
              </div>
            </div>
          </div>
        }
      </main>
      
      <!-- Footer Info -->
      <footer class="mt-12 border-t border-slate-900 p-8">
        <div class="max-w-[1600px] mx-auto flex flex-col md:flex-row justify-between items-center gap-6 opacity-40 grayscale">
          <div class="flex items-center gap-8">
            <div class="text-[10px] font-mono uppercase tracking-[0.3em]">Lat: 37.7749 / Long: -122.4194</div>
            <div class="text-[10px] font-mono uppercase tracking-[0.3em]">Status: Nominal</div>
          </div>
          <div class="text-[9px] font-mono uppercase tracking-[0.2em] text-center max-w-sm leading-loose">
            Generated at {{ store.data()?.generated_at || 'STANDBY' }} | Reasoning: {{ store.data()?.reasoning }}
          </div>
        </div>
      </footer>
    </div>
  `
})
export class DashboardComponent {
  readonly store = inject(DashboardStore);
  readonly providers = ['Bytedance Seed', 'DeepSeek V3', 'Qwen 3.5 397B', 'Claude 3 Haiku', 'Gemini 3.1 Flash Lite', 'Ollama Gemma'];
}
