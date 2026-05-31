const calculateScore = ({ snoreCount, talkCount, startTime, endTime }) => {
    const totalEvents = snoreCount + talkCount;
    const totalDuration = endTime - startTime;
    const hours = totalDuration / 3600000;

    if (totalEvents === 0) {
        let score = 95;

        if (hours < 6) {
            score -= (6 - hours) * 3;
        } else if (hours > 9) {
            score -= (hours - 9) * 2;
        }

        return Math.max(70, Math.min(100, Math.round(score)));
    }

    let score = 100;

    score -= Math.min(snoreCount * 2, 40);
    score -= Math.min(talkCount * 1.5, 30);

    if (hours < 6) {
        score -= Math.min((6 - hours) * 5, 20);
    } else if (hours > 9) {
        score -= Math.min((hours - 9) * 3, 15);
    }

    const eventFrequency = hours > 0 ? totalEvents / hours : 0;
    if (eventFrequency > 5) {
        score -= Math.min((eventFrequency - 5) * 3, 20);
    }

    return Math.max(0, Math.min(100, Math.round(score)));
};

const detectSnore = (rms, frequencyData, adaptiveThreshold) => {
    const minThreshold = Math.max(adaptiveThreshold * 1.5, 0.04);

    if (rms < minThreshold) return false;

    if (frequencyData) {
        let lowFreqPower = 0;
        let totalPower = 0;

        for (let i = 0; i < frequencyData.length; i++) {
            totalPower += frequencyData[i];
            if (i < frequencyData.length * 0.25) {
                lowFreqPower += frequencyData[i];
            }
        }

        const lowFreqRatio = totalPower > 0 ? lowFreqPower / totalPower : 0;

        if (rms > minThreshold * 1.2 && lowFreqRatio > 0.55) {
            return true;
        }
    }

    return rms > minThreshold * 2;
};

const detectTalk = (rms, frequencyData, adaptiveThreshold) => {
    const minThreshold = Math.max(adaptiveThreshold * 1.2, 0.03);

    if (rms < minThreshold) return false;

    if (frequencyData) {
        let midFreqPower = 0;
        let totalPower = 0;

        for (let i = 0; i < frequencyData.length; i++) {
            totalPower += frequencyData[i];
            if (i >= frequencyData.length * 0.15 && i < frequencyData.length * 0.55) {
                midFreqPower += frequencyData[i];
            }
        }

        const midFreqRatio = totalPower > 0 ? midFreqPower / totalPower : 0;

        if (rms > minThreshold * 1.2 && midFreqRatio > 0.35) {
            return true;
        }
    }

    return rms > minThreshold * 2;
};

const calculateNoiseBaseline = (noiseSamples) => {
    if (noiseSamples.length === 0) return 0.01;

    const sorted = [...noiseSamples].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2;

    return Math.max(median, 0.01);
};

const shouldTriggerRecording = ({
    isSnore,
    isTalk,
    isRecording,
    timeSinceLastEvent,
    consecutiveDetections,
    minEventInterval = 5000,
    requiredConsecutiveDetections = 5
}) => {
    return (isSnore || isTalk) &&
        !isRecording &&
        timeSinceLastEvent > minEventInterval &&
        consecutiveDetections >= requiredConsecutiveDetections;
};

const shouldStopRecording = ({
    rms,
    stopThreshold,
    recordingDuration,
    minRecordingDuration = 1500,
    maxRecordingDuration = 10000
}) => {
    if (rms < stopThreshold && recordingDuration > minRecordingDuration) {
        return true;
    }
    if (recordingDuration > maxRecordingDuration) {
        return true;
    }
    return false;
};

const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
};

const generateRMSFromSamples = (samples) => {
    let sum = 0;
    for (let i = 0; i < samples.length; i++) {
        const v = (samples[i] - 128) / 128;
        sum += v * v;
    }
    return Math.sqrt(sum / samples.length);
};

const generateSilentSamples = (length = 1024) => {
    return new Uint8Array(length).fill(128);
};

const generateNoiseSamples = (length = 1024, amplitude = 5) => {
    const samples = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        samples[i] = 128 + (Math.random() - 0.5) * amplitude;
    }
    return samples;
};

const generateSnoreLikeSamples = (length = 1024, amplitude = 40) => {
    const samples = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        const wave = Math.sin(i * 0.02) * amplitude;
        samples[i] = Math.max(0, Math.min(255, 128 + wave));
    }
    return samples;
};

const generateTalkLikeSamples = (length = 1024, amplitude = 30) => {
    const samples = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        const wave = Math.sin(i * 0.1) * amplitude + Math.sin(i * 0.05) * amplitude * 0.5;
        samples[i] = Math.max(0, Math.min(255, 128 + wave));
    }
    return samples;
};

const generateFrequencyData = (lowFreqBoost = 0, midFreqBoost = 0, length = 1024) => {
    const data = new Uint8Array(length);
    for (let i = 0; i < length; i++) {
        let value = 10;
        if (i < length * 0.25) {
            value += lowFreqBoost;
        }
        if (i >= length * 0.15 && i < length * 0.55) {
            value += midFreqBoost;
        }
        data[i] = Math.min(255, value);
    }
    return data;
};

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        calculateScore,
        detectSnore,
        detectTalk,
        calculateNoiseBaseline,
        shouldTriggerRecording,
        shouldStopRecording,
        formatTime,
        generateRMSFromSamples,
        generateSilentSamples,
        generateNoiseSamples,
        generateSnoreLikeSamples,
        generateTalkLikeSamples,
        generateFrequencyData
    };
}

if (typeof window !== 'undefined') {
    window.SleepRecorderUtils = {
        calculateScore,
        detectSnore,
        detectTalk,
        calculateNoiseBaseline,
        shouldTriggerRecording,
        shouldStopRecording,
        formatTime,
        generateRMSFromSamples,
        generateSilentSamples,
        generateNoiseSamples,
        generateSnoreLikeSamples,
        generateTalkLikeSamples,
        generateFrequencyData
    };
}

