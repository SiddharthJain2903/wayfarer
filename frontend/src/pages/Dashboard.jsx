import { TAGS, cost } from "../api";

export default function Dashboard({ trips, onOpen, onNew }) {
  const spend = trips.reduce((s, t) => s + cost(t).total, 0);
  return (
    <>
      <div className="hero">
        <h1>Where to next?</h1>
        <p>Tell Wayfarer your style and budget. Get a day-by-day plan in seconds, with food, stays and logistics sorted.</p>
        <button className="btn" onClick={onNew}>Plan a new trip →</button>
      </div>
      <div className="stats">
        <div className="card stat"><b>{trips.length}</b><span>Saved trips</span></div>
        <div className="card stat"><b>{trips.reduce((s, t) => s + t.days.length, 0)}</b><span>Days planned</span></div>
        <div className="card stat"><b>${spend.toLocaleString()}</b><span>Estimated spend</span></div>
      </div>
      <h2 style={{ marginBottom: 14 }}>Your trips</h2>
      <div className="grid">
        {trips.map((t) => (
          <div key={t.id} className="card trip" onClick={() => onOpen(t.id)}>
            <div className="em">🧭</div>
            <h3>{t.dest}</h3>
            <div className="mut">{t.start_date} · {t.days.length} days · {t.group_size} traveller{t.group_size > 1 ? "s" : ""}</div>
            {(t.interests || []).map((k) => <span key={k} className="tag">{TAGS[k] || k}</span>)}
            <div style={{ marginTop: 10, fontWeight: 600 }}>~${cost(t).total.toLocaleString()}</div>
          </div>
        ))}
        {!trips.length && <div className="mut">No trips yet. Create your first one.</div>}
      </div>
    </>
  );
}
