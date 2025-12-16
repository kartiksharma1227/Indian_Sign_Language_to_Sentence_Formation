/**
 * ISL Detector - Browser-based Camera Access and Detection
 *
 * This module handles:
 * - Camera access via browser getUserMedia API
 * - Frame capture and sending to backend API
 * - Word and sentence building logic
 * - UI updates and progress indicators
 */

class ISLDetector {
    constructor() {
        // Detection state
        this.isDetecting = false;
        this.detectionLoop = null;
        this.videoStream = null;

        // Word building state
        this.currentWord = '';
        this.currentSentence = '';
        this.detectedLetter = '';
        this.lastPrediction = '';
        this.predictionStartTime = 0;
        this.lastPredictionTime = 0;

        // Space gesture state
        this.spaceGestureActive = false;
        this.spaceGestureStartTime = 0;
        this.spaceGestureCooldownUntil = 0;

        // Configuration
        this.HOLD_TIME = 1.5; // seconds to hold a letter
        this.SPACE_HOLD_TIME = 1.5; // seconds to hold space gesture
        this.FRAME_INTERVAL = 150; // ms between frame captures

        // DOM elements
        this.initializeElements();
        this.bindEvents();
        this.populateQuickRef();
    }

    initializeElements() {
        this.videoFeed = document.getElementById('videoFeed');
        this.videoCanvas = document.getElementById('videoCanvas');
        this.ctx = this.videoCanvas ? this.videoCanvas.getContext('2d') : null;
        this.videoPlaceholder = document.getElementById('videoPlaceholder');
        this.startBtn = document.getElementById('startBtn');
        this.stopBtn = document.getElementById('stopBtn');
        this.backspaceBtn = document.getElementById('backspaceBtn');
        this.resetSentenceBtn = document.getElementById('resetSentenceBtn');
        this.saveSentenceBtn = document.getElementById('saveSentenceBtn');
        this.currentWordElement = document.getElementById('currentWord');
        this.currentSentenceElement = document.getElementById('currentSentence');
        this.detectedLetterElement = document.getElementById('detectedLetter');
        this.letterProgressBar = document.getElementById('letterProgress');
        this.letterProgressText = document.getElementById('letterProgressText');
        this.spaceProgressBar = document.getElementById('spaceProgress');
        this.spaceProgressText = document.getElementById('spaceProgressText');
        this.spaceDurationContainer = document.getElementById('spaceDurationContainer');
        this.connectionStatus = document.getElementById('connectionStatus');
    }

