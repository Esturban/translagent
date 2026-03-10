document.addEventListener('DOMContentLoaded', function () {
    const sourceText = document.getElementById('sourceText');
    const languageSelect = document.getElementById('languageSelect');
    const translateBtn = document.getElementById('translateBtn');
    const translationOutput = document.getElementById('translationOutput');
    const transliterationOutput = document.getElementById('transliterationOutput');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const errorMsg = document.getElementById('errorMsg');
    const speakBtn = document.getElementById('speakBtn');

    let audioPlayer = new Audio();
    let isPlaying = false;
    let isTranslating = false;
    let isSpeaking = false;

    function setTranslationLoading(isLoading) {
        isTranslating = isLoading;
        loadingIndicator.style.display = isLoading ? 'block' : 'none';
        translateBtn.disabled = isLoading;
        sourceText.disabled = isLoading;
        languageSelect.disabled = isLoading;
        syncSpeakButton();
    }

    function syncSpeakButton() {
        const hasTranslation = Boolean(translationOutput.textContent);
        speakBtn.disabled = isTranslating || isSpeaking || !hasTranslation;
    }

    function showError(message) {
        errorMsg.textContent = message;
        errorMsg.style.display = 'block';
    }

    function clearError() {
        errorMsg.textContent = '';
        errorMsg.style.display = 'none';
    }

    function readApiError(payload, fallbackMessage) {
        if (payload && payload.error && payload.error.message) {
            return payload.error.message;
        }
        return fallbackMessage;
    }

    async function translateText() {
        const text = sourceText.value.trim();
        const language = languageSelect.value;

        if (!text) {
            showError('Please enter some text to translate.');
            return;
        }

        clearError();
        setTranslationLoading(true);
        translationOutput.textContent = '';
        transliterationOutput.textContent = '';
        translationOutput.dataset.language = language;

        try {
            const response = await fetch('/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text, language })
            });

            const data = await response.json().catch(function () {
                return null;
            });

            if (!response.ok) {
                throw new Error(readApiError(data, 'Translation request failed.'));
            }

            translationOutput.textContent = data.translatedText || '';
            transliterationOutput.textContent = data.transliteratedText || '';
        } catch (error) {
            console.error('Translation error:', error);
            showError('Translation failed: ' + error.message);
            translationOutput.textContent = '';
            transliterationOutput.textContent = '';
        } finally {
            setTranslationLoading(false);
        }
    }

    async function speakText() {
        const translatedText = translationOutput.textContent.trim();
        const language = languageSelect.value;

        if (!translatedText) {
            showError('Translate text before using Listen.');
            return;
        }

        if (isPlaying) {
            audioPlayer.pause();
            audioPlayer.currentTime = 0;
            isPlaying = false;
            speakBtn.classList.remove('playing');
            syncSpeakButton();
            return;
        }

        clearError();
        isSpeaking = true;
        syncSpeakButton();

        try {
            const response = await fetch('/speak', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ text: translatedText, language })
            });

            if (!response.ok) {
                const data = await response.json().catch(function () {
                    return null;
                });
                throw new Error(readApiError(data, 'Speech request failed.'));
            }

            const audioBlob = await response.blob();
            const audioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = audioUrl;
            await audioPlayer.play();
            isPlaying = true;
            speakBtn.classList.add('playing');

            audioPlayer.onended = function () {
                isPlaying = false;
                isSpeaking = false;
                speakBtn.classList.remove('playing');
                syncSpeakButton();
                URL.revokeObjectURL(audioUrl);
            };
        } catch (error) {
            console.error('Speech synthesis error:', error);
            showError('Listen failed: ' + error.message);
            isPlaying = false;
            speakBtn.classList.remove('playing');
        } finally {
            if (!isPlaying) {
                isSpeaking = false;
                syncSpeakButton();
            }
        }
    }

    translateBtn.addEventListener('click', translateText);
    speakBtn.addEventListener('click', speakText);

    sourceText.addEventListener('keydown', function (event) {
        if (event.key === 'Enter' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            translateText();
        }
    });

    syncSpeakButton();
});
