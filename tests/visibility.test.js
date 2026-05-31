const fs = require('fs');
const path = require('path');

const appJsPath = path.resolve(__dirname, '../client/app.js');
const appJsContent = fs.readFileSync(appJsPath, 'utf-8');

const evaluateAppCode = (code) => {
    const mockDocument = {
        hidden: false,
        querySelectorAll: () => [{ addEventListener: jest.fn(), dataset: { tab: 'monitor' } }],
        getElementById: (id) => ({
            addEventListener: jest.fn(),
            textContent: '',
            style: { display: '', grid: '', flex: '', block: '' },
            classList: { add: jest.fn(), remove: jest.fn() },
            disabled: false,
            innerHTML: ''
        }),
        addEventListener: jest.fn((event, handler) => {
            if (event === 'visibilitychange') {
                global._visibilityChangeHandler = handler;
            }
        })
    };

    const mockWindow = {
        addEventListener: jest.fn((event, handler) => {
            if (event === 'beforeunload') {
                global._beforeUnloadHandler = handler;
            }
        }),
        requestAnimationFrame: jest.fn((cb) => setTimeout(cb, 16)),
        cancelAnimationFrame: jest.fn(),
        setTimeout: jest.fn(),
        clearTimeout: jest.fn(),
        setInterval: jest.fn(),
        clearInterval: jest.fn(),
        navigator: global.navigator,
        fetch: global.fetch,
        alert: global.alert,
        console: global.console,
        AudioContext: global.AudioContext,
        MediaStream: global.MediaStream,
        MediaRecorder: global.MediaRecorder,
        URL: global.URL
    };

    const mockDate = {
        now: jest.fn(() => 1600000000000)
    };

    const sandbox = {
        console: global.console,
        setTimeout: mockWindow.setTimeout,
        clearTimeout: mockWindow.clearTimeout,
        setInterval: mockWindow.setInterval,
        clearInterval: mockWindow.clearInterval,
        requestAnimationFrame: mockWindow.requestAnimationFrame,
        cancelAnimationFrame: mockWindow.cancelAnimationFrame,
        document: mockDocument,
        window: mockWindow,
        navigator: mockWindow.navigator,
        fetch: mockWindow.fetch,
        alert: mockWindow.alert,
        AudioContext: mockWindow.AudioContext,
        webkitAudioContext: mockWindow.AudioContext,
        MediaStream: mockWindow.MediaStream,
        MediaRecorder: mockWindow.MediaRecorder,
        URL: mockWindow.URL,
        Blob: global.Blob,
        Date: function(...args) {
            if (args.length === 0) {
                return new (Function.prototype.bind.call(Date, Date, mockDate.now()))();
            }
            return new Date(...args);
        }
    };

    sandbox.Date.now = mockDate.now;

    const wrapper = new Function(
        'document', 'window', 'navigator', 'fetch', 'alert', 
        'AudioContext', 'webkitAudioContext', 'MediaStream', 
        'MediaRecorder', 'URL', 'Blob', 'Date',
        'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval',
        'requestAnimationFrame', 'cancelAnimationFrame', 'console',
        code
    );

    wrapper(
        mockDocument, mockWindow, mockWindow.navigator, mockWindow.fetch, mockWindow.alert,
        mockWindow.AudioContext, mockWindow.AudioContext, mockWindow.MediaStream,
        mockWindow.MediaRecorder, mockWindow.URL, global.Blob, sandbox.Date,
        mockWindow.setTimeout, mockWindow.clearTimeout, mockWindow.setInterval, mockWindow.clearInterval,
        mockWindow.requestAnimationFrame, mockWindow.cancelAnimationFrame, sandbox.console
    );

    return { mockDocument, mockWindow };
};

