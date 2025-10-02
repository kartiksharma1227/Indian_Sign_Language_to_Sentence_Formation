// Detector page JavaScript
class ISLDetector {
  constructor() {
    this.isDetecting = false;
    this.detectionInterval = null;
    this.canvas = document.getElementById("videoCanvas");
    this.ctx = this.canvas ? this.canvas.getContext("2d") : null;
    this.currentWord = "";
    this.currentSentence = "";
    this.detectedLetter = "";

    this.initializeElements();
    this.bindEvents();
  }

  initializeElements() {
    // Get DOM elements
    this.startBtn = document.getElementById("startBtn");
    this.stopBtn = document.getElementById("stopBtn");
    this.videoPlaceholder = document.getElementById("videoPlaceholder");
    this.letterProgressBar = document.getElementById("letterProgress");
    this.spaceProgressBar = document.getElementById("spaceProgress");
    this.letterProgressText = document.getElementById("letterProgressText");
    this.spaceProgressText = document.getElementById("spaceProgressText");
    this.spaceProgressContainer = document.getElementById(
      "spaceProgressContainer"
    );
    this.detectedLetterElement = document.getElementById("detectedLetter");
    this.currentWordElement = document.getElementById("currentWord");
    this.currentSentenceElement = document.getElementById("currentSentence");
    this.resetWordBtn = document.getElementById("resetWordBtn");
    this.resetSentenceBtn = document.getElementById("resetSentenceBtn");
    this.saveSentenceBtn = document.getElementById("saveSentenceBtn");
  }

