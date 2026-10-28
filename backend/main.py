"""Wayfarer API – FastAPI + Supabase + Claude."""
import json, os, random, re, uuid
from datetime import date, datetime
from typing import Any, Dict, List, Optional

from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

load_dotenv()

app = FastAPI(title="Wayfarer API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:5173").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------- storage (Supabase, or in-memory fallback) ----------
sb = None
if os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_SERVICE_KEY"):
    from supabase import create_client
    sb = create_client(os.getenv("SUPABASE_URL"), os.getenv("SUPABASE_SERVICE_KEY"))
MEM: Dict[str, dict] = {}


def db_list(cid: str) -> List[dict]:
    if sb:
        return sb.table("trips").select("*").eq("client_id", cid).order("created_at", desc=True).execute().data
    return sorted([t for t in MEM.values() if t["client_id"] == cid], key=lambda t: t["created_at"], reverse=True)


def db_get(tid: str, cid: str) -> dict:
    if sb:
        r = sb.table("trips").select("*").eq("id", tid).eq("client_id", cid).execute().data
        t = r[0] if r else None
    else:
        t = MEM.get(tid)
        t = t if t and t["client_id"] == cid else None
    if not t:
        raise HTTPException(404, "Trip not found")
    return t


def db_insert(row: dict) -> dict:
    if sb:
        return sb.table("trips").insert(row).execute().data[0]
    row = {**row, "id": str(uuid.uuid4()), "created_at": datetime.utcnow().isoformat()}
    MEM[row["id"]] = row
    return row


def db_update(tid: str, patch: dict) -> dict:
    if sb:
        return sb.table("trips").update(patch).eq("id", tid).execute().data[0]
    MEM[tid].update(patch)
    return MEM[tid]


def db_delete(tid: str):
    if sb:
        sb.table("trips").delete().eq("id", tid).execute()
    else:
        MEM.pop(tid, None)


# ---------- schemas ----------
class TripIn(BaseModel):
    dest: str = Field(min_length=2, max_length=80)
    start_date: date
    end_date: date
    group_size: int = Field(1, ge=1, le=20)
    tier: int = Field(1, ge=0, le=2)  # 0 budget, 1 comfort, 2 premium
    pace: str = "balanced"  # relaxed | balanced | packed
    interests: List[str] = ["sight"]


class DaysIn(BaseModel):
    days: List[List[Dict[str, Any]]]


TIERS = ["budget", "comfort", "premium"]


def n_days(t: dict) -> int:
    s = date.fromisoformat(str(t["start_date"]))
    e = date.fromisoformat(str(t["end_date"]))
    return max(1, min(10, (e - s).days + 1))


# ---------- prompt engineering ----------
SYSTEM = (
    "You are an expert travel planner. Reply with ONE valid JSON object and nothing else "
    "(no markdown fences, no commentary)."
)


def build_prompt(t: dict, days: int, only_day: Optional[int] = None, avoid: Optional[List[str]] = None) -> str:
    scope = (f"Create ONLY day {only_day + 1} of the trip." if only_day is not None
             else f"Create all {days} days.")
    avoid_line = ("Do NOT reuse these places: " + "; ".join(avoid)) if avoid else ""
    return f"""Plan a trip.
Destination: {t['dest']}
Dates: {t['start_date']} to {t['end_date']} ({days} days)
Travellers: {t['group_size']}
Budget tier: {TIERS[t['tier']]}
Pace: {t['pace']} (relaxed=2 activities/day, balanced=3, packed=4)
Interests: {', '.join(t['interests'])}
{scope}
{avoid_line}

Rules:
- Each day: morning activity, lunch, afternoon activity(ies), dinner. Group nearby places to minimise travel time.
- Use real, well-known places. Costs are USD PER PERSON, realistic for the budget tier.
- type is one of: activity, lunch, dinner.

Return JSON exactly in this shape:
{{"hotel": {{"name": "str", "per_night": 0}},
  "tips": "2-3 sentences on local transport and logistics",
  "days": [[{{"time": "09:00", "type": "activity", "name": "str", "description": "str", "cost": 0}}]]}}"""


def call_llm(prompt: str) -> Optional[dict]:
    key = os.getenv("ANTHROPIC_API_KEY")
    if not key:
        return None
    try:
        import anthropic
        client = anthropic.Anthropic(api_key=key)
        msg = client.messages.create(
            model=os.getenv("ANTHROPIC_MODEL", "claude-sonnet-4-6"),
            max_tokens=4000, system=SYSTEM,
            messages=[{"role": "user", "content": prompt}],
        )
        text = "".join(b.text for b in msg.content if b.type == "text")
        text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
        return json.loads(text)
    except Exception as e:  # network, parse, quota...
        print("LLM failed, using offline generator:", e)
        return None


