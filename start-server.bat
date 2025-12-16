@echo off
REM Start ISL Translator Backend Server (Windows)

echo Starting ISL Translator Backend Server...
echo ========================================

cd /d "%~dp0\server"

REM Check if virtual environment exists
if not exist "islvenv" (
    echo Virtual environment not found!
    echo Please run: cd server && python -m venv islvenv && islvenv\Scripts\activate && pip install -r requirements.txt
    pause
    exit /b 1
)

REM Activate virtual environment
echo Activating virtual environment...
call islvenv\Scripts\activate.bat

REM Check if dependencies are installed
python -c "import flask" 2>nul
if errorlevel 1 (
    echo Dependencies not installed!
    echo Installing dependencies...
    pip install -r requirements.txt
)

REM Start the server
echo Starting Flask server on http://localhost:5001
echo ========================================
python app.py
