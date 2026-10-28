@echo off
set "PATH=C:\Users\DELL\.gemini\antigravity\scratch\node-v20.18.0-win-x64;%PATH%"

echo ======================================================
echo Launching IncidentIQ Platform (Backend & Frontend)...
echo ======================================================

start "IncidentIQ Backend (FastAPI)" cmd /k "cd /d C:\Users\DELL\.gemini\antigravity\scratch\IncidentIQ\backend && python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

start "IncidentIQ Frontend (Vite React)" cmd /k "set PATH=C:\Users\DELL\.gemini\antigravity\scratch\node-v20.18.0-win-x64;%%PATH%% && cd /d C:\Users\DELL\.gemini\antigravity\scratch\IncidentIQ\frontend && npm run dev"

echo.
echo Both servers are launching in separate windows:
echo - Backend API:  http://127.0.0.1:8000  (Docs: http://127.0.0.1:8000/docs)
echo - Frontend UI:  http://localhost:5173
echo.
