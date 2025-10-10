from flask import Flask, render_template, Response, jsonify, request
import cv2
import mediapipe as mp
import copy
import itertools
from tensorflow import keras
import numpy as np
import pandas as pd
import string
import time
from datetime import datetime
import os
import json
import base64

app = Flask(__name__)

# Load the model
model = keras.models.load_model("model.h5")

# Initialize MediaPipe
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
mp_hands = mp.solutions.hands

# Alphabet for predictions
alphabet = ['1','2','3','4','5','6','7','8','9'] + list(string.ascii_uppercase)

# Global variables for video processing
camera = None
hands_detector = None

# Session variables for word/sentence building
current_sentence = ""
current_word = ""
last_prediction = ""
prediction_start_time = 0
HOLD_TIME = 1.5
last_prediction_time = 0
no_hand_start_time = 0
SPACE_DELAY = 3.0
hand_detected_last_frame = False

def init_camera():
    """Initialize camera and MediaPipe hands detector"""
    global camera, hands_detector
    try:
        if camera is None:
            print("Initializing camera...")
            camera = cv2.VideoCapture(0)
            if not camera.isOpened():
                print("Failed to open camera")
                camera = None
                return False
            print("Camera initialized successfully")
        
        if hands_detector is None:
            print("Initializing MediaPipe hands detector...")
            hands_detector = mp_hands.Hands(
                model_complexity=0,
                max_num_hands=2,
                min_detection_confidence=0.5,
                min_tracking_confidence=0.5
            )
            print("MediaPipe hands detector initialized successfully")
        
        return camera is not None and camera.isOpened()
    except Exception as e:
        print(f"Error initializing camera: {e}")
        return False

def calc_landmark_list(image, landmarks):
    """Convert MediaPipe landmarks to pixel coordinates"""
    image_width, image_height = image.shape[1], image.shape[0]
    landmark_point = []
    
    for _, landmark in enumerate(landmarks.landmark):
        landmark_x = min(int(landmark.x * image_width), image_width - 1)
        landmark_y = min(int(landmark.y * image_height), image_height - 1)
        landmark_point.append([landmark_x, landmark_y])
    
    return landmark_point

def pre_process_landmark(landmark_list):
    """Preprocess landmarks for model prediction"""
    temp_landmark_list = copy.deepcopy(landmark_list)
    
    # Convert to relative coordinates
    base_x, base_y = 0, 0
    for index, landmark_point in enumerate(temp_landmark_list):
        if index == 0:
            base_x, base_y = landmark_point[0], landmark_point[1]
        temp_landmark_list[index][0] = temp_landmark_list[index][0] - base_x
        temp_landmark_list[index][1] = temp_landmark_list[index][1] - base_y
    
    # Convert to one-dimensional list
    temp_landmark_list = list(itertools.chain.from_iterable(temp_landmark_list))
    
    # Normalization
    max_value = max(list(map(abs, temp_landmark_list)))
    if max_value > 0:
        temp_landmark_list = [n / max_value for n in temp_landmark_list]
    
    return temp_landmark_list

