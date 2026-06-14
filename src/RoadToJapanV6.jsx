import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { createClient } from "@supabase/supabase-js";

// ── Supabase config — replace these two values ────────────────────────────────
const SUPABASE_URL = "https://bkwymphopesxwvfydvrn.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJrd3ltcGhvcGVzeHd2ZnlkdnJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEzOTgxNjYsImV4cCI6MjA5Njk3NDE2Nn0.Pon0x6widY27T-mEFynPkyy3uNYNdGRmZxEdcgu9jH4";
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Constants ─────────────────────────────────────────────────────────────────
const INDIVIDUAL_GOAL = 2000;
const MONTHLY_TARGET = 125;
const TARGET_DATE = new Date("2027-10-01");
const MS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const DEFAULT_MEMBERS = ["Hakim","Syafiq","Ikhwan","Isma","Shasha","Kent","Mustafa"];
const COLORS = ["#DC143C","#FFD700","#4FC3F7","#FF8A65","#CE93D8","#4ade80","#F472B6","#60a5fa","#fb923c","#a3e635"];

const today = () => new Date().toISOString().slice(0, 10);
const cmk = () => { const n = new Date(); return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`; };
const daysTo = d => Math.max(0, Math.ceil((d - new Date()) / 86400000));
const monthsTo = d => { const n = new Date(); return Math.max(0,(d.getFullYear()-n.getFullYear())*12+d.getMonth()-n.getMonth()); };
const fmtDate = iso => { if (!iso) return ""; const [y,m,d] = iso.split("-"); return `${d} ${MS[+m-1]} ${y}`; };
const mColor = i => COLORS[i % COLORS.length];

// ── Petals ────────────────────────────────────────────────────────────────────
function Petals() {
  const ref = useRef(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d");
    let W, H, raf;
    const resize = () => { W = c.width = c.offsetWidth; H = c.height = c.offsetHeight; };
    resize();
    const ps = Array.from({length:20}, () => ({
      x:Math.random()*1000, y:Math.random()*-600,
      r:2+Math.random()*4, vy:0.3+Math.random()*0.6,
      vx:(Math.random()-.5)*.4, rot:Math.random()*Math.PI*2,
      rv:(Math.random()-.5)*.02, a:0.2+Math.random()*.4,
    }));
    const draw = () => {
      ctx.clearRect(0,0,W,H);
      ps.forEach(p => {
        ctx.save(); ctx.globalAlpha=p.a; ctx.translate(p.x,p.y); ctx.rotate(p.rot);
        for (let i=0;i<5;i++) {
          const a=(i/5)*Math.PI*2-Math.PI/2;
          ctx.beginPath();
          ctx.ellipse(Math.cos(a)*p.r*.5,Math.sin(a)*p.r,p.r*.38,p.r*.6,a,0,Math.PI*2);
          ctx.fillStyle="#FFB7C5"; ctx.fill();
        }
        ctx.restore();
        p.y+=p.vy; p.x+=p.vx; p.rot+=p.rv;
        if(p.y>H+20){p.y=-20;p.x=Math.random()*W;}
      });
      raf=requestAnimationFrame(draw);
    };
    draw();
    window.addEventListener("resize",resize);
    return ()=>{cancelAnimationFrame(raf);window.removeEventListener("resize",resize);};
  },[]);
  return <canvas ref={ref} style={{position:"fixed",inset:0,width:"100%",height:"100%",pointerEvents:"none",zIndex:0,opacity:.45}}/>;
}

// ── Atoms ─────────────────────────────────────────────────────────────────────
const PBar = ({pct,h=8,color="#DC143C"}) => (
  <div style={{background:"#080c18",borderRadius:99,height:h,overflow:"hidden",border:"1px solid rgba(255,255,255,0.06)"}}>
    <div style={{width:`${Math.min(100,Math.max(0,pct))}%`,height:"100%",background:`linear-gradient(90deg,${color}99,${color})`,borderRadius:99,transition:"width .7s ease",boxShadow:`0 0 8px ${color}55`}}/>
  </div>
);

const Toast = ({msg,type}) => msg ? (
  <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:type==="err"?"#3f0a0a":"#0a2f12",border:`1px solid ${type==="err"?"#DC143C":"#16a34a"}`,color:"#fff",borderRadius:12,padding:"10px 22px",zIndex:9999,fontSize:13,fontWeight:700,boxShadow:"0 8px 32px #0008",whiteSpace:"nowrap"}}>{msg}</div>
) : null;

const Spinner = () => (
  <div style={{display:"flex",alignItems:"center",justifyContent:"center",padding:60,flexDirection:"column",gap:14}}>
    <div style={{width:36,height:36,borderRadius:"50%",border:"3px solid rgba(220,20,60,0.2)",borderTopColor:"#DC143C",animation:"spin 0.8s linear infinite"}}/>
    <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    <div style={{fontSize:13,color:"#5a6a8a"}}>Loading data...</div>
  </div>
);

const Inp = ({style,...p}) => <input style={{background:"#080c18",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 14px",color:"#fff",fontSize:14,outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box",...style}} {...p}/>;
const Sel = ({children,...p}) => <select style={{background:"#080c18",border:"1px solid rgba(255,255,255,0.1)",borderRadius:10,padding:"10px 14px",color:"#fff",fontSize:14,outline:"none",fontFamily:"inherit",width:"100%",boxSizing:"border-box"}} {...p}>{children}</select>;
const Lbl = ({children}) => <div style={{fontSize:10,color:"#5a6a8a",textTransform:"uppercase",letterSpacing:1.5,marginBottom:5,fontWeight:700}}>{children}</div>;

const Btn = ({children,style,v="primary",loading,...p}) => {
  const vs={
    primary:{background:"linear-gradient(135deg,#DC143C,#ff3355)",color:"#fff",boxShadow:"0 4px 18px #DC143C33"},
    ghost:{background:"rgba(255,255,255,0.06)",color:"#8a9ab8",border:"1px solid rgba(255,255,255,0.1)"},
    danger:{background:"rgba(220,20,60,0.15)",color:"#DC143C",border:"1px solid rgba(220,20,60,0.25)"},
    green:{background:"linear-gradient(135deg,#16a34a,#22c55e)",color:"#fff"},
    wa:{background:"linear-gradient(135deg,#25D366,#128C7E)",color:"#fff"},
  };
  return <button disabled={loading} style={{border:"none",borderRadius:10,padding:"10px 16px",fontWeight:700,fontSize:13,cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",opacity:loading?.6:1,transition:"opacity .15s",...vs[v],...style}} {...p}>{loading?"⏳ Saving...":children}</button>;
};

// ── Modal ─────────────────────────────────────────────────────────────────────
function Modal({title,onClose,children}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.78)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{background:"#0e1428",border:"1px solid rgba(220,20,60,0.28)",borderRadius:20,padding:"24px",width:"100%",maxWidth:420,maxHeight:"90vh",overflowY:"auto",boxShadow:"0 24px 64px #000b"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
          <div style={{fontWeight:800,fontSize:17,color:"#fff"}}>{title}</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,width:30,height:30,color:"#fff",cursor:"pointer",fontSize:15,display:"flex",alignItems:"center",justifyContent:"center"}}>✕</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Confirm({msg,onYes,onNo,loading}) {
  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",zIndex:1100,display:"flex",alignItems:"center",justifyContent:"center",padding:16}}>
      <div style={{background:"#0e1428",border:"1px solid rgba(220,20,60,0.38)",borderRadius:18,padding:"28px 24px",maxWidth:320,width:"100%",textAlign:"center",boxShadow:"0 24px 64px #000b"}}>
        <div style={{fontSize:36,marginBottom:12}}>⚠️</div>
        <div style={{color:"#fff",fontWeight:700,fontSize:15,marginBottom:20,lineHeight:1.5}}>{msg}</div>
        <div style={{display:"flex",gap:10}}>
          <Btn v="ghost" style={{flex:1}} onClick={onNo} disabled={loading}>Cancel</Btn>
          <Btn v="danger" style={{flex:1}} onClick={onYes} loading={loading}>Delete</Btn>
        </div>
      </div>
    </div>
  );
}

function ContribForm({members,initial,onSave,onCancel,saving}) {
  const [f,setF] = useState(initial||{member:members[0]||"",amount:125,date:today(),notes:""});
  const upd = k => e => setF(p=>({...p,[k]:e.target.value}));
  const save = () => { const a=parseFloat(f.amount); if(!f.member||isNaN(a)||a<=0) return; onSave({...f,amount:a}); };
  return (
    <div style={{display:"flex",flexDirection:"column",gap:13}}>
      <div><Lbl>Member</Lbl><Sel value={f.member} onChange={upd("member")}>{members.map(m=><option key={m} value={m}>{m}</option>)}</Sel></div>
      <div><Lbl>Amount (BND)</Lbl><Inp type="number" min="1" value={f.amount} onChange={upd("amount")}/></div>
      <div><Lbl>Date</Lbl><Inp type="date" value={f.date} onChange={upd("date")}/></div>
      <div><Lbl>Notes (optional)</Lbl><Inp placeholder="e.g. Monthly savings" value={f.notes} onChange={upd("notes")}/></div>
      <div style={{display:"flex",gap:9,marginTop:4}}>
        <Btn style={{flex:1}} onClick={save} loading={saving}>{initial?"Update":"Add Contribution"}</Btn>
        <Btn v="ghost" onClick={onCancel} disabled={saving}>Cancel</Btn>
      </div>
    </div>
  );
}

const SH = ({children,a="#DC143C",b="#FF8A65"}) => (
  <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:14}}>
    <div style={{width:3,height:16,background:`linear-gradient(${a},${b})`,borderRadius:99}}/>
    <span style={{fontSize:11,fontWeight:800,color:"#6a7a9a",textTransform:"uppercase",letterSpacing:2}}>{children}</span>
  </div>
);

// ── App ───────────────────────────────────────────────────────────────────────
export default function App() {
  const [members, setMembers] = useState(DEFAULT_MEMBERS);
  const [contribs, setContribs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState("dashboard");

  const [modal, setModal] = useState(null);
  const [editC, setEditC] = useState(null);
  const [editMIdx, setEditMIdx] = useState(null);
  const [editMName, setEditMName] = useState("");
  const [newMName, setNewMName] = useState("");
  const [confirm, setConfirm] = useState(null);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [copied, setCopied] = useState(false);

  const say = useCallback((msg,type="ok")=>{ setToast({msg,type}); setTimeout(()=>setToast(null),2800); },[]);

  // ── Load data from Supabase ────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: mData }, { data: cData }] = await Promise.all([
        supabase.from("members").select("*").order("created_at"),
        supabase.from("contributions").select("*").order("date", { ascending: false }),
      ]);
      if (mData && mData.length > 0) setMembers(mData.map(m => m.name));
      else {
        // Seed default members on first load
        const inserts = DEFAULT_MEMBERS.map(name => ({ name }));
        await supabase.from("members").insert(inserts);
        setMembers(DEFAULT_MEMBERS);
      }
      if (cData) setContribs(cData);
    } catch (e) {
      say("Failed to load data. Check Supabase config.", "err");
    }
    setLoading(false);
  }, [say]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Realtime subscription ─────────────────────────────────────────────────
  useEffect(() => {
    const ch = supabase
      .channel("rtj-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "contributions" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "members" }, () => fetchAll())
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [fetchAll]);

  // ── Derived ────────────────────────────────────────────────────────────────
  const CUR = cmk();
  const colorOf = useMemo(() => { const m={}; members.forEach((n,i) => m[n]=mColor(i)); return m; }, [members]);

  const stats = useMemo(() =>
    members.map(name => {
      const all = contribs.filter(c => c.member === name);
      const total = all.reduce((s,c) => s+c.amount, 0);
      const thisMonth = all.filter(c => c.date?.startsWith(CUR)).reduce((s,c) => s+c.amount, 0);
      return { name, total, thisMonth, count: all.length, pct: Math.min(100,(total/INDIVIDUAL_GOAL)*100) };
    }).sort((a,b) => b.total - a.total)
  , [members, contribs, CUR]);

  const groupTotal = stats.reduce((s,m) => s+m.total, 0);
  const GROUP_GOAL = INDIVIDUAL_GOAL * members.length;
  const groupPct = GROUP_GOAL > 0 ? Math.min(100,(groupTotal/GROUP_GOAL)*100) : 0;
  const groupRemain = Math.max(0, GROUP_GOAL - groupTotal);
  const thisMonthGroup = stats.reduce((s,m) => s+m.thisMonth, 0);

  // ── CRUD (Supabase) ────────────────────────────────────────────────────────
  const addC = async (f) => {
    setSaving(true);
    const { error } = await supabase.from("contributions").insert([{ member: f.member, amount: f.amount, date: f.date, notes: f.notes }]);
    setSaving(false);
    if (error) { say("Failed to save. Try again.", "err"); return; }
    setModal(null);
    say("Added! 🌸");
  };

  const updC = async (f) => {
    setSaving(true);
    const { error } = await supabase.from("contributions").update({ member: f.member, amount: f.amount, date: f.date, notes: f.notes }).eq("id", editC.id);
    setSaving(false);
    if (error) { say("Failed to update.", "err"); return; }
    setModal(null); setEditC(null);
    say("Updated ✏️");
  };

  const delC = async (id) => {
    setConfirmLoading(true);
    const { error } = await supabase.from("contributions").delete().eq("id", id);
    setConfirmLoading(false);
    if (error) { say("Failed to delete.", "err"); return; }
    setConfirm(null);
    say("Deleted", "err");
  };

  const addM = async () => {
    const n = newMName.trim();
    if (!n || members.includes(n)) { say("Invalid or duplicate name", "err"); return; }
    setSaving(true);
    const { error } = await supabase.from("members").insert([{ name: n }]);
    setSaving(false);
    if (error) { say("Failed to add member.", "err"); return; }
    setModal(null); setNewMName("");
    say(`${n} added! 👤`);
  };

  const updM = async () => {
    const n = editMName.trim();
    if (!n) return;
    const old = members[editMIdx];
    setSaving(true);
    // Update member name and all their contributions
    await Promise.all([
      supabase.from("members").update({ name: n }).eq("name", old),
      supabase.from("contributions").update({ member: n }).eq("member", old),
    ]);
    setSaving(false);
    setModal(null);
    say("Renamed ✏️");
  };

  const delM = async (name) => {
    setConfirmLoading(true);
    await Promise.all([
      supabase.from("members").delete().eq("name", name),
      supabase.from("contributions").delete().eq("member", name),
    ]);
    setConfirmLoading(false);
    setConfirm(null);
    say(`${name} removed`, "err");
  };

  const share = () => {
    const medals = ["🥇","🥈","🥉"];
    const lb = stats.slice(0,3).map((m,i) => `${medals[i]} ${m.name} - BND ${m.total}`).join("\n");
    const txt = ["📊 ROAD TO JAPAN UPDATE 🇯🇵","",`👥 ${members.length} members · BND ${INDIVIDUAL_GOAL} goal each`,`💴 Total Saved: BND ${groupTotal}`,`📈 Progress: ${groupPct.toFixed(1)}%`,`⏳ Remaining: BND ${groupRemain}`,`📅 Target: October 2027 (${daysTo(TARGET_DATE)} days)`,`💸 Monthly: BND ${MONTHLY_TARGET}/member`,"","🏆 Top Savers:",lb,"","がんばろう！ Let's go! 🌸⛩️🗻"].join("\n");
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); say("Copied! 📋"); setTimeout(()=>setCopied(false),3000); });
  };

  const TABS = [
    {id:"dashboard",icon:"📊",label:"Dashboard"},
    {id:"members",icon:"👥",label:"Members"},
    {id:"manage",icon:"⚙️",label:"Manage"},
  ];

  const card = {background:"linear-gradient(145deg,#0e1428,#131b35)",border:"1px solid rgba(255,255,255,0.07)",borderRadius:18,padding:"20px"};

  return (
    <div style={{minHeight:"100vh",background:"linear-gradient(160deg,#060912,#09101f 60%,#0c0818)",color:"#dde3f0",fontFamily:"'Inter',-apple-system,sans-serif",position:"relative"}}>
      <Petals/>
      <Toast msg={toast?.msg} type={toast?.type}/>
      {confirm && <Confirm msg={confirm.msg} onYes={confirm.onYes} onNo={()=>setConfirm(null)} loading={confirmLoading}/>}

      {modal==="addC" && <Modal title="➕ Add Contribution" onClose={()=>setModal(null)}><ContribForm members={members} onSave={addC} onCancel={()=>setModal(null)} saving={saving}/></Modal>}
      {modal==="editC" && editC && <Modal title="✏️ Edit Contribution" onClose={()=>{setModal(null);setEditC(null);}}><ContribForm members={members} initial={editC} onSave={updC} onCancel={()=>{setModal(null);setEditC(null);}} saving={saving}/></Modal>}
      {modal==="addM" && <Modal title="👤 Add Member" onClose={()=>setModal(null)}>
        <Lbl>Name</Lbl>
        <Inp placeholder="Enter name" value={newMName} onChange={e=>setNewMName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addM()} style={{marginBottom:14}}/>
        <div style={{display:"flex",gap:9}}><Btn style={{flex:1}} onClick={addM} loading={saving}>Add Member</Btn><Btn v="ghost" onClick={()=>setModal(null)} disabled={saving}>Cancel</Btn></div>
      </Modal>}
      {modal==="editM" && <Modal title="✏️ Rename Member" onClose={()=>setModal(null)}>
        <Lbl>New Name</Lbl>
        <Inp value={editMName} onChange={e=>setEditMName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&updM()} style={{marginBottom:14}}/>
        <div style={{display:"flex",gap:9}}><Btn style={{flex:1}} onClick={updM} loading={saving}>Save</Btn><Btn v="ghost" onClick={()=>setModal(null)} disabled={saving}>Cancel</Btn></div>
      </Modal>}

      {/* HEADER */}
      <div style={{padding:"30px 16px 0",textAlign:"center",position:"relative",zIndex:1}}>
        <div style={{display:"inline-block",background:"rgba(220,20,60,.12)",border:"1px solid rgba(220,20,60,.3)",borderRadius:99,padding:"3px 16px",marginBottom:10}}>
          <span style={{fontSize:10,fontWeight:800,color:"#FF6B8A",letterSpacing:2,textTransform:"uppercase"}}>🌸 Group Savings Tracker</span>
        </div>
        <h1 style={{margin:"0 0 4px",fontSize:"clamp(26px,6vw,44px)",fontWeight:900,background:"linear-gradient(135deg,#fff,#FFB7C5 45%,#DC143C)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",lineHeight:1.05}}>Road to Japan 🇯🇵</h1>
        <p style={{fontSize:13,color:"#5a6a8a",margin:"0 0 20px"}}>{members.length} members · BND {INDIVIDUAL_GOAL.toLocaleString()} each · October 2027</p>

        <div style={{maxWidth:620,margin:"0 auto 24px",...card,border:"1px solid rgba(220,20,60,.22)"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
            <span style={{fontSize:12,color:"#5a6a8a"}}>Group Progress</span>
            <span style={{fontWeight:900,color:"#DC143C",fontSize:16}}>BND {groupTotal.toLocaleString()} <span style={{color:"#5a6a8a",fontWeight:400,fontSize:12}}>/ {GROUP_GOAL.toLocaleString()}</span></span>
          </div>
          <PBar pct={groupPct} h={22} color="#DC143C"/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:7}}>
            <span style={{fontSize:12,color:"#4ade80",fontWeight:700}}>{groupPct.toFixed(1)}% complete</span>
            <span style={{fontSize:12,color:"#fbbf24",fontWeight:700}}>BND {groupRemain.toLocaleString()} to go</span>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginTop:12}}>
            {[{l:"Days Left",v:daysTo(TARGET_DATE),e:"📅"},{l:"Months Left",v:monthsTo(TARGET_DATE),e:"🗓️"},{l:"This Month",v:`BND ${thisMonthGroup}`,e:"💸"}].map(({l,v,e})=>(
              <div key={l} style={{background:"#080c18",borderRadius:10,padding:"8px",textAlign:"center"}}>
                <div style={{fontSize:15}}>{e}</div>
                <div style={{fontWeight:800,color:"#fff",fontSize:14}}>{v}</div>
                <div style={{fontSize:10,color:"#5a6a8a"}}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* NAV */}
      <div style={{display:"flex",justifyContent:"center",gap:6,margin:"0 0 24px",position:"relative",zIndex:1,padding:"0 12px"}}>
        {TABS.map(({id,icon,label}) => {
          const a = tab===id;
          return <button key={id} onClick={()=>setTab(id)} style={{background:a?"linear-gradient(135deg,#DC143C,#ff3355)":"rgba(255,255,255,0.04)",color:a?"#fff":"#6a7a9a",border:a?"none":"1px solid rgba(255,255,255,0.07)",borderRadius:99,padding:"9px 18px",fontSize:13,fontWeight:700,cursor:"pointer",boxShadow:a?"0 4px 16px #DC143C44":"none",transition:"all .18s"}}>{icon} {label}</button>;
        })}
      </div>

      {/* CONTENT */}
      <div style={{maxWidth:960,margin:"0 auto",padding:"0 14px 100px",position:"relative",zIndex:1}}>
        {loading ? <Spinner/> : (
          <>
            {/* ══ DASHBOARD ══ */}
            {tab==="dashboard" && (
              <>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(130px,1fr))",gap:11,marginBottom:26}}>
                  {[
                    {icon:"💴",l:"Group Total",v:`BND ${groupTotal}`,s:`${groupPct.toFixed(1)}% done`,a:"#DC143C"},
                    {icon:"🎯",l:"Individual Goal",v:`BND ${INDIVIDUAL_GOAL}`,s:"per member",a:"#FFD700"},
                    {icon:"📉",l:"Remaining",v:`BND ${groupRemain}`,s:`of BND ${GROUP_GOAL.toLocaleString()}`,a:"#4FC3F7"},
                    {icon:"📅",l:"Days Left",v:daysTo(TARGET_DATE),s:`${monthsTo(TARGET_DATE)} months`,a:"#CE93D8"},
                    {icon:"💸",l:"Monthly Target",v:`BND ${MONTHLY_TARGET*members.length}`,s:`${members.length}×BND ${MONTHLY_TARGET}`,a:"#FF8A65"},
                    {icon:"🚀",l:"Collected",v:`BND ${thisMonthGroup}`,s:"this month",a:"#4ade80"},
                  ].map(({icon,l,v,s,a})=>(
                    <div key={l} style={{...card,border:`1px solid ${a}22`,position:"relative",overflow:"hidden"}}>
                      <div style={{position:"absolute",top:-16,right:-16,width:64,height:64,borderRadius:"50%",background:`${a}12`}}/>
                      <div style={{fontSize:18,marginBottom:5}}>{icon}</div>
                      <div style={{fontSize:9,color:"#5a6a8a",textTransform:"uppercase",letterSpacing:1.5,marginBottom:3}}>{l}</div>
                      <div style={{fontSize:19,fontWeight:900,color:"#fff",lineHeight:1}}>{v}</div>
                      <div style={{fontSize:11,color:"#5a6a8a",marginTop:4}}>{s}</div>
                    </div>
                  ))}
                </div>

                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                  <SH a="#DC143C" b="#FF8A65">Monthly Tracker — {MS[new Date().getMonth()]} {new Date().getFullYear()}</SH>
                  <Btn onClick={()=>setModal("addC")} style={{padding:"8px 14px",fontSize:12}}>+ Add</Btn>
                </div>
                <div style={{display:"flex",flexDirection:"column",gap:8,marginBottom:26}}>
                  {stats.map(m => {
                    const mpct = Math.min(100,(m.thisMonth/MONTHLY_TARGET)*100);
                    const done = m.thisMonth >= MONTHLY_TARGET;
                    const col = colorOf[m.name]||"#DC143C";
                    return (
                      <div key={m.name} style={{background:done?"linear-gradient(135deg,#091a09,#0d2614)":"#0e1428",border:`1px solid ${done?"#16a34a44":"rgba(255,255,255,0.06)"}`,borderRadius:14,padding:"13px 16px"}}>
                        <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:7}}>
                          <div style={{width:30,height:30,borderRadius:9,background:`${col}22`,border:`1px solid ${col}44`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:col,fontSize:12,flexShrink:0}}>{m.name[0]}</div>
                          <span style={{fontWeight:700,color:"#fff",flex:1}}>{m.name}</span>
                          <span style={{fontSize:12,color:"#5a6a8a"}}>BND {m.thisMonth}/{MONTHLY_TARGET}</span>
                          {done
                            ? <span style={{background:"#16a34a22",border:"1px solid #16a34a44",color:"#4ade80",borderRadius:99,padding:"2px 9px",fontSize:11,fontWeight:700}}>✅ Done</span>
                            : <span style={{background:"#fbbf2422",border:"1px solid #fbbf2444",color:"#fbbf24",borderRadius:99,padding:"2px 9px",fontSize:11,fontWeight:700}}>BND {Math.max(0,MONTHLY_TARGET-m.thisMonth)} left</span>}
                        </div>
                        <PBar pct={mpct} h={7} color={done?"#4ade80":"#fbbf24"}/>
                      </div>
                    );
                  })}
                </div>

                <div style={{textAlign:"center"}}>
                  <Btn v={copied?"green":"wa"} style={{maxWidth:300,width:"100%"}} onClick={share}>{copied?"✅ Copied!":"📤 Share to WhatsApp"}</Btn>
                </div>
              </>
            )}

            {/* ══ MEMBERS ══ */}
            {tab==="members" && (
              <>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                  <SH a="#DC143C" b="#FFD700">Members ({members.length})</SH>
                  <div style={{display:"flex",gap:8}}>
                    <Btn v="ghost" onClick={()=>setModal("addC")} style={{padding:"8px 13px",fontSize:12}}>+ Contribution</Btn>
                    <Btn onClick={()=>{setNewMName("");setModal("addM");}} style={{padding:"8px 13px",fontSize:12}}>+ Member</Btn>
                  </div>
                </div>
                <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(255px,1fr))",gap:15}}>
                  {stats.map(m => {
                    const col = colorOf[m.name]||"#DC143C";
                    const done = m.thisMonth >= MONTHLY_TARGET;
                    const rem = Math.max(0,INDIVIDUAL_GOAL-m.total);
                    const mLeft = rem>0?Math.ceil(rem/MONTHLY_TARGET):0;
                    return (
                      <div key={m.name} style={{...card,border:`1px solid ${col}33`,position:"relative",overflow:"hidden"}}>
                        <div style={{position:"absolute",top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,transparent,${col},transparent)`}}/>
                        <div style={{display:"flex",alignItems:"center",gap:11,marginBottom:13}}>
                          <div style={{width:44,height:44,borderRadius:13,background:`${col}25`,border:`1.5px solid ${col}55`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,fontSize:18,color:col,flexShrink:0}}>{m.name[0]}</div>
                          <div>
                            <div style={{fontWeight:800,color:"#fff",fontSize:15}}>{m.name}</div>
                            <div style={{fontSize:11,color:"#5a6a8a"}}>{m.count} payments</div>
                          </div>
                        </div>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:7,marginBottom:12}}>
                          {[{l:"SAVED",v:`BND ${m.total}`,c:col},{l:"LEFT",v:`BND ${rem}`,c:"#7a8aaa"},{l:"THIS MO",v:`BND ${m.thisMonth}`,c:done?"#4ade80":"#fbbf24"}].map(({l,v,c})=>(
                            <div key={l} style={{background:"#080c18",borderRadius:9,padding:"7px 9px"}}>
                              <div style={{fontSize:9,color:"#5a6a8a",marginBottom:2,letterSpacing:.8}}>{l}</div>
                              <div style={{fontWeight:800,color:c,fontSize:12}}>{v}</div>
                            </div>
                          ))}
                        </div>
                        <PBar pct={m.pct} h={7} color={col}/>
                        <div style={{display:"flex",justifyContent:"space-between",marginTop:7}}>
                          <span style={{fontSize:10,color:"#5a6a8a"}}>{m.pct.toFixed(1)}% · {mLeft>0?`${mLeft}mo left`:"🎉 Goal reached!"}</span>
                          <span>{done?"✅":"⏳"}</span>
                        </div>
                        <div style={{display:"flex",gap:7,marginTop:12}}>
                          <Btn style={{flex:1,padding:"8px",fontSize:12}} onClick={()=>setModal("addC")}>+ Add</Btn>
                          <Btn v="ghost" style={{padding:"8px 11px",fontSize:13}} onClick={()=>{setEditMIdx(members.indexOf(m.name));setEditMName(m.name);setModal("editM");}}>✏️</Btn>
                          <Btn v="danger" style={{padding:"8px 11px",fontSize:13}} onClick={()=>setConfirm({msg:`Remove ${m.name} and all their contributions?`,onYes:()=>delM(m.name)})}>🗑️</Btn>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* ══ MANAGE ══ */}
            {tab==="manage" && (
              <>
                <SH a="#DC143C" b="#FF8A65">Quick Actions</SH>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:28}}>
                  <Btn style={{padding:"14px",fontSize:14}} onClick={()=>setModal("addC")}>➕ Add Contribution</Btn>
                  <Btn v="ghost" style={{padding:"14px",fontSize:14}} onClick={()=>{setNewMName("");setModal("addM");}}>👤 Add Member</Btn>
                </div>

                <SH a="#4FC3F7" b="#CE93D8">Members</SH>
                <div style={{...card,marginBottom:24}}>
                  <div style={{display:"flex",flexDirection:"column",gap:8}}>
                    {members.map((m,i) => {
                      const col = colorOf[m]||"#DC143C";
                      const saved = contribs.filter(c=>c.member===m).reduce((s,c)=>s+c.amount,0);
                      return (
                        <div key={m} style={{display:"flex",alignItems:"center",gap:10,background:"#080c18",borderRadius:11,padding:"11px 14px"}}>
                          <div style={{width:34,height:34,borderRadius:10,background:`${col}22`,border:`1px solid ${col}44`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:900,color:col,fontSize:14,flexShrink:0}}>{m[0]}</div>
                          <span style={{flex:1,fontWeight:700,color:"#fff"}}>{m}</span>
                          <span style={{fontSize:12,color:"#5a6a8a",marginRight:4}}>BND {saved}</span>
                          <button onClick={()=>{setEditMIdx(i);setEditMName(m);setModal("editM");}} style={{background:"rgba(255,255,255,0.08)",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:13,color:"#fff",flexShrink:0}}>✏️</button>
                          <button onClick={()=>setConfirm({msg:`Remove ${m} and all their contributions?`,onYes:()=>delM(m)})} style={{background:"rgba(220,20,60,0.12)",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:13,color:"#DC143C",flexShrink:0}}>🗑️</button>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <SH a="#CE93D8" b="#DC143C">All Contributions ({contribs.length})</SH>
                <div style={{display:"flex",flexDirection:"column",gap:7,marginBottom:28}}>
                  {contribs.map(c => {
                    const col = colorOf[c.member]||"#DC143C";
                    return (
                      <div key={c.id} style={{background:"#0e1428",border:"1px solid rgba(255,255,255,0.05)",borderRadius:12,padding:"11px 14px",display:"flex",alignItems:"center",gap:11}}>
                        <div style={{width:34,height:34,borderRadius:10,background:`${col}22`,border:`1px solid ${col}44`,display:"flex",alignItems:"center",justifyContent:"center",fontWeight:800,color:col,fontSize:13,flexShrink:0}}>{c.member?.[0]}</div>
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,color:"#fff",fontSize:13}}>{c.member}</div>
                          <div style={{fontSize:11,color:"#5a6a8a"}}>{fmtDate(c.date)}{c.notes?` · ${c.notes}`:""}</div>
                        </div>
                        <div style={{fontWeight:800,color:"#4ade80",fontSize:14,marginRight:2}}>BND {c.amount}</div>
                        <button onClick={()=>{setEditC(c);setModal("editC");}} style={{background:"rgba(255,255,255,0.07)",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:13,color:"#fff",flexShrink:0}}>✏️</button>
                        <button onClick={()=>setConfirm({msg:`Delete BND ${c.amount} from ${c.member}?`,onYes:()=>delC(c.id)})} style={{background:"rgba(220,20,60,0.12)",border:"none",borderRadius:8,width:30,height:30,cursor:"pointer",fontSize:13,color:"#DC143C",flexShrink:0}}>🗑️</button>
                      </div>
                    );
                  })}
                  {contribs.length===0 && (
                    <div style={{textAlign:"center",color:"#5a6a8a",padding:40,background:"#0e1428",borderRadius:14,fontSize:13}}>
                      No contributions yet.<br/>Tap <strong style={{color:"#DC143C"}}>➕ Add Contribution</strong> above!
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </div>

      <div style={{textAlign:"center",paddingBottom:28,fontSize:11,color:"#2a3450",position:"relative",zIndex:1}}>
        🌸 Road to Japan · BND 2,000 per member · {members.length} friends · がんばろう！
      </div>
    </div>
  );
}
