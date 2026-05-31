class SleepRecorderApp {
    constructor() {
        this.audioContext = null;
        this.analyser = null;
        this.mediaStream = null;
        this.mediaRecorder = null;
        this.audioChunks = [];
        
        this.isMonitoring = false;
        this.isRecording = false;
        this.startTime = null;
        this.timerInterval = null;
        
        this.snoreCount = 0;
        this.talkCount = 0;
        this.events = [];
        this.recordings = [];
        this.currentRecording = null;
        
        this.noiseBaseline = 0.01;
        this.noiseSamples = [];
        this.noiseBaselineCount = 0;
        this.isCalibrating = false;
        
        this.consecutiveDetections = 0;
        this.lastEventTime = 0;
        
        this.allNoiseLevels = [];
        this.noisePeak = 0;
        this.noiseSum = 0;
        this.noiseSampleCount = 0;
        
        this.currentUser = null;
        this.authToken = localStorage.getItem('authToken') || null;
        this.isLoginMode = true;
        
        this.whiteNoiseContext = null;
        this.whiteNoiseNodes = [];
        this.whiteNoiseVolume = 0.5;
        this.currentWhiteNoiseType = null;
        
        this.init();
    }

    async init() {
        this.bindElements();
        this.bindEvents();
        this.bindVisibilityEvents();
        
        if (this.authToken) {
            await this.checkAuthStatus();
        }
        
        this.loadWhiteNoisePresets();
    }

    bindElements() {
        this.statusIndicator = document.getElementById('status-indicator');
        this.statusText = document.getElementById('status-text');
        this.statusDetail = document.getElementById('status-detail');
        
        this.timerSection = document.getElementById('timer-section');
        this.timerHours = document.getElementById('timer-hours');
        this.timerMinutes = document.getElementById('timer-minutes');
        this.timerSeconds = document.getElementById('timer-seconds');
        
        this.statsGrid = document.getElementById('stats-grid');
        this.snoreCountEl = document.getElementById('snore-count');
        this.talkCountEl = document.getElementById('talk-count');
        this.recordingsCountEl = document.getElementById('recordings-count');
        this.noiseLevelEl = document.getElementById('noise-level');
        
        this.startBtn = document.getElementById('start-btn');
        this.stopBtn = document.getElementById('stop-btn');
        
        this.visualizerSection = document.getElementById('visualizer-section');
        this.audioVisualizer = document.getElementById('audio-visualizer');
        
        this.resultSection = document.getElementById('result-section');
        this.finalScore = document.getElementById('final-score');
        this.resultDuration = document.getElementById('result-duration');
        this.resultSnore = document.getElementById('result-snore');
        this.resultTalk = document.getElementById('result-talk');
        this.resultNoise = document.getElementById('result-noise');
        
        this.noiseAnalysisCard = document.getElementById('noise-analysis-card');
        this.noiseSuggestions = document.getElementById('noise-suggestions');
        
        this.timelineContainer = document.getElementById('timeline-container');
        
        this.recordingsSection = document.getElementById('recordings-section');
        this.recordingsList = document.getElementById('recordings-list');
        
        this.saveBtn = document.getElementById('save-btn');
        this.resetBtn = document.getElementById('reset-btn');
        
        this.historyList = document.getElementById('history-list');
        this.refreshHistory = document.getElementById('refresh-history');
        
        this.loginBtn = document.getElementById('login-btn');
        this.registerBtn = document.getElementById('register-btn');
        this.userInfo = document.getElementById('user-info');
        this.userNickname = document.getElementById('user-nickname');
        this.logoutBtn = document.getElementById('logout-btn');
        
        this.authModal = document.getElementById('auth-modal');
        this.authTitle = document.getElementById('auth-title');
        this.authUsername = document.getElementById('auth-username');
        this.authNickname = document.getElementById('auth-nickname');
        this.authPassword = document.getElementById('auth-password');
        this.authConfirm = document.getElementById('auth-confirm');
        this.authSubmit = document.getElementById('auth-submit');
        this.authSwitch = document.getElementById('auth-switch');
        this.nicknameGroup = document.getElementById('nickname-group');
        this.confirmGroup = document.getElementById('confirm-group');
        this.closeAuth = document.getElementById('close-auth');
        
        this.noiseLevelEl2 = document.getElementById('avg-noise-level');
        this.noiseStatusEl = document.getElementById('noise-status');
        this.noiseSuggestionsList = document.getElementById('noise-suggestions-list');
        this.noiseHistoryList = document.getElementById('noise-history-list');
        this.refreshNoise = document.getElementById('refresh-noise');
        
        this.whitenoiseGrid = document.getElementById('whitenoise-grid');
        this.noiseVolume = document.getElementById('noise-volume');
        this.volumeValue = document.getElementById('volume-value');
        this.nowPlaying = document.getElementById('now-playing');
        this.playingIcon = document.getElementById('playing-icon');
        this.playingName = document.getElementById('playing-name');
        this.stopNoiseBtn = document.getElementById('stop-noise');
        
        this.noFamilySection = document.getElementById('no-family-section');
        this.familyContent = document.getElementById('family-content');
        this.createFamilyBtn = document.getElementById('create-family-btn');
        this.joinFamilyBtn = document.getElementById('join-family-btn');
        this.familyName = document.getElementById('family-name');
        this.familyRole = document.getElementById('family-role');
        this.generateInviteBtn = document.getElementById('generate-invite-btn');
        this.inviteCodeSection = document.getElementById('invite-code-section');
        this.inviteCode = document.getElementById('invite-code');
        this.inviteExpiry = document.getElementById('invite-expiry');
        this.copyCode = document.getElementById('copy-code');
        this.familyMembersList = document.getElementById('family-members-list');
        this.familySummaryList = document.getElementById('family-summary-list');
        this.refreshFamily = document.getElementById('refresh-family');
        
        this.tabBtns = document.querySelectorAll('.tab-btn');
        this.tabContents = document.querySelectorAll('.tab-content');
    }

    bindEvents() {
        this.startBtn.addEventListener('click', () => this.startMonitoring());
        this.stopBtn.addEventListener('click', () => this.stopMonitoring());
        this.saveBtn.addEventListener('click', () => this.saveRecord());
        this.resetBtn.addEventListener('click', () => this.resetApp());
        
        this.refreshHistory.addEventListener('click', () => this.loadHistory());
        
        this.loginBtn.addEventListener('click', () => this.showAuthModal('login'));
        this.logoutBtn.addEventListener('click', () => this.logout());
        this.authSubmit.addEventListener('click', () => this.handleAuthSubmit());
        this.authSwitch.addEventListener('click', () => this.toggleAuthMode());
        this.closeAuth.addEventListener('click', () => this.hideAuthModal());
        this.authModal.addEventListener('click', (e) => {
            if (e.target === this.authModal) this.hideAuthModal();
        });
        
        this.refreshNoise.addEventListener('click', () => this.loadNoiseAnalysis());
        this.tabBtns.forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
        
        this.noiseVolume.addEventListener('input', (e) => this.updateNoiseVolume(e.target.value));
        this.stopNoiseBtn.addEventListener('click', () => this.stopWhiteNoise());
        
        this.createFamilyBtn.addEventListener('click', () => this.createFamily());
        this.joinFamilyBtn.addEventListener('click', () => this.joinFamily());
        this.generateInviteBtn.addEventListener('click', () => this.generateInviteCode());
        this.copyCode.addEventListener('click', () => this.copyInviteCode());
        this.refreshFamily.addEventListener('click', () => this.loadFamilyInfo());
    }

    bindVisibilityEvents() {
        document.addEventListener('visibilitychange', () => {
            if (document.hidden && this.isMonitoring) {
                this.autoStopForPrivacy();
            }
        });

        window.addEventListener('beforeunload', () => {
            if (this.isMonitoring) {
                this.releaseAudioResources();
            }
            if (this.whiteNoiseNodes.length > 0) {
                this.stopWhiteNoise();
            }
        });
    }

    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/me', {
                headers: {
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                this.currentUser = await response.json();
                this.showLoggedInState();
                this.loadFamilyInfo();
                this.loadNoiseAnalysis();
            } else {
                this.authToken = null;
                localStorage.removeItem('authToken');
                this.showLoggedOutState();
            }
        } catch (err) {
            console.error('检查登录状态失败:', err);
            this.showLoggedOutState();
        }
    }

    showAuthModal(mode) {
        this.isLoginMode = mode === 'login';
        this.updateAuthModal();
        this.authModal.style.display = 'flex';
    }

    hideAuthModal() {
        this.authModal.style.display = 'none';
        this.clearAuthForm();
    }

    toggleAuthMode() {
        this.isLoginMode = !this.isLoginMode;
        this.updateAuthModal();
    }

    updateAuthModal() {
        if (this.isLoginMode) {
            this.authTitle.textContent = '登录';
            this.authSubmit.textContent = '登录';
            this.authSwitch.textContent = '还没有账号？点击注册';
            this.nicknameGroup.style.display = 'none';
            this.confirmGroup.style.display = 'none';
        } else {
            this.authTitle.textContent = '注册';
            this.authSubmit.textContent = '注册';
            this.authSwitch.textContent = '已有账号？点击登录';
            this.nicknameGroup.style.display = 'block';
            this.confirmGroup.style.display = 'block';
        }
    }

    clearAuthForm() {
        this.authUsername.value = '';
        this.authNickname.value = '';
        this.authPassword.value = '';
        this.authConfirm.value = '';
    }

    async handleAuthSubmit() {
        const username = this.authUsername.value.trim();
        const password = this.authPassword.value;
        
        if (!username || !password) {
            alert('请填写用户名和密码');
            return;
        }

        try {
            let response;
            
            if (this.isLoginMode) {
                response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });
            } else {
                const nickname = this.authNickname.value.trim();
                const confirm = this.authConfirm.value;
                
                if (password !== confirm) {
                    alert('两次输入的密码不一致');
                    return;
                }
                
                response = await fetch('/api/auth/register', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password, nickname })
                });
            }

            const data = await response.json();
            
            if (response.ok) {
                this.authToken = data.token;
                this.currentUser = data;
                localStorage.setItem('authToken', data.token);
                this.hideAuthModal();
                this.showLoggedInState();
                this.loadFamilyInfo();
                this.loadNoiseAnalysis();
            } else {
                alert(data.error || '操作失败');
            }
        } catch (err) {
            console.error('认证失败:', err);
            alert('网络错误，请稍后重试');
        }
    }

    async logout() {
        try {
            if (this.authToken) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });
            }
        } catch (err) {
            console.error('登出失败:', err);
        }
        
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        this.showLoggedOutState();
    }

    showLoggedInState() {
        this.loginBtn.style.display = 'none';
        this.userInfo.style.display = 'flex';
        this.userNickname.textContent = this.currentUser?.nickname || this.currentUser?.username || '用户';
    }

    showLoggedOutState() {
        this.loginBtn.style.display = 'inline-block';
        this.userInfo.style.display = 'none';
    }

    switchTab(tabName) {
        this.tabBtns.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });
        
        this.tabContents.forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });

        if (tabName === 'history') {
            this.loadHistory();
        } else if (tabName === 'noise') {
            this.loadNoiseAnalysis();
        } else if (tabName === 'family') {
            this.loadFamilyInfo();
        }
    }

    async startMonitoring() {
        try {
            this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
                audio: {
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            });
            
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const source = this.audioContext.createMediaStreamSource(this.mediaStream);
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 2048;
            source.connect(this.analyser);
            
            this.isMonitoring = true;
            this.startTime = Date.now();
            
            this.resetStats();
            
            this.snoreCount = 0;
            this.talkCount = 0;
            this.events = [];
            this.recordings = [];
            this.allNoiseLevels = [];
            this.noisePeak = 0;
            this.noiseSum = 0;
            this.noiseSampleCount = 0;
            
            this.noiseSamples = [];
            this.noiseBaselineCount = 0;
            this.isCalibrating = true;
            
            this.statusIndicator.classList.remove('recording');
            this.statusText.textContent = '正在校准环境噪音';
            this.statusDetail.textContent = '请保持安静，正在建立噪音基线...';
            this.startBtn.style.display = 'none';
            this.stopBtn.style.display = 'inline-flex';
            
            this.timerSection.style.display = 'block';
            this.statsGrid.style.display = 'grid';
            this.resultSection.style.display = 'none';
            
            this.startTimer();
            this.startAudioAnalysis();
            this.startVisualizer();
            
        } catch (err) {
            console.error('启动监测失败:', err);
            alert('无法访问麦克风，请确保已授予权限。错误: ' + err.message);
        }
    }

    resetStats() {
        this.snoreCountEl.textContent = '0';
        this.talkCountEl.textContent = '0';
        this.recordingsCountEl.textContent = '0';
        this.noiseLevelEl.textContent = '--';
    }

    startTimer() {
        this.timerInterval = setInterval(() => {
            const elapsed = Date.now() - this.startTime;
            const hours = Math.floor(elapsed / 3600000);
            const minutes = Math.floor((elapsed % 3600000) / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            
            this.timerHours.textContent = String(hours).padStart(2, '0');
            this.timerMinutes.textContent = String(minutes).padStart(2, '0');
            this.timerSeconds.textContent = String(seconds).padStart(2, '0');
        }, 1000);
    }

    startAudioAnalysis() {
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        const timeDataArray = new Uint8Array(bufferLength);
        
        const analyze = () => {
            if (!this.isMonitoring) return;
            
            this.analyser.getByteFrequencyData(dataArray);
            this.analyser.getByteTimeDomainData(timeDataArray);
            
            let sum = 0;
            for (let i = 0; i < timeDataArray.length; i++) {
                const v = (timeDataArray[i] - 128) / 128;
                sum += v * v;
            }
            const rms = Math.sqrt(sum / timeDataArray.length);
            
            this.noiseSum += rms;
            this.noiseSampleCount++;
            if (rms > this.noisePeak) {
                this.noisePeak = rms;
            }
            this.allNoiseLevels.push({
                time: Date.now(),
                rms: rms
            });
            
            const noiseLevel = Math.round(rms * 100);
            this.noiseLevelEl.textContent = `${noiseLevel}`;
            
            if (this.isCalibrating) {
                this.noiseSamples.push(rms);
                this.noiseBaselineCount++;
                
                if (this.noiseBaselineCount >= 50) {
                    this.completeCalibration();
                }
            } else {
                const frequencyData = Array.from(dataArray);
                const isSnore = SleepRecorderUtils.detectSnore(rms, frequencyData, this.noiseBaseline);
                const isTalk = SleepRecorderUtils.detectTalk(rms, frequencyData, this.noiseBaseline);
                
                if (isSnore || isTalk) {
                    this.consecutiveDetections++;
                    
                    const timeSinceLastEvent = Date.now() - this.lastEventTime;
                    const shouldTrigger = SleepRecorderUtils.shouldTriggerRecording({
                        isSnore,
                        isTalk,
                        isRecording: this.isRecording,
                        timeSinceLastEvent,
                        consecutiveDetections: this.consecutiveDetections,
                        minEventInterval: 5000,
                        requiredConsecutiveDetections: 5
                    });
                    
                    if (shouldTrigger) {
                        this.startRecording(isSnore ? 'snore' : 'talk');
                    }
                } else {
                    this.consecutiveDetections = Math.max(0, this.consecutiveDetections - 1);
                }
                
                if (this.isRecording) {
                    const stopThreshold = this.noiseBaseline * 0.8;
                    const recordingDuration = Date.now() - this.currentRecording.startTime;
                    
                    const shouldStop = SleepRecorderUtils.shouldStopRecording({
                        rms,
                        stopThreshold,
                        recordingDuration,
                        minRecordingDuration: 1500,
                        maxRecordingDuration: 10000
                    });
                    
                    if (shouldStop) {
                        this.stopRecording();
                    }
                }
            }
            
            requestAnimationFrame(analyze);
        };
        
        analyze();
    }

    completeCalibration() {
        this.noiseBaseline = SleepRecorderUtils.calculateNoiseBaseline(this.noiseSamples);
        this.isCalibrating = false;
        
        this.statusIndicator.classList.remove('recording');
        this.statusText.textContent = '正在监测中';
        this.statusDetail.textContent = '检测到鼾声或梦话时会自动录音';
        this.visualizerSection.style.display = 'block';
    }

    startRecording(type) {
        if (!this.isMonitoring || this.isRecording) return;
        
        this.isRecording = true;
        this.consecutiveDetections = 0;
        this.lastEventTime = Date.now();
        
        if (type === 'snore') {
            this.snoreCount++;
            this.snoreCountEl.textContent = this.snoreCount;
        } else {
            this.talkCount++;
            this.talkCountEl.textContent = this.talkCount;
        }
        
        this.statusIndicator.classList.add('recording');
        this.statusText.textContent = '正在录音';
        this.statusDetail.textContent = `检测到${type === 'snore' ? '鼾声' : '梦话'}，正在记录...`;
        
        try {
            this.mediaRecorder = new MediaRecorder(this.mediaStream);
            this.audioChunks = [];
            
            this.mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    this.audioChunks.push(e.data);
                }
            };
            
            this.mediaRecorder.onstop = () => {
                const audioBlob = new Blob(this.audioChunks, { type: 'audio/webm' });
                const audioUrl = URL.createObjectURL(audioBlob);
                
                const recording = {
                    type: type,
                    startTime: this.currentRecording.startTime,
                    endTime: Date.now(),
                    audioUrl: audioUrl,
                    blob: audioBlob
                };
                
                this.recordings.push(recording);
                this.recordingsCountEl.textContent = this.recordings.length;
                
                this.events.push({
                    type: type,
                    time: this.currentRecording.startTime,
                    duration: Date.now() - this.currentRecording.startTime,
                    recordingIndex: this.recordings.length - 1
                });
            };
            
            this.currentRecording = {
                type: type,
                startTime: Date.now()
            };
            
            this.mediaRecorder.start();
            
        } catch (err) {
            console.error('开始录音失败:', err);
            this.isRecording = false;
        }
    }

    stopRecording() {
        if (!this.isRecording || !this.mediaRecorder) return;
        
        try {
            this.mediaRecorder.stop();
        } catch (err) {
            console.error('停止录音失败:', err);
        }
        
        this.isRecording = false;
        this.statusIndicator.classList.remove('recording');
        this.statusText.textContent = '正在监测中';
        this.statusDetail.textContent = '检测到鼾声或梦话时会自动录音';
    }

    startVisualizer() {
        const canvas = this.audioVisualizer;
        const ctx = canvas.getContext('2d');
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        canvas.width = canvas.offsetWidth;
        canvas.height = canvas.offsetHeight;
        
        const draw = () => {
            if (!this.isMonitoring) return;
            
            requestAnimationFrame(draw);
            
            this.analyser.getByteTimeDomainData(dataArray);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#667eea';
            ctx.beginPath();
            
            const sliceWidth = canvas.width / bufferLength;
            let x = 0;
            
            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0;
                const y = v * canvas.height / 2;
                
                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }
                
                x += sliceWidth;
            }
            
            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();
        };
        
        draw();
    }

    stopMonitoring() {
        if (!this.isMonitoring) return;
        
        this.isMonitoring = false;
        
        if (this.isRecording) {
            this.stopRecording();
        }
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        this.releaseAudioResources();
        
        this.generateResult();
    }

    autoStopForPrivacy() {
        if (this.isMonitoring) {
            this.stopMonitoring();
            this.statusText.textContent = '监测已暂停';
            this.statusDetail.textContent = '页面切后台时自动停止以保护隐私';
        }
    }

    releaseAudioResources() {
        if (this.mediaStream) {
            this.mediaStream.getTracks().forEach(track => {
                track.stop();
            });
            this.mediaStream = null;
        }
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.analyser = null;
        this.mediaRecorder = null;
    }

    generateResult() {
        const endTime = Date.now();
        const totalDuration = endTime - this.startTime;
        
        const hours = Math.floor(totalDuration / 3600000);
        const minutes = Math.floor((totalDuration % 3600000) / 60000);
        
        const score = SleepRecorderUtils.calculateScore({
            snoreCount: this.snoreCount,
            talkCount: this.talkCount,
            startTime: this.startTime,
            endTime: endTime
        });
        
        const avgNoise = this.noiseSampleCount > 0 
            ? this.noiseSum / this.noiseSampleCount 
            : 0;
        
        this.finalScore.textContent = score;
        this.resultDuration.textContent = `${hours} 小时 ${minutes} 分钟`;
        this.resultSnore.textContent = `${this.snoreCount} 次`;
        this.resultTalk.textContent = `${this.talkCount} 次`;
        this.resultNoise.textContent = `${Math.round(avgNoise * 100)}`;
        
        this.timerSection.style.display = 'none';
        this.statsGrid.style.display = 'none';
        this.visualizerSection.style.display = 'none';
        this.stopBtn.style.display = 'none';
        this.resultSection.style.display = 'block';
        
        this.renderTimeline();
        
        if (this.recordings.length > 0) {
            this.recordingsSection.style.display = 'block';
            this.renderRecordings();
        }
        
        this.generateNoiseAnalysis(avgNoise);
        
        this.currentResult = {
            date: new Date().toISOString().split('T')[0],
            startTime: new Date(this.startTime).toISOString(),
            endTime: new Date(endTime).toISOString(),
            score: score,
            totalDuration: totalDuration,
            snoreCount: this.snoreCount,
            talkCount: this.talkCount,
            events: this.events,
            noiseBaseline: this.noiseBaseline,
            noiseAvg: avgNoise,
            noisePeak: this.noisePeak,
            noiseAnalysis: {
                snoreCount: this.snoreCount,
                talkCount: this.talkCount,
                avgLevel: avgNoise,
                peakLevel: this.noisePeak,
                levels: this.allNoiseLevels.slice(-100)
            }
        };
    }

    generateNoiseAnalysis(avgNoise) {
        const suggestions = this.generateSuggestions(avgNoise, this.noisePeak);
        
        if (suggestions.length > 0) {
            this.noiseAnalysisCard.style.display = 'block';
            this.noiseSuggestions.innerHTML = suggestions.map(s => `
                <div class="suggestion-card">
                    <div class="suggestion-header">
                        <span class="suggestion-icon">${s.icon}</span>
                        <span class="suggestion-title">${s.title}</span>
                    </div>
                    <p class="suggestion-description">${s.description}</p>
                    <p class="suggestion-action">💡 ${s.action}</p>
                </div>
            `).join('');
        } else {
            this.noiseAnalysisCard.style.display = 'none';
        }
    }

    generateSuggestions(avgNoise, peakNoise) {
        const suggestions = [];
        
        if (avgNoise > 0.08) {
            suggestions.push({
                type: 'ac',
                icon: '❄️',
                title: '空调/风扇噪音',
                description: '检测到持续的低频噪音，可能来自空调或风扇。建议调整风向或使用睡眠模式。',
                action: '尝试降低空调风速或使用定时器'
            });
        }
        
        if (avgNoise > 0.05 && avgNoise <= 0.08) {
            suggestions.push({
                type: 'traffic',
                icon: '🚗',
                title: '环境噪音',
                description: '环境噪音水平偏高，可能影响深睡质量。',
                action: '可以考虑使用耳塞或白噪音机'
            });
        }
        
        if (peakNoise > 0.2) {
            suggestions.push({
                type: 'peaks',
                icon: '⚡',
                title: '突发性噪音',
                description: '检测到突发性噪音峰值，可能会中断睡眠。',
                action: '检查是否有夜间活动的设备需要关闭'
            });
        }
        
        if (this.snoreCount > 5) {
            suggestions.push({
                type: 'snore',
                icon: '💤',
                title: '频繁鼾声',
                description: '检测到频繁的鼾声，可能影响您或伴侣的睡眠。',
                action: '建议尝试侧卧睡眠或咨询医生'
            });
        }
        
        if (suggestions.length === 0) {
            suggestions.push({
                type: 'excellent',
                icon: '✨',
                title: '睡眠环境良好',
                description: '您的睡眠环境噪音水平在理想范围内。',
                action: '继续保持良好的睡眠习惯！'
            });
        }
        
        return suggestions;
    }

    renderTimeline() {
        if (this.events.length === 0) {
            this.timelineContainer.innerHTML = '<p class="empty-message">整夜安静，没有检测到鼾声或梦话</p>';
            return;
        }
        
        this.timelineContainer.innerHTML = this.events.map((event, index) => {
            const time = SleepRecorderUtils.formatTime(event.time);
            const duration = Math.round(event.duration / 1000);
            const typeText = event.type === 'snore' ? '鼾声' : '梦话';
            const typeClass = event.type;
            
            return `
                <div class="timeline-event ${typeClass}">
                    <span class="event-time">${time}</span>
                    <span class="event-type">${typeText}</span>
                    <span class="event-duration">${duration}秒</span>
                </div>
            `;
        }).join('');
    }

    renderRecordings() {
        this.recordingsList.innerHTML = this.recordings.map((recording, index) => {
            const time = SleepRecorderUtils.formatTime(recording.startTime);
            const duration = Math.round((recording.endTime - recording.startTime) / 1000);
            const typeText = recording.type === 'snore' ? '鼾声' : '梦话';
            
            return `
                <div class="recording-item">
                    <div class="recording-info">
                        <div class="recording-time">${time}</div>
                        <div class="recording-type">${typeText} · ${duration}秒</div>
                    </div>
                    <audio class="recording-audio" controls src="${recording.audioUrl}"></audio>
                </div>
            `;
        }).join('');
    }

    async saveRecord() {
        if (!this.currentResult) {
            alert('没有可保存的记录');
            return;
        }
        
        try {
            const headers = { 'Content-Type': 'application/json' };
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }
            
            const response = await fetch('/api/sleep-records', {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(this.currentResult)
            });
            
            if (response.ok) {
                alert('记录保存成功！');
                this.saveBtn.style.display = 'none';
            } else {
                const data = await response.json();
                alert('保存失败: ' + data.error);
            }
        } catch (err) {
            console.error('保存失败:', err);
            alert('保存失败，请稍后重试');
        }
    }

    resetApp() {
        this.isMonitoring = false;
        this.isRecording = false;
        this.startTime = null;
        
        this.snoreCount = 0;
        this.talkCount = 0;
        this.events = [];
        this.recordings = [];
        this.currentRecording = null;
        this.currentResult = null;
        
        this.allNoiseLevels = [];
        this.noisePeak = 0;
        this.noiseSum = 0;
        this.noiseSampleCount = 0;
        
        this.noiseBaseline = 0.01;
        this.noiseSamples = [];
        this.noiseBaselineCount = 0;
        this.isCalibrating = false;
        
        this.consecutiveDetections = 0;
        this.lastEventTime = 0;
        
        if (this.timerInterval) {
            clearInterval(this.timerInterval);
            this.timerInterval = null;
        }
        
        this.releaseAudioResources();
        
        this.statusIndicator.classList.remove('recording');
        this.statusText.textContent = '准备就绪';
        this.statusDetail.textContent = '点击下方按钮开始夜间监测';
        
        this.timerSection.style.display = 'none';
        this.statsGrid.style.display = 'none';
        this.visualizerSection.style.display = 'none';
        this.resultSection.style.display = 'none';
        
        this.startBtn.style.display = 'inline-flex';
        this.stopBtn.style.display = 'none';
        this.saveBtn.style.display = 'inline-flex';
        
        this.resetStats();
    }

    async loadHistory() {
        try {
            const headers = {};
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }
            
            const response = await fetch('/api/sleep-records', {
                headers: headers
            });
            
            if (response.ok) {
                const records = await response.json();
                this.renderHistory(records);
            }
        } catch (err) {
            console.error('加载历史记录失败:', err);
            this.historyList.innerHTML = '<p class="empty-message">加载失败，请稍后重试</p>';
        }
    }

    renderHistory(records) {
        if (records.length === 0) {
            this.historyList.innerHTML = '<p class="empty-message">暂无历史记录</p>';
            return;
        }
        
        this.historyList.innerHTML = records.map(record => {
            const hours = Math.floor(record.totalDuration / 3600000);
            const minutes = Math.floor((record.totalDuration % 3600000) / 60000);
            
            return `
                <div class="history-item">
                    <div class="history-date">${record.date}</div>
                    <span class="history-score">${record.score}分</span>
                    <div class="history-summary">
                        <span>时长: ${hours}h${minutes}m</span>
                        <span>鼾声: ${record.snoreCount}次</span>
                        <span>梦话: ${record.talkCount}次</span>
                        ${record.noiseAvg ? `<span>噪音: ${Math.round(record.noiseAvg * 100)}</span>` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    async loadNoiseAnalysis() {
        try {
            const headers = {};
            if (this.authToken) {
                headers['Authorization'] = `Bearer ${this.authToken}`;
            }
            
            const response = await fetch('/api/noise-analysis', {
                headers: headers
            });
            
            if (response.ok) {
                const data = await response.json();
                this.renderNoiseAnalysis(data);
            }
        } catch (err) {
            console.error('加载噪音分析失败:', err);
        }
    }

    renderNoiseAnalysis(data) {
        const levelText = data.level || '--';
        const avgLevel = data.avgNoise ? Math.round(data.avgNoise * 100) : '--';
        
        this.noiseLevelEl2.textContent = avgLevel;
        this.noiseStatusEl.textContent = levelText;
        
        if (data.suggestions && data.suggestions.length > 0) {
            this.noiseSuggestionsList.innerHTML = data.suggestions.map(s => `
                <div class="suggestion-card">
                    <div class="suggestion-header">
                        <span class="suggestion-icon">${s.icon}</span>
                        <span class="suggestion-title">${s.title}</span>
                    </div>
                    <p class="suggestion-description">${s.description}</p>
                    <p class="suggestion-action">💡 ${s.action}</p>
                </div>
            `).join('');
        } else {
            this.noiseSuggestionsList.innerHTML = '<p class="empty-message">暂无噪音分析数据，请先完成至少一次睡眠监测</p>';
        }
        
        if (data.recentRecords && data.recentRecords.length > 0) {
            this.noiseHistoryList.innerHTML = data.recentRecords.map(r => `
                <div class="noise-history-item">
                    <span class="noise-history-date">${r.date}</span>
                    <div class="noise-history-stats">
                        <span class="noise-history-stat">基线: <span>${r.noiseBaseline ? Math.round(r.noiseBaseline * 100) : '--'}</span></span>
                        <span class="noise-history-stat">平均: <span>${r.noiseAvg ? Math.round(r.noiseAvg * 100) : '--'}</span></span>
                        <span class="noise-history-stat">峰值: <span>${r.noisePeak ? Math.round(r.noisePeak * 100) : '--'}</span></span>
                    </div>
                </div>
            `).join('');
        } else {
            this.noiseHistoryList.innerHTML = '<p class="empty-message">暂无历史数据</p>';
        }
    }

    async loadWhiteNoisePresets() {
        try {
            const response = await fetch('/api/white-noise/presets');
            const presets = await response.json();
            this.renderWhiteNoisePresets(presets);
        } catch (err) {
            console.error('加载白噪音预设失败:', err);
            this.whitenoiseGrid.innerHTML = '<p class="empty-message">加载失败</p>';
        }
    }

    renderWhiteNoisePresets(presets) {
        this.whitenoiseGrid.innerHTML = presets.map(preset => `
            <div class="whitenoise-item" data-type="${preset.type}" data-name="${preset.name}" data-icon="${preset.icon}" data-volume="${preset.defaultVolume}">
                <div class="whitenoise-icon">${preset.icon}</div>
                <div class="whitenoise-name">${preset.name}</div>
            </div>
        `).join('');
        
        this.whitenoiseGrid.querySelectorAll('.whitenoise-item').forEach(item => {
            item.addEventListener('click', () => {
                const type = item.dataset.type;
                const name = item.dataset.name;
                const icon = item.dataset.icon;
                const defaultVolume = parseFloat(item.dataset.volume);
                
                if (this.currentWhiteNoiseType === type) {
                    this.stopWhiteNoise();
                    item.classList.remove('active');
                } else {
                    this.whitenoiseGrid.querySelectorAll('.whitenoise-item').forEach(i => i.classList.remove('active'));
                    item.classList.add('active');
                    
                    if (this.whiteNoiseNodes.length === 0) {
                        this.noiseVolume.value = defaultVolume;
                        this.updateNoiseVolume(defaultVolume);
                    }
                    
                    this.startWhiteNoise(type, name, icon);
                }
            });
        });
    }

    startWhiteNoise(type, name, icon) {
        this.stopWhiteNoise();
        
        try {
            if (!this.whiteNoiseContext) {
                this.whiteNoiseContext = new (window.AudioContext || window.webkitAudioContext)();
            }
            
            const bufferSize = 2 * this.whiteNoiseContext.sampleRate;
            const noiseBuffer = this.whiteNoiseContext.createBuffer(1, bufferSize, this.whiteNoiseContext.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            
            let lastOut = 0;
            for (let i = 0; i < bufferSize; i++) {
                const white = Math.random() * 2 - 1;
                
                if (type === 'brown') {
                    output[i] = (lastOut + (0.02 * white)) / 1.02;
                    lastOut = output[i];
                    output[i] *= 3.5;
                } else if (type === 'pink') {
                    let b0, b1, b2, b3, b4, b5, b6;
                    b0 = b1 = b2 = b3 = b4 = b5 = b6 = 0.0;
                    b0 = 0.99886 * b0 + white * 0.0555179;
                    b1 = 0.99332 * b1 + white * 0.0750759;
                    b2 = 0.96900 * b2 + white * 0.1538520;
                    b3 = 0.86650 * b3 + white * 0.3104856;
                    b4 = 0.55000 * b4 + white * 0.5329522;
                    b5 = -0.7616 * b5 - white * 0.0168980;
                    output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
                    output[i] *= 0.11;
                    b6 = white * 0.115926;
                } else {
                    output[i] = white;
                }
            }
            
            if (type === 'rain' || type === 'ocean' || type === 'forest' || type === 'fire' || type === 'wind') {
                this.generateNatureSound(type);
                return;
            }
            
            const noiseSource = this.whiteNoiseContext.createBufferSource();
            noiseSource.buffer = noiseBuffer;
            noiseSource.loop = true;
            
            const gainNode = this.whiteNoiseContext.createGain();
            gainNode.gain.value = this.whiteNoiseVolume;
            
            noiseSource.connect(gainNode);
            gainNode.connect(this.whiteNoiseContext.destination);
            noiseSource.start(0);
            
            this.whiteNoiseNodes = [noiseSource, gainNode];
            this.currentWhiteNoiseType = type;
            
            this.nowPlaying.style.display = 'flex';
            this.playingIcon.textContent = icon;
            this.playingName.textContent = `正在播放: ${name}`;
            
        } catch (err) {
            console.error('启动白噪音失败:', err);
            alert('无法播放白噪音: ' + err.message);
        }
    }

    generateNatureSound(type) {
        try {
            const context = this.whiteNoiseContext || new (window.AudioContext || window.webkitAudioContext)();
            if (!this.whiteNoiseContext) {
                this.whiteNoiseContext = context;
            }
            
            const masterGain = context.createGain();
            masterGain.gain.value = this.whiteNoiseVolume;
            masterGain.connect(context.destination);
            
            const bufferSize = 2 * context.sampleRate;
            const noiseBuffer = context.createBuffer(1, bufferSize, context.sampleRate);
            const output = noiseBuffer.getChannelData(0);
            
            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }
            
            const noise = context.createBufferSource();
            noise.buffer = noiseBuffer;
            noise.loop = true;
            
            const filter = context.createBiquadFilter();
            
            if (type === 'rain') {
                filter.type = 'highpass';
                filter.frequency.value = 800;
            } else if (type === 'ocean') {
                filter.type = 'lowpass';
                filter.frequency.value = 400;
            } else if (type === 'forest') {
                filter.type = 'bandpass';
                filter.frequency.value = 2000;
            } else if (type === 'fire') {
                filter.type = 'lowpass';
                filter.frequency.value = 200;
            } else if (type === 'wind') {
                filter.type = 'bandpass';
                filter.frequency.value = 500;
            }
            
            noise.connect(filter);
            filter.connect(masterGain);
            noise.start(0);
            
            this.whiteNoiseNodes = [noise, filter, masterGain];
            this.currentWhiteNoiseType = type;
            
            const icons = { rain: '🌧️', ocean: '🌊', forest: '🌲', fire: '🔥', wind: '🍃' };
            const names = { rain: '雨声', ocean: '海浪', forest: '森林', fire: '篝火', wind: '微风' };
            
            this.nowPlaying.style.display = 'flex';
            this.playingIcon.textContent = icons[type];
            this.playingName.textContent = `正在播放: ${names[type]}`;
            
        } catch (err) {
            console.error('生成自然声音失败:', err);
        }
    }

    stopWhiteNoise() {
        this.whiteNoiseNodes.forEach(node => {
            if (node && node.stop) {
                try { node.stop(0); } catch (e) {}
            }
            if (node && node.disconnect) {
                try { node.disconnect(); } catch (e) {}
            }
        });
        this.whiteNoiseNodes = [];
        this.currentWhiteNoiseType = null;
        
        this.nowPlaying.style.display = 'none';
        this.whitenoiseGrid.querySelectorAll('.whitenoise-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    updateNoiseVolume(value) {
        this.whiteNoiseVolume = parseFloat(value);
        this.volumeValue.textContent = `${Math.round(value * 100)}%`;
        
        if (this.whiteNoiseNodes.length > 0) {
            this.whiteNoiseNodes.forEach(node => {
                if (node.gain) {
                    node.gain.value = this.whiteNoiseVolume;
                }
            });
        }
    }

    async loadFamilyInfo() {
        if (!this.authToken || !this.currentUser) {
            this.noFamilySection.style.display = 'block';
            this.familyContent.style.display = 'none';
            return;
        }

        try {
            const response = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            
            if (response.ok) {
                const user = await response.json();
                this.currentUser = user;
                
                if (user.familyId) {
                    this.noFamilySection.style.display = 'none';
                    this.familyContent.style.display = 'block';
                    
                    this.familyRole.textContent = user.role === 'owner' ? '家庭管理员' : '家庭成员';
                    this.familyName.textContent = '我的家庭';
                    
                    if (user.role === 'owner') {
                        this.generateInviteBtn.style.display = 'inline-block';
                    } else {
                        this.generateInviteBtn.style.display = 'none';
                    }
                    
                    this.loadFamilyMembers();
                    this.loadFamilySummary();
                } else {
                    this.noFamilySection.style.display = 'block';
                    this.familyContent.style.display = 'none';
                }
            }
        } catch (err) {
            console.error('加载家庭信息失败:', err);
        }
    }

    async createFamily() {
        if (!this.authToken) {
            this.showAuthModal('login');
            return;
        }
        
        const name = prompt('请输入家庭名称:');
        if (!name) return;
        
        try {
            const response = await fetch('/api/families', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({ name })
            });
            
            if (response.ok) {
                alert('家庭创建成功！');
                this.loadFamilyInfo();
            } else {
                const data = await response.json();
                alert('创建失败: ' + data.error);
            }
        } catch (err) {
            console.error('创建家庭失败:', err);
            alert('网络错误');
        }
    }

    async joinFamily() {
        if (!this.authToken) {
            this.showAuthModal('login');
            return;
        }
        
        const inviteCode = prompt('请输入邀请码:');
        if (!inviteCode) return;
        
        try {
            const response = await fetch('/api/families/join', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                },
                body: JSON.stringify({ inviteCode })
            });
            
            if (response.ok) {
                alert('加入家庭成功！');
                this.loadFamilyInfo();
            } else {
                const data = await response.json();
                alert('加入失败: ' + data.error);
            }
        } catch (err) {
            console.error('加入家庭失败:', err);
            alert('网络错误');
        }
    }

    async generateInviteCode() {
        if (!this.authToken) return;
        
        try {
            const response = await fetch('/api/families/invite', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                this.inviteCodeSection.style.display = 'block';
                this.inviteCode.textContent = data.inviteCode;
                this.inviteExpiry.textContent = `有效期至: ${new Date(data.expiresAt).toLocaleString()}`;
            } else {
                const data = await response.json();
                alert('生成邀请码失败: ' + data.error);
            }
        } catch (err) {
            console.error('生成邀请码失败:', err);
            alert('网络错误');
        }
    }

    copyInviteCode() {
        const code = this.inviteCode.textContent;
        navigator.clipboard.writeText(code).then(() => {
            alert('邀请码已复制到剪贴板');
        }).catch(() => {
            alert('复制失败，请手动复制');
        });
    }

    async loadFamilyMembers() {
        if (!this.authToken) return;
        
        try {
            const response = await fetch('/api/families/members', {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            
            if (response.ok) {
                const members = await response.json();
                this.renderFamilyMembers(members);
            }
        } catch (err) {
            console.error('加载家庭成员失败:', err);
        }
    }

    renderFamilyMembers(members) {
        this.familyMembersList.innerHTML = members.map(member => {
            const roleClass = member.role === 'owner' ? 'owner' : '';
            const roleText = member.role === 'owner' ? '管理员' : '成员';
            
            return `
                <div class="family-member-item">
                    <div class="member-info">
                        <span class="member-icon">👤</span>
                        <span class="member-name">${member.nickname || member.username}</span>
                    </div>
                    <span class="member-role ${roleClass}">${roleText}</span>
                </div>
            `;
        }).join('');
    }

    async loadFamilySummary() {
        if (!this.authToken) return;
        
        try {
            const response = await fetch('/api/families/summary', {
                headers: { 'Authorization': `Bearer ${this.authToken}` }
            });
            
            if (response.ok) {
                const summaries = await response.json();
                this.renderFamilySummary(summaries);
            }
        } catch (err) {
            console.error('加载家庭摘要失败:', err);
        }
    }

    renderFamilySummary(summaries) {
        if (summaries.length === 0 || summaries.every(s => !s.lastDate)) {
            this.familySummaryList.innerHTML = '<p class="empty-message">暂无睡眠数据</p>';
            return;
        }
        
        this.familySummaryList.innerHTML = summaries.map(s => {
            if (!s.lastDate) {
                return `
                    <div class="family-summary-card">
                        <div class="summary-header">
                            <div class="summary-member">
                                <span class="member-icon">👤</span>
                                <span>${s.nickname}</span>
                            </div>
                            <span class="summary-last-date">暂无记录</span>
                        </div>
                    </div>
                `;
            }
            
            return `
                <div class="family-summary-card">
                    <div class="summary-header">
                        <div class="summary-member">
                            <span class="member-icon">👤</span>
                            <span>${s.nickname}</span>
                        </div>
                        <div>
                            <span class="summary-score">${s.lastScore || '--'}分</span>
                            <span class="summary-last-date"> · ${s.lastDate}</span>
                        </div>
                    </div>
                    <div class="summary-stats">
                        <span class="summary-stat">总记录: <span>${s.totalRecords || 0}次</span></span>
                        <span class="summary-stat">平均分: <span>${s.avgScore || '--'}分</span></span>
                    </div>
                </div>
            `;
        }).join('');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new SleepRecorderApp();
});
