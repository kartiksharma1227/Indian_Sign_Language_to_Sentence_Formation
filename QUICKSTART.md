# 🚀 Quick Start Guide - ISL Translator

## One-Time Setup

### 1. Install Server Dependencies

```bash
cd server
python3.10 -m venv islvenv
source islvenv/bin/activate  # On Windows: islvenv\Scripts\activate
pip install -r requirements.txt
```

## Running the Application

### Easy Method: Use Startup Scripts

#### macOS/Linux:

**Terminal 1 - Start Server:**

```bash
./start-server.sh
```

**Terminal 2 - Start Client:**

```bash
./start-client.sh
```

#### Windows:

**Terminal 1 - Start Server:**

```cmd
start-server.bat
```

**Terminal 2 - Start Client:**

```cmd
start-client.bat
```

### Manual Method:

**Terminal 1 - Server:**

```bash
cd server
source islvenv/bin/activate  # Windows: islvenv\Scripts\activate
python app.py
```

**Terminal 2 - Client:**

```bash
cd client
python -m http.server 8000
```

### Access the Application:

1. **Frontend:** http://localhost:8000
2. **Backend API:** http://localhost:5001

---

## ❗ Troubleshooting Common Issues

### Issue 1: Camera HTTP Error

**Problem:** Camera fails to open with HTTP error

**Solutions:**

1. **Check if server is running:**

   ```bash
   curl http://localhost:5001/api/health
   ```

   Should return: `{"status":"healthy","model_loaded":true,...}`

2. **Check CORS errors in browser console:**

   - Open browser DevTools (F12)
   - Look for CORS or network errors
   - Server should now have CORS enabled for all routes

3. **Verify server port:**
   - Server should be on port 5001
   - Client should be on port 8000
   - Check `client/static/js/main.js` - `API_BASE_URL` should be `http://localhost:5001`

### Issue 2: CSS Not Applied

**Problem:** Website looks broken or unstyled

**Solutions:**

1. **Check file paths:**

   - All HTML files should reference `static/css/...` (relative paths)
   - Open browser DevTools → Network tab
   - Look for failed CSS requests (404 errors)

2. **Verify client is running on HTTP server:**

   - Must use `python -m http.server 8000` or similar
   - Cannot open HTML files directly (file:// protocol won't work)

3. **Check client directory structure:**
   ```
   client/
   ├── index.html
   ├── detector.html
   ├── voice_to_sign.html
   ├── about.html
   └── static/
       ├── css/
       │   ├── base.css
       │   ├── index.css
       │   ├── detector.css
       │   ├── voice_to_sign.css
       │   └── about.css
       ├── images/
       │   ├── A.jpg
       │   ├── B.jpg
       │   └── ... (all letters)
       └── js/
           ├── main.js
           ├── detector.js
           └── voice_to_sign.js
   ```

### Issue 3: Images Not Loading in Voice-to-Sign

**Problem:** Sign language images don't show

**Solutions:**

1. **Server now serves images:**

   - Server has `/static/images/<filename>` endpoint
   - Serves images from `client/static/images/`

2. **Check image availability:**

   ```bash
   curl http://localhost:5001/static/images/A.jpg
   ```

   Should return image data

3. **Verify images exist:**
   ```bash
   ls client/static/images/
   ```
   Should show A.jpg through Z.jpg

### Issue 4: "Module Not Found" Errors

**Problem:** Python import errors when starting server

**Solutions:**

1. **Activate virtual environment:**

   ```bash
   cd server
   source islvenv/bin/activate  # Windows: islvenv\Scripts\activate
   ```

2. **Reinstall dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

3. **Check Python version:**
   ```bash
   python --version  # Should be 3.8 or higher
   ```

### Issue 5: Port Already in Use

**Problem:** "Address already in use" error

**Solutions:**

1. **Find and kill process using port 5001 (server):**

   ```bash
   # macOS/Linux
   lsof -ti:5001 | xargs kill -9

   # Windows
   netstat -ano | findstr :5001
   taskkill /PID <PID> /F
   ```

2. **Find and kill process using port 8000 (client):**

   ```bash
   # macOS/Linux
   lsof -ti:8000 | xargs kill -9

   # Windows
   netstat -ano | findstr :8000
   taskkill /PID <PID> /F
   ```

3. **Use different ports:**
   - Change server port in `server/app.py` (last line)
   - Change client port: `python -m http.server 9000`
   - Update `client/static/js/main.js` → `API_BASE_URL`

### Issue 6: Camera Permission Denied

**Problem:** Browser doesn't allow camera access

**Solutions:**

1. **Grant camera permissions:**

   - Chrome: Settings → Privacy and Security → Site Settings → Camera
   - Safari: Safari → Settings → Websites → Camera
   - Firefox: Preferences → Privacy & Security → Permissions → Camera

2. **Use HTTPS or localhost:**

   - Camera API requires secure context
   - `localhost` is considered secure
   - For production, use HTTPS

3. **Check if another app is using camera:**
   - Close Zoom, Teams, or other video apps
   - Restart browser

---

## 🔍 Quick Health Check

Run this command to test if everything is working:

```bash
# Test server
curl http://localhost:5001/api/health

# Test image serving
curl -I http://localhost:5001/static/images/A.jpg

# Test client
curl http://localhost:8000/
```

All should return successful responses (200 OK).

---

## 📊 Verify Setup

Open browser to http://localhost:8000 and check:

- ✅ Homepage loads with proper styling
- ✅ Navigation works (all links accessible)
- ✅ "Sign to Text" page shows camera controls
- ✅ "Voice to Sign" page shows input fields
- ✅ CSS is applied (pages look styled, not plain HTML)

---

## 🆘 Still Having Issues?

1. **Check browser console** (F12) for JavaScript errors
2. **Check terminal** where server is running for Python errors
3. **Verify file structure** matches the project structure in README
4. **Try different browser** (Chrome/Edge recommended)
5. **Restart both server and client**

---

## 📝 Development Tips

- **Server Changes:** Restart Flask server to see changes
- **Client Changes:** Just refresh browser (no restart needed)
- **CSS Changes:** Hard refresh browser (Ctrl+F5 / Cmd+Shift+R)
- **Enable Debug:** Server runs with `debug=True` for detailed errors
