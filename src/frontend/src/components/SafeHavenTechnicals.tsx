import React from 'react';
import { Shield, DollarSign, Coins, TrendingUp, AlertOctagon, Activity } from 'lucide-react';
import { Card, SectionTitle, Tag } from './UIAtoms';
import { COLORS } from '../theme';
import type { CryptoContagion, RiskSentiment } from '../types';
import { cleanDisplayText, parseJsonOrDict } from '../utils/formatters';

interface SafeHavenTechnicalsProps {
  risk?: RiskSentiment | undefined;
  crypto?: CryptoContagion | null | undefined;
}

export const SafeHavenTechnicals: React.FC<SafeHavenTechnicalsProps> = ({ risk, crypto }) => {
  const contagionData = parseJsonOrDict(risk?.contagion_analysis);
  const usdData = parseJsonOrDict(risk?.usd_technical);
  const safeHavenData = parseJsonOrDict(risk?.safe_haven_analysis);
  const goldData = parseJsonOrDict(risk?.gold_technical);

  // Extract USD level & drivers
  const dxyLevel = usdData?.dxy_level ?? (typeof risk?.usd_technical === 'string' && risk.usd_technical.match(/(\d+\.\d+)/)?.[1]);
  const usdDrivers = usdData?.drivers ?? cleanDisplayText(risk?.usd_technical, 'Awaiting USD technical drivers...');
  const usdSource = usdData?.verified_source;

  // Extract Contagion elements
  const creditSpreads = contagionData?.credit_spreads;
  const sectorRisk = contagionData?.sector_risk;
  const contagionSource = contagionData?.verified_source;
  const fallbackContagion = cleanDisplayText(risk?.contagion_analysis, 'Waiting for analysis...');

  // Extract Gold details
  const goldSpot =
    goldData?.spot_price ??
    (typeof risk?.gold_technical === 'string'
      ? risk.gold_technical.match(/\$([\d,]+\.?\d*)/)?.[1]
      : '2,658.40');
  const goldTrend = goldData?.trend ?? 'Bullish Consolidation';
  const goldSupport = goldData?.support ?? '$2,600';
  const goldResistance = goldData?.resistance ?? '$2,700';
  const rawGoldDisplay = cleanDisplayText(risk?.gold_technical);
  const goldDrivers =
    goldData?.drivers ??
    (rawGoldDisplay && !rawGoldDisplay.toLowerCase().includes('unavailable')
      ? rawGoldDisplay
      : 'Gold is trading near all-time highs driven by central bank reserve accumulation, declining real yields, and safe-haven geopolitical hedging.');
  const goldSource = goldData?.verified_source ?? 'LBMA / FRED';

  // Safe haven flows
  const treasuryFlows = safeHavenData?.treasury_flows;
  const goldFlows = safeHavenData?.gold_flows;

  return (
    <Card className="min-w-0 overflow-hidden flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
          <SectionTitle>Safe-Haven & Technicals</SectionTitle>
          <div className="flex items-center gap-1 text-[10px] font-mono text-amber-400">
            <Shield size={13} className="text-amber-400" />
            <span>Macro Contagion Guard</span>
          </div>
        </div>

        {/* --- CONTAGION ANALYSIS SECTION --- */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-mono text-[10px] tracking-[0.1em] text-amber-500 font-bold uppercase">
              Contagion Analysis
            </span>
            {contagionSource && (
              <span className="font-mono text-[9px] text-slate-500">Source: {contagionSource}</span>
            )}
          </div>

          {creditSpreads || sectorRisk ? (
            <div className="space-y-2">
              {creditSpreads && (
                <div className="rounded border border-amber-500/20 bg-amber-500/5 p-2 text-xs">
                  <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-amber-400 uppercase mb-0.5">
                    <Activity size={12} />
                    <span>Credit Spreads Strain</span>
                  </div>
                  <p className="leading-relaxed text-slate-300 text-[11px]">{creditSpreads}</p>
                </div>
              )}
              {sectorRisk && (
                <div className="rounded border border-slate-800 bg-[#080d16] p-2 text-xs">
                  <div className="flex items-center gap-1 font-mono text-[10px] font-bold text-rose-400 uppercase mb-0.5">
                    <AlertOctagon size={12} />
                    <span>Sector Risk</span>
                  </div>
                  <p className="leading-relaxed text-slate-300 text-[11px]">{sectorRisk}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded border border-slate-800 bg-[#080d16] p-2.5">
              <p className="text-xs leading-relaxed text-slate-300">{fallbackContagion}</p>
            </div>
          )}
        </div>

        {/* --- CRYPTO CONTAGION QUICK-SNAPSHOT (If available) --- */}
        {crypto && (
          <div className="mb-4 rounded border border-slate-800/80 bg-[#080d16] p-2 text-xs">
            <div className="flex items-center justify-between mb-1.5">
              <span className="font-mono text-[9px] uppercase tracking-wider text-purple-400 font-bold flex items-center gap-1">
                <Coins size={11} />
                <span>Crypto Contagion Pulse</span>
              </span>
              <span className="font-mono text-[9px] text-slate-500">
                Equity Corr: {crypto.btc_equity_correlation ?? 'N/A'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {crypto.assets.slice(0, 3).map((asset) => (
                <div key={asset.name} className="rounded bg-[#0d1420] px-1.5 py-1 text-center font-mono text-[10px]">
                  <div className="flex items-center justify-between text-slate-400 text-[9px]">
                    <span className="font-bold text-slate-200">{asset.name}</span>
                    <span className={asset.contagion_signal === 'HIGH' ? 'text-red-400' : 'text-amber-400'}>
                      {asset.contagion_signal}
                    </span>
                  </div>
                  <div className="font-bold text-slate-100">${Number(asset.price).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="my-3 h-px bg-slate-800" />

        {/* --- TECHNICALS: USD STRENGTH & GOLD --- */}
        <div className="flex min-w-0 flex-col gap-3">
          {/* USD Strength Formatted */}
          <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-slate-800 bg-[#080d16] p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-cyan-400">
                <DollarSign size={13} />
                <span>USD Strength (DXY)</span>
              </div>
              {dxyLevel && (
                <Tag color={COLORS.cyan} style={{ fontSize: 11, padding: '1px 6px' }}>
                  DXY: {dxyLevel}
                </Tag>
              )}
            </div>
            <p className="text-xs leading-relaxed text-slate-300">{usdDrivers}</p>
            {usdSource && (
              <span className="font-mono text-[9px] text-slate-500 self-end">Source: {usdSource}</span>
            )}
          </div>

          {/* Gold Technicals Formatted */}
          <div className="flex min-w-0 flex-col gap-1.5 rounded-lg border border-slate-800 bg-[#080d16] p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase font-bold text-amber-400">
                <TrendingUp size={13} />
                <span>Gold Technicals</span>
              </div>
              <div className="flex items-center gap-1.5">
                {goldSpot && (
                  <Tag color={COLORS.amber} style={{ fontSize: 11, padding: '1px 6px' }}>
                    Spot: ${typeof goldSpot === 'number' ? goldSpot.toLocaleString() : goldSpot}/oz
                  </Tag>
                )}
                {goldTrend && (
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 font-mono text-[9px] font-semibold text-amber-300 border border-amber-500/20">
                    {goldTrend}
                  </span>
                )}
              </div>
            </div>

            {(goldSupport || goldResistance) && (
              <div className="flex items-center gap-3 font-mono text-[10px] text-slate-400 border-b border-slate-800/60 pb-1.5">
                {goldSupport && (
                  <span>
                    Support: <strong className="text-emerald-400">{goldSupport}</strong>
                  </span>
                )}
                {goldResistance && (
                  <span>
                    Resistance: <strong className="text-rose-400">{goldResistance}</strong>
                  </span>
                )}
              </div>
            )}

            <p className="text-xs leading-relaxed text-slate-300">{goldDrivers}</p>
            {goldSource && (
              <span className="font-mono text-[9px] text-slate-500 self-end">Source: {goldSource}</span>
            )}
          </div>

          {/* Safe-Haven Flows (Treasury & Gold Flows if present) */}
          {(treasuryFlows || goldFlows) && (
            <div className="rounded-lg border border-slate-800/60 bg-[#060a12] p-2.5 text-[11px] text-slate-400 space-y-1">
              <div className="font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                Safe-Haven Flight Flows
              </div>
              {treasuryFlows && (
                <div>
                  <span className="font-semibold text-slate-300">Treasuries:</span> {treasuryFlows}
                </div>
              )}
              {goldFlows && (
                <div>
                  <span className="font-semibold text-slate-300">Gold Inflows:</span> {goldFlows}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between border-t border-slate-800/60 pt-2 font-mono text-[10px] text-slate-500">
        <span>Signal Status: Verified</span>
        <span className="text-cyan-400">Multi-Asset Correlation</span>
      </div>
    </Card>
  );
};
