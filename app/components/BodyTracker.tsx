'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Database,
  LogOut,
  Edit
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  onAuthStateChanged,
  signOut,
  type Auth,
  type User
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  where,
  orderBy,
  getDocs,
  updateDoc,
  type Firestore,
  type Timestamp as FirestoreTimestamp
} from 'firebase/firestore';

// --- Types ---
interface Entry {
  id: string;
  type: 'weight' | 'food' | 'exercise';
  value: number;
  name: string;
  details?: string;
  date: string;
  timestamp?: {
    toMillis: () => number;
  };
}

interface ChartDataPoint {
  date: string;
  displayDate: string;
  weight: number | null;
  calories: number;
  workout: number;
}

// --- Firebase Configuration & Initialization ---
// Check if Firebase credentials are configured
const isFirebaseConfigured = () => {
  return !!(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY !== "YOUR_API_KEY" &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
};

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || ""
};

let app: any;
let auth: Auth;
let db: Firestore;
const FIREBASE_ENABLED = isFirebaseConfigured();

if (typeof window !== 'undefined' && FIREBASE_ENABLED) {
  try {
    app = initializeApp(firebaseConfig);
    auth = getAuth(app);

    // Initialize Firestore with modern persistent cache (supports multiple tabs)
    db = initializeFirestore(app, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager()
      })
    });
  } catch (error) {
    console.warn('Firebase initialization failed:', error);
  }
}

const appId = 'health-tracker-v1';

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
const AddModal = ({ isOpen, onClose, onSave, type, setType, editEntry }: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Omit<Entry, 'id' | 'timestamp'>) => void;
  type: 'weight' | 'food' | 'exercise';
  setType: (type: 'weight' | 'food' | 'exercise') => void;
  editEntry?: Entry | null;
}) => {
  const [value, setValue] = useState('');
  const [name, setName] = useState('');
  const [details, setDetails] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isEstimating, setIsEstimating] = useState(false);

  const resetForm = () => {
    setValue('');
    setName('');
    setDetails('');
    setDate(new Date().toISOString().split('T')[0]);
    setIsEstimating(false);
  };

  // Pre-fill form when editing
  useEffect(() => {
    if (editEntry) {
      setValue(editEntry.value.toString());
      setName(editEntry.name || '');
      setDetails(editEntry.details || '');
      setDate(editEntry.date);
      setType(editEntry.type);
    } else {
      resetForm();
    }
  }, [editEntry, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ type, value: parseFloat(value) || 0, name, details: details || '', date });
    resetForm();
    onClose();
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
          <h2 className="text-xl font-bold text-slate-800">{editEntry ? 'Edit Entry' : 'New Entry'}</h2>
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
            {editEntry ? 'Update Entry' : 'Save Entry'}
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

