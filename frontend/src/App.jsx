import { useEffect, useState } from "react";
import { api } from "./api";
import Dashboard from "./pages/Dashboard.jsx";
import Builder from "./pages/Builder.jsx";
import Trip from "./pages/Trip.jsx";

export default function App() {
  const [view, setView] = useState("dash");
  const [trips, setTrips] = useState([]);
  const [curId, setCurId] = useState(null);
  const [error, setError] = useState("");

  const refresh = () => api.list().then(setTrips).catch((e) => setError(e.message));
  useEffect(() => { refresh(); }, []);

  const open = (id) => { setCurId(id); setView("trip"); };
  const upsert = (t) => setTrips((p) => [t, ...p.filter((x) => x.id !== t.id)].sort((a, b) => b.created_at.localeCompare(a.created_at)));
  const drop = (id) => { setTrips((p) => p.filter((x) => x.id !== id)); setView("dash"); };

  return (
    <div className="app">
      <aside>
        <div className="logo">Way<span>farer</span></div>
        <button className={`nav ${view === "dash" || view === "trip" ? "on" : ""}`} onClick={() => setView("dash")}>🏠 Dashboard</button>
        <button className={`nav ${view === "build" ? "on" : ""}`} onClick={() => setView("build")}>✨ New trip</button>
      </aside>
      <main>
        {error && <div className="card err">Could not reach the API: {error}. If running locally, is the backend up on port 8000?</div>}
        {view === "dash" && <Dashboard trips={trips} onOpen={open} onNew={() => setView("build")} />}
        {view === "build" && <Builder onCreated={(t) => { upsert(t); open(t.id); }} />}
        {view === "trip" && trips.find((t) => t.id === curId) && (
          <Trip trip={trips.find((t) => t.id === curId)} onChange={upsert} onDelete={drop} />
        )}
      </main>
    </div>
  );
}
