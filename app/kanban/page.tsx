"use client";

import { useState, useEffect, useRef } from "react";
import { Phone, Globe, Star, ExternalLink, Zap, MoreHorizontal } from "lucide-react";
import { getScoreColor, getPriorityTag } from "@/lib/scorer";

interface Lead {
  id: string;
  leadCacheId: string;
  status: string;
  notes: string | null;
  dealValueUsd: number | null;
  leadCache: {
    businessName: string;
    phone: string | null;
    websiteUrl: string | null;
    websiteQuality: string | null;
    hasWebsite: boolean;
    websiteDead: boolean;
    score: number;
    scoreLabel: string;
    industry: string;
    city: string;
    state: string;
    rating: number | null;
    salesAngle: string | null;
  };
}

const COLUMNS = [
  { key: "NEW",    label: "New Leads",   emoji: "🎯", color: "border-gray-600",   bg: "bg-gray-900",       count_color: "bg-gray-700 text-gray-300" },
  { key: "CALLED", label: "Called",      emoji: "📞", color: "border-blue-700",   bg: "bg-blue-950/30",    count_color: "bg-blue-900 text-blue-300" },
  { key: "BOOKED", label: "Meeting Set", emoji: "📅", color: "border-purple-700", bg: "bg-purple-950/30",  count_color: "bg-purple-900 text-purple-300" },
  { key: "SHOWED", label: "Showed Up",   emoji: "🤝", color: "border-amber-700",  bg: "bg-amber-950/30",   count_color: "bg-amber-900 text-amber-300" },
  { key: "CLOSED", label: "Closed 💰",   emoji: "💰", color: "border-green-600",  bg: "bg-green-950/30",   count_color: "bg-green-900 text-green-300" },
  { key: "NOSHOW", label: "No Show",     emoji: "👻", color: "border-red-800",    bg: "bg-red-950/20",     count_color: "bg-red-900 text-red-400" },
];

