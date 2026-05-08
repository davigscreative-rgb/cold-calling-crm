"use client";

import { useState, useEffect } from "react";
import { Check, ExternalLink, Loader2 } from "lucide-react";

export default function SettingsPage() {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [settings, setSettings] = useState({
    dailyGoalUsd: 1000,
    defaultIndustry: "",
    defaultState: "Texas",
    scriptTone: "PROFESSIONAL",
    emailEnabled: true,
    twilioEnabled: false,
    followUp1Template: "",
    followUp2Template: "",
  });
  const [zoomConnected, setZoomConnected] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        if (d.settings) setSettings((prev) => ({ ...prev, ...d.settings }));
        setZoomConnected(d.zoomConnected ?? false);
      });

    const params = new URLSearchParams(window.location.search);
    if (params.get("zoom") === "connected") setZoomConnected(true);
  }, []);

  async function save() {
    setSaving(true);
    await fetch("/api/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(settings),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-blue-600 text-lg">ColdCRM</span>
        <a href="/scan" className="text-sm text-gray-500 hover:text-gray-700">Scanner</a>
        <a href="/pipeline" className="text-sm text-gray-500 hover:text-gray-700">Pipeline</a>
        <a href="/settings" className="text-sm font-medium text-blue-600 ml-auto">Settings</a>
      </nav>

      <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-semibold text-gray-900">Settings</h1>

        {/* Goals */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Daily Goal</h2>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Daily revenue target ($)</label>
            <input
              type="number"
              className="input w-48"
              value={settings.dailyGoalUsd}
              onChange={(e) => setSettings((s) => ({ ...s, dailyGoalUsd: parseFloat(e.target.value) }))}
            />
          </div>
        </div>

        {/* Defaults */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Defaults</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Default state</label>
              <input className="input" value={settings.defaultState}
                onChange={(e) => setSettings((s) => ({ ...s, defaultState: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-1 block">Default industry</label>
              <input className="input" value={settings.defaultIndustry}
                onChange={(e) => setSettings((s) => ({ ...s, defaultIndustry: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Call script tone</label>
            <select className="input w-52" value={settings.scriptTone}
              onChange={(e) => setSettings((s) => ({ ...s, scriptTone: e.target.value }))}>
              <option value="PROFESSIONAL">Professional</option>
              <option value="CASUAL">Casual</option>
              <option value="AGGRESSIVE">Aggressive</option>
            </select>
          </div>
        </div>

        {/* Zoom */}
        <div className="card space-y-3">
          <h2 className="font-semibold text-gray-800">Zoom Integration</h2>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-700">
                {zoomConnected ? "Connected to Zoom" : "Not connected"}
              </p>
              <p className="text-xs text-gray-400">Used to auto-create 5-minute meetings when you book a lead</p>
            </div>
            {zoomConnected ? (
              <span className="tag tag-green">
                <Check className="w-3 h-3" /> Connected
              </span>
            ) : (
              <a href="/api/zoom/auth" className="btn-primary flex items-center gap-1.5">
                <ExternalLink className="w-4 h-4" /> Connect Zoom
              </a>
            )}
          </div>
        </div>

        {/* Follow-ups */}
        <div className="card space-y-4">
          <h2 className="font-semibold text-gray-800">Follow-up Settings</h2>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="email" checked={settings.emailEnabled}
              onChange={(e) => setSettings((s) => ({ ...s, emailEnabled: e.target.checked }))} />
            <label htmlFor="email" className="text-sm text-gray-700">Send email follow-ups</label>
          </div>
          <div className="flex items-center gap-3">
            <input type="checkbox" id="sms" checked={settings.twilioEnabled}
              onChange={(e) => setSettings((s) => ({ ...s, twilioEnabled: e.target.checked }))} />
            <label htmlFor="sms" className="text-sm text-gray-700">Send SMS follow-ups (requires Twilio)</label>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Follow-up 1 template (sent immediately after booking)</label>
            <textarea className="input h-28 resize-none text-xs" placeholder="Leave blank to use AI-generated message"
              value={settings.followUp1Template}
              onChange={(e) => setSettings((s) => ({ ...s, followUp1Template: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">Follow-up 2 template (sent 90 min before meeting)</label>
            <textarea className="input h-28 resize-none text-xs" placeholder="Leave blank to use AI-generated message"
              value={settings.followUp2Template}
              onChange={(e) => setSettings((s) => ({ ...s, followUp2Template: e.target.value }))} />
          </div>
        </div>

        <button onClick={save} disabled={saving}
          className="btn-primary flex items-center gap-2 w-full justify-center py-3">
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : saved ? <Check className="w-4 h-4" /> : null}
          {saving ? "Saving..." : saved ? "Saved!" : "Save Settings"}
        </button>
      </div>
    </div>
  );
}
