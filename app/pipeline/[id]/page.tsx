"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Phone, Star, Globe, MapPin, Video, Copy, Check,
  FileText, Code, ChevronLeft, Loader2, ExternalLink
} from "lucide-react";
import { getScoreColor } from "@/lib/scorer";
import { format } from "date-fns";

interface Lead {
  id: string;
  status: string;
  dealValueUsd: number | null;
  notes: string | null;
  meetingAt: string | null;
  zoomJoinUrl: string | null;
  zoomMeetingId: string | null;
  addedAt: string;
  leadCache: {
    id: string;
    businessName: string;
    phone: string | null;
    email: string | null;
    address: string | null;
    website: string | null;
    rating: number | null;
    reviewCount: number | null;
    hasWebsite: boolean;
    websiteDead: boolean;
    hasGoogleAds: boolean;
    scoreLabel: string;
    score: number;
    industry: string;
    city: string;
    state: string;
    hours: string | null;
    googleMapsUrl: string | null;
    lat: number | null;
    lng: number | null;
    callScript: string | null;
    websitePrompt: string | null;
  };
  activityLog: Array<{
    id: string;
    action: string;
    fromStatus: string | null;
    toStatus: string | null;
    createdAt: string;
  }>;
}

const STATUS_LABELS: Record<string, string> = {
  NEW: "New Lead", CALLED: "Called", BOOKED: "Meeting Booked",
  SHOWED: "Showed Up", CLOSED: "Closed", NOSHOW: "No Show",
};

