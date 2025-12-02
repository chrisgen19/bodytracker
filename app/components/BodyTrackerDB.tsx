'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  Plus,
  Scale,
  Utensils,
  Dumbbell,
  TrendingUp,
  TrendingDown,
  Calendar,
  Trash2,
  ChevronRight,
  ChevronLeft,
  Activity,
  X,
  Loader,
  Sparkles,
  Flame,
  User as UserIcon,
  Database
} from 'lucide-react';

// --- Types ---
interface Entry {
  id: string;
  type: 'weight' | 'food' | 'exercise';
  value: number;
  name: string;
  details?: string | null;
  date: string;
  createdAt?: string;
}

interface ChartDataPoint {
  date: string;
  displayDate: string;
  weight: number | null;
  calories: number;
  workout: number;
}

// --- Gemini API Helper ---
const callGemini = async (prompt: string): Promise<string | null> => {
  const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

  if (!apiKey) {
    console.warn("Gemini API key not configured");
    return null;
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      }
    );

    if (!response.ok) throw new Error('Gemini API call failed');

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "Could not generate insight.";
  } catch (error) {
    console.error("AI Error:", error);
    return null;
  }
};

// --- Components ---

// 1. Navigation Bar
const BottomNav = ({ activeTab, setActiveTab, onAdd }: {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onAdd: () => void;
}) => (
  <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-100 px-6 py-3 flex justify-between items-center z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
    <button
      onClick={() => setActiveTab('dashboard')}
      className={`flex flex-col items-center gap-1 ${activeTab === 'dashboard' ? 'text-emerald-600' : 'text-slate-400'}`}
    >
      <Activity size={24} />
      <span className="text-[10px] font-medium">Progress</span>
    </button>

    <button
      onClick={onAdd}
      className="bg-emerald-600 text-white p-4 rounded-full shadow-lg shadow-emerald-200 transform -translate-y-6 hover:scale-105 transition-transform active:scale-95 flex items-center justify-center"
    >
      <Plus size={28} strokeWidth={2.5} />
    </button>

    <button
      onClick={() => setActiveTab('diary')}
      className={`flex flex-col items-center gap-1 ${activeTab === 'diary' ? 'text-emerald-600' : 'text-slate-400'}`}
    >
      <Calendar size={24} />
      <span className="text-[10px] font-medium">History</span>
    </button>
  </div>
);

// 2. Add Entry Modal
const AddModal = ({ isOpen, onClose, onSave, type, setType }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Entry, 'id' | 'createdAt'>) => void;
  type: 'weight' | 'food' | 'exercise';
  setType: (type: 'weight' | 'food' | 'exercise') => void;
}) => {
  const [value, setValue] = useState('');
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isEstimating, setIsEstimating] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ type, value: parseFloat(value) || 0, name, details: details || null, date });
    resetForm();
    onClose();
  };

  const resetForm = () => {
    setValue('');
    setName('');
    setDetails('');
    setIsEstimating(false);
  };

  const handleEstimateCalories = async () => {
    if (!name) return;
    setIsEstimating(true);
    const prompt = `Estimate the calories for a standard serving of "${name}". Return ONLY the number (integer). If unsure, return 0.`;
    const result = await callGemini(prompt);

    if (result) {
      const num = parseInt(result.match(/\d+/)?.[0] || '0');
      if (num > 0) setValue(num.toString());
    }
    setIsEstimating(false);
  };

  const getTypeIcon = (t: string) => {
    switch(t) {
      case 'weight': return <Scale className="w-6 h-6" />;
      case 'food': return <Utensils className="w-6 h-6" />;
      case 'exercise': return <Dumbbell className="w-6 h-6" />;
      default: return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl p-6 animate-slide-up shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-slate-800">New Entry</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">Close</button>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
          {(['weight', 'food', 'exercise'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all capitalize flex items-center justify-center gap-2 ${
                type === t
                  ? 'bg-white text-emerald-600 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {getTypeIcon(t)}
              <span className="hidden sm:inline">{t}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Date
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
          </div>

          {type === 'weight' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                Weight (kg)
              </label>
              <input
                type="number"
                step="0.1"
                required
                placeholder="0.0"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 text-lg font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          )}

          {type !== 'weight' && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                {type === 'food' ? 'Meal Name' : 'Activity Name'}
              </label>
              <input
                type="text"
                required
                placeholder={type === 'food' ? "e.g., Grilled Chicken Salad" : "e.g., 5k Run"}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
              />
            </div>
          )}

          {type !== 'weight' && (
             <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex justify-between">
                <span>{type === 'food' ? 'Calories (approx)' : 'Duration (mins)'}</span>
                {type === 'food' && name.length > 2 && (
                   <button
                     type="button"
                     onClick={handleEstimateCalories}
                     disabled={isEstimating}
                     className="text-emerald-600 flex items-center gap-1 hover:text-emerald-700 transition-colors"
                   >
                     {isEstimating ? <Loader size={12} className="animate-spin" /> : <Sparkles size={12} />}
                     <span className="text-[10px]">Auto-Estimate</span>
                   </button>
                )}
              </label>
              <div className="relative">
                <input
                  type="number"
                  placeholder="0"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Notes (Optional)
            </label>
            <textarea
              rows={2}
              placeholder="Any details..."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all resize-none"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-emerald-200 transition-all active:scale-[0.98] mt-4"
          >
            Save Entry
          </button>
        </form>
      </div>
    </div>
  );
};

// 3. AI Insights Modal
const AIInsightsModal = ({ isOpen, onClose, entries }: {
  isOpen: boolean;
  onClose: () => void;
  entries: Entry[];
}) => {
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState('');

  useEffect(() => {
    if (isOpen && entries.length > 0 && !insight) {
      generateInsight();
    }
  }, [isOpen]);

  const generateInsight = async () => {
    setLoading(true);
    const recentEntries = entries.slice(0, 30).map(e => `${e.date}: ${e.type} - ${e.name || ''} ${e.value} ${e.type === 'weight' ? 'kg' : ''}`).join('\n');

    const prompt = `
      Act as a supportive, expert nutritionist and data analyst.
      Analyze these health logs for patterns:
      ${recentEntries}

      Identify 1 specific reason ("culprit") for any recent weight gain or 1 success factor for weight loss.
      Then provide 2 short, actionable bullet points for improvement.
      Keep the tone encouraging. Use emojis. Max 150 words.
    `;

    const result = await callGemini(prompt);
    setInsight(result || '');
    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl relative animate-scale-up max-h-[85vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
        >
          <X size={24} />
        </button>

        <div className="flex items-center gap-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200">
            <Sparkles size={24} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-800">AI Health Coach</h2>
            <p className="text-xs text-slate-500">Powered by Gemini</p>
          </div>
        </div>

        <div className="min-h-[200px] bg-slate-50 rounded-2xl p-6 border border-slate-100">
          {loading ? (
            <div className="flex flex-col items-center justify-center h-full gap-4 py-8">
              <Loader size={32} className="text-indigo-500 animate-spin" />
              <p className="text-sm text-slate-500 animate-pulse">Analyzing your habits...</p>
            </div>
          ) : (
            <div className="prose prose-sm prose-slate">
              <p className="whitespace-pre-wrap text-slate-700 leading-relaxed">
                {insight || "Not enough data to analyze yet. Log more entries!"}
              </p>
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-xl transition-colors"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

// Dashboard, Diary, and other components continue in next message...
