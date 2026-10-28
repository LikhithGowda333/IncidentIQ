# PowerShell startup script for IncidentIQ
$ScratchDir = "C:\Users\DELL\.gemini\antigravity\scratch"
$NodeDir = "$ScratchDir\node-v20.18.0-win-x64"
$IncidentIQDir = "$ScratchDir\IncidentIQ"

Write-Host "======================================================" -ForegroundColor Cyan
Write-Host "Starting IncidentIQ Platform (Backend & Frontend)..." -ForegroundColor Cyan
Write-Host "======================================================" -ForegroundColor Cyan

# Start Backend in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$IncidentIQDir\backend'; python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload"

# Start Frontend in a new PowerShell window
Start-Process powershell -ArgumentList "-NoExit", "-Command", "`$env:PATH = '$NodeDir;' + `$env:PATH; Set-Location '$IncidentIQDir\frontend'; npm run dev"

Write-Host "`nBoth services have been started in dedicated windows!" -ForegroundColor Green
Write-Host "• Frontend UI: http://localhost:5173" -ForegroundColor Yellow
Write-Host "• Backend API: http://127.0.0.1:8000 (Swagger docs at http://127.0.0.1:8000/docs)" -ForegroundColor Yellow
Write-Host "• Default Demo Login: demo@incidentiq.local / Demo1234!" -ForegroundColor Gray
