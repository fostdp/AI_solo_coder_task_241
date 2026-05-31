global.requestAnimationFrame = (callback) => {
    return setTimeout(callback, 16);
};

global.cancelAnimationFrame = (id) => {
    clearTimeout(id);
};

class MockMediaStreamTrack {
    constructor(kind = 'audio') {
        this.kind = kind;
        this.stopped = false;
    }

    stop() {
        this.stopped = true;
        console.log('Mock track stopped:', this.kind);
    }
}

class MockMediaStream {
    constructor() {
        this.audioTrack = new MockMediaStreamTrack('audio');
    }

    getTracks() {
        return [this.audioTrack];
    }
}

class MockAudioContext {
    constructor() {
        this.state = 'running';
        this.closed = false;
    }

    createAnalyser() {
        return new MockAnalyser();
    }

    createMediaStreamSource() {
        return {
            connect: () => {}
        };
    }

    close() {
        this.closed = true;
        this.state = 'closed';
        return Promise.resolve();
    }
}

class MockAnalyser {
    constructor() {
        this.fftSize = 2048;
        this.frequencyBinCount = 1024;
        this._timeDomainData = new Uint8Array(1024).fill(128);
        this._frequencyData = new Uint8Array(1024).fill(0);
    }

    getByteTimeDomainData(array) {
        for (let i = 0; i < array.length && i < this._timeDomainData.length; i++) {
            array[i] = this._timeDomainData[i];
        }
    }

    getByteFrequencyData(array) {
        for (let i = 0; i < array.length && i < this._frequencyData.length; i++) {
            array[i] = this._frequencyData[i];
        }
    }

    _setTimeDomainData(data) {
        this._timeDomainData = new Uint8Array(data);
    }

    _setFrequencyData(data) {
        this._frequencyData = new Uint8Array(data);
    }
}

class MockMediaRecorder {
    constructor(stream) {
        this.stream = stream;
        this.state = 'inactive';
        this.ondataavailable = null;
        this.onstop = null;
        this._chunks = [];
    }

    start() {
        this.state = 'recording';
    }

    stop() {
        if (this.state === 'recording') {
            this.state = 'inactive';
            if (this.ondataavailable) {
                this.ondataavailable({ data: new Blob(['mock'], { type: 'audio/webm' }) });
            }
            if (this.onstop) {
                this.onstop();
            }
        }
    }
}

global.AudioContext = MockAudioContext;
global.webkitAudioContext = MockAudioContext;
global.MediaStream = MockMediaStream;
global.MediaStreamTrack = MockMediaStreamTrack;
global.MediaRecorder = MockMediaRecorder;
global.Blob = class MockBlob {
    constructor(data, options = {}) {
        this.data = data;
        this.type = options.type || '';
    }
};
global.URL = {
    createObjectURL: () => 'blob:mock-url',
    revokeObjectURL: () => {}
};

Object.defineProperty(document, 'hidden', {
    value: false,
    writable: true,
    configurable: true
});

global.navigator = {
    mediaDevices: {
        getUserMedia: jest.fn().mockResolvedValue(new MockMediaStream())
    }
};

global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: jest.fn().mockResolvedValue([])
});

global.alert = jest.fn();
global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
};
