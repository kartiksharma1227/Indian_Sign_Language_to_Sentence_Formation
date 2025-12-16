"""
ISL Translator Backend API - Stateless Frame Processing Server

This server receives video frames from the client, processes them with
MediaPipe for hand detection, and uses a TensorFlow model for gesture
classification. Designed for deployment on Render.

No camera access - the client handles camera via browser APIs.
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import cv2
import mediapipe as mp
import numpy as np
import copy
import itertools
import string
import base64
import os
import traceback

# Configure TensorFlow before importing
import tensorflow as tf
try:
    tf.config.threading.set_inter_op_parallelism_threads(2)
    tf.config.threading.set_intra_op_parallelism_threads(2)
except RuntimeError:
    pass

from tensorflow import keras

app = Flask(__name__)

# Enable CORS for all routes (client and server on different ports)
CORS(app, resources={
    r"/*": {
        "origins": "*",
        "methods": ["GET", "POST", "OPTIONS"],
        "allow_headers": ["Content-Type"]
    }
})

# Load ML model
model = None
try:
    model_path = os.path.join(os.path.dirname(__file__), "model.h5")
    if not os.path.exists(model_path):
        model_path = "model.h5"
    if os.path.exists(model_path):
        model = keras.models.load_model(model_path, compile=False)
        print(f"Model loaded successfully from {model_path}")
    else:
        print("Warning: model.h5 not found")
except Exception as e:
    print(f"Error loading model: {e}")
    traceback.print_exc()

# Initialize MediaPipe
mp_hands = mp.solutions.hands
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles

# Alphabet mapping
alphabet = ['1', '2', '3', '4', '5', '6', '7', '8', '9'] + list(string.ascii_uppercase)

# Spellchecker setup
try:
    from spellchecker import SpellChecker
    _spell = SpellChecker(distance=1)
    SPELLCHECKER_AVAILABLE = True
    print("pyspellchecker available")
except Exception:
    _spell = None
    SPELLCHECKER_AVAILABLE = False
    print("pyspellchecker NOT available")


def calc_landmark_list(image, landmarks):
    """Convert MediaPipe landmarks to pixel coordinates."""
    image_width, image_height = image.shape[1], image.shape[0]
    landmark_point = []
    for lm in landmarks.landmark:
        landmark_x = min(int(lm.x * image_width), image_width - 1)
        landmark_y = min(int(lm.y * image_height), image_height - 1)
        landmark_point.append([landmark_x, landmark_y])
    return landmark_point


def pre_process_landmark(landmark_list):
    """Normalize hand landmarks for model input."""
    temp_landmark_list = copy.deepcopy(landmark_list)
    base_x, base_y = 0, 0
    for index, landmark_point in enumerate(temp_landmark_list):
        if index == 0:
            base_x, base_y = landmark_point[0], landmark_point[1]
        temp_landmark_list[index][0] -= base_x
        temp_landmark_list[index][1] -= base_y
    temp_landmark_list = list(itertools.chain.from_iterable(temp_landmark_list))
    max_value = max(list(map(abs, temp_landmark_list))) if temp_landmark_list else 1
    if max_value > 0:
        temp_landmark_list = [n / max_value for n in temp_landmark_list]
    return temp_landmark_list


def detect_asl_space_gesture(landmarks):
    """Detect ASL 'H' gesture used as space trigger."""
    try:
        if not landmarks or len(landmarks) != 21:
            return False

        import math
        def _dist(p1, p2):
            return math.hypot(p1[0] - p2[0], p1[1] - p2[1])

        xs = [p[0] for p in landmarks]
        ys = [p[1] for p in landmarks]
        w = (max(xs) - min(xs)) + 1e-5
        h = (max(ys) - min(ys)) + 1e-5

        y_margin = 0.12 * h
        close_margin = 0.22 * w

        index_tip, index_pip = landmarks[8], landmarks[6]
        middle_tip, middle_pip = landmarks[12], landmarks[10]
        ring_tip, ring_pip = landmarks[16], landmarks[14]
        pinky_tip, pinky_pip = landmarks[20], landmarks[18]

        index_extended = index_tip[1] < (index_pip[1] - 0.5 * y_margin)
        middle_extended = middle_tip[1] < (middle_pip[1] - 0.5 * y_margin)
        ring_folded = ring_tip[1] > (ring_pip[1] + 0.35 * y_margin)
        pinky_folded = pinky_tip[1] > (pinky_pip[1] + 0.35 * y_margin)
        index_middle_close = _dist(index_tip, middle_tip) < close_margin

        return index_extended and middle_extended and ring_folded and pinky_folded and index_middle_close
    except Exception:
        return False


def get_autocorrect_suggestion(word):
    """Get spelling correction suggestion."""
    if not word or not word.strip():
        return word
    try:
        if SPELLCHECKER_AVAILABLE and _spell:
            cand = _spell.correction(word.lower())
            if cand and cand.lower() != word.lower():
                if word[0].isupper():
                    return cand.capitalize()
                return cand
    except Exception:
        pass
    return word


def decode_base64_image(base64_string):
    """Decode base64 string to OpenCV image."""
    try:
        # Remove data URL prefix if present
        if ',' in base64_string:
            base64_string = base64_string.split(',')[1]

        img_data = base64.b64decode(base64_string)
        nparr = np.frombuffer(img_data, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return img
    except Exception as e:
        print(f"Error decoding image: {e}")
        return None


@app.route('/')
def home():
    """Root endpoint - API information."""
    return jsonify({
        'name': 'ISL Translator Backend API',
        'version': '2.0',
        'status': 'running',
        'endpoints': {
            'health': '/api/health',
            'process_frame': '/api/process_frame (POST)',
            'autocorrect': '/api/autocorrect (POST)',
            'text_to_signs': '/api/text_to_signs (POST)',
            'static_images': '/static/images/<filename>'
        }
    })


@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint."""
    return jsonify({
        'status': 'healthy',
        'model_loaded': model is not None,
        'spellchecker_available': SPELLCHECKER_AVAILABLE
    })


