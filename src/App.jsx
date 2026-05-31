import { useState, useEffect } from "react";
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getFirestore, collection, onSnapshot,
  addDoc, deleteDoc, doc, setDoc, getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ── Firebase Config ──────────────────────────────────────────
const firebaseConfig = {
  apiKey: "AIzaSyBJjQArwfGWRWtiJ-uy5STiu1ZIROkH7OQ",
  authDomain: "handball-kasse.firebaseapp.com",
  projectId: "handball-kasse",
  storageBucket: "handball-kasse.firebasestorage.app",
  messagingSenderId: "275232257519",
  appId: "1:275232257519:web:4754493934b7f0173a321a",
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getFirestore(firebaseApp);

// ── Konstanten ───────────────────────────────────────────────
const APP_PASSWORD = "hsgherren33";
const AUTH_KEY = "handball_auth_v1";

const DEFAULT_GETRAENKE = [
  { name: "Cola",   preis: 1.00, emoji: "🥤" },
  { name: "Wasser", preis: 0.50, emoji: "💧" },
  { name: "Fanta",  preis: 1.00, emoji: "🍊" },
  { name: "Bier",   preis: 1.50, emoji: "🍺" },
  { name: "Kaffee", preis: 0.80, emoji: "☕" },
  { name: "Iso",    preis: 1.20, emoji: "⚡" },
];

const CATEGORIES = {
  getraenk: { label: "Getränk", emoji: "🥤", color: "#f48c06" },
  einnahme:  { label: "Einnahme", emoji: "💰", color: "#4ade80" },
  ausgabe:   { label: "Ausgabe",  emoji: "🛒", color: "#f87171" },
  spende:    { label: "Spende",   emoji: "🤝", color: "#60a5fa" },
};

const COLORS = ["#e85d04","#4ade80","#60a5fa","#f472b6","#a78bfa","#34d399","#fb923c","#38bdf8"];
const playerColor = (id) => COLORS[Math.abs(String(id).split("").reduce((a,c)=>a+c.charCodeAt(0),0)) % COLORS.length];
const avatar = (name) => name.trim().split(" ").map(w=>w[0]).join("").toUpperCase().slice(0,2);
const today  = () => new Date().toISOString().split("T")[0];
const fmtDate = (raw) => raw ? new Date(raw + "T12:00:00").toLocaleDateString("de-DE") : "";
const emojis  = ["🥤","🍺","☕","💧","🍊","⚡","🧃","🫖","🍵","🥛","🍋","🧊"];

const iStyle = {
  width:"100%", marginTop:8, padding:"13px 16px",
  background:"rgba(255,255,255,0.05)", border:"1px solid #2d3748",
  borderRadius:12, color:"#e2e8f0", fontSize:15, outline:"none", boxSizing:"border-box",
};

function save(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} }

// ══════════════════════════════════════════════════════════════
// LOGIN SCREEN
// ══════════════════════════════════════════════════════════════
function LoginScreen({ onLogin }) {
  const [input, setInput] = useState("");
  const [fehler, setFehler] = useState(false);
  const [shake,  setShake]  = useState(false);

  const tryLogin = () => {
    if (input === APP_PASSWORD) { save(AUTH_KEY, true); onLogin(); }
    else {
      setFehler(true); setShake(true); setInput("");
      setTimeout(() => setShake(false), 500);
    }
  };

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,#0f1923 0%,#1a2a3a 50%,#0f1923 100%)",
      display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center",
      fontFamily:"'Segoe UI',system-ui,sans-serif", color:"#e2e8f0", padding:32,
    }}>
      <style>{`@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-8px)}40%{transform:translateX(8px)}60%{transform:translateX(-6px)}80%{transform:translateX(6px)}}`}</style>
      <div style={{
        width:72, height:72, borderRadius:20, fontSize:36, marginBottom:20,
        background:"linear-gradient(135deg,#e85d04,#f48c06)",
        display:"flex", alignItems:"center", justifyContent:"center",
        boxShadow:"0 8px 30px rgba(232,93,4,0.4)",
      }}>🤾</div>
      <div style={{fontSize:22,fontWeight:800,marginBottom:6}}>Handball Kasse</div>
      <div style={{fontSize:13,color:"#94a3b8",marginBottom:36}}>HSG Herren — Bitte anmelden</div>
      <div style={{width:"100%",maxWidth:320,animation:shake?"shake 0.4s ease":"none"}}>
        <div style={{fontSize:11,color:"#94a3b8",fontWeight:700,marginBottom:8,letterSpacing:1}}>PASSWORT</div>
        <input type="password" placeholder="Passwort eingeben..." value={input}
          onChange={e=>{setInput(e.target.value);setFehler(false);}}
          onKeyDown={e=>e.key==="Enter"&&tryLogin()} autoFocus
          style={{...iStyle,marginTop:0,border:`2px solid ${fehler?"#f87171":"#2d3748"}`}} />
        {fehler && <div style={{color:"#f87171",fontSize:12,fontWeight:600,marginTop:8}}>❌ Falsches Passwort</div>}
        <button onClick={tryLogin} style={{
          width:"100%",marginTop:16,padding:"15px",
          background:"linear-gradient(135deg,#e85d04,#f48c06)",
          border:"none",borderRadius:14,color:"white",
          fontSize:15,fontWeight:800,cursor:"pointer",
          boxShadow:"0 6px 20px rgba(232,93,4,0.4)",
        }}>🔓 Anmelden</button>
      </div>
      <div style={{marginTop:40,fontSize:12,color:"#334155"}}>🔒 Geschützte Vereinskasse</div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// MAIN APP