export default function LeadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [lead, setLead] = useState<Lead | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<"overview" | "script" | "website-prompt">("overview");
  const [script, setScript] = useState("");
  const [websitePrompt, setWebsitePrompt] = useState("");
  const [scriptLoading, setScriptLoading] = useState(false);
  const [promptLoading, setPromptLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [dealValue, setDealValue] = useState("");
  const [status, setStatus] = useState("NEW");
  const [bookingDate, setBookingDate] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/pipeline/${id}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.lead) {
          setLead(d.lead);
          setNotes(d.lead.notes ?? "");
          setDealValue(d.lead.dealValueUsd?.toString() ?? "");
          setStatus(d.lead.status);
          if (d.lead.leadCache.callScript) setScript(d.lead.leadCache.callScript);
          if (d.lead.leadCache.websitePrompt) setWebsitePrompt(d.lead.leadCache.websitePrompt);
        }
        setLoading(false);
      });
  }, [id]);

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  async function saveField(field: Record<string, unknown>) {
    setSaving(true);
    await fetch("/api/pipeline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, ...field }),
    });
    setSaving(false);
  }

  async function loadScript() {
    if (script) { setTab("script"); return; }
    setScriptLoading(true);
    const res = await fetch("/api/call-script", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadCacheId: lead?.leadCache.id }),
    });
    const data = await res.json();
    setScript(data.script ?? "");
    setScriptLoading(false);
    setTab("script");
  }

  async function loadWebsitePrompt() {
    if (websitePrompt) { setTab("website-prompt"); return; }
    setPromptLoading(true);
    const res = await fetch("/api/website-prompt", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadCacheId: lead?.leadCache.id }),
    });
    const data = await res.json();
    setWebsitePrompt(data.prompt ?? "");
    setPromptLoading(false);
    setTab("website-prompt");
  }

  async function bookZoom() {
    if (!bookingDate) return;
    setBookingLoading(true);
    const res = await fetch("/api/zoom/book", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pipelineLeadId: id, scheduledAt: new Date(bookingDate).toISOString() }),
    });
    const data = await res.json();
    if (data.joinUrl) {
      setLead((prev) => prev ? { ...prev, zoomJoinUrl: data.joinUrl, status: "BOOKED" } : prev);
      setStatus("BOOKED");
    }
    setBookingLoading(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (!lead) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-500">Lead not found.</p>
      </div>
    );
  }

  const lc = lead.leadCache;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <button onClick={() => router.back()} className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
          <ChevronLeft className="w-4 h-4" /> Back
        </button>
        <span className="text-gray-300">|</span>
        <span className="font-semibold text-gray-900 truncate">{lc.businessName}</span>
        <span className={`ml-auto tag border text-xs ${getScoreColor(lc.scoreLabel)}`}>Score: {lc.scoreLabel}</span>
      </nav>

      <div className="max-w-5xl mx-auto px-4 py-6 grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* LEFT: Business info */}
        <div className="lg:col-span-1 space-y-4">

          {/* Header card */}
          <div className="card">
            <h1 className="text-xl font-semibold text-gray-900 mb-1">{lc.businessName}</h1>
            <p className="text-sm text-gray-500 mb-3">{lc.industry} · {lc.city}, {lc.state}</p>

            <div className="flex flex-wrap gap-1.5 mb-4">
              {(!lc.hasWebsite || lc.websiteDead) && <span className="tag tag-red"><Globe className="w-3 h-3" /> No website</span>}
              {!lc.hasGoogleAds && <span className="tag tag-amber">No Google Ads</span>}
              {lc.rating && lc.rating >= 4.5 && <span className="tag tag-green"><Star className="w-3 h-3 fill-current" /> {lc.rating}</span>}
            </div>

            {/* Score breakdown */}
            <div className="bg-gray-50 rounded-lg p-3 text-xs space-y-1">
              <p className="font-medium text-gray-600 mb-2">Score breakdown ({lc.score} pts)</p>
              {(!lc.hasWebsite || lc.websiteDead) && <div className="flex justify-between"><span className="text-gray-500">No website</span><span className="text-green-600 font-medium">+40</span></div>}
              {!lc.hasGoogleAds && <div className="flex justify-between"><span className="text-gray-500">No Google Ads</span><span className="text-green-600 font-medium">+25</span></div>}
              {lc.rating && lc.rating >= 4.5 && <div className="flex justify-between"><span className="text-gray-500">High rating</span><span className="text-green-600 font-medium">+20</span></div>}
              {lc.reviewCount && lc.reviewCount >= 50 && <div className="flex justify-between"><span className="text-gray-500">50+ reviews</span><span className="text-green-600 font-medium">+10</span></div>}
              {lc.phone && <div className="flex justify-between"><span className="text-gray-500">Has phone</span><span className="text-green-600 font-medium">+10</span></div>}
            </div>
          </div>

          {/* Contact card */}
          <div className="card space-y-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Contact Info</h2>
            {lc.phone && (
              <button onClick={() => copy(lc.phone!, "phone")}
                className="flex items-center justify-between w-full group">
                <span className="flex items-center gap-2 text-sm text-gray-700">
                  <Phone className="w-3.5 h-3.5 text-gray-400" /> {lc.phone}
                </span>
                {copied === "phone" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />}
              </button>
            )}
            {lc.email && (
              <button onClick={() => copy(lc.email!, "email")}
                className="flex items-center justify-between w-full group">
                <span className="text-sm text-blue-600 truncate">{lc.email}</span>
                {copied === "email" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-500" />}
              </button>
            )}
            {lc.rating && (
              <div className="flex items-center gap-2 text-sm text-gray-700">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {lc.rating} stars · {lc.reviewCount?.toLocaleString()} reviews
              </div>
            )}
            {lc.address && (
              <div className="flex items-start gap-2 text-sm text-gray-700">
                <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
                <span>{lc.address}</span>
              </div>
            )}
            {lc.hours && (
              <p className="text-xs text-gray-400">{lc.hours}</p>
            )}
            {lc.googleMapsUrl && (
              <a href={lc.googleMapsUrl} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                <ExternalLink className="w-3 h-3" /> View on Google Maps
              </a>
            )}
            {lc.website && (
              <a href={lc.website} target="_blank" rel="noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-600 hover:underline">
                <Globe className="w-3 h-3" /> {lc.website}
                {lc.websiteDead && <span className="tag tag-red ml-1">Dead</span>}
              </a>
            )}
          </div>

          {/* Map embed */}
          {lc.lat && lc.lng && (
            <div className="card p-0 overflow-hidden">
              <iframe
                src={`https://maps.google.com/maps?q=${lc.lat},${lc.lng}&z=15&output=embed`}
                className="w-full h-40 border-0"
                loading="lazy"
                title="Business location"
              />
            </div>
          )}

          {/* Activity log */}
          <div className="card">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Activity</h2>
            {lead.activityLog.length === 0 ? (
              <p className="text-xs text-gray-400">No activity yet.</p>
            ) : (
              <div className="space-y-2">
                {lead.activityLog.map((log) => (
                  <div key={log.id} className="flex items-start gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs text-gray-700">
                        {log.action.replace(/_/g, " ").toLowerCase()}
                        {log.toStatus && ` → ${STATUS_LABELS[log.toStatus] ?? log.toStatus}`}
                      </p>
                      <p className="text-xs text-gray-400">
                        {format(new Date(log.createdAt), "MMM d, h:mm a")}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* RIGHT: Actions panel */}
        <div className="lg:col-span-2 space-y-4">

          {/* Status + deal */}
          <div className="card grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Status</label>
              <select className="input" value={status}
                onChange={(e) => { setStatus(e.target.value); saveField({ status: e.target.value }); }}>
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {status === "CLOSED" && (
              <div>
                <label className="text-xs text-gray-500 mb-1 block">Deal value ($)</label>
                <input type="number" className="input" placeholder="0"
                  value={dealValue} onChange={(e) => setDealValue(e.target.value)}
                  onBlur={() => saveField({ dealValueUsd: parseFloat(dealValue) || null })} />
              </div>
            )}
          </div>

          {/* Zoom booking */}
          <div className="card">
            <h2 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
              <Video className="w-4 h-4 text-blue-600" /> Zoom Meeting (5 min)
            </h2>
            {lead.zoomJoinUrl ? (
              <div className="space-y-2">
                <a href={lead.zoomJoinUrl} target="_blank" rel="noreferrer"
                  className="btn-primary flex items-center gap-2 justify-center w-full">
                  <Video className="w-4 h-4" /> Join Meeting
                </a>
                <button onClick={() => copy(lead.zoomJoinUrl!, "zoom")}
                  className="btn-secondary w-full flex items-center gap-2 justify-center text-xs">
                  {copied === "zoom" ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy join link
                </button>
                {lead.meetingAt && (
                  <p className="text-xs text-gray-500 text-center">
                    Scheduled: {format(new Date(lead.meetingAt), "EEEE, MMMM d 'at' h:mm a")}
                  </p>
                )}
              </div>
            ) : (
              <div className="flex gap-2">
                <input type="datetime-local" className="input flex-1"
                  value={bookingDate} onChange={(e) => setBookingDate(e.target.value)} />
                <button className="btn-primary shrink-0 flex items-center gap-1.5"
                  onClick={bookZoom} disabled={bookingLoading || !bookingDate}>
                  {bookingLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Video className="w-4 h-4" />}
                  Book
                </button>
              </div>
            )}
          </div>

          {/* Tab switcher */}
          <div className="flex gap-2 border-b border-gray-200 pb-0">
            {[
              { key: "overview", label: "Notes", icon: null },
              { key: "script", label: "Call Script", icon: <FileText className="w-3.5 h-3.5" /> },
              { key: "website-prompt", label: "Website Prompt", icon: <Code className="w-3.5 h-3.5" /> },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => {
                  if (t.key === "script") loadScript();
                  else if (t.key === "website-prompt") loadWebsitePrompt();
                  else setTab("overview");
                }}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium border-b-2 transition-colors ${
                  tab === t.key
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.icon}{t.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="card min-h-48">
            {tab === "overview" && (
              <div>
                <label className="text-xs font-medium text-gray-500 mb-2 block">Call notes</label>
                <textarea
                  className="input w-full h-40 resize-none text-sm"
                  placeholder="Objections heard, follow-up actions, what they said..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  onBlur={() => saveField({ notes })}
                />
                {saving && <p className="text-xs text-gray-400 mt-1">Saving...</p>}
              </div>
            )}

            {tab === "script" && (
              <div>
                {scriptLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" /> Generating script...
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Call Script</span>
                      <button onClick={() => copy(script, "script")}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        {copied === "script" ? <><Check className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy all</>}
                      </button>
                    </div>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {script}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {tab === "website-prompt" && (
              <div>
                {promptLoading ? (
                  <div className="flex items-center gap-2 text-gray-500 py-8 justify-center">
                    <Loader2 className="w-5 h-5 animate-spin" /> Building website prompt...
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Website Build Prompt</span>
                      <button onClick={() => copy(websitePrompt, "wp")}
                        className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                        {copied === "wp" ? <><Check className="w-3 h-3 text-green-500" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                      </button>
                    </div>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed">
                      {websitePrompt}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