// 4. Main Dashboard View
const Dashboard = ({ entries, onLoadDemo, onShowAI }: {
  entries: Entry[];
  onLoadDemo: () => void;
  onShowAI: () => void;
}) => {
  const [activeMetrics, setActiveMetrics] = useState(['weight']);
  const [timeView, setTimeView] = useState('1M');
  const [viewDate, setViewDate] = useState(new Date());

  const toggleMetric = (metric: string) => {
    if (activeMetrics.includes(metric)) {
      if (activeMetrics.length > 1) {
        setActiveMetrics(activeMetrics.filter(m => m !== metric));
      }
    } else {
      setActiveMetrics([...activeMetrics, metric]);
    }
  };

  const navigateTime = (direction: number) => {
    const newDate = new Date(viewDate);
    if (timeView === '1W') {
      newDate.setDate(newDate.getDate() + (direction * 7));
    } else if (timeView === '1M') {
      newDate.setMonth(newDate.getMonth() + direction);
    } else if (timeView === '1Y') {
      newDate.setFullYear(newDate.getFullYear() + direction);
    }
    setViewDate(newDate);
  };

  const getDateRangeLabel = () => {
    if (timeView === 'ALL') return 'All Time';

    if (timeView === '1W') {
      const start = new Date(viewDate);
      const day = start.getDay();
      start.setDate(start.getDate() - day);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return `${start.toLocaleDateString(undefined, {month:'short', day:'numeric'})} - ${end.toLocaleDateString(undefined, {month:'short', day:'numeric'})}`;
    }

    if (timeView === '1M') {
      return viewDate.toLocaleDateString(undefined, {month:'long', year:'numeric'});
    }

    if (timeView === '1Y') {
      return viewDate.getFullYear().toString();
    }
  };

  const chartData = useMemo(() => {
    const dailyData: Record<string, ChartDataPoint> = {};

    let startBound = new Date(0);
    let endBound = new Date(8640000000000000);

    if (timeView !== 'ALL') {
      const current = new Date(viewDate);
      if (timeView === '1W') {
        const day = current.getDay();
        const start = new Date(current);
        start.setDate(current.getDate() - day);
        start.setHours(0,0,0,0);

        const end = new Date(start);
        end.setDate(end.getDate() + 6);
        end.setHours(23,59,59,999);

        startBound = start;
        endBound = end;
      } else if (timeView === '1M') {
        startBound = new Date(current.getFullYear(), current.getMonth(), 1);
        endBound = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
      } else if (timeView === '1Y') {
        startBound = new Date(current.getFullYear(), 0, 1);
        endBound = new Date(current.getFullYear(), 11, 31, 23, 59, 59);
      }
    }

    entries.forEach(entry => {
      const entryDate = new Date(entry.date + 'T00:00:00');

      if (entryDate >= startBound && entryDate <= endBound) {
        const d = entry.date;
        if (!dailyData[d]) {
          dailyData[d] = { date: d, displayDate: '', weight: null, calories: 0, workout: 0 };
        }

        if (entry.type === 'weight') dailyData[d].weight = entry.value;
        if (entry.type === 'food') dailyData[d].calories += entry.value;
        if (entry.type === 'exercise') dailyData[d].workout += entry.value;
      }
    });

    return Object.values(dailyData)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
      .map(d => ({
        ...d,
        displayDate: timeView === '1Y'
          ? new Date(d.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
          : new Date(d.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric' })
      }));
  }, [entries, timeView, viewDate]);

  const weightEntries = entries.filter(e => e.type === 'weight').sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  const currentWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].value : 0;
  const startWeight = weightEntries.length > 0 ? weightEntries[0].value : 0;
  const change = currentWeight - startWeight;

  const today = new Date().toISOString().split('T')[0];
  const todaysFood = entries.filter(e => e.type === 'food' && e.date === today);
  const todaysCalories = todaysFood.reduce((acc, curr) => acc + (curr.value || 0), 0);

  return (
    <div className="pb-24 space-y-6 animate-fade-in">
      <div className="bg-emerald-600 text-white rounded-3xl p-6 shadow-xl shadow-emerald-200 mx-1 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <Scale size={120} />
        </div>
        <div className="relative z-10">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-emerald-100 text-sm font-medium mb-1">Current Weight</p>
              <div className="flex items-baseline gap-2">
                <h1 className="text-4xl font-bold">{currentWeight > 0 ? currentWeight : '--'}</h1>
                <span className="text-lg opacity-80">kg</span>
              </div>
            </div>
            {entries.length > 0 && (
              <button
                onClick={onShowAI}
                className="bg-white/20 backdrop-blur-md hover:bg-white/30 transition-colors text-white px-3 py-2 rounded-xl flex items-center gap-2 text-xs font-semibold shadow-sm"
              >
                <Sparkles size={14} />
                <span>AI Coach</span>
              </button>
            )}
          </div>

          <div className="mt-4 flex gap-4">
            <div className="bg-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
              <p className="text-xs text-emerald-100">Total Change</p>
              <div className="flex items-center gap-1">
                {change > 0 ? <TrendingUp size={14} /> : change < 0 ? <TrendingDown size={14} /> : <span className="font-bold">-</span>}
                <span className="font-semibold">{Math.abs(change).toFixed(1)} kg</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-xl px-3 py-2 backdrop-blur-sm">
              <p className="text-xs text-emerald-100">Today&apos;s Cals</p>
              <div className="flex items-center gap-1">
                <Utensils size={14} />
                <span className="font-semibold">{todaysCalories}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mx-1">
        <div className="flex flex-col gap-4 mb-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Activity className="text-emerald-500" size={20} />
              Trend
            </h3>
            {entries.length === 0 && (
              <button
                onClick={onLoadDemo}
                className="text-emerald-600 text-xs font-semibold bg-emerald-50 px-2 py-1 rounded-lg hover:bg-emerald-100 transition-colors"
              >
                Load Demo Data
              </button>
            )}
          </div>

          <div className="flex items-center justify-between bg-slate-50 p-1 rounded-xl">
             <div className="flex gap-1">
                {['1W', '1M', '1Y', 'ALL'].map(t => (
                  <button
                    key={t}
                    onClick={() => setTimeView(t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      timeView === t
                        ? 'bg-white text-emerald-600 shadow-sm'
                        : 'text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    {t}
                  </button>
                ))}
             </div>

             {timeView !== 'ALL' && (
                <div className="flex items-center gap-2 pl-2 border-l border-slate-200 ml-2">
                  <button onClick={() => navigateTime(-1)} className="p-1 hover:bg-white rounded-md text-slate-500 hover:text-emerald-600 transition-colors">
                    <ChevronLeft size={16} />
                  </button>
                  <span className="text-xs font-bold text-slate-700 w-24 text-center whitespace-nowrap">
                    {getDateRangeLabel()}
                  </span>
                  <button onClick={() => navigateTime(1)} className="p-1 hover:bg-white rounded-md text-slate-500 hover:text-emerald-600 transition-colors">
                    <ChevronRight size={16} />
                  </button>
                </div>
             )}
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => toggleMetric('weight')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                activeMetrics.includes('weight')
                  ? 'bg-emerald-100 border-emerald-200 text-emerald-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeMetrics.includes('weight') ? 'bg-emerald-500' : 'bg-slate-300'}`} />
              Weight
            </button>

            <button
              onClick={() => toggleMetric('calories')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                activeMetrics.includes('calories')
                  ? 'bg-orange-100 border-orange-200 text-orange-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
               <div className={`w-2 h-2 rounded-full ${activeMetrics.includes('calories') ? 'bg-orange-500' : 'bg-slate-300'}`} />
               Calories
            </button>

            <button
              onClick={() => toggleMetric('workout')}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all border flex items-center gap-1.5 ${
                activeMetrics.includes('workout')
                  ? 'bg-purple-100 border-purple-200 text-purple-700'
                  : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${activeMetrics.includes('workout') ? 'bg-purple-500' : 'bg-slate-300'}`} />
              Workout
            </button>
          </div>
        </div>

        <div className="h-64 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="displayDate"
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#94a3b8', fontSize: 10}}
                  dy={10}
                  interval="preserveStartEnd"
                />

                <YAxis
                  yAxisId="weight"
                  domain={['dataMin - 1', 'dataMax + 1']}
                  hide={!activeMetrics.includes('weight')}
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#059669', fontSize: 12}}
                  width={30}
                />

                <YAxis
                  yAxisId="calories"
                  orientation="right"
                  hide={!activeMetrics.includes('calories')}
                  axisLine={false}
                  tickLine={false}
                  tick={{fill: '#f97316', fontSize: 10}}
                  width={30}
                />

                <YAxis
                   yAxisId="workout"
                   orientation="right"
                   hide={true}
                   domain={[0, 'dataMax + 20']}
                />

                <Tooltip
                  contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}}
                />

                {activeMetrics.includes('weight') && (
                  <Line
                    yAxisId="weight"
                    type="monotone"
                    dataKey="weight"
                    stroke="#059669"
                    strokeWidth={3}
                    connectNulls
                    dot={{fill: '#059669', strokeWidth: 2, r: 4, stroke: '#fff'}}
                    activeDot={{r: 6, strokeWidth: 0}}
                    name="Weight (kg)"
                  />
                )}

                {activeMetrics.includes('calories') && (
                  <Line
                    yAxisId="calories"
                    type="monotone"
                    dataKey="calories"
                    stroke="#f97316"
                    strokeWidth={2}
                    dot={false}
                    name="Calories"
                  />
                )}

                {activeMetrics.includes('workout') && (
                  <Line
                    yAxisId="workout"
                    type="monotone"
                    dataKey="workout"
                    stroke="#a855f7"
                    strokeWidth={2}
                    dot={false}
                    name="Workout (min)"
                  />
                )}

              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-400">
              <Scale size={48} className="mb-2 opacity-50" />
              <p className="text-sm">No data for this period</p>
            </div>
          )}
        </div>
      </div>

      <div className="px-2">
        <h3 className="text-lg font-bold text-slate-800 mb-3 px-2">Recent Logs</h3>
        <div className="space-y-3">
          {entries.length > 0 ? entries.slice(0, 5).map(entry => (
            <RecentEntryRow key={entry.id} entry={entry} readonly />
          )) : (
            <p className="text-slate-400 text-sm px-2">No recent activity.</p>
          )}
        </div>
      </div>
    </div>
  );
};

// 5. Diary View (History Page)
const Diary = ({ entries, onDelete, onLoadDemo, onEdit }: {
  entries: Entry[];
  onDelete: (id: string) => void;
  onLoadDemo: () => void;
  onEdit?: (entry: Entry) => void;
}) => {
  const groupedEntries = useMemo(() => {
    const groups: Record<string, Entry[]> = {};
    entries.forEach(entry => {
      if (!groups[entry.date]) groups[entry.date] = [];
      groups[entry.date].push(entry);
    });
    return Object.keys(groups).sort((a, b) => new Date(b).getTime() - new Date(a).getTime()).map(date => ({
      date,
      items: groups[date]
    }));
  }, [entries]);

  return (
    <div className="pb-24 animate-fade-in px-1">
      <div className="flex items-center justify-between mb-6 px-2">
        <h2 className="text-2xl font-bold text-slate-800">History Log</h2>
        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{entries.length} Entries</span>
      </div>

      <div className="space-y-4">
        {groupedEntries.length === 0 ? (
           <div className="text-center py-20 flex flex-col items-center">
             <div className="bg-slate-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-4">
               <Calendar className="text-slate-300" size={40} />
             </div>
             <p className="text-slate-500 mb-6">No logs yet. Start tracking!</p>
             <button
               onClick={onLoadDemo}
               className="flex items-center gap-2 bg-white border border-slate-200 text-slate-600 font-semibold py-2 px-4 rounded-xl hover:bg-slate-50 hover:text-emerald-600 transition-colors shadow-sm"
             >
               <Database size={16} />
               Load Demo Data
             </button>
           </div>
        ) : (
          groupedEntries.map(group => (
            <DayHistoryCard
              key={group.date}
              date={group.date}
              entries={group.items}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))
        )}
      </div>
    </div>
  );
};

const SwipeableEntry = ({ entry, onDelete, onEdit }: {
  entry: Entry;
  onDelete: (id: string) => void;
  onEdit?: (entry: Entry) => void;
}) => {
  const [swipeX, setSwipeX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startX = useRef(0);

  const EDIT_THRESHOLD = -80;  // Mid swipe shows edit
  const DELETE_THRESHOLD = -160; // Further swipe shows delete
  const MAX_SWIPE = -200; // Maximum swipe distance

  // Touch handlers for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    setIsDragging(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return;
    const currentX = e.touches[0].clientX;
    const diff = currentX - startX.current;
    // Only allow left swipe (negative values)
    if (diff < 0) {
      setSwipeX(Math.max(diff, MAX_SWIPE));
    }
  };

  const handleTouchEnd = () => {
    setIsDragging(false);
    // Trigger action based on swipe distance
    if (swipeX <= DELETE_THRESHOLD) {
      // Full swipe - delete
      handleDelete();
    } else if (swipeX <= EDIT_THRESHOLD) {
      // Mid swipe - edit
      handleEdit();
    } else {
      // Light swipe - reset
      setSwipeX(0);
    }
  };

  // Mouse handlers for desktop
  const handleMouseDown = (e: React.MouseEvent) => {
    startX.current = e.clientX;
    setIsDragging(true);
    e.preventDefault(); // Prevent text selection
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging) return;
    const currentX = e.clientX;
    const diff = currentX - startX.current;
    // Only allow left drag (negative values)
    if (diff < 0) {
      setSwipeX(Math.max(diff, MAX_SWIPE));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
    // Trigger action based on drag distance
    if (swipeX <= DELETE_THRESHOLD) {
      // Full drag - delete
      handleDelete();
    } else if (swipeX <= EDIT_THRESHOLD) {
      // Mid drag - edit
      handleEdit();
    } else {
      // Light drag - reset
      setSwipeX(0);
    }
  };

  const handleMouseLeave = () => {
    if (isDragging) {
      handleMouseUp();
    }
  };

  const handleDelete = () => {
    onDelete(entry.id);
    setSwipeX(0);
  };

  const handleEdit = () => {
    if (onEdit) {
      onEdit(entry);
      setSwipeX(0);
    }
  };

  return (
    <div className="relative overflow-hidden">
      {/* Action indicators background - stacked in order */}
      <div className="absolute right-0 top-0 bottom-0 flex items-center gap-2 pr-2 pointer-events-none">
        {/* Edit indicator - appears first at mid swipe */}
        {onEdit && (
          <div
            className="bg-blue-500 text-white p-3 rounded-xl shadow-lg flex items-center justify-center transition-all"
            style={{
              opacity: swipeX <= EDIT_THRESHOLD ? 1 : Math.max(0, Math.abs(swipeX) / Math.abs(EDIT_THRESHOLD)),
              transform: swipeX <= DELETE_THRESHOLD ? 'translateX(0)' : 'translateX(20px)'
            }}
          >
            <Edit size={18} />
          </div>
        )}
        {/* Delete indicator - appears at further swipe */}
        <div
          className="bg-red-500 text-white p-3 rounded-xl shadow-lg flex items-center justify-center transition-all"
          style={{
            opacity: swipeX <= DELETE_THRESHOLD ? 1 : 0,
            transform: swipeX <= DELETE_THRESHOLD ? 'translateX(0)' : 'translateX(40px)'
          }}
        >
          <Trash2 size={18} />
        </div>
      </div>

      {/* Swipeable/Draggable content */}
      <div
        className="flex items-start gap-4 bg-white relative z-10 transition-transform cursor-grab active:cursor-grabbing"
        style={{
          transform: `translateX(${swipeX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s ease-out',
          userSelect: 'none'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        <div className="mt-0.5 relative z-10 pl-1">
          {entry.type === 'weight' && <Scale size={18} className="text-blue-500" strokeWidth={2} />}
          {entry.type === 'food' && <Utensils size={18} className="text-orange-500" strokeWidth={2} />}
          {entry.type === 'exercise' && <Dumbbell size={18} className="text-purple-500" strokeWidth={2} />}
        </div>

        <div className="flex-1 min-w-0 py-1">
          <p className="text-slate-700 font-semibold text-sm leading-snug">
            {entry.type === 'weight' ? 'Weight check' : entry.name}
          </p>

          <div className="flex flex-wrap items-center gap-2 mt-1">
            {entry.type === 'food' && (
              <span className="text-xs font-medium text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md">
                {entry.value} kcal
              </span>
            )}
            {entry.type === 'exercise' && (
              <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded-md">
                {entry.value} mins
              </span>
            )}
            {entry.details && (
              <span className="text-xs text-slate-400 truncate max-w-full">
                {entry.details}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const DayHistoryCard = ({ date, entries, onDelete, onEdit }: {
  date: string;
  entries: Entry[];
  onDelete: (id: string) => void;
  onEdit?: (entry: Entry) => void;
}) => {
  const weightEntry = entries.find(e => e.type === 'weight');
  const displayWeight = weightEntry ? weightEntry.value : null;

  const totalCalories = entries
    .filter(e => e.type === 'food')
    .reduce((acc, curr) => acc + (curr.value || 0), 0);

  const totalExercise = entries
    .filter(e => e.type === 'exercise')
    .reduce((acc, curr) => acc + (curr.value || 0), 0);

  return (
    <div className="bg-white rounded-3xl p-5 shadow-[0_2px_12px_-4px_rgba(0,0,0,0.08)] border border-slate-100 overflow-hidden">
      <div className="mb-4 pb-3 border-b border-slate-50">
        <div className="flex justify-between items-center mb-3">
          <h3 className="text-lg font-bold text-slate-800">
            {new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
          </h3>
          {displayWeight && (
            <div className="bg-blue-50 text-blue-600 px-3 py-1 rounded-xl font-bold text-sm shadow-sm border border-blue-100 flex items-center gap-1">
              <Scale size={14} />
              {displayWeight} kg
            </div>
          )}
        </div>

        {(totalCalories > 0 || totalExercise > 0) && (
          <div className="flex gap-3 text-xs font-medium">
             {totalCalories > 0 && (
                <div className="flex items-center gap-1.5 text-orange-600 bg-orange-50 px-2 py-1 rounded-lg">
                  <Utensils size={12} />
                  <span>{totalCalories} kcal In</span>
                </div>
             )}
             {totalExercise > 0 && (
                <div className="flex items-center gap-1.5 text-purple-600 bg-purple-50 px-2 py-1 rounded-lg">
                  <Flame size={12} />
                  <span>{totalExercise} mins Active</span>
                </div>
             )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {entries.map(entry => (
          <SwipeableEntry key={entry.id} entry={entry} onDelete={onDelete} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
};

const RecentEntryRow = ({ entry, readonly = false }: {
  entry: Entry;
  readonly?: boolean;
}) => {
  const getIcon = () => {
    switch (entry.type) {
      case 'weight': return <Scale className="text-white" size={16} />;
      case 'food': return <Utensils className="text-white" size={16} />;
      case 'exercise': return <Dumbbell className="text-white" size={16} />;
      default: return null;
    }
  };

  const getColor = () => {
    switch (entry.type) {
      case 'weight': return 'bg-blue-500';
      case 'food': return 'bg-orange-400';
      case 'exercise': return 'bg-purple-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="bg-white p-3 rounded-xl shadow-sm border border-slate-100 flex items-center justify-between group">
      <div className="flex items-center gap-3">
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shadow-sm ${getColor()}`}>
          {getIcon()}
        </div>
        <div>
          <p className="font-bold text-slate-800 text-xs">
            {entry.type === 'weight' ? 'Weight Log' : entry.name}
          </p>
          <div className="flex items-center gap-2 text-[10px] text-slate-500">
             <span>{new Date(entry.date).toLocaleDateString(undefined, {month:'short', day:'numeric'})}</span>
             <span>•</span>
            {entry.type === 'weight' && <span>{entry.value} kg</span>}
            {entry.type === 'food' && <span>{entry.value} kcal</span>}
            {entry.type === 'exercise' && <span>{entry.value} mins</span>}
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App Component ---
export default function BodyTracker() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'weight' | 'food' | 'exercise'>('weight');
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [deletedEntry, setDeletedEntry] = useState<{entry: Entry, timeoutId: NodeJS.Timeout} | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (deletedEntry) {
        clearTimeout(deletedEntry.timeoutId);
      }
    };
  }, [deletedEntry]);

  // Firebase authentication and data loading
  useEffect(() => {
    if (!FIREBASE_ENABLED || typeof window === 'undefined') {
      setLoading(false);
      return;
    }

    // Listen to auth state
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);

      // Redirect to login if not authenticated
      if (!currentUser && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
    });

    return () => unsubscribeAuth();
  }, []);

  // Real-time listener for entries from Firebase with optimized caching
  useEffect(() => {
    if (!user || !FIREBASE_ENABLED || typeof window === 'undefined') return;

    const entriesRef = collection(db, `users/${user.uid}/entries`);
    const q = query(entriesRef);

    const unsubscribe = onSnapshot(q,
      {
        // Include metadata to track cache vs server
        includeMetadataChanges: true
      },
      (snapshot) => {
        // Check if data is from cache or server
        const source = snapshot.metadata.fromCache ? 'cache' : 'server';

        // Track what changed (for bandwidth monitoring)
        const changes = snapshot.docChanges();
        const changedDocs = changes.length;

        // Process data from both cache and server
        // Skip only intermediate cache updates (not the initial cache load)
        if (!snapshot.metadata.fromCache || !snapshot.metadata.hasPendingWrites || entries.length === 0) {
          const fetchedEntries: Entry[] = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
              id: doc.id,
              type: data.type,
              value: data.value,
              name: data.name || '',
              details: data.details || '',
              date: data.date,
              timestamp: data.timestamp
            };
          });

          // Sort by date descending, then by timestamp
          fetchedEntries.sort((a, b) => {
            const dateCompare = b.date.localeCompare(a.date);
            if (dateCompare !== 0) return dateCompare;
            const aTime = a.timestamp?.toMillis() || 0;
            const bTime = b.timestamp?.toMillis() || 0;
            return bTime - aTime;
          });

          setEntries(fetchedEntries);

          // Enhanced logging to show bandwidth optimization
          if (source === 'server') {
            console.log(`📊 Data synced from ${source} (${fetchedEntries.length} total, ${changedDocs} changed) - Bandwidth optimized!`);
          } else {
            console.log(`📊 Data loaded from ${source} (${fetchedEntries.length} entries) - No bandwidth used!`);
          }
        }

        // Always stop loading after first snapshot (cache or server)
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching entries:", error);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user]);

  const handleAddEntry = async (entryData: Omit<Entry, 'id' | 'timestamp'>) => {
    if (!user || !FIREBASE_ENABLED || typeof window === 'undefined') return;

    try {
      if (editingEntry) {
        // Update existing entry
        const entryRef = doc(db, `users/${user.uid}/entries`, editingEntry.id);
        await updateDoc(entryRef, {
          ...entryData,
          timestamp: serverTimestamp()
        });
        setEditingEntry(null);
      } else {
        // Add new entry
        const entriesRef = collection(db, `users/${user.uid}/entries`);
        await addDoc(entriesRef, {
          ...entryData,
          timestamp: serverTimestamp()
        });
      }
    } catch (error) {
      console.error("Error saving entry:", error);
    }
  };

  const handleDeleteEntry = async (id: string) => {
    if (!user || !FIREBASE_ENABLED || typeof window === 'undefined') return;

    // Find the entry to delete
    const entryToDelete = entries.find(e => e.id === id);
    if (!entryToDelete) return;

    try {
      // Delete from Firebase
      const entryRef = doc(db, `users/${user.uid}/entries`, id);
      await deleteDoc(entryRef);

      // Show undo notification
      const timeoutId = setTimeout(() => {
        setDeletedEntry(null);
      }, 5000); // 5 seconds to undo

      setDeletedEntry({ entry: entryToDelete, timeoutId });
    } catch (error) {
      console.error("Error deleting entry:", error);
    }
  };

  const handleUndoDelete = async () => {
    if (!deletedEntry || !user || !FIREBASE_ENABLED) return;

    // Clear the timeout
    clearTimeout(deletedEntry.timeoutId);

    try {
      // Re-add the entry to Firebase
      const entriesRef = collection(db, `users/${user.uid}/entries`);
      await addDoc(entriesRef, {
        type: deletedEntry.entry.type,
        value: deletedEntry.entry.value,
        name: deletedEntry.entry.name,
        details: deletedEntry.entry.details || '',
        date: deletedEntry.entry.date,
        timestamp: serverTimestamp()
      });

      setDeletedEntry(null);
    } catch (error) {
      console.error("Error restoring entry:", error);
    }
  };

  const handleEditEntry = (entry: Entry) => {
    setEditingEntry(entry);
    setModalType(entry.type);
    setIsModalOpen(true);
  };

  const generateMockData = async () => {
    if (!user || !FIREBASE_ENABLED || typeof window === 'undefined') return;

    const mockEntries = [
      { type: 'weight', value: 75.5, name: '', date: '2024-11-15' },
      { type: 'food', value: 450, name: 'Breakfast Bowl', date: '2024-11-15' },
      { type: 'exercise', value: 30, name: 'Morning Run', date: '2024-11-15' },
      { type: 'weight', value: 75.2, name: '', date: '2024-11-20' },
      { type: 'food', value: 600, name: 'Lunch Salad', date: '2024-11-20' },
      { type: 'exercise', value: 45, name: 'Gym Session', date: '2024-11-20' },
      { type: 'weight', value: 74.8, name: '', date: '2024-11-25' },
      { type: 'food', value: 500, name: 'Grilled Chicken', date: '2024-11-25' },
      { type: 'exercise', value: 60, name: 'Cycling', date: '2024-11-25' },
    ];

    const entriesRef = collection(db, `users/${user.uid}/entries`);
    for (const entry of mockEntries) {
      await addDoc(entriesRef, {
        ...entry,
        details: '',
        timestamp: serverTimestamp()
      });
    }
  };


  const openAddModal = () => {
    setEditingEntry(null);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingEntry(null);
  };

  const handleLogout = async () => {
    if (!FIREBASE_ENABLED || typeof window === 'undefined') return;
    try {
      await signOut(auth);
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="w-16 h-16 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin mb-4"></div>
        <p className="text-slate-500 font-medium">Loading your health data...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 selection:bg-emerald-100">
      <div className="bg-white px-6 pt-4 pb-4 flex justify-between items-center sticky top-0 z-40 border-b border-slate-100">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-teal-500 bg-clip-text text-transparent">
            BodyTracker
          </h1>
          <p className="text-xs text-slate-400">Track, Analyze, Improve</p>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-800 transition-colors text-sm font-medium"
        >
          <UserIcon size={16} />
          <span className="hidden sm:inline">{user?.email?.split('@')[0]}</span>
          <LogOut size={16} />
        </button>
      </div>

      <main className="max-w-md mx-auto p-4 pt-2">
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4 mb-4 flex items-start gap-3">
          <Flame className="text-emerald-600 mt-0.5 flex-shrink-0" size={20} />
          <div>
            <p className="text-sm font-semibold text-emerald-900 mb-1">Secure Firebase Authentication</p>
            <p className="text-xs text-emerald-700 leading-relaxed">
              Your data is protected with Firebase email/password authentication and synced in real-time across all devices.
            </p>
          </div>
        </div>

        {activeTab === 'dashboard' ? (
          <Dashboard entries={entries} onLoadDemo={generateMockData} onShowAI={() => setIsAIModalOpen(true)} />
        ) : (
          <Diary entries={entries} onDelete={handleDeleteEntry} onLoadDemo={generateMockData} onEdit={handleEditEntry} />
        )}
      </main>

      <AddModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={handleAddEntry}
        type={modalType}
        setType={setModalType}
        editEntry={editingEntry}
      />

      <AIInsightsModal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        entries={entries}
      />

      <BottomNav
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onAdd={openAddModal}
      />

      {/* Undo Delete Notification */}
      {deletedEntry && (
        <div className="fixed bottom-20 left-4 right-4 bg-slate-800 text-white px-4 py-3 rounded-2xl shadow-2xl z-[70] flex items-center justify-between animate-slide-up">
          <div className="flex items-center gap-2">
            <Trash2 size={16} />
            <span className="text-sm font-medium">Entry deleted</span>
          </div>
          <button
            onClick={handleUndoDelete}
            className="bg-emerald-500 hover:bg-emerald-600 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors text-sm"
          >
            Undo
          </button>
        </div>
      )}
    </div>
  );
}