@app.route('/api/process_frame', methods=['POST'])
def process_frame():
    """
    Process a single video frame for hand gesture detection.

    Expects JSON with:
        frame: base64 encoded image

    Returns:
        detected_letter: The recognized letter/number
        hand_detected: Whether a hand was found
        is_space_gesture: Whether the space (H) gesture was detected
        landmarks: Raw landmark coordinates (optional)
    """
    try:
        data = request.get_json()
        if not data or 'frame' not in data:
            return jsonify({'status': 'error', 'message': 'No frame provided'}), 400

        # Decode the frame
        frame = decode_base64_image(data['frame'])
        if frame is None:
            return jsonify({'status': 'error', 'message': 'Invalid frame data'}), 400

        # Flip horizontally (mirror effect)
        frame = cv2.flip(frame, 1)

        # Resize for processing
        processing_height = 240
        processing_width = 320
        processing_frame = cv2.resize(frame, (processing_width, processing_height))
        rgb_frame = cv2.cvtColor(processing_frame, cv2.COLOR_BGR2RGB)

        # Process with MediaPipe
        with mp_hands.Hands(
            static_image_mode=True,  # Single frame mode
            model_complexity=0,
            max_num_hands=1,
            min_detection_confidence=0.7,
            min_tracking_confidence=0.5
        ) as hands:
            results = hands.process(rgb_frame)

        detected_letter = ""
        hand_detected = False
        is_space_gesture = False
        landmarks_data = None

        if results and results.multi_hand_landmarks:
            hand_detected = True
            hand_landmarks = results.multi_hand_landmarks[0]

            # Get landmark coordinates
            landmark_list = calc_landmark_list(processing_frame, hand_landmarks)
            landmarks_data = landmark_list

            # Check for space gesture
            is_space_gesture = detect_asl_space_gesture(landmark_list)

            # Get prediction from model
            if model is not None and not is_space_gesture:
                try:
                    pre_processed = pre_process_landmark(landmark_list)
                    input_arr = np.asarray([pre_processed], dtype=np.float32)
                    predictions = model.predict(input_arr, verbose=0)
                    predicted_class = np.argmax(predictions, axis=1)[0]
                    if predicted_class < len(alphabet):
                        detected_letter = alphabet[predicted_class]
                except Exception as e:
                    print(f"Prediction error: {e}")

        return jsonify({
            'status': 'success',
            'detected_letter': detected_letter,
            'hand_detected': hand_detected,
            'is_space_gesture': is_space_gesture,
            'landmarks': landmarks_data
        })

    except Exception as e:
        print(f"Error processing frame: {e}")
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/autocorrect', methods=['POST'])
def autocorrect():
    """Autocorrect a word."""
    try:
        data = request.get_json()
        word = data.get('word', '')
        corrected = get_autocorrect_suggestion(word)
        return jsonify({
            'status': 'success',
            'original': word,
            'corrected': corrected,
            'was_corrected': corrected != word
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/api/text_to_signs', methods=['POST'])
def text_to_signs():
    """Convert text to sign language image sequence."""
    try:
        data = request.get_json() or {}
        text = data.get('text', '').upper()

        if not text.strip():
            return jsonify({'status': 'error', 'message': 'No text provided'})

        sign_sequence = []
        for char in text:
            if char.isalpha() and char in alphabet:
                sign_sequence.append({
                    'char': char,
                    'image': f'http://localhost:5001/static/images/{char}.jpg',
                    'type': 'letter'
                })
            elif char == ' ':
                sign_sequence.append({
                    'char': 'SPACE',
                    'image': '',
                    'type': 'space'
                })
            elif char.isdigit() and char in alphabet:
                sign_sequence.append({
                    'char': char,
                    'image': f'http://localhost:5001/static/images/{char}.jpg',
                    'type': 'number'
                })

        return jsonify({
            'status': 'success',
            'signs': sign_sequence,
            'message': f'Converted {len([s for s in sign_sequence if s["type"] == "letter"])} letters'
        })
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500


@app.route('/static/images/<path:filename>')
def serve_image(filename):
    """Serve sign language images from client/static/images directory."""
    try:
        # Get the directory of the current file (server/)
        server_dir = os.path.dirname(os.path.abspath(__file__))
        # Go up one level and into client/static/images
        images_dir = os.path.join(os.path.dirname(server_dir), 'client', 'static', 'images')
        return send_from_directory(images_dir, filename)
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 404


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    # Enable debug mode for development to see detailed error messages
    app.run(debug=True, host='0.0.0.0', port=port)
