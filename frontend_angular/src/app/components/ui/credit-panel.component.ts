import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { CreditHealth } from '../../models/dashboard.models';

@Component({
  selector: 'app-credit-panel',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-[#0f172a] rounded-xl border border-slate-800 p-6 shadow-xl space-y-6">
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div class="flex items-center gap-3">
          <div class="text-red-500 font-bold">&#33;</div>
          <h2 class="font-display text-2xl tracking-wider text-slate-100 uppercase">Credit & Debt Watch</h2>
        </div>
        <div *ngIf="data.alert" class="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-[10px] text-red-400 font-bold uppercase tracking-widest">
          High Stress Signal
        </div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
        <!-- Core Stats -->
        <div class="space-y-4">
          <div class="p-4 rounded-lg bg-slate-900/50 border border-slate-800">
            <div class="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-1">Mid-Cap Avg ICR</div>
            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-display text-slate-100">{{ data.mid_cap_avg_icr }}x</span>
              <span [class]="data.mid_cap_avg_icr < 2.5 ? 'text-red-400' : 'text-emerald-400'" class="text-xs font-mono">
                {{ data.mid_cap_avg_icr < 2.5 ? 'CRITICAL' : 'STABLE' }}
              </span>
            </div>
          </div>
          
          <div class="grid grid-cols-2 gap-4">
            <div class="p-3 rounded-lg bg-slate-900/30 border border-slate-800">
              <div class="text-[9px] text-slate-500 uppercase tracking-widest font-mono">CRE Delinquency</div>
              <div class="text-lg font-display text-slate-200">{{ data.cre_delinquency_rate }}</div>
            </div>
            <div class="p-3 rounded-lg bg-slate-900/30 border border-slate-800">
              <div class="text-[9px] text-slate-500 uppercase tracking-widest font-mono">PIK Issuance</div>
              <div class="text-lg font-display text-slate-200">{{ data.pik_debt_issuance }}</div>
            </div>
          </div>
        </div>

        <!-- Sector Breakdown -->
        <div class="md:col-span-2 space-y-4">
          <div class="text-[10px] text-slate-500 uppercase tracking-widest font-mono border-l-2 border-amber-500 pl-2">Sectoral ICR Analysis</div>
          <div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
            @for (s of data.sectoral_breakdown; track s.sector) {
              <div class="p-3 rounded bg-slate-900/20 border border-slate-800/50 flex flex-col gap-1">
                <div class="text-[9px] text-slate-400 truncate font-mono uppercase">{{ s.sector }}</div>
                <div class="flex items-center justify-between">
                  <span class="text-sm font-bold text-slate-200">{{ s.average_icr }}x</span>
                  <span *ngIf="s.status === 'DISTRESSED'" class="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
                </div>
              </div>
            }
          </div>
        </div>
      </div>

      <!-- Watchlist -->
      <div *ngIf="data.watchlist.length > 0" class="space-y-3">
        <div class="text-[10px] text-slate-500 uppercase tracking-widest font-mono border-l-2 border-red-500 pl-2">Individual Firm Watchlist</div>
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse">
            <thead>
              <tr class="text-[9px] text-slate-500 uppercase tracking-widest font-mono border-b border-slate-800">
                <th class="py-2">Firm</th>
                <th class="py-2">ICR</th>
                <th class="py-2">Debt Load</th>
                <th class="py-2">CDS Pricing</th>
              </tr>
            </thead>
            <tbody class="text-xs font-mono">
              @for (f of data.watchlist; track f.firm_name) {
                <tr class="border-b border-slate-900 hover:bg-slate-900/20 transition-colors">
                  <td class="py-3 text-slate-200">{{ f.firm_name }} <span class="text-[9px] text-slate-500">({{ f.ticker || 'N/A' }})</span></td>
                  <td class="py-3" [class.text-red-400]="f.icr < 1.5">{{ f.icr }}x</td>
                  <td class="py-3 text-slate-400">{{ f.debt_load }}</td>
                  <td class="py-3 text-slate-400">{{ f.cds_pricing }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `
})
export class CreditPanelComponent {
  @Input({ required: true }) data!: CreditHealth;
}
