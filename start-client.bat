@echo off
REM Start ISL Translator Frontend Client (Windows)

echo Starting ISL Translator Frontend Client...
echo ========================================

cd /d "%~dp0\client"

echo Starting HTTP server on http://localhost:8000
echo ========================================
echo.
echo Open your browser and navigate to: http://localhost:8000
echo Make sure the backend server is running on http://localhost:5001
echo.

python -m http.server 8000
