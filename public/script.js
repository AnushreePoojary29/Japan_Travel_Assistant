document.addEventListener('DOMContentLoaded', function() {
    // DOM Elements
    const bgCarousel = document.querySelector('.bg-carousel');
    const contentCarousel = document.querySelector('.content-carousel');
    const navButtons = document.querySelectorAll('.nav-btn');
    const panels = document.querySelectorAll('.panel');
    
    // Text Translation Elements
    const sourceText = document.getElementById('source-text');
    const translatedText = document.getElementById('translated-text');
    const translateBtn = document.getElementById('translate-btn');
    const clearTextBtn = document.getElementById('clear-text-btn');
    const swapLangBtn = document.getElementById('swap-languages');
    const sourceLangDisplay = document.getElementById('source-lang');
    const targetLangDisplay = document.getElementById('target-lang');
    
    // Voice Translation Elements
    const startListeningBtn = document.getElementById('start-listening');
    const voiceTranslateBtn = document.getElementById('voice-translate-btn');
    const voiceStatus = document.getElementById('voice-status');
    const voiceTranscript = document.getElementById('voice-transcript');
    const voiceTranslation = document.getElementById('voice-translation');
    const swapVoiceLangBtn = document.getElementById('swap-voice-languages');
    const voiceSourceLangDisplay = document.getElementById('voice-source-lang');
    const voiceTargetLangDisplay = document.getElementById('voice-target-lang');
    
    // Places Carousel Elements
    const placesCarousel = document.querySelector('.places-carousel');
    const placesPrevBtn = document.querySelector('.places-prev');
    const placesNextBtn = document.querySelector('.places-next');
    const placesDotsContainer = document.querySelector('.places-dots');
    
    // State Variables
    let currentPanel = 0;
    let bgSlideIndex = 0;
    let recognition;
    let places = [];
    let currentPlaceIndex = 0;
    
    // Translation Settings
    const translationSettings = {
        text: {
            sourceLang: 'ja',
            targetLang: 'en'
        },
        voice: {
            sourceLang: 'ja',
            targetLang: 'en'
        }
    };
    
    const languageNames = {
        'en': 'English',
        'ja': 'Japanese'
    };

    // Common phrases for both directions
    const commonPhrases = {
        'ja-en': {
            "こんにちは": "Hello",
            "ありがとう": "Thank you",
            "すみません": "Excuse me / I'm sorry",
            "はい": "Yes",
            "いいえ": "No",
            "助けて": "Help",
            "お願いします": "Please",
            "どこですか": "Where is...?",
            "いくらですか": "How much is it?"
        },
        'en-ja': {
            "Hello": "こんにちは",
            "Thank you": "ありがとう",
            "Excuse me": "すみません",
            "Yes": "はい",
            "No": "いいえ",
            "Help": "助けて",
            "Please": "お願いします",
            "Where is": "どこですか",
            "How much": "いくらですか"
        }
    };

    // Initialize
    initBackgroundCarousel();
    setupVoiceRecognition();
    updateLanguageDisplays();
    fetchPlaces();

    // Carousel Navigation
    navButtons.forEach(btn => {
        btn.addEventListener('click', function() {
            currentPanel = parseInt(this.dataset.index);
            updateCarousel();
        });
    });

    // Background Carousel
    function initBackgroundCarousel() {
        const bgSlides = document.querySelectorAll('.bg-carousel .slide');
        setInterval(() => {
            bgSlides[bgSlideIndex].classList.remove('active');
            bgSlideIndex = (bgSlideIndex + 1) % bgSlides.length;
            bgSlides[bgSlideIndex].classList.add('active');
        }, 5000);
    }

    function updateCarousel() {
        contentCarousel.style.transform = `translateX(-${currentPanel * 100}vw)`;
        
        navButtons.forEach((btn, index) => {
            btn.classList.toggle('active', index === currentPanel);
        });
        
        panels.forEach((panel, index) => {
            panel.classList.toggle('active', index === currentPanel);
        });
    }

    // Language Switching
    swapLangBtn.addEventListener('click', function() {
        // Swap text translation languages
        [translationSettings.text.sourceLang, translationSettings.text.targetLang] = 
            [translationSettings.text.targetLang, translationSettings.text.sourceLang];
        
        // Swap the text in text areas
        [sourceText.value, translatedText.value] = [translatedText.value, sourceText.value];
        
        updateLanguageDisplays();
    });

    swapVoiceLangBtn.addEventListener('click', function() {
        // Swap voice translation languages
        [translationSettings.voice.sourceLang, translationSettings.voice.targetLang] = 
            [translationSettings.voice.targetLang, translationSettings.voice.sourceLang];
        
        // Update recognition language
        if (recognition) {
            recognition.lang = translationSettings.voice.sourceLang === 'ja' ? 'ja-JP' : 'en-US';
        }
        
        updateLanguageDisplays();
    });

    function updateLanguageDisplays() {
        // Update text translator display
        sourceLangDisplay.textContent = languageNames[translationSettings.text.sourceLang];
        targetLangDisplay.textContent = languageNames[translationSettings.text.targetLang];
        
        // Update voice translator display
        voiceSourceLangDisplay.textContent = languageNames[translationSettings.voice.sourceLang];
        voiceTargetLangDisplay.textContent = languageNames[translationSettings.voice.targetLang];
        
        // Update placeholders
        sourceText.placeholder = `Enter ${languageNames[translationSettings.text.sourceLang]} text...`;
        translatedText.placeholder = `${languageNames[translationSettings.text.targetLang]} translation...`;
    }

    // Text Translation
    translateBtn.addEventListener('click', async function() {
        const text = sourceText.value.trim();
        if (!text) {
            showMessage('Please enter some text to translate', 'error');
            return;
        }

        translateBtn.disabled = true;
        translateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating';
        
        try {
            const translation = await translateText(
                text, 
                translationSettings.text.sourceLang, 
                translationSettings.text.targetLang
            );
            translatedText.value = translation;
            showMessage('Translation complete!', 'success');
        } catch (error) {
            console.error('Translation error:', error);
            showMessage('Translation failed. Please try again.', 'error');
            translatedText.value = "Error: Could not translate text";
        } finally {
            translateBtn.disabled = false;
            translateBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Translate';
        }
    });

    clearTextBtn.addEventListener('click', function() {
        sourceText.value = '';
        translatedText.value = '';
    });

    // Voice Translation
    function setupVoiceRecognition() {
        try {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognition = new SpeechRecognition();
            recognition.continuous = false;
            recognition.interimResults = true;
            recognition.lang = 'ja-JP'; // Default to Japanese

            recognition.onstart = function() {
                startListeningBtn.classList.add('listening');
                showMessage(`Listening... Speak in ${languageNames[translationSettings.voice.sourceLang]}`, 'status');
                voiceTranscript.textContent = '';
                voiceTranslation.textContent = '';
            };

            recognition.onresult = function(event) {
                const transcript = Array.from(event.results)
                    .map(result => result[0])
                    .map(result => result.transcript)
                    .join('');

                voiceTranscript.textContent = transcript;
                
                if (event.results[0].isFinal) {
                    startListeningBtn.classList.remove('listening');
                    showMessage('Speech recognized. Click Translate', 'success');
                }
            };

            recognition.onerror = function(event) {
                console.error('Recognition error:', event.error);
                showMessage(`Error: ${event.error}`, 'error');
                startListeningBtn.classList.remove('listening');
            };

            recognition.onend = function() {
                startListeningBtn.classList.remove('listening');
            };

        } catch (error) {
            console.error('Speech recognition not supported', error);
            startListeningBtn.disabled = true;
            showMessage('Voice recognition not supported in your browser', 'error');
        }
    }

    startListeningBtn.addEventListener('click', function() {
        if (!recognition) {
            showMessage('Voice recognition not available', 'error');
            return;
        }
        
        voiceTranscript.textContent = '';
        voiceTranslation.textContent = '';
        recognition.start();
    });

    voiceTranslateBtn.addEventListener('click', async function() {
        const sourceText = voiceTranscript.textContent.trim();
        if (!sourceText) {
            showMessage('No text to translate', 'error');
            return;
        }

        voiceTranslateBtn.disabled = true;
        voiceTranslateBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Translating';
        
        try {
            const translation = await translateText(
                sourceText, 
                translationSettings.voice.sourceLang, 
                translationSettings.voice.targetLang
            );
            voiceTranslation.textContent = translation;
            showMessage('Translation complete!', 'success');
        } catch (error) {
            console.error('Voice translation error:', error);
            showMessage('Translation failed', 'error');
            voiceTranslation.textContent = "Error: Could not translate";
        } finally {
            voiceTranslateBtn.disabled = false;
            voiceTranslateBtn.innerHTML = '<i class="fas fa-exchange-alt"></i> Translate';
        }
    });

    // Places Carousel
    async function fetchPlaces() {
        try {
            const response = await fetch('/api/places');
            if (!response.ok) throw new Error('Failed to fetch places');
            
            places = await response.json();
            if (places.length > 0) {
                renderPlacesCarousel();
                showPlace(currentPlaceIndex);
            } else {
                placesCarousel.innerHTML = '<div class="no-places">No places found</div>';
            }
        } catch (error) {
            console.error('Error fetching places:', error);
            placesCarousel.innerHTML = `<div class="error-message">Error loading places: ${error.message}</div>`;
        }
    }

    function renderPlacesCarousel() {
        // Clear loading spinner
        placesCarousel.innerHTML = '';
        
        // Create slides for each place
        places.forEach((place, index) => {
            const slide = document.createElement('div');
            slide.className = 'place-slide';
            slide.style.backgroundImage = `url(${place.image})`;
            slide.innerHTML = `
                <div class="place-info">
                    <h3 class="place-name">${place.name}</h3>
                    <p class="place-description">${place.description}</p>
                </div>
            `;
            placesCarousel.appendChild(slide);
        });
        
        // Create dots navigation
        placesDotsContainer.innerHTML = '';
        places.forEach((_, index) => {
            const dot = document.createElement('div');
            dot.className = 'places-dot';
            dot.dataset.index = index;
            dot.addEventListener('click', () => showPlace(index));
            placesDotsContainer.appendChild(dot);
        });
        
        // Set up navigation buttons
        placesPrevBtn.addEventListener('click', showPrevPlace);
        placesNextBtn.addEventListener('click', showNextPlace);
    }

    function showPlace(index) {
        // Validate index
        if (index < 0) index = places.length - 1;
        if (index >= places.length) index = 0;
        
        currentPlaceIndex = index;
        
        // Update slides
        const slides = document.querySelectorAll('.place-slide');
        slides.forEach((slide, i) => {
            slide.classList.toggle('active', i === index);
        });
        
        // Update dots
        const dots = document.querySelectorAll('.places-dot');
        dots.forEach((dot, i) => {
            dot.classList.toggle('active', i === index);
        });
    }

    function showPrevPlace() {
        showPlace(currentPlaceIndex - 1);
    }

    function showNextPlace() {
        showPlace(currentPlaceIndex + 1);
    }

    // Helper Functions
    async function translateText(text, sourceLang, targetLang) {
        const direction = `${sourceLang}-${targetLang}`;
        
        // First check common phrases
        if (commonPhrases[direction] && commonPhrases[direction][text]) {
            return commonPhrases[direction][text];
        }

        // Try multiple endpoints
        const endpoints = [
            'https://libretranslate.de/translate',
            'https://translate.argosopentech.com/translate'
        ];

        for (const endpoint of endpoints) {
            try {
                const response = await fetch(endpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        q: text,
                        source: sourceLang,
                        target: targetLang
                    })
                });

                if (!response.ok) continue;
                
                const data = await response.json();
                if (data.translatedText) {
                    return data.translatedText;
                }
            } catch (error) {
                console.log(`API ${endpoint} failed:`, error);
                continue;
            }
        }

        // Fallback to MyMemory API if others fail
        try {
            const response = await fetch(
                `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`
            );
            const data = await response.json();
            if (data.responseData && data.responseData.translatedText) {
                return data.responseData.translatedText;
            }
        } catch (error) {
            console.log('MyMemory API failed:', error);
        }

        throw new Error('All translation APIs failed');
    }

    function showMessage(message, type) {
        voiceStatus.textContent = message;
        voiceStatus.className = `voice-status ${type}`;
    }
});