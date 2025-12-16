#!/bin/bash
# Start ISL Translator Backend Server

echo "🚀 Starting ISL Translator Backend Server..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$(dirname "$0")/server"

# Check if virtual environment exists
if [ ! -d "islvenv" ]; then
    echo "❌ Virtual environment not found!"
    echo "Please run: cd server && python -m venv islvenv && source islvenv/bin/activate && pip install -r requirements.txt"
    exit 1
fi

# Activate virtual environment
echo "📦 Activating virtual environment..."
source islvenv/bin/activate

# Check if dependencies are installed
if ! python -c "import flask" 2>/dev/null; then
    echo "❌ Dependencies not installed!"
    echo "Installing dependencies..."
    pip install -r requirements.txt
fi

# Start the server
echo "✅ Starting Flask server on http://localhost:5001"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
python app.py