  bindEvents() {
    if (this.startBtn) {
      this.startBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.startDetection();
      });
    }

    if (this.stopBtn) {
      this.stopBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.stopDetection();
      });
    }

    if (this.resetWordBtn) {
      this.resetWordBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.resetWord();
      });
    }

    if (this.resetSentenceBtn) {
      this.resetSentenceBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.resetSentence();
      });
    }

    if (this.saveSentenceBtn) {
      this.saveSentenceBtn.addEventListener("click", (e) => {
        e.preventDefault();
        this.saveSentence();
      });
    }
  }

  async startDetection() {
    try {
      // Show loading state
      this.startBtn.disabled = true;
      this.startBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Starting...';

      // Initialize camera on backend
      const response = await fetch("/start_detection");

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.status === "success") {
        this.isDetecting = true;
        this.showVideoCanvas();
        this.startDetectionLoop();
        this.updateButtonStates();
        showStatus("Camera started successfully!", "success");
      } else {
        showStatus(result.message || "Failed to start camera", "error");
        this.resetStartButton();
      }
    } catch (error) {
      console.error("Error starting detection:", error);
      showStatus(`Error starting detection: ${error.message}`, "error");
      this.resetStartButton();
    }
  }

  async stopDetection() {
    try {
      // Show loading state
      this.stopBtn.disabled = true;
      this.stopBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Stopping...';

      // Stop detection loop
      this.isDetecting = false;
      if (this.detectionInterval) {
        clearInterval(this.detectionInterval);
        this.detectionInterval = null;
      }

      // Stop camera on backend
      const response = await fetch("/stop_detection");
      const result = await response.json();

      this.hideVideoCanvas();
      this.updateButtonStates();
      this.resetProgressBars();
      showStatus("Detection stopped", "success");
    } catch (error) {
      console.error("Error stopping detection:", error);
      showStatus("Error stopping detection", "error");
    }
  }

  startDetectionLoop() {
    if (!this.isDetecting) return;

    this.detectionInterval = setInterval(async () => {
      if (!this.isDetecting) return;

      try {
        const response = await fetch("/get_detection");
        const data = await response.json();

        if (data.status === "success") {
          this.updateDisplay(data);
          this.drawVideoFrame(data.frame);
        } else {
          console.error("Detection error:", data.message);
        }
      } catch (error) {
        console.error("Error in detection loop:", error);
      }
    }, 100); // Update every 100ms for smooth experience
  }

  updateDisplay(data) {
    // Update detected letter
    this.detectedLetter = data.detected_letter || "";
    if (this.detectedLetterElement) {
      this.detectedLetterElement.textContent = this.detectedLetter || "-";
    }

    // Update current word
    this.currentWord = data.current_word || "";
    if (this.currentWordElement) {
      if (this.currentWord) {
        this.currentWordElement.innerHTML = this.currentWord;
        this.currentWordElement.classList.remove("placeholder-text");
      } else {
        this.currentWordElement.innerHTML =
          '<span class="placeholder-text">Start signing to build words...</span>';
      }
    }

    // Update current sentence
    this.currentSentence = data.current_sentence || "";
    if (this.currentSentenceElement) {
      if (this.currentSentence.trim()) {
        this.currentSentenceElement.innerHTML = this.currentSentence;
        this.currentSentenceElement.classList.remove("placeholder-text");
      } else {
        this.currentSentenceElement.innerHTML =
          '<span class="placeholder-text">Words will appear here...</span>';
      }
    }

    // Update progress bars
    this.updateProgressBars(data);
  }

  updateProgressBars(data) {
    // Letter progress
    const letterProgress = (data.letter_progress || 0) * 100;
    if (this.letterProgressBar) {
      this.letterProgressBar.style.width = `${letterProgress}%`;
    }

    if (this.letterProgressText) {
      if (letterProgress > 0 && data.detected_letter) {
        const remainingTime = ((1 - data.letter_progress) * 1.5).toFixed(1);
        this.letterProgressText.textContent = `Adding "${data.detected_letter}" in ${remainingTime}s`;
      } else {
        this.letterProgressText.textContent = "Hold gesture for 1.5s";
      }
    }

    // Space progress
    const spaceProgress = (data.space_progress || 0) * 100;
    if (this.spaceProgressBar) {
      this.spaceProgressBar.style.width = `${spaceProgress}%`;
    }

    if (this.spaceProgressContainer) {
      if (spaceProgress > 0 && this.currentWord) {
        this.spaceProgressContainer.style.display = "block";
        if (this.spaceProgressText) {
          const remainingTime = ((1 - data.space_progress) * 3.0).toFixed(1);
          this.spaceProgressText.textContent = `Adding space in ${remainingTime}s`;
        }
      } else {
        this.spaceProgressContainer.style.display = "none";
      }
    }
  }

  drawVideoFrame(frameData) {
    if (!this.canvas || !this.ctx || !frameData) return;

    try {
      const img = new Image();
      img.onload = () => {
        this.canvas.width = img.width;
        this.canvas.height = img.height;
        this.ctx.drawImage(img, 0, 0);
      };
      img.src = `data:image/jpeg;base64,${frameData}`;
    } catch (error) {
      console.error("Error drawing video frame:", error);
    }
  }

  showVideoCanvas() {
    if (this.videoPlaceholder) {
      this.videoPlaceholder.style.display = "none";
    }
    if (this.canvas) {
      this.canvas.style.display = "block";
    }
  }

  hideVideoCanvas() {
    if (this.videoPlaceholder) {
      this.videoPlaceholder.style.display = "flex";
    }
    if (this.canvas) {
      this.canvas.style.display = "none";
    }
  }

  updateButtonStates() {
    if (this.isDetecting) {
      // Detection is running
      if (this.startBtn) {
        this.startBtn.style.display = "none";
      }
      if (this.stopBtn) {
        this.stopBtn.style.display = "inline-flex";
        this.stopBtn.disabled = false;
        this.stopBtn.innerHTML = '<i class="fas fa-stop"></i> Stop Detection';
      }
    } else {
      // Detection is stopped
      if (this.startBtn) {
        this.startBtn.style.display = "inline-flex";
        this.resetStartButton();
      }
      if (this.stopBtn) {
        this.stopBtn.style.display = "none";
      }
    }
  }

  resetStartButton() {
    if (this.startBtn) {
      this.startBtn.disabled = false;
      this.startBtn.innerHTML = '<i class="fas fa-play"></i> Start Detection';
    }
  }

  resetProgressBars() {
    if (this.letterProgressBar) {
      this.letterProgressBar.style.width = "0%";
    }
    if (this.spaceProgressBar) {
      this.spaceProgressBar.style.width = "0%";
    }
    if (this.letterProgressText) {
      this.letterProgressText.textContent = "Hold gesture for 1.5s";
    }
    if (this.spaceProgressContainer) {
      this.spaceProgressContainer.style.display = "none";
    }
  }

  async resetWord() {
    try {
      const response = await fetch("/reset_word", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (result.status === "success") {
        showStatus("Word reset successfully", "success");
      } else {
        showStatus(result.message || "Failed to reset word", "error");
      }
    } catch (error) {
      console.error("Error resetting word:", error);
      showStatus("Error resetting word", "error");
    }
  }

  async resetSentence() {
    try {
      const response = await fetch("/reset_sentence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (result.status === "success") {
        showStatus("Sentence reset successfully", "success");
      } else {
        showStatus(result.message || "Failed to reset sentence", "error");
      }
    } catch (error) {
      console.error("Error resetting sentence:", error);
      showStatus("Error resetting sentence", "error");
    }
  }

  async saveSentence() {
    try {
      // Show loading state
      const originalText = this.saveSentenceBtn.innerHTML;
      this.saveSentenceBtn.disabled = true;
      this.saveSentenceBtn.innerHTML =
        '<i class="fas fa-spinner fa-spin"></i> Saving...';

      const response = await fetch("/save_sentence", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });
      const result = await response.json();

      if (result.status === "success") {
        showStatus("Sentence saved successfully!", "success");
      } else {
        showStatus(result.message || "Failed to save sentence", "error");
      }

      // Reset button state
      this.saveSentenceBtn.disabled = false;
      this.saveSentenceBtn.innerHTML = originalText;
    } catch (error) {
      console.error("Error saving sentence:", error);
      showStatus("Error saving sentence", "error");

      // Reset button state
      this.saveSentenceBtn.disabled = false;
      this.saveSentenceBtn.innerHTML =
        '<i class="fas fa-save"></i> Save Sentence';
    }
  }
}

