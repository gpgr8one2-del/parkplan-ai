# ParkPlan AI

Smart theme park planner for Disney World and Universal Orlando.

## Structure
- `backend/` Express API for park data, weather, AI chat, caching, logging, and resiliency.
- `frontend/` React app that displays park data, weather, freshness badges, and AI chat.

## Local setup

### Backend
```bash
cd backend
npm install
cp .env.example .env
npm run dev
```

### Frontend
```bash
cd frontend
npm install
npm start
```

Frontend runs on http://localhost:3000 and backend runs on http://localhost:3001.
