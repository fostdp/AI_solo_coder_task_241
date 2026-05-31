const { calculateScore } = require('../client/utils.js');

describe('睡眠评分算法测试', () => {
    const HOUR = 3600000;
    const MINUTE = 60000;

    describe('静睡评分（零录音事件）', () => {
        test('7.5小时完美静睡应得95分', () => {
            const startTime = Date.now() - 7.5 * HOUR;
            const endTime = Date.now();
            
            const score = calculateScore({
                snoreCount: 0,
                talkCount: 0,
                startTime,
                endTime
            });
            
            expect(score).toBe(95);
        });

        test('6小时静睡应得95分', () => {
            const startTime = Date.now() - 6 * HOUR;
            const endTime = Date.now();
            
            const score = calculateScore({
                snoreCount: 0,
                talkCount: 0,
                startTime,
                endTime
            });
            
            expect(score).toBe(95);
        });

        test('9小时静睡应得95分', () => {
            const startTime = Date.now() - 9 * HOUR;
            const endTime = Date.now();
            
            const score = calculateScore({
                snoreCount: 0,
                talkCount: 0,
                startTime,
                endTime
            });
            
            expect(score).toBe(95);
        });

        test('5小时静睡应扣3分（每少1小时扣3分）', () => {
            const startTime = Date.now() - 5 * HOUR;
            const endTime = Date.now();
            
            const score = calculateScore({
                snoreCount: 0,
                talkCount: 0,
                startTime,
                endTime
            });
            
            expect(score).toBe(92);
        });

        test('4小时静睡应扣6分', () => {
            const startTime = Date.now() - 4 * HOUR;
            const endTime = Date.now();
            
            const score = calculateScore({
                snoreCount: 0,
                talkCount: 0,
                startTime,
                endTime
            });
            
            expect(score).toBe(89);
        });

        test('10小时静睡应扣2分（每多1小时扣2分）', () => {
            const startTime = Date.now() - 10 * HOUR;
            const endTime = Date.now();
            
            const score = calculateScore({
                snoreCount: 0,
                talkCount: 0,
                startTime,
                endTime
            });
            
            expect(score).toBe(93);
        });

        test('极短时间静睡最低保证70分', () => {
            const startTime = Date.now() - 30 * MINUTE;
            const endTime = Date.now();
            
            const score = calculateScore({
                snoreCount: 0,
                talkCount: 0,
                startTime,
                endTime
            });
            
            expect(score).toBeGreaterThanOrEqual(70);
        });
    });

    describe('有事件时的评分', () => {
        test('7.5小时无事件应得95分', () => {
            const startTime = Date.now() - 7.5 * HOUR;
            const endTime = Date.now();
            
            const score = calculateScore({
                snoreCount: 0,
                talkCount: 0,
                startTime,
                endTime
            });
            
            expect(score).toBe(95);
        });

        test('5次鼾声应扣10分', () => {
            const startTime = Date.now() - 7.5 * HOUR;
            const endTime = Date.now();
            
            const score = calculateScore({
                snoreCount: 5,
                talkCount: 0,
                startTime,
                endTime
            });
            
            expect(score).toBe(90);
        });

        test('5次梦话应扣7.5分（四舍五入为93分）', () => {
            const startTime = Date.now() - 7.5 * HOUR;
            const endTime = Date.now();
            
            const score = calculateScore({
                snoreCount: 0,
                talkCount: 5,
                startTime,
                endTime
            });
            
            expect(score).toBe(93);
        });

        test('20次鼾声应扣上限40分', () => {
            const startTime = Date.now() - 7.5 * HOUR;
            const endTime = Date.now();
            
            const score = calculateScore({
                snoreCount: 20,
                talkCount: 0,
                startTime,
                endTime
            });
            
            expect(score).toBe(60);
        });

        test('30次梦话应扣上限30分', () => {
            const startTime = Date.now() - 7.5 * HOUR;
            const endTime = Date.now();
            
            const score = calculateScore({
                snoreCount: 0,
                talkCount: 30,
                startTime,
                endTime
            });
            
            expect(score).toBe(70);
        });

        test('睡眠时长5小时应额外扣分', () => {
            const startTime = Date.now() - 5 * HOUR;
            const endTime = Date.now();
            
            const score = calculateScore({
                snoreCount: 2,
                talkCount: 0,
                startTime,
                endTime
            });
            
            expect(score).toBe(85);
        });

        test('事件频率过高应额外扣分', () => {
            const startTime = Date.now() - 1 * HOUR;
            const endTime = Date.now();
            
            const score = calculateScore({
                snoreCount: 10,
                talkCount: 0,
                startTime,
                endTime
            });
            
            expect(score).toBeLessThan(80);
        });

        test('严重情况最低保证0分', () => {
            const startTime = Date.now() - 7.5 * HOUR;
            const endTime = Date.now();
            
            const score = calculateScore({
                snoreCount: 100,
                talkCount: 100,
                startTime,
                endTime
            });
            
            expect(score).toBeGreaterThanOrEqual(0);
        });
    });

    describe('边界条件测试', () => {
        test('评分应在0-100范围内', () => {
            const testCases = [
                { snoreCount: 0, talkCount: 0, hours: 7.5 },
                { snoreCount: 100, talkCount: 100, hours: 7.5 },
                { snoreCount: 10, talkCount: 10, hours: 1 },
                { snoreCount: 0, talkCount: 0, hours: 0.5 },
            ];

            testCases.forEach(tc => {
                const startTime = Date.now() - tc.hours * HOUR;
                const endTime = Date.now();
                
                const score = calculateScore({
                    snoreCount: tc.snoreCount,
                    talkCount: tc.talkCount,
                    startTime,
                    endTime
                });

                expect(score).toBeGreaterThanOrEqual(0);
                expect(score).toBeLessThanOrEqual(100);
            });
        });
    });
});
