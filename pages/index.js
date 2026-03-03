import { useState, useRef } from "react";
import { useSession, signIn, signOut } from "next-auth/react";

const DURATIONS = [
  { label: "15 min", value: 15 }, { label: "30 min", value: 30 },
  { label: "45 min", value: 45 }, { label: "1 hora", value: 60 },
  { label: "1.5 h", value: 90 }, { label: "2 horas", value: 120 },
];
const MONTHS = ["Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const DAYS = ["Lu","Ma","Mi","Ju","Vi","Sa","Do"];
const toISO = d => d.toISOString().split("T")[0];
const same = (a,b) => a && b && toISO(a) === toISO(b);

function Cal({ year, month, rs, re, pick, prev, next, today }) {
  const total = new Date(year, month+1, 0).getDate();
  const first = (new Date(year, month, 1).getDay()+6)%7;
  const cells = [];
  for (let i=0; i<first; i++) cells.push(null);
  for (let d=1; d<=total; d++) cells.push(new Date(year,month,d));
  return (
    <div role="grid" aria-label={MONTHS[month]+" "+year}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"12px"}}>
        <button onClick={prev} aria-label="Anterior" style={{background:"none",border:"1.5px solid rgba(255,255,255,.28)",color:"#94a3b8",borderRadius:"7px",width:"30px",height:"30px",cursor:"pointer",fontSize:"18px",display:"flex",alignItems:"center",justifyContent:"center"}}>&#8249;</button>
        <span style={{color:"#e2e8f0",fontSize:"14px",fontWeight:"600"}}>{MONTHS[month]} {year}</span>
        <button onClick={next} aria-label="Siguiente" style={{background:"none",border:"1.5px solid rgba(255,255,255,.28)",color:"#94a3b8",borderRadius:"7px",width:"30px",height:"30px",cursor:"pointer",fontSize:"18px",display:"flex",alignItems:"center",justifyContent:"center"}}>&#8250;</button>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:"4px"}}>
        {DAYS.map(d=><div key={d} style={{textAlign:"center",fontSize:"11px",color:"#7a9bb5",fontWeight:"700",padding:"4px 0"}}>{d}</div>)}
      </div>
      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"2px"}}>
        {cells.map((day,i)=>{
          if(!day)return <div key={"x"+i}/>;
          const isSt=same(day,rs),isEn=same(day,re);
          const inR=rs&&re&&day>=rs&&day<=re&&!isSt&&!isEn;
          const isT=same(day,today),past=day<today&&!isT,sel=isSt||isEn;
          return(
            <button key={toISO(day)} onClick={()=>!past&&pick(day)} disabled={past}
              role="gridcell" aria-selected={sel} aria-label={day.getDate()+" de "+MONTHS[month]}
              style={{height:"34px",border:"none",cursor:past?"default":"pointer",fontSize:"13px",
                fontWeight:sel||isT?"700":"400",outline:"none",transition:"all .12s",
                borderRadius:isSt&&re?"8px 0 0 8px":isEn&&rs?"0 8px 8px 0":sel?"8px":"3px",
                background:sel?"linear-gradient(135deg,#0ea5e9,#6366f1)":inR?"rgba(56,189,248,.15)":"transparent",
                color:sel?"#fff":past?"#2d4560":inR?"#7dd3fc":isT?"#38bdf8":"#cbd5e1"}}>
              {day.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Chip({ email, onRemove }) {
  return(
    <span style={{display:"inline-flex",alignItems:"center",gap:"5px",background:"rgba(56,189,248,.12)",border:"1.5px solid rgba(56,189,248,.42)",color:"#7dd3fc",borderRadius:"20px",padding:"4px 10px 4px 8px",fontSize:"13px",maxWidth:"220px"}}>
      <span style={{width:"20px",height:"20px",borderRadius:"50%",background:"linear-gradient(135deg,#0ea5e9,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"9px",color:"#fff",fontWeight:"700",flexShrink:0}}>{email[0].toUpperCase()}</span>
      <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{email}</span>
      <button onClick={()=>onRemove(email)} aria-label={"Eliminar "+email} style={{background:"none",border:"none",cursor:"pointer",color:"#7a9bb5",fontSize:"15px",lineHeight:1,padding:"0 0 0 2px"}}>&#215;</button>
    </span>
  );
}

export default function App() {
  const { data: session, status } = useSession();
  const today = new Date(); today.setHours(0,0,0,0);
  const [title,setTitle] = useState("");
  const [emails,setEmails] = useState([]);
  const [eIn,setEIn] = useState("");
  const [dur,setDur] = useState(30);
  const [vid,setVid] = useState(false);
  const [rs,setRs] = useState(null);
  const [re,setRe] = useState(null);
  const [cy,setCy] = useState(today.getFullYear());
  const [cm,setCm] = useState(today.getMonth());
  const [open,setOpen] = useState(false);
  const [pe,setPe] = useState(false);
  const [appStatus,setAppStatus] = useState("idle");
  const [logs,setLogs] = useState([]);
  const [result,setResult] = useState(null);
  const [err,setErr] = useState(null);
  const iRef = useRef(null);

  const addE = raw => { const e=raw.trim().toLowerCase(); if(e&&e.includes("@")&&!emails.includes(e))setEmails(p=>[...p,e]); setEIn(""); };
  const ek = ev => { if(["Enter",",","Tab"].includes(ev.key)){ev.preventDefault();addE(eIn);} if(ev.key==="Backspace"&&!eIn&&emails.length)setEmails(p=>p.slice(0,-1)); };
  const pick = day => { if(!rs||!pe){setRs(day);setRe(null);setPe(true);}else{if(day<rs){setRs(day);setRe(null);}else{setRe(day);setPe(false);setOpen(false);}} };
  const pM = () => { if(cm===0){setCm(11);setCy(y=>y-1);}else setCm(m=>m-1); };
  const nM = () => { if(cm===11){setCm(0);setCy(y=>y+1);}else setCm(m=>m+1); };
  const rl = () => { if(!rs&&!re)return"Seleccionar rango de fechas"; if(rs&&!re)return rs.getDate()+" de "+MONTHS[rs.getMonth()]+" → elige fin"; return rs.getDate()+" de "+MONTHS[rs.getMonth()]+" — "+re.getDate()+" de "+MONTHS[re.getMonth()]; };
  const aL = m => setLogs(p=>[...p,m]);

  const run = async () => {
    const all=eIn.trim()?[...emails,eIn.trim()]:[...emails];
    if(!all.length){setErr("Agrega al menos un participante.");return;}
    if(!rs||!re){setErr("Selecciona un rango de fechas.");return;}
    setAppStatus("checking");setLogs([]);setResult(null);setErr(null);
    try {
      aL("Consultando tu Google Calendar...");
      const from=new Date(rs);from.setHours(0,0,0,0);
      const to=new Date(re);to.setHours(23,59,59,999);
      const evRes=await fetch("/api/calendar/events?from="+from.toISOString()+"&to="+to.toISOString());
      if(!evRes.ok)throw new Error("Error consultando calendario");
      const { events: evs }=await evRes.json();
      aL(evs.length+" eventos en el rango.");
      setAppStatus("scheduling");
      aL("Buscando espacio de "+dur+" min...");
      const slot=(()=>{
        const cur=new Date(from);
        while(cur<=to){
          if(cur.getDay()!==0&&cur.getDay()!==6){
            const ds=new Date(cur);ds.setHours(9,0,0,0);
            const de=new Date(cur);de.setHours(18,0,0,0);
            let t=Math.max(ds.getTime(),Date.now()+60000);
            while(t+dur*60000<=de.getTime()){
              const ss=new Date(t),se=new Date(t+dur*60000);
              if(!evs.some(ev=>{const s=new Date(ev.start);const e=new Date(ev.end);return ss<e&&se>s;}))
                return{start:ss,end:se};
              t+=15*60000;
            }
          }
          cur.setDate(cur.getDate()+1);
        }
        return null;
      })();
      if(!slot)throw new Error("Sin espacio de "+dur+" min en ese rango.");
      const disp=slot.start.toLocaleString("es-CO",{weekday:"long",year:"numeric",month:"long",day:"numeric",hour:"2-digit",minute:"2-digit",timeZone:"America/Bogota"});
      aL("Espacio: "+disp);
      aL("Creando evento"+(vid?" con Google Meet":"")+"...");
      const crRes=await fetch("/api/calendar/create",{method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({title:title.trim()||"Reunion",start:slot.start.toISOString(),end:slot.end.toISOString(),attendees:all,addMeet:vid,description:"Reunion de "+dur+" minutos."})});
      if(!crRes.ok)throw new Error("Error creando el evento");
      const created=await crRes.json();
      setResult({date:disp,attendees:all,link:created.htmlLink||null,title:title.trim()||"Reunion",vid});
      setAppStatus("done");
      aL("Reunion agendada!");
    }catch(e){setErr(e.message);setAppStatus("error");}
  };

  const reset=()=>{setAppStatus("idle");setLogs([]);setResult(null);setErr(null);};
  const busy=appStatus==="checking"||appStatus==="scheduling";
  const F={width:"100%",background:"rgba(255,255,255,.05)",border:"1.5px solid rgba(255,255,255,.26)",borderRadius:"9px",color:"#e8edf4",fontFamily:"system-ui,sans-serif",fontSize:"14px"};

  if(status==="loading")return<div style={{minHeight:"100vh",background:"#04090f",display:"flex",alignItems:"center",justifyContent:"center",color:"#38bdf8",fontFamily:"system-ui"}}>Cargando...</div>;

  if(!session)return(
    <div style={{minHeight:"100vh",background:"linear-gradient(145deg,#04090f,#060e1c)",display:"flex",alignItems:"center",justifyContent:"center",fontFamily:"system-ui,sans-serif",padding:"20px"}}>
      <div style={{background:"rgba(10,19,36,.9)",border:"1.5px solid rgba(255,255,255,.16)",borderRadius:"20px",padding:"48px 36px",textAlign:"center",maxWidth:"380px",width:"100%",boxShadow:"0 28px 70px rgba(0,0,0,.55)"}}>
        <div style={{fontSize:"48px",marginBottom:"16px"}}>📅</div>
        <h1 style={{color:"#f1f5f9",fontSize:"24px",fontWeight:"600",marginBottom:"8px"}}>Team Scheduler</h1>
        <p style={{color:"#5a7a96",fontSize:"14px",marginBottom:"32px",lineHeight:"1.5"}}>Agenda reuniones automaticamente en tu Google Calendar</p>
        <button onClick={()=>signIn("google")} style={{width:"100%",padding:"14px 20px",borderRadius:"12px",border:"none",background:"linear-gradient(135deg,#0ea5e9,#6366f1)",color:"#fff",fontSize:"15px",fontWeight:"600",cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:"10px"}}>
          <span style={{fontSize:"18px"}}>G</span> Entrar con Google
        </button>
      </div>
    </div>
  );

  return(
    <>
      <style>{`
        *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
        body{background:#04090f;}
        :focus-visible{outline:2px solid #38bdf8!important;outline-offset:2px!important;}
        button:focus:not(:focus-visible){outline:none;}
        @keyframes fu{from{opacity:0;transform:translateY(12px);}to{opacity:1;transform:translateY(0);}}
        @keyframes sp{to{transform:rotate(360deg);}}
        @keyframes pl{0%,100%{opacity:1;}50%{opacity:.5;}}
        .app{animation:fu .45s ease both;}
        .card{background:rgba(10,19,36,.88);backdrop-filter:blur(28px);border:1.5px solid rgba(255,255,255,.16);border-radius:20px;padding:28px;box-shadow:0 28px 70px rgba(0,0,0,.55),inset 0 1px 0 rgba(255,255,255,.06);}
        .lbl{display:block;font-size:10.5px;color:#8fafc8;letter-spacing:.1em;font-weight:700;text-transform:uppercase;margin-bottom:8px;}
        .fi{transition:border-color .18s,box-shadow .18s;}
        .fi:focus,.fi:focus-within{border-color:rgba(56,189,248,.72)!important;box-shadow:0 0 0 3px rgba(56,189,248,.1)!important;outline:none;}
        input::placeholder{color:#4d6880!important;}
        .db{padding:8px 15px;border-radius:8px;font-size:13px;font-weight:500;cursor:pointer;transition:all .14s;border:1.5px solid rgba(255,255,255,.26);background:rgba(255,255,255,.05);color:#8fafc8;}
        .db[aria-pressed="true"]{background:rgba(56,189,248,.14);border-color:rgba(56,189,248,.62);color:#38bdf8;}
        .db:hover:not([aria-pressed="true"]){background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.42);color:#cbd5e1;}
        .dt{width:100%;padding:12px 16px;text-align:left;cursor:pointer;background:rgba(255,255,255,.05);border:1.5px solid rgba(255,255,255,.26);border-radius:9px;color:#94a3b8;font-size:14px;display:flex;align-items:center;justify-content:space-between;transition:border-color .18s,box-shadow .18s;}
        .dt:hover,.dt[aria-expanded="true"]{border-color:rgba(56,189,248,.72);box-shadow:0 0 0 3px rgba(56,189,248,.1);}
        .dt.s{color:#38bdf8;}
        .cp{margin-top:6px;background:rgba(7,14,28,.99);border:1.5px solid rgba(56,189,248,.32);border-radius:14px;padding:16px;box-shadow:0 16px 48px rgba(0,0,0,.65);animation:fu .18s ease both;}
        .tog{width:50px;height:28px;border-radius:14px;cursor:pointer;flex-shrink:0;position:relative;border:none;transition:background .25s,box-shadow .25s;}
        .togd{width:22px;height:22px;border-radius:50%;background:#fff;position:absolute;top:3px;transition:left .2s;box-shadow:0 2px 6px rgba(0,0,0,.4);}
        .cta{width:100%;padding:15px 20px;border-radius:13px;font-size:15px;font-weight:600;cursor:pointer;border:none;display:flex;align-items:center;justify-content:center;gap:9px;transition:all .2s;min-height:52px;}
        .cp1{background:linear-gradient(135deg,#0ea5e9,#6366f1);color:#fff;box-shadow:0 4px 24px rgba(14,165,233,.22);}
        .cp1:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 36px rgba(14,165,233,.32);}
        .cp1:disabled{background:rgba(255,255,255,.06);color:#4d6880;cursor:not-allowed;box-shadow:none;}
        .cr{background:rgba(74,222,128,.1);color:#4ade80;border:1.5px solid rgba(74,222,128,.3);}
        .sep{height:1px;background:rgba(255,255,255,.16);}
        .hint{font-size:11px;color:#5a7a96;margin-top:5px;padding-left:2px;}
        .eb{background:rgba(248,113,113,.08);border:1.5px solid rgba(248,113,113,.32);border-radius:9px;padding:12px 16px;font-size:13px;color:#fca5a5;display:flex;gap:8px;}
        .rc{margin-top:16px;background:rgba(8,18,36,.93);border:1.5px solid rgba(74,222,128,.26);border-radius:20px;padding:24px;animation:fu .4s ease both;}
        .spin{animation:sp .8s linear infinite;display:inline-block;}
        .pulse{animation:pl 1.2s ease infinite;}
      `}</style>
      <div style={{minHeight:"100vh",background:"linear-gradient(145deg,#04090f 0%,#060e1c 55%,#050b16 100%)",display:"flex",alignItems:"center",justifyContent:"center",padding:"32px 20px",fontFamily:"system-ui,sans-serif",position:"relative",overflow:"hidden"}}>
        <div aria-hidden="true" style={{position:"fixed",top:"-15%",left:"50%",transform:"translateX(-50%)",width:"700px",height:"350px",borderRadius:"50%",pointerEvents:"none",background:"radial-gradient(ellipse,rgba(14,165,233,.07) 0%,transparent 70%)"}}/>
        <div aria-hidden="true" style={{position:"fixed",bottom:0,right:"-10%",width:"500px",height:"500px",borderRadius:"50%",pointerEvents:"none",background:"radial-gradient(ellipse,rgba(99,102,241,.06) 0%,transparent 70%)"}}/>
        <main className="app" style={{width:"100%",maxWidth:"500px",position:"relative",zIndex:1}}>
          <header style={{marginBottom:"28px"}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"14px"}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px"}}>
                <div style={{width:"42px",height:"42px",borderRadius:"12px",background:"linear-gradient(135deg,#0ea5e9,#6366f1)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"22px"}}>📅</div>
                <div>
                  <p style={{fontSize:"10.5px",color:"#38bdf8",letterSpacing:".12em",fontWeight:"700",textTransform:"uppercase"}}>Team Scheduler</p>
                  <p style={{fontSize:"11px",color:"#4d6880"}}>{session.user?.email}</p>
                </div>
              </div>
              <button onClick={()=>signOut()} style={{background:"none",border:"1.5px solid rgba(255,255,255,.2)",borderRadius:"8px",color:"#5a7a96",fontSize:"12px",padding:"6px 12px",cursor:"pointer"}}>Salir</button>
            </div>
            <h1 style={{fontSize:"38px",color:"#f1f5f9",fontWeight:"300",lineHeight:"1.05"}}>Agendar<br/><em style={{color:"#7dd3fc",fontStyle:"italic"}}>reunion</em></h1>
          </header>
          <section className="card">
            <div style={{display:"flex",flexDirection:"column",gap:"22px"}}>
              <div>
                <label htmlFor="mst" className="lbl">Nombre de la reunion</label>
                <input id="mst" className="fi" value={title} onChange={e=>setTitle(e.target.value)}
                  placeholder="ej. Sync semanal, Demo, 1:1..." style={{...F,padding:"11px 14px"}}/>
                <p className="hint">Deja vacio para usar "Reunion"</p>
              </div>
              <div>
                <label htmlFor="mse" className="lbl">Participantes</label>
                <div className="fi" onClick={()=>iRef.current?.focus()}
                  style={{...F,minHeight:"52px",padding:"8px 10px",cursor:"text",display:"flex",flexWrap:"wrap",gap:"6px",alignItems:"center"}}>
                  {emails.map(e=><Chip key={e} email={e} onRemove={x=>setEmails(p=>p.filter(q=>q!==x))}/>)}
                  <input ref={iRef} id="mse" type="email" value={eIn}
                    onChange={ev=>setEIn(ev.target.value)} onKeyDown={ek} onBlur={()=>eIn&&addE(eIn)}
                    placeholder={emails.length?"Agregar correo...":"correo@empresa.com"} aria-label="Ingresar correo"
                    style={{background:"none",border:"none",color:"#e8edf4",fontSize:"13px",flex:1,minWidth:"150px",padding:"3px 4px"}}/>
                </div>
                <p className="hint">Enter o Tab para confirmar</p>
              </div>
              <div>
                <p className="lbl" id="msd">Duracion</p>
                <div role="group" aria-labelledby="msd" style={{display:"flex",gap:"7px",flexWrap:"wrap"}}>
                  {DURATIONS.map(o=>(
                    <button key={o.value} className="db" onClick={()=>setDur(o.value)} aria-pressed={dur===o.value}>{o.label}</button>
                  ))}
                </div>
              </div>
              <div className="sep"/>
              <div style={{position:"relative"}}>
                <p className="lbl" id="msrl">Rango de fechas</p>
                <button className={"dt"+(rs&&re?" s":"")} onClick={()=>setOpen(o=>!o)} aria-expanded={open} aria-haspopup="dialog" aria-labelledby="msrl">
                  <span style={{display:"flex",alignItems:"center",gap:"8px"}}>
                    <span>📆</span><span>{rl()}</span>
                  </span>
                  <span style={{fontSize:"12px",color:"#5a7a96",transition:"transform .2s",display:"inline-block",transform:open?"rotate(180deg)":"none"}}>▾</span>
                </button>
                <p className="hint">{!rs?"Selecciona inicio":!re?"Selecciona fin":"Buscando entre "+rs.getDate()+" y "+re.getDate()+" de "+MONTHS[re.getMonth()]}</p>
                {open&&(
                  <div className="cp" role="dialog" aria-label="Selector de rango">
                    <p style={{fontSize:"12px",color:"#38bdf8",marginBottom:"12px",fontFamily:"monospace"}}>{!rs?"1. Elige inicio":!re?"2. Elige fin":"Rango seleccionado"}</p>
                    <Cal year={cy} month={cm} rs={rs} re={re} pick={pick} prev={pM} next={nM} today={today}/>
                    {rs&&re&&<button onClick={()=>{setRs(null);setRe(null);setPe(false);}} style={{marginTop:"12px",background:"none",border:"1.5px solid rgba(248,113,113,.4)",borderRadius:"7px",color:"#f87171",fontSize:"12px",padding:"6px 12px",cursor:"pointer",width:"100%"}}>Limpiar rango</button>}
                  </div>
                )}
              </div>
              <div className="sep"/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:"16px"}}>
                <div style={{display:"flex",alignItems:"center",gap:"14px"}}>
                  <div style={{width:"44px",height:"44px",borderRadius:"12px",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"21px",transition:"all .25s",background:vid?"rgba(14,165,233,.14)":"rgba(255,255,255,.06)",border:vid?"1.5px solid rgba(14,165,233,.38)":"1.5px solid rgba(255,255,255,.24)"}}>📹</div>
                  <div>
                    <label htmlFor="msv" style={{color:"#cbd5e1",fontSize:"14px",fontWeight:"500",cursor:"pointer",display:"block"}}>Videollamada</label>
                    <p style={{color:"#4d6880",fontSize:"12px"}}>{vid?"Google Meet activado":"Solo presencial / audio"}</p>
                  </div>
                </div>
                <button id="msv" className="tog" role="switch" aria-checked={vid} onClick={()=>setVid(v=>!v)}
                  style={{background:vid?"linear-gradient(135deg,#0ea5e9,#6366f1)":"rgba(255,255,255,.18)",boxShadow:vid?"0 0 16px rgba(14,165,233,.35)":"none"}}>
                  <div className="togd" style={{left:vid?"25px":"3px"}}/>
                </button>
              </div>
              {vid&&(
                <div role="note" style={{display:"flex",gap:"10px",background:"rgba(14,165,233,.08)",border:"1.5px solid rgba(14,165,233,.28)",borderRadius:"10px",padding:"12px 14px",marginTop:"-10px"}}>
                  <span style={{fontSize:"15px",marginTop:"1px"}}>🔗</span>
                  <p style={{fontSize:"13px",color:"#7dd3fc",lineHeight:"1.5"}}>Se generara un enlace de Google Meet y se enviara a todos los participantes.</p>
                </div>
              )}
              {err&&<div role="alert" className="eb"><span>⚠</span><span>{err}</span></div>}
              {appStatus!=="done"?(
                <button className="cta cp1" onClick={run} disabled={busy} aria-busy={busy}>
                  {busy?(
                    <><span className="spin" style={{fontSize:"17px"}}>◌</span>
                    <span className="pulse">{appStatus==="checking"?"Revisando calendario...":"Agendando..."}</span></>
                  ):(
                    <><span>✦</span> Buscar espacio y agendar</>
                  )}
                </button>
              ):(
                <button className="cta cr" onClick={reset}>+ Agendar nueva reunion</button>
              )}
            </div>
          </section>
          {logs.length>0&&(
            <div role="log" style={{background:"rgba(4,9,18,.96)",border:"1.5px solid rgba(255,255,255,.14)",borderRadius:"14px",padding:"16px",marginTop:"18px"}}>
              {logs.map((m,i)=>(
                <div key={i} style={{fontSize:"12.5px",color:"#7a9bb5",padding:"2px 0",fontFamily:"monospace",display:"flex",gap:"8px"}}>
                  <span style={{color:"#4d6880",flexShrink:0}}>›</span><span>{m}</span>
                </div>
              ))}
              {busy&&<div style={{display:"flex",gap:"7px",marginTop:"8px",paddingTop:"8px",borderTop:"1px solid rgba(255,255,255,.12)"}}>
                <span className="spin" style={{fontSize:"12px",color:"#38bdf8"}}>◌</span>
                <span style={{fontSize:"12px",color:"#38bdf8",fontFamily:"monospace"}} className="pulse">procesando...</span>
              </div>}
            </div>
          )}
          {appStatus==="done"&&result&&(
            <section className="rc">
              <div style={{display:"flex",gap:"13px",marginBottom:"18px"}}>
                <div style={{width:"46px",height:"46px",borderRadius:"13px",background:"rgba(74,222,128,.12)",border:"1.5px solid rgba(74,222,128,.3)",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"23px",flexShrink:0}}>🎉</div>
                <div>
                  <p style={{color:"#86efac",fontWeight:"700",fontSize:"16px"}}>Reunion agendada!</p>
                  <p style={{color:"#4ade80",fontSize:"12px",marginTop:"2px"}}>{result.title}</p>
                </div>
              </div>
              <p style={{fontSize:"13px",color:"#94a3b8",marginBottom:"12px",lineHeight:"1.5"}}>{result.date}</p>
              <div style={{display:"flex",flexWrap:"wrap",gap:"5px",marginBottom:"16px"}}>
                {result.attendees.map(e=><span key={e} style={{fontSize:"12px",color:"#7dd3fc",background:"rgba(56,189,248,.1)",border:"1px solid rgba(56,189,248,.28)",borderRadius:"6px",padding:"2px 9px"}}>{e}</span>)}
              </div>
              {result.link&&<a href={result.link} target="_blank" rel="noopener noreferrer"
                style={{display:"inline-flex",gap:"6px",background:"rgba(74,222,128,.12)",border:"1.5px solid rgba(74,222,128,.3)",borderRadius:"9px",padding:"9px 18px",color:"#86efac",fontSize:"13px",fontWeight:"600",textDecoration:"none"}}>
                Abrir en Google Calendar →</a>}
            </section>
          )}
        </main>
      </div>
    </>
  );
}