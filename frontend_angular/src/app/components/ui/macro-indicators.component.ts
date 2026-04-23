import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MacroIndicators as MacroIndicatorsType } from '../../models/dashboard.models';

@Component({
  selector: 'app-macro-indicators',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-[#0f172a] rounded-xl border border-slate-800 p-6 flex flex-col gap-6 shadow-xl">
      <div class="flex items-center justify-between border-b border-slate-800 pb-4">
        <div class="flex items-center gap-3">
          <div class="text-amber-500 font-bold">&#126;</div>
          <h2 class="font-display text-2xl tracking-wider text-slate-100 uppercase">Core Macro Indicators</h2>
        </div>
        <div class="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Fred Real-Time Feed</div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        <!-- Yield Curve Section -->
        <div class="space-y-6">
          <div class="font-mono text-[11px] text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Yield Spreads
          </div>
          <div class="grid gap-6">
            <ng-container *ngTemplateOutlet="metric; context: { 
              label: '10Y-2Y Spread', 
              val: data.yield_curve_2y_10y,
              help: 'Difference between 10-year and 2-year Treasury yields.'
            }"></ng-container>
            <ng-container *ngTemplateOutlet="metric; context: { 
              label: '10Y-3M Spread', 
              val: data.yield_curve_3m_10y,
              help: 'Difference between 10-year and 3-month Treasury yields.'
            }"></ng-container>
          </div>
        </div>

        <!-- Inflation & Policy Section -->
        <div class="space-y-6">
          <div class="font-mono text-[11px] text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Inflation & Policy
          </div>
          <div class="grid gap-6">
            <ng-container *ngTemplateOutlet="metric; context: { 
              label: 'CPI Inflation', 
              val: data.inflation_cpi,
              help: 'Consumer Price Index (YoY)'
            }"></ng-container>
            <ng-container *ngTemplateOutlet="metric; context: { 
              label: 'Fed Funds Rate', 
              val: data.fed_funds_rate,
              help: 'Effective Overnight Rate'
            }"></ng-container>
          </div>
        </div>

        <!-- Labor & Liquidity Section -->
        <div class="space-y-6">
          <div class="font-mono text-[11px] text-slate-400 uppercase tracking-widest flex items-center gap-2">
            <span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Labor & Liquidity
          </div>
          <div class="grid gap-6">
            <ng-container *ngTemplateOutlet="metric; context: { 
              label: 'Unemployment', 
              val: data.unemployment_rate,
              help: 'U-3 Total Rate'
            }"></ng-container>
            <ng-container *ngTemplateOutlet="metric; context: { 
              label: 'M2 Money Supply', 
              val: data.m2_money_supply,
              help: 'Broad Liquid Money'
            }"></ng-container>
          </div>
        </div>
      </div>
    </div>

    <ng-template #metric let-label="label" let-val="val" let-help="help">
      <div class="flex items-start justify-between">
        <div class="flex flex-col gap-1">
          <div class="text-[10px] uppercase tracking-widest text-slate-500 font-mono">{{ label }}</div>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl font-display tracking-tight text-slate-100">{{ val?.value || 'N/A' }}</span>
            <span class="text-xs font-mono text-slate-500">{{ val?.unit || '%' }}</span>
          </div>
          <div class="text-[10px] text-slate-400 font-mono leading-tight max-w-[140px]">{{ val?.note || help }}</div>
        </div>
        <div class="mt-1">
          <span *ngIf="val?.trend === 'UP'" class="text-red-400 font-bold">↑</span>
          <span *ngIf="val?.trend === 'DOWN'" class="text-emerald-400 font-bold">↓</span>
          <span *ngIf="!val?.trend || val?.trend === 'STABLE'" class="text-slate-500 font-bold">-</span>
        </div>
      </div>
    </ng-template>
  `
})
export class MacroIndicatorsComponent {
  @Input({ required: true }) data!: MacroIndicatorsType;
}
