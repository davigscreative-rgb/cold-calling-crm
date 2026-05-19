"use client";

import { useState, useEffect } from "react";
import { Save, Eye, EyeOff, Copy, Check, Zap, RefreshCw } from "lucide-react";

const VARIABLES = [
  { token: "{{businessName}}", desc: "Business name", example: "Smith Plumbing Co." },
  { token: "{{industry}}", desc: "Industry", example: "plumbing" },
  { token: "{{city}}", desc: "City", example: "Austin" },
  { token: "{{state}}", desc: "State", example: "TX" },
  { token: "{{country}}", desc: "Country", example: "US" },
  { token: "{{websiteStatus}}", desc: "Website status", example: "no website" },
  { token: "{{salesAngle}}", desc: "AI sales angle", example: "No online presence detected" },
  { token: "{{rating}}", desc: "Google rating", example: "4.5" },
  { token: "{{phone}}", desc: "Phone number", example: "(512) 555-0100" },
];

const DEFAULT_TEMPLATE = `Hey, is this {{businessName}}?

Hey! My name is [Your Name] — I'm reaching out because I was looking at local {{industry}} businesses in {{city}} and noticed that {{websiteStatus}}.

I help businesses like yours get more customers online — we've been working with a lot of {{industry}} companies in {{state}} lately and getting them some really solid results.

I'm not trying to sell you anything today — I just wanted to quickly ask: are you currently getting leads online, or is it mostly word of mouth right now?

[LISTEN — then respond based on answer]

If word of mouth: "That's actually why I'm calling — there's a huge opportunity for {{industry}} businesses in {{city}} right now because most of your competitors aren't showing up online either. We could be the first to set that up for you."

If some online: "That's great — what's working best for you? The reason I ask is {{salesAngle}}."

Either way: "What would it mean for your business if you were getting 5-10 new customer inquiries a month from Google?"

[Close for a discovery call or callback]`;

// Preview mock lead
const MOCK_LEAD = {
  businessName: "Rodriguez Roofing LLC",
  industry: "roofing",
  city: "Houston",
  state: "TX",
  country: "US",
  websiteStatus: "no website detected",
  salesAngle: "No digital presence — huge opportunity to pitch website services",
  rating: "4.7",
  phone: "(713) 555-0182",
};

function renderTemplate(template: string, lead: typeof MOCK_LEAD) {
  return template
    .replace(/{{businessName}}/g, lead.businessName)
    .replace(/{{industry}}/g, lead.industry)
    .replace(/{{city}}/g, lead.city)
    .replace(/{{state}}/g, lead.state)
    .replace(/{{country}}/g, lead.country)
    .replace(/{{websiteStatus}}/g, lead.websiteStatus)
    .replace(/{{salesAngle}}/g, lead.salesAngle)
    .replace(/{{rating}}/g, lead.rating)
    .replace(/{{phone}}/g, lead.phone);
}

