// Web Audio API 기반 절차적 사운드 신시사이저 및 공간 앰비언스 매니저
export class SoundManager {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isInitialized = false;

    // 게인 노드들
    this.masterGain = null;
    this.windGain = null;
    this.riverGain = null;
    this.bambooGain = null;
    this.birdsGain = null;

    // 필터 및 파라미터
    this.windFilter = null;
    this.windIntensity = 1.0;
    this.targetWindIntensity = 1.0;

    // 주기적 새소리 타이머
    this.birdTimer = null;
    this.isMeditation = false;
  }

  init() {
    if (this.isInitialized) {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    this.ctx = new AudioContext();

    // 마스터 볼륨
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
    this.masterGain.connect(this.ctx.destination);

    // 각 앰비언스 채널 생성
    this.setupWind();
    this.setupRiver();
    this.setupBambooRustle();
    this.setupBirdChirps();

    this.isInitialized = true;
  }

  // 1. 바람 소리 (핑크 노이즈 + 가변 로우패스 필터)
  setupWind() {
    const bufferSize = this.ctx.sampleRate * 4;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }

    const whiteNoiseSource = this.ctx.createBufferSource();
    whiteNoiseSource.buffer = noiseBuffer;
    whiteNoiseSource.loop = true;

    this.windFilter = this.ctx.createBiquadFilter();
    this.windFilter.type = 'bandpass';
    this.windFilter.frequency.setValueAtTime(380, this.ctx.currentTime);
    this.windFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    // 바람 세기 자동 율동 (LFO)
    const lfo = this.ctx.createOscillator();
    const lfoGain = this.ctx.createGain();
    lfo.frequency.setValueAtTime(0.18, this.ctx.currentTime);
    lfoGain.gain.setValueAtTime(120, this.ctx.currentTime);
    lfo.connect(lfoGain);
    lfoGain.connect(this.windFilter.frequency);
    lfo.start();

    this.windGain = this.ctx.createGain();
    this.windGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // 처음 시작 시 무음

    whiteNoiseSource.connect(this.windFilter);
    this.windFilter.connect(this.windGain);
    this.windGain.connect(this.masterGain);
    whiteNoiseSource.start();
  }

  // 2. 태화강 강물 흐르는 소리
  setupRiver() {
    const bufferSize = this.ctx.sampleRate * 3;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + (0.02 * white)) / 1.02;
      lastOut = output[i];
      output[i] *= 2.5;
    }

    const riverSource = this.ctx.createBufferSource();
    riverSource.buffer = noiseBuffer;
    riverSource.loop = true;

    const riverFilter = this.ctx.createBiquadFilter();
    riverFilter.type = 'lowpass';
    riverFilter.frequency.setValueAtTime(500, this.ctx.currentTime);

    this.riverGain = this.ctx.createGain();
    this.riverGain.gain.setValueAtTime(0.2, this.ctx.currentTime);

    riverSource.connect(riverFilter);
    riverFilter.connect(this.riverGain);
    this.riverGain.connect(this.masterGain);
    riverSource.start();
  }

  // 3. 대나무 잎 서걱거림 (간헐적 하이패스 마찰음)
  setupBambooRustle() {
    this.bambooGain = this.ctx.createGain();
    this.bambooGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // 처음 시작 시 무음
    this.bambooGain.connect(this.masterGain);

    const triggerRustle = () => {
      if (!this.ctx || this.isMuted || !this.isWindFocusActive) return;
      const now = this.ctx.currentTime;
      const dur = 1.2 + Math.random() * 1.5;

      // 화이트 노이즈 펄스
      const bufferSize = Math.floor(this.ctx.sampleRate * dur);
      const buf = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.15;
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;

      const hpFilter = this.ctx.createBiquadFilter();
      hpFilter.type = 'highpass';
      hpFilter.frequency.setValueAtTime(1400 + Math.random() * 600, now);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12 * this.windIntensity, now + dur * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

      noise.connect(hpFilter);
      hpFilter.connect(gain);
      gain.connect(this.bambooGain);

      noise.start(now);
      noise.stop(now + dur);

      const nextTime = (2.5 + Math.random() * 4) / this.windIntensity;
      setTimeout(triggerRustle, nextTime * 1000);
    };

    setTimeout(triggerRustle, 1500);
  }

  // 4. 새 지저귐 사운드 (Frequency Sweep Synthesizer)
  setupBirdChirps() {
    this.birdsGain = this.ctx.createGain();
    this.birdsGain.gain.setValueAtTime(0.08, this.ctx.currentTime); // 평상시에는 작고 은은하게
    this.birdsGain.connect(this.masterGain);

    const scheduleNextBird = () => {
      const delay = (2.5 + Math.random() * 5.0) * 1000;
      this.birdTimer = setTimeout(() => {
        this.playBirdChirp();
        scheduleNextBird();
      }, delay);
    };

    scheduleNextBird();
  }

  playBirdChirp() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const chirpCount = 2 + Math.floor(Math.random() * 3);
    const baseFreq = 2800 + Math.random() * 1200;

    for (let i = 0; i < chirpCount; i++) {
      const chirpStart = now + (i * 0.12);
      const chirpDur = 0.08 + Math.random() * 0.04;

      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // 새소리 고유의 주파수 스윕 (Chirp curve)
      osc.frequency.setValueAtTime(baseFreq + (Math.random() * 400 - 200), chirpStart);
      osc.frequency.exponentialRampToValueAtTime(baseFreq + 900 + Math.random() * 500, chirpStart + chirpDur * 0.5);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.85, chirpStart + chirpDur);

      gain.gain.setValueAtTime(0.001, chirpStart);
      gain.gain.linearRampToValueAtTime(0.2, chirpStart + chirpDur * 0.3);
      gain.gain.exponentialRampToValueAtTime(0.001, chirpStart + chirpDur);

      osc.connect(gain);
      gain.connect(this.birdsGain);

      osc.start(chirpStart);
      osc.stop(chirpStart + chirpDur);
    }
  }

  // 힐링 인터랙션: 바람 세기 조절 (1.0 -> 2.5)
  setWindFocus(active) {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    this.isWindFocusActive = active;
    this.windIntensity = active ? 2.6 : 1.0;

    // 자리에 앉아 바람소리를 선택했을 때만 서서히 페이드인 (끄면 즉시 페이드아웃 무음)
    this.windGain.gain.setTargetAtTime(active ? 0.65 : 0.0, now, 1.0);
    this.windFilter.frequency.setTargetAtTime(active ? 520 : 380, now, 1.2);
    this.bambooGain.gain.setTargetAtTime(active ? 0.35 : 0.0, now, 1.0);
  }

  // 힐링 인터랙션: 눈감기 (명상 모드)
  setMeditationMode(active) {
    if (!this.ctx) return;
    this.isMeditation = active;
    const now = this.ctx.currentTime;
    if (active) {
      // 눈감고 감상 시: 새소리를 지금 크기(0.35)만큼 풍성하고 맑게 증폭
      this.birdsGain.gain.setTargetAtTime(0.35, now, 1.2);
      this.riverGain.gain.setTargetAtTime(0.25, now, 1.2);
      if (this.isWindFocusActive) {
        this.windGain.gain.setTargetAtTime(0.65, now, 1.2);
      }
    } else {
      // 눈을 뜨면: 새소리는 다시 원래의 작은 볼륨(0.08)으로 복귀
      this.birdsGain.gain.setTargetAtTime(0.08, now, 1.0);
      this.riverGain.gain.setTargetAtTime(0.2, now, 1.0);
      if (!this.isWindFocusActive) {
        this.windGain.gain.setTargetAtTime(0.0, now, 1.0);
      }
    }
  }

  // 음소거 토글
  toggleMute() {
    if (!this.ctx) return false;
    this.isMuted = !this.isMuted;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, now, 0.2);
    return this.isMuted;
  }
}
