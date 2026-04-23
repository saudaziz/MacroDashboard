import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PortfolioAllocation } from '../../models/dashboard.models';

@Component({
  selector: 'app-portfolio-advice',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-[#0f172a] rounded-xl border border-slate-800 p-6 shadow-xl flex flex-col gap-4">
      <div class="flex items-center gap-2 border-b border-slate-800 pb-4">
        <div class="text-emerald-500 font-bold">&#36;</div>
        <h3 class="font-display text-xl tracking-wider text-slate-100 uppercase">Portfolio Strategy</h3>
      </div>
      
      <div class="space-y-4">
        @for (item of suggestions; track item.asset_class) {
          <div class="p-4 rounded-lg bg-slate-900/40 border border-slate-800/50">
            <div class="flex justify-between items-center mb-1">
              <span class="text-xs font-bold text-slate-200 uppercase tracking-tight">{{ item.asset_class }}</span>
              <span class="text-sm font-display text-emerald-400">{{ item.percentage }}</span>
            </div>
            <p class="text-[10px] text-slate-500 italic leading-relaxed">{{ item.rationale }}</p>
          </div>
        }
      </div>

      <div class="mt-4 pt-4 border-t border-slate-800/50">
        <div class="text-[9px] font-mono text-slate-500 uppercase tracking-widest mb-3">Risk Mitigation</div>
        <div class="space-y-2">
          @for (step of mitigation; track $index) {
            <div class="flex items-start gap-2">
              <span class="text-amber-500 text-[10px] mt-0.5">▶</span>
              <span class="text-xs text-slate-400 leading-tight">{{ step }}</span>
            </div>
          }
        </div>
      </div>
    </div>
  `
})
export class PortfolioAdviceComponent {
  @Input({ required: true }) suggestions!: PortfolioAllocation[];
  @Input({ required: true }) mitigation!: string[];
}
