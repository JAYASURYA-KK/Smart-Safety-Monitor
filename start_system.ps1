# Smart Safety Monitor - PowerShell Launcher
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "Starting Smart Safety Monitor: Backend + Frontend" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Start Backend in a new PowerShell window
Write-Host "Launching Backend (FastAPI on Port 8000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'E:\Smart-Safety-Monitor'; .\backend\.venv\Scripts\python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

# 2. Start Frontend in a new PowerShell window
Write-Host "Launching Frontend (Vite on Port 5173)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd 'E:\Smart-Safety-Monitor\frontend'; npm run dev"

Write-Host ""
Write-Host "==========================================================" -ForegroundColor Green
Write-Host "Both servers launched in dedicated windows!" -ForegroundColor Green
Write-Host "Frontend URL: http://localhost:5173/" -ForegroundColor White
Write-Host "Backend API : http://localhost:8000/docs" -ForegroundColor White
Write-Host "==========================================================" -ForegroundColor Green
