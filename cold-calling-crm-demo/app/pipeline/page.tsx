'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function PipelinePage() {
  const [leads, setLeads] = useState<any[]>([]);

  useEffect(() => {
    const pipeline = JSON.parse(localStorage.getItem('pipeline') || '[]');
    setLeads(pipeline);
  }, []);

  const updateStatus = (id: number, newStatus: string) => {
    const updated = leads.map(l => l.id === id ? { ...l, status: newStatus } : l);
    setLeads(updated);
    localStorage.setItem('pipeline', JSON.stringify(updated));
  };

  const columns = ['new', 'contacted', 'qualified', 'proposal', 'negotiating', 'closed'];
  const columnTitles: Record<string, string> = {
    new: '🆕 New',
    contacted: '📞 Contacted',
    qualified: '✅ Qualified',
    proposal: '📄 Proposal',
    negotiating: '💬 Negotiating',
    closed: '🎉 Closed',
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">📈 Pipeline</h1>
          <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Home
          </Link>
        </div>

        <div className="grid grid-cols-6 gap-4">
          {columns.map((col) => (
            <div key={col} className="bg-white rounded-lg p-4">
              <h2 className="font-bold mb-4 text-center">{columnTitles[col]}</h2>
              <div className="space-y-3">
                {leads.filter(l => l.status === col).map((lead) => (
                  <div key={lead.id} className="bg-blue-50 p-3 rounded border-l-4 border-blue-500">
                    <p className="font-bold text-sm">{lead.name}</p>
                    <p className="text-xs text-gray-600">{lead.city}</p>
                    <select
                      value={lead.status}
                      onChange={(e) => updateStatus(lead.id, e.target.value)}
                      className="w-full mt-2 px-2 py-1 text-xs border rounded"
                    >
                      {columns.map(c => <option key={c} value={c}>{columnTitles[c]}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {leads.length === 0 && (
          <div className="text-center text-gray-600 mt-12">
            <p className="text-xl">No leads yet. Go to Scanner and add some! 👇</p>
            <Link href="/scan" className="text-blue-500 underline mt-4 inline-block">
              Go to Scanner
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}