# Indian_Sign_Language_to_Sentence_Formation

## Overview

This is a professional Flask web application for real-time Indian Sign Language (ISL) detection and translation. The application provides a modern, responsive interface for detecting hand gestures, building words, creating sentences, and saving translations.

## Features

- **Real-time Detection**: Live webcam feed with hand gesture recognition
- **Word Building**: Automatic letter-to-word formation with timing controls
- **Sentence Creation**: Smart space insertion between words
- **Save Functionality**: Export sentences to text files with timestamps
- **Professional UI**: Modern, responsive design inspired by professional web applications
- **Keyboard Shortcuts**: Quick access to common functions
- **Mobile Responsive**: Works on both desktop and mobile devices

## Prerequisites

- Python 3.8 or higher
- Webcam/Camera access
- Modern web browser (Chrome, Firefox, Safari, Edge)

## Installation Instructions

### 1. Clone or Download the Project

```bash
cd /path/to/your/project/directory
```

### 2. Create Virtual Environment (Recommended)

```bash
# Create virtual environment
python -m venv isl_env

# Activate virtual environment
# On macOS/Linux:
source isl_env/bin/activate
# On Windows:
isl_env\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install -r requirements.txt
```

### 4. Verify Model File

Ensure the `model.h5` file is present in the project root directory. This file contains the trained machine learning model for sign language recognition.

### 5. Create Required Directories

The application will automatically create the `saved_sentences` directory when you first save a sentence.

## Running the Application

### 1. Start the Flask Server

```bash
python app.py
```

The server will start on `http://localhost:5001` by default.

### 2. Access the Web Application

Open your web browser and navigate to:

```
http://localhost:5001
```

### 3. Using the Application

#### Home Page

- Overview of features and capabilities
- Navigation to detector and about pages
- Professional landing page with statistics

#### Detector Page

1. Click "Start Detection" to initialize the camera
2. Position your hand clearly in front of the camera
3. Make sign language gestures for letters (A-Z) or numbers (1-9)
4. Hold each gesture for 1.5 seconds to add it to your word
5. Remove your hand for 3 seconds to add a space between words
6. Use control buttons to reset words/sentences or save your work

#### Keyboard Shortcuts (Detector Page)

- `Enter`: Start/Stop detection
- `Space`: Save sentence
- `R`: Reset current word
- `S`: Reset entire sentence

#### About Page

- Technical details about the system
- How the technology works
- Feature explanations

## File Structure

```
ISL-Translator/
├── app.py                 # Main Flask application
├── model.h5              # Trained ML model
├── requirements.txt      # Python dependencies
├── README_WEBAPP.md     # This setup guide
├── templates/           # HTML templates
│   ├── base.html       # Base template
│   ├── index.html      # Home page
│   ├── detector.html   # Detector page
│   └── about.html      # About page
├── static/             # Static assets
│   ├── css/
│   │   └── style.css   # Main stylesheet
│   └── js/
│       ├── main.js     # Common JavaScript
│       └── detector.js # Detector functionality
└── saved_sentences/    # Generated sentence files
    ├── sentence_YYYYMMDD_HHMMSS.txt
    └── all_sentences.txt
```

## Troubleshooting

### Camera Issues

- Ensure your browser has camera permissions enabled
- Check if other applications are using the camera
- Try refreshing the page and clicking "Start Detection" again

### Performance Issues

- Close other applications that might be using the camera
- Ensure good lighting conditions for better detection
- Use a modern web browser for optimal performance

### Installation Issues

- Ensure Python 3.8+ is installed
- Try upgrading pip: `pip install --upgrade pip`
- If TensorFlow installation fails, try: `pip install tensorflow-cpu`

### Port Already in Use

If port 5000 is already in use, modify `app.py`:

```python
app.run(debug=True, host='0.0.0.0', port=5001)  # Change port number
```

## Configuration Options

### Timing Settings (in app.py)

- `HOLD_TIME = 1.5`: Time to hold gesture for letter detection
- `SPACE_DELAY = 3.0`: Time without hand to add space

### Camera Settings

- Resolution and detection parameters can be modified in the MediaPipe initialization

## API Endpoints

- `GET /`: Home page
- `GET /detector`: Detector page
- `GET /about`: About page
- `GET /start_detection`: Initialize camera
- `GET /get_detection`: Get current detection results
- `POST /save_sentence`: Save current sentence
- `POST /reset_word`: Reset current word
- `POST /reset_sentence`: Reset entire sentence
- `GET /stop_detection`: Stop camera

## Security Considerations

- All video processing happens locally (no data transmission)
- Saved files are stored locally only
- No personal data is collected or transmitted

## Browser Compatibility

- Chrome 80+ (Recommended)
- Firefox 75+
- Safari 13+
- Edge 80+

## Performance Tips

- Use good lighting for better detection accuracy
- Keep hand movements clear and distinct
- Ensure stable internet connection for initial loading
- Close unnecessary browser tabs for better performance

## Support

For technical issues or questions about the implementation, check:

1. Browser console for JavaScript errors
2. Terminal output for Python errors
3. Camera permissions in browser settings
4. File permissions for saved_sentences directory

## Development Mode

The application runs in debug mode by default. For production deployment:

1. Set `debug=False` in `app.run()`
2. Use a production WSGI server like Gunicorn
3. Configure proper logging
4. Set up environment variables for configuration

Enjoy using the ISL Translator web application!