// ══════════════════════════════════════════════════════════════
function MainApp({ onLogout }) {
  const [eintraege,  setEintraege]  = useState([]);
  const [spieler,    setSpieler]    = useState([]);
  const [getraenke,  setGetraenke]  = useState([]);
  const [loading,    setLoading]    = useState(true);

  const [tab,        setTab]        = useState("buchen");
  const [toast,      setToast]      = useState(null);

  const [gewSpieler, setGewSpieler] = useState(null);
  const [buchDatum,  setBuchDatum]  = useState(today());
  const [mForm,      setMForm]      = useState({ typ:"einnahme", betrag:"", beschreibung:"", person:"", datum:today() });
  const [neuerName,  setNeuerName]  = useState("");
  const [editSpieler,setEditSpieler]= useState(null);
  const [gForm,      setGForm]      = useState({ name:"", preis:"", emoji:"🥤" });
  const [editG,      setEditG]      = useState(null);
  const [vFilter,    setVFilter]    = useState("alle");
  const [vSpieler,   setVSpieler]   = useState("alle");

  const showToast = (msg) => { setToast(msg); setTimeout(()=>setToast(null),2400); };

  // ── Firestore Echtzeit-Listener ──────────────────────────
  useEffect(() => {
    let count = 0;
    const done = () => { count++; if (count >= 3) setLoading(false); };

    const u1 = onSnapshot(collection(db,"eintraege"),  snap => { setEintraege(snap.docs.map(d=>({id:d.id,...d.data()}))); done(); });
    const u2 = onSnapshot(collection(db,"spieler"),    snap => { setSpieler(snap.docs.map(d=>({id:d.id,...d.data()}))); done(); });
    const u3 = onSnapshot(collection(db,"getraenke"),  snap => {
      const list = snap.docs.map(d=>({id:d.id,...d.data()}));
      if (list.length === 0) {
        // Standardgetränke beim ersten Start anlegen
        DEFAULT_GETRAENKE.forEach(g => addDoc(collection(db,"getraenke"), g));
      }
      setGetraenke(list); done();
    });

    return () => { u1(); u2(); u3(); };
  }, []);

  // ── Schnell-Buchen ───────────────────────────────────────
  const buchGetraenk = async (g) => {
    if (!gewSpieler) return showToast("⚠️ Bitte erst einen Spieler auswählen!");
    const sp = spieler.find(s=>s.id===gewSpieler);
    await addDoc(collection(db,"eintraege"), {
      typ:"getraenk", betrag:g.preis,
      beschreibung:g.name, getraenkEmoji:g.emoji,
      person:sp.name, spielerId:sp.id,
      datum:fmtDate(buchDatum), datumRaw:buchDatum,
      zeit:new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}),
      ts: Date.now(),
    });
    showToast(`✅ ${g.emoji} ${g.name} für ${sp.name} gebucht!`);
  };

  // ── Manueller Eintrag ────────────────────────────────────
  const addManual = async () => {
    const betrag = parseFloat(mForm.betrag.replace(",","."));
    if (!betrag||betrag<=0) return showToast("Bitte gültigen Betrag eingeben!");
    if (!mForm.beschreibung.trim()) return showToast("Bitte Beschreibung eingeben!");
    await addDoc(collection(db,"eintraege"), {
      typ:mForm.typ, betrag,
      beschreibung:mForm.beschreibung.trim(),
      person:mForm.person.trim(),
      datum:fmtDate(mForm.datum), datumRaw:mForm.datum,
      zeit:new Date().toLocaleTimeString("de-DE",{hour:"2-digit",minute:"2-digit"}),
      ts: Date.now(),
    });
    setMForm(f=>({...f,betrag:"",beschreibung:"",person:"",datum:today()}));
    showToast("✅ Eintrag gespeichert!");
    setTab("verlauf");
  };

  // ── Spieler ──────────────────────────────────────────────
  const addSpieler = async () => {
    if (!neuerName.trim()) return showToast("Bitte Namen eingeben!");
    if (spieler.find(s=>s.name.toLowerCase()===neuerName.trim().toLowerCase()))
      return showToast("Spieler existiert bereits!");
    await addDoc(collection(db,"spieler"),{name:neuerName.trim()});
    setNeuerName(""); showToast("✅ Spieler hinzugefügt!");
  };
  const deleteSpieler = async (id) => { await deleteDoc(doc(db,"spieler",id)); showToast("🗑️ Spieler gelöscht"); };
  const saveEditSpieler = async () => {
    if (!editSpieler.name.trim()) return;
    await setDoc(doc(db,"spieler",editSpieler.id),{name:editSpieler.name.trim()});
    setEditSpieler(null); showToast("✅ Gespeichert");
  };

  // ── Getränke ─────────────────────────────────────────────
  const addGetraenk = async () => {
    const preis = parseFloat(gForm.preis.replace(",","."));
    if (!gForm.name.trim()||!preis||preis<=0) return showToast("Name und Preis erforderlich!");
    await addDoc(collection(db,"getraenke"),{name:gForm.name.trim(),preis,emoji:gForm.emoji});
    setGForm({name:"",preis:"",emoji:"🥤"}); showToast("✅ Getränk hinzugefügt!");
  };
  const deleteGetraenk = async (id) => { await deleteDoc(doc(db,"getraenke",id)); showToast("🗑️ Gelöscht"); };
  const saveEditG = async () => {
    const preis = parseFloat(String(editG.preis).replace(",","."));
    if (!editG.name.trim()||!preis) return;
    await setDoc(doc(db,"getraenke",editG.id),{name:editG.name.trim(),preis,emoji:editG.emoji});
    setEditG(null); showToast("✅ Gespeichert");
  };
  const deleteEintrag = async (id) => { await deleteDoc(doc(db,"eintraege",id)); showToast("🗑️ Gelöscht"); };

  // ── Statistiken ──────────────────────────────────────────
  const einnahmen   = eintraege.filter(e=>e.typ==="einnahme").reduce((s,e)=>s+e.betrag,0);
  const ausgaben    = eintraege.filter(e=>e.typ==="ausgabe").reduce((s,e)=>s+e.betrag,0);
  const spenden     = eintraege.filter(e=>e.typ==="spende").reduce((s,e)=>s+e.betrag,0);
  const getraenkSum = eintraege.filter(e=>e.typ==="getraenk").reduce((s,e)=>s+e.betrag,0);
  const kasse       = einnahmen + spenden + getraenkSum - ausgaben;

  const sortedEintraege = [...eintraege].sort((a,b)=>(b.ts||0)-(a.ts||0));
  const verlaufGefiltert = sortedEintraege
    .filter(e=>vFilter==="alle"||e.typ===vFilter)
    .filter(e=>vSpieler==="alle"||e.spielerId===vSpieler);

  if (loading) return (
    <div style={{
      minHeight:"100vh",background:"linear-gradient(160deg,#0f1923 0%,#1a2a3a 50%,#0f1923 100%)",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",
      fontFamily:"'Segoe UI',system-ui,sans-serif",color:"#e2e8f0",gap:16,
    }}>
      <div style={{fontSize:48}}>🤾</div>
      <div style={{fontSize:16,fontWeight:700}}>Verbinde mit Firebase...</div>
      <div style={{fontSize:13,color:"#64748b"}}>Daten werden geladen</div>
    </div>
  );

  return (
    <div style={{
      minHeight:"100vh",
      background:"linear-gradient(160deg,#0f1923 0%,#1a2a3a 50%,#0f1923 100%)",
      fontFamily:"'Segoe UI',system-ui,sans-serif",
      color:"#e2e8f0", maxWidth:480, margin:"0 auto", position:"relative",
    }}>

      {/* ── HEADER ── */}
      <div style={{
        background:"linear-gradient(135deg,#1e3a5f 0%,#0f2740 100%)",
        padding:"18px 20px 14px", borderBottom:"2px solid #2d5a8e",
        position:"sticky", top:0, zIndex:20,
      }}>
        <div style={{display:"flex",alignItems:"center",gap:12}}>
          <div style={{
            width:42,height:42,borderRadius:12,fontSize:20,flexShrink:0,
            background:"linear-gradient(135deg,#e85d04,#f48c06)",
            display:"flex",alignItems:"center",justifyContent:"center",
            boxShadow:"0 4px 15px rgba(232,93,4,0.4)",
          }}>🤾</div>
          <div>
            <div style={{fontSize:17,fontWeight:800}}>Handball Kasse</div>
            <div style={{fontSize:11,color:"#94a3b8"}}>🔴 Live · Echtzeit</div>
          </div>
          <div style={{
            marginLeft:"auto", textAlign:"right",
            background:kasse>=0?"rgba(74,222,128,0.15)":"rgba(248,113,113,0.15)",
            border:`1px solid ${kasse>=0?"#4ade80":"#f87171"}`,
            borderRadius:10, padding:"5px 11px",
          }}>
            <div style={{fontSize:10,color:"#94a3b8"}}>Kassenstand</div>
            <div style={{fontSize:17,fontWeight:800,color:kasse>=0?"#4ade80":"#f87171"}}>
              {kasse.toFixed(2)} €
            </div>
          </div>
          <button onClick={onLogout} title="Abmelden" style={{
            marginLeft:8,background:"rgba(255,255,255,0.05)",
            border:"1px solid #2d3748",color:"#64748b",
            borderRadius:9,padding:"7px 9px",fontSize:15,cursor:"pointer",flexShrink:0,
          }}>🔒</button>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div style={{paddingBottom:90}}>

        {/* ════ SCHNELL-BUCHEN ════ */}
        {tab==="buchen" && (
          <div style={{padding:20}}>
            <div style={{fontSize:12,color:"#94a3b8",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:14}}>⚡ Schnell-Buchen</div>

            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16,
              background:"rgba(255,255,255,0.04)",border:"1px solid #2d3748",
              borderRadius:12,padding:"10px 14px"}}>
              <span style={{fontSize:16}}>📅</span>
              <span style={{fontSize:13,color:"#94a3b8",fontWeight:600}}>Datum:</span>
              <input type="date" value={buchDatum} onChange={e=>setBuchDatum(e.target.value)}
                style={{background:"transparent",border:"none",color:"#e2e8f0",
                  fontSize:14,fontWeight:700,outline:"none",colorScheme:"dark",flex:1}} />
            </div>

            <div style={{fontSize:12,color:"#94a3b8",fontWeight:700,marginBottom:10}}>👤 SPIELER WÄHLEN</div>
            {spieler.length===0 ? (
              <div style={{textAlign:"center",color:"#475569",padding:"20px 0",fontSize:13}}>
                <div style={{fontSize:32,marginBottom:8}}>👥</div>
                Gehe zu <strong style={{color:"#f48c06"}}>Spieler</strong> um Spieler hinzuzufügen.
              </div>
            ) : (
              <div style={{display:"flex",flexWrap:"wrap",gap:8,marginBottom:20}}>
                {spieler.map(sp=>(
                  <button key={sp.id} onClick={()=>setGewSpieler(gewSpieler===sp.id?null:sp.id)} style={{
                    display:"flex",alignItems:"center",gap:8,
                    padding:"8px 14px",borderRadius:24,cursor:"pointer",
                    border:`2px solid ${gewSpieler===sp.id?playerColor(sp.id):"#2d3748"}`,
                    background:gewSpieler===sp.id?`${playerColor(sp.id)}22`:"rgba(255,255,255,0.03)",
                    color:gewSpieler===sp.id?playerColor(sp.id):"#94a3b8",
                    fontWeight:gewSpieler===sp.id?800:500,fontSize:14,transition:"all 0.15s",
                  }}>
                    <div style={{
                      width:28,height:28,borderRadius:"50%",background:playerColor(sp.id),
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:11,fontWeight:800,color:"#0f1923",flexShrink:0,
                    }}>{avatar(sp.name)}</div>
                    {sp.name.split(" ")[0]}
                  </button>
                ))}
              </div>
            )}

            <div style={{fontSize:12,color:"#94a3b8",fontWeight:700,marginBottom:10}}>🥤 GETRÄNK WÄHLEN</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
              {getraenke.map(g=>(
                <button key={g.id} onClick={()=>buchGetraenk(g)} style={{
                  padding:"14px 10px",borderRadius:14,cursor:"pointer",
                  border:`1px solid ${gewSpieler?"#f48c0644":"#2d3748"}`,
                  background:gewSpieler?"rgba(244,140,6,0.08)":"rgba(255,255,255,0.03)",
                  color:gewSpieler?"#e2e8f0":"#475569",
                  display:"flex",flexDirection:"column",alignItems:"center",gap:6,
                  transition:"all 0.15s",opacity:gewSpieler?1:0.5,
                }}>
                  <span style={{fontSize:26}}>{g.emoji}</span>
                  <span style={{fontSize:13,fontWeight:700}}>{g.name}</span>
                  <span style={{fontSize:13,color:"#f48c06",fontWeight:800}}>{g.preis.toFixed(2)} €</span>
                </button>
              ))}
            </div>

            {gewSpieler && (
              <div style={{
                marginTop:16,padding:"10px 14px",borderRadius:12,
                background:"rgba(244,140,6,0.1)",border:"1px solid #f48c0644",
                fontSize:13,color:"#f48c06",textAlign:"center",fontWeight:600,
              }}>
                ✅ {spieler.find(s=>s.id===gewSpieler)?.name} — Getränk antippen zum Buchen
              </div>
            )}
          </div>
        )}

        {/* ════ MANUELL ════ */}
        {tab==="neu" && (
          <div style={{padding:20}}>
            <div style={{fontSize:12,color:"#94a3b8",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:14}}>✏️ Manueller Eintrag</div>

            <div style={{display:"flex",gap:7,marginBottom:16}}>
              {Object.entries(CATEGORIES).map(([key,cat])=>(
                <button key={key} onClick={()=>setMForm(f=>({...f,typ:key}))} style={{
                  flex:1,padding:"10px 4px",borderRadius:11,cursor:"pointer",
                  border:`2px solid ${mForm.typ===key?cat.color:"#2d3748"}`,
                  background:mForm.typ===key?`${cat.color}20`:"rgba(255,255,255,0.03)",
                  color:mForm.typ===key?cat.color:"#64748b",
                  fontSize:11,fontWeight:700,
                  display:"flex",flexDirection:"column",alignItems:"center",gap:3,
                }}>
                  <span style={{fontSize:18}}>{cat.emoji}</span>{cat.label}
                </button>
              ))}
            </div>

            <label style={{fontSize:11,color:"#94a3b8",fontWeight:700}}>BETRAG (€)</label>
            <input type="number" inputMode="decimal" placeholder="0.00"
              value={mForm.betrag} onChange={e=>setMForm(f=>({...f,betrag:e.target.value}))} style={iStyle} />

            <label style={{fontSize:11,color:"#94a3b8",fontWeight:700,display:"block",marginTop:12}}>BESCHREIBUNG</label>
            <input type="text" placeholder="z.B. Trikots, Halle..."
              value={mForm.beschreibung} onChange={e=>setMForm(f=>({...f,beschreibung:e.target.value}))} style={iStyle} />

            <label style={{fontSize:11,color:"#94a3b8",fontWeight:700,display:"block",marginTop:12}}>PERSON (optional)</label>
            <input type="text" placeholder="z.B. Max Mustermann"
              value={mForm.person} onChange={e=>setMForm(f=>({...f,person:e.target.value}))} style={iStyle} />

            <label style={{fontSize:11,color:"#94a3b8",fontWeight:700,display:"block",marginTop:12}}>DATUM</label>
            <input type="date" value={mForm.datum} onChange={e=>setMForm(f=>({...f,datum:e.target.value}))}
              style={{...iStyle,colorScheme:"dark"}} />

            <button onClick={addManual} style={{
              width:"100%",marginTop:20,padding:"15px",
              background:"linear-gradient(135deg,#e85d04,#f48c06)",
              border:"none",borderRadius:14,color:"white",
              fontSize:15,fontWeight:800,cursor:"pointer",
              boxShadow:"0 6px 20px rgba(232,93,4,0.4)",
            }}>✅ Eintrag speichern</button>
          </div>
        )}

        {/* ════ VERLAUF ════ */}
        {tab==="verlauf" && (
          <div style={{padding:20}}>
            <div style={{fontSize:12,color:"#94a3b8",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:14}}>📋 Verlauf</div>

            <div style={{display:"flex",gap:6,marginBottom:8,flexWrap:"wrap"}}>
              {[["alle","Alle","📋"],["getraenk","Getränk","🥤"],["einnahme","Einnahme","💰"],["ausgabe","Ausgabe","🛒"],["spende","Spende","🤝"]].map(([k,l,e])=>(
                <button key={k} onClick={()=>setVFilter(k)} style={{
                  padding:"5px 11px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:600,
                  border:`1px solid ${vFilter===k?"#e85d04":"#2d3748"}`,
                  background:vFilter===k?"rgba(232,93,4,0.2)":"rgba(255,255,255,0.03)",
                  color:vFilter===k?"#f48c06":"#64748b",
                }}>{e} {l}</button>
              ))}
            </div>

            {spieler.length>0 && (
              <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap"}}>
                <button onClick={()=>setVSpieler("alle")} style={{
                  padding:"5px 11px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:600,
                  border:`1px solid ${vSpieler==="alle"?"#60a5fa":"#2d3748"}`,
                  background:vSpieler==="alle"?"rgba(96,165,250,0.2)":"rgba(255,255,255,0.03)",
                  color:vSpieler==="alle"?"#60a5fa":"#64748b",
                }}>👥 Alle</button>
                {spieler.map(sp=>(
                  <button key={sp.id} onClick={()=>setVSpieler(vSpieler===sp.id?"alle":sp.id)} style={{
                    padding:"5px 11px",borderRadius:20,cursor:"pointer",fontSize:12,fontWeight:600,
                    border:`1px solid ${vSpieler===sp.id?playerColor(sp.id):"#2d3748"}`,
                    background:vSpieler===sp.id?`${playerColor(sp.id)}22`:"rgba(255,255,255,0.03)",
                    color:vSpieler===sp.id?playerColor(sp.id):"#64748b",
                  }}>{sp.name.split(" ")[0]}</button>
                ))}
              </div>
            )}

            {verlaufGefiltert.length===0 ? (
              <div style={{textAlign:"center",color:"#475569",padding:"40px 0",fontSize:14}}>
                <div style={{fontSize:38,marginBottom:8}}>📭</div>Keine Einträge
              </div>
            ) : verlaufGefiltert.map(e=>(
              <div key={e.id} style={{
                background:"rgba(255,255,255,0.03)",
                border:`1px solid ${CATEGORIES[e.typ]?.color}25`,
                borderLeft:`3px solid ${CATEGORIES[e.typ]?.color}`,
                borderRadius:12,padding:"12px 14px",marginBottom:9,
                display:"flex",alignItems:"center",gap:11,
              }}>
                <div style={{fontSize:20}}>{e.getraenkEmoji||CATEGORIES[e.typ]?.emoji}</div>
                <div style={{flex:1,minWidth:0}}>
                  <div style={{fontWeight:700,fontSize:14,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{e.beschreibung}</div>
                  {e.person&&<div style={{fontSize:12,color:"#94a3b8",marginTop:2}}>👤 {e.person}</div>}
                  <div style={{fontSize:11,color:"#475569",marginTop:2}}>📅 {e.datum} • {e.zeit}</div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{fontSize:15,fontWeight:800,color:CATEGORIES[e.typ]?.color}}>
                    {e.typ==="ausgabe"?"-":"+"}{e.betrag.toFixed(2)} €
                  </div>
                  <button onClick={()=>deleteEintrag(e.id)} style={{
                    marginTop:4,background:"rgba(248,113,113,0.1)",
                    border:"1px solid rgba(248,113,113,0.3)",color:"#f87171",
                    borderRadius:6,padding:"3px 8px",fontSize:11,cursor:"pointer",
                  }}>🗑️</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ════ ÜBERSICHT ════ */}
        {tab==="übersicht" && (
          <div style={{padding:20}}>
            <div style={{fontSize:12,color:"#94a3b8",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:14}}>📊 Übersicht</div>

            {[
              {label:"Getränke-Einnahmen",value:getraenkSum,emoji:"🥤",color:"#f48c06",bg:"rgba(244,140,6,0.08)",key:"getraenk"},
              {label:"Einnahmen",value:einnahmen,emoji:"💰",color:"#4ade80",bg:"rgba(74,222,128,0.08)",key:"einnahme"},
              {label:"Ausgaben",value:ausgaben,emoji:"🛒",color:"#f87171",bg:"rgba(248,113,113,0.08)",key:"ausgabe"},
              {label:"Spenden",value:spenden,emoji:"🤝",color:"#60a5fa",bg:"rgba(96,165,250,0.08)",key:"spende"},
            ].map(stat=>(
              <div key={stat.key} style={{
                background:stat.bg,border:`1px solid ${stat.color}30`,
                borderRadius:13,padding:"14px 16px",marginBottom:10,
                display:"flex",alignItems:"center",gap:12,
              }}>
                <div style={{width:44,height:44,borderRadius:11,background:`${stat.color}20`,
                  display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>{stat.emoji}</div>
                <div>
                  <div style={{fontSize:12,color:"#94a3b8"}}>{stat.label}</div>
                  <div style={{fontSize:21,fontWeight:800,color:stat.color}}>{stat.value.toFixed(2)} €</div>
                </div>
                <div style={{marginLeft:"auto",fontSize:12,color:"#64748b"}}>
                  {eintraege.filter(e=>e.typ===stat.key).length} ×
                </div>
              </div>
            ))}

            <div style={{
              background:"linear-gradient(135deg,#1e3a5f,#0f2740)",
              border:"2px solid #2d5a8e",borderRadius:15,padding:"18px 16px",marginTop:4,
              display:"flex",alignItems:"center",justifyContent:"space-between",
            }}>
              <div>
                <div style={{fontSize:12,color:"#94a3b8"}}>Kassenstand gesamt</div>
                <div style={{fontSize:26,fontWeight:900,color:kasse>=0?"#4ade80":"#f87171",marginTop:4}}>
                  {kasse>=0?"+":""}{kasse.toFixed(2)} €
                </div>
              </div>
              <div style={{fontSize:34}}>{kasse>=0?"✅":"⚠️"}</div>
            </div>

            {spieler.length>0 && (
              <>
                <div style={{fontSize:12,color:"#94a3b8",fontWeight:700,letterSpacing:1,textTransform:"uppercase",margin:"20px 0 10px"}}>🏆 Top-Trinker</div>
                {spieler.map(sp=>{
                  const sum=eintraege.filter(e=>e.typ==="getraenk"&&e.spielerId===sp.id).reduce((s,e)=>s+e.betrag,0);
                  const anz=eintraege.filter(e=>e.typ==="getraenk"&&e.spielerId===sp.id).length;
                  return {sp,sum,anz};
                }).sort((a,b)=>b.sum-a.sum).map(({sp,sum,anz})=>(
                  <div key={sp.id} style={{
                    display:"flex",alignItems:"center",gap:12,
                    padding:"10px 14px",borderRadius:12,marginBottom:8,
                    background:"rgba(255,255,255,0.03)",border:`1px solid ${playerColor(sp.id)}25`,
                  }}>
                    <div style={{
                      width:36,height:36,borderRadius:"50%",background:playerColor(sp.id),
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:13,fontWeight:800,color:"#0f1923",
                    }}>{avatar(sp.name)}</div>
                    <div style={{flex:1}}>
                      <div style={{fontWeight:700,fontSize:14}}>{sp.name}</div>
                      <div style={{fontSize:11,color:"#64748b"}}>{anz} Getränke</div>
                    </div>
                    <div style={{fontWeight:800,color:playerColor(sp.id),fontSize:15}}>{sum.toFixed(2)} €</div>
                  </div>
                ))}
              </>
            )}
          </div>
        )}

        {/* ════ SPIELER ════ */}
        {tab==="spieler" && (
          <div style={{padding:20}}>
            <div style={{fontSize:12,color:"#94a3b8",fontWeight:700,letterSpacing:1,textTransform:"uppercase",marginBottom:14}}>👥 Spieler verwalten</div>

            <div style={{display:"flex",gap:8,marginBottom:20}}>
              <input type="text" placeholder="Name eingeben..."
                value={neuerName} onChange={e=>setNeuerName(e.target.value)}
                onKeyDown={e=>e.key==="Enter"&&addSpieler()}
                style={{...iStyle,marginTop:0,flex:1}} />
              <button onClick={addSpieler} style={{
                padding:"0 18px",background:"linear-gradient(135deg,#e85d04,#f48c06)",
                border:"none",borderRadius:12,color:"white",fontWeight:800,fontSize:20,cursor:"pointer",flexShrink:0,
              }}>+</button>
            </div>

            {spieler.length===0 ? (
              <div style={{textAlign:"center",color:"#475569",padding:"30px 0",fontSize:14}}>
                <div style={{fontSize:38,marginBottom:8}}>👥</div>Noch keine Spieler
              </div>
            ) : spieler.map(sp=>(
              <div key={sp.id}>
                {editSpieler?.id===sp.id ? (
                  <div style={{display:"flex",gap:8,marginBottom:8}}>
                    <input value={editSpieler.name} onChange={e=>setEditSpieler(s=>({...s,name:e.target.value}))}
                      style={{...iStyle,marginTop:0,flex:1}} />
                    <button onClick={saveEditSpieler} style={{padding:"0 14px",background:"#4ade8022",border:"1px solid #4ade80",color:"#4ade80",borderRadius:10,cursor:"pointer",fontWeight:700}}>✓</button>
                    <button onClick={()=>setEditSpieler(null)} style={{padding:"0 12px",background:"rgba(255,255,255,0.05)",border:"1px solid #2d3748",color:"#94a3b8",borderRadius:10,cursor:"pointer"}}>✕</button>
                  </div>
                ) : (
                  <div style={{
                    display:"flex",alignItems:"center",gap:12,
                    padding:"12px 14px",borderRadius:12,marginBottom:8,
                    background:"rgba(255,255,255,0.03)",border:`1px solid ${playerColor(sp.id)}25`,
                  }}>
                    <div style={{
                      width:38,height:38,borderRadius:"50%",background:playerColor(sp.id),
                      display:"flex",alignItems:"center",justifyContent:"center",
                      fontSize:13,fontWeight:800,color:"#0f1923",
                    }}>{avatar(sp.name)}</div>
                    <div style={{flex:1,fontWeight:700}}>{sp.name}</div>
                    <div style={{fontSize:12,color:"#64748b",marginRight:4}}>
                      {eintraege.filter(e=>e.spielerId===sp.id).length} Buchungen
                    </div>
                    <button onClick={()=>setEditSpieler(sp)} style={{background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.3)",color:"#60a5fa",borderRadius:7,padding:"4px 9px",fontSize:12,cursor:"pointer"}}>✏️</button>
                    <button onClick={()=>deleteSpieler(sp.id)} style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",color:"#f87171",borderRadius:7,padding:"4px 9px",fontSize:12,cursor:"pointer"}}>🗑️</button>
                  </div>
                )}
              </div>
            ))}

            {/* Getränke verwalten */}
            <div style={{fontSize:12,color:"#94a3b8",fontWeight:700,letterSpacing:1,textTransform:"uppercase",margin:"24px 0 14px"}}>🥤 Getränke verwalten</div>

            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:10}}>
              {emojis.map(em=>(
                <button key={em} onClick={()=>setGForm(f=>({...f,emoji:em}))} style={{
                  fontSize:20,background:gForm.emoji===em?"rgba(244,140,6,0.2)":"rgba(255,255,255,0.03)",
                  border:`1px solid ${gForm.emoji===em?"#f48c06":"#2d3748"}`,
                  borderRadius:8,padding:"4px 7px",cursor:"pointer",
                }}>{em}</button>
              ))}
            </div>
            <div style={{display:"flex",gap:8,marginBottom:8}}>
              <input type="text" placeholder="Name" value={gForm.name}
                onChange={e=>setGForm(f=>({...f,name:e.target.value}))}
                style={{...iStyle,marginTop:0,flex:2}} />
              <input type="number" placeholder="€" value={gForm.preis}
                onChange={e=>setGForm(f=>({...f,preis:e.target.value}))}
                style={{...iStyle,marginTop:0,flex:1}} />
              <button onClick={addGetraenk} style={{
                padding:"0 16px",background:"linear-gradient(135deg,#e85d04,#f48c06)",
                border:"none",borderRadius:12,color:"white",fontWeight:800,fontSize:20,cursor:"pointer",flexShrink:0,
              }}>+</button>
            </div>

            {getraenke.map(g=>(
              <div key={g.id}>
                {editG?.id===g.id ? (
                  <div style={{display:"flex",gap:7,marginBottom:8,alignItems:"center"}}>
                    <span style={{fontSize:20}}>{editG.emoji}</span>
                    <input value={editG.name} onChange={e=>setEditG(x=>({...x,name:e.target.value}))}
                      style={{...iStyle,marginTop:0,flex:2}} />
                    <input type="number" value={editG.preis} onChange={e=>setEditG(x=>({...x,preis:e.target.value}))}
                      style={{...iStyle,marginTop:0,flex:1}} />
                    <button onClick={saveEditG} style={{padding:"0 12px",background:"#4ade8022",border:"1px solid #4ade80",color:"#4ade80",borderRadius:10,cursor:"pointer",fontWeight:700,height:48}}>✓</button>
                    <button onClick={()=>setEditG(null)} style={{padding:"0 10px",background:"rgba(255,255,255,0.05)",border:"1px solid #2d3748",color:"#94a3b8",borderRadius:10,cursor:"pointer",height:48}}>✕</button>
                  </div>
                ) : (
                  <div style={{
                    display:"flex",alignItems:"center",gap:10,
                    padding:"10px 14px",borderRadius:12,marginBottom:8,
                    background:"rgba(255,255,255,0.03)",border:"1px solid #f48c0622",
                  }}>
                    <span style={{fontSize:20}}>{g.emoji}</span>
                    <span style={{flex:1,fontWeight:700}}>{g.name}</span>
                    <span style={{color:"#f48c06",fontWeight:800}}>{g.preis.toFixed(2)} €</span>
                    <button onClick={()=>setEditG(g)} style={{background:"rgba(96,165,250,0.1)",border:"1px solid rgba(96,165,250,0.3)",color:"#60a5fa",borderRadius:7,padding:"4px 9px",fontSize:12,cursor:"pointer"}}>✏️</button>
                    <button onClick={()=>deleteGetraenk(g.id)} style={{background:"rgba(248,113,113,0.1)",border:"1px solid rgba(248,113,113,0.3)",color:"#f87171",borderRadius:7,padding:"4px 9px",fontSize:12,cursor:"pointer"}}>🗑️</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={{
        position:"fixed",bottom:0,left:"50%",transform:"translateX(-50%)",
        width:"100%",maxWidth:480,
        background:"rgba(15,25,35,0.97)",backdropFilter:"blur(20px)",
        borderTop:"1px solid #1e3a5f",display:"flex",padding:"8px 0 20px",zIndex:20,
      }}>
        {[["buchen","⚡","Buchen"],["neu","✏️","Manuell"],["übersicht","📊","Übersicht"],["verlauf","📋","Verlauf"],["spieler","👥","Spieler"]].map(([key,emoji,label])=>(
          <button key={key} onClick={()=>setTab(key)} style={{
            flex:1,background:"none",border:"none",
            color:tab===key?"#f48c06":"#475569",
            cursor:"pointer",padding:"6px 0",
            display:"flex",flexDirection:"column",alignItems:"center",gap:3,
          }}>
            <div style={{fontSize:18}}>{emoji}</div>
            <div style={{fontSize:10,fontWeight:tab===key?700:400}}>{label}</div>
          </button>
        ))}
      </div>

      {/* ── TOAST ── */}
      {toast && (
        <div style={{
          position:"fixed",top:76,left:"50%",transform:"translateX(-50%)",
          background:"#1e3a5f",border:"1px solid #2d5a8e",
          color:"#e2e8f0",padding:"11px 22px",borderRadius:12,
          fontSize:13,fontWeight:700,zIndex:100,
          boxShadow:"0 8px 30px rgba(0,0,0,0.5)",whiteSpace:"nowrap",
        }}>{toast}</div>
      )}
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
// ROOT
// ══════════════════════════════════════════════════════════════
export default function App() {
  const [authed, setAuthed] = useState(() => {
    try { return localStorage.getItem(AUTH_KEY) === "true"; } catch { return false; }
  });
  if (!authed) return <LoginScreen onLogin={()=>setAuthed(true)} />;
  return <MainApp onLogout={()=>{ save(AUTH_KEY,false); setAuthed(false); }} />;
}
