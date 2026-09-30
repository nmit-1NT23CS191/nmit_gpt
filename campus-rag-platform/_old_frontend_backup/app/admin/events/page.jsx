"use client";

import { useEffect, useState } from "react";
import { Edit, Trash2 } from "lucide-react";

export default function AdminEventsPage() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await fetch("http://localhost:8000/api/events");
      const data = await res.json();
      setEvents(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to delete this event?")) return;
    
    // Optimistic UI update
    setEvents(events.filter(e => e.id !== id));
    
    try {
      // Mock delete endpoint
      await fetch(`http://localhost:8000/api/events/${id}`, { method: "DELETE" });
    } catch (err) {
      console.error(err);
      fetchEvents(); // revert on failure
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-slate-800">Manage Events</h1>
        <a href="/admin/upload" className="bg-slate-900 text-white px-4 py-2 rounded-md hover:bg-slate-800 transition-colors text-sm font-medium">
          + Add Event
        </a>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-medium text-sm">
            <tr>
              <th className="p-4 py-3">Title</th>
              <th className="p-4 py-3">Date</th>
              <th className="p-4 py-3">Venue</th>
              <th className="p-4 py-3">Status</th>
              <th className="p-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {loading ? (
              <tr><td colSpan="5" className="p-4 text-center text-slate-500">Loading events...</td></tr>
            ) : events.length === 0 ? (
              <tr><td colSpan="5" className="p-4 text-center text-slate-500">No events found.</td></tr>
            ) : (
              events.map((evt) => (
                <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-800">{evt.title}</td>
                  <td className="p-4 text-slate-600">{evt.date}</td>
                  <td className="p-4 text-slate-600">{evt.venue}</td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full border border-green-200 font-medium">
                      Published
                    </span>
                  </td>
                  <td className="p-4 text-right space-x-3">
                    <button className="text-blue-600 hover:text-blue-800 transition-colors">
                      <Edit size={18} />
                    </button>
                    <button onClick={() => handleDelete(evt.id)} className="text-red-600 hover:text-red-800 transition-colors">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