    bindEvents() {
        if (this.startBtn) {
            this.startBtn.addEventListener('click', () => this.startDetection());
        }
        if (this.stopBtn) {
            this.stopBtn.addEventListener('click', () => this.stopDetection());
        }
        if (this.backspaceBtn) {
            this.backspaceBtn.addEventListener('click', () => this.backspaceWord());
        }
        if (this.resetSentenceBtn) {
            this.resetSentenceBtn.addEventListener('click', () => this.resetSentence());
        }
        if (this.saveSentenceBtn) {
            this.saveSentenceBtn.addEventListener('click', () => this.saveSentence());
        }

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

            switch (e.key.toLowerCase()) {
                case 'backspace':
                    e.preventDefault();
                    this.backspaceWord();
                    break;
                case ' ':
                    e.preventDefault();
                    this.saveSentence();
                    break;
                case 'r':
                    e.preventDefault();
                    this.resetWord();
                    break;
                case 's':
                    e.preventDefault();
                    this.resetSentence();
                    break;
                case 'enter':
                    e.preventDefault();
                    if (this.isDetecting) {
                        this.stopDetection();
                    } else {
                        this.startDetection();
                    }
                    break;
            }
        });
    }

    populateQuickRef() {
        const grid = document.getElementById('quickRefGrid');
        if (!grid) return;

        const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
        grid.innerHTML = letters.map(letter => `
            <div class="ref-item">
                <img src="static/images/${letter}.jpg" alt="${letter}"
                     onerror="this.style.display='none'">
                <span class="ref-letter">${letter}</span>
            </div>
        `).join('');
    }

    async startDetection() {
        try {
            this.startBtn.disabled = true;
            this.startBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Starting...';

            // Request camera access
            this.videoStream = await navigator.mediaDevices.getUserMedia({
                video: {
                    width: { ideal: 640 },
                    height: { ideal: 480 },
                    facingMode: 'user'
                }
            });

            // Set up video element
            this.videoFeed.srcObject = this.videoStream;
            await this.videoFeed.play();

            // Set canvas dimensions
            this.videoCanvas.width = this.videoFeed.videoWidth || 640;
            this.videoCanvas.height = this.videoFeed.videoHeight || 480;

            this.isDetecting = true;
            this.showVideo();
            this.updateButtonStates();
            this.startDetectionLoop();

            showStatus('Camera started successfully!', 'success');

        } catch (error) {
            console.error('Error starting camera:', error);

            let message = 'Failed to start camera';
            if (error.name === 'NotAllowedError') {
                message = 'Camera permission denied. Please allow camera access.';
            } else if (error.name === 'NotFoundError') {
                message = 'No camera found. Please connect a camera.';
            }

            showStatus(message, 'error');
            this.resetStartButton();
        }
    }

    async stopDetection() {
        try {
            this.isDetecting = false;

            // Stop detection loop
            if (this.detectionLoop) {
                clearInterval(this.detectionLoop);
                this.detectionLoop = null;
            }

            // Stop video stream
            if (this.videoStream) {
                this.videoStream.getTracks().forEach(track => track.stop());
                this.videoStream = null;
            }

            this.videoFeed.srcObject = null;
            this.hideVideo();
            this.updateButtonStates();
            this.resetProgressBars();

            showStatus('Detection stopped', 'success');

        } catch (error) {
            console.error('Error stopping detection:', error);
            showStatus('Error stopping detection', 'error');
        }
    }

    startDetectionLoop() {
        if (!this.isDetecting) return;

        this.detectionLoop = setInterval(async () => {
            if (!this.isDetecting) return;

            try {
                // Capture frame from video
                const frameData = this.captureFrame();
                if (!frameData) return;

                // Send frame to backend API
                const result = await apiRequest('/api/process_frame', {
                    method: 'POST',
                    body: JSON.stringify({ frame: frameData })
                });

                if (result.status === 'success') {
                    this.processDetectionResult(result);
                }

            } catch (error) {
                // Silently handle errors to avoid flooding console
                if (error.message.includes('Failed to fetch')) {
                    this.updateConnectionStatus(false);
                }
            }
        }, this.FRAME_INTERVAL);
    }

    captureFrame() {
        if (!this.videoFeed || !this.ctx) return null;

        try {
            // Draw video frame to canvas
            this.ctx.drawImage(
                this.videoFeed,
                0, 0,
                this.videoCanvas.width,
                this.videoCanvas.height
            );

            // Convert to base64 JPEG
            return this.videoCanvas.toDataURL('image/jpeg', 0.8);
        } catch (error) {
            return null;
        }
    }

    processDetectionResult(result) {
        const currentTime = Date.now() / 1000;
        const detectedLetter = result.detected_letter || '';
        const handDetected = result.hand_detected;
        const isSpaceGesture = result.is_space_gesture;

        // Update detected letter display
        this.updateDetectedLetter(detectedLetter, handDetected);

        // Handle space gesture
        if (isSpaceGesture && currentTime >= this.spaceGestureCooldownUntil) {
            if (!this.spaceGestureActive) {
                this.spaceGestureActive = true;
                this.spaceGestureStartTime = currentTime;
            }

            const spaceProgress = Math.min(
                (currentTime - this.spaceGestureStartTime) / this.SPACE_HOLD_TIME,
                1.0
            );
            this.updateSpaceProgress(spaceProgress);

            if (spaceProgress >= 1.0) {
                this.addSpace();
                this.spaceGestureActive = false;
                this.spaceGestureStartTime = 0;
                this.spaceGestureCooldownUntil = currentTime + 1.5;
            }
        } else {
            this.spaceGestureActive = false;
            this.spaceGestureStartTime = 0;
            this.updateSpaceProgress(0);
        }

        // Handle letter detection (only if not doing space gesture)
        if (!isSpaceGesture && detectedLetter && handDetected) {
            if (detectedLetter === this.lastPrediction) {
                const holdTime = currentTime - this.predictionStartTime;
                const letterProgress = Math.min(holdTime / this.HOLD_TIME, 1.0);
                this.updateLetterProgress(letterProgress);

                if (holdTime >= this.HOLD_TIME &&
                    currentTime - this.lastPredictionTime >= this.HOLD_TIME) {
                    this.addLetter(detectedLetter);
                    this.lastPredictionTime = currentTime;
                    this.predictionStartTime = currentTime;
                }
            } else {
                this.lastPrediction = detectedLetter;
                this.predictionStartTime = currentTime;
                this.updateLetterProgress(0);
            }
        } else if (!handDetected) {
            this.lastPrediction = '';
            this.predictionStartTime = currentTime;
            this.updateLetterProgress(0);
        }

        this.updateConnectionStatus(true);
    }

    addLetter(letter) {
        this.currentWord += letter;
        this.updateWordDisplay();
        showStatus(`Added letter: ${letter}`, 'success', 1000);
    }

    async addSpace() {
        if (this.currentWord) {
            // Try to autocorrect the word
            try {
                const result = await apiRequest('/api/autocorrect', {
                    method: 'POST',
                    body: JSON.stringify({ word: this.currentWord })
                });

                const finalWord = result.corrected || this.currentWord;
                if (result.was_corrected) {
                    showStatus(`Autocorrected: "${this.currentWord}" -> "${finalWord}"`, 'info', 2000);
                }
                this.currentSentence += finalWord + ' ';
            } catch {
                this.currentSentence += this.currentWord + ' ';
            }

            this.currentWord = '';
        } else {
            if (!this.currentSentence.endsWith(' ')) {
                this.currentSentence += ' ';
            }
        }

        this.updateWordDisplay();
        this.updateSentenceDisplay();
        showStatus('Space added', 'success', 1000);
    }

    backspaceWord() {
        if (this.currentWord) {
            this.currentWord = this.currentWord.slice(0, -1);
            this.updateWordDisplay();
            showStatus('Character deleted', 'success', 1000);
        } else {
            showStatus('No characters to delete', 'error');
        }
    }

    resetWord() {
        this.currentWord = '';
        this.updateWordDisplay();
        showStatus('Word reset', 'success');
    }

    resetSentence() {
        this.currentWord = '';
        this.currentSentence = '';
        this.updateWordDisplay();
        this.updateSentenceDisplay();
        showStatus('Sentence reset', 'success');
    }

    saveSentence() {
        let finalSentence = this.currentSentence;
        if (this.currentWord) {
            finalSentence += this.currentWord;
        }

        if (finalSentence.trim()) {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const filename = `isl_sentence_${timestamp}.txt`;
            const content = `ISL Sentence - ${new Date().toLocaleString()}\n${'='.repeat(50)}\n${finalSentence.trim()}\n`;

            exportAsTextFile(content, filename);
            showStatus('Sentence exported!', 'success');
        } else {
            showStatus('No sentence to save', 'error');
        }
    }

    // UI Update Methods
    updateDetectedLetter(letter, handDetected) {
        if (!this.detectedLetterElement) return;

        const letterEl = this.detectedLetterElement.querySelector('.detected-letter');

        if (letter && handDetected) {
            this.detectedLetterElement.setAttribute('data-state', 'detecting');
            if (letterEl) letterEl.textContent = letter;
        } else if (!handDetected) {
            this.detectedLetterElement.setAttribute('data-state', 'no-hand');
            if (letterEl) letterEl.textContent = '-';
        } else {
            this.detectedLetterElement.setAttribute('data-state', 'idle');
            if (letterEl) letterEl.textContent = '-';
        }
    }

    updateWordDisplay() {
        if (this.currentWordElement) {
            if (this.currentWord) {
                this.currentWordElement.innerHTML = this.currentWord;
            } else {
                this.currentWordElement.innerHTML = '<span class="placeholder">Sign to begin</span>';
            }
        }
    }

    updateSentenceDisplay() {
        if (this.currentSentenceElement) {
            if (this.currentSentence.trim()) {
                this.currentSentenceElement.innerHTML = this.currentSentence;
            } else {
                this.currentSentenceElement.innerHTML = '<span class="placeholder">Your sentence will appear here...</span>';
            }
        }
    }

    updateLetterProgress(progress) {
        if (this.letterProgressBar) {
            this.letterProgressBar.style.width = `${progress * 100}%`;
        }
        if (this.letterProgressText) {
            const time = (progress * this.HOLD_TIME).toFixed(1);
            this.letterProgressText.textContent = `${time}s / ${this.HOLD_TIME}s`;
        }
    }

    updateSpaceProgress(progress) {
        if (this.spaceDurationContainer) {
            this.spaceDurationContainer.style.display = progress > 0 ? 'flex' : 'none';
        }
        if (this.spaceProgressBar) {
            this.spaceProgressBar.style.width = `${progress * 100}%`;
        }
        if (this.spaceProgressText) {
            const time = (progress * this.SPACE_HOLD_TIME).toFixed(1);
            this.spaceProgressText.textContent = `${time}s / ${this.SPACE_HOLD_TIME}s`;
        }
    }

    resetProgressBars() {
        this.updateLetterProgress(0);
        this.updateSpaceProgress(0);
    }

    updateConnectionStatus(isConnected) {
        if (this.connectionStatus) {
            if (isConnected) {
                this.connectionStatus.classList.add('connected');
                this.connectionStatus.querySelector('.status-text').textContent = 'Backend Connected';
            } else {
                this.connectionStatus.classList.remove('connected');
                this.connectionStatus.querySelector('.status-text').textContent = 'Backend Disconnected';
            }
        }
    }

    showVideo() {
        if (this.videoPlaceholder) this.videoPlaceholder.style.display = 'none';
        if (this.videoFeed) this.videoFeed.style.display = 'block';
    }

    hideVideo() {
        if (this.videoPlaceholder) this.videoPlaceholder.style.display = 'flex';
        if (this.videoFeed) this.videoFeed.style.display = 'none';
    }

    updateButtonStates() {
        if (this.isDetecting) {
            if (this.startBtn) this.startBtn.style.display = 'none';
            if (this.stopBtn) {
                this.stopBtn.style.display = 'inline-flex';
                this.stopBtn.disabled = false;
                this.stopBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Detection';
            }
        } else {
            if (this.stopBtn) this.stopBtn.style.display = 'none';
            if (this.startBtn) {
                this.startBtn.style.display = 'inline-flex';
                this.resetStartButton();
            }
        }
    }

    resetStartButton() {
        if (this.startBtn) {
            this.startBtn.disabled = false;
            this.startBtn.innerHTML = '<i class="fas fa-play"></i> Start Detection';
        }
    }
}

// Initialize detector when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('videoFeed')) {
        window.detector = new ISLDetector();
    }
});
