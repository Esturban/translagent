document.addEventListener('DOMContentLoaded', function() {
    const sourceText = document.getElementById('sourceText');
    const translateBtn = document.getElementById('translateBtn');
    const arabicOutput = document.getElementById('arabicOutput');
    const transliterationOutput = document.getElementById('transliterationOutput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMsg = document.getElementById('errorMsg');
    let audioPlayer = new Audio();
    let isPlaying = false;

    // Function to translate text
    async function translateText() {
        const text = sourceText.value.trim();
        if (!text) {
            showError('Please enter some text to translate.');
            return;
        }
        
        // Reset UI
        clearError();
        showLoading(true);
        speakBtn.disabled = true;
        try {
            const response = await fetch('/translate', {
method: 'POST',
headers: {
'Content-Type': 'application/json'
},
body: JSON.stringify({ text })
});
            
            if (!response.ok) {
                throw new Error(`Server responded with status: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (data.error) {
                throw new Error(data.error);
            }
            
            // Display results
            arabicOutput.textContent = data.translatedText || '';
            transliterationOutput.textContent = data.transliteratedText || '';
            speakBtn.disabled = !data.translatedText;
        } catch (error) {
            console.error('Translation error:', error);
            showError(`Translation failed: ${error.message}`);
            
            // Clear outputs
            arabicOutput.textContent = '';
            transliterationOutput.textContent = '';
            speakBtn.disabled = true;
        } finally {
            showLoading(false);
        }
    }
    
    // Helper functions
    function showLoading(isLoading) {
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
        translateBtn.disabled = isLoading;
    }
    
    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
    }
    
    function clearError() {
        errorMsg.textContent = '';
        errorMsg.style.display = 'none';
    }
    
    // Event listeners
    translateBtn.addEventListener('click', translateText);
    
    // Allow Ctrl+Enter to translate
    sourceText.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
            e.preventDefault();
            translateText();
        }
    });
});

const speakBtn = document.getElementById('speakBtn');
let audioPlayer = new Audio();
let isPlaying = false;

// Function to handle text-to-speech
async function speakText() {
const arabicText = arabicOutput.textContent;

if (!arabicText) {
showError('No text to speak.');
return;
}

// If already playing, stop it
if (isPlaying) {
audioPlayer.pause();
audioPlayer.currentTime = 0;
isPlaying = false;
speakBtn.classList.remove('playing');
return;
}

// Show loading state
speakBtn.disabled = true;

try {
const response = await fetch('/speak', {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text: arabicText })
});

if (!response.ok) {
    throw new Error(`Server responded with status: ${response.status}`);
}

const audioBlob = await response.blob();
const audioUrl = URL.createObjectURL(audioBlob);

// Play the audio
audioPlayer.src = audioUrl;
audioPlayer.play();
isPlaying = true;
speakBtn.classList.add('playing');

// Enable button after audio ends
audioPlayer.onended = function() {
    isPlaying = false;
    speakBtn.classList.remove('playing');
    speakBtn.disabled = false;
};
} catch (error) {
console.error('Speech synthesis error:', error);
showError(`Failed to generate speech: ${error.message}`);
} finally {
if (!isPlaying) {
    speakBtn.disabled = false;
}
}
}

// Add event listener for speak button
speakBtn.addEventListener('click', speakText);