import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, BarChart3, Zap, Users, Globe, FileText, TrendingUp, Target, 
  Layers, Info, ChevronRight, Database, Cpu, CheckCircle2, AlertCircle,
  ShieldCheck, Briefcase, Network, Microscope, Loader2, BarChart4,
  ExternalLink, Building2, LayoutDashboard, Sparkles, Download,
  History, Trash2, ArrowUpRight, Compass, Lightbulb
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAnalytics } from "firebase/analytics";
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';

// --- CONFIGURATION ---
const firebaseConfig = {
  apiKey: "AIzaSyAYU9MyhYlOc5wRyFtNW7juFN7p6ubKiik",
  authDomain: "insight-b2e2e.firebaseapp.com",
  projectId: "insight-b2e2e",
  storageBucket: "insight-b2e2e.firebasestorage.app",
  messagingSenderId: "1062762901329",
  appId: "1:1062762901329:web:093cb5783992b143b46d70",
  measurementId: "G-7NY64YNR1K"
};

// Initialisation Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);
const db = getFirestore(app);

// Gestion sécurisée de la clé IA pour le déploiement Web
const apiKey = process.env.REACT_APP_GEMINI_API_KEY || ""; 

const App = () => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState('');
  const [angle, setAngle] = useState('Anaplan'); 
  const [loading, setLoading] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('audit');
  const [benchmark, setBenchmark] = useState(null);

  const ensureString = (val, fallback = "N/A") => {
    if (typeof val === 'string') return val;
    if (typeof val === 'number') return String(val);
    return fallback;
  };

  const criteriaConfig = useMemo(() => ({
    Y: [
      { id: 'maturity', label: 'Maturité', icon: Layers, desc: "Usage et structure CoE." },
      { id: 'tech', label: 'Intensité Tech', icon: Cpu, desc: "Complexité modèles/flux." },
      { id: 'momentum', label: 'Momentum', icon: Zap, desc: "Actualité stratégique." },
      { id: 'ecosystem', label: 'Écosystème', icon: Network, desc: "Synergie stack technique." }
    ],
    X: [
      { id: 'footprint', label: 'Empreinte Amaris', icon: Briefcase, desc: "Légitimité sectorielle." },
      { id: 'politics', label: 'Agilité Politique', icon: ShieldCheck, desc: "Vitesse de décision." },
      { id: 'affinity', label: 'Affinité', icon: Users, desc: "Accès réseau décideurs." },
      { id: 'lock', label: 'Verrou Concurrentiel', icon: AlertCircle, desc: "Saturation GSI concurrents." }
    ]
  }), []);

  const exportToCSV = () => {
    if (!result) return;
    const headers = [
      "Compte", "Selection", "CA WW 2024", "CA UNIT", "Score Maturité", "Score Verrou", 
      "Score Comp tech", "Score Empreinte", "Score Momentum", "Score Ecosysteme", 
      "Score Agilite_Pol", "Score Affinite_Rel", "Score Total", "X Accessibilité", 
      "Y Valeur", "Volume d'affaire estimé", "Angle Stratégique", "Action Marketing Ciblée", 
      "Relais Amais Directeur", "Relais Amais - Senior Manager", "Relais Amais - Manager", 
      "Contact client", "Poste", "E-mail (déduit)", "Concurrents en place", 
      "Explication_maturité", "Explication du Verrou", "Explication complication Technique", 
      "Explication de la Présence (Empreinte)", "Explication du Momentum (Timing 2025)", 
      "Explication_Ecosysteme", "Explication de la Complexité Politique", 
      "Explication_Affinite", "Observation", "Status", "t"
    ];
    const s = result.scores || {};
    const o = result.observations || {};
    const row = [
      result.company, "Target", result.caMondial, "Mds€", s.maturity, s.lock, s.tech, s.footprint, s.momentum, s.ecosystem, s.politics, s.affinity, result.totalScore, result.axeX, result.axeY, "850000", result.angleStrategique, result.actionMarketing, "", "Maxime PAQUET", "Julie SAZERAT", "", "", "", result.concurrents || "GSI", o.maturity, o.lock, o.tech, o.footprint, o.momentum, o.ecosystem, o.politics, o.affinity, "InSight Generated", "Active", new Date().toLocaleDateString()
    ];
    const csvContent = "\ufeff" + [headers.join(","), row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `InSight_Audit_${result.company}.csv`;
    link.click();
  };

  useEffect(() => {
    const initAuth = async () => {
      try {
        await signInAnonymously(auth);
      } catch (err) { console.error("Auth Failure", err); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const auditsRef = collection(db, 'audits');
    const unsubscribe = onSnapshot(auditsRef, (snap) => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const callGemini = async (prompt, systemPrompt, schema = null) => {
    // Note : On utilise le modèle stable 1.5-flash pour le déploiement web
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const delays = [1000, 2000, 4000];
    const payload = {
      contents: [{ parts: [{ text: prompt }] }],
      systemInstruction: { parts: [{ text: systemPrompt }] }
    };
    if (schema) payload.generationConfig = { responseMimeType: "application/json", responseSchema: schema };
    else payload.tools = [{ "google_search": {} }];

    for (let i = 0; i < delays.length; i++) {
      try {
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
        if (response.ok) {
          const data = await response.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
          return schema ? JSON.parse(text) : text;
        }
        await new Promise(r => setTimeout(r, delays[i]));
      } catch (err) { if (i === delays.length - 1) throw err; }
    }
  };

  const runAudit = async () => {
    if (!company || !user) return;
    setLoading(true); setError(null); setResult(null); setBenchmark(null); setActiveTab('audit');
    setStatus("Audit V12 en cours...");
    const normId = `${company.toUpperCase().trim()}_${angle.toUpperCase()}`;
    try {
      const snap = await getDoc(doc(db, 'audits', normId));
      if (snap.exists()) {
        const d = snap.data(); setResult(d); setBenchmark(d.benchmark || null); setLoading(false); return;
      }
      const schema = {
        type: "OBJECT",
        properties: {
          caMondial: { type: "STRING" }, angleStrategique: { type: "STRING" }, actionMarketing: { type: "STRING" }, totalScore: { type: "NUMBER" }, axeX: { type: "NUMBER" }, axeY: { type: "NUMBER" }, concurrents: { type: "STRING" },
          scores: { type: "OBJECT", properties: { maturity: { type: "NUMBER" }, tech: { type: "NUMBER" }, momentum: { type: "NUMBER" }, ecosystem: { type: "NUMBER" }, footprint: { type: "NUMBER" }, politics: { type: "NUMBER" }, affinity: { type: "NUMBER" }, lock: { type: "NUMBER" } } },
          observations: { type: "OBJECT", properties: { maturity: { type: "STRING" }, tech: { type: "STRING" }, momentum: { type: "STRING" }, ecosystem: { type: "STRING" }, footprint: { type: "STRING" }, politics: { type: "STRING" }, affinity: { type: "STRING" }, lock: { type: "STRING" } } },
          recrutements: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["caMondial", "totalScore", "scores"]
      };
      const data = await callGemini(`Audit V12 pour ${company} (${angle}).`, "Expert Stratégie Amaris. Français.", schema);
      const payload = { ...data, company: company.trim(), angle, lastUpdate: new Date().toISOString() };
      await setDoc(doc(db, 'audits', normId), payload);
      setResult(payload);
    } catch (err) { setError("Erreur de connexion IA."); }
    finally { setLoading(false); }
  };

  const runBenchmark = async () => {
    if (!result || geminiLoading) return;
    setGeminiLoading(true); setStatus("Analyse benchmark...");
    try {
      const bSchema = { type: "OBJECT", properties: { integrators: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, presence: { type: "STRING" }, vulnerability: { type: "STRING" } } } }, amarisDifferentiation: { type: "STRING" } } };
      const data = await callGemini(`Benchmark intégrateurs chez ${company}.`, "Analyste Partenaires.", bSchema);
      setBenchmark(data); setActiveTab('benchmark');
      await updateDoc(doc(db, 'audits', `${result.company.toUpperCase()}_${result.angle.toUpperCase()}`), { benchmark: data });
    } catch (e) { setError("Erreur benchmark."); }
    finally { setGeminiLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border border-slate-100 mb-10">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-xl"><Compass size={32} className={loading ? 'animate-spin' : ''} /></div>
              <div><h1 className="text-2xl font-black uppercase mb-1">InSight</h1><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Market Intelligence</p></div>
            </div>
            <div className="flex-1 w-full flex flex-col sm:flex-row gap-4">
              <input type="text" placeholder="Rechercher un compte..." className="flex-1 px-6 py-4 rounded-3xl bg-slate-50 border-none outline-none font-bold text-slate-800 text-lg focus:ring-2 focus:ring-blue-600" value={company} onChange={(e) => setCompany(e.target.value)} />
              <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem]">
                <button onClick={() => setAngle('Anaplan')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase ${angle === 'Anaplan' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Anaplan</button>
                <button onClick={() => setAngle('IA')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase ${angle === 'IA' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>IA & Data</button>
              </div>
              <button onClick={runAudit} disabled={loading || !company || !user} className="bg-blue-600 text-white px-10 py-4 rounded-3xl font-black shadow-lg">
                {loading ? <Loader2 className="animate-spin" size={24} /> : "ANALYSER"}
              </button>
            </div>
          </div>
        </div>

        {result && (
          <div className="mb-6 flex gap-3">
            <button onClick={exportToCSV} className="bg-emerald-600 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase flex items-center gap-2">
              <Download size={14} /> EXCEL
            </button>
            <button onClick={() => setShowHistory(!showHistory)} className="bg-slate-900 text-white px-6 py-2 rounded-full text-[10px] font-black uppercase">
              {showHistory ? "Fermer" : `Base (${history.length})`}
            </button>
          </div>
        )}

        {showHistory && (
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl mb-10 grid grid-cols-1 md:grid-cols-4 gap-4">
            {history.map((item) => (
              <div key={item.id} onClick={() => { setResult(item); setCompany(item.company); setShowHistory(false); }} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-blue-400 cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                   <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 uppercase">{item.angle}</span>
                   <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'audits', item.id)); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100"><Trash2 size={12} /></button>
                </div>
                <h4 className="font-black text-slate-800 uppercase truncate">{item.company}</h4>
              </div>
            ))}
          </div>
        )}

        {loading ? (
          <div className="bg-white rounded-[4rem] p-32 text-center flex flex-col items-center shadow-2xl">
            <Loader2 className="animate-spin text-blue-600 mb-8" size={48} />
            <h2 className="text-3xl font-black text-slate-900 uppercase">Génération InSight</h2>
            <p className="text-blue-600 text-sm font-black uppercase tracking-[0.4em] mt-4">{status}</p>
          </div>
        ) : result && (
          <div className="space-y-8 pb-20">
            <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10">
                <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-8 leading-none">{result.company}</h2>
                <div className="grid grid-cols-2 gap-12">
                  <div><div className="text-[10px] text-slate-400 font-black uppercase mb-2">CA ESTIMÉ</div><div className="text-3xl md:text-4xl font-bold">{result.caMondial}</div></div>
                  <div><div className="text-[10px] text-slate-400 font-black uppercase mb-2 tracking-widest">SCORE TOTAL V12</div><div className="text-5xl md:text-6xl font-black text-blue-400 tracking-tighter">{result.totalScore || 0}</div></div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
              <div className="space-y-8">
                <h3 className="text-2xl font-black uppercase border-b-2 border-slate-200 pb-5">Valeur (Y)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {criteriaConfig.Y.map(c => (
                    <div key={c.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-bold text-slate-800 text-sm">{c.label}</span>
                        <div className="text-2xl font-black text-blue-600">{result.scores?.[c.id] || 0}</div>
                      </div>
                      <p className="text-slate-700 text-[11px] italic">"{result.observations?.[c.id]}"</p>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-8">
                <h3 className="text-2xl font-black uppercase border-b-2 border-slate-200 pb-5">Accès (X)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {criteriaConfig.X.map(c => (
                    <div key={c.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
                      <div className="flex justify-between items-start mb-3">
                        <span className="font-bold text-slate-800 text-sm">{c.label}</span>
                        <div className="text-2xl font-black text-blue-600">{result.scores?.[c.id] || 0}</div>
                      </div>
                      <p className="text-slate-700 text-[11px] italic">"{result.observations?.[c.id]}"</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;