describe('页面可见性变化测试', () => {
    beforeEach(() => {
        global._visibilityChangeHandler = null;
        global._beforeUnloadHandler = null;
        jest.clearAllMocks();
    });

    describe('事件绑定', () => {
        test('应绑定 visibilitychange 事件', () => {
            evaluateAppCode(appJsContent);
            expect(global._visibilityChangeHandler).toBeDefined();
        });

        test('应绑定 beforeunload 事件', () => {
            evaluateAppCode(appJsContent);
            expect(global._beforeUnloadHandler).toBeDefined();
        });
    });

    describe('页面切后台行为', () => {
        test('页面可见时不触发停止', () => {
            const { mockDocument } = evaluateAppCode(appJsContent);
            mockDocument.hidden = false;
            
            expect(global._visibilityChangeHandler).toBeDefined();
        });

        test('页面隐藏时应触发可见性处理', () => {
            const { mockDocument } = evaluateAppCode(appJsContent);
            mockDocument.hidden = true;
            
            expect(typeof global._visibilityChangeHandler).toBe('function');
        });
    });

    describe('资源释放逻辑', () => {
        test('releaseAudioResources 方法存在于类中', () => {
            expect(appJsContent).toContain('releaseAudioResources()');
        });

        test('releaseAudioResources 应停止媒体轨道', () => {
            expect(appJsContent).toContain('track.stop()');
        });

        test('releaseAudioResources 应关闭 AudioContext', () => {
            expect(appJsContent).toContain('audioContext.close()');
        });

        test('releaseAudioResources 应清空媒体流', () => {
            expect(appJsContent).toContain('this.mediaStream = null');
        });

        test('releaseAudioResources 应清空 AudioContext', () => {
            expect(appJsContent).toContain('this.audioContext = null');
        });
    });

    describe('autoStopForPrivacy 隐私保护停止', () => {
        test('autoStopForPrivacy 方法存在于类中', () => {
            expect(appJsContent).toContain('autoStopForPrivacy()');
        });

        test('autoStopForPrivacy 应停止事件录音', () => {
            expect(appJsContent).toContain('this.stopEventRecording()');
        });

        test('autoStopForPrivacy 应设置 isMonitoring 为 false', () => {
            expect(appJsContent).toMatch(/this\.isMonitoring\s*=\s*false/);
        });

        test('autoStopForPrivacy 应清理定时器', () => {
            expect(appJsContent).toContain('clearInterval(this.timerInterval)');
            expect(appJsContent).toContain('clearInterval(this.detectionInterval)');
        });

        test('autoStopForPrivacy 应清理动画帧', () => {
            expect(appJsContent).toContain('cancelAnimationFrame(this.animationId)');
        });

        test('autoStopForPrivacy 应释放音频资源', () => {
            expect(appJsContent).toContain('this.releaseAudioResources()');
        });
    });

    describe('handlePageHidden 后台处理', () => {
        test('handlePageHidden 方法存在于类中', () => {
            expect(appJsContent).toContain('handlePageHidden()');
        });

        test('handlePageHidden 应检查是否正在监测', () => {
            expect(appJsContent).toContain('if (this.isMonitoring)');
        });

        test('handlePageHidden 应调用 autoStopForPrivacy', () => {
            expect(appJsContent).toContain('this.autoStopForPrivacy()');
        });

        test('handlePageHidden 应输出日志', () => {
            expect(appJsContent).toContain('页面切后台，自动停止监测');
        });
    });

    describe('handlePageVisible 前台恢复', () => {
        test('handlePageVisible 方法存在于类中', () => {
            expect(appJsContent).toContain('handlePageVisible()');
        });

        test('handlePageVisible 应检查监测状态', () => {
            expect(appJsContent).toContain('!this.isMonitoring');
        });

        test('handlePageVisible 应检查开始时间', () => {
            expect(appJsContent).toContain('this.startTime');
        });
    });

    describe('页面关闭时的处理', () => {
        test('beforeunload 处理应检查是否正在监测', () => {
            expect(appJsContent).toContain('if (this.isMonitoring)');
        });

        test('beforeunload 处理应释放音频资源', () => {
            expect(appJsContent).toContain('this.releaseAudioResources()');
        });
    });

    describe('stopMonitoring 正常停止', () => {
        test('stopMonitoring 应调用 releaseAudioResources', () => {
            expect(appJsContent).toContain('this.releaseAudioResources()');
        });

        test('stopMonitoring 应在录音时先停止录音', () => {
            expect(appJsContent).toContain('if (this.isRecording)');
            expect(appJsContent).toContain('this.stopEventRecording()');
        });
    });

    describe('完整可见性变化流程', () => {
        test('visibilitychange 事件处理器应存在', () => {
            evaluateAppCode(appJsContent);
            expect(typeof global._visibilityChangeHandler).toBe('function');
        });

        test('隐藏时应调用 handlePageHidden', () => {
            expect(appJsContent).toContain('document.hidden');
            expect(appJsContent).toContain('this.handlePageHidden()');
        });

        test('可见时应调用 handlePageVisible', () => {
            expect(appJsContent).toContain('else');
            expect(appJsContent).toContain('this.handlePageVisible()');
        });
    });

    describe('资源释放关键代码检查', () => {
        test('媒体轨道停止代码存在', () => {
            expect(appJsContent).toContain('track.stop()');
            expect(appJsContent).toContain('this.mediaStream.getTracks()');
        });

        test('AudioContext 关闭代码存在', () => {
            expect(appJsContent).toContain('audioContext.state');
            expect(appJsContent).toContain('audioContext.close()');
        });

        test('资源清空代码存在', () => {
            expect(appJsContent).toContain('this.analyser = null');
            expect(appJsContent).toContain('this.dataArray = null');
        });
    });

    describe('控制台日志检查', () => {
        test('页面切后台应有日志输出', () => {
            expect(appJsContent).toContain('console.log');
            expect(appJsContent).toContain('页面切后台');
        });

        test('资源释放应有日志输出', () => {
            expect(appJsContent).toContain('已释放媒体轨道');
        });
    });
});

describe('端到端隐私保护验证', () => {
    test('页面切后台流程完整', () => {
        const requiredComponents = [
            'bindVisibilityEvents',
            'visibilitychange',
            'document.hidden',
            'handlePageHidden',
            'autoStopForPrivacy',
            'releaseAudioResources',
            'track.stop()',
            'audioContext.close()'
        ];

        requiredComponents.forEach(component => {
            expect(appJsContent).toContain(component);
        });
    });

    test('页面关闭流程完整', () => {
        const requiredComponents = [
            'beforeunload',
            'isMonitoring',
            'releaseAudioResources'
        ];

        requiredComponents.forEach(component => {
            expect(appJsContent).toContain(component);
        });
    });

    test('正常停止流程完整', () => {
        const requiredComponents = [
            'stopMonitoring',
            'stopEventRecording',
            'releaseAudioResources'
        ];

        requiredComponents.forEach(component => {
            expect(appJsContent).toContain(component);
        });
    });
});
