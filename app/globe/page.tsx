"use client";

import { useState, useEffect, useRef } from "react";
import { Globe2, Map, Radar, Zap, TrendingUp, Phone } from "lucide-react";

interface GlobePoint {
  city: string;
  country: string;
  lat: number;
  lng: number;
  count: number;
  avgScore: number;
}

const CONQUERED_THRESHOLD = 10;

// Industry radar mock data (real version pulls from API)
const RADAR_INDUSTRIES = [
  "Roofing", "HVAC", "Dental", "Law", "Auto Repair",
  "Cleaning", "Real Estate", "Landscaping",
];

export default function GlobeMapPage() {
  const [view, setView] = useState<"globe" | "conquest" | "radar">("globe");
  const [points, setPoints] = useState<GlobePoint[]>([]);
  const [selected, setSelected] = useState<GlobePoint | null>(null);
  const [loading, setLoading] = useState(true);
  const [rotation, setRotation] = useState(0);
  const animRef = useRef<number>();

  useEffect(() => {
    fetch("/api/globe-data")
      .then((r) => r.json())
      .then((d) => { setPoints(d.points ?? []); setLoading(false); });
  }, []);

  // Auto-rotate globe
  useEffect(() => {
    if (view !== "globe") return;
    const spin = () => {
      setRotation((r) => (r + 0.2) % 360);
      animRef.current = requestAnimationFrame(spin);
    };
    animRef.current = requestAnimationFrame(spin);
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [view]);

  // Project lat/lng to SVG x/y (simple Mercator)
  function project(lat: number, lng: number, rot: number) {
    const cx = 300, cy = 200, r = 170;
    const adjLng = ((lng + rot) % 360 + 360) % 360;
    const x = cx + r * Math.cos((lat * Math.PI) / 180) * Math.sin((adjLng * Math.PI) / 180);
    const y = cy - r * Math.sin((lat * Math.PI) / 180);
    // Only show points on "front" of globe
    const z = Math.cos((lat * Math.PI) / 180) * Math.cos((adjLng * Math.PI) / 180);
    return { x, y, visible: z > 0 };
  }

  function scoreColor(score: number) {
    if (score >= 70) return "#22c55e";
    if (score >= 50) return "#f59e0b";
    return "#3b82f6";
  }

  const conquered = points.filter((p) => p.count >= CONQUERED_THRESHOLD);
  const notYet = points.filter((p) => p.count < CONQUERED_THRESHOLD);

  // Radar chart
  const radarAngles = RADAR_INDUSTRIES.map((_, i) => (i / RADAR_INDUSTRIES.length) * 2 * Math.PI - Math.PI / 2);
  const radarData = RADAR_INDUSTRIES.map((_, i) => Math.random() * 0.8 + 0.1); // replace with real data
  const cx = 180, cy = 180, maxR = 130;

  function radarPoint(angle: number, val: number) {
    return [cx + maxR * val * Math.cos(angle), cy + maxR * val * Math.sin(angle)];
  }

  const radarPath = radarAngles.map((a, i) => {
    const [x, y] = radarPoint(a, radarData[i]);
    return `${i === 0 ? "M" : "L"}${x},${y}`;
  }).join(" ") + "Z";

  return (
    <div className="min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Globe2 className="w-5 h-5 text-blue-400" />
          <span className="font-bold text-lg">Lead Intelligence Map</span>
        </div>
        <div className="flex gap-1">
          {[
            { key: "globe", label: "🌍 World Map", icon: Globe2 },
            { key: "conquest", label: "⚔️ Conquest", icon: Map },
            { key: "radar", label: "📡 Radar", icon: Radar },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setView(tab.key as any)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                view === tab.key ? "bg-blue-600 text-white" : "text-gray-400 hover:text-white hover:bg-gray-800"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* GLOBE VIEW */}
      {view === "globe" && (
        <div className="flex gap-0 h-[calc(100vh-56px)]">
          <div className="flex-1 flex items-center justify-center relative">
            {loading ? (
              <div className="text-gray-500 animate-pulse">Loading lead data...</div>
            ) : (
              <svg viewBox="0 0 600 400" className="w-full max-w-2xl">
                {/* Starfield */}
                {Array.from({ length: 80 }).map((_, i) => (
                  <circle key={i} cx={Math.random() * 600} cy={Math.random() * 400} r={0.8} fill="white" opacity={Math.random() * 0.6 + 0.2} />
                ))}
                {/* Globe body */}
                <defs>
                  <radialGradient id="globeGrad" cx="35%" cy="35%">
                    <stop offset="0%" stopColor="#1e3a5f" />
                    <stop offset="100%" stopColor="#0a0f1e" />
                  </radialGradient>
                  <radialGradient id="glowGrad" cx="50%" cy="50%">
                    <stop offset="70%" stopColor="transparent" />
                    <stop offset="100%" stopColor="#3b82f620" />
                  </radialGradient>
                </defs>
                {/* Glow ring */}
                <circle cx={300} cy={200} r={175} fill="none" stroke="#3b82f6" strokeWidth={0.5} opacity={0.3} />
                <circle cx={300} cy={200} r={180} fill="url(#glowGrad)" />
                <circle cx={300} cy={200} r={170} fill="url(#globeGrad)" />
                {/* Latitude lines */}
                {[-60, -30, 0, 30, 60].map((lat) => {
                  const r = 170 * Math.cos((lat * Math.PI) / 180);
                  const y = 200 - 170 * Math.sin((lat * Math.PI) / 180);
                  return <ellipse key={lat} cx={300} cy={y} rx={r} ry={r * 0.15} fill="none" stroke="#ffffff10" strokeWidth={0.5} />;
                })}
                {/* Lead dots */}
                {points.map((p, i) => {
                  const { x, y, visible } = project(p.lat, p.lng, rotation);
                  if (!visible) return null;
                  const size = Math.min(2 + Math.sqrt(p.count) * 1.2, 12);
                  const color = scoreColor(p.avgScore);
                  return (
                    <g key={i} onClick={() => setSelected(p)} className="cursor-pointer">
                      {/* Pulse ring */}
                      <circle cx={x} cy={y} r={size + 3} fill={color} opacity={0.2}>
                        <animate attributeName="r" values={`${size};${size + 6};${size}`} dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.3;0;0.3" dur="2s" repeatCount="indefinite" />
                      </circle>
                      <circle cx={x} cy={y} r={size} fill={color} opacity={0.9} stroke="white" strokeWidth={0.5} />
                    </g>
                  );
                })}
              </svg>
            )}

            {/* Legend */}
            <div className="absolute bottom-6 left-6 flex items-center gap-4 text-xs text-gray-400">
              {[["#22c55e", "High Score (70+)"], ["#f59e0b", "Medium (50-69)"], ["#3b82f6", "Low (<50)"]].map(([color, label]) => (
                <div key={label} className="flex items-center gap-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ background: color }} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Side panel */}
          <div className="w-72 border-l border-gray-800 p-4 overflow-y-auto">
            {selected ? (
              <div>
                <button onClick={() => setSelected(null)} className="text-xs text-gray-500 hover:text-white mb-3">← Back</button>
                <h3 className="text-xl font-bold mb-1">{selected.city}</h3>
                <p className="text-gray-400 text-sm mb-4">{selected.country}</p>
                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-blue-400">{selected.count}</p>
                    <p className="text-xs text-gray-400">Leads Scanned</p>
                  </div>
                  <div className="bg-gray-800 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold" style={{ color: scoreColor(selected.avgScore) }}>{selected.avgScore}</p>
                    <p className="text-xs text-gray-400">Avg Score</p>
                  </div>
                </div>
                {selected.count >= CONQUERED_THRESHOLD && (
                  <div className="bg-green-900/40 border border-green-700 rounded-xl p-3 text-center mb-3">
                    <p className="text-2xl mb-1">⚔️</p>
                    <p className="text-sm font-bold text-green-400">City Conquered!</p>
                  </div>
                )}
                <a href={`/scan?city=${selected.city}&country=${selected.country}`}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl py-2.5 text-sm font-semibold transition-colors">
                  <Zap className="w-4 h-4" /> Scan this city
                </a>
              </div>
            ) : (
              <div>
                <h3 className="font-bold text-lg mb-1">🌍 Lead Coverage</h3>
                <p className="text-gray-400 text-sm mb-4">{points.length} cities scanned</p>
                <div className="space-y-2">
                  {[...points].sort((a, b) => b.count - a.count).slice(0, 15).map((p, i) => (
                    <button key={i} onClick={() => setSelected(p)}
                      className="w-full flex items-center justify-between bg-gray-800 hover:bg-gray-700 rounded-lg px-3 py-2 transition-colors">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ background: scoreColor(p.avgScore) }} />
                        <span className="text-sm">{p.city}</span>
                        <span className="text-xs text-gray-500">{p.country}</span>
                      </div>
                      <span className="text-xs text-gray-400">{p.count} leads</span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* CONQUEST VIEW */}
      {view === "conquest" && (
        <div className="p-6 max-w-5xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-2">⚔️ Territory Conquest</h2>
            <p className="text-gray-400">Call 10+ leads in a city to conquer it</p>
            <div className="flex justify-center gap-6 mt-4">
              <div className="text-center">
                <p className="text-3xl font-bold text-green-400">{conquered.length}</p>
                <p className="text-xs text-gray-400">Cities Conquered</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-blue-400">{points.length}</p>
                <p className="text-xs text-gray-400">Cities Explored</p>
              </div>
              <div className="text-center">
                <p className="text-3xl font-bold text-amber-400">{notYet.length}</p>
                <p className="text-xs text-gray-400">Cities In Progress</p>
              </div>
            </div>
          </div>

          {conquered.length > 0 && (
            <>
              <h3 className="text-lg font-bold text-green-400 mb-3">✅ Conquered Cities</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
                {conquered.map((p, i) => (
                  <div key={i} className="bg-green-900/30 border border-green-700/50 rounded-xl p-4 text-center">
                    <div className="text-3xl mb-2">🏆</div>
                    <p className="font-bold text-white">{p.city}</p>
                    <p className="text-xs text-green-400 mt-0.5">{p.count} leads</p>
                    <p className="text-xs text-gray-400">{p.country}</p>
                  </div>
                ))}
              </div>
            </>
          )}

          <h3 className="text-lg font-bold text-amber-400 mb-3">⏳ In Progress</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {notYet.slice(0, 20).map((p, i) => {
              const pct = Math.round((p.count / CONQUERED_THRESHOLD) * 100);
              return (
                <div key={i} className="bg-gray-800 border border-gray-700 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-semibold text-sm">{p.city}</p>
                    <span className="text-xs text-gray-400">{p.country}</span>
                  </div>
                  <div className="h-1.5 bg-gray-700 rounded-full mb-1.5 overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">{p.count}/{CONQUERED_THRESHOLD} calls</p>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* RADAR VIEW */}
      {view === "radar" && (
        <div className="flex items-center justify-center min-h-[calc(100vh-56px)] p-6">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold mb-2">📡 Industry Radar</h2>
              <p className="text-gray-400">No-website density by industry in your most scanned city</p>
            </div>
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <svg viewBox="0 0 360 360" className="w-72 h-72">
                {/* Grid rings */}
                {[0.25, 0.5, 0.75, 1].map((r) => (
                  <polygon key={r}
                    points={radarAngles.map((a) => `${cx + maxR * r * Math.cos(a)},${cy + maxR * r * Math.sin(a)}`).join(" ")}
                    fill="none" stroke="#ffffff15" strokeWidth={1} />
                ))}
                {/* Spokes */}
                {radarAngles.map((a, i) => (
                  <line key={i} x1={cx} y1={cy}
                    x2={cx + maxR * Math.cos(a)} y2={cy + maxR * Math.sin(a)}
                    stroke="#ffffff15" strokeWidth={1} />
                ))}
                {/* Data fill */}
                <polygon points={radarPath} fill="#3b82f630" stroke="#3b82f6" strokeWidth={2} />
                {/* Labels */}
                {radarAngles.map((a, i) => {
                  const lx = cx + (maxR + 22) * Math.cos(a);
                  const ly = cy + (maxR + 22) * Math.sin(a);
                  return (
                    <text key={i} x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                      fontSize={10} fill="#9ca3af">{RADAR_INDUSTRIES[i]}</text>
                  );
                })}
                {/* Data dots */}
                {radarAngles.map((a, i) => {
                  const [dx, dy] = radarPoint(a, radarData[i]);
                  return <circle key={i} cx={dx} cy={dy} r={4} fill="#3b82f6" stroke="white" strokeWidth={1.5} />;
                })}
                {/* Center */}
                <circle cx={cx} cy={cy} r={4} fill="#6366f1" />
              </svg>

              <div className="flex-1 space-y-3">
                {RADAR_INDUSTRIES.map((ind, i) => (
                  <div key={ind} className="flex items-center gap-3">
                    <div className="w-28 text-sm text-gray-300">{ind}</div>
                    <div className="flex-1 h-2 bg-gray-800 rounded-full overflow-hidden">
                      <div className="h-full bg-blue-500 rounded-full" style={{ width: `${radarData[i] * 100}%` }} />
                    </div>
                    <div className="text-xs text-gray-400 w-12 text-right">{Math.round(radarData[i] * 100)}%</div>
                  </div>
                ))}
                <p className="text-xs text-gray-500 pt-2">% of businesses without a website in each industry</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
