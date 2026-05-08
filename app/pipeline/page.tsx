"use client";

import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Phone, Star, Globe, Video, TrendingUp, X, Check, Copy } from "lucide-react";
import { getScoreColor } from "@/lib/scorer";
import { format } from "date-fns";

type LeadStatus = "NEW" | "CALLED" | "BOOKED" | "SHOWED" | "CLOSED" | "NOSHOW";

interface PipelineLead {
  id: string;
  status: LeadStatus;
  dealValueUsd: number | null;
  notes: string | null;
  meetingAt: string | null;
  zoomJoinUrl: string | null;
  addedAt: string;
  leadCache: {
    businessName: string;
    phone: string | null;
    rating: number | null;
    reviewCount: number | null;
    hasWebsite: boolean;
    hasGoogleAds: boolean;
    scoreLabel: string;
    industry: string;
    city: string;
    state: string;
    email: string | null;
  };
}

const COLUMNS: { id: LeadStatus; label: string; color: string }[] = [
  { id: "NEW",    label: "New Lead",    color: "border-t-gray-400" },
  { id: "CALLED", label: "Called",      color: "border-t-blue-400" },
  { id: "BOOKED", label: "Booked",      color: "border-t-purple-400" },
  { id: "SHOWED", label: "Showed Up",   color: "border-t-amber-400" },
  { id: "CLOSED", label: "Closed",      color: "border-t-green-500" },
  { id: "NOSHOW", label: "No Show",     color: "border-t-red-400" },
];

