"use client";

import { useState } from "react";
import { INDUSTRY_GROUPS, COUNTRIES, REGIONS, type Country } from "@/data/industries";
import { getScoreColor, getPriorityTag } from "@/lib/scorer";
import {
  Phone, Globe, Star, MapPin, Zap, Copy, Check, Plus,
  FileText, ChevronDown, ExternalLink, AlertCircle, TrendingUp,
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
  category: string | null;
  city: string;
  state: string;
  country: string;
  industry: string;
}

interface ScanResult {
  leads: Lead[];
  total: number;
  fromCache: boolean;
}

export default function ScanPage() {
  const [country, setCountry] = useState<Country>("US");
  const [state, setState] = useState(Object.keys(REGIONS["US"])[0]);
  const [city, setCity] = useState(REGIONS["US"][Object.keys(REGIONS["US"])[0]][0]);
  const [industry, setIndustry] = useState("roofing");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filterNoWebsite, setFilterNoWebsite] = useState(false);
  const [filterWeakWebsite, setFilterWeakWebsite] = useState(false);
  const [filterHasWebsite, setFilterHasWebsite] = useState(false);
  const [filterNoAds, setFilterNoAds] = useState(false);
  const [filterHighRating, setFilterHighRating] = useState(false);
  const [filterHasPhone, setFilterHasPhone] = useState(false);
  const [sortBy, setSortBy] = useState<"score" | "rating" | "reviews">("score");

  // Per-card state
  const [copiedPhone, setCopiedPhone] = useState<string | null>(null);
  const [scripts, setScripts] = useState<Record<string, string>>({});
  const [loadingScript, setLoadingScript] = useState<string | null>(null);
  const [addedLeads, setAddedLeads] = useState<Set<string>>(new Set());
  const [activeScript, setActiveScript] = useState<string | null>(null);
  const [expandedQuality, setExpandedQuality] = useState<string | null>(null);

  const regions = REGIONS[country];
  const cities = regions[state] ?? [];

  function handleCountryChange(c: Country) {
    setCountry(c);
    const firstState = Object.keys(REGIONS[c])[0];
    setState(firstState);
    setCity(REGIONS[c][firstState][0]);
  }

  function handleStateChange(s: string) {
    setState(s);
    setCity(regions[s]?.[0] ?? "");
  }

  async function handleScan() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/scan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, city, industry, country }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Scan failed");
      setResult(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleGetScript(lead: Lead) {
    if (scripts[lead.id]) {
      setActiveScript(activeScript === lead.id ? null : lead.id);
      return;
    }
    setLoadingScript(lead.id);
    try {
      const res = await fetch("/api/call-script", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadCacheId: lead.id }),
      });
      const data = await res.json();
      setScripts((prev) => ({ ...prev, [lead.id]: data.script }));
      setActiveScript(lead.id);
    } catch {}
    setLoadingScript(null);
  }

  async function handleAddPipeline(lead: Lead) {
    try {
      await fetch("/api/pipeline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadCacheId: lead.id }),
      });
      setAddedLeads((prev) => new Set([...prev, lead.id]));
    } catch {}
  }

  function copyPhone(phone: string) {
    navigator.clipboard.writeText(phone);
    setCopiedPhone(phone);
    setTimeout(() => setCopiedPhone(null), 2000);
  }

  const displayLeads = (result?.leads ?? [])
    .filter((l) => {
      if (filterNoWebsite && (l.hasWebsite && !l.websiteDead)) return false;
      if (filterWeakWebsite && l.websiteQuality !== "poor" && l.websiteQuality !== null) return false;
      if (filterHasWebsite && (!l.hasWebsite || l.websiteDead)) return false;
      if (filterNoAds && l.hasGoogleAds) return false;
      if (filterHighRating && (l.rating === null || l.rating < 4)) return false;
      if (filterHasPhone && !l.phone) return false;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === "score") return b.score - a.score;
      if (sortBy === "rating") return (b.rating ?? 0) - (a.rating ?? 0);
      return (b.reviewCount ?? 0) - (a.reviewCount ?? 0);
    });

  const noWebsiteCount = result?.leads.filter((l) => !l.hasWebsite || l.websiteDead).length ?? 0;
  const weakWebsiteCount = result?.leads.filter((l) => l.hasWebsite && !l.websiteDead && l.websiteQuality === "poor").length ?? 0;
  const hasWebsiteCount = result?.leads.filter((l) => l.hasWebsite && !l.websiteDead).length ?? 0;
  const highValueCount = result?.leads.filter((l) => l.scoreLabel === "A+" || l.scoreLabel === "A").length ?? 0;

  function websiteQualityBadge(lead: Lead) {
    if (!lead.hasWebsite || lead.websiteDead) {
      return (
        <span className="tag tag-red flex items-center gap-1">
          <Globe className="w-3 h-3" /> No website
        </span>
      );
    }
    const q = lead.websiteQuality;
    const label = lead.websiteQualityLabel ?? "Has website";
    if (q === "poor") {
      return (
        <button
          onClick={() => setExpandedQuality(expandedQuality === lead.id ? null : lead.id)}
          className="tag tag-red flex items-center gap-1 cursor-pointer hover:opacity-80"
        >
          <AlertCircle className="w-3 h-3" /> {label} ▾
        </button>
      );
    }
    if (q === "average") {
      return (
        <button
          onClick={() => setExpandedQuality(expandedQuality === lead.id ? null : lead.id)}
          className="tag tag-amber flex items-center gap-1 cursor-pointer hover:opacity-80"
        >
          <Globe className="w-3 h-3" /> {label} ▾
        </button>
      );
    }
    return (
      <button
        onClick={() => setExpandedQuality(expandedQuality === lead.id ? null : lead.id)}
        className="tag tag-green flex items-center gap-1 cursor-pointer hover:opacity-80"
      >
        <Globe className="w-3 h-3" /> {label} ▾
      </button>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Nav */}
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-blue-600 text-lg">ColdCRM</span>
        <a href="/scan" className="text-sm font-medium text-blue-600">Scanner</a>
        <a href="/call-mode" className="text-sm text-gray-500 hover:text-gray-700">📞 Call Mode</a>
        <a href="/pipeline" className="text-sm text-gray-500 hover:text-gray-700">Pipeline</a>
        <a href="/settings" className="text-sm text-gray-500 hover:text-gray-700 ml-auto">Settings</a>
      </nav>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Search bar */}
        <div className="card mb-4">
          <div className="flex flex-wrap gap-3 items-end">
            {/* Country */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Country</label>
              <select
                className="input w-44"
                value={country}
                onChange={(e) => handleCountryChange(e.target.value as Country)}
              >
                {COUNTRIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.flag} {c.label}
                  </option>
                ))}
              </select>
            </div>

            {/* State / Region */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">
                {country === "BR" ? "Estado" : country === "UK" ? "Region" : "State"}
              </label>
              <select
                className="input w-48"
                value={state}
                onChange={(e) => handleStateChange(e.target.value)}
              >
                {Object.keys(regions).sort().map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* City */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">City</label>
              <select className="input w-44" value={city} onChange={(e) => setCity(e.target.value)}>
                {cities.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Industry — grouped */}
            <div className="flex flex-col gap-1">
              <label className="text-xs text-gray-500 font-medium">Industry</label>
              <select
                className="input w-52"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
              >
                {INDUSTRY_GROUPS.map((g) => (
                  <optgroup key={g.group} label={g.group}>
                    {g.industries.map((i) => (
                      <option key={i.value} value={i.value}>{i.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            <button
              className="btn-primary flex items-center gap-2 h-9"
              onClick={handleScan}
              disabled={loading}
            >
              <Zap className="w-4 h-4" />
              {loading ? "Scanning..." : "Scan for Leads"}
            </button>

            {result && (
              <a
                href="/call-mode"
                className="flex items-center gap-2 h-9 px-4 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                📞 Enter Call Mode
              </a>
            )}
          </div>

          {loading && (
            <p className="text-sm text-gray-500 animate-pulse mt-3">
              Scanning {city}, {state} · {country} for leads...
            </p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl p-4 mb-4">{error}</div>
        )}

        {/* Stats */}
        {result && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            {[
              { label: "Total found", value: result.total, color: "text-gray-900" },
              { label: "No website 🎯", value: noWebsiteCount, color: "text-red-600" },
              { label: "Poor website ⚡", value: weakWebsiteCount, color: "text-amber-600" },
              { label: "High-value (A/A+)", value: highValueCount, color: "text-green-600" },
            ].map((s) => (
              <div key={s.label} className="card text-center py-3">
                <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        {result && (
          <div className="flex flex-wrap gap-2 mb-4">
            {[
              { label: "No website", active: filterNoWebsite, set: setFilterNoWebsite },
              { label: "Poor website", active: filterWeakWebsite, set: setFilterWeakWebsite },
              { label: "Has website", active: filterHasWebsite, set: setFilterHasWebsite },
              { label: "No Google Ads", active: filterNoAds, set: setFilterNoAds },
              { label: "4+ stars", active: filterHighRating, set: setFilterHighRating },
              { label: "Has phone", active: filterHasPhone, set: setFilterHasPhone },
            ].map((f) => (
              <button
                key={f.label}
                onClick={() => f.set(!f.active)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                  f.active
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="flex items-center gap-1 ml-auto">
              <span className="text-xs text-gray-500">Sort:</span>
              {(["score", "rating", "reviews"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortBy(s)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    sortBy === s ? "bg-gray-900 text-white border-gray-900" : "bg-white text-gray-600 border-gray-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
            <span className="text-xs text-gray-400 self-center">{displayLeads.length} showing</span>
          </div>
        )}

        {/* Lead cards */}
        <div className="space-y-3">
          {loading && Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="card">
              <div className="skeleton h-5 w-48 mb-2" />
              <div className="skeleton h-4 w-72 mb-3" />
              <div className="flex gap-2">
                <div className="skeleton h-5 w-20 rounded-full" />
                <div className="skeleton h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}

          {!loading && displayLeads.map((lead) => {
            const priority = getPriorityTag(lead.score);
            return (
              <div key={lead.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{lead.businessName}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${priority.classes}`}>
                        {priority.label}
                      </span>
                      {lead.googleMapsUrl && (
                        <a
                          href={lead.googleMapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-blue-500 hover:underline flex items-center gap-0.5"
                        >
                          <MapPin className="w-3 h-3" /> Maps
                        </a>
                      )}
                    </div>

                    <p className="text-sm text-gray-500 mb-2">
                      {lead.rating && (
                        <span className="inline-flex items-center gap-0.5 mr-2">
                          <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                          {lead.rating} ({lead.reviewCount?.toLocaleString()} reviews)
                        </span>
                      )}
                      {lead.address && <span>{lead.address}</span>}
                    </p>

                    {/* Tags row */}
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {websiteQualityBadge(lead)}
                      {lead.hasWebsite && !lead.websiteDead && lead.websiteUrl && (
                        <a
                          href={lead.websiteUrl.startsWith("http") ? lead.websiteUrl : `https://${lead.websiteUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="tag tag-blue flex items-center gap-1 hover:underline"
                        >
                          <ExternalLink className="w-3 h-3" /> Visit site
                        </a>
                      )}
                      {!lead.hasGoogleAds && (
                        <span className="tag tag-amber">No Google Ads</span>
                      )}
                      {lead.rating && lead.rating >= 4.5 && (
                        <span className="tag tag-green">{lead.rating}★</span>
                      )}
                      {lead.phone && (
                        <span className="tag tag-blue flex items-center gap-1">
                          <Phone className="w-3 h-3" /> Has phone
                        </span>
                      )}
                      {lead.email && (
                        <span className="tag tag-blue">Has email</span>
                      )}
                    </div>

                    {/* Website quality breakdown */}
                    {expandedQuality === lead.id && lead.websiteQualityDetails && lead.websiteQualityDetails.length > 0 && (
                      <div className="mb-2 bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <p className="text-xs font-semibold text-gray-500 mb-1.5 uppercase tracking-wide">Website Analysis</p>
                        <div className="grid grid-cols-2 gap-0.5">
                          {lead.websiteQualityDetails.map((d, i) => (
                            <p key={i} className="text-xs text-gray-600">{d}</p>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Sales angle */}
                    {lead.salesAngle && (
                      <p className="text-xs text-indigo-600 font-medium mb-2 flex items-center gap-1">
                        <TrendingUp className="w-3 h-3" />
                        {lead.salesAngle}
                      </p>
                    )}

                    {lead.phone && (
                      <button
                        onClick={() => copyPhone(lead.phone!)}
                        className="flex items-center gap-1.5 text-sm text-blue-600 font-medium hover:text-blue-800"
                      >
                        {copiedPhone === lead.phone ? (
                          <><Check className="w-3.5 h-3.5 text-green-600" /><span className="text-green-600">Copied!</span></>
                        ) : (
                          <><Copy className="w-3.5 h-3.5" />{lead.phone}</>
                        )}
                      </button>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center text-xs font-bold ${getScoreColor(lead.scoreLabel)}`}>
                      {lead.scoreLabel}
                    </div>
                    <div className="text-xs text-gray-400 font-medium">{lead.score}/100</div>
                    <button
                      onClick={() => handleGetScript(lead)}
                      className="btn-secondary flex items-center gap-1 text-xs py-1 px-2"
                      disabled={loadingScript === lead.id}
                    >
                      <FileText className="w-3 h-3" />
                      {loadingScript === lead.id ? "..." : "Script"}
                    </button>
                    <button
                      onClick={() => handleAddPipeline(lead)}
                      disabled={addedLeads.has(lead.id)}
                      className={`flex items-center gap-1 text-xs py-1 px-2 rounded-lg font-medium transition-colors ${
                        addedLeads.has(lead.id)
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "btn-primary py-1 px-2"
                      }`}
                    >
                      {addedLeads.has(lead.id) ? (
                        <><Check className="w-3 h-3" /> Added</>
                      ) : (
                        <><Plus className="w-3 h-3" /> Pipeline</>
                      )}
                    </button>
                  </div>
                </div>

                {/* Call script drawer */}
                {activeScript === lead.id && scripts[lead.id] && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Call Script</span>
                      <button
                        onClick={() => navigator.clipboard.writeText(scripts[lead.id])}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" /> Copy all
                      </button>
                    </div>
                    <pre className="text-sm text-gray-700 whitespace-pre-wrap font-sans leading-relaxed bg-gray-50 rounded-lg p-3">
                      {scripts[lead.id]}
                    </pre>
                  </div>
                )}
              </div>
            );
          })}

          {!loading && result && displayLeads.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-lg mb-1">No leads match your filters</p>
              <p className="text-sm">Try relaxing the filter criteria</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
