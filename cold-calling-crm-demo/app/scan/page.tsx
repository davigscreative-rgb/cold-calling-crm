'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function ScanPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const mockLeads = [
    { id: 1, name: 'John\'s Barbershop', city: 'Houston', rating: 4.5, reviews: 120, hasWebsite: false, score: 95 },
    { id: 2, name: 'Tech Solutions', city: 'Austin', rating: 4.8, reviews: 85, hasWebsite: false, score: 90 },
    { id: 3, name: 'Local Plumbing', city: 'Dallas', rating: 4.2, reviews: 45, hasWebsite: false, score: 85 },
    { id: 4, name: 'Beauty Salon Pro', city: 'Houston', rating: 4.6, reviews: 200, hasWebsite: false, score: 88 },
    { id: 5, name: 'Fast Repairs', city: 'San Antonio', rating: 4.3, reviews: 60, hasWebsite: false, score: 82 },
  ];

  const handleScan = () => {
    setLoading(true);
    setTimeout(() => {
      setLeads(mockLeads);
      setLoading(false);
    }, 2000);
  };

  const addToPipeline = (lead: any) => {
    const pipeline = JSON.parse(localStorage.getItem('pipeline') || '[]');
    pipeline.push({ ...lead, status: 'new' });
    localStorage.setItem('pipeline', JSON.stringify(pipeline));
    alert('✅ Lead added to pipeline!');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800">📊 Lead Scanner</h1>
          <Link href="/" className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
            Home
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6 mb-8">
          <button
            onClick={handleScan}
            disabled={loading}
            className="px-6 py-3 bg-green-500 text-white rounded-lg hover:bg-green-600 disabled:bg-gray-400 font-bold"
          >
            {loading ? '⏳ Scanning...' : '🔍 Scan for Leads'}
          </button>
        </div>

        <div className="grid gap-4">
          {leads.map((lead) => (
            <div key={lead.id} className="bg-white rounded-lg shadow p-6 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold">{lead.name}</h3>
                <p className="text-gray-600">{lead.city} • ⭐ {lead.rating} ({lead.reviews} reviews)</p>
                <p className="text-sm mt-2">Website: {lead.hasWebsite ? '✅' : '❌'} | Score: {lead.score}</p>
              </div>
              <button
                onClick={() => addToPipeline(lead)}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-bold"
              >
                Add to Pipeline
              </button>
            </div>
          ))}
        </div>

        {leads.length === 0 && !loading && (
          <div className="text-center text-gray-600 mt-12">
            <p className="text-xl">Click "Scan for Leads" to find businesses</p>
          </div>
        )}
      </div>
    </div>
  );
}