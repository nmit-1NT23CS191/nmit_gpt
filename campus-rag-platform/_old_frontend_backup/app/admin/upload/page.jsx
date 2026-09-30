"use client";

import { useState } from "react";
import { UploadCloud, CheckCircle } from "lucide-react";

export default function AdminUploadPage() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [extractedData, setExtractedData] = useState(null);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("http://localhost:8000/api/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      setExtractedData(data); // Display EditModal / form
    } catch (err) {
      console.error(err);
      alert("Failed to extract data. Is the backend running on 8000?");
    } finally {
      setLoading(false);
    }
  };

  const handlePublish = async () => {
    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/api/events/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(extractedData),
      });
      if (res.ok) {
        alert("Event published successfully!");
        setExtractedData(null);
        setFile(null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-800">Advanced OCR Pipeline</h1>
      
      {!extractedData ? (
        <form onSubmit={handleUpload} className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <label className="block mb-4 text-sm font-medium text-slate-700">
            Upload Event Poster (Image/PDF)
          </label>
          <div className="border-2 border-dashed border-slate-300 rounded-lg p-10 flex flex-col items-center justify-center text-slate-500 mb-6 hover:bg-slate-50 transition-colors">
            <UploadCloud size={48} className="mb-4 text-slate-400" />
            <input
              type="file"
              accept="image/*,.pdf"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="block w-full max-w-xs text-sm text-slate-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
            />
          </div>
          <button
            type="submit"
            disabled={!file || loading}
            className="w-full bg-slate-900 text-white px-6 py-3 rounded-md hover:bg-slate-800 disabled:opacity-50 font-medium transition-colors"
          >
            {loading ? "Extracting..." : "Run OCR Extraction"}
          </button>
        </form>
      ) : (
        <div className="bg-white p-8 rounded-xl shadow-sm border border-slate-200">
          <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
            <CheckCircle className="text-green-500" />
            Review & Edit Extracted Data
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Title</label>
              <input 
                type="text" 
                value={extractedData.title || ""} 
                onChange={(e) => setExtractedData({...extractedData, title: e.target.value})}
                className="w-full border border-slate-300 rounded-md p-2.5" 
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Date</label>
                <input 
                  type="text" 
                  value={extractedData.date || ""} 
                  onChange={(e) => setExtractedData({...extractedData, date: e.target.value})}
                  className="w-full border border-slate-300 rounded-md p-2.5" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Time</label>
                <input 
                  type="text" 
                  value={extractedData.time || ""} 
                  onChange={(e) => setExtractedData({...extractedData, time: e.target.value})}
                  className="w-full border border-slate-300 rounded-md p-2.5" 
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Venue</label>
              <input 
                type="text" 
                value={extractedData.venue || ""} 
                onChange={(e) => setExtractedData({...extractedData, venue: e.target.value})}
                className="w-full border border-slate-300 rounded-md p-2.5" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Organizer</label>
              <input 
                type="text" 
                value={extractedData.organizer || ""} 
                onChange={(e) => setExtractedData({...extractedData, organizer: e.target.value})}
                className="w-full border border-slate-300 rounded-md p-2.5" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Description</label>
              <textarea 
                value={extractedData.description || ""} 
                onChange={(e) => setExtractedData({...extractedData, description: e.target.value})}
                className="w-full border border-slate-300 rounded-md p-2.5 h-32" 
              />
            </div>
          </div>
          
          <div className="mt-8 flex gap-4">
            <button
              onClick={handlePublish}
              disabled={loading}
              className="flex-1 bg-green-600 text-white px-6 py-3 rounded-md hover:bg-green-700 disabled:opacity-50 font-medium transition-colors"
            >
              {loading ? "Publishing..." : "Approve & Publish"}
            </button>
            <button
              onClick={() => setExtractedData(null)}
              className="px-6 py-3 border border-slate-300 text-slate-700 rounded-md hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
