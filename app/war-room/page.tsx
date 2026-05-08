"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { getPriorityTag, getScoreColor } from "@/lib/scorer";
import { ExternalLink, MapPin, Star, SkipForward, Mic, MicOff, Zap, Trophy, Target, Clock } from "lucide-react";

interface Lead {
  id: string; businessName: string; phone: string | null; address: string | null;
  rating: number | null; reviewCount: number | null; hasWebsite: boolean;
  websiteDead: boolean; websiteUrl: string | null; websiteQuality: string | null;
  websiteQualityLabel: string | null; hasGoogleAds: boolean; email: string | null;
  score: number; scoreLabel: string; salesAngle: string | null;
  googleMapsUrl: string | null; industry: string; city: string; state: string; country: string;
}

type CallOutcome = "answered" | "voicemail" | "no_answer" | "not_interested" | "callback" | "closed";
type Mode = "normal" | "speed";

const OUTCOMES: { value: CallOutcome; label: string; emoji: string; key: string }[] = [
  { value: "answered", label: "Answered", emoji: "✅", key: "1" },
  { value: "voicemail", label: "Voicemail", emoji: "📩", key: "2" },
  { value: "no_answer", label: "No Answer", emoji: "📵", key: "3" },
  { value: "not_interested", label: "Not Interested", emoji: "❌", key: "4" },
  { value: "callback", label: "Callback", emoji: "🔁", key: "5" },
  { value: "closed", label: "CLOSED! 💰", emoji: "💰", key: "6" },
];

const OBJECTIONS: Record<string, string[]> = {
  "Too expensive": [
    "Most clients say that before they see ROI. What's one new client worth to you?",
    "We have flexible plans — what budget were you thinking?",
    "Compared to losing customers to competitors with websites, what's that costing you?",
  ],
  "Not interested": [
    "Fair enough — out of curiosity, how are you currently getting new customers?",
    "No problem. Can I ask one quick question before I go?",
    "I completely understand. Most owners say that until they see a competitor outrank them.",
  ],
  "We have someone": [
    "Great! Are they getting you results you're happy with?",
    "Smart move. Are they focused on your local area specifically?",
    "Perfect — I'm not here to replace them, just to show you what you might be missing.",
  ],
  "Call me back": [
    "Absolutely! When's the best time — morning or afternoon?",
    "Sure — I'll send a quick text first so you have my number. Sound good?",
    "Of course. Tuesday 10am work?",
  ],
  "Send me info": [
    "Happy to! What's the best email? I'll send a 1-page overview.",
    "Will do — and if you like what you see, 15 mins on Thursday?",
    "Perfect. I'll send it over. Most people respond within 24 hours.",
  ],
};

// Confetti particle
function Confetti({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 80 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 1.5 + Math.random() * 1.5,
    color: ["#f59e0b", "#22c55e", "#3b82f6", "#ec4899", "#8b5cf6", "#ef4444"][Math.floor(Math.random() * 6)],
    size: 6 + Math.random() * 8,
  }));
  return (
    <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
      {particles.map((p) => (
        <div key={p.id} className="absolute animate-bounce"
          style={{
            left: `${p.x}%`, top: "-20px", width: p.size, height: p.size,
            backgroundColor: p.color, borderRadius: Math.random() > 0.5 ? "50%" : "2px",
            animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }} />
      ))}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center animate-pulse">
          <div className="text-8xl mb-4">💰</div>
          <div className="text-4xl font-black text-white drop-shadow-lg">DEAL CLOSED!</div>
          <div className="text-xl text-yellow-300 mt-2">MONEY IN THE BANK 🏆</div>
        </div>
      </div>
    </div>
  );
}

