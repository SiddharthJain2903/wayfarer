import { useState } from "react";
import { api, TAGS } from "../api";

const iso = (d) => new Date(Date.now() + d * 864e5).toISOString().slice(0, 10);

export default function Builder({ onCreated }) {
  const [f, setF] = useState({ dest: "", group_size: 2, start_date: iso(7), end_date: iso(9), tier: 1, pace: "balanced" });
  const [sel, setSel] = useState(["food", "sight"]);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });
  const toggle = (k) => setSel((s) => (s.includes(k) ? s.filter((x) => x !== k) : [...s, k]));

  async function submit(e) {
    e.preventDefault(); setBusy(true); setErr("");
    try {
      const t = await api.generate({ ...f, group_size: +f.group_size, tier: +f.tier, interests: sel.length ? sel : ["sight"] });
      onCreated(t);
    } catch (x) { setErr(x.message); setBusy(false); }
  }

  if (busy) return <div className="load"><div className="em">🧭</div><h3>Crafting your itinerary…</h3><p>Balancing routes, meals and budget</p></div>;

  return (
    <>
      <div className="top"><h2>Smart trip builder</h2></div>
      {err && <div className="card err">{err}</div>}
      <form className="card" onSubmit={submit}>
        <div><label>Destination</label><input required value={f.dest} onChange={set("dest")} placeholder="Paris, Tokyo, Goa, Jaipur…" /></div>
        <div><label>Travellers</label><input type="number" min="1" max="20" value={f.group_size} onChange={set("group_size")} /></div>
        <div><label>Start</label><input type="date" value={f.start_date} onChange={set("start_date")} /></div>
        <div><label>End</label><input type="date" min={f.start_date} value={f.end_date} onChange={set("end_date")} /></div>
        <div><label>Budget</label>
          <select value={f.tier} onChange={set("tier")}><option value={0}>Budget</option><option value={1}>Comfort</option><option value={2}>Premium</option></select></div>
        <div><label>Pace</label>
          <select value={f.pace} onChange={set("pace")}><option value="relaxed">Relaxed</option><option value="balanced">Balanced</option><option value="packed">Packed</option></select></div>
        <div className="w"><label>Interests</label>
          <div className="chips">{Object.entries(TAGS).map(([k, v]) => <span key={k} className={`chip ${sel.includes(k) ? "on" : ""}`} onClick={() => toggle(k)}>{v}</span>)}</div></div>
        <div className="w"><button className="btn">✨ Generate itinerary</button></div>
      </form>
    </>
  );
}
