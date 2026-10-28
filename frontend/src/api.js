const BASE = import.meta.env.VITE_API_URL || ""; // same-origin by default

function clientId() {
  let id = localStorage.getItem("wf_client");
  if (!id) { id = crypto.randomUUID(); localStorage.setItem("wf_client", id); }
  return id;
}

async function req(path, opts = {}) {
  const res = await fetch(BASE + path, {
    ...opts,
    headers: { "Content-Type": "application/json", "X-Client-Id": clientId() },
  });
  if (!res.ok) throw new Error((await res.json().catch(() => ({}))).detail || res.statusText);
  return res.json();
}

export const api = {
  list: () => req("/api/trips"),
  generate: (body) => req("/api/trips/generate", { method: "POST", body: JSON.stringify(body) }),
  regenerate: (id, day) => req(`/api/trips/${id}/regenerate${day == null ? "" : `?day=${day}`}`, { method: "POST" }),
  saveDays: (id, days) => req(`/api/trips/${id}`, { method: "PUT", body: JSON.stringify({ days }) }),
  remove: (id) => req(`/api/trips/${id}`, { method: "DELETE" }),
};

export const TAGS = { food: "🍜 Food", sight: "🏛️ Sightseeing", culture: "🎭 Culture", adventure: "🥾 Adventure", relax: "🌿 Relaxation" };
export const TIER = ["Budget", "Comfort", "Premium"];
const MULT = [0.7, 1, 1.7];

export function cost(t) {
  const act = t.days.flat().reduce((s, i) => s + (+i.cost || 0), 0) * t.group_size;
  const nights = Math.max(1, t.days.length - 1);
  const stay = (t.hotel?.per_night || 0) * Math.ceil(t.group_size / 2) * nights;
  const transport = Math.round(10 * MULT[t.tier] * t.group_size * t.days.length);
  return { act, stay, transport, total: act + stay + transport, nights };
}
