#!/bin/bash
# Start ISL Translator Frontend Client

echo "🎨 Starting ISL Translator Frontend Client..."
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

cd "$(dirname "$0")/client"

# Start HTTP server
echo "✅ Starting HTTP server on http://localhost:8000"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📌 Open your browser and navigate to: http://localhost:8000"
echo "⚠️  Make sure the backend server is running on http://localhost:5001"
echo ""

python3 -m http.server 8000
