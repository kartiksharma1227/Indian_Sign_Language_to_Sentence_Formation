# ISL Translator - Deployment Guide for Render

This guide explains how to deploy the ISL Translator application on Render.com with the new client-server architecture.

## Architecture Overview

The application is now split into two parts:

1. **Backend (server/)**: Flask API that processes video frames and runs the ML model
2. **Frontend (client/)**: Static HTML/CSS/JS that accesses the camera via browser APIs

This separation is necessary because:
- Render servers don't have cameras, so camera access must happen client-side
- The browser's `getUserMedia()` API allows accessing the user's webcam
- Frames are sent to the backend API for processing

---

## Directory Structure

```
Indian_Sign_Language_to_Sentence_Formation/
├── server/                    # Backend API (Deploy as Docker service)
│   ├── app.py                 # Flask API server
│   ├── model.h5               # ML model
│   ├── requirements.txt       # Python dependencies
│   ├── Dockerfile             # Docker configuration
│   └── render.yaml            # Render deployment config
│
├── client/                    # Frontend (Deploy as Static Site)
│   ├── index.html             # Home page
│   ├── detector.html          # Main detection page
│   ├── voice_to_sign.html     # Voice/text to sign converter
│   ├── about.html             # About page
│   ├── render.yaml            # Render deployment config
│   └── static/
│       ├── css/               # Stylesheets
│       ├── js/                # JavaScript files
│       └── images/            # Sign language images (A-Z)
│
└── DEPLOYMENT.md              # This file
```

---

## Step 1: Deploy the Backend API

### Option A: Using Render Dashboard

1. **Go to Render Dashboard**: https://dashboard.render.com/

2. **Create New Web Service**:
   - Click "New" → "Web Service"
   - Connect your GitHub repository
   - Select the repository containing your code

3. **Configure the Service**:
   - **Name**: `isl-translator-api` (or your preferred name)
   - **Region**: Choose closest to your users
   - **Root Directory**: `server` (IMPORTANT!)
   - **Runtime**: Docker
   - **Plan**: Free (or paid for better performance)

4. **Environment Variables** (if needed):
   - None required for basic setup

5. **Click "Create Web Service"**

6. **Wait for Deployment**:
   - Build typically takes 5-10 minutes
   - Once deployed, note your backend URL (e.g., `https://isl-translator-api.onrender.com`)

### Option B: Using render.yaml (Blueprint)

1. Push the `server/` folder to your repository
2. Go to Render Dashboard → Blueprints
3. Connect your repo and select `server/render.yaml`
4. Deploy

### Build Command (if using native runtime instead of Docker):
```bash
pip install -r requirements.txt
```

### Start Command (if using native runtime):
```bash
gunicorn app:app --bind 0.0.0.0:$PORT --workers 1 --timeout 120
```

---

## Step 2: Deploy the Frontend (Static Site)

### Before Deploying: Update API URL

**IMPORTANT**: Update the API URL in `client/detector.html` and `client/voice_to_sign.html`:

```javascript
// Change this line (around line 105 in detector.html):
window.API_BASE_URL = 'http://localhost:5001';

// To your Render backend URL:
window.API_BASE_URL = 'https://isl-translator-api.onrender.com';
```

### Deploy on Render as Static Site

1. **Create New Static Site**:
   - Click "New" → "Static Site"
   - Connect your GitHub repository

2. **Configure the Service**:
   - **Name**: `isl-translator-frontend`
   - **Root Directory**: `client` (IMPORTANT!)
   - **Build Command**: Leave empty or `echo "No build"`
   - **Publish Directory**: `.` (current directory)

3. **Click "Create Static Site"**

4. **Your frontend will be available at**:
   - `https://isl-translator-frontend.onrender.com`

### Alternative: Deploy on Other Static Hosts

The client can also be deployed on:
- **Netlify**: Drag and drop the `client/` folder
- **Vercel**: Connect repo, set root to `client/`
- **GitHub Pages**: Push `client/` contents to gh-pages branch

---

## Step 3: Configure CORS (If Needed)

The backend already includes CORS configuration, but if you face issues:

1. Update `server/app.py` CORS settings:
```python
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://isl-translator-frontend.onrender.com"],
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})
```

2. Redeploy the backend

---

## Testing the Deployment

### Test Backend Health:
```bash
curl https://your-backend-url.onrender.com/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "model_loaded": true,
  "spellchecker_available": true
}
```

### Test Frontend:
1. Open your frontend URL in a browser
2. Navigate to the Detector page
3. Click "Start Detection"
4. Allow camera access when prompted
5. Show hand signs to the camera
6. Check that letters are detected

---

## Troubleshooting

### Issue: Camera Not Working
- Ensure you're using HTTPS (required for getUserMedia)
- Check browser permissions
- Try a different browser

### Issue: Backend Not Responding
- Check Render logs for errors
- Verify the backend URL is correct
- Check if the free tier has gone to sleep (first request may be slow)

### Issue: CORS Errors
- Verify CORS origins match your frontend URL exactly
- Check for trailing slashes in URLs
- Redeploy backend after CORS changes

### Issue: Slow Detection
- Free tier has limited resources
- Consider upgrading to a paid plan for better performance
- Reduce frame sending rate in detector.js (increase FRAME_INTERVAL)

---

## Cost Considerations

### Render Free Tier Limitations:
- Services spin down after 15 minutes of inactivity
- First request after sleep takes ~30 seconds
- 750 hours/month of runtime

### For Production Use:
- Consider Render Starter plan ($7/month) for always-on service
- Or use Render paid static sites for custom domains

---

## Local Development

### Run Backend Locally:
```bash
cd server
pip install -r requirements.txt
python app.py
```

### Serve Frontend Locally:
```bash
cd client
python -m http.server 8000
# Or use any static file server
```

Then visit `http://localhost:8000` and ensure `API_BASE_URL` points to `http://localhost:5001`.

---

## Summary of Commands

| Component | Root Directory | Runtime | Build Command | Start Command |
|-----------|---------------|---------|---------------|---------------|
| Backend | `server` | Docker | (from Dockerfile) | (from Dockerfile) |
| Frontend | `client` | Static | - | - |

---

## Quick Reference: URLs to Update

After deployment, update these files with your actual backend URL:

1. `client/detector.html` (line ~105):
   ```javascript
   window.API_BASE_URL = 'https://YOUR-BACKEND.onrender.com';
   ```

2. `client/voice_to_sign.html` (line ~175):
   ```javascript
   window.API_BASE_URL = 'https://YOUR-BACKEND.onrender.com';
   ```

Replace `YOUR-BACKEND` with your actual Render service name.