// Initialize detector when page loads
document.addEventListener("DOMContentLoaded", function () {
  // Only initialize if we're on the detector page
  if (document.getElementById("videoCanvas")) {
    const detector = new ISLDetector();
    window.detector = detector; // Make it globally accessible for onclick handlers

    // Handle page unload to stop detection
    window.addEventListener("beforeunload", function () {
      if (detector.isDetecting) {
        detector.stopDetection();
      }
    });

    // Add keyboard shortcuts
    document.addEventListener("keydown", function (event) {
      // Only handle shortcuts if not typing in an input
      if (
        event.target.tagName === "INPUT" ||
        event.target.tagName === "TEXTAREA"
      ) {
        return;
      }

      switch (event.key.toLowerCase()) {
        case " ": // Space to save sentence
          event.preventDefault();
          detector.saveSentence();
          break;
        case "r": // R to reset word
          event.preventDefault();
          detector.resetWord();
          break;
        case "s": // S to reset sentence
          event.preventDefault();
          detector.resetSentence();
          break;
        case "enter": // Enter to start/stop detection
          event.preventDefault();
          if (detector.isDetecting) {
            detector.stopDetection();
          } else {
            detector.startDetection();
          }
          break;
      }
    });

    // Add visual feedback for keyboard shortcuts
    const shortcutInfo = document.createElement("div");
    shortcutInfo.className = "keyboard-shortcuts";
    shortcutInfo.innerHTML = `
            <h4><i class="fas fa-keyboard"></i> Keyboard Shortcuts</h4>
            <div class="shortcut-list">
                <span><kbd>Enter</kbd> Start/Stop Detection</span>
                <span><kbd>Space</kbd> Save Sentence</span>
                <span><kbd>R</kbd> Reset Word</span>
                <span><kbd>S</kbd> Reset Sentence</span>
            </div>
        `;

    // Add CSS for keyboard shortcuts
    const style = document.createElement("style");
    style.textContent = `
            .keyboard-shortcuts {
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: rgba(255, 255, 255, 0.95);
                padding: 0.75rem;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
                font-size: 0.75rem;
                z-index: 1000;
                backdrop-filter: blur(10px);
                max-width: 200px;
            }
            .keyboard-shortcuts h4 {
                margin: 0 0 0.5rem 0;
                color: var(--gray-700);
                display: flex;
                align-items: center;
                gap: 0.5rem;
                font-size: 0.875rem;
            }
            .keyboard-shortcuts h4 i {
                color: var(--primary-color);
            }
            .shortcut-list {
                display: flex;
                flex-direction: column;
                gap: 0.25rem;
            }
            .shortcut-list span {
                color: var(--gray-600);
            }
            kbd {
                background: var(--gray-100);
                border-radius: 4px;
                padding: 2px 6px;
                font-family: monospace;
                font-size: 0.75rem;
                font-weight: 600;
                color: var(--gray-700);
                border: 1px solid var(--gray-300);
                margin-right: 0.5rem;
            }
            @media (max-width: 768px) {
                .keyboard-shortcuts {
                    position: fixed;
                    bottom: 10px;
                    right: 10px;
                    left: auto;
                    font-size: 0.625rem;
                    padding: 0.5rem;
                    max-width: 150px;
                }
                .keyboard-shortcuts h4 {
                    font-size: 0.75rem;
                }
            }
        `;
    document.head.appendChild(style);
    document.body.appendChild(shortcutInfo);
  }
});
