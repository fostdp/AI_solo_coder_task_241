const {
    detectSnore,
    detectTalk,
    calculateNoiseBaseline,
    shouldTriggerRecording,
    shouldStopRecording,
    generateRMSFromSamples,
    generateSilentSamples,
    generateNoiseSamples,
    generateSnoreLikeSamples,
    generateTalkLikeSamples,
    generateFrequencyData
} = require('../client/utils.js');

describe('噪声过滤测试', () => {
    describe('环境噪声基线计算', () => {
        test('空样本应返回默认基线0.01', () => {
            const baseline = calculateNoiseBaseline([]);
            expect(baseline).toBe(0.01);
        });

        test('单个样本应返回该值（不低于0.01）', () => {
            const baseline = calculateNoiseBaseline([0.02]);
            expect(baseline).toBe(0.02);
        });

        test('非常小的样本应返回默认基线0.01', () => {
            const baseline = calculateNoiseBaseline([0.005]);
            expect(baseline).toBe(0.01);
        });

        test('奇数个样本应返回中位数', () => {
            const baseline = calculateNoiseBaseline([0.01, 0.02, 0.03, 0.04, 0.05]);
            expect(baseline).toBe(0.03);
        });

        test('偶数个样本应返回中间两个数的平均值', () => {
            const baseline = calculateNoiseBaseline([0.01, 0.02, 0.03, 0.04]);
            expect(baseline).toBe(0.025);
        });

        test('异常值不应该影响中位数', () => {
            const baseline = calculateNoiseBaseline([0.01, 0.015, 0.02, 0.025, 1.0]);
            expect(baseline).toBe(0.02);
        });
    });

    describe('RMS计算', () => {
        test('静音样本RMS应接近0', () => {
            const samples = generateSilentSamples(1024);
            const rms = generateRMSFromSamples(samples);
            expect(rms).toBeCloseTo(0, 5);
        });

        test('低噪声样本RMS应较低', () => {
            const samples = generateNoiseSamples(1024, 5);
            const rms = generateRMSFromSamples(samples);
            expect(rms).toBeLessThan(0.05);
        });

        test('鼾声样样本RMS应较高', () => {
            const samples = generateSnoreLikeSamples(1024, 40);
            const rms = generateRMSFromSamples(samples);
            expect(rms).toBeGreaterThan(0.1);
        });

        test('梦话样样本RMS应较高', () => {
            const samples = generateTalkLikeSamples(1024, 30);
            const rms = generateRMSFromSamples(samples);
            expect(rms).toBeGreaterThan(0.05);
        });
    });

    describe('鼾声检测', () => {
        const lowNoiseBaseline = 0.01;
        const highNoiseBaseline = 0.05;

        test('静音不应检测为鼾声', () => {
            const silentRMS = 0.005;
            const result = detectSnore(silentRMS, null, lowNoiseBaseline);
            expect(result).toBe(false);
        });

        test('低噪声不应检测为鼾声', () => {
            const noiseRMS = lowNoiseBaseline * 2;
            const result = detectSnore(noiseRMS, null, lowNoiseBaseline);
            expect(result).toBe(false);
        });

        test('足够强的信号但无频率数据时可能检测为鼾声', () => {
            const loudRMS = lowNoiseBaseline * 10;
            const result = detectSnore(loudRMS, null, lowNoiseBaseline);
            expect(result).toBe(true);
        });

        test('低频强信号应检测为鼾声', () => {
            const loudRMS = lowNoiseBaseline * 3;
            const freqData = generateFrequencyData(100, 10);
            const result = detectSnore(loudRMS, freqData, lowNoiseBaseline);
            expect(result).toBe(true);
        });

        test('高频信号不应检测为鼾声', () => {
            const loudRMS = lowNoiseBaseline * 3;
            const freqData = generateFrequencyData(10, 100);
            const result = detectSnore(loudRMS, freqData, lowNoiseBaseline);
            expect(result).toBe(false);
        });

        test('高噪声环境下需要更高的信号强度', () => {
            const moderateRMS = highNoiseBaseline * 2;
            const result = detectSnore(moderateRMS, null, highNoiseBaseline);
            expect(result).toBe(false);
        });

        test('高噪声环境下足够强的信号可以检测为鼾声', () => {
            const loudRMS = highNoiseBaseline * 5;
            const result = detectSnore(loudRMS, null, highNoiseBaseline);
            expect(result).toBe(true);
        });
    });

    describe('梦话检测', () => {
        const lowNoiseBaseline = 0.01;
        const highNoiseBaseline = 0.05;

        test('静音不应检测为梦话', () => {
            const silentRMS = 0.005;
            const result = detectTalk(silentRMS, null, lowNoiseBaseline);
            expect(result).toBe(false);
        });

        test('低噪声不应检测为梦话', () => {
            const noiseRMS = lowNoiseBaseline * 2;
            const result = detectTalk(noiseRMS, null, lowNoiseBaseline);
            expect(result).toBe(false);
        });

        test('中频强信号应检测为梦话', () => {
            const loudRMS = lowNoiseBaseline * 2;
            const freqData = generateFrequencyData(10, 80);
            const result = detectTalk(loudRMS, freqData, lowNoiseBaseline);
            expect(result).toBe(true);
        });

        test('低频强信号不应检测为梦话', () => {
            const loudRMS = lowNoiseBaseline * 2;
            const freqData = generateFrequencyData(100, 10);
            const result = detectTalk(loudRMS, freqData, lowNoiseBaseline);
            expect(result).toBe(false);
        });

        test('梦话阈值低于鼾声阈值', () => {
            const snoreThreshold = Math.max(lowNoiseBaseline * 1.5, 0.04);
            const talkThreshold = Math.max(lowNoiseBaseline * 1.2, 0.03);
            expect(talkThreshold).toBeLessThanOrEqual(snoreThreshold);
        });
    });

    describe('录音触发条件', () => {
        test('无检测时不应触发', () => {
            const shouldTrigger = shouldTriggerRecording({
                isSnore: false,
                isTalk: false,
                isRecording: false,
                timeSinceLastEvent: 10000,
                consecutiveDetections: 10
            });
            expect(shouldTrigger).toBe(false);
        });

        test('正在录音时不应触发新录音', () => {
            const shouldTrigger = shouldTriggerRecording({
                isSnore: true,
                isTalk: false,
                isRecording: true,
                timeSinceLastEvent: 10000,
                consecutiveDetections: 10
            });
            expect(shouldTrigger).toBe(false);
        });

        test('距离上次事件太短不应触发', () => {
            const shouldTrigger = shouldTriggerRecording({
                isSnore: true,
                isTalk: false,
                isRecording: false,
                timeSinceLastEvent: 3000,
                consecutiveDetections: 10
            });
            expect(shouldTrigger).toBe(false);
        });

        test('连续检测次数不足不应触发', () => {
            const shouldTrigger = shouldTriggerRecording({
                isSnore: true,
                isTalk: false,
                isRecording: false,
                timeSinceLastEvent: 10000,
                consecutiveDetections: 3
            });
            expect(shouldTrigger).toBe(false);
        });

        test('所有条件满足时应触发', () => {
            const shouldTrigger = shouldTriggerRecording({
                isSnore: true,
                isTalk: false,
                isRecording: false,
                timeSinceLastEvent: 10000,
                consecutiveDetections: 5
            });
            expect(shouldTrigger).toBe(true);
        });

        test('梦话也能触发', () => {
            const shouldTrigger = shouldTriggerRecording({
                isSnore: false,
                isTalk: true,
                isRecording: false,
                timeSinceLastEvent: 10000,
                consecutiveDetections: 5
            });
            expect(shouldTrigger).toBe(true);
        });

        test('可自定义参数', () => {
            const shouldTrigger = shouldTriggerRecording({
                isSnore: true,
                isTalk: false,
                isRecording: false,
                timeSinceLastEvent: 2000,
                consecutiveDetections: 2,
                minEventInterval: 1000,
                requiredConsecutiveDetections: 2
            });
            expect(shouldTrigger).toBe(true);
        });
    });

    describe('录音停止条件', () => {
        test('录音时间太短即使安静也不应停止', () => {
            const shouldStop = shouldStopRecording({
                rms: 0.005,
                stopThreshold: 0.015,
                recordingDuration: 1000
            });
            expect(shouldStop).toBe(false);
        });

        test('安静且超过最短时间应停止', () => {
            const shouldStop = shouldStopRecording({
                rms: 0.005,
                stopThreshold: 0.015,
                recordingDuration: 2000
            });
            expect(shouldStop).toBe(true);
        });

        test('有声音时不应停止', () => {
            const shouldStop = shouldStopRecording({
                rms: 0.1,
                stopThreshold: 0.015,
                recordingDuration: 5000
            });
            expect(shouldStop).toBe(false);
        });

        test('超过最大时长应强制停止', () => {
            const shouldStop = shouldStopRecording({
                rms: 0.1,
                stopThreshold: 0.015,
                recordingDuration: 15000
            });
            expect(shouldStop).toBe(true);
        });
    });

    describe('完整噪声过滤场景', () => {
        test('环境白噪声不应持续触发录音', () => {
            const noiseBaseline = 0.02;
            const adaptiveThreshold = noiseBaseline * 3;
            
            const noiseRMS = noiseBaseline * 1.5;
            const isSnore = detectSnore(noiseRMS, null, noiseBaseline);
            const isTalk = detectTalk(noiseRMS, null, noiseBaseline);
            
            expect(isSnore).toBe(false);
            expect(isTalk).toBe(false);
            
            const shouldTrigger = shouldTriggerRecording({
                isSnore,
                isTalk,
                isRecording: false,
                timeSinceLastEvent: 10000,
                consecutiveDetections: 5
            });
            
            expect(shouldTrigger).toBe(false);
        });

        test('短暂杂音不应触发录音', () => {
            const noiseBaseline = 0.01;
            const isSnore = detectSnore(0.1, null, noiseBaseline);
            
            let consecutiveDetections = 0;
            for (let i = 0; i < 3; i++) {
                if (isSnore) consecutiveDetections++;
            }
            
            const shouldTrigger = shouldTriggerRecording({
                isSnore,
                isTalk: false,
                isRecording: false,
                timeSinceLastEvent: 10000,
                consecutiveDetections
            });
            
            expect(shouldTrigger).toBe(false);
        });

        test('持续信号应触发录音', () => {
            const noiseBaseline = 0.01;
            const isSnore = detectSnore(0.1, null, noiseBaseline);
            
            let consecutiveDetections = 0;
            for (let i = 0; i < 6; i++) {
                if (isSnore) consecutiveDetections++;
            }
            
            const shouldTrigger = shouldTriggerRecording({
                isSnore,
                isTalk: false,
                isRecording: false,
                timeSinceLastEvent: 10000,
                consecutiveDetections
            });
            
            expect(shouldTrigger).toBe(true);
        });

        test('高噪声环境下需要更强的信号', () => {
            const highNoiseBaseline = 0.08;
            const moderateRMS = highNoiseBaseline * 2;
            
            const isSnore = detectSnore(moderateRMS, null, highNoiseBaseline);
            expect(isSnore).toBe(false);
            
            const loudRMS = highNoiseBaseline * 5;
            const isSnoreLoud = detectSnore(loudRMS, null, highNoiseBaseline);
            expect(isSnoreLoud).toBe(true);
        });
    });
});
