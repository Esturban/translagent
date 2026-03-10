document.addEventListener("DOMContentLoaded", function () {
    const sourceText = document.getElementById("sourceText");
    const languageSelect = document.getElementById("languageSelect");
    const translateBtn = document.getElementById("translateBtn");
    const translationOutput = document.getElementById("translationOutput");
    const transliterationOutput = document.getElementById("transliterationOutput");
    const loadingIndicator = document.getElementById("loadingIndicator");
    const errorMsg = document.getElementById("errorMsg");
    const errorMsgBody = document.getElementById("errorMsgBody");
    const errorMsgDetail = document.getElementById("errorMsgDetail");
    const speakBtn = document.getElementById("speakBtn");
    const speakBtnLabel = document.getElementById("speakBtnLabel");

    const audioPlayer = new Audio();

    let isPlaying = false;
    let isTranslating = false;
    let isSpeaking = false;
    let currentAudioUrl = null;

    function setResultValue(element, value) {
        const content = typeof value === "string" ? value.trim() : "";
        element.textContent = content;
        element.classList.toggle("is-empty", !content);
    }

    function clearResults() {
        setResultValue(translationOutput, "");
        setResultValue(transliterationOutput, "");
    }

    function readApiError(payload, fallbackMessage) {
        if (payload && payload.error && payload.error.message) {
            return payload.error.message;
        }

        return fallbackMessage;
    }

    function mapVisitorErrorMessage(rawMessage, fallbackMessage) {
        if (!rawMessage) {
            return {
                body: fallbackMessage,
                detail: ""
            };
        }

        const normalizedMessage = String(rawMessage).trim();
        const loweredMessage = normalizedMessage.toLowerCase();

        if (loweredMessage.includes("quota") || loweredMessage.includes("billing")) {
            return {
                body: "Translations are temporarily unavailable right now.",
                detail: "The upstream language service is rejecting requests because its usage quota has been reached."
            };
        }

        if (loweredMessage.includes("rate limit")) {
            return {
                body: "Too many requests hit the translator at once.",
                detail: "Wait a moment and try again."
            };
        }

        if (loweredMessage.includes("timeout") || loweredMessage.includes("network")) {
            return {
                body: "The translation request could not complete.",
                detail: "Check your connection and retry."
            };
        }

        return {
            body: fallbackMessage,
            detail: normalizedMessage
        };
    }

    function showError(message, detail) {
        errorMsgBody.textContent = message;
        errorMsgDetail.textContent = detail || "";
        errorMsgDetail.hidden = !detail;
        errorMsg.hidden = false;
    }

    function clearError() {
        errorMsgBody.textContent = "";
        errorMsgDetail.textContent = "";
        errorMsgDetail.hidden = true;
        errorMsg.hidden = true;
    }

    function updateSpeakButtonLabel() {
        if (isPlaying) {
            speakBtnLabel.textContent = "Stop";
            return;
        }

        if (isSpeaking) {
            speakBtnLabel.textContent = "Loading audio";
            return;
        }

        speakBtnLabel.textContent = "Listen";
    }

    function syncSpeakButton() {
        const hasTranslation = Boolean(translationOutput.textContent.trim());
        speakBtn.disabled = isTranslating || isSpeaking || !hasTranslation;
        speakBtn.classList.toggle("playing", isPlaying);
        updateSpeakButtonLabel();
    }

    function setTranslationLoading(isLoading) {
        isTranslating = isLoading;
        loadingIndicator.hidden = !isLoading;
        translateBtn.disabled = isLoading;
        sourceText.disabled = isLoading;
        languageSelect.disabled = isLoading;
        syncSpeakButton();
    }

    function stopAudioPlayback() {
        audioPlayer.pause();
        audioPlayer.currentTime = 0;
        isPlaying = false;
        isSpeaking = false;

        if (currentAudioUrl) {
            URL.revokeObjectURL(currentAudioUrl);
            currentAudioUrl = null;
        }

        syncSpeakButton();
    }

    async function translateText() {
        const text = sourceText.value.trim();
        const language = languageSelect.value;

        if (!text) {
            showError("Enter some English text before translating.", "");
            return;
        }

        clearError();
        stopAudioPlayback();
        setTranslationLoading(true);
        clearResults();
        translationOutput.dataset.language = language;

        try {
            const response = await fetch("/translate", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ text, language })
            });

            const data = await response.json().catch(function () {
                return null;
            });

            if (!response.ok) {
                const rawMessage = readApiError(data, "Translation request failed.");
                throw new Error(rawMessage);
            }

            setResultValue(translationOutput, data.translatedText || "");
            setResultValue(transliterationOutput, data.transliteratedText || "");
        } catch (error) {
            console.error("Translation error:", error);
            clearResults();

            const friendlyError = mapVisitorErrorMessage(
                error instanceof Error ? error.message : "",
                "The translator could not return a result right now."
            );

            showError(friendlyError.body, friendlyError.detail);
        } finally {
            setTranslationLoading(false);
        }
    }

    async function speakText() {
        const translatedText = translationOutput.textContent.trim();
        const language = languageSelect.value;

        if (!translatedText) {
            showError("Translate text before using audio playback.", "");
            return;
        }

        if (isPlaying) {
            stopAudioPlayback();
            return;
        }

        clearError();
        isSpeaking = true;
        syncSpeakButton();

        try {
            const response = await fetch("/speak", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ text: translatedText, language })
            });

            if (!response.ok) {
                const data = await response.json().catch(function () {
                    return null;
                });
                throw new Error(readApiError(data, "Speech request failed."));
            }

            const audioBlob = await response.blob();
            currentAudioUrl = URL.createObjectURL(audioBlob);
            audioPlayer.src = currentAudioUrl;
            await audioPlayer.play();

            isPlaying = true;
            isSpeaking = false;
            syncSpeakButton();
        } catch (error) {
            console.error("Speech synthesis error:", error);

            const friendlyError = mapVisitorErrorMessage(
                error instanceof Error ? error.message : "",
                "Audio playback is unavailable right now."
            );

            showError(friendlyError.body, friendlyError.detail);
            stopAudioPlayback();
        } finally {
            if (!isPlaying) {
                isSpeaking = false;
                syncSpeakButton();
            }
        }
    }

    audioPlayer.onended = function () {
        stopAudioPlayback();
    };

    audioPlayer.onerror = function () {
        showError("Audio playback could not finish.", "Try requesting the audio again.");
        stopAudioPlayback();
    };

    translateBtn.addEventListener("click", translateText);
    speakBtn.addEventListener("click", speakText);

    sourceText.addEventListener("keydown", function (event) {
        if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            translateText();
        }
    });

    clearResults();
    clearError();
    syncSpeakButton();
});
