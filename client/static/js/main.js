/**
 * Main JavaScript Module for ISL Translator Application (Client-Side)
 *
 * Provides common functionality across all pages including:
 * - Mobile navigation menu handling
 * - Smooth scrolling for anchor links
 * - Scroll-based animations
 * - Parallax effects
 * - Utility functions for status messages and timing
 * - API request helper for backend communication
 */

// ===== API CONFIGURATION =====
// Change this to your deployed backend URL for production
const API_BASE_URL = window.API_BASE_URL || 'http://localhost:5001';

/**
 * Make an API request to the backend server
 *
 * @param {string} endpoint - API endpoint (e.g., '/api/process_frame')
 * @param {Object} options - Fetch options (method, body, etc.)
 * @returns {Promise<Object>} - Parsed JSON response
 */
async function apiRequest(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...options.headers,
        },
    };

    try {
        const response = await fetch(url, mergedOptions);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(`API request failed: ${endpoint}`, error);
        throw error;
    }
}

/**
 * Check if the backend API is healthy
 * @returns {Promise<boolean>}
 */
async function checkApiHealth() {
    try {
        const result = await apiRequest('/api/health');
        return result.status === 'healthy';
    } catch {
        return false;
    }
}

/**
 * Export text content as a downloadable file
 *
 * @param {string} content - File content
 * @param {string} filename - Name for the downloaded file
 */
function exportAsTextFile(content, filename = 'sentence.txt') {
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

/**
 * Display a status message to the user
 *
 * @param {string} message - The message text to display
 * @param {string} [type='success'] - Message type: 'success', 'error', 'warning', or 'info'
 * @param {number} [duration=3000] - How long to display the message in milliseconds
 */
function showStatus(message, type = "success", duration = 3000) {
    // Remove existing status messages
    const existingMessages = document.querySelectorAll(".status-message");
    existingMessages.forEach((msg) => msg.remove());

    // Create new status message
    const statusElement = document.createElement("div");
    statusElement.className = `status-message ${type}`;
    statusElement.textContent = message;

    document.body.appendChild(statusElement);

    // Show the message
    setTimeout(() => {
        statusElement.classList.add("show");
    }, 100);

    // Hide and remove the message
    setTimeout(() => {
        statusElement.classList.remove("show");
        setTimeout(() => {
            statusElement.remove();
        }, 300);
    }, duration);
}

/**
 * Format seconds into MM:SS display format
 *
 * @param {number} seconds - Total seconds to format
 * @returns {string} Formatted time string in MM:SS format
 */
function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

/**
 * Create a debounced version of a function to limit call frequency
 *
 * @param {Function} func - The function to debounce
 * @param {number} wait - Milliseconds to wait before executing function
 * @returns {Function} Debounced version of the original function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Initialize all common functionality when DOM is fully loaded
 */
document.addEventListener("DOMContentLoaded", function () {
    // Mobile navigation toggle
    const navToggle = document.querySelector(".nav-toggle");
    const navMenu = document.querySelector(".nav-menu");

    /**
     * Toggle mobile navigation menu on hamburger button click
     */
    if (navToggle && navMenu) {
        navToggle.addEventListener("click", function () {
            navMenu.classList.toggle("active");

            // Animate hamburger menu
            const bars = navToggle.querySelectorAll(".bar");
            bars.forEach((bar, index) => {
                if (navMenu.classList.contains("active")) {
                    if (index === 0)
                        bar.style.transform = "rotate(45deg) translate(5px, 5px)";
                    if (index === 1) bar.style.opacity = "0";
                    if (index === 2)
                        bar.style.transform = "rotate(-45deg) translate(7px, -6px)";
                } else {
                    bar.style.transform = "none";
                    bar.style.opacity = "1";
                }
            });
        });
    }

    /**
     * Close mobile menu when clicking on any navigation link
     */
    const navLinks = document.querySelectorAll(".nav-link");
    navLinks.forEach((link) => {
        link.addEventListener("click", () => {
            if (navMenu && navMenu.classList.contains("active")) {
                navMenu.classList.remove("active");
                if (navToggle) {
                    const bars = navToggle.querySelectorAll(".bar");
                    bars.forEach((bar) => {
                        bar.style.transform = "none";
                        bar.style.opacity = "1";
                    });
                }
            }
        });
    });

    /**
     * Enable smooth scrolling for all anchor links
     */
    const anchorLinks = document.querySelectorAll('a[href^="#"]');
    anchorLinks.forEach((link) => {
        link.addEventListener("click", function (e) {
            e.preventDefault();
            const targetId = this.getAttribute("href");
            const targetElement = document.querySelector(targetId);
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                });
            }
        });
    });

    /**
     * Setup Intersection Observer for scroll-based animations
     */
    const observerOptions = {
        threshold: 0.1,
        rootMargin: "0px 0px -100px 0px",
    };

    const observer = new IntersectionObserver(function (entries) {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.style.opacity = "1";
                entry.target.style.transform = "translateY(0)";
            }
        });
    }, observerOptions);

    /**
     * Observe all animatable elements for scroll-based animations
     */
    const animateElements = document.querySelectorAll(
        ".feature-card, .tech-card, .process-step, .stat-item, .isl-feature-card, .isl-stat-card, .feature-detail-card, .process-step-card"
    );
    animateElements.forEach((element) => {
        element.style.opacity = "0";
        element.style.transform = "translateY(30px)";
        element.style.transition = "opacity 0.6s ease, transform 0.6s ease";
        observer.observe(element);
    });

    /**
     * Add parallax scrolling effect to hero section
     */
    const hero = document.querySelector(".hero, .isl-home-hero");
    if (hero) {
        window.addEventListener("scroll", function () {
            const scrolled = window.pageYOffset;
            const parallax = hero.querySelector(".hero-visual, .isl-hero-visual");
            if (parallax) {
                const speed = scrolled * -0.5;
                parallax.style.transform = `translateY(${speed}px)`;
            }
        });
    }

    /**
     * Add visual feedback to all buttons on click
     */
    const buttons = document.querySelectorAll(".btn, .isl-btn");
    buttons.forEach((button) => {
        button.addEventListener("click", function () {
            if (!this.disabled) {
                this.style.transform = "scale(0.98)";
                setTimeout(() => {
                    this.style.transform = "scale(1)";
                }, 150);
            }
        });
    });

    // Check API health on pages that need it
    checkBackendConnection();
});

/**
 * Check if the backend API is reachable
 */
async function checkBackendConnection() {
    // Only check on pages with detector functionality
    if (document.getElementById('videoFeed') || document.getElementById('connectionStatus')) {
        try {
            const isHealthy = await checkApiHealth();
            const statusEl = document.getElementById('connectionStatus');

            if (statusEl) {
                if (isHealthy) {
                    statusEl.classList.add('connected');
                    const statusText = statusEl.querySelector('.status-text');
                    if (statusText) statusText.textContent = 'Backend Connected';
                } else {
                    statusEl.classList.remove('connected');
                    const statusText = statusEl.querySelector('.status-text');
                    if (statusText) statusText.textContent = 'Backend Disconnected';
                }
            }

            if (isHealthy) {
                console.log('Backend API connected successfully at:', API_BASE_URL);
            }
        } catch (error) {
            console.warn('Backend API not reachable:', error.message);
            console.log('Make sure the backend server is running at:', API_BASE_URL);
        }
    }
}