function LeadCard({ lead, onClick }: { lead: PipelineLead; onClick: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="kanban-card select-none"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-1 mb-1">
        <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
          {lead.leadCache.businessName}
        </p>
        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full border ${getScoreColor(lead.leadCache.scoreLabel)} shrink-0`}>
          {lead.leadCache.scoreLabel}
        </span>
      </div>
      <p className="text-xs text-gray-500 mb-2">
        {lead.leadCache.industry} · {lead.leadCache.city}
      </p>
      <div className="flex flex-wrap gap-1 mb-2">
        {!lead.leadCache.hasWebsite && <span className="tag tag-red text-[10px]">No site</span>}
        {!lead.leadCache.hasGoogleAds && <span className="tag tag-amber text-[10px]">No ads</span>}
        {lead.leadCache.rating && (
          <span className="tag tag-green text-[10px]">
            <Star className="w-2.5 h-2.5 fill-current" />{lead.leadCache.rating}
          </span>
        )}
      </div>
      {lead.leadCache.phone && (
        <p className="text-xs text-blue-600 font-medium">{lead.leadCache.phone}</p>
      )}
      {lead.meetingAt && (
        <p className="text-xs text-purple-600 mt-1 flex items-center gap-1">
          <Video className="w-3 h-3" />
          {format(new Date(lead.meetingAt), "MMM d, h:mm a")}
        </p>
      )}
    </div>
  );
}

function LeadDrawer({ lead, onClose, onUpdate }: {
  lead: PipelineLead;
  onClose: () => void;
  onUpdate: (id: string, data: Partial<PipelineLead>) => void;
}) {
  const [notes, setNotes] = useState(lead.notes ?? "");
  const [dealValue, setDealValue] = useState(lead.dealValueUsd?.toString() ?? "");
  const [status, setStatus] = useState<LeadStatus>(lead.status);
  const [bookingDate, setBookingDate] = useState("");
  const [bookingLoading, setBookingLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function saveNotes() {
    await fetch("/api/pipeline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: lead.id, notes }),
    });
    onUpdate(lead.id, { notes });
  }

  async function saveStatus(newStatus: LeadStatus) {
    setStatus(newStatus);
    await fetch("/api/pipeline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: lead.id,
        status: newStatus,
        dealValueUsd: dealValue ? parseFloat(dealValue) : null,
      }),
    });
    onUpdate(lead.id, { status: newStatus });
  }

  async function bookZoom() {
    if (!bookingDate) return;
    setBookingLoading(true);
    try {
      const res = await fetch("/api/zoom/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          pipelineLeadId: lead.id,
          scheduledAt: new Date(bookingDate).toISOString(),
        }),
      });
      const data = await res.json();
      if (data.joinUrl) {
        onUpdate(lead.id, { zoomJoinUrl: data.joinUrl, status: "BOOKED" });
        setStatus("BOOKED");
      }
    } finally {
      setBookingLoading(false);
    }
  }

  return (
    <div className="fixed inset-y-0 right-0 w-96 bg-white border-l border-gray-200 shadow-2xl z-50 overflow-y-auto">
      <div className="sticky top-0 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-gray-900">{lead.leadCache.businessName}</h2>
          <p className="text-xs text-gray-500">{lead.leadCache.industry} · {lead.leadCache.city}, {lead.leadCache.state}</p>
        </div>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Score + tags */}
        <div className="flex flex-wrap gap-1.5">
          <span className={`tag border ${getScoreColor(lead.leadCache.scoreLabel)}`}>
            Score: {lead.leadCache.scoreLabel}
          </span>
          {!lead.leadCache.hasWebsite && <span className="tag tag-red">No website</span>}
          {!lead.leadCache.hasGoogleAds && <span className="tag tag-amber">No Google Ads</span>}
        </div>

        {/* Contact info */}
        <div className="card space-y-2">
          {lead.leadCache.phone && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Phone</span>
              <button
                onClick={() => { navigator.clipboard.writeText(lead.leadCache.phone!); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="text-sm text-blue-600 font-medium flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                {lead.leadCache.phone}
              </button>
            </div>
          )}
          {lead.leadCache.email && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Email</span>
              <span className="text-sm text-blue-600">{lead.leadCache.email}</span>
            </div>
          )}
          {lead.leadCache.rating && (
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Rating</span>
              <span className="text-sm flex items-center gap-1">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
                {lead.leadCache.rating} ({lead.leadCache.reviewCount} reviews)
              </span>
            </div>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
          <select
            className="input"
            value={status}
            onChange={(e) => saveStatus(e.target.value as LeadStatus)}
          >
            {COLUMNS.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
        </div>

        {/* Deal value */}
        {status === "CLOSED" && (
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Deal Value ($)</label>
            <input
              type="number"
              className="input"
              placeholder="0"
              value={dealValue}
              onChange={(e) => setDealValue(e.target.value)}
              onBlur={() => fetch("/api/pipeline", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id: lead.id, dealValueUsd: parseFloat(dealValue) }),
              })}
            />
          </div>
        )}

        {/* Zoom booking */}
        <div className="card">
          <p className="text-xs font-semibold text-gray-500 mb-2">Book Zoom Call (5 min)</p>
          {lead.zoomJoinUrl ? (
            <a href={lead.zoomJoinUrl} target="_blank" rel="noreferrer"
              className="btn-primary flex items-center gap-2 justify-center w-full">
              <Video className="w-4 h-4" /> Join Zoom Meeting
            </a>
          ) : (
            <div className="flex gap-2">
              <input
                type="datetime-local"
                className="input flex-1 text-xs"
                value={bookingDate}
                onChange={(e) => setBookingDate(e.target.value)}
              />
              <button className="btn-primary shrink-0" onClick={bookZoom} disabled={bookingLoading}>
                {bookingLoading ? "..." : "Book"}
              </button>
            </div>
          )}
        </div>

        {/* Notes */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block">Notes</label>
          <textarea
            className="input h-28 resize-none"
            placeholder="Call notes, objections, next steps..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
          />
        </div>
      </div>
    </div>
  );
}

export default function PipelinePage() {
  const [leads, setLeads] = useState<PipelineLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [drawerLead, setDrawerLead] = useState<PipelineLead | null>(null);
  const [dailyStats, setDailyStats] = useState({
    leadsAdded: 0, callsMade: 0, meetingsBooked: 0,
    showedUp: 0, closedCount: 0, closedValueUsd: 0, noShows: 0,
  });

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));

  useEffect(() => {
    fetch("/api/pipeline")
      .then((r) => r.json())
      .then((d) => { setLeads(d.leads ?? []); setLoading(false); });
    fetch("/api/stats")
      .then((r) => r.json())
      .then((d) => d.stats && setDailyStats(d.stats));
  }, []);

  function handleDragStart(e: DragStartEvent) { setActiveId(String(e.active.id)); }

  async function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over) { setActiveId(null); return; }

    const newStatus = over.id as LeadStatus;
    if (!COLUMNS.find((c) => c.id === newStatus)) { setActiveId(null); return; }

    const leadId = String(active.id);
    setLeads((prev) => prev.map((l) => l.id === leadId ? { ...l, status: newStatus } : l));

    await fetch("/api/pipeline", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: leadId, status: newStatus }),
    });
    setActiveId(null);
  }

  function updateLead(id: string, data: Partial<PipelineLead>) {
    setLeads((prev) => prev.map((l) => l.id === id ? { ...l, ...data } : l));
    if (drawerLead?.id === id) setDrawerLead((prev) => prev ? { ...prev, ...data } : prev);
  }

  const activeLead = activeId ? leads.find((l) => l.id === activeId) : null;

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-6">
        <span className="font-bold text-blue-600 text-lg">ColdCRM</span>
        <a href="/scan" className="text-sm text-gray-500 hover:text-gray-700">Scanner</a>
        <a href="/pipeline" className="text-sm font-medium text-blue-600">Pipeline</a>
        <a href="/settings" className="text-sm text-gray-500 hover:text-gray-700 ml-auto">Settings</a>
        <a href="/api/export" className="btn-secondary text-xs py-1.5 px-3">Export CSV</a>
      </nav>

      {/* Daily metrics */}
      <div className="bg-white border-b border-gray-200 px-6 py-3">
        <div className="max-w-6xl mx-auto flex flex-wrap gap-4 items-center">
          {[
            { label: "Leads added", value: dailyStats.leadsAdded, color: "text-gray-700" },
            { label: "Calls made", value: dailyStats.callsMade, color: "text-blue-600" },
            { label: "Booked", value: dailyStats.meetingsBooked, color: "text-purple-600" },
            { label: "Showed up", value: dailyStats.showedUp, color: "text-amber-600" },
            { label: "Closed", value: `${dailyStats.closedCount} · $${dailyStats.closedValueUsd.toLocaleString()}`, color: "text-green-600" },
            { label: "No-shows", value: dailyStats.noShows, color: "text-red-500" },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
              <p className="text-xs text-gray-400">{s.label}</p>
            </div>
          ))}
          <a href="/scan" className="ml-auto btn-primary flex items-center gap-1.5 text-sm">
            + Find Leads
          </a>
        </div>
      </div>

      {/* Kanban */}
      <div className="overflow-x-auto px-4 py-4">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-3 min-w-max">
            {COLUMNS.map((col) => {
              const colLeads = leads.filter((l) => l.status === col.id);
              return (
                <div key={col.id} id={col.id} className={`kanban-col border-t-2 ${col.color}`}>
                  <div className="flex items-center justify-between px-1 mb-2">
                    <span className="text-xs font-semibold text-gray-600">{col.label}</span>
                    <span className="text-xs bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">{colLeads.length}</span>
                  </div>
                  <div className="bg-gray-100 rounded-xl p-2 min-h-64 flex flex-col gap-2">
                    <SortableContext items={colLeads.map((l) => l.id)} strategy={verticalListSortingStrategy}>
                      {colLeads.map((lead) => (
                        <LeadCard key={lead.id} lead={lead} onClick={() => setDrawerLead(lead)} />
                      ))}
                    </SortableContext>
                    {colLeads.length === 0 && !loading && (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-xs text-gray-300">Drop here</p>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <DragOverlay>
            {activeLead && (
              <div className="kanban-card rotate-2 shadow-xl opacity-90 w-60">
                <p className="text-sm font-semibold">{activeLead.leadCache.businessName}</p>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      {drawerLead && (
        <>
          <div className="fixed inset-0 bg-black/20 z-40" onClick={() => setDrawerLead(null)} />
          <LeadDrawer lead={drawerLead} onClose={() => setDrawerLead(null)} onUpdate={updateLead} />
        </>
      )}
    </div>
  );
}
