import { Component, Input, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RiskSentiment } from '../../models/dashboard.models';

@Component({
  selector: 'app-risk-gauge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="flex flex-col items-center gap-1" role="img" [attr.aria-label]="'Systemic risk score ' + score() + ' out of 10'">
      <div class="relative w-[120px] h-[82px]">
        <svg width="120" height="82" viewBox="0 0 120 82">
          <path 
            d="M 10 66 A 55 55 0 0 1 110 66" 
            stroke="#1e293b" 
            stroke-width="10" 
            fill="none" 
            stroke-linecap="round" 
          />
          <path
            d="M 10 66 A 55 55 0 0 1 110 66"
            [attr.stroke]="color()" 
            stroke-width="10" 
            fill="none" 
            stroke-linecap="round"
            [attr.stroke-dasharray]="dashArray()"
          />
        </svg>
        <div class="absolute bottom-[6px] left-0 right-0 text-center">
          <span class="font-display text-[28px] tracking-[0.02em]" [style.color]="color()">{{ score() }}</span>
          <span class="font-mono text-[11px] text-slate-500">/10</span>
        </div>
      </div>
      <div class="px-2 py-0.5 rounded text-[10px] font-bold text-white uppercase tracking-wider" [style.background-color]="color()">
        SYSTEMIC ALERT
      </div>
    </div>
  `
})
export class RiskGaugeComponent {
  @Input({ required: true }) data!: RiskSentiment;

  score = computed(() => this.data.score);
  
  color = computed(() => {
    const s = this.score();
    if (s >= 8) return '#f87171'; // red-400
    if (s >= 6) return '#fb923c'; // orange-400
    return '#fbbf24'; // amber-400
  });

  dashArray = computed(() => {
    const pct = (this.score() / 10) * 100;
    return `${(pct / 100) * 172.8} 172.8`;
  });
}