def save_sentence_to_file(sentence, filename=None):
    """Save sentence to file"""
    if not sentence.strip():
        return False
    
    if not os.path.exists("saved_sentences"):
        os.makedirs("saved_sentences")
    
    if filename is None:
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"saved_sentences/sentence_{timestamp}.txt"
    else:
        filename = f"saved_sentences/{filename}.txt"
    
    try:
        with open(filename, 'w') as file:
            file.write(f"ISL Sentence - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
            file.write("="*50 + "\n")
            file.write(sentence.strip() + "\n")
        return True
    except Exception as e:
        print(f"Error saving file: {e}")
        return False

@app.route('/')
def index():
    """Main page"""
    return render_template('index.html')

@app.route('/detector')
def detector():
    """Sign language detector page"""
    return render_template('detector.html')

@app.route('/about')
def about():
    """About page"""
    return render_template('about.html')

@app.route('/test')
def test():
    """Test route to check if server is responding"""
    return jsonify({'status': 'success', 'message': 'Server is responding'})

@app.route('/start_detection')
def start_detection():
    """Initialize camera for detection"""
    try:
        print("Start detection route called")
        if init_camera():
            print("Camera initialization successful")
            return jsonify({'status': 'success', 'message': 'Camera initialized'})
        else:
            print("Camera initialization failed")
            return jsonify({'status': 'error', 'message': 'Failed to initialize camera. Please check if camera is available and not being used by another application.'})
    except Exception as e:
        print(f"Error in start_detection route: {e}")
        return jsonify({'status': 'error', 'message': f'Camera initialization error: {str(e)}'})

@app.route('/get_detection')
def get_detection():
    """Get current detection results"""
    global current_sentence, current_word, last_prediction, prediction_start_time, last_prediction_time
    global no_hand_start_time, SPACE_DELAY, hand_detected_last_frame, camera, hands_detector
    
    try:
        if camera is None or hands_detector is None:
            return jsonify({'status': 'error', 'message': 'Camera not initialized'})
        
        if not camera.isOpened():
            return jsonify({'status': 'error', 'message': 'Camera is not open'})
        
        success, frame = camera.read()
        if not success:
            return jsonify({'status': 'error', 'message': 'Failed to read from camera'})
    except Exception as e:
        print(f"Error in get_detection: {e}")
        return jsonify({'status': 'error', 'message': f'Detection error: {str(e)}'})
    
    # Flip frame horizontally
    frame = cv2.flip(frame, 1)
    
    # Convert to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    results = hands_detector.process(rgb_frame)
    
    current_time = time.time()
    detected_letter = ""
    hand_detected = False
    
    if results.multi_hand_landmarks:
        hand_detected = True
        for hand_landmarks in results.multi_hand_landmarks:
            # Draw landmarks
            mp_drawing.draw_landmarks(
                frame, hand_landmarks, mp_hands.HAND_CONNECTIONS,
                mp_drawing_styles.get_default_hand_landmarks_style(),
                mp_drawing_styles.get_default_hand_connections_style()
            )
            
            # Process landmarks
            landmark_list = calc_landmark_list(frame, hand_landmarks)
            pre_processed_landmarks = pre_process_landmark(landmark_list)
            
            # Predict
            df = pd.DataFrame(pre_processed_landmarks).transpose()
            predictions = model.predict(df, verbose=0)
            predicted_classes = np.argmax(predictions, axis=1)
            detected_letter = alphabet[predicted_classes[0]]
            
            # Word building logic
            if detected_letter == last_prediction:
                if current_time - prediction_start_time >= HOLD_TIME:
                    if current_time - last_prediction_time >= HOLD_TIME:
                        current_word += detected_letter
                        last_prediction_time = current_time
                        prediction_start_time = current_time  # Reset to prevent immediate re-append
            else:
                last_prediction = detected_letter
                prediction_start_time = current_time
    
    # Handle space addition
    if not hand_detected:
        if hand_detected_last_frame:
            no_hand_start_time = current_time
        elif current_time - no_hand_start_time >= SPACE_DELAY and current_word:
            current_sentence += current_word + " "
            current_word = ""
            no_hand_start_time = current_time
        
        last_prediction = ""
        prediction_start_time = current_time
    
    hand_detected_last_frame = hand_detected
    
    # Convert frame to base64 for transmission
    _, buffer = cv2.imencode('.jpg', frame)
    frame_base64 = base64.b64encode(buffer).decode('utf-8')
    
    # Calculate progress
    letter_progress = 0
    space_progress = 0
    
    if hand_detected and detected_letter == last_prediction:
        letter_progress = min((current_time - prediction_start_time) / HOLD_TIME, 1.0)
    
    if not hand_detected and current_word:
        space_progress = min((current_time - no_hand_start_time) / SPACE_DELAY, 1.0)
    
    return jsonify({
        'status': 'success',
        'frame': frame_base64,
        'detected_letter': detected_letter,
        'current_word': current_word,
        'current_sentence': current_sentence,
        'letter_progress': letter_progress,
        'space_progress': space_progress,
        'hand_detected': hand_detected
    })

@app.route('/save_sentence', methods=['POST'])
def save_sentence():
    """Save current sentence"""
    global current_sentence, current_word
    
    final_sentence = current_sentence
    if current_word:
        final_sentence += current_word
    
    if final_sentence.strip():
        if save_sentence_to_file(final_sentence):
            return jsonify({'status': 'success', 'message': 'Sentence saved successfully!'})
        else:
            return jsonify({'status': 'error', 'message': 'Failed to save sentence'})
    else:
        return jsonify({'status': 'error', 'message': 'No sentence to save'})

@app.route('/reset_word', methods=['POST'])
def reset_word():
    """Reset current word"""
    global current_word
    current_word = ""
    return jsonify({'status': 'success', 'message': 'Word reset'})

@app.route('/reset_sentence', methods=['POST'])
def reset_sentence():
    """Reset entire sentence"""
    global current_sentence, current_word
    current_sentence = ""
    current_word = ""
    return jsonify({'status': 'success', 'message': 'Sentence reset'})

@app.route('/stop_detection')
def stop_detection():
    """Stop camera detection"""
    global camera, hands_detector
    if camera is not None:
        camera.release()
        camera = None
    if hands_detector is not None:
        hands_detector.close()
        hands_detector = None
    return jsonify({'status': 'success', 'message': 'Detection stopped'})

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)