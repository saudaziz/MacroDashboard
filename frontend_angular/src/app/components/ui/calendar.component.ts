import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MacroCalendar } from '../../models/dashboard.models';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-[#0f172a] rounded-xl border border-slate-800 p-6 shadow-xl flex flex-col gap-6">
      <div class="flex items-center gap-2 border-b border-slate-800 pb-4">
        <div class="text-amber-500 font-bold">&#64;</div>
        <h3 class="font-display text-xl tracking-wider text-slate-100 uppercase">Macro Event Calendar</h3>
      </div>

      <div class="space-y-4">
        @for (date of data.dates; track date.event) {
          <div class="flex items-center justify-between p-3 rounded bg-slate-900/30 border border-slate-800/40">
            <div>
              <div class="text-xs font-bold text-slate-200">{{ date.event }}</div>
              <div class="text-[9px] font-mono text-slate-500 uppercase tracking-widest">{{ date.last_date }} -> {{ date.next_date }}</div>
            </div>
            <div class="text-right">
              <span class="px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 text-[10px] font-bold">{{ date.signal || 'WATCH' }}</span>
            </div>
          </div>
        }
      </div>

      <div class="mt-4">
         <div class="text-[10px] text-slate-500 font-mono uppercase tracking-widest mb-3 border-l-2 border-amber-500 pl-2">Policy Rates</div>
         <div class="grid grid-cols-2 gap-4">
            @for (rate of data.rates; track rate.bank) {
              <div class="p-3 rounded bg-slate-900/20 border border-slate-800/50">
                 <div class="text-[9px] text-slate-500 uppercase font-mono">{{ rate.bank }}</div>
                 <div class="flex justify-between items-baseline">
                    <span class="text-sm font-bold text-slate-300">{{ rate.rate }}</span>
                    <span class="text-[8px] text-slate-600">{{ rate.next_date || 'TBD' }}</span>
                 </div>
              </div>
            }
         </div>
      </div>
    </div>
  `
})
export class CalendarComponent {
  @Input({ required: true }) data!: MacroCalendar;
}
