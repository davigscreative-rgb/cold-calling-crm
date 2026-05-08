"use client";

import { useState, useEffect, useCallback } from "react";
import { getScoreColor, getPriorityTag } from "@/lib/scorer";
import { INDUSTRY_GROUPS, COUNTRIES, type Country } from "@/data/industries";
import {
  Phone, Globe, Star, MapPin, ChevronRight, SkipForward,
  ExternalLink, TrendingUp, AlertCircle, Check, X, Zap,
  BarChart3, ArrowLeft, PhoneCall, PhoneOff,
} from "lucide-react";

interface Lead {
  id: string;
  businessName: string;
  phone: string | null;
  address: string | null;
  rating: number | null;
  reviewCount: number | null;
  hasWebsite: boolean;
  websiteDead: boolean;
  websiteUrl: string | null;
  websiteQuality: string | null;
  websiteQualityLabel: string | null;
  websiteQualityDetails: string[] | null;
  hasGoogleAds: boolean;
  email: string | null;
  score: number;
  scoreLabel: string;
  salesAngle: string | null;
  googleMapsUrl: string | null;
  industry: string;
  city: string;
  state: string;
  country: string;
}

type CallOutcome = "answered" | "voicemail" | "no_answer" | "not_interested" | "callback" | "closed";

const OUTCOMES: { value: CallOutcome; label: string; emoji: string; color: string }[] = [
  { value: "answered", label: "Answered", emoji: "✅", color: "bg-green-100 text-green-700 border-green-200 hover:bg-green-200" },
  { value: "voicemail", label: "Voicemail", emoji: "📩", color: "bg-blue-100 text-blue-700 border-blue-200 hover:bg-blue-200" },
  { value: "no_answer", label: "No Answer", emoji: "📵", color: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-200" },
  { value: "not_interested", label: "Not Interested", emoji: "❌", color: "bg-red-100 text-red-700 border-red-200 hover:bg-red-200" },
  { value: "callback", label: "Callback Later", emoji: "🔁", color: "bg-amber-100 text-amber-700 border-amber-200 hover:bg-amber-200" },
  { value: "closed", label: "CLOSED! 🎉", emoji: "💰", color: "bg-emerald-100 text-emerald-700 border-emerald-200 hover:bg-emerald-200" },
];

export default function CallModePage() {
  const [mode, setMode] = useState<"setup" | "active" | "done">("setup");
  const [leads, setLeads] = useState<Lead[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [loading, setLoading] = useState(false);
  const [calling, setCalling] = useState(false);
  const [callStartTime, setCallStartTime] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [outcomes, setOutcomes] = useState<Record<string, CallOutcome>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [noteText, setNoteText] = useState("");

  // Filters
  const [filterCountry, setFilterCountry] = useState<Country>("US");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterMinScore, setFilterMinScore] = useState(35);

  // Session stats
  const [sessionStats, setSessionStats] = useState({
    called: 0,
    answered: 0,
    voicemails: 0,
    callbacks: 0,
    closed: 0,
  });

  // Call timer
  useEffect(() => {
    if (!calling || !callStartTime) { setCallDuration(0); return; }
    const interval = setInterval(() => {
      setCallDuration(Math.floor((Date.now() - callStartTime.getTime()) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [calling, callStartTime]);

  const currentLead = leads[currentIdx] ?? null;
  const remaining = leads.length - currentIdx;

  async function loadQueue() {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        minScore: String(filterMinScore),
        limit: "100",
        ...(filterCountry ? { country: filterCountry } : {}),
        ...(filterIndustry ? { industry: filterIndustry } : {}),
      });
      const res = await fetch(`/api/call-queue?${params}`);
      const data = await res.json();
      if (data.leads?.length > 0) {
        setLeads(data.leads);
        setCurrentIdx(0);
        setMode("active");
      } else {
        alert("No leads found for your filters. Run a scan first!");
      }
    } catch {
      alert("Failed to load lead queue.");
    } finally {
      setLoading(false);
    }
  }

  function startCall() {
    if (!currentLead?.phone) return;
    setCalling(true);
    setCallStartTime(new Date());
    // Open tel: link for click-to-call
    window.open(`tel:${currentLead.phone}`, "_self");
  }

  function endCall() {
    setCalling(false);
    setCallStartTime(null);
    setCallDuration(0);
  }

  function recordOutcome(outcome: CallOutcome) {
    if (!currentLead) return;
    setOutcomes((prev) => ({ ...prev, [currentLead.id]: outcome }));
    if (noteText) {
      setNotes((prev) => ({ ...prev, [currentLead.id]: noteText }));
    }

    // Update session stats
    setSessionStats((prev) => ({
      called: prev.called + 1,
      answered: prev.answered + (["answered", "not_interested", "callback", "closed"].includes(outcome) ? 1 : 0),
      voicemails: prev.voicemails + (outcome === "voicemail" ? 1 : 0),
      callbacks: prev.callbacks + (outcome === "callback" ? 1 : 0),
      closed: prev.closed + (outcome === "closed" ? 1 : 0),
    }));

    // Log to backend (fire and forget)
    fetch("/api/call-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        outcome,
        leadCacheId: currentLead.id,
        notes: noteText || null,
        durationSeconds: callDuration,
      }),
    }).catch(() => {});

    endCall();
    setNoteText("");
    nextLead();
  }

  function nextLead() {
    if (currentIdx + 1 >= leads.length) {
      setMode("done");
    } else {
      setCurrentIdx((i) => i + 1);
    }
  }

  function skipLead() {
    endCall();
    setNoteText("");
    nextLead();
  }

  function formatDuration(s: number) {
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m}:${sec.toString().padStart(2, "0")}`;
  }

  function websiteStatus(lead: Lead) {
    if (!lead.hasWebsite || lead.websiteDead) return { text: "No website", color: "text-red-600", icon: "🚫" };
    if (lead.websiteQuality === "poor") return { text: "Poor website", color: "text-orange-600", icon: "⚠️" };
    if (lead.websiteQuality === "average") return { text: "Average website", color: "text-amber-600", icon: "📊" };
    return { text: "Good website", color: "text-green-600", icon: "✅" };
  }

  // ── SETUP SCREEN ─────────────────────────────────────────────────────────────
  if (mode === "setup") {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col">
        <nav className="border-b border-gray-800 px-6 py-3 flex items-center gap-4">
          <a href="/scan" className="text-gray-400 hover:text-white flex items-center gap-1 text-sm">
            <ArrowLeft className="w-4 h-4" /> Back to Scanner
          </a>
          <span className="font-bold text-blue-400 ml-2">📞 Call Mode</span>
        </nav>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-8">
              <div className="text-6xl mb-4">📞</div>
              <h1 className="text-3xl font-bold mb-2">Call Mode</h1>
              <p className="text-gray-400">Your SDR command center. One lead at a time.</p>
            </div>

            <div className="bg-gray-800 rounded-2xl p-6 space-y-4">
              <div>
                <label className="text-sm text-gray-400 font-medium block mb-1.5">Country</label>
                <select
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={filterCountry}
                  onChange={(e) => setFilterCountry(e.target.value as Country)}
                >
                  {COUNTRIES.map((c) => (
                    <option key={c.value} value={c.value}>{c.flag} {c.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 font-medium block mb-1.5">Industry (optional)</label>
                <select
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  value={filterIndustry}
                  onChange={(e) => setFilterIndustry(e.target.value)}
                >
                  <option value="">All industries</option>
                  {INDUSTRY_GROUPS.map((g) => (
                    <optgroup key={g.group} label={g.group}>
                      {g.industries.map((i) => (
                        <option key={i.value} value={i.value}>{i.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-sm text-gray-400 font-medium block mb-1.5">
                  Min. Lead Score: <span className="text-blue-400 font-bold">{filterMinScore}+</span>
                </label>
                <input
                  type="range"
                  min={0}
                  max={80}
                  step={5}
                  value={filterMinScore}
                  onChange={(e) => setFilterMinScore(Number(e.target.value))}
                  className="w-full accent-blue-500"
                />
                <div className="flex justify-between text-xs text-gray-500 mt-1">
                  <span>All leads</span>
                  <span>High-value only</span>
                </div>
              </div>

              <button
                onClick={loadQueue}
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors text-lg mt-2"
              >
                <Zap className="w-5 h-5" />
                {loading ? "Loading leads..." : "Start Calling"}
              </button>
            </div>

            <p className="text-center text-gray-500 text-sm mt-4">
              Run a scan first to populate your lead queue
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── DONE SCREEN ───────────────────────────────────────────────────────────────
  if (mode === "done") {
    const convRate = sessionStats.called > 0
      ? Math.round((sessionStats.answered / sessionStats.called) * 100)
      : 0;

    return (
      <div className="min-h-screen bg-gray-900 text-white flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">{sessionStats.closed > 0 ? "🏆" : "✅"}</div>
          <h1 className="text-3xl font-bold mb-2">Session Complete!</h1>
          <p className="text-gray-400 mb-8">Great work. Here's your summary:</p>
          <div className="grid grid-cols-2 gap-3 mb-8">
            {[
              { label: "Calls Made", value: sessionStats.called, color: "text-blue-400" },
              { label: "Answered", value: sessionStats.answered, color: "text-green-400" },
              { label: "Voicemails", value: sessionStats.voicemails, color: "text-amber-400" },
              { label: "Callbacks", value: sessionStats.callbacks, color: "text-orange-400" },
              { label: "Closed 💰", value: sessionStats.closed, color: "text-emerald-400" },
              { label: "Connect %", value: `${convRate}%`, color: "text-purple-400" },
            ].map((s) => (
              <div key={s.label} className="bg-gray-800 rounded-xl p-4 text-center">
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => { setMode("setup"); setLeads([]); setCurrentIdx(0); setSessionStats({ called: 0, answered: 0, voicemails: 0, callbacks: 0, closed: 0 }); }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors"
            >
              New Session
            </button>
            <a href="/pipeline" className="bg-gray-700 hover:bg-gray-600 text-white px-6 py-3 rounded-xl font-semibold transition-colors">
              View Pipeline
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ── ACTIVE CALL TERMINAL ──────────────────────────────────────────────────────
  const lead = currentLead!;
  const priority = getPriorityTag(lead.score);
  const ws = websiteStatus(lead);

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      {/* Header bar */}
      <div className="border-b border-gray-800 px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => setMode("setup")} className="text-gray-400 hover:text-white text-sm flex items-center gap-1">
            <ArrowLeft className="w-4 h-4" /> Exit
          </button>
          <span className="text-blue-400 font-bold text-sm">📞 CALL MODE</span>
        </div>
        {/* Session stats bar */}
        <div className="hidden sm:flex items-center gap-4 text-xs text-gray-400">
          <span className="flex items-center gap-1"><BarChart3 className="w-3 h-3" /> {sessionStats.called} called</span>
          <span className="text-green-400">{sessionStats.answered} answered</span>
          <span className="text-emerald-400 font-bold">{sessionStats.closed} closed 💰</span>
          <span className="text-gray-500">{remaining} remaining</span>
        </div>
        {/* Progress */}
        <div className="text-xs text-gray-500">{currentIdx + 1} / {leads.length}</div>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-gray-800">
        <div
          className="h-1 bg-blue-500 transition-all duration-300"
          style={{ width: `${((currentIdx) / leads.length) * 100}%` }}
        />
      </div>

      <div className="flex-1 flex flex-col lg:flex-row gap-0">
        {/* ── MAIN LEAD PANEL ── */}
        <div className="flex-1 flex flex-col items-center justify-center p-6 lg:p-10">
          {/* Score badge */}
          <div className="flex items-center gap-3 mb-6">
            <div className={`w-14 h-14 rounded-full border-2 flex items-center justify-center text-base font-bold ${getScoreColor(lead.scoreLabel)}`}>
              {lead.scoreLabel}
            </div>
            <div>
              <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${priority.classes}`}>
                {priority.label}
              </span>
              <p className="text-xs text-gray-500 mt-0.5">{lead.score}/100 score</p>
            </div>
          </div>

          {/* Business name */}
          <h1 className="text-3xl lg:text-4xl font-bold text-center mb-1">{lead.businessName}</h1>

          {/* Location & industry */}
          <div className="flex items-center gap-3 text-gray-400 text-sm mb-6">
            <span className="flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" />
              {lead.city}, {lead.state}
            </span>
            <span className="text-gray-600">·</span>
            <span className="capitalize">{lead.industry.replace(/_/g, " ")}</span>
            {lead.rating && (
              <>
                <span className="text-gray-600">·</span>
                <span className="flex items-center gap-0.5">
                  <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                  {lead.rating} ({lead.reviewCount?.toLocaleString()})
                </span>
              </>
            )}
          </div>

          {/* BIG PHONE NUMBER */}
          <div className="mb-6 text-center">
            {lead.phone ? (
              <p className="text-4xl lg:text-5xl font-mono font-bold text-white tracking-wider">
                {lead.phone}
              </p>
            ) : (
              <p className="text-xl text-gray-500 italic">No phone number</p>
            )}
            {lead.address && (
              <p className="text-gray-500 text-sm mt-2">{lead.address}</p>
            )}
          </div>

          {/* Website info */}
          <div className="flex items-center gap-3 mb-6 flex-wrap justify-center">
            <span className={`flex items-center gap-1.5 text-sm font-medium ${ws.color}`}>
              {ws.icon} {ws.text}
            </span>
            {lead.hasWebsite && !lead.websiteDead && lead.websiteUrl && (
              <a
                href={lead.websiteUrl.startsWith("http") ? lead.websiteUrl : `https://${lead.websiteUrl}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sm text-blue-400 hover:text-blue-300 hover:underline"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                {lead.websiteUrl.replace(/https?:\/\//, "").replace(/\/$/, "")}
              </a>
            )}
            {lead.googleMapsUrl && (
              <a
                href={lead.googleMapsUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 text-sm text-gray-400 hover:text-gray-300"
              >
                <MapPin className="w-3.5 h-3.5" /> Maps
              </a>
            )}
          </div>

          {/* Sales angle */}
          {lead.salesAngle && (
            <div className="bg-indigo-900/40 border border-indigo-700/40 rounded-xl px-4 py-2.5 mb-6 max-w-md text-center">
              <p className="text-sm text-indigo-300 flex items-center justify-center gap-1.5">
                <TrendingUp className="w-4 h-4 shrink-0" />
                {lead.salesAngle}
              </p>
            </div>
          )}

          {/* CALL BUTTON */}
          {!calling ? (
            <button
              onClick={startCall}
              disabled={!lead.phone}
              className="flex items-center gap-3 bg-green-600 hover:bg-green-500 disabled:bg-gray-700 disabled:cursor-not-allowed text-white font-bold text-xl px-10 py-5 rounded-2xl transition-all shadow-lg shadow-green-900/40 hover:shadow-green-900/60 hover:scale-105 active:scale-100 mb-4"
            >
              <PhoneCall className="w-7 h-7" />
              CALL NOW
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3 mb-4">
              <div className="flex items-center gap-3 bg-green-900/60 border border-green-700 rounded-2xl px-8 py-4">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-300 font-bold text-xl">Calling... {formatDuration(callDuration)}</span>
              </div>
              <button
                onClick={endCall}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-500 text-white px-6 py-2.5 rounded-xl font-semibold transition-colors"
              >
                <PhoneOff className="w-4 h-4" /> End Call
              </button>
            </div>
          )}

          {/* Skip */}
          <button
            onClick={skipLead}
            className="flex items-center gap-1.5 text-gray-500 hover:text-gray-300 text-sm transition-colors"
          >
            <SkipForward className="w-4 h-4" /> Skip lead
          </button>
        </div>

        {/* ── OUTCOME / NOTES SIDEBAR ── */}
        <div className="lg:w-80 border-t lg:border-t-0 lg:border-l border-gray-800 flex flex-col">
          <div className="p-5 flex-1">
            <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-3">Log Outcome</h3>
            <div className="grid grid-cols-2 gap-2 mb-4">
              {OUTCOMES.map((o) => (
                <button
                  key={o.value}
                  onClick={() => recordOutcome(o.value)}
                  className={`border rounded-xl py-2.5 px-2 text-xs font-semibold transition-colors text-center ${o.color}`}
                >
                  {o.emoji} {o.label}
                </button>
              ))}
            </div>

            <div className="mb-4">
              <label className="text-xs text-gray-400 font-medium block mb-1.5">Notes (optional)</label>
              <textarea
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Write a note about this call..."
                rows={3}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-sm text-white placeholder-gray-600 resize-none focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* Queue preview */}
            <div>
              <h3 className="text-xs text-gray-500 uppercase tracking-wide font-semibold mb-2">Up Next</h3>
              <div className="space-y-2">
                {leads.slice(currentIdx + 1, currentIdx + 4).map((l, i) => {
                  const p = getPriorityTag(l.score);
                  return (
                    <div key={l.id} className="flex items-center gap-2 bg-gray-800 rounded-lg p-2">
                      <span className="text-gray-500 text-xs w-4">{i + 2}</span>
                      <div className={`w-6 h-6 rounded-full border flex items-center justify-center text-[10px] font-bold ${getScoreColor(l.scoreLabel)}`}>
                        {l.scoreLabel}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs text-white font-medium truncate">{l.businessName}</p>
                        <p className="text-[10px] text-gray-500 truncate">{l.city} · {l.industry.replace(/_/g, " ")}</p>
                      </div>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${p.classes}`}>{p.label}</span>
                    </div>
                  );
                })}
                {remaining <= 1 && (
                  <p className="text-xs text-gray-600 text-center py-2">Last lead in queue</p>
                )}
              </div>
            </div>
          </div>

          {/* Session mini-stats */}
          <div className="border-t border-gray-800 p-4 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-lg font-bold text-blue-400">{sessionStats.called}</p>
              <p className="text-[10px] text-gray-500">Called</p>
            </div>
            <div>
              <p className="text-lg font-bold text-green-400">{sessionStats.answered}</p>
              <p className="text-[10px] text-gray-500">Answered</p>
            </div>
            <div>
              <p className="text-lg font-bold text-emerald-400">{sessionStats.closed}</p>
              <p className="text-[10px] text-gray-500">Closed 💰</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
