"use client";

import { Activity, Database, MessageSquare, Zap } from "lucide-react";

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">System Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4 text-slate-500 font-medium">
            <Database size={20} className="text-blue-500" /> Total Events
          </div>
          <p className="text-3xl font-bold text-slate-800">12</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4 text-slate-500 font-medium">
            <MessageSquare size={20} className="text-purple-500" /> AI Queries
          </div>
          <p className="text-3xl font-bold text-slate-800">1,248</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4 text-slate-500 font-medium">
            <Zap size={20} className="text-yellow-500" /> Avg Latency
          </div>
          <p className="text-3xl font-bold text-slate-800">1.2s</p>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
          <div className="flex items-center gap-3 mb-4 text-slate-500 font-medium">
            <Activity size={20} className="text-green-500" /> Vector Store
          </div>
          <p className="text-3xl font-bold text-slate-800">Healthy</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mt-8">
        <div className="p-6 border-b border-slate-200">
          <h2 className="text-lg font-bold text-slate-800">Recent RAG Queries</h2>
        </div>
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-600 font-medium text-sm">
            <tr>
              <th className="p-4 py-3">User</th>
              <th className="p-4 py-3">Query</th>
              <th className="p-4 py-3">Intent Route</th>
              <th className="p-4 py-3 text-right">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 text-sm">
            <tr className="hover:bg-slate-50">
              <td className="p-4 text-slate-600">guest</td>
              <td className="p-4 font-medium text-slate-800">"What events are happening today?"</td>
              <td className="p-4"><span className="px-2 py-1 bg-blue-50 text-blue-700 rounded-md">search_events</span></td>
              <td className="p-4 text-right text-slate-500">2 mins ago</td>
            </tr>
            <tr className="hover:bg-slate-50">
              <td className="p-4 text-slate-600">student@nmit.edu</td>
              <td className="p-4 font-medium text-slate-800">"Register me for the Tech Symposium"</td>
              <td className="p-4"><span className="px-2 py-1 bg-purple-50 text-purple-700 rounded-md">register_user</span></td>
              <td className="p-4 text-right text-slate-500">15 mins ago</td>
            </tr>
            <tr className="hover:bg-slate-50">
              <td className="p-4 text-slate-600">guest</td>
              <td className="p-4 font-medium text-slate-800">"Where is the Main Auditorium?"</td>
              <td className="p-4"><span className="px-2 py-1 bg-orange-50 text-orange-700 rounded-md">get_venue</span></td>
              <td className="p-4 text-right text-slate-500">1 hour ago</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