// Pre-call brief (3-second card)
const INDUSTRY_BRIEFS: Record<string, { pain: string; opener: string; objectionKiller: string }> = {
  roofing: { pain: "Storm damage, aging roofs, leak anxiety", opener: "We help roofing companies in your area get found online before the call is even made.", objectionKiller: "Every rainstorm is a missed lead if you're not showing up on Google." },
  dental: { pain: "No online booking, losing patients to bigger clinics", opener: "We build dental sites that book appointments while you sleep.", objectionKiller: "Your competitor 2 blocks away just got 40 new patients from Google last month." },
  hvac: { pain: "Seasonal demand spikes, no 24/7 lead capture", opener: "When AC breaks at midnight, customers Google — are you showing up?", objectionKiller: "One missed summer call can cost $3-5k. Your site pays for itself in days." },
  law: { pain: "Referrals drying up, competing with big firms online", opener: "We help law firms rank locally so clients find you before your competitors.", objectionKiller: "People hire the lawyer they find first. Is that you right now?" },
  default: { pain: "No digital presence, relying on word of mouth only", opener: "We help local businesses like yours get found online and turn searchers into customers.", objectionKiller: "Your competitors with websites are getting calls you never even hear about." },
};

export default function WarRoomPage() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [idx, setIdx] = useState(0);
  const [mode, setMode] = useState<"setup" | "brief" | "active" | "done">("setup");
  const [callMode, setCallMode] = useState<Mode>("normal");
  const [calling, setCalling] = useState(false);
  const [callStart, setCallStart] = useState<Date | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [streak, setStreak] = useState(0);
  const [bestStreak, setBestStreak] = useState(0);
  const [confetti, setConfetti] = useState(false);
  const [speedTimer, setSpeedTimer] = useState(60);
  const [speedActive, setSpeedActive] = useState(false);
  const [showObjections, setShowObjections] = useState(false);
  const [activeObjection, setActiveObjection] = useState<string | null>(null);
  const [briefCountdown, setBriefCountdown] = useState(3);
  const [opener, setOpener] = useState("");
  const [loadingOpener, setLoadingOpener] = useState(false);
  const [notes, setNotes] = useState("");
  const [recording, setRecording] = useState(false);
  const [stats, setStats] = useState({ called: 0, closed: 0, voicemails: 0, callbacks: 0 });
  const mediaRef = useRef<MediaRecorder | null>(null);

  const lead = leads[idx] ?? null;
  const brief = INDUSTRY_BRIEFS[lead?.industry ?? "default"] ?? INDUSTRY_BRIEFS.default;

  // Call timer
  useEffect(() => {
    if (!calling || !callStart) { setCallDuration(0); return; }
    const t = setInterval(() => setCallDuration(Math.floor((Date.now() - callStart.getTime()) / 1000)), 1000);
    return () => clearInterval(t);
  }, [calling, callStart]);

  // Speed timer
  useEffect(() => {
    if (!speedActive || !calling) return;
    if (speedTimer <= 0) { skipLead(); return; }
    const t = setInterval(() => setSpeedTimer((s) => s - 1), 1000);
    return () => clearInterval(t);
  }, [speedActive, speedTimer, calling]);

  // Pre-call brief countdown
  useEffect(() => {
    if (mode !== "brief") return;
    setBriefCountdown(3);
    const t = setInterval(() => {
      setBriefCountdown((c) => {
        if (c <= 1) { clearInterval(t); setMode("active"); return 0; }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [mode, idx]);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (mode !== "active") return;
      const num = parseInt(e.key);
      if (num >= 1 && num <= 6) recordOutcome(OUTCOMES[num - 1].value);
      if (e.key === "Enter" && !calling) startCall();
      if (e.key === "Escape") endCall();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [mode, calling]);

  async function loadQueue() {
    const res = await fetch("/api/call-queue?limit=100");
    const data = await res.json();
    if (data.leads?.length > 0) { setLeads(data.leads); setIdx(0); setMode("brief"); }
    else alert("No leads found. Run a scan first!");
  }

  async function generateOpener() {
    if (!lead) return;
    setLoadingOpener(true);
    try {
      const res = await fetch("/api/ai-opener", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id, businessName: lead.businessName, industry: lead.industry, city: lead.city, hasWebsite: lead.hasWebsite, websiteQuality: lead.websiteQuality }),
      });
      const data = await res.json();
      setOpener(data.opener ?? "");
    } catch {}
    setLoadingOpener(false);
  }

  function startCall() {
    if (!lead?.phone) return;
    setCalling(true);
    setCallStart(new Date());
    if (callMode === "speed") { setSpeedTimer(60); setSpeedActive(true); }
    window.open(`tel:${lead.phone}`, "_self");
  }

  function endCall() {
    setCalling(false); setCallStart(null); setCallDuration(0);
    setSpeedActive(false); setSpeedTimer(60);
  }

  function recordOutcome(outcome: CallOutcome) {
    if (!lead) return;
    const isClosed = outcome === "closed";
    const isGood = ["answered", "callback", "closed"].includes(outcome);

    setStats((s) => ({
      called: s.called + 1,
      closed: s.closed + (isClosed ? 1 : 0),
      voicemails: s.voicemails + (outcome === "voicemail" ? 1 : 0),
      callbacks: s.callbacks + (outcome === "callback" ? 1 : 0),
    }));

    if (isGood) {
      const newStreak = streak + 1;
      setStreak(newStreak);
      if (newStreak > bestStreak) setBestStreak(newStreak);
    } else {
      setStreak(0);
    }

    if (isClosed) {
      setConfetti(true);
      setTimeout(() => setConfetti(false), 4000);
    }

    fetch("/api/call-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ outcome, leadCacheId: lead.id, notes, durationSeconds: callDuration }),
    }).catch(() => {});

    endCall();
    setNotes(""); setOpener(""); setShowObjections(false); setActiveObjection(null);
    if (idx + 1 >= leads.length) setMode("done");
    else { setIdx((i) => i + 1); setMode("brief"); }
  }

  function skipLead() {
    setStreak(0); endCall(); setNotes(""); setOpener("");
    if (idx + 1 >= leads.length) setMode("done");
    else { setIdx((i) => i + 1); setMode("brief"); }
  }

  async function toggleRecording() {
    if (recording) { mediaRef.current?.stop(); setRecording(false); return; }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      mediaRef.current = mr;
      mr.start(); setRecording(true);
      mr.onstop = () => stream.getTracks().forEach((t) => t.stop());
    } catch { alert("Microphone access denied"); }
  }

  function fmt(s: number) { return `${Math.floor(s / 60)}:${(s % 60).toString().padStart(2, "0")}`; }

  // ── SETUP ─────────────────────────────────────────────────────────────────
  if (mode === "setup") return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-7xl mb-4 animate-pulse">🎯</div>
        <h1 className="text-4xl font-black mb-2 bg-gradient-to-r from-red-400 to-orange-400 bg-clip-text text-transparent">WAR ROOM</h1>
        <p className="text-gray-400 mb-8">Maximum focus. Maximum results. No distractions.</p>
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 mb-6 text-left space-y-3">
          <p className="text-sm font-semibold text-gray-300 mb-3">⚙️ Mode</p>
          <button onClick={() => setCallMode("normal")} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${callMode === "normal" ? "border-blue-500 bg-blue-900/30 text-blue-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
            <Target className="w-4 h-4" />
            <div className="text-left">
              <p className="font-semibold text-sm">Normal Mode</p>
              <p className="text-xs text-gray-500">Take your time, use objection coach, full notes</p>
            </div>
          </button>
          <button onClick={() => setCallMode("speed")} className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors ${callMode === "speed" ? "border-red-500 bg-red-900/30 text-red-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
            <Clock className="w-4 h-4" />
            <div className="text-left">
              <p className="font-semibold text-sm">⚡ Speed Round</p>
              <p className="text-xs text-gray-500">60 seconds per lead. Auto-skip. Pure momentum.</p>
            </div>
          </button>
        </div>
        <button onClick={loadQueue} className="w-full bg-red-600 hover:bg-red-500 text-white font-black text-xl py-4 rounded-2xl transition-all hover:scale-105 shadow-lg shadow-red-900/50">
          ENTER WAR ROOM →
        </button>
      </div>
    </div>
  );

  // ── PRE-CALL BRIEF ─────────────────────────────────────────────────────────
  if (mode === "brief" && lead) return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="max-w-lg w-full text-center">
        <div className="text-5xl font-black text-blue-400 mb-4 tabular-nums">{briefCountdown}</div>
        <h2 className="text-2xl font-bold mb-6">📋 Pre-Call Brief</h2>
        <div className="bg-gray-900 border border-gray-700 rounded-2xl p-6 text-left space-y-4">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">🎯 Business</p>
            <p className="font-bold text-xl text-white">{lead.businessName}</p>
            <p className="text-gray-400 text-sm">{lead.industry} · {lead.city}, {lead.state}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">😤 Their Pain</p>
            <p className="text-amber-300 text-sm">{brief.pain}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">💬 First 5 Seconds</p>
            <p className="text-green-300 text-sm italic">"{brief.opener}"</p>
          </div>
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">🛡️ Objection Killer</p>
            <p className="text-blue-300 text-sm">{brief.objectionKiller}</p>
          </div>
        </div>
        <p className="text-gray-500 text-sm mt-4 animate-pulse">Auto-starting in {briefCountdown}s...</p>
        <button onClick={() => setMode("active")} className="mt-3 text-blue-400 hover:text-blue-300 text-sm underline">Skip brief →</button>
      </div>
    </div>
  );

  // ── DONE ───────────────────────────────────────────────────────────────────
  if (mode === "done") return (
    <div className="min-h-screen bg-gray-950 text-white flex items-center justify-center p-6">
      <div className="text-center max-w-sm">
        <div className="text-6xl mb-4">🏆</div>
        <h1 className="text-3xl font-black mb-6">Session Complete!</h1>
        <div className="grid grid-cols-2 gap-3 mb-8">
          {[["Calls", stats.called, "text-blue-400"], ["Closed 💰", stats.closed, "text-green-400"],
            ["Voicemails", stats.voicemails, "text-amber-400"], ["Best Streak", bestStreak, "text-orange-400"]].map(([l, v, c]) => (
            <div key={String(l)} className="bg-gray-800 rounded-xl p-4 text-center">
              <p className={`text-3xl font-black ${c}`}>{v}</p>
              <p className="text-xs text-gray-400 mt-1">{l}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-3">
          <button onClick={() => { setMode("setup"); setLeads([]); setIdx(0); setStats({ called: 0, closed: 0, voicemails: 0, callbacks: 0 }); setStreak(0); }}
            className="flex-1 bg-red-600 hover:bg-red-500 text-white py-3 rounded-xl font-bold transition-colors">New Session</button>
          <a href="/pipeline" className="flex-1 bg-gray-700 hover:bg-gray-600 text-white py-3 rounded-xl font-bold transition-colors text-center">Pipeline</a>
        </div>
      </div>
    </div>
  );

  // ── ACTIVE WAR ROOM ────────────────────────────────────────────────────────
  if (!lead) return null;
  const priority = getPriorityTag(lead.score);

  return (
    <div className="min-h-screen bg-gray-950 text-white flex flex-col" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      <Confetti active={confetti} />

      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-950">
        <div className="flex items-center gap-3">
          <span className="text-red-400 font-black text-sm">⚡ WAR ROOM</span>
          {callMode === "speed" && (
            <span className="bg-red-900/50 border border-red-700 text-red-400 text-xs font-bold px-2 py-0.5 rounded">SPEED</span>
          )}
        </div>
        {/* Streak */}
        <div className="flex items-center gap-2">
          {streak >= 3 && <span className="text-2xl animate-bounce">🔥</span>}
          {streak > 0 && (
            <span className={`font-black text-lg ${streak >= 5 ? "text-red-400" : streak >= 3 ? "text-orange-400" : "text-amber-400"}`}>
              {streak} STREAK
            </span>
          )}
        </div>
        {/* Stats */}
        <div className="flex items-center gap-4 text-xs text-gray-400">
          <span className="text-blue-400 font-bold">{stats.called} called</span>
          <span className="text-green-400 font-bold">{stats.closed} closed 💰</span>
          <span className="text-gray-500">{idx + 1}/{leads.length}</span>
        </div>
      </div>

      {/* Speed timer bar */}
      {callMode === "speed" && calling && (
        <div className="h-1.5 bg-gray-800">
          <div className="h-full bg-red-500 transition-all duration-1000"
            style={{ width: `${(speedTimer / 60) * 100}%`, backgroundColor: speedTimer < 15 ? "#ef4444" : speedTimer < 30 ? "#f59e0b" : "#22c55e" }} />
        </div>
      )}

      <div className="flex-1 flex">
        {/* Main panel */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-6">
          {/* Score */}
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-12 h-12 rounded-full border-2 flex items-center justify-center font-black text-sm ${getScoreColor(lead.scoreLabel)}`}>
              {lead.scoreLabel}
            </div>
            <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${priority.classes}`}>{priority.label}</span>
            <span className="text-gray-600 text-sm">{lead.score}/100</span>
          </div>

          {/* Business name */}
          <h1 className="text-4xl lg:text-5xl font-black text-center mb-1 text-white tracking-tight">{lead.businessName}</h1>
          <p className="text-gray-500 text-sm mb-2">{lead.industry.replace(/_/g, " ")} · {lead.city}, {lead.state}</p>

          {/* Website status */}
          {!lead.hasWebsite || lead.websiteDead ? (
            <div className="bg-red-900/30 border border-red-700 rounded-lg px-3 py-1 text-red-400 text-xs font-bold mb-4">
              🚫 NO WEBSITE — HIGH VALUE TARGET
            </div>
          ) : lead.websiteQuality === "poor" ? (
            <div className="bg-amber-900/30 border border-amber-700 rounded-lg px-3 py-1 text-amber-400 text-xs font-bold mb-4">
              ⚠️ POOR WEBSITE — EASY PITCH
            </div>
          ) : (
            <div className="bg-blue-900/30 border border-blue-700 rounded-lg px-3 py-1 text-blue-400 text-xs font-bold mb-4">
              ✅ HAS WEBSITE
            </div>
          )}

          {/* PHONE NUMBER — BIG */}
          <div className="mb-4 text-center">
            {lead.phone ? (
              <p className="text-5xl lg:text-6xl font-black tracking-widest" style={{ color: calling ? "#22c55e" : "white" }}>
                {lead.phone}
              </p>
            ) : (
              <p className="text-2xl text-gray-600 italic">No phone</p>
            )}
          </div>

          {/* Speed timer display */}
          {callMode === "speed" && calling && (
            <div className={`text-3xl font-black mb-4 tabular-nums ${speedTimer < 15 ? "text-red-400 animate-pulse" : "text-gray-400"}`}>
              ⏱ {speedTimer}s
            </div>
          )}

          {/* AI Opener */}
          {opener ? (
            <div className="bg-indigo-900/40 border border-indigo-600 rounded-xl px-4 py-3 mb-4 max-w-lg text-center">
              <p className="text-indigo-300 text-sm italic">"{opener}"</p>
            </div>
          ) : (
            <button onClick={generateOpener} disabled={loadingOpener}
              className="text-indigo-400 hover:text-indigo-300 text-xs underline mb-4 disabled:opacity-50">
              {loadingOpener ? "Generating opener..." : "✨ Generate AI opener"}
            </button>
          )}

          {/* Sales angle */}
          {lead.salesAngle && !opener && (
            <p className="text-gray-500 text-xs mb-4 text-center max-w-sm">{lead.salesAngle}</p>
          )}

          {/* CALL BUTTON */}
          {!calling ? (
            <button onClick={startCall} disabled={!lead.phone}
              className="bg-green-600 hover:bg-green-500 disabled:bg-gray-700 text-white font-black text-2xl px-16 py-5 rounded-2xl transition-all hover:scale-105 shadow-xl shadow-green-900/50 mb-4">
              📞 CALL NOW
            </button>
          ) : (
            <div className="flex flex-col items-center gap-3 mb-4">
              <div className="flex items-center gap-3 bg-green-900/40 border border-green-600 rounded-2xl px-8 py-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-300 font-black text-2xl tabular-nums">📞 {fmt(callDuration)}</span>
              </div>
              <button onClick={endCall} className="bg-red-600 hover:bg-red-500 text-white px-6 py-2 rounded-xl font-bold text-sm transition-colors">
                End Call
              </button>
            </div>
          )}

          {/* OUTCOME BUTTONS */}
          <div className="grid grid-cols-3 gap-2 max-w-sm w-full mb-4">
            {OUTCOMES.map((o) => (
              <button key={o.value} onClick={() => recordOutcome(o.value)}
                className={`border rounded-xl py-2 text-xs font-bold transition-all hover:scale-105 ${
                  o.value === "closed"
                    ? "border-green-500 bg-green-900/40 text-green-300 hover:bg-green-800/60"
                    : "border-gray-700 bg-gray-900 text-gray-300 hover:border-gray-500"
                }`}>
                {o.emoji} {o.label} <span className="text-gray-600 text-[10px]">[{o.key}]</span>
              </button>
            ))}
          </div>

          {/* Voice note + skip */}
          <div className="flex items-center gap-4">
            <button onClick={toggleRecording}
              className={`flex items-center gap-1.5 text-xs transition-colors ${recording ? "text-red-400 animate-pulse" : "text-gray-500 hover:text-gray-300"}`}>
              {recording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              {recording ? "Stop recording" : "Voice note"}
            </button>
            <button onClick={skipLead} className="flex items-center gap-1 text-gray-600 hover:text-gray-400 text-xs transition-colors">
              <SkipForward className="w-4 h-4" /> Skip
            </button>
            {lead.websiteUrl && (
              <a href={lead.websiteUrl.startsWith("http") ? lead.websiteUrl : `https://${lead.websiteUrl}`}
                target="_blank" rel="noreferrer"
                className="flex items-center gap-1 text-gray-600 hover:text-blue-400 text-xs transition-colors">
                <ExternalLink className="w-3.5 h-3.5" /> Site
              </a>
            )}
          </div>

          <p className="text-gray-700 text-[10px] mt-3">Press [1-6] for outcome · [Enter] to call · [Esc] to end</p>
        </div>

        {/* Objection coach sidebar */}
        <div className="w-64 border-l border-gray-800 p-4 flex flex-col">
          <button onClick={() => setShowObjections(!showObjections)}
            className={`text-sm font-bold mb-3 flex items-center gap-2 transition-colors ${showObjections ? "text-amber-400" : "text-gray-500 hover:text-gray-300"}`}>
            🛡️ Objection Coach {showObjections ? "▲" : "▼"}
          </button>
          {showObjections && (
            <div className="space-y-2 mb-4">
              {Object.keys(OBJECTIONS).map((obj) => (
                <button key={obj} onClick={() => setActiveObjection(activeObjection === obj ? null : obj)}
                  className={`w-full text-left text-xs px-2.5 py-2 rounded-lg border transition-colors ${activeObjection === obj ? "border-amber-500 bg-amber-900/30 text-amber-300" : "border-gray-700 text-gray-400 hover:border-gray-500"}`}>
                  "{obj}"
                </button>
              ))}
            </div>
          )}
          {activeObjection && OBJECTIONS[activeObjection] && (
            <div className="space-y-2">
              <p className="text-xs text-amber-400 font-bold uppercase tracking-wide">Responses:</p>
              {OBJECTIONS[activeObjection].map((r, i) => (
                <div key={i} className="bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-gray-300 italic">
                  "{r}"
                </div>
              ))}
            </div>
          )}

          {/* Notes */}
          <div className="mt-auto pt-4">
            <p className="text-xs text-gray-600 mb-1.5 uppercase tracking-wide">Notes</p>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)}
              placeholder="Quick note..."
              className="w-full bg-gray-900 border border-gray-700 rounded-lg p-2 text-xs text-gray-300 resize-none focus:outline-none focus:border-blue-600 h-20" />
          </div>

          {/* Queue preview */}
          <div className="mt-3">
            <p className="text-xs text-gray-600 mb-2 uppercase tracking-wide">Up Next</p>
            {leads.slice(idx + 1, idx + 4).map((l, i) => (
              <div key={l.id} className="flex items-center gap-2 mb-1.5">
                <span className="text-gray-700 text-xs w-3">{i + 2}</span>
                <div className="flex-1 bg-gray-900 rounded px-2 py-1">
                  <p className="text-xs text-gray-300 truncate">{l.businessName}</p>
                  <p className="text-[10px] text-gray-600">{l.score}pts</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
