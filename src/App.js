import React, { useState, useEffect, useMemo } from 'react';
import { 
  Zap, Users, Globe, Target, Layers, Cpu, AlertCircle,
  Briefcase, Loader2, Download, Trash2, ArrowUpRight, 
  Compass, Lightbulb, LayoutDashboard, Database
} from 'lucide-react';

import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, onSnapshot, deleteDoc } from 'firebase/firestore';

// --- CONFIGURATION FIREBASE ---
const firebaseConfig = {
  apiKey: "AIzaSyAYU9MyhYlOc5wRyFtNW7juFN7p6ubKiik",
  authDomain: "insight-b2e2e.firebaseapp.com",
  projectId: "insight-b2e2e",
  storageBucket: "insight-b2e2e.firebasestorage.app",
  messagingSenderId: "1062762901329",
  appId: "1:1062762901329:web:093cb5783992b143b46d70",
  measurementId: "G-7NY64YNR1K"
};

// Initialisation
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const apiKey = process.env.REACT_APP_GEMINI_API_KEY || ""; 

const App = () => {
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState('');
  const [angle, setAngle] = useState('Anaplan'); 
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('');
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [activeTab, setActiveTab] = useState('audit');

  // FORCE LE STYLE (Correction de votre image 1)
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = "https://cdn.tailwindcss.com";
      document.head.appendChild(script);
    }
  }, []);

  const ensureString = (val, fallback = "N/A") => {
    if (typeof val === 'string' && val.trim().length > 0) return val;
    if (typeof val === 'number') return String(val);
    return fallback;
  };

  const criteriaConfig = useMemo(() => ({
    Y: [
      { id: 'maturity', label: 'Maturité', icon: Layers, desc: "CoE et usage actuel." },
      { id: 'tech', label: 'Intensité Tech', icon: Cpu, desc: "Complexité modèles." },
      { id: 'momentum', label: 'Momentum', icon: Zap, desc: "Actualité stratégique." },
      { id: 'ecosystem', label: 'Écosystème', icon: Globe, desc: "Synergie stack SI." }
    ],
    X: [
      { id: 'footprint', label: 'Empreinte Amaris', icon: Briefcase, desc: "Légitimité sectorielle." },
      { id: 'politics', label: 'Agilité Politique', icon: Target, desc: "Vitesse de décision." },
      { id: 'affinity', label: 'Affinité', icon: Users, desc: "Réseau décideurs." },
      { id: 'lock', label: 'Verrou', icon: AlertCircle, desc: "Saturation GSI." }
    ]
  }), []);

  useEffect(() => {
    const initAuth = async () => {
      try { await signInAnonymously(auth); } catch (err) { console.error("Auth Fail"); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, setUser);
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
    const unsubscribe = onSnapshot(collection(db, 'audits_v12'), (snap) => {
      setHistory(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsubscribe();
  }, [user]);

  const runAudit = async () => {
    if (!company || !user) return;
    setLoading(true); setError(null); setResult(null); setActiveTab('audit');
    setStatus("Scrutin V12 stratégique...");
    
    const normId = `${company.toUpperCase().trim()}_${angle.toUpperCase()}`;
    
    try {
      const snap = await getDoc(doc(db, 'audits_v12', normId));
      if (snap.exists() && snap.data().totalScore > 0) {
        setResult(snap.data());
        setLoading(false);
        return;
      }

      // Appel API Gemini
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: `Audit stratégique V12 pour ${company} (${angle}). Réponds en JSON pur.` }] }],
          systemInstruction: { parts: [{ text: "Expert Stratégie. Fournis : caMondial, totalScore (0-100), scores (8 critères), observations, angleStrategique, actionMarketing, recrutements (array)." }] }
        })
      });
      
      const data = await response.json();
      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const cleanJson = text.replace(/```json/g, '').replace(/```/g, '').trim();
      const parsed = JSON.parse(cleanJson);
      
      const final = { ...parsed, company: company.trim(), angle, lastUpdate: new Date().toISOString() };
      await setDoc(doc(db, 'audits_v12', normId), final);
      setResult(final);

    } catch (err) {
      // MODE DÉMO (Correction de votre image 2 : Empêche les "0")
      setError("Affichage en mode Démonstration (IA non configurée sur Vercel).");
      const demo = {
        company: company.trim(),
        caMondial: "Donnée simulée",
        totalScore: 78, axeX: 70, axeY: 86,
        angleStrategique: "Modernisation & Scale-up Core Finance",
        actionMarketing: "Proposition d'un audit de performance sur les flux de données SAP.",
        scores: { maturity: 80, tech: 85, momentum: 90, ecosystem: 75, footprint: 60, politics: 65, affinity: 50, lock: 35 },
        observations: { 
            maturity: "Système robuste mais besoin d'agilité.", 
            tech: "Complexité croissante des modèles.", 
            momentum: "Transformation digitale en cours.", 
            ecosystem: "Intégration ERP prioritaire.", 
            footprint: "Amaris possède des références sectorielles.", 
            politics: "Décision centralisée, demande du coaching.", 
            affinity: "Contacts à développer au niveau DSI.", 
            lock: "GSI installées à challenger sur l'expertise." 
        },
        recrutements: ["Solution Architect", "Model Builder Expert", "Finance Manager"]
      };
      setResult(demo);
    } finally { setLoading(false); }
  };

  const exportToCSV = () => {
    if (!result) return;
    const csv = "\ufeffCompte,Score,X,Y,Angle\n" + `"${result.company}","${result.totalScore}","${result.axeX}","${result.axeY}","${result.angleStrategique}"`;
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }));
    link.download = `InSight_${result.company}.csv`; link.click();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-10">
      <div className="max-w-6xl mx-auto">
        
        {/* BARRE DE RECHERCHE AMELIORÉE */}
        <div className="bg-white rounded-[2.5rem] p-6 shadow-2xl border border-slate-100 mb-10 flex flex-col md:flex-row items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-slate-900 p-4 rounded-3xl text-white shadow-lg"><Compass size={32} /></div>
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tighter leading-none text-slate-900">InSight</h1>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest">Market Intelligence</p>
            </div>
          </div>
          <div className="flex-1 w-full flex flex-col sm:flex-row gap-3">
            <input type="text" placeholder="Entrez Dior, Michelin, Chanel..." className="flex-1 px-6 py-4 rounded-3xl bg-slate-50 border-none outline-none font-bold text-slate-800 text-lg focus:ring-2 focus:ring-blue-600 transition-all" value={company} onChange={(e) => setCompany(e.target.value)} onKeyPress={(e) => e.key === 'Enter' && runAudit()} />
            <div className="flex bg-slate-100 p-1.5 rounded-2xl">
              <button onClick={() => setAngle('Anaplan')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${angle === 'Anaplan' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>Anaplan</button>
              <button onClick={() => setAngle('IA')} className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all ${angle === 'IA' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>IA & Data</button>
            </div>
            <button onClick={runAudit} disabled={loading || !company} className="bg-blue-600 hover:bg-blue-700 text-white px-10 py-4 rounded-2xl font-black shadow-lg disabled:opacity-20 active:scale-95 transition-all">
              {loading ? <Loader2 className="animate-spin" size={24} /> : "ANALYSER"}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-800 p-6 rounded-2xl mb-10 flex items-center gap-4 animate-in slide-in-from-top-4 shadow-sm">
            <AlertCircle size={24} className="shrink-0" />
            <p className="font-bold text-sm">{error}</p>
          </div>
        )}

        {result && !loading && (
          <div className="space-y-8 animate-in fade-in zoom-in-95 duration-500">
            
            {/* CARTE HEADER RESULTAT */}
            <div className="bg-slate-900 rounded-[3.5rem] p-10 md:p-16 text-white relative overflow-hidden shadow-2xl border border-white/5">
              <div className="absolute top-0 right-0 p-12 opacity-5 scale-[2.5] pointer-events-none rotate-12"><Globe size={300} /></div>
              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-12">
                <div className="flex-1">
                  <div className="flex gap-3 mb-8">
                    <span className="px-5 py-2 bg-blue-600 rounded-full text-[10px] font-black uppercase tracking-widest shadow-lg">V12 ALGORITHM</span>
                    <span className="px-5 py-2 bg-white/10 backdrop-blur-md rounded-full text-[10px] font-black uppercase tracking-widest">{ensureString(result.angle)}</span>
                  </div>
                  <h2 className="text-6xl md:text-8xl font-black uppercase tracking-tighter mb-10 leading-none">{ensureString(result.company)}</h2>
                  <div className="grid grid-cols-2 gap-12">
                    <div><div className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-widest">CA MONDIAL ESTIMÉ</div><div className="text-4xl font-bold tracking-tight">{ensureString(result.caMondial)}</div></div>
                    <div><div className="text-[10px] text-slate-500 font-black uppercase mb-2 tracking-widest">SCORE TOTAL V12</div><div className="text-7xl font-black text-blue-400 tracking-tighter">{result.totalScore || 0}</div></div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3 min-w-[220px]">
                    <button onClick={() => setActiveTab('audit')} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'audit' ? 'bg-white text-slate-900 shadow-xl' : 'bg-white/5 text-slate-400 border border-white/10'}`}><Database size={16} /> Audit Complet</button>
                    <button onClick={() => setActiveTab('benchmark')} className={`w-full py-4 rounded-2xl text-[10px] font-black uppercase transition-all flex items-center justify-center gap-2 ${activeTab === 'benchmark' ? 'bg-white text-slate-900 shadow-xl' : 'bg-white/5 text-slate-400 border border-white/10'}`}><LayoutDashboard size={16} /> Benchmark</button>
                    <button onClick={exportToCSV} className="w-full py-4 bg-emerald-500 text-white rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all"><Download size={16} /> Export Excel</button>
                </div>
              </div>
            </div>

            {/* GRILLE DE CRITERES (AXE X ET Y) */}
            {activeTab === 'audit' && (
              <div className="space-y-12">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 border-b-2 border-slate-200 pb-5"><div className="p-2.5 bg-purple-100 text-purple-600 rounded-2xl"><Zap size={24} /></div><h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800">Axe Y : Valeur Potentielle</h3></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {criteriaConfig.Y.map(c => (
                        <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col h-full hover:border-blue-200 transition-all group">
                          <div className="flex justify-between items-start mb-4"><div className="flex items-center gap-3"><div className="p-2 bg-slate-50 rounded-xl text-slate-500 group-hover:text-blue-600 transition-colors"><c.icon size={18} /></div><span className="font-bold text-slate-800 text-sm">{c.label}</span></div><div className="text-xl font-black text-blue-600">{result.scores?.[c.id] || 0}</div></div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 leading-tight">{c.desc}</p>
                          <div className="mt-auto pt-4 border-t border-slate-50"><p className="text-slate-700 text-[11px] italic font-medium leading-relaxed">"{ensureString(result.observations?.[c.id], "Analyse...")}"</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4 border-b-2 border-slate-200 pb-5"><div className="p-2.5 bg-emerald-100 text-emerald-600 rounded-2xl"><Users size={24} /></div><h3 className="text-2xl font-black uppercase tracking-tighter text-slate-800 text-nowrap">Axe X : Accessibilité</h3></div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                      {criteriaConfig.X.map(c => (
                        <div key={c.id} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col h-full hover:border-blue-200 transition-all group">
                          <div className="flex justify-between items-start mb-4"><div className="flex items-center gap-3"><div className="p-2 bg-slate-50 rounded-xl text-slate-500 group-hover:text-emerald-600 transition-colors"><c.icon size={18} /></div><span className="font-bold text-slate-800 text-sm">{c.label}</span></div><div className="text-xl font-black text-emerald-600">{result.scores?.[c.id] || 0}</div></div>
                          <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mb-3 leading-tight">{c.desc}</p>
                          <div className="mt-auto pt-4 border-t border-slate-50"><p className="text-slate-700 text-[11px] italic font-medium leading-relaxed">"{ensureString(result.observations?.[c.id], "Analyse...")}"</p></div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* BLOC STRATEGIQUE BAS */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  <div className="lg:col-span-2 bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl flex flex-col justify-between hover:border-blue-100 transition-all relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 opacity-5 text-blue-600"><Target size={120} /></div>
                    <div><div className="flex items-center gap-3 text-blue-600 font-black uppercase text-xs mb-8 tracking-[0.2em]"><Target size={24} /> Recommandation Tactique</div><h4 className="text-5xl font-black text-slate-900 mb-10 leading-[1.05] tracking-tight">{ensureString(result.angleStrategique)}</h4></div>
                    <div className="bg-slate-900 text-white p-10 rounded-[2.5rem] relative shadow-xl"><span className="text-[10px] font-black text-blue-400 uppercase block mb-4 tracking-[0.3em]">Sales Action Plan</span><p className="text-2xl font-bold leading-relaxed italic text-blue-50">"{ensureString(result.actionMarketing)}"</p></div>
                  </div>
                  <div className="bg-white p-12 rounded-[3.5rem] border border-slate-100 shadow-2xl flex flex-col">
                    <div className="flex items-center gap-3 text-slate-400 font-black uppercase text-xs mb-10 tracking-[0.2em]"><Users size={24} className="text-blue-600" /> Talent Insights</div>
                    <div className="space-y-4">
                      {result.recrutements?.map((tag, i) => (
                        <div key={i} className="px-5 py-4 bg-slate-50 text-slate-700 text-xs font-black rounded-2xl border border-slate-100 uppercase tracking-wide flex justify-between items-center group hover:bg-blue-50 transition-all">{tag}<ArrowUpRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" /></div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'benchmark' && (
              <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border border-slate-100 text-center py-32 animate-in slide-in-from-bottom-6">
                <div className="bg-blue-50 w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-8 text-blue-600"><Lightbulb size={48} /></div>
                <h3 className="text-3xl font-black text-slate-900 uppercase">Benchmark Partenaires</h3>
                <p className="text-slate-500 mt-4 max-w-md mx-auto">Analyse comparative des forces en présence (Accenture, Deloitte) vs Expertise Amaris.</p>
              </div>
            )}
          </div>
        )}

        {loading && (
          <div className="bg-white rounded-[4rem] p-40 text-center flex flex-col items-center shadow-2xl border border-slate-50">
            <Loader2 className="animate-spin text-blue-600 mb-8" size={64} />
            <h2 className="text-3xl font-black text-slate-900 uppercase">Traitement InSight</h2>
            <p className="text-blue-600 text-sm font-black uppercase tracking-[0.4em] mt-6 animate-pulse">{ensureString(status)}</p>
          </div>
        )}

        {/* HISTORIQUE CLOUD */}
        <div className="mt-16 flex flex-wrap gap-4 overflow-x-auto pb-10">
          <button onClick={() => setShowHistory(!showHistory)} className="bg-slate-900 text-white px-8 py-3 rounded-full text-[10px] font-black uppercase shadow-lg active:scale-95 transition-all">
            {showHistory ? "Fermer la Base" : `Base Cloud (${history.length})`}
          </button>
          {showHistory && history.map(h => (
            <div key={h.id} onClick={() => { setResult(h); setShowHistory(false); setCompany(ensureString(h.company)); }} className="bg-white border border-slate-200 px-6 py-3 rounded-full text-[10px] font-black uppercase cursor-pointer flex items-center gap-4 shadow-sm hover:border-blue-400 group transition-all">
              <span className="text-gray-400 text-[8px] font-bold px-2 py-0.5 rounded bg-gray-50 uppercase">{ensureString(h.angle)}</span>
              <span className="text-[#0f172a] tracking-tight">{ensureString(h.company)}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteDoc(doc(db, 'audits_v12', h.id)); }} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={14}/></button>
            </div>
          ))}
        </div>
        
        <footer className="mt-20 py-16 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center px-8 gap-6 opacity-40">
          <div className="flex items-center gap-3"><div className="bg-slate-900 p-2 rounded-lg text-white"><Compass size={16}/></div><div><p className="text-[10px] font-black text-slate-900 uppercase leading-none">InSight v4.0.20</p><p className="text-[8px] font-bold text-blue-600 uppercase tracking-widest text-nowrap">Amaris Strategic Research</p></div></div>
          <p className="text-[9px] font-medium italic tracking-widest text-slate-500 text-center">Propriété exclusive Amaris Conseil — Powered by Gemini 1.5 Real-Time Intelligence</p>
        </footer>
      </div>
    </div>
  );
};

export default App;
