import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Search, BarChart3, Zap, Users, Globe, FileText, TrendingUp, Target, 
  Layers, Info, ChevronRight, Database, Cpu, CheckCircle2, AlertCircle,
  ShieldCheck, Briefcase, Network, Microscope, Loader2, BarChart4,
  ExternalLink, Building2, LayoutDashboard, Sparkles, Download,
  History, Trash2, ArrowUpRight, Compass, Lightbulb
} from 'lucide-react';

// Importations Firebase pour la sauvegarde et l'URL Web
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyAYU9MyhYlOc5wRyFtNW7juFN7p6ubKiik",
  authDomain: "insight-b2e2e.firebaseapp.com",
  projectId: "insight-b2e2e",
  storageBucket: "insight-b2e2e.firebasestorage.app",
  messagingSenderId: "1062762901329",
  appId: "1:1062762901329:web:093cb5783992b143b46d70",
  measurementId: "G-7NY64YNR1K"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

const App = () => {
  // --- ÉTATS ---
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

  // --- UTILITAIRES ---
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

  // --- EXPORT EXCEL (36 COLONNES EXACTES) ---
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
      result.company, "Target", result.caMondial, "Mds€", s.maturity, s.lock, s.tech, s.footprint, s.momentum, s.ecosystem, s.politics, s.affinity, result.totalScore, result.axeX, result.axeY, "850000", result.angleStrategique, result.actionMarketing, "", "Maxime PAQUET", "Julie SAZERAT", "", "", "", result.concurrents || "GSI", o.maturity, o.lock, o.tech, o.footprint, o.momentum, o.ecosystem, o.politics, o.affinity, "Généré via InSight Market Intelligence", "Active", new Date().toLocaleDateString()
    ];

    const csvContent = "\ufeff" + [headers.join(","), row.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")].join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `InSight_Audit_${result.company}.csv`;
    link.click();
  };

  // --- FIREBASE AUTH ---
  useEffect(() => {
    const initAuth = async () => {
      if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
        await signInWithCustomToken(auth, __initial_auth_token);
      } else {
        await signInAnonymously(auth);
      }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  // --- FIRESTORE SYNC ---
  useEffect(() => {
    if (!user) return;
    const auditsRef = collection(db, 'artifacts', appId, 'public', 'data', 'audits');
    const unsubscribe = onSnapshot(auditsRef, (snap) => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  // --- API GEMINI ---
  const callGemini = async (prompt, systemPrompt, schema = null) => {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
    const delays = [1000, 2000, 4000, 8000, 16000];
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
        if (response.status === 401 && i < delays.length - 1) { await new Promise(r => setTimeout(r, delays[i])); continue; }
      } catch (err) { if (i === delays.length - 1) throw err; await new Promise(r => setTimeout(r, delays[i])); }
    }
  };

  // --- ACTIONS ---
  const runAudit = async () => {
    if (!company || !user) return;
    setLoading(true); setError(null); setResult(null); setBenchmark(null); setActiveTab('audit');
    setStatus("Extraction V12 en cours...");
    const normId = `${company.toUpperCase().trim()}_${angle.toUpperCase()}`;
    try {
      const snap = await getDoc(doc(db, 'artifacts', appId, 'public', 'data', 'audits', normId));
      if (snap.exists()) {
        const d = snap.data(); setResult(d); setBenchmark(d.benchmark || null); setLoading(false); return;
      }
      const schema = {
        type: "OBJECT",
        properties: {
          caMondial: { type: "STRING" }, angleStrategique: { type: "STRING" }, actionMarketing: { type: "STRING" }, totalScore: { type: "NUMBER" }, axeX: { type: "NUMBER" }, axeY: { type: "NUMBER" },
          scores: { type: "OBJECT", properties: { maturity: { type: "NUMBER" }, tech: { type: "NUMBER" }, momentum: { type: "NUMBER" }, ecosystem: { type: "NUMBER" }, footprint: { type: "NUMBER" }, politics: { type: "NUMBER" }, affinity: { type: "NUMBER" }, lock: { type: "NUMBER" } } },
          observations: { type: "OBJECT", properties: { maturity: { type: "STRING" }, tech: { type: "STRING" }, momentum: { type: "STRING" }, ecosystem: { type: "STRING" }, footprint: { type: "STRING" }, politics: { type: "STRING" }, affinity: { type: "STRING" }, lock: { type: "STRING" } } },
          recrutements: { type: "ARRAY", items: { type: "STRING" } }
        },
        required: ["caMondial", "totalScore", "scores"]
      };
      const data = await callGemini(`Audit V12 complet pour ${company} (${angle}). Scores 0-100 obligatoires.`, "Expert Stratégie Amaris. Analyse financière et écosystème partenaires. Scores 0-100 exigés. Français.", schema);
      const payload = { ...data, company: company.trim(), angle, lastUpdate: new Date().toISOString() };
      await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'audits', normId), payload);
      setResult(payload);
    } catch (err) { setError("Le service est temporairement saturé."); } finally { setLoading(false); }
  };

  const runBenchmark = async () => {
    if (!result || geminiLoading) return;
    setGeminiLoading(true); setStatus("Analyse benchmark partenaires...");
    try {
      const bSchema = { type: "OBJECT", properties: { integrators: { type: "ARRAY", items: { type: "OBJECT", properties: { name: { type: "STRING" }, presence: { type: "STRING" }, vulnerability: { type: "STRING" } } } }, amarisDifferentiation: { type: "STRING" } } };
      const data = await callGemini(`Benchmark des intégrateurs concurrents chez ${company} sur ${angle}.`, "Analyste Partenaires. Français.", bSchema);
      setBenchmark(data); setActiveTab('benchmark');
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'audits', `${result.company.toUpperCase()}_${result.angle.toUpperCase()}`), { benchmark: data });
    } catch (e) { setError("Erreur benchmark."); } finally { setGeminiLoading(false); }
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-sans p-4 md:p-10">
      <div className="max-w-7xl mx-auto">
        
        {/* Terminal Header */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border border-slate-100 mb-10">
          <div className="flex flex-col lg:flex-row items-center gap-8">
            <div className="flex items-center gap-4">
              <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-xl"><Compass size={32} className={loading ? 'animate-spin' : ''} /></div>
              <div>
                <h1 className="text-2xl font-black uppercase mb-1 leading-none">InSight</h1>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-nowrap">Market Intelligence</p>
              </div>
            </div>
            <div className="flex-1 w-full flex flex-col sm:flex-row gap-4">
              <input type="text" placeholder="Rechercher un compte (ex: Renault, Sanofi...)" className="flex-1 px-6 py-4 rounded-3xl bg-slate-50 border-none outline-none font-bold text-slate-800 text-lg focus:ring-2 focus:ring-blue-600" value={company} onChange={(e) => setCompany(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && runAudit()} />
              <div className="flex bg-slate-100 p-1.5 rounded-[1.5rem]">
                <button onClick={() => setAngle('Anaplan')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${angle === 'Anaplan' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Anaplan</button>
                <button onClick={() => setAngle('IA')} className={`px-6 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${angle === 'IA' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>IA & Data</button>
              </div>
              <button onClick={runAudit} disabled={loading || !company || !user} className="bg-blue-600 text-white px-10 py-4 rounded-3xl font-black shadow-lg hover:bg-blue-700 transition-all">
                {loading ? <Loader2 className="animate-spin" size={24} /> : "ANALYSER"}
              </button>
            </div>
          </div>
        </div>

        {/* Historique / Actions */}
        <div className="mb-6 flex flex-wrap gap-3">
          <button onClick={() => setShowHistory(!showHistory)} className="px-6 py-2 bg-slate-900 text-white rounded-full text-[10px] font-black uppercase shadow-lg">
            {showHistory ? "Masquer" : `Base Cloud (${history.length})`}
          </button>
          {result && !loading && (
            <>
              <button onClick={exportToCSV} className="px-6 py-2 bg-emerald-600 text-white rounded-full text-[10px] font-black flex items-center gap-2 shadow-sm hover:bg-emerald-700 transition-all">
                <Download size={14} /> EXPORTER EXCEL
              </button>
              <button onClick={runBenchmark} disabled={geminiLoading} className="px-6 py-2 bg-amber-50 text-amber-600 border border-amber-100 rounded-full text-[10px] font-black flex items-center gap-2 hover:bg-amber-100 transition-all">
                <LayoutDashboard size={14} /> ✨ Benchmark Intégrateurs
              </button>
            </>
          )}
        </div>

        {showHistory && (
          <div className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl mb-10 grid grid-cols-1 md:grid-cols-4 gap-4 animate-in fade-in">
            {history.map((item) => (
              <div key={item.id} onClick={() => { setResult(item); setCompany(ensureString(item.company)); setBenchmark(item.benchmark || null); setShowHistory(false); }} className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-blue-400 cursor-pointer group">
                <div className="flex justify-between items-start mb-2">
                   <span className="text-[8px] font-black px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 uppercase">{ensureString(item.angle, "Audit")}</span>
                   <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'audits', item.id)); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={12} /></button>
                </div>
                <h4 className="font-black text-slate-800 uppercase truncate">{ensureString(item.company)}</h4>
              </div>
            ))}
          </div>
        )}

        {/* Chargement */}
        {loading || geminiLoading ? (
          <div className="bg-white rounded-[4rem] p-32 text-center flex flex-col items-center shadow-2xl border border-slate-50">
            <Loader2 className="animate-spin text-blue-600 mb-8" size={48} />
            <h2 className="text-3xl font-black text-slate-900 uppercase">Traitement Sécurisé</h2>
            <p className="text-blue-600 text-sm font-black uppercase tracking-[0.4em] mt-4">{ensureString(status)}</p>
          </div>
        ) : result && (
          <div className="space-y-8 pb-20 animate-in slide-in-from-bottom-6 duration-700">
            
            <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl">
              <div className="absolute top-0 right-0 p-12 opacity-5 scale-[2.5] pointer-events-none text-white"><Globe size={300} /></div>
              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
                <div className="flex-1">
                  <div className="flex gap-3 mb-6">
                    <span className="px-4 py-1.5 bg-blue-600 rounded-full text-[9px] font-black uppercase">DATA PERSISTENCE ACTIVE</span>
                    <span className="px-4 py-1.5 bg-white/10 rounded-full text-[9px] font-black uppercase">{ensureString(result.angle)}</span>
                  </div>
                  <h2 className="text-5xl md:text-7xl font-black uppercase tracking-tighter mb-8 leading-none">{ensureString(result.company)}</h2>
                  <div className="grid grid-cols-2 gap-12">
                    <div><div className="text-[10px] text-slate-400 font-black uppercase mb-2">CA ESTIMÉ</div><div className="text-3xl md:text-4xl font-bold">{ensureString(result.caMondial)}</div></div>
                    <div><div className="text-[10px] text-slate-400 font-black uppercase mb-2 tracking-widest">SCORE TOTAL V12</div><div className="text-5xl md:text-6xl font-black text-blue-400 tracking-tighter">{result.totalScore || 0}</div></div>
                  </div>
                </div>
                <div className="flex bg-white/5 p-2 rounded-[2rem] border border-white/10 backdrop-blur-md">
                   {['audit', 'benchmark'].map((tab) => (
                      <button key={tab} onClick={() => setActiveTab(tab)} className={`px-10 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-white'}`}>{tab}</button>
                   ))}
                </div>
              </div>
            </div>

            {/* Contenu Dynamique */}
            <div className="animate-in fade-in duration-500">
              {activeTab === 'audit' && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                  <div className="space-y-8">
                    <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-5"><Zap className="text-purple-600" size={24} /><h3 className="text-2xl font-black uppercase text-slate-800 tracking-tighter">Valeur (Y)</h3></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {criteriaConfig.Y.map(c => (
                        <div key={c.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full hover:border-blue-200 transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3"><div className="p-2.5 bg-slate-50 rounded-2xl text-slate-500"><c.icon size={20} /></div><span className="font-bold text-slate-800 text-sm">{c.label}</span></div>
                            <div className="text-2xl font-black text-blue-600">{result.scores?.[c.id] || 0}</div>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-3">{c.desc}</p>
                          <div className="mt-auto pt-4 border-t border-slate-50"><p className="text-slate-700 text-[11px] italic font-medium leading-relaxed">"{ensureString(result.observations?.[c.id], "Analyse...")}"</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-8">
                    <div className="flex items-center gap-3 border-b-2 border-slate-200 pb-5"><Users className="text-emerald-600" size={24} /><h3 className="text-2xl font-black uppercase text-slate-800 tracking-tighter">Accessibilité (X)</h3></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      {criteriaConfig.X.map(c => (
                        <div key={c.id} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex flex-col h-full hover:border-blue-200 transition-all">
                          <div className="flex justify-between items-start mb-3">
                            <div className="flex items-center gap-3"><div className="p-2.5 bg-slate-50 rounded-2xl text-slate-500"><c.icon size={20} /></div><span className="font-bold text-slate-800 text-sm">{c.label}</span></div>
                            <div className="text-2xl font-black text-blue-600">{result.scores?.[c.id] || 0}</div>
                          </div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase mb-3">{c.desc}</p>
                          <div className="mt-auto pt-4 border-t border-slate-50"><p className="text-slate-700 text-[11px] italic font-medium leading-relaxed">"{ensureString(result.observations?.[c.id], "Analyse...")}"</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'benchmark' && (
                <div className="space-y-8 min-h-[400px]">
                  <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl">
                    <div className="flex items-center gap-3 mb-10"><LayoutDashboard className="text-emerald-600" size={24} /><h3 className="text-emerald-600 font-black uppercase text-xs tracking-[0.2em]">Partenaires Concurrents</h3></div>
                    {benchmark ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {benchmark.integrators?.map((comp, idx) => (
                          <div key={idx} className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 border-b-4 border-b-emerald-200">
                            <h5 className="text-xl font-black text-slate-800 mb-4">{ensureString(comp.name)}</h5>
                            <div className="space-y-4">
                              <p className="text-xs text-slate-600"><span className="text-emerald-600 font-black uppercase block mb-1">Position</span> {ensureString(comp.presence)}</p>
                              <p className="text-xs text-slate-600"><span className="text-red-500 font-black uppercase block mb-1">Vulnérabilité</span> {ensureString(comp.vulnerability)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-20 bg-slate-50 rounded-[2.5rem]">
                         <p className="text-slate-400 italic mb-6">Analyse comparative non effectuée.</p>
                         <button onClick={runBenchmark} className="px-8 py-3 bg-amber-500 text-white rounded-full font-black text-xs uppercase shadow-lg">Lancer Benchmark ✨</button>
                      </div>
                    )}
                  </div>
                  {benchmark?.amarisDifferentiation && (
                    <div className="bg-emerald-600 p-10 rounded-[2.5rem] text-white shadow-xl flex items-start gap-6">
                      <Lightbulb size={40} className="shrink-0 text-emerald-200" />
                      <div>
                        <h5 className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-80 underline decoration-emerald-300">Notre Angle de Différenciation</h5>
                        <p className="text-xl font-bold leading-relaxed">{String(benchmark.amarisDifferentiation)}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* PARTIE BASSE STRATÉGIQUE */}
            {activeTab === 'audit' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                <div className="lg:col-span-2 bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl flex flex-col justify-between hover:border-blue-100 transition-all">
                  <div>
                    <div className="flex items-center gap-2 text-blue-600 font-black uppercase text-xs mb-8 tracking-widest"><Target size={18} /> Recommandation Tactique</div>
                    <h4 className="text-3xl md:text-5xl font-black text-slate-900 mb-10 leading-tight">{ensureString(result.angleStrategique)}</h4>
                  </div>
                  <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] border-l-8 border-l-blue-600 shadow-inner">
                    <span className="text-[10px] font-black text-blue-400 uppercase block mb-4">Note Marketing</span>
                    <p className="text-xl md:text-2xl font-bold italic leading-relaxed">"{ensureString(result.actionMarketing)}"</p>
                  </div>
                </div>
                <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl flex flex-col">
                  <h4 className="text-blue-600 font-black uppercase text-xs mb-10">Signaux de Recrutement</h4>
                  <div className="space-y-3 mb-10 flex-1">
                    {result.recrutements?.map((tag, i) => (
                      <div key={i} className="px-5 py-3 bg-slate-50 text-slate-700 text-[10px] font-black rounded-xl border border-slate-100 uppercase flex justify-between items-center hover:bg-slate-100 transition-all">
                        <span>{ensureString(tag)}</span>
                        <ArrowUpRight size={14} className="text-slate-300" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        <footer className="mt-20 py-10 text-center border-t border-slate-200">
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.4em] mb-2">InSight Market Intelligence v4.0.13</p>
          <p className="text-slate-300 text-[9px] font-medium italic tracking-widest leading-relaxed">Propriété exclusive Amaris Conseil — Powered by Gemini 2.5 Strategic Intelligence</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
