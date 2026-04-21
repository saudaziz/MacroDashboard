import React from 'react';
import { ArrowUpRight, ArrowDownRight, Minus, Activity } from 'lucide-react';
import { Card, MetricBig, SectionTitle } from './UIAtoms';
import { COLORS } from '../theme';
import type { MacroIndicators as MacroIndicatorsType } from '../types';

interface MacroIndicatorsProps {
  data: MacroIndicatorsType;
}

const TrendIcon = ({ trend }: { trend?: string | undefined }) => {
  if (trend === 'UP') return <ArrowUpRight size={16} className="text-red-400" />;
  if (trend === 'DOWN') return <ArrowDownRight size={16} className="text-emerald-400" />;
  return <Minus size={16} className="text-slate-500" />;
};

export const MacroIndicators: React.FC<MacroIndicatorsProps> = ({ data }) => {
  if (!data) return null;

  return (
    <Card className="flex flex-col gap-6">
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <Activity size={20} className="text-amber-500" />
          <h2 className="font-['Bebas_Neue'] text-2xl tracking-wider text-slate-100 uppercase">Core Macro Indicators</h2>
        </div>
        <div className="font-mono text-[10px] text-slate-500 uppercase tracking-widest">Fred Real-Time Feed</div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {/* Yield Curve Section */}
        <div className="space-y-6">
          <SectionTitle>Yield Spreads</SectionTitle>
          <div className="grid gap-6">
            <div className="flex items-start justify-between">
              <MetricBig
                label="10Y-2Y Spread"
                value={data?.yield_curve_2y_10y?.value || 'N/A'}
                unit="%"
                color={parseFloat(String(data?.yield_curve_2y_10y?.value || '0')) < 0 ? COLORS.red : COLORS.green}
                sub={data?.yield_curve_2y_10y?.note}
                helpText="Difference between 10-year and 2-year Treasury yields. Inversion (negative) often precedes recessions."
              />
              <TrendIcon trend={data?.yield_curve_2y_10y?.trend} />
            </div>
            <div className="flex items-start justify-between">
              <MetricBig
                label="10Y-3M Spread"
                value={data?.yield_curve_3m_10y?.value || 'N/A'}
                unit="%"
                color={parseFloat(String(data?.yield_curve_3m_10y?.value || '0')) < 0 ? COLORS.red : COLORS.green}
                sub={data?.yield_curve_3m_10y?.note}
                helpText="Difference between 10-year and 3-month Treasury yields. Deep inversion is a strong recession signal."
              />
              <TrendIcon trend={data?.yield_curve_3m_10y?.trend} />
            </div>
          </div>
        </div>

        {/* Inflation & Rates Section */}
        <div className="space-y-6">
          <SectionTitle>Inflation & Policy</SectionTitle>
          <div className="grid gap-6">
            <div className="flex items-start justify-between">
              <MetricBig
                label="CPI Inflation"
                value={data?.inflation_cpi?.value || 'N/A'}
                unit="%"
                color={parseFloat(String(data?.inflation_cpi?.value || '0')) > 3 ? COLORS.red : COLORS.amber}
                sub="Consumer Price Index (YoY)"
                helpText="Measure of average change over time in prices paid by consumers for a market basket of goods/services."
              />
              <TrendIcon trend={data?.inflation_cpi?.trend} />
            </div>
            <div className="flex items-start justify-between">
              <MetricBig
                label="Fed Funds Rate"
                value={data?.fed_funds_rate?.value || 'N/A'}
                unit="%"
                color={COLORS.amber}
                sub="Effective Overnight Rate"
                helpText="The interest rate at which depository institutions lend reserve balances to other depository institutions overnight."
              />
              <TrendIcon trend={data?.fed_funds_rate?.trend} />
            </div>
          </div>
        </div>

        {/* Labor & Liquidity Section */}
        <div className="space-y-6">
          <SectionTitle>Labor & Liquidity</SectionTitle>
          <div className="grid gap-6">
            <div className="flex items-start justify-between">
              <MetricBig
                label="Unemployment"
                value={data?.unemployment_rate?.value || 'N/A'}
                unit="%"
                color={parseFloat(String(data?.unemployment_rate?.value || '0')) > 4.5 ? COLORS.red : COLORS.green}
                sub="U-3 Total Rate"
                helpText="The percentage of the total labor force that is unemployed but actively seeking employment and willing to work."
              />
              <TrendIcon trend={data?.unemployment_rate?.trend} />
            </div>
            <div className="flex items-start justify-between">
              <MetricBig
                label="M2 Money Supply"
                value={data?.m2_money_supply?.value || 'N/A'}
                unit="B"
                color={COLORS.cyan}
                sub="Broad Liquid Money"
                helpText="Measure of the money supply that includes cash, checking deposits, and easily convertible near money."
              />
              <TrendIcon trend={data?.m2_money_supply?.trend} />
            </div>
          </div>
        </div>
      </div>
    </Card>
  );
};
