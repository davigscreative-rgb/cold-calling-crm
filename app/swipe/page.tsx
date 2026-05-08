"use client";

import { useState, useEffect, useRef } from "react";
import { Phone, Globe, Star, X, Check, MapPin, Zap } from "lucide-react";
import { getPriorityTag, getScoreColor } from "@/lib/scorer";

interface Lead {
  id: string; businessName: string; phone: string | null; address: string | null;
  rating: number | null; reviewCount: number | null; hasWebsite: boolean;
  websiteDead: boolean; websiteUrl: string | null; websiteQuality: string | null;
  websiteQualityLabel: string | null; score: number; scoreLabel: string;
  salesAngle: string | null; industry: string; city: string; state: string; country: string;
}

export default function SwipePage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [idx, setIdx] = useState(0);
  const [loading, setLoading] = useState(true);
  const [drag, setDrag] = useState(0);
  const [swiped, setSwiped] = useState<"left" | "right" | null>(null);
  const [added, setAdded] = useState(0);
  const [skipped, setSkipped] = useState(0);
  const startX = useRef(0);
  const dragging = useRef(false);

  useEffect(() => {
    fetch("/api/call-queue?limit=50&minScore=0")
      .then((r) => r.json())
      .then((d) => { setLeads(d.leads ?? []); setLoading(false); });
  }, []);

  const lead = leads[idx] ?? null;

  async function swipeRight() {
    if (!lead) return;
    setSwiped("right");
    await fetch("/api/pipeline", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ leadCacheId: lead.id }) });
    setAdded((a) => a + 1);
    setTimeout(() => { setSwiped(null); setDrag(0); setIdx((i) => i + 1); }, 300);
  }

  function swipeLeft() {
    setSwiped("left");
    setSkipped((s) => s + 1);
    setTimeout(() => { setSwiped(null); setDrag(0); setIdx((i) => i + 1); }, 300);
  }

  // Touch/mouse handlers
  function onStart(clientX: number) { startX.current = clientX; dragging.current = true; }
  function onMove(clientX: number) { if (!dragging.current) return; setDrag(clientX - startX.current); }
  function onEnd() {
    dragging.current = false;
    if (drag > 100) swipeRight();
    else if (drag < -100) swipeLeft();
    else setDrag(0);
  }

  const rotation = drag * 0.08;
  const opacity = Math.max(0, 1 - Math.abs(drag) / 300);

  if (loading) return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center">
      <div className="text-gray-500 animate-pulse">Loading leads...</div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 flex items-center justify-between border-b border-gray-800">
        <div>
          <h1 className="font-black text-lg">Lead Swipe</h1>
          <p className="text-xs text-gray-500">← skip · → add to pipeline</p>
        </div>
        <div className="flex gap-4 text-sm">
          <span className="text-red-400 font-bold">✕ {skipped}</span>
          <span className="text-green-400 font-bold">✓ {added}</span>
        </div>
      </div>

      {/* Card area */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-6 select-none">
        {!lead || idx >= leads.length ? (
          <div className="text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h2 className="text-2xl font-black mb-2">All done!</h2>
            <p className="text-gray-400 mb-4">Added {added} leads to pipeline</p>
            <div className="flex gap-3 justify-center">
              <a href="/pipeline" className="bg-green-600 hover:bg-green-500 text-white px-6 py-3 rounded-xl font-bold transition-colors">View Pipeline</a>
              <a href="/scan" className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-bold transition-colors">Scan More</a>
            </div>
          </div>
        ) : (
          <>
            {/* SKIP / ADD indicator overlays */}
            <div className="relative w-full max-w-sm">
              {drag < -30 && (
                <div className="absolute top-4 left-4 z-10 bg-red-500 text-white font-black text-2xl px-4 py-2 rounded-xl rotate-[-12deg] border-4 border-red-300" style={{ opacity: Math.min(1, (-drag - 30) / 70) }}>
                  SKIP
                </div>
              )}
              {drag > 30 && (
                <div className="absolute top-4 right-4 z-10 bg-green-500 text-white font-black text-2xl px-4 py-2 rounded-xl rotate-[12deg] border-4 border-green-300" style={{ opacity: Math.min(1, (drag - 30) / 70) }}>
                  ADD
                </div>
              )}

              {/* Card */}
              <div
                className="bg-gray-900 border border-gray-700 rounded-3xl p-6 shadow-2xl cursor-grab active:cursor-grabbing transition-shadow"
                style={{
                  transform: `translateX(${drag}px) rotate(${rotation}deg)`,
                  transition: dragging.current ? "none" : "transform 0.3s ease",
                  opacity: swiped ? (swiped === "right" ? 0 : 0) : 1,
                  boxShadow: drag > 0 ? "0 0 40px rgba(34,197,94,0.3)" : drag < 0 ? "0 0 40px rgba(239,68,68,0.3)" : undefined,
                }}
                onMouseDown={(e) => onStart(e.clientX)}
                onMouseMove={(e) => onMove(e.clientX)}
                onMouseUp={onEnd}
                onMouseLeave={onEnd}
                onTouchStart={(e) => onStart(e.touches[0].clientX)}
                onTouchMove={(e) => onMove(e.touches[0].clientX)}
                onTouchEnd={onEnd}
              >
                {/* Score ring */}
                <div className="flex items-center justify-between mb-4">
                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-black ${getScoreColor(lead.scoreLabel)}`}>
                    {lead.scoreLabel}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getPriorityTag(lead.score).classes}`}>
                    {getPriorityTag(lead.score).label}
                  </span>
                </div>

                <h2 className="text-2xl font-black mb-1">{lead.businessName}</h2>
                <p className="text-gray-400 text-sm mb-3 capitalize">{lead.industry.replace(/_/g, " ")} · {lead.city}, {lead.state}</p>

                {/* Website status */}
                <div className={`rounded-xl px-3 py-2 mb-4 text-sm font-bold ${
                  !lead.hasWebsite || lead.websiteDead
                    ? "bg-red-900/40 text-red-400 border border-red-800"
                    : lead.websiteQuality === "poor"
                    ? "bg-amber-900/40 text-amber-400 border border-amber-800"
                    : "bg-green-900/40 text-green-400 border border-green-800"
                }`}>
                  {!lead.hasWebsite || lead.websiteDead ? "🚫 No website — HIGH VALUE" : lead.websiteQuality === "poor" ? "⚠️ Poor website" : "✅ Has website"}
                </div>

                {lead.rating && (
                  <div className="flex items-center gap-1.5 mb-3 text-sm text-gray-400">
                    <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
                    {lead.rating} ({lead.reviewCount?.toLocaleString()} reviews)
                  </div>
                )}

                {lead.phone && (
                  <div className="flex items-center gap-2 mb-3">
                    <Phone className="w-4 h-4 text-blue-400" />
                    <span className="font-mono text-blue-300 font-bold">{lead.phone}</span>
                  </div>
                )}

                {lead.salesAngle && (
                  <p className="text-xs text-indigo-400 italic">{lead.salesAngle}</p>
                )}

                <div className="text-center mt-4 text-xs text-gray-700">Score: {lead.score}/100</div>
              </div>
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-8 mt-6">
              <button onClick={swipeLeft}
                className="w-14 h-14 bg-gray-800 hover:bg-red-900/40 border border-gray-700 hover:border-red-600 rounded-full flex items-center justify-center transition-all hover:scale-110">
                <X className="w-6 h-6 text-red-400" />
              </button>
              <a href={`tel:${lead.phone}`}
                className="w-10 h-10 bg-gray-800 hover:bg-blue-900/40 border border-gray-700 hover:border-blue-600 rounded-full flex items-center justify-center transition-all">
                <Phone className="w-4 h-4 text-blue-400" />
              </a>
              <button onClick={swipeRight}
                className="w-14 h-14 bg-gray-800 hover:bg-green-900/40 border border-gray-700 hover:border-green-600 rounded-full flex items-center justify-center transition-all hover:scale-110">
                <Check className="w-6 h-6 text-green-400" />
              </button>
            </div>
            <p className="text-gray-700 text-xs mt-3">{leads.length - idx - 1} leads remaining</p>
          </>
        )}
      </div>
    </div>
  );
}
