@echo off
title Smart Safety Monitor - Launcher
echo ==========================================================
echo Starting Smart Safety Monitor: Backend (FastAPI) + Frontend (React/Vite)
echo ==========================================================
echo.

:: 1. Start Backend in separate window
echo Starting Backend on http://localhost:8000 ...
start "Backend - FastAPI (Port 8000)" cmd /k "cd /d E:\Smart-Safety-Monitor && .\backend\.venv\Scripts\python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

:: 2. Start Frontend in separate window
echo Starting Frontend on http://localhost:5173 ...
start "Frontend - React Vite (Port 5173)" cmd /k "cd /d E:\Smart-Safety-Monitor\frontend && npm run dev"

echo.
echo ==========================================================
echo [SUCCESS] Both servers are starting up!
echo Frontend URL: http://localhost:5173/
echo Backend API : http://localhost:8000/docs
echo ==========================================================
pause
