"use client";

import { useState, useEffect } from "react";
import {
  Phone, TrendingUp, Users, Target, Award, Download,
  ArrowUp, ArrowDown, BarChart3, Calendar, Zap,
} from "lucide-react";

interface DailyStat {
  id: string;
  date: string;
  callsMade: number;
  closedCount: number;
  closedValueUsd: number;
  leadsAdded: number;
  meetingsBooked: number;
  showedUp: number;
  noShows: number;
  scansUsed: number;
}

interface PipelineSummary {
  NEW: number;
  CALLED: number;
  BOOKED: number;
  SHOWED: number;
  CLOSED: number;
  NOSHOW: number;
  totalValue: number;
}

export default function AnalyticsPage() {
  const [stats, setStats] = useState<DailyStat[]>([]);
  const [pipeline, setPipeline] = useState<PipelineSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState<7 | 14 | 30>(30);

  useEffect(() => {
    Promise.all([
      fetch("/api/call-session").then((r) => r.json()),
      fetch("/api/pipeline").then((r) => r.json()),
    ]).then(([callData, pipelineData]) => {
      setStats(callData.stats ?? []);

      // Summarize pipeline
      const leads: any[] = pipelineData.leads ?? [];
      const summary: PipelineSummary = {
        NEW: 0, CALLED: 0, BOOKED: 0, SHOWED: 0, CLOSED: 0, NOSHOW: 0, totalValue: 0,
      };
      for (const l of leads) {
        if (summary[l.status as keyof PipelineSummary] !== undefined) {
          (summary[l.status as keyof PipelineSummary] as number)++;
        }
        summary.totalValue += l.dealValueUsd ?? 0;
      }
      setPipeline(summary);
    }).finally(() => setLoading(false));
  }, []);

  const filtered = stats.slice(-range);

  const totals = filtered.reduce(
    (acc, s) => ({
      calls: acc.calls + s.callsMade,
      closed: acc.closed + s.closedCount,
      value: acc.value + s.closedValueUsd,
      leads: acc.leads + s.leadsAdded,
      scans: acc.scans + s.scansUsed,
    }),
    { calls: 0, closed: 0, value: 0, leads: 0, scans: 0 }
  );

  const connectRate = totals.calls > 0 ? ((totals.closed / totals.calls) * 100).toFixed(1) : "0";
  const avgDeal = totals.closed > 0 ? (totals.value / totals.closed).toFixed(0) : "0";

  // Chart helpers
  const maxCalls = Math.max(...filtered.map((s) => s.callsMade), 1);
  const maxValue = Math.max(...filtered.map((s) => s.closedValueUsd), 1);

  function Bar({ value, max, color }: { value: number; max: number; color: string }) {
    const h = max > 0 ? Math.round((value / max) * 80) : 0;
    return (
      <div className="flex flex-col items-center justify-end h-20">
        <div
          className={`w-full rounded-t-sm ${color} transition-all duration-500`}
          style={{ height: `${Math.max(h, value > 0 ? 4 : 0)}px` }}
        />
      </div>
    );
  }

  const pipelineStages = [
    { key: "NEW", label: "New", color: "bg-gray-400", text: "text-gray-600" },
    { key: "CALLED", label: "Called", color: "bg-blue-400", text: "text-blue-600" },
    { key: "BOOKED", label: "Booked", color: "bg-purple-400", text: "text-purple-600" },
    { key: "SHOWED", label: "Showed", color: "bg-amber-400", text: "text-amber-600" },
    { key: "CLOSED", label: "Closed 💰", color: "bg-green-500", text: "text-green-600" },
    { key: "NOSHOW", label: "No Show", color: "bg-red-400", text: "text-red-500" },
  ];

  const totalPipelineLeads = pipeline
    ? Object.values(pipeline).reduce((a, b) => (typeof b === "number" && b !== pipeline.totalValue ? a + b : a), 0)
    : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-blue-600 text-lg">ColdCRM</span>
        <a href="/scan" className="text-sm text-gray-500 hover:text-gray-700">Scanner</a>
        <a href="/call-mode" className="text-sm text-gray-500 hover:text-gray-700">📞 Call Mode</a>
        <a href="/pipeline" className="text-sm text-gray-500 hover:text-gray-700">Pipeline</a>
        <a href="/analytics" className="text-sm font-medium text-blue-600">Analytics</a>
        <a href="/settings" className="text-sm text-gray-500 hover:text-gray-700 ml-auto">Settings</a>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
            <p className="text-sm text-gray-500 mt-0.5">Your sales performance at a glance</p>
          </div>
          <div className="flex gap-2">
            {([7, 14, 30] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
                  range === r ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {r}d
              </button>
            ))}
            <a
              href="/api/export"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium border border-gray-200 bg-white text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Download className="w-3.5 h-3.5" /> Export CSV
            </a>
          </div>
        </div>

        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="card h-24 skeleton" />
            ))}
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              {[
                { label: "Total Calls", value: totals.calls, icon: Phone, color: "text-blue-600", bg: "bg-blue-50" },
                { label: "Deals Closed", value: totals.closed, icon: Award, color: "text-green-600", bg: "bg-green-50" },
                { label: "Revenue", value: `$${totals.value.toLocaleString()}`, icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
                { label: "Leads Generated", value: totals.leads, icon: Users, color: "text-purple-600", bg: "bg-purple-50" },
              ].map((k) => (
                <div key={k.label} className="card">
                  <div className="flex items-start justify-between mb-3">
                    <div className={`w-9 h-9 rounded-lg ${k.bg} flex items-center justify-center`}>
                      <k.icon className={`w-4 h-4 ${k.color}`} />
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{k.value}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{k.label}</p>
                </div>
              ))}
            </div>

            {/* Secondary metrics */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: "Close Rate", value: `${connectRate}%`, sub: "calls → closed", color: "text-green-600" },
                { label: "Avg Deal Value", value: `$${avgDeal}`, sub: "per closed deal", color: "text-emerald-600" },
                { label: "Scans Run", value: totals.scans, sub: "lead searches", color: "text-blue-600" },
              ].map((m) => (
                <div key={m.label} className="card flex items-center gap-4">
                  <div>
                    <p className={`text-2xl font-bold ${m.color}`}>{m.value}</p>
                    <p className="text-sm font-medium text-gray-700">{m.label}</p>
                    <p className="text-xs text-gray-400">{m.sub}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Charts row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
              {/* Calls per day chart */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Calls per Day</h3>
                    <p className="text-xs text-gray-400">Last {range} days</p>
                  </div>
                  <BarChart3 className="w-4 h-4 text-gray-400" />
                </div>
                {filtered.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">No call data yet — start calling!</p>
                ) : (
                  <div className="flex items-end gap-1 h-24">
                    {filtered.map((s, i) => (
                      <div key={i} className="flex-1 group relative">
                        <Bar value={s.callsMade} max={maxCalls} color="bg-blue-500" />
                        {/* Tooltip */}
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                          {new Date(s.date).toLocaleDateString("en", { month: "short", day: "numeric" })}: {s.callsMade} calls
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Revenue per day chart */}
              <div className="card">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Revenue per Day</h3>
                    <p className="text-xs text-gray-400">Closed deals value</p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                </div>
                {filtered.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-8">Close your first deal to see revenue!</p>
                ) : (
                  <div className="flex items-end gap-1 h-24">
                    {filtered.map((s, i) => (
                      <div key={i} className="flex-1 group relative">
                        <Bar value={s.closedValueUsd} max={maxValue} color="bg-green-500" />
                        <div className="absolute bottom-full mb-1 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs rounded px-1.5 py-0.5 opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none z-10">
                          {new Date(s.date).toLocaleDateString("en", { month: "short", day: "numeric" })}: ${s.closedValueUsd}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Pipeline funnel */}
            {pipeline && (
              <div className="card mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">Pipeline Funnel</h3>
                    <p className="text-xs text-gray-400">{totalPipelineLeads} total leads tracked</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-green-600">${pipeline.totalValue.toLocaleString()}</p>
                    <p className="text-xs text-gray-400">pipeline value</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                  {pipelineStages.map((s) => {
                    const count = pipeline[s.key as keyof PipelineSummary] as number;
                    const pct = totalPipelineLeads > 0 ? Math.round((count / totalPipelineLeads) * 100) : 0;
                    return (
                      <div key={s.key} className="text-center">
                        <div className="h-1.5 rounded-full bg-gray-100 mb-2 overflow-hidden">
                          <div
                            className={`h-full ${s.color} rounded-full transition-all duration-700`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <p className={`text-xl font-bold ${s.text}`}>{count}</p>
                        <p className="text-xs text-gray-500">{s.label}</p>
                        <p className="text-[10px] text-gray-400">{pct}%</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Daily breakdown table */}
            <div className="card">
              <h3 className="font-semibold text-gray-900 mb-4">Daily Breakdown</h3>
              {filtered.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  No activity yet. <a href="/scan" className="text-blue-600 hover:underline">Run your first scan →</a>
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100">
                        {["Date", "Calls", "Closed", "Revenue", "Leads Added", "Scans"].map((h) => (
                          <th key={h} className="text-left text-xs text-gray-400 font-medium pb-2 pr-4">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...filtered].reverse().map((s, i) => (
                        <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                          <td className="py-2 pr-4 text-gray-600">
                            {new Date(s.date).toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric" })}
                          </td>
                          <td className="py-2 pr-4 font-medium text-blue-600">{s.callsMade}</td>
                          <td className="py-2 pr-4 font-medium text-green-600">{s.closedCount}</td>
                          <td className="py-2 pr-4 font-medium text-emerald-600">
                            {s.closedValueUsd > 0 ? `$${s.closedValueUsd.toLocaleString()}` : "—"}
                          </td>
                          <td className="py-2 pr-4 text-gray-600">{s.leadsAdded}</td>
                          <td className="py-2 pr-4 text-gray-600">{s.scansUsed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
