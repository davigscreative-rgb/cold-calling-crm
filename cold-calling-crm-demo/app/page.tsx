'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export default function Home() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const stored = localStorage.getItem('user');
    if (!stored) {
      window.location.href = '/login';
    } else {
      setUser(JSON.parse(stored));
    }
  }, []);

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold text-gray-800">🎯 ColdCRM</h1>
          <button
            onClick={() => {
              localStorage.removeItem('user');
              window.location.href = '/login';
            }}
            className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600"
          >
            Logout
          </button>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-4">Welcome, {user.email}! 👋</h2>
          <p className="text-gray-600 mb-8">Your ColdCRM demo is live! Explore the features below.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Link href="/scan" className="block p-6 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition">
              <div className="text-3xl mb-2">📊</div>
              <h3 className="text-xl font-bold">Scan Leads</h3>
              <p className="text-sm mt-2">Find businesses with no website</p>
            </Link>

            <Link href="/pipeline" className="block p-6 bg-green-500 text-white rounded-lg hover:bg-green-600 transition">
              <div className="text-3xl mb-2">📈</div>
              <h3 className="text-xl font-bold">Pipeline</h3>
              <p className="text-sm mt-2">Manage your leads in Kanban board</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}