export default function KanbanPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<Lead | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [roasts, setRoasts] = useState<Record<string, string>>({});
  const [loadingRoast, setLoadingRoast] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/pipeline")
      .then((r) => r.json())
      .then((d) => { setLeads(d.leads ?? []); setLoading(false); });
  }, []);

  async function moveCard(lead: Lead, newStatus: string) {
    setLeads((prev) => prev.map((l) => l.id === lead.id ? { ...l, status: newStatus } : l));
    await fetch(`/api/pipeline/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: newStatus }),
    });
  }

  function onDragStart(lead: Lead) { setDragging(lead); }
  function onDragOver(e: React.DragEvent, col: string) { e.preventDefault(); setDragOver(col); }
  function onDrop(col: string) {
    if (dragging && dragging.status !== col) moveCard(dragging, col);
    setDragging(null); setDragOver(null);
  }

  async function getRoast(lead: Lead) {
    if (roasts[lead.id]) return;
    setLoadingRoast(lead.id);
    try {
      const res = await fetch("/api/roast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: lead.leadCache.businessName,
          industry: lead.leadCache.industry,
          city: lead.leadCache.city,
          hasWebsite: lead.leadCache.hasWebsite,
          websiteQuality: lead.leadCache.websiteQuality,
          websiteUrl: lead.leadCache.websiteUrl,
          rating: lead.leadCache.rating,
        }),
      });
      const d = await res.json();
      setRoasts((prev) => ({ ...prev, [lead.id]: d.roast ?? "" }));
    } catch {}
    setLoadingRoast(null);
  }

  const totalValue = leads.filter((l) => l.status === "CLOSED").reduce((a, l) => a + (l.dealValueUsd ?? 0), 0);
  const closeRate = leads.length > 0 ? Math.round((leads.filter((l) => l.status === "CLOSED").length / leads.length) * 100) : 0;

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="font-black text-lg">⚡ Kanban Board</h1>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">{leads.length} total</span>
            <span className="text-green-400 font-bold">${totalValue.toLocaleString()} closed</span>
            <span className="text-blue-400">{closeRate}% close rate</span>
          </div>
        </div>
        <div className="flex gap-2">
          <a href="/swipe" className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 px-3 py-1.5 rounded-lg font-medium transition-colors">
            ← Swipe Mode
          </a>
          <a href="/war-room" className="flex items-center gap-1.5 text-xs bg-red-900/60 hover:bg-red-800/60 border border-red-800 text-red-300 px-3 py-1.5 rounded-lg font-medium transition-colors">
            🎯 War Room
          </a>
        </div>
      </div>

      {/* Kanban columns */}
      <div className="flex-1 overflow-x-auto p-4">
        <div className="flex gap-3 h-full min-w-max">
          {COLUMNS.map((col) => {
            const colLeads = leads.filter((l) => l.status === col.key);
            const isOver = dragOver === col.key;
            return (
              <div
                key={col.key}
                className={`w-72 flex flex-col rounded-2xl border ${col.color} ${col.bg} transition-all ${isOver ? "ring-2 ring-blue-500 scale-[1.01]" : ""}`}
                onDragOver={(e) => onDragOver(e, col.key)}
                onDrop={() => onDrop(col.key)}
                onDragLeave={() => setDragOver(null)}
              >
                {/* Column header */}
                <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-2">
                    <span>{col.emoji}</span>
                    <span className="font-bold text-sm text-white">{col.label}</span>
                  </div>
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${col.count_color}`}>{colLeads.length}</span>
                </div>

                {/* Cards */}
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {loading ? (
                    Array.from({ length: 2 }).map((_, i) => (
                      <div key={i} className="h-28 bg-gray-800 rounded-xl animate-pulse" />
                    ))
                  ) : colLeads.length === 0 ? (
                    <div className={`border-2 border-dashed ${col.color} rounded-xl h-20 flex items-center justify-center text-gray-700 text-xs transition-colors ${isOver ? "border-blue-500 bg-blue-900/10" : ""}`}>
                      {isOver ? "Drop here" : "Empty"}
                    </div>
                  ) : (
                    colLeads.map((lead) => {
                      const p = getPriorityTag(lead.leadCache.score);
                      return (
                        <div
                          key={lead.id}
                          draggable
                          onDragStart={() => onDragStart(lead)}
                          className="bg-gray-900 border border-gray-700 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-gray-500 transition-all hover:shadow-lg group"
                        >
                          {/* Score + priority */}
                          <div className="flex items-center justify-between mb-2">
                            <div className={`w-7 h-7 rounded-full border flex items-center justify-center text-[10px] font-black ${getScoreColor(lead.leadCache.scoreLabel)}`}>
                              {lead.leadCache.scoreLabel}
                            </div>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold border ${p.classes}`}>{p.label}</span>
                          </div>

                          {/* Business name */}
                          <p className="font-bold text-sm text-white leading-tight mb-1">{lead.leadCache.businessName}</p>
                          <p className="text-xs text-gray-500 capitalize mb-2">{lead.leadCache.industry.replace(/_/g, " ")} · {lead.leadCache.city}</p>

                          {/* Website badge */}
                          <div className={`text-[10px] font-bold rounded px-1.5 py-0.5 inline-block mb-2 ${
                            !lead.leadCache.hasWebsite || lead.leadCache.websiteDead
                              ? "bg-red-900/50 text-red-400"
                              : lead.leadCache.websiteQuality === "poor"
                              ? "bg-amber-900/50 text-amber-400"
                              : "bg-green-900/50 text-green-400"
                          }`}>
                            {!lead.leadCache.hasWebsite || lead.leadCache.websiteDead ? "🚫 No website" : lead.leadCache.websiteQuality === "poor" ? "⚠️ Poor site" : "✅ Has site"}
                          </div>

                          {/* Actions row */}
                          <div className="flex items-center gap-2 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            {lead.leadCache.phone && (
                              <a href={`tel:${lead.leadCache.phone}`}
                                className="flex items-center gap-1 text-[10px] bg-blue-900/50 hover:bg-blue-800/50 text-blue-300 px-2 py-1 rounded-lg transition-colors">
                                <Phone className="w-2.5 h-2.5" /> Call
                              </a>
                            )}
                            {lead.leadCache.websiteUrl && (
                              <a href={lead.leadCache.websiteUrl.startsWith("http") ? lead.leadCache.websiteUrl : `https://${lead.leadCache.websiteUrl}`}
                                target="_blank" rel="noreferrer"
                                className="flex items-center gap-1 text-[10px] bg-gray-800 hover:bg-gray-700 text-gray-300 px-2 py-1 rounded-lg transition-colors">
                                <ExternalLink className="w-2.5 h-2.5" /> Site
                              </a>
                            )}
                            <button onClick={() => getRoast(lead)}
                              className="flex items-center gap-1 text-[10px] bg-purple-900/50 hover:bg-purple-800/50 text-purple-300 px-2 py-1 rounded-lg transition-colors">
                              🔥 Roast
                            </button>
                          </div>

                          {/* Roast output */}
                          {loadingRoast === lead.id && (
                            <p className="text-[10px] text-purple-400 mt-2 animate-pulse">Roasting...</p>
                          )}
                          {roasts[lead.id] && (
                            <p className="text-[10px] text-purple-300 mt-2 italic border-t border-gray-800 pt-2">{roasts[lead.id]}</p>
                          )}

                          {/* Move buttons */}
                          <div className="flex gap-1 mt-2 flex-wrap">
                            {COLUMNS.filter((c) => c.key !== col.key).map((c) => (
                              <button key={c.key} onClick={() => moveCard(lead, c.key)}
                                className="text-[9px] text-gray-600 hover:text-gray-300 hover:bg-gray-800 px-1.5 py-0.5 rounded transition-colors">
                                → {c.label.split(" ")[0]}
                              </button>
                            ))}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