export default function PlaybookPage() {
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [preview, setPreview] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/playbook")
      .then((r) => r.json())
      .then((d) => {
        if (d.playbook) setTemplate(d.playbook);
        setLoading(false);
      });
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/playbook", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ playbook: template }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  function insertToken(token: string) {
    setTemplate((t) => t + token);
  }

  function copyRendered() {
    navigator.clipboard.writeText(renderTemplate(template, MOCK_LEAD));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const rendered = renderTemplate(template, MOCK_LEAD);
  const usedTokens = VARIABLES.filter((v) => template.includes(v.token));
  const unusedTokens = VARIABLES.filter((v) => !template.includes(v.token));

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4 flex items-center justify-between">
        <div>
          <h1 className="font-black text-xl flex items-center gap-2">📋 Sales Playbook</h1>
          <p className="text-gray-500 text-sm mt-0.5">Write once. Personalized automatically for every lead.</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setPreview(!preview)}
            className="flex items-center gap-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm font-medium transition-colors">
            {preview ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {preview ? "Edit" : "Preview"}
          </button>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors">
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? <><RefreshCw className="w-4 h-4 animate-spin" /> Saving...</> : <><Save className="w-4 h-4" /> Save Playbook</>}
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100vh-65px)]">
        {/* Left: Editor / Preview */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {!preview ? (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-400">Your Script Template</p>
                <p className="text-xs text-gray-600">{template.length} chars · {usedTokens.length} variables used</p>
              </div>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="flex-1 bg-gray-900 border border-gray-700 rounded-2xl p-5 text-sm text-gray-200 font-mono leading-relaxed resize-none focus:outline-none focus:border-blue-600 transition-colors"
                placeholder="Write your sales script here. Use {{businessName}}, {{industry}}, etc."
              />
            </>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold text-gray-400">Live Preview</p>
                  <p className="text-xs text-gray-600">Rendered for: {MOCK_LEAD.businessName} · {MOCK_LEAD.city}, {MOCK_LEAD.state}</p>
                </div>
                <button onClick={copyRendered}
                  className="flex items-center gap-1.5 text-xs bg-gray-800 hover:bg-gray-700 border border-gray-700 text-gray-300 px-3 py-1.5 rounded-lg transition-colors">
                  {copied ? <><Check className="w-3 h-3 text-green-400" /> Copied!</> : <><Copy className="w-3 h-3" /> Copy script</>}
                </button>
              </div>
              <div className="flex-1 bg-gray-900 border border-gray-700 rounded-2xl p-6 overflow-y-auto">
                <pre className="text-sm text-gray-200 whitespace-pre-wrap font-sans leading-relaxed">
                  {rendered.split(/(\*\*[^*]+\*\*|\[.*?\])/g).map((part, i) => {
                    if (part.startsWith("[") && part.endsWith("]")) {
                      return <span key={i} className="text-amber-400 font-bold">{part}</span>;
                    }
                    return <span key={i}>{part}</span>;
                  })}
                </pre>
              </div>
            </>
          )}
        </div>

        {/* Right: Variable panel */}
        <div className="w-72 border-l border-gray-800 p-5 overflow-y-auto">
          <h3 className="font-bold text-sm mb-4 text-gray-300">💡 Variables</h3>

          <div className="mb-5">
            <p className="text-xs text-green-500 font-semibold uppercase tracking-wide mb-2">Active in script</p>
            <div className="space-y-1.5">
              {usedTokens.length === 0 ? (
                <p className="text-xs text-gray-700">None yet</p>
              ) : usedTokens.map((v) => (
                <div key={v.token} className="bg-green-900/20 border border-green-800/50 rounded-lg px-3 py-2">
                  <p className="text-xs font-mono text-green-400 font-bold">{v.token}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">→ "{v.example}"</p>
                </div>
              ))}
            </div>
          </div>

          <div className="mb-5">
            <p className="text-xs text-gray-600 font-semibold uppercase tracking-wide mb-2">Click to insert</p>
            <div className="space-y-1.5">
              {unusedTokens.map((v) => (
                <button key={v.token} onClick={() => insertToken(v.token)}
                  className="w-full text-left bg-gray-900 hover:bg-gray-800 border border-gray-800 hover:border-gray-600 rounded-lg px-3 py-2 transition-colors group">
                  <p className="text-xs font-mono text-blue-400 group-hover:text-blue-300">{v.token}</p>
                  <p className="text-[10px] text-gray-600">{v.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Tips */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
            <p className="text-xs font-bold text-gray-400 mb-2">💬 Tips</p>
            <ul className="text-[11px] text-gray-600 space-y-1.5">
              <li>• Use [PAUSE] or [LISTEN] as stage directions</li>
              <li>• Keep openers under 30 seconds</li>
              <li>• Ask questions — don't pitch immediately</li>
             <li>• No website = your biggest hook</li>
              <li>• End with a yes/no question only</li>
            </ul>
          </div>

          <div className="mt-4">
            <p className="text-xs font-bold text-gray-400 mb-2">🎯 Preview Lead</p>
            <div className="bg-gray-900 border border-gray-800 rounded-xl p-3 space-y-1">
              {Object.entries(MOCK_LEAD).map(([k, v]) => (
                <div key={k} className="flex justify-between">
                  <span className="text-[10px] text-gray-600">{k}</span>
                  <span className="text-[10px] text-gray-400 font-medium truncate max-w-[120px]">{v}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
