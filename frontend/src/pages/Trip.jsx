import { useState } from "react";
import { api, cost, TIER } from "../api";

export default function Trip({ trip: t, onChange, onDelete }) {
  const [day, setDay] = useState(0);
  const [busy, setBusy] = useState(false);
  const c = cost(t);
  const d = t.days[Math.min(day, t.days.length - 1)] || [];

  async function run(fn) { setBusy(true); try { onChange(await fn()); } catch (e) { alert(e.message); } setBusy(false); }
  const regen = (i) => run(() => api.regenerate(t.id, i));
  const remove = (x) => {
    const days = t.days.map((dd, i) => (i === day ? dd.filter((_, j) => j !== x) : dd));
    onChange({ ...t, days });             // optimistic
    api.saveDays(t.id, days).catch((e) => alert(e.message));
  };
  const del = async () => { if (confirm("Delete this trip?")) { await api.remove(t.id); onDelete(t.id); } };

  return (
    <div style={{ opacity: busy ? 0.55 : 1 }}>
      <div className="top">
        <div>
          <h2>🧭 {t.dest}</h2>
          <div className="mut">{t.start_date} → {t.end_date} · {t.group_size} traveller{t.group_size > 1 ? "s" : ""} · {TIER[t.tier]} · {t.pace}</div>
        </div>
        <div><button className="btn g s" onClick={() => regen(null)}>↻ Regenerate all</button> <button className="btn g s" onClick={del}>Delete</button></div>
      </div>
      <div className="tabs">{t.days.map((_, i) => <span key={i} className={`chip ${i === day ? "on" : ""}`} onClick={() => setDay(i)}>Day {i + 1}</span>)}</div>
      <div className="layout">
        <div className="card">
          <div className="top" style={{ marginBottom: 4 }}><h3>Day {day + 1}</h3><button className="btn s" onClick={() => regen(day)}>↻ Regenerate day</button></div>
          {d.map((i, x) => (
            <div className="item" key={x}>
              <div className="time">{i.time}</div>
              <div className="i"><span className="k">{i.type}</span><b>{i.name}</b><span className="mut">{i.description}</span></div>
              <div className="mut">{i.cost ? `$${i.cost}` : "Free"}</div>
              <button className="x" title="Remove" onClick={() => remove(x)}>✕</button>
            </div>
          ))}
          {!d.length && <p className="mut">Nothing planned.</p>}
        </div>
        <div>
          <div className="card">
            <h3 style={{ marginBottom: 8 }}>Estimated cost</h3>
            <div className="row"><span>Activities & dining</span><span>${c.act}</span></div>
            <div className="row"><span>Stay</span><span>${c.stay}</span></div>
            <div className="row"><span>Local transport</span><span>${c.transport}</span></div>
            <div className="row tot"><span>Total</span><span>${c.total}</span></div>
            <div className="mut" style={{ marginTop: 6 }}>Per person ~${Math.round(c.total / t.group_size)}</div>
          </div>
          <div className="card" style={{ marginTop: 14 }}>
            <h3 style={{ marginBottom: 6 }}>🏨 Stay</h3>
            <b>{t.hotel?.name || "TBD"}</b>
            <div className="mut">{Math.ceil(t.group_size / 2)} room(s) · {c.nights} night(s)</div>
          </div>
          {t.tips && <div className="card" style={{ marginTop: 14 }}><h3 style={{ marginBottom: 6 }}>🚆 Logistics</h3><div className="mut">{t.tips}</div></div>}
        </div>
      </div>
    </div>
  );
}
