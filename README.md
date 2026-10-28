# Wayfarer – AI Travel Itinerary Planner
React (Vite) frontend on Vercel + FastAPI backend (Render) + Supabase.

```
frontend/   React + Vite  -> deploy to Vercel (Root Directory = frontend)
backend/    FastAPI       -> deploy to Render (or any Python host)
supabase/   schema.sql
```

## Run locally
```bash
# terminal 1
cd backend
python -m venv .venv && .venv\Scripts\activate     # Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env                             # Mac/Linux: cp
uvicorn main:app --reload --port 8000

# terminal 2
cd frontend && npm install && npm run dev          # http://localhost:5173
```

## Deploy
1. Supabase: run `supabase/schema.sql` in the SQL Editor.
2. Backend on Render (render.com -> New -> Web Service -> your repo):
   - Root Directory: `backend`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
   - Env vars: SUPABASE_URL, SUPABASE_SERVICE_KEY, ANTHROPIC_API_KEY, CORS_ORIGINS (set after step 3)
   - Check `https://<backend>.onrender.com/api/health`
3. Frontend on Vercel (Add New -> Project -> your repo):
   - Root Directory: `frontend`, Framework Preset: Vite (auto-detected)
   - Env var: `VITE_API_URL` = your Render URL (no trailing slash)
   - Deploy, then put the Vercel URL into the backend's `CORS_ORIGINS` and redeploy the backend.
