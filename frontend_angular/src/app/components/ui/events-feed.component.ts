import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MarketEvent } from '../../models/dashboard.models';

@Component({
  selector: 'app-events-feed',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="bg-[#0f172a] rounded-xl border border-slate-800 p-6 shadow-xl">
      <div class="flex items-center gap-2 mb-6">
        <div class="text-amber-500 font-bold">&#126;</div>
        <h3 class="font-display text-xl tracking-wider text-slate-100 uppercase">Critical Market Events</h3>
      </div>

      <div class="space-y-4">
        @for (event of events; track event.title) {
          <div class="p-4 rounded-lg bg-slate-900/40 border-l-4"
               [class.border-red-500]="event.severity === 'CRITICAL'"
               [class.border-amber-500]="event.severity === 'HIGH'"
               [class.border-slate-700]="!event.severity || event.severity === 'NORMAL'">
            <div class="flex items-start justify-between mb-2">
              <h4 class="text-sm font-bold text-slate-100 uppercase tracking-tight">{{ event.title }}</h4>
              <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 uppercase tracking-widest">
                {{ event.category || 'GENERAL' }}
              </span>
            </div>
            <p class="text-xs text-slate-400 leading-relaxed mb-3">{{ event.description }}</p>
            <div class="flex items-center gap-2 pt-2 border-t border-slate-800/50">
              <div class="text-slate-500 font-bold">i</div>
              <span class="text-[10px] text-slate-500 font-mono italic">Impact: {{ event.potential_impact }}</span>
            </div>
          </div>
        } @empty {
          <div class="flex flex-col items-center justify-center py-12 px-4 border-2 border-dashed border-slate-800/50 rounded-lg opacity-40">
            <div class="text-slate-500 mb-2 font-mono text-xl">---</div>
            <p class="text-[10px] text-slate-500 uppercase tracking-widest text-center">
              No critical market events detected at this time.
            </p>
          </div>
        }
      </div>
    </div>
  `
})export class EventsFeedComponent {
  @Input({ required: true }) events!: MarketEvent[];
}