# ---------- offline fallback ----------
def offline(t: dict, days: int, only_day: Optional[int] = None) -> dict:
    d, m = t["dest"], [0.7, 1, 1.7][t["tier"]]
    acts = [(f"{d} old town walk", 0), (f"{d} food market tour", 20), (f"{d} museum visit", 14),
            (f"{d} scenic viewpoint", 0), (f"{d} guided day tour", 40), (f"{d} craft workshop", 25),
            (f"{d} sunset promenade", 0), (f"{d} street-food crawl", 22)]
    eats = [("Local favourite bistro", 18), ("Market cafe", 10), ("Chef's table", 45), ("Rooftop kitchen", 28)]
    n = {"relaxed": 2, "balanced": 3, "packed": 4}.get(t["pace"], 3)
    times = ["09:00", "14:30", "17:00", "18:30"]

    def day():
        a, e = random.sample(acts, n), random.sample(eats, 2)
        row = [{"time": times[0], "type": "activity", "name": a[0][0], "description": "Start early to beat crowds.", "cost": round(a[0][1] * m)},
               {"time": "12:30", "type": "lunch", "name": e[0][0], "description": "Midday break.", "cost": round(e[0][1] * m)}]
        for i in range(1, n):
            row.append({"time": times[i], "type": "activity", "name": a[i][0], "description": "Close to your lunch spot.", "cost": round(a[i][1] * m)})
        row.append({"time": "20:00", "type": "dinner", "name": e[1][0], "description": "Wind down the day.", "cost": round(e[1][1] * m)})
        return row

    hotel = [("Central hostel", 25), ("Boutique stay", 95), ("Grand hotel", 320)][t["tier"]]
    return {"hotel": {"name": hotel[0], "per_night": hotel[1]},
            "tips": "Use local transit passes and group sights by neighbourhood.",
            "days": [day() for _ in range(1 if only_day is not None else days)]}


def generate(t: dict, only_day: Optional[int] = None, avoid: Optional[List[str]] = None) -> dict:
    days = n_days(t)
    return call_llm(build_prompt(t, days, only_day, avoid)) or offline(t, days, only_day)


# ---------- routes ----------
@app.get("/api/health")
def health():
    return {"ok": True, "llm": bool(os.getenv("ANTHROPIC_API_KEY")), "supabase": bool(sb)}


@app.get("/api/trips")
def list_trips(x_client_id: str = Header(...)):
    return db_list(x_client_id)


@app.get("/api/trips/{tid}")
def get_trip(tid: str, x_client_id: str = Header(...)):
    return db_get(tid, x_client_id)


@app.post("/api/trips/generate")
def create_trip(body: TripIn, x_client_id: str = Header(...)):
    if body.end_date < body.start_date:
        raise HTTPException(422, "end_date must be on or after start_date")
    row = {"client_id": x_client_id, "dest": body.dest.strip(), "start_date": str(body.start_date),
           "end_date": str(body.end_date), "group_size": body.group_size, "tier": body.tier,
           "pace": body.pace, "interests": body.interests}
    out = generate(row)
    row.update(hotel=out.get("hotel"), days=out.get("days", []), tips=out.get("tips"))
    return db_insert(row)


@app.post("/api/trips/{tid}/regenerate")
def regenerate(tid: str, day: Optional[int] = None, x_client_id: str = Header(...)):
    t = db_get(tid, x_client_id)
    days = t["days"]
    if day is None:
        out = generate(t)
        return db_update(tid, {"days": out["days"], "hotel": out.get("hotel"), "tips": out.get("tips")})
    if not 0 <= day < len(days):
        raise HTTPException(422, "day out of range")
    avoid = [i["name"] for d in days for i in d]
    days[day] = generate(t, only_day=day, avoid=avoid)["days"][0]
    return db_update(tid, {"days": days})


@app.put("/api/trips/{tid}")
def save_days(tid: str, body: DaysIn, x_client_id: str = Header(...)):
    db_get(tid, x_client_id)
    return db_update(tid, {"days": body.days})


@app.delete("/api/trips/{tid}")
def delete_trip(tid: str, x_client_id: str = Header(...)):
    db_get(tid, x_client_id)
    db_delete(tid)
    return {"deleted": tid}
