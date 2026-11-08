// ============================================================================
// 태화강 십리대숲 3D 힐링 가상 산책 공간 - 통합 독립 실행 스크립트 (app.js)
// 파일 프로토콜(file://) 및 웹 서버, GitHub Pages 모두에서 100% 즉시 실행 지원
// ============================================================================

(function () {
  'use strict';

  // ==========================================
  // 1. 사운드 매니저 (Web Audio API)
  // ==========================================
  class SoundManager {
    constructor() {
      this.ctx = null;
      this.isMuted = false;
      this.isInitialized = false;

      this.masterGain = null;
      this.windGain = null;
      this.riverGain = null;
      this.bambooGain = null;
      this.birdsGain = null;

      this.windFilter = null;
      this.windIntensity = 1.0;
      this.birdTimer = null;
    }

    init() {
      if (this.isInitialized) {
        if (this.ctx && this.ctx.state === 'suspended') {
          this.ctx.resume();
        }
        return;
      }

      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      this.ctx = new AudioContext();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupWind();
      this.setupRiver();
      this.setupBambooRustle();
      this.setupBirdChirps();

      this.isInitialized = true;
    }

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

    setupBambooRustle() {
      this.bambooGain = this.ctx.createGain();
      this.bambooGain.gain.setValueAtTime(0.0, this.ctx.currentTime); // 처음 시작 시 무음
      this.bambooGain.connect(this.masterGain);

      const triggerRustle = () => {
        if (!this.ctx || this.isMuted || !this.isWindFocusActive) return;
        const now = this.ctx.currentTime;
        const dur = 1.2 + Math.random() * 1.5;

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

    setupBirdChirps() {
      this.birdsGain = this.ctx.createGain();
      this.birdsGain.gain.setValueAtTime(0.08, this.ctx.currentTime); // 평상시에는 새소리를 작고 은은하게 설정
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

    setMeditationMode(active) {
      if (!this.ctx) return;
      const now = this.ctx.currentTime;
      if (active) {
        // 눈감고 감상 시: 새소리를 지금 크기(0.35)만큼 맑고 풍성하게 증폭
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

    toggleMute() {
      if (!this.ctx) return false;
      this.isMuted = !this.isMuted;
      const now = this.ctx.currentTime;
      this.masterGain.gain.setTargetAtTime(this.isMuted ? 0 : 0.7, now, 0.2);
      return this.isMuted;
    }
  }

  // ==========================================
  // 2. 지형 및 산책로 (Terrain)
  // ==========================================
  class Terrain {
    constructor(scene) {
      this.scene = scene;
      this.width = 160;
      this.depth = 160;
      this.mesh = null;

      this.mainPath = null;
      this.innerPath = null;
      this.connectorPath = null;

      this.init();
    }

    initPaths() {
      this.mainPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-9, 0, -65),
        new THREE.Vector3(-6, 0, -35),
        new THREE.Vector3(-3, 0, -10),
        new THREE.Vector3(1, 0, 15),
        new THREE.Vector3(-4, 0, 40),
        new THREE.Vector3(-7, 0, 65)
      ]);

      this.innerPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-4, 0, -35),
        new THREE.Vector3(12, 0, -20),
        new THREE.Vector3(22, 0, 0),
        new THREE.Vector3(14, 0, 25),
        new THREE.Vector3(-4, 0, 40)
      ]);

      this.connectorPath = new THREE.CatmullRomCurve3([
        new THREE.Vector3(22, 0, 0),
        new THREE.Vector3(8, 0, 2),
        new THREE.Vector3(-3, 0, 3),
        new THREE.Vector3(-12.5, 0, 3)
      ]);
    }

    getDistanceToNearestPath(x, z) {
      let minDist = 999;
      const paths = [this.mainPath, this.innerPath, this.connectorPath];

      for (const path of paths) {
        if (!path) continue;
        for (let t = 0; t <= 1; t += 0.04) {
          const pt = path.getPoint(t);
          const dx = x - pt.x;
          const dz = z - pt.z;
          const d = Math.sqrt(dx * dx + dz * dz);
          if (d < minDist) minDist = d;
        }
      }
      return minDist;
    }

    getHeight(x, z) {
      if (x < -20) {
        return -1.5 + Math.sin(z * 0.05) * 0.2;
      } else if (x < -13) {
        const t = (x - (-20)) / 7;
        return -1.5 + t * 2.0;
      } else if (x <= -10) {
        return 0.5;
      }

      const hill1 = Math.sin(x * 0.07) * Math.cos(z * 0.05) * 0.8;
      const hill2 = Math.sin(x * 0.03 + 1.2) * Math.sin(z * 0.04) * 0.5;
      let h = 0.5 + hill1 + hill2;

      const distToPath = this.getDistanceToNearestPath(x, z);
      if (distToPath < 3.0) {
        h = h * 0.5 + 0.35;
      }

      return Math.max(0.1, h);
    }

    init() {
      this.initPaths();

      const segments = 120;
      const geometry = new THREE.PlaneGeometry(this.width, this.depth, segments, segments);
      geometry.rotateX(-Math.PI / 2);

      const pos = geometry.attributes.position;
      const colors = [];
      const colorGrass = new THREE.Color(0x274d2b); // 짙고 아늑한 숲속 잔디
      const colorPath = new THREE.Color(0xa18762);  // 차분한 황토 흙길
      const colorBank = new THREE.Color(0x4a543b);

      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i);
        const z = pos.getZ(i);
        const y = this.getHeight(x, z);
        pos.setY(i, y);

        const dist = this.getDistanceToNearestPath(x, z);
        const tempColor = new THREE.Color();

        if (x < -12.5) {
          tempColor.copy(colorBank).offsetHSL(0, 0, (Math.random() - 0.5) * 0.05);
        } else if (dist < 2.6) {
          const factor = Math.min(1.0, dist / 2.6);
          tempColor.copy(colorPath).lerp(colorGrass, factor * 0.8);
        } else {
          const noise = (Math.sin(x * 0.5) + Math.cos(z * 0.5)) * 0.04;
          tempColor.copy(colorGrass).offsetHSL(noise, 0.05, noise);
        }
        colors.push(tempColor.r, tempColor.g, tempColor.b);
      }

      geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
      geometry.computeVertexNormals();

      const material = new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.9,
        metalness: 0.05
      });

      this.mesh = new THREE.Mesh(geometry, material);
      this.mesh.receiveShadow = true;
      this.scene.add(this.mesh);
    }
  }

  // ==========================================
  // 3. 태화강 수면 및 점프하는 물고기 (River)
  // ==========================================
  class River {
    constructor(scene) {
      this.scene = scene;
      this.mesh = null;
      this.waterMaterial = null;

      this.fishes = [];
      this.ripples = [];

      this.init();
      this.initFishSystem();
    }

    init() {
      const riverWidth = 75;
      const riverLength = 170;
      const geometry = new THREE.PlaneGeometry(riverWidth, riverLength, 64, 64);
      geometry.rotateX(-Math.PI / 2);

      this.waterMaterial = new THREE.ShaderMaterial({
        uniforms: {
          uTime: { value: 0 },
          uWaterColor: { value: new THREE.Color(0x64dfdf) },
          uDeepColor: { value: new THREE.Color(0x28929e) },
          uSunColor: { value: new THREE.Color(0xfff8e7) },
          uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() }
        },
        vertexShader: `
          uniform float uTime;
          varying vec3 vWorldPosition;
          varying vec3 vNormal;
          varying vec2 vUv;

          void main() {
            vUv = uv;
            vec3 pos = position;
            float wave1 = sin(pos.x * 0.45 + uTime * 1.9) * 0.11;
            float wave2 = cos(pos.z * 0.35 + uTime * 1.5) * 0.13;
            float wave3 = sin((pos.x + pos.z) * 0.65 + uTime * 2.3) * 0.07;
            pos.y += wave1 + wave2 + wave3;
            
            vec4 worldPos = modelMatrix * vec4(pos, 1.0);
            vWorldPosition = worldPos.xyz;
            
            vec3 n = normal;
            n.x += cos(pos.x * 0.45 + uTime * 1.9) * 0.05;
            n.z += -sin(pos.z * 0.35 + uTime * 1.5) * 0.05;
            vNormal = normalize(normalMatrix * n);
            
            gl_Position = projectionMatrix * viewMatrix * worldPos;
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uWaterColor;
          uniform vec3 uDeepColor;
          uniform vec3 uSunColor;
          uniform vec3 uSunDirection;
          varying vec3 vWorldPosition;
          varying vec3 vNormal;
          varying vec2 vUv;

          void main() {
            vec3 viewDir = normalize(cameraPosition - vWorldPosition);
            float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.8);
            vec3 reflectDir = reflect(-uSunDirection, vNormal);
            float spec = pow(max(dot(viewDir, reflectDir), 0.0), 36.0);
            float shimmer = sin(vUv.x * 80.0 + uTime * 3.0) * sin(vUv.y * 80.0 + uTime * 2.5) * 0.06;
            vec3 waterCol = mix(uDeepColor, uWaterColor, fresnel * 0.75 + 0.25) + shimmer;
            vec3 finalColor = waterCol + uSunColor * spec * 1.1;
            gl_FragColor = vec4(finalColor, 0.82);
          }
        `,
        transparent: true,
        side: THREE.DoubleSide
      });

      this.mesh = new THREE.Mesh(geometry, this.waterMaterial);
      this.mesh.position.set(-52, -0.2, 0);
      this.scene.add(this.mesh);
    }

    createFishMesh() {
      const group = new THREE.Group();
      const fishMat = new THREE.MeshStandardMaterial({ color: 0xc4e0e5, metalness: 0.85, roughness: 0.2 });
      const finMat = new THREE.MeshStandardMaterial({ color: 0x88c0d0, metalness: 0.5, roughness: 0.3, side: THREE.DoubleSide });

      const bodyGeo = new THREE.ConeGeometry(0.12, 0.55, 8);
      bodyGeo.rotateZ(Math.PI / 2);
      bodyGeo.scale(1.0, 0.6, 1.0);
      const body = new THREE.Mesh(bodyGeo, fishMat);
      group.add(body);

      const tailGeo = new THREE.BufferGeometry();
      const tailVerts = new Float32Array([0, 0, 0, -0.2, 0.14, 0, -0.2, -0.14, 0]);
      tailGeo.setAttribute('position', new THREE.BufferAttribute(tailVerts, 3));
      const tail = new THREE.Mesh(tailGeo, finMat);
      tail.position.x = -0.25;
      group.add(tail);

      group.scale.set(0.8, 0.8, 0.8);
      return { group, tail };
    }

    initFishSystem() {
      for (let i = 0; i < 2; i++) {
        const fishObj = this.createFishMesh();
        const fish = {
          mesh: fishObj.group,
          tail: fishObj.tail,
          isJumping: false,
          timer: 1.5 + i * 3.5,
          progress: 0,
          startX: 0, startZ: 0,
          endX: 0, endZ: 0,
          jumpHeight: 1.2
        };
        fish.mesh.visible = false;
        this.fishes.push(fish);
        this.scene.add(fish.mesh);
      }

      const ringGeo = new THREE.RingGeometry(0.08, 0.16, 24);
      ringGeo.rotateX(-Math.PI / 2);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.8, side: THREE.DoubleSide });

      for (let i = 0; i < 6; i++) {
        const ring = new THREE.Mesh(ringGeo, ringMat.clone());
        ring.visible = false;
        this.ripples.push({ mesh: ring, active: false, scale: 0.1, opacity: 0.8 });
        this.scene.add(ring);
      }
    }

    triggerRipple(x, z) {
      const ripple = this.ripples.find(r => !r.active);
      if (ripple) {
        ripple.active = true;
        ripple.mesh.position.set(x, -0.16, z);
        ripple.scale = 0.2;
        ripple.opacity = 0.8;
        ripple.mesh.scale.set(ripple.scale, 1, ripple.scale);
        ripple.mesh.material.opacity = ripple.opacity;
        ripple.mesh.visible = true;
      }
    }

    startFishJump(fish) {
      fish.isJumping = true;
      fish.progress = 0;
      fish.jumpHeight = 1.0 + Math.random() * 0.6;
      fish.startX = -18 - Math.random() * 14;
      fish.startZ = (Math.random() - 0.5) * 80;

      const angle = Math.random() * Math.PI * 2;
      const jumpDist = 1.6 + Math.random() * 1.0;
      fish.endX = fish.startX + Math.cos(angle) * jumpDist;
      fish.endZ = fish.startZ + Math.sin(angle) * jumpDist;

      fish.mesh.position.set(fish.startX, -0.2, fish.startZ);
      fish.mesh.visible = true;
      this.triggerRipple(fish.startX, fish.startZ);
    }

    update(delta) {
      if (this.waterMaterial) {
        this.waterMaterial.uniforms.uTime.value += delta;
      }

      for (const fish of this.fishes) {
        if (!fish.isJumping) {
          fish.timer -= delta;
          if (fish.timer <= 0) this.startFishJump(fish);
        } else {
          fish.progress += delta * 1.25;
          if (fish.progress >= 1.0) {
            fish.isJumping = false;
            fish.mesh.visible = false;
            fish.timer = 4.0 + Math.random() * 5.0;
            this.triggerRipple(fish.endX, fish.endZ);
          } else {
            const t = fish.progress;
            const curX = fish.startX + (fish.endX - fish.startX) * t;
            const curZ = fish.startZ + (fish.endZ - fish.startZ) * t;
            const curY = -0.2 + Math.sin(t * Math.PI) * fish.jumpHeight;
            fish.mesh.position.set(curX, curY, curZ);

            const dirX = fish.endX - fish.startX;
            const dirZ = fish.endZ - fish.startZ;
            const velY = Math.cos(t * Math.PI) * fish.jumpHeight * 2.5;

            fish.mesh.rotation.y = Math.atan2(dirZ, dirX);
            fish.mesh.rotation.z = Math.atan2(velY, Math.sqrt(dirX * dirX + dirZ * dirZ));
            if (fish.tail) fish.tail.rotation.z = Math.sin(t * 30) * 0.4;
          }
        }
      }

      for (const r of this.ripples) {
        if (r.active) {
          r.scale += delta * 2.2;
          r.opacity -= delta * 0.9;
          if (r.opacity <= 0) {
            r.active = false;
            r.mesh.visible = false;
          } else {
            r.mesh.scale.set(r.scale, 1, r.scale);
            r.mesh.material.opacity = r.opacity;
          }
        }
      }
    }
  }

  // ==========================================
  // 4. 태화강변 보행 인도 (Promenade)
  // ==========================================
  class Promenade {
    constructor(scene, terrain) {
      this.scene = scene;
      this.terrain = terrain;

      this.group = new THREE.Group();
      this.centerX = -11.5;
      this.width = 2.6;
      this.length = 150;
      this.deckHeight = 0.52;
      this.railingBoundaryX = -12.2;

      this.init();
    }

    init() {
      const deckGeo = new THREE.PlaneGeometry(this.width, this.length, 1, 80);
      deckGeo.rotateX(-Math.PI / 2);

      const deckMat = new THREE.MeshStandardMaterial({ color: 0xd2c0a5, roughness: 0.85, metalness: 0.05 });
      const deckMesh = new THREE.Mesh(deckGeo, deckMat);
      deckMesh.position.set(this.centerX, this.deckHeight, 0);
      deckMesh.receiveShadow = true;
      this.group.add(deckMesh);

      const borderMat = new THREE.MeshStandardMaterial({ color: 0x7a7873, roughness: 0.9 });
      const leftBorderGeo = new THREE.BoxGeometry(0.18, 0.12, this.length);
      const leftBorder = new THREE.Mesh(leftBorderGeo, borderMat);
      leftBorder.position.set(this.centerX - this.width / 2 + 0.09, this.deckHeight + 0.04, 0);
      this.group.add(leftBorder);

      const rightBorder = new THREE.Mesh(leftBorderGeo, borderMat);
      rightBorder.position.set(this.centerX + this.width / 2 - 0.09, this.deckHeight + 0.04, 0);
      this.group.add(rightBorder);

      const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.05, 8);
      const railMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.7 });
      const postSpacing = 3.0;
      const postCount = Math.floor(this.length / postSpacing);
      const railingX = this.centerX - this.width / 2 + 0.1;

      const postMesh = new THREE.InstancedMesh(postGeo, railMat, postCount);
      postMesh.castShadow = true;
      const dummy = new THREE.Object3D();

      for (let i = 0; i < postCount; i++) {
        const z = -this.length / 2 + i * postSpacing + 1.5;
        dummy.position.set(railingX, this.deckHeight + 0.5, z);
        dummy.updateMatrix();
        postMesh.setMatrixAt(i, dummy.matrix);
      }
      postMesh.instanceMatrix.needsUpdate = true;
      this.group.add(postMesh);

      const topBarGeo = new THREE.BoxGeometry(0.08, 0.08, this.length);
      const topBar = new THREE.Mesh(topBarGeo, railMat);
      topBar.position.set(railingX, this.deckHeight + 0.95, 0);
      topBar.castShadow = true;
      this.group.add(topBar);

      const midBarGeo = new THREE.BoxGeometry(0.06, 0.06, this.length);
      const midBar = new THREE.Mesh(midBarGeo, railMat);
      midBar.position.set(railingX, this.deckHeight + 0.55, 0);
      midBar.castShadow = true;
      this.group.add(midBar);

      const lanternMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 });
      const glassMat = new THREE.MeshBasicMaterial({ color: 0xfff0c4 });

      for (let z = -60; z <= 60; z += 30) {
        const lampGroup = new THREE.Group();
        const poleGeo = new THREE.CylinderGeometry(0.05, 0.08, 3.2, 8);
        const pole = new THREE.Mesh(poleGeo, lanternMat);
        pole.position.y = 1.6;
        lampGroup.add(pole);

        const lampHeadGeo = new THREE.BoxGeometry(0.35, 0.45, 0.35);
        const lampHead = new THREE.Mesh(lampHeadGeo, glassMat);
        lampHead.position.set(0, 3.2, 0);
        lampGroup.add(lampHead);

        lampGroup.position.set(railingX + 0.15, this.deckHeight, z);
        this.group.add(lampGroup);
      }

      this.scene.add(this.group);
    }
  }

  // ==========================================
  // 5. 대나무 숲 군락 (BambooForest)
  // ==========================================
  class BambooForest {
    constructor(scene, terrain) {
      this.scene = scene;
      this.terrain = terrain;

      this.colliders = [];
      this.stalkRadius = 0.07;
      this.minDistance = 1.25; // 훨씬 촘촘하고 빽빽한 대나무 숲 군락

      this.stalkMesh = null;
      this.foliageMesh = null;

      this.windTime = 0;
      this.windForce = 1.0;
      this.targetWindForce = 1.0;

      this.init();
    }

    init() {
      const height = 15;
      const stalkGeo = new THREE.CylinderGeometry(this.stalkRadius * 0.85, this.stalkRadius, height, 8, 14);
      stalkGeo.translate(0, height / 2, 0);

      // 본연의 싱그럽고 생기 있는 대나무 비취/올리브 그린 색상 (매끄러운 왁스 윤택)
      const stalkMat = new THREE.MeshStandardMaterial({
        color: 0x4f9d50,
        roughness: 0.38,
        metalness: 0.04
      });
      this.injectWindShader(stalkMat, height, true);

      const foliageGeo = new THREE.ConeGeometry(1.6, 5.2, 6, 4);
      foliageGeo.translate(0, height - 0.8, 0);

      // 햇살을 머금어 투명하고 산뜻한 대나무 잎사귀 그린
      const foliageMat = new THREE.MeshStandardMaterial({
        color: 0x6dbf4b,
        roughness: 0.55,
        side: THREE.DoubleSide
      });
      this.injectWindShader(foliageMat, height, false);

      const positions = this.generateBambooPositions();
      const count = positions.length;

      this.stalkMesh = new THREE.InstancedMesh(stalkGeo, stalkMat, count);
      this.foliageMesh = new THREE.InstancedMesh(foliageGeo, foliageMat, count);

      this.stalkMesh.castShadow = true;
      this.stalkMesh.receiveShadow = true;
      this.foliageMesh.castShadow = true;

      const dummy = new THREE.Object3D();

      for (let i = 0; i < count; i++) {
        const p = positions[i];
        const y = this.terrain.getHeight(p.x, p.z);

        dummy.position.set(p.x, y - 0.2, p.z);
        const scaleY = 0.85 + Math.random() * 0.35;
        const scaleXZ = 0.85 + Math.random() * 0.3;
        dummy.scale.set(scaleXZ, scaleY, scaleXZ);
        dummy.rotation.y = Math.random() * Math.PI * 2;
        dummy.rotation.z = (Math.random() - 0.5) * 0.07;
        dummy.rotation.x = (Math.random() - 0.5) * 0.07;
        dummy.updateMatrix();

        this.stalkMesh.setMatrixAt(i, dummy.matrix);
        this.foliageMesh.setMatrixAt(i, dummy.matrix);

        this.colliders.push({ x: p.x, z: p.z, radius: this.stalkRadius });
      }

      this.stalkMesh.instanceMatrix.needsUpdate = true;
      this.foliageMesh.instanceMatrix.needsUpdate = true;

      this.scene.add(this.stalkMesh);
      this.scene.add(this.foliageMesh);
    }

    generateBambooPositions() {
      const validPositions = [];
      const cellSize = this.minDistance;
      const grid = new Map();
      const getCellKey = (gx, gz) => `${gx},${gz}`;

      const minX = -9, maxX = 65, minZ = -72, maxZ = 72;
      const maxAttempts = 35000;

      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        const x = minX + Math.random() * (maxX - minX);
        const z = minZ + Math.random() * (maxZ - minZ);

        if (x < -9.5) continue;
        const distToPath = this.terrain.getDistanceToNearestPath(x, z);
        if (distToPath < 2.0) continue;
        const distToBench = Math.sqrt((x - (-10.0)) ** 2 + (z - 3.0) ** 2);
        if (distToBench < 3.8) continue;

        const gx = Math.floor(x / cellSize);
        const gz = Math.floor(z / cellSize);
        let isTooClose = false;

        for (let dx = -1; dx <= 1 && !isTooClose; dx++) {
          for (let dz = -1; dz <= 1 && !isTooClose; dz++) {
            const cell = grid.get(getCellKey(gx + dx, gz + dz));
            if (cell) {
              for (const neighbor of cell) {
                const ndx = x - neighbor.x;
                const ndz = z - neighbor.z;
                if (ndx * ndx + ndz * ndz < this.minDistance * this.minDistance) {
                  isTooClose = true;
                  break;
                }
              }
            }
          }
        }

        if (!isTooClose) {
          const pos = { x, z };
          validPositions.push(pos);
          const key = getCellKey(gx, gz);
          if (!grid.has(key)) grid.set(key, []);
          grid.get(key).push(pos);
        }
      }
      return validPositions;
    }

    getColliders() {
      return this.colliders;
    }

    injectWindShader(material, totalHeight, isStalk) {
      material.userData.shader = null;
      material.onBeforeCompile = (shader) => {
        material.userData.shader = shader;
        shader.uniforms.uWindTime = { value: 0 };
        shader.uniforms.uWindForce = { value: 1.0 };

        shader.vertexShader = `
          uniform float uWindTime;
          uniform float uWindForce;
          varying float vLocalY;
        ` + shader.vertexShader;

        shader.vertexShader = shader.vertexShader.replace(
          '#include <begin_vertex>',
          `
          #include <begin_vertex>
          vLocalY = position.y;
          float heightFactor = clamp(transformed.y / ${totalHeight.toFixed(1)}, 0.0, 1.2);
          float sway = sin(uWindTime * 2.2 + position.x * 0.15 + position.z * 0.15) * 0.45 * uWindForce;
          float swayZ = cos(uWindTime * 1.8 + position.z * 0.2) * 0.35 * uWindForce;
          transformed.x += sway * pow(heightFactor, 2.0);
          transformed.z += swayZ * pow(heightFactor, 2.0);
          `
        );

        if (isStalk) {
          shader.fragmentShader = `
            varying float vLocalY;
          ` + shader.fragmentShader;

          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <dithering_fragment>',
            `
            #include <dithering_fragment>
            // 대나무 마디 링 표현 (약 1.3m 간격)
            float nodeMod = mod(vLocalY, 1.35);
            if (nodeMod < 0.06) {
              gl_FragColor.rgb *= 1.28; // 밝은 연두빛 마디 고리
            } else if (nodeMod < 0.1) {
              gl_FragColor.rgb *= 0.82; // 마디 홈 어두운 테두리
            }
            `
          );
        }
      };
    }

    setWindFocus(active) {
      this.targetWindForce = active ? 2.5 : 1.0;
    }

    update(delta) {
      this.windTime += delta;
      this.windForce += (this.targetWindForce - this.windForce) * 0.05;

      if (this.stalkMesh && this.stalkMesh.material.userData.shader) {
        this.stalkMesh.material.userData.shader.uniforms.uWindTime.value = this.windTime;
        this.stalkMesh.material.userData.shader.uniforms.uWindForce.value = this.windForce;
      }
      if (this.foliageMesh && this.foliageMesh.material.userData.shader) {
        this.foliageMesh.material.userData.shader.uniforms.uWindTime.value = this.windTime;
        this.foliageMesh.material.userData.shader.uniforms.uWindForce.value = this.windForce;
      }
    }
  }

  // ==========================================
  // 6. 밝고 화사한 쉼터 벤치 (Bench)
  // ==========================================
  class Bench {
    constructor(scene, terrain) {
      this.scene = scene;
      this.terrain = terrain;

      this.position = new THREE.Vector3(-10.0, 0, 3.0);
      this.rotationY = Math.PI * 0.5;

      this.group = new THREE.Group();
      this.interactionRadius = 2.8;

      this.init();
    }

    init() {
      const y = this.terrain.getHeight(this.position.x, this.position.z);
      this.position.y = y;
      this.group.position.copy(this.position);
      this.group.rotation.y = this.rotationY;

      const woodMat = new THREE.MeshStandardMaterial({ color: 0xdfad71, roughness: 0.65, metalness: 0.05 });
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x3d403a, roughness: 0.4, metalness: 0.7 });

      for (let i = 0; i < 4; i++) {
        const slatGeo = new THREE.BoxGeometry(2.3, 0.09, 0.15);
        const slat = new THREE.Mesh(slatGeo, woodMat);
        slat.position.set(0, 0.52, -0.22 + i * 0.16);
        slat.castShadow = true;
        this.group.add(slat);
      }

      for (let i = 0; i < 3; i++) {
        const backGeo = new THREE.BoxGeometry(2.3, 0.13, 0.07);
        const backSlat = new THREE.Mesh(backGeo, woodMat);
        backSlat.position.set(0, 0.78 + i * 0.16, -0.32);
        backSlat.rotation.x = -0.15;
        backSlat.castShadow = true;
        this.group.add(backSlat);
      }

      const legGeo = new THREE.BoxGeometry(0.08, 0.52, 0.6);
      const leftLeg = new THREE.Mesh(legGeo, ironMat);
      leftLeg.position.set(-0.95, 0.26, 0);
      this.group.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, ironMat);
      rightLeg.position.set(0.95, 0.26, 0);
      this.group.add(rightLeg);

      const baseGeo = new THREE.BoxGeometry(3.6, 0.1, 2.6);
      const deckMat = new THREE.MeshStandardMaterial({ color: 0xf3e5ab, roughness: 0.7, metalness: 0.05 });
      const base = new THREE.Mesh(baseGeo, deckMat);
      base.position.set(0, 0.05, 0.2);
      base.receiveShadow = true;
      this.group.add(base);

      const lampMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.8, roughness: 0.3 });
      const shadeMat = new THREE.MeshBasicMaterial({ color: 0xfff4d6 });
      const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.2, 8), lampMat);
      lampPole.position.set(1.4, 1.1, -0.4);
      this.group.add(lampPole);

      const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.2, 8), shadeMat);
      lampShade.position.set(1.4, 2.15, -0.4);
      this.group.add(lampShade);

      const spotLight = new THREE.PointLight(0xffecd1, 2.2, 8.0, 1.2);
      spotLight.position.set(1.4, 2.2, -0.4);
      this.group.add(spotLight);

      const potMat = new THREE.MeshStandardMaterial({ color: 0x9e7b66, roughness: 0.8 });
      const leafMat = new THREE.MeshStandardMaterial({ color: 0x40916c, roughness: 0.7 });
      const flowerMat = new THREE.MeshStandardMaterial({ color: 0xff99c8, roughness: 0.5 });
      const planter = new THREE.Group();
      const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.35, 10), potMat);
      pot.position.y = 0.18;
      planter.add(pot);
      const bush = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), leafMat);
      bush.position.y = 0.42;
      planter.add(bush);

      for (let f = 0; f < 5; f++) {
        const fl = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 6), flowerMat);
        const ang = (f / 5) * Math.PI * 2;
        fl.position.set(Math.cos(ang) * 0.18, 0.48 + (f % 2) * 0.05, Math.sin(ang) * 0.18);
        planter.add(fl);
      }
      planter.position.set(-1.4, 0.1, -0.2);
      this.group.add(planter);

      this.scene.add(this.group);
    }

    isNear(playerPosition) {
      return this.position.distanceTo(playerPosition) <= this.interactionRadius;
    }

    getSitTransform() {
      const sitPos = this.position.clone();
      const forwardOffset = new THREE.Vector3(0, 0.42, 0.04);
      forwardOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
      sitPos.add(forwardOffset);

      return {
        position: sitPos,
        rotationY: this.rotationY
      };
    }
  }

  // ==========================================
  // 7. 대기 조명 및 파티클 (Atmosphere)
  // ==========================================
  class Atmosphere {
    constructor(scene) {
      this.scene = scene;
      this.particles = null;
      this.particleCount = 400;
      this.init();
    }

    init() {
      // 차분한 딥 그린 감성을 유지하면서 살짝 더 맑고 화사하게 밝힌 조도
      const fogColor = new THREE.Color(0xa2bea9);
      this.scene.background = fogColor;
      
      // 안개 시작 거리를 48m로 넉넉히 밀어 캐릭터 주변을 한결 깨끗하고 시원하게
      this.scene.fog = new THREE.Fog(fogColor, 48, 115);

      // 앰비언트 라이트를 부드럽게 올려(0.78) 그늘의 어두움을 자연스럽게 보정
      const hemiLight = new THREE.HemisphereLight(0xa5cca9, 0x2b4a2e, 0.78);
      this.scene.add(hemiLight);

      // 따스한 햇살 밝기(1.18)로 기분 좋은 자연광 채광
      const sunLight = new THREE.DirectionalLight(0xfff3db, 1.18);
      sunLight.position.set(45, 60, 30);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.width = 2048;
      sunLight.shadow.mapSize.height = 2048;
      const d = 40;
      sunLight.shadow.camera.left = -d;
      sunLight.shadow.camera.right = d;
      sunLight.shadow.camera.top = d;
      sunLight.shadow.camera.bottom = -d;
      sunLight.shadow.bias = -0.0005;
      this.scene.add(sunLight);

      const particleGeo = new THREE.BufferGeometry();
      const positions = new Float32Array(this.particleCount * 3);
      for (let i = 0; i < this.particleCount; i++) {
        positions[i * 3 + 0] = (Math.random() - 0.5) * 80;
        positions[i * 3 + 1] = Math.random() * 12 + 0.5;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      }
      particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const particleMat = new THREE.PointsMaterial({
        color: 0xfff9be,
        size: 0.22,
        transparent: true,
        opacity: 0.65,
        blending: THREE.AdditiveBlending
      });

      this.particles = new THREE.Points(particleGeo, particleMat);
      this.scene.add(this.particles);
    }

    update(delta) {
      if (!this.particles) return;
      const pos = this.particles.geometry.attributes.position.array;
      const time = Date.now() * 0.001;

      for (let i = 0; i < this.particleCount; i++) {
        const idx = i * 3;
        pos[idx + 0] += Math.sin(time + i) * 0.015;
        pos[idx + 1] += Math.cos(time * 0.8 + i) * 0.01;
        pos[idx + 2] += Math.sin(time * 0.6 + i) * 0.012;
        if (pos[idx + 1] > 14) pos[idx + 1] = 0.5;
        if (pos[idx + 1] < 0.2) pos[idx + 1] = 13.5;
      }
      this.particles.geometry.attributes.position.needsUpdate = true;
    }
  }

  // ==========================================
  // 8. 3등신 주인공 캐릭터 (Avatar)
  // ==========================================
  class Avatar {
    constructor(scene, terrain) {
      this.scene = scene;
      this.terrain = terrain;

      this.group = new THREE.Group();
      this.state = 'idle';

      this.position = new THREE.Vector3(-6, 0, -35);
      this.rotationY = 0;
      this.targetRotationY = 0;
      this.speed = 4.2;
      this.isSitting = false;

      this.radius = 0.35;
      this.obstacles = [];
      this.railingBoundaryX = -11.85;

      this.animTime = 0;

      this.head = null;
      this.body = null;
      this.leftArm = null;
      this.rightArm = null;
      this.leftLeg = null;
      this.rightLeg = null;
      this.leftShin = null;
      this.rightShin = null;

      this.init();
    }

    setObstacles(obstacles) {
      this.obstacles = obstacles;
    }

    setRailingBoundary(boundaryX) {
      this.railingBoundaryX = boundaryX + this.radius;
    }

    init() {
      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.6 });
      const clothesMat = new THREE.MeshStandardMaterial({ color: 0x4a7c59, roughness: 0.8 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: 0x3d5a58, roughness: 0.8 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0x5c4033, roughness: 0.5 });
      const hatMat = new THREE.MeshStandardMaterial({ color: 0xd9b375, roughness: 0.9 });
      const ribbonMat = new THREE.MeshStandardMaterial({ color: 0xb5523f, roughness: 0.6 });

      const bodyGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.45, 12);
      this.body = new THREE.Mesh(bodyGeo, clothesMat);
      this.body.position.y = 0.62;
      this.body.castShadow = true;
      this.group.add(this.body);

      const packGeo = new THREE.BoxGeometry(0.26, 0.3, 0.16);
      const backpack = new THREE.Mesh(packGeo, new THREE.MeshStandardMaterial({ color: 0x966844, roughness: 0.7 }));
      backpack.position.set(0, 0.05, -0.2);
      backpack.castShadow = true;
      this.body.add(backpack);

      const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
      this.head = new THREE.Mesh(headGeo, skinMat);
      this.head.position.y = 1.08;
      this.head.castShadow = true;
      this.group.add(this.head);

      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
      const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(0.1, 0.04, 0.26);
      this.head.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(-0.1, 0.04, 0.26);
      this.head.add(rightEye);

      const blushMat = new THREE.MeshBasicMaterial({ color: 0xff9999, transparent: true, opacity: 0.6 });
      const blushGeo = new THREE.CircleGeometry(0.045, 8);
      const leftBlush = new THREE.Mesh(blushGeo, blushMat);
      leftBlush.position.set(0.16, -0.04, 0.26);
      leftBlush.rotation.y = 0.2;
      this.head.add(leftBlush);

      const rightBlush = new THREE.Mesh(blushGeo, blushMat);
      rightBlush.position.set(-0.16, -0.04, 0.26);
      rightBlush.rotation.y = -0.2;
      this.head.add(rightBlush);

      const hatBrim = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.48, 0.03, 16), hatMat);
      hatBrim.position.y = 0.18;
      this.head.add(hatBrim);

      const hatCrown = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.29, 0.22, 16), hatMat);
      hatCrown.position.y = 0.29;
      this.head.add(hatCrown);

      const hatRibbon = new THREE.Mesh(new THREE.CylinderGeometry(0.295, 0.295, 0.05, 16), ribbonMat);
      hatRibbon.position.y = 0.22;
      this.head.add(hatRibbon);

      const armGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.32, 8);
      armGeo.translate(0, -0.16, 0);

      this.leftArm = new THREE.Mesh(armGeo, clothesMat);
      this.leftArm.position.set(0.32, 0.82, 0);
      this.leftArm.castShadow = true;
      this.group.add(this.leftArm);

      this.rightArm = new THREE.Mesh(armGeo, clothesMat);
      this.rightArm.position.set(-0.32, 0.82, 0);
      this.rightArm.castShadow = true;
      this.group.add(this.rightArm);

      const thighLength = 0.22;
      const shinLength = 0.22;

      const thighGeo = new THREE.CylinderGeometry(0.075, 0.075, thighLength, 8);
      thighGeo.translate(0, -thighLength / 2, 0);

      this.leftLeg = new THREE.Mesh(thighGeo, pantsMat);
      this.leftLeg.position.set(0.14, 0.42, 0);
      this.leftLeg.castShadow = true;
      this.group.add(this.leftLeg);

      this.rightLeg = new THREE.Mesh(thighGeo, pantsMat);
      this.rightLeg.position.set(-0.14, 0.42, 0);
      this.rightLeg.castShadow = true;
      this.group.add(this.rightLeg);

      const shinGeo = new THREE.CylinderGeometry(0.07, 0.07, shinLength, 8);
      shinGeo.translate(0, -shinLength / 2, 0);

      this.leftShin = new THREE.Mesh(shinGeo, pantsMat);
      this.leftShin.position.set(0, -thighLength, 0);
      this.leftShin.castShadow = true;
      this.leftLeg.add(this.leftShin);

      this.rightShin = new THREE.Mesh(shinGeo, pantsMat);
      this.rightShin.position.set(0, -thighLength, 0);
      this.rightShin.castShadow = true;
      this.rightLeg.add(this.rightShin);

      const shoeGeo = new THREE.BoxGeometry(0.12, 0.08, 0.17);
      shoeGeo.translate(0, -0.04, 0.03);

      const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
      leftShoe.position.set(0, -shinLength, 0);
      this.leftShin.add(leftShoe);

      const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
      rightShoe.position.set(0, -shinLength, 0);
      this.rightShin.add(rightShoe);

      this.position.y = this.terrain.getHeight(this.position.x, this.position.z);
      this.group.position.copy(this.position);

      this.scene.add(this.group);
    }

    sitOnBench(sitTransform) {
      this.isSitting = true;
      this.state = 'sit';
      this.position.copy(sitTransform.position);
      this.rotationY = sitTransform.rotationY;
      this.targetRotationY = sitTransform.rotationY;
      this.group.position.copy(this.position);
      this.group.rotation.y = this.rotationY;

      this.leftLeg.rotation.set(-Math.PI * 0.48, 0, 0.05);
      this.rightLeg.rotation.set(-Math.PI * 0.48, 0, -0.05);
      this.leftShin.rotation.set(Math.PI * 0.48, 0, 0);
      this.rightShin.rotation.set(Math.PI * 0.48, 0, 0);

      this.leftArm.rotation.set(-0.52, 0.15, -0.15);
      this.rightArm.rotation.set(-0.52, -0.15, 0.15);

      this.body.position.y = 0.52;
      this.head.position.y = 0.98;
    }

    standUp() {
      this.isSitting = false;
      this.state = 'idle';
      const forward = new THREE.Vector3(0, 0, 0.9).applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
      this.position.add(forward);
      this.position.y = this.terrain.getHeight(this.position.x, this.position.z);
      this.group.position.copy(this.position);

      this.leftLeg.rotation.set(0, 0, 0);
      this.rightLeg.rotation.set(0, 0, 0);
      this.leftShin.rotation.set(0, 0, 0);
      this.rightShin.rotation.set(0, 0, 0);
      this.leftArm.rotation.set(0, 0, 0);
      this.rightArm.rotation.set(0, 0, 0);
      this.body.position.y = 0.62;
      this.head.position.y = 1.08;
    }

    resolveCollisions(targetPos) {
      if (targetPos.x < this.railingBoundaryX) {
        targetPos.x = this.railingBoundaryX;
      }
      targetPos.x = Math.min(60, targetPos.x);
      targetPos.z = Math.max(-68, Math.min(68, targetPos.z));

      for (let iter = 0; iter < 2; iter++) {
        for (const obs of this.obstacles) {
          const dx = targetPos.x - obs.x;
          const dz = targetPos.z - obs.z;
          const minDist = this.radius + obs.radius;
          const distSq = dx * dx + dz * dz;

          if (distSq < minDist * minDist && distSq > 0.00001) {
            const dist = Math.sqrt(distSq);
            const overlap = minDist - dist;
            targetPos.x += (dx / dist) * overlap;
            targetPos.z += (dz / dist) * overlap;
          }
        }
      }
    }

    update(delta, inputDir, cameraAngleY) {
      if (this.isSitting) {
        this.animTime += delta;
        const breathe = Math.sin(this.animTime * 1.5) * 0.015;
        this.body.position.y = 0.52 + breathe;
        this.head.position.y = 0.98 + breathe;
        return;
      }

      const hasInput = inputDir.lengthSq() > 0.01;

      if (hasInput) {
        this.state = 'walk';
        this.animTime += delta * 8.5;

        const moveVec = new THREE.Vector3(inputDir.x, 0, inputDir.y).normalize();
        moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), cameraAngleY);

        const step = moveVec.clone().multiplyScalar(this.speed * delta);
        const nextPos = {
          x: this.position.x + step.x,
          z: this.position.z + step.z
        };

        this.resolveCollisions(nextPos);

        this.position.x = nextPos.x;
        this.position.z = nextPos.z;
        this.position.y = this.terrain.getHeight(this.position.x, this.position.z);
        this.group.position.copy(this.position);

        this.targetRotationY = Math.atan2(moveVec.x, moveVec.z);
        
        let diff = this.targetRotationY - this.rotationY;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;
        this.rotationY += diff * 0.18;
        this.group.rotation.y = this.rotationY;

        const swing = Math.sin(this.animTime) * 0.55;
        this.leftLeg.rotation.x = -swing;
        this.rightLeg.rotation.x = swing;
        this.leftShin.rotation.x = Math.max(0, -swing * 0.5);
        this.rightShin.rotation.x = Math.max(0, swing * 0.5);

        this.leftArm.rotation.x = swing * 0.7;
        this.rightArm.rotation.x = -swing * 0.7;

        const bob = Math.abs(Math.sin(this.animTime)) * 0.06;
        this.body.position.y = 0.62 + bob;
        this.head.position.y = 1.08 + bob;
        this.group.rotation.z = Math.sin(this.animTime) * 0.04;
      } else {
        this.state = 'idle';
        this.animTime += delta * 2.0;

        const breathe = Math.sin(this.animTime * 0.02) * 0.02;
        this.body.position.y = 0.62 + breathe;
        this.head.position.y = 1.08 + breathe;

        this.leftLeg.rotation.x *= 0.85;
        this.rightLeg.rotation.x *= 0.85;
        this.leftShin.rotation.x *= 0.85;
        this.rightShin.rotation.x *= 0.85;
        this.leftArm.rotation.x *= 0.85;
        this.rightArm.rotation.x *= 0.85;
        this.group.rotation.z *= 0.85;
      }
    }
  }

  // ==========================================
  // 9. 3인칭 추적 카메라 (TPSCamera)
  // ==========================================
  class TPSCamera {
    constructor(camera, domElement) {
      this.camera = camera;
      this.domElement = domElement;

      this.theta = Math.PI * 0.9;
      this.phi = 0.28;
      this.distance = 4.8;
      this.targetDistance = 4.8;

      this.targetLookAt = new THREE.Vector3();
      this.currentLookAt = new THREE.Vector3();

      this.isDragging = false;
      this.prevMousePos = { x: 0, y: 0 };

      this.initEvents();
    }

    initEvents() {
      this.domElement.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          this.isDragging = true;
          this.prevMousePos = { x: e.clientX, y: e.clientY };
        }
      });

      window.addEventListener('mouseup', () => {
        this.isDragging = false;
      });

      window.addEventListener('mousemove', (e) => {
        if (!this.isDragging) return;
        const dx = e.clientX - this.prevMousePos.x;
        const dy = e.clientY - this.prevMousePos.y;

        this.theta -= dx * 0.005;
        this.phi += dy * 0.005;
        this.phi = Math.max(-0.15, Math.min(Math.PI * 0.38, this.phi));

        this.prevMousePos = { x: e.clientX, y: e.clientY };
      });

      this.domElement.addEventListener('wheel', (e) => {
        e.preventDefault();
        this.targetDistance += e.deltaY * 0.005;
        this.targetDistance = Math.max(2.4, Math.min(9.0, this.targetDistance));
      }, { passive: false });

      let touchStartX = 0, touchStartY = 0;
      this.domElement.addEventListener('touchstart', (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      });

      this.domElement.addEventListener('touchmove', (e) => {
        if (e.touches.length === 1) {
          const dx = e.touches[0].clientX - touchStartX;
          const dy = e.touches[0].clientY - touchStartY;
          this.theta -= dx * 0.006;
          this.phi += dy * 0.006;
          this.phi = Math.max(-0.15, Math.min(Math.PI * 0.38, this.phi));
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      });
    }

    setScenicView(benchRotationY) {
      this.theta = benchRotationY - Math.PI * 0.55;
      this.phi = 0.18;
      this.targetDistance = 4.0;
    }

    update(avatarPos, isSitting) {
      this.distance += (this.targetDistance - this.distance) * 0.1;

      const targetY = avatarPos.y + (isSitting ? 0.75 : 0.95);
      this.targetLookAt.set(avatarPos.x, targetY, avatarPos.z);
      this.currentLookAt.lerp(this.targetLookAt, 0.12);

      const cosPhi = Math.cos(this.phi);
      const offsetX = this.distance * cosPhi * Math.sin(this.theta);
      const offsetY = this.distance * Math.sin(this.phi);
      const offsetZ = this.distance * cosPhi * Math.cos(this.theta);

      const desiredCamPos = new THREE.Vector3(
        this.currentLookAt.x + offsetX,
        this.currentLookAt.y + offsetY,
        this.currentLookAt.z + offsetZ
      );

      if (desiredCamPos.y < avatarPos.y + 0.3) {
        desiredCamPos.y = avatarPos.y + 0.3;
      }

      this.camera.position.lerp(desiredCamPos, 0.15);
      this.camera.lookAt(this.currentLookAt);
    }

    getHorizontalAngle() {
      return this.theta;
    }
  }

  // ==========================================
  // 10. 야생 동물 매니저 (WildlifeManager)
  // ==========================================
  class WildlifeManager {
    constructor(scene, terrain) {
      this.scene = scene;
      this.terrain = terrain;

      this.rabbits = [];
      this.flyingBirds = [];
      this.groundBirds = [];

      this.initRabbits(5);
      this.initFlyingBirds(4);
      this.initGroundBirds(4);
    }

    createRabbitMesh() {
      const group = new THREE.Group();
      const furMat = new THREE.MeshStandardMaterial({ color: 0xf5f2eb, roughness: 0.9 });
      const innerEarMat = new THREE.MeshBasicMaterial({ color: 0xffb6c1 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
      const noseMat = new THREE.MeshBasicMaterial({ color: 0xffa0b0 });

      const bodyGeo = new THREE.SphereGeometry(0.18, 12, 10);
      bodyGeo.scale(1.0, 0.85, 1.3);
      const body = new THREE.Mesh(bodyGeo, furMat);
      body.position.y = 0.16;
      body.castShadow = true;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(0.13, 12, 10);
      const head = new THREE.Mesh(headGeo, furMat);
      head.position.set(0, 0.28, 0.18);
      head.castShadow = true;
      group.add(head);

      const eyeGeo = new THREE.SphereGeometry(0.02, 6, 6);
      const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
      leftEye.position.set(0.08, 0.04, 0.09);
      head.add(leftEye);

      const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
      rightEye.position.set(-0.08, 0.04, 0.09);
      head.add(rightEye);

      const nose = new THREE.Mesh(new THREE.SphereGeometry(0.015, 6, 6), noseMat);
      nose.position.set(0, 0.01, 0.13);
      head.add(nose);

      const earGeo = new THREE.CylinderGeometry(0.025, 0.04, 0.2, 8);
      earGeo.translate(0, 0.1, 0);

      const leftEar = new THREE.Mesh(earGeo, furMat);
      leftEar.position.set(0.05, 0.1, -0.02);
      leftEar.rotation.z = -0.15;
      leftEar.rotation.x = -0.2;
      head.add(leftEar);

      const leftInnerEar = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.14), innerEarMat);
      leftInnerEar.position.set(0, 0.1, 0.025);
      leftEar.add(leftInnerEar);

      const rightEar = new THREE.Mesh(earGeo, furMat);
      rightEar.position.set(-0.05, 0.1, -0.02);
      rightEar.rotation.z = 0.15;
      rightEar.rotation.x = -0.2;
      head.add(rightEar);

      const rightInnerEar = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.14), innerEarMat);
      rightInnerEar.position.set(0, 0.1, 0.025);
      rightEar.add(rightInnerEar);

      const tail = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), furMat);
      tail.position.set(0, 0.18, -0.24);
      group.add(tail);

      group.scale.set(0.85, 0.85, 0.85);
      return { group, head, leftEar, rightEar, body };
    }

    initRabbits(count) {
      for (let i = 0; i < count; i++) {
        const rabbitMesh = this.createRabbitMesh();
        const rabbit = {
          mesh: rabbitMesh.group,
          head: rabbitMesh.head,
          body: rabbitMesh.body,
          leftEar: rabbitMesh.leftEar,
          rightEar: rabbitMesh.rightEar,
          x: 0,
          z: 0,
          state: 'sitting',
          fleeDir: new THREE.Vector2(),
          hopTimer: 0,
          sitTimer: 2.0 + Math.random() * 5.0,
          targetX: 0,
          targetZ: 0
        };
        this.respawnRabbit(rabbit);
        this.rabbits.push(rabbit);
        this.scene.add(rabbit.mesh);
      }
    }

    respawnRabbit(rabbit) {
      rabbit.x = -5 + Math.random() * 35;
      rabbit.z = (Math.random() - 0.5) * 90;
      rabbit.state = 'sitting';
      rabbit.sitTimer = 3.0 + Math.random() * 6.0;
      rabbit.mesh.rotation.y = Math.random() * Math.PI * 2;

      const y = this.terrain.getHeight(rabbit.x, rabbit.z);
      rabbit.mesh.position.set(rabbit.x, y, rabbit.z);
    }

    createBirdMesh() {
      const group = new THREE.Group();
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x486b5e, roughness: 0.7 });
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x324d43, roughness: 0.8, side: THREE.DoubleSide });
      const beakMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });

      const bodyGeo = new THREE.ConeGeometry(0.09, 0.32, 6);
      bodyGeo.rotateX(Math.PI / 2);
      const body = new THREE.Mesh(bodyGeo, bodyMat);
      group.add(body);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 8), bodyMat);
      head.position.set(0, 0.05, 0.15);
      group.add(head);

      const beakGeo = new THREE.ConeGeometry(0.025, 0.08, 4);
      beakGeo.rotateX(Math.PI / 2);
      const beak = new THREE.Mesh(beakGeo, beakMat);
      beak.position.set(0, 0.04, 0.24);
      group.add(beak);

      const wingGeo = new THREE.PlaneGeometry(0.32, 0.15);
      wingGeo.translate(0.16, 0, 0);

      const leftWing = new THREE.Mesh(wingGeo, wingMat);
      leftWing.position.set(0.05, 0.05, 0.02);
      group.add(leftWing);

      const rightWing = new THREE.Mesh(wingGeo, wingMat);
      rightWing.rotation.y = Math.PI;
      rightWing.position.set(-0.05, 0.05, 0.02);
      group.add(rightWing);

      return { group, leftWing, rightWing };
    }

    initFlyingBirds(count) {
      for (let i = 0; i < count; i++) {
        const birdMesh = this.createBirdMesh();
        const bird = {
          mesh: birdMesh.group,
          leftWing: birdMesh.leftWing,
          rightWing: birdMesh.rightWing,
          x: 0, y: 0, z: 0,
          speed: 7.0 + Math.random() * 3.5,
          flightAngle: 0,
          flapSpeed: 14 + Math.random() * 4,
          animTime: Math.random() * 10
        };
        this.respawnFlyingBird(bird);
        this.flyingBirds.push(bird);
        this.scene.add(bird.mesh);
      }
    }

    respawnFlyingBird(bird) {
      const angle = (Math.random() - 0.5) * Math.PI * 0.8;
      bird.flightAngle = angle;
      bird.x = -15 + Math.random() * 10;
      bird.z = -75 + Math.random() * 150;
      bird.y = 4.0 + Math.random() * 5.0;

      bird.mesh.position.set(bird.x, bird.y, bird.z);
      bird.mesh.rotation.y = Math.atan2(Math.sin(angle), Math.cos(angle)) + Math.PI / 2;
    }

    initGroundBirds(count) {
      for (let i = 0; i < count; i++) {
        const birdMesh = this.createBirdMesh();
        birdMesh.group.scale.set(0.75, 0.75, 0.75);
        const bird = {
          mesh: birdMesh.group,
          leftWing: birdMesh.leftWing,
          rightWing: birdMesh.rightWing,
          x: -6 + Math.random() * 18,
          z: (Math.random() - 0.5) * 60,
          peckTimer: Math.random() * 4,
          isFlushed: false,
          flushVelocity: new THREE.Vector3()
        };
        const y = this.terrain.getHeight(bird.x, bird.z);
        bird.mesh.position.set(bird.x, y + 0.1, bird.z);
        this.groundBirds.push(bird);
        this.scene.add(bird.mesh);
      }
    }

    update(delta, playerPos) {
      const now = Date.now() * 0.001;

      for (const rabbit of this.rabbits) {
        const dxToPlayer = rabbit.x - playerPos.x;
        const dzToPlayer = rabbit.z - playerPos.z;
        const distToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dzToPlayer * dzToPlayer);

        if (distToPlayer < 4.6) {
          if (rabbit.state !== 'fleeing') {
            rabbit.state = 'fleeing';
            rabbit.fleeDir.set(dxToPlayer, dzToPlayer).normalize();
            rabbit.fleeDir.x += (Math.random() - 0.3) * 0.4;
            rabbit.fleeDir.y += (Math.random() - 0.5) * 0.4;
            rabbit.fleeDir.normalize();
          }
        }

        if (rabbit.state === 'sitting') {
          rabbit.sitTimer -= delta;
          const breathe = Math.sin(now * 3.5) * 0.01;
          rabbit.head.position.y = 0.28 + breathe;
          rabbit.leftEar.rotation.z = -0.15 + Math.sin(now * 2.0) * 0.12;
          rabbit.rightEar.rotation.z = 0.15 + Math.cos(now * 2.2) * 0.12;

          if (rabbit.sitTimer <= 0) {
            rabbit.state = 'hopping';
            rabbit.hopTimer = 0;
            const randAngle = Math.random() * Math.PI * 2;
            rabbit.targetX = rabbit.x + Math.cos(randAngle) * 1.5;
            rabbit.targetZ = rabbit.z + Math.sin(randAngle) * 1.5;
            rabbit.sitTimer = 4.0 + Math.random() * 6.0;
          }
        } else if (rabbit.state === 'hopping') {
          rabbit.hopTimer += delta * 6.0;
          const dx = rabbit.targetX - rabbit.x;
          const dz = rabbit.targetZ - rabbit.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist < 0.2 || rabbit.hopTimer > Math.PI * 2) {
            rabbit.state = 'sitting';
            rabbit.mesh.position.y = this.terrain.getHeight(rabbit.x, rabbit.z);
            continue;
          }

          rabbit.mesh.rotation.y = Math.atan2(dx, dz);
          const hopY = Math.abs(Math.sin(rabbit.hopTimer)) * 0.18;
          rabbit.x += (dx / dist) * 1.6 * delta;
          rabbit.z += (dz / dist) * 1.6 * delta;
          rabbit.mesh.position.set(rabbit.x, this.terrain.getHeight(rabbit.x, rabbit.z) + hopY, rabbit.z);
        } else if (rabbit.state === 'fleeing') {
          rabbit.hopTimer += delta * 11.5;
          const fleeSpeed = 5.2;

          rabbit.x += rabbit.fleeDir.x * fleeSpeed * delta;
          rabbit.z += rabbit.fleeDir.y * fleeSpeed * delta;
          rabbit.mesh.rotation.y = Math.atan2(rabbit.fleeDir.x, rabbit.fleeDir.y);

          const hopY = Math.abs(Math.sin(rabbit.hopTimer)) * 0.32;
          const groundY = this.terrain.getHeight(rabbit.x, rabbit.z);
          rabbit.mesh.position.set(rabbit.x, groundY + hopY, rabbit.z);

          const earFlap = Math.sin(rabbit.hopTimer) * 0.45;
          rabbit.leftEar.rotation.x = -0.4 - earFlap;
          rabbit.rightEar.rotation.x = -0.4 - earFlap;

          if (distToPlayer > 8.5) {
            rabbit.state = 'sitting';
            rabbit.sitTimer = 5.0 + Math.random() * 5.0;
            rabbit.mesh.position.y = groundY;
            rabbit.leftEar.rotation.x = -0.2;
            rabbit.rightEar.rotation.x = -0.2;
          }

          if (rabbit.x > 55 || rabbit.x < -10 || rabbit.z > 70 || rabbit.z < -70) {
            this.respawnRabbit(rabbit);
          }
        }
      }

      for (const bird of this.flyingBirds) {
        bird.animTime += delta;
        bird.x += Math.cos(bird.flightAngle) * bird.speed * delta;
        bird.z += Math.sin(bird.flightAngle) * bird.speed * delta;
        bird.y += Math.sin(bird.animTime * 2.0) * 0.015;
        bird.mesh.position.set(bird.x, bird.y, bird.z);

        const flap = Math.sin(bird.animTime * bird.flapSpeed) * 0.7;
        bird.leftWing.rotation.z = flap;
        bird.rightWing.rotation.z = -flap;

        if (bird.x > 65 || bird.x < -30 || bird.z > 80 || bird.z < -80) {
          this.respawnFlyingBird(bird);
        }
      }

      for (const bird of this.groundBirds) {
        if (bird.isFlushed) {
          bird.mesh.position.addScaledVector(bird.flushVelocity, delta);
          const flap = Math.sin(Date.now() * 0.035) * 0.85;
          bird.leftWing.rotation.z = flap;
          bird.rightWing.rotation.z = -flap;

          if (bird.mesh.position.y > 15) {
            bird.isFlushed = false;
            bird.x = -5 + Math.random() * 22;
            bird.z = (Math.random() - 0.5) * 60;
            bird.mesh.position.set(bird.x, this.terrain.getHeight(bird.x, bird.z) + 0.1, bird.z);
          }
        } else {
          if (bird.mesh.position.distanceTo(playerPos) < 4.2) {
            bird.isFlushed = true;
            bird.flushVelocity.set((Math.random() - 0.5) * 7, 4.5 + Math.random() * 3.5, (Math.random() - 0.5) * 7);
            bird.mesh.rotation.y = Math.atan2(bird.flushVelocity.x, bird.flushVelocity.z);
          } else {
            bird.peckTimer += delta;
            bird.mesh.rotation.x = Math.sin(bird.peckTimer * 5.0) > 0.65 ? 0.45 : 0;
          }
        }
      }
    }
  }

  // ==========================================
  // 11. 보행자 주민 매니저 (PedestrianManager)
  // ==========================================
  class PedestrianManager {
    constructor(scene, terrain) {
      this.scene = scene;
      this.terrain = terrain;

      this.promenadeX = -11.5;
      this.minZ = -70;
      this.maxZ = 70;

      this.pedestrians = [];
      this.spawnTimer = 2.0;

      this.initPedestrians(2);
    }

    createPedestrianMesh(styleIndex) {
      const group = new THREE.Group();
      const styles = [
        { shirt: 0x3a86ff, pants: 0x1d3557, hat: 0x0077b6 },
        { shirt: 0xffb703, pants: 0x2b2d42, hat: 0xfb8500 },
        { shirt: 0xff70a6, pants: 0x4a4e69, hat: 0x70d6ff }
      ];
      const style = styles[styleIndex % styles.length];

      const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.6 });
      const shirtMat = new THREE.MeshStandardMaterial({ color: style.shirt, roughness: 0.8 });
      const pantsMat = new THREE.MeshStandardMaterial({ color: style.pants, roughness: 0.8 });
      const shoeMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
      const hatMat = new THREE.MeshStandardMaterial({ color: style.hat, roughness: 0.7 });

      const bodyGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.44, 10);
      const body = new THREE.Mesh(bodyGeo, shirtMat);
      body.position.y = 0.62;
      body.castShadow = true;
      group.add(body);

      const headGeo = new THREE.SphereGeometry(0.28, 14, 14);
      const head = new THREE.Mesh(headGeo, skinMat);
      head.position.y = 1.05;
      head.castShadow = true;
      group.add(head);

      const capGeo = new THREE.SphereGeometry(0.29, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.45);
      const cap = new THREE.Mesh(capGeo, hatMat);
      cap.position.y = 1.1;
      group.add(cap);

      const brim = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.03, 0.2), hatMat);
      brim.position.set(0, 1.14, 0.24);
      group.add(brim);

      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
      const leftEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), eyeMat);
      leftEye.position.set(0.09, 0.04, 0.25);
      head.add(leftEye);

      const rightEye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 6), eyeMat);
      rightEye.position.set(-0.09, 0.04, 0.25);
      head.add(rightEye);

      const armGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.3, 8);
      armGeo.translate(0, -0.15, 0);

      const leftArm = new THREE.Mesh(armGeo, shirtMat);
      leftArm.position.set(0.3, 0.8, 0);
      leftArm.castShadow = true;
      group.add(leftArm);

      const rightArm = new THREE.Mesh(armGeo, shirtMat);
      rightArm.position.set(-0.3, 0.8, 0);
      rightArm.castShadow = true;
      group.add(rightArm);

      const legGeo = new THREE.CylinderGeometry(0.075, 0.075, 0.38, 8);
      legGeo.translate(0, -0.19, 0);

      const leftLeg = new THREE.Mesh(legGeo, pantsMat);
      leftLeg.position.set(0.13, 0.4, 0);
      leftLeg.castShadow = true;
      group.add(leftLeg);

      const rightLeg = new THREE.Mesh(legGeo, pantsMat);
      rightLeg.position.set(-0.13, 0.4, 0);
      rightLeg.castShadow = true;
      group.add(rightLeg);

      const shoeGeo = new THREE.BoxGeometry(0.11, 0.08, 0.16);
      const leftShoe = new THREE.Mesh(shoeGeo, shoeMat);
      leftShoe.position.set(0, -0.38, 0.03);
      leftLeg.add(leftShoe);

      const rightShoe = new THREE.Mesh(shoeGeo, shoeMat);
      rightShoe.position.set(0, -0.38, 0.03);
      rightLeg.add(rightShoe);

      group.scale.set(0.95, 0.95, 0.95);
      return { group, body, head, leftArm, rightArm, leftLeg, rightLeg };
    }

    initPedestrians(count) {
      for (let i = 0; i < count; i++) {
        const pedObj = this.createPedestrianMesh(i);
        const ped = {
          mesh: pedObj.group,
          body: pedObj.body,
          head: pedObj.head,
          leftArm: pedObj.leftArm,
          rightArm: pedObj.rightArm,
          leftLeg: pedObj.leftLeg,
          rightLeg: pedObj.rightLeg,
          active: false,
          x: this.promenadeX,
          z: 0,
          dirZ: 1,
          speed: 2.2 + Math.random() * 0.8,
          animTime: Math.random() * 10
        };
        ped.mesh.visible = false;
        this.pedestrians.push(ped);
        this.scene.add(ped.mesh);
      }
    }

    spawnPedestrian() {
      const ped = this.pedestrians.find(p => !p.active);
      if (!ped) return;

      const fromNorth = Math.random() > 0.5;
      ped.dirZ = fromNorth ? 1 : -1;
      ped.z = fromNorth ? this.minZ : this.maxZ;
      ped.x = this.promenadeX + (Math.random() - 0.5) * 0.9;
      ped.speed = 2.0 + Math.random() * 1.0;
      ped.active = true;
      ped.mesh.visible = true;
      ped.mesh.rotation.y = ped.dirZ > 0 ? 0 : Math.PI;

      const y = this.terrain.getHeight(ped.x, ped.z);
      ped.mesh.position.set(ped.x, y, ped.z);
    }

    update(delta) {
      this.spawnTimer -= delta;
      if (this.spawnTimer <= 0) {
        this.spawnPedestrian();
        this.spawnTimer = 10.0 + Math.random() * 10.0;
      }

      for (const ped of this.pedestrians) {
        if (!ped.active) continue;

        ped.animTime += delta * (ped.speed * 3.2);
        ped.z += ped.dirZ * ped.speed * delta;

        const y = this.terrain.getHeight(ped.x, ped.z);
        ped.mesh.position.set(ped.x, y, ped.z);

        const swing = Math.sin(ped.animTime) * 0.5;
        ped.leftLeg.rotation.x = -swing;
        ped.rightLeg.rotation.x = swing;
        ped.leftArm.rotation.x = swing * 0.7;
        ped.rightArm.rotation.x = -swing * 0.7;

        const bob = Math.abs(Math.sin(ped.animTime)) * 0.05;
        ped.body.position.y = 0.62 + bob;
        ped.head.position.y = 1.05 + bob;

        if ((ped.dirZ > 0 && ped.z > this.maxZ + 5) || (ped.dirZ < 0 && ped.z < this.minZ - 5)) {
          ped.active = false;
          ped.mesh.visible = false;
        }
      }
    }
  }

  // ==========================================
  // 12. 메인 애플리케이션 (App)
  // ==========================================
  class App {
    constructor() {
      this.canvas = document.getElementById('webgl-canvas');
      this.clock = new THREE.Clock();

      this.keys = { forward: false, backward: false, left: false, right: false };
      this.isWindFocus = false;
      this.isMeditation = false;

      this.init();
    }

    init() {
      this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvas,
        antialias: true,
        powerPreference: 'high-performance'
      });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.05;

      this.scene = new THREE.Scene();
      this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300);

      this.soundManager = new SoundManager();
      this.terrain = new Terrain(this.scene);
      this.river = new River(this.scene);
      this.promenade = new Promenade(this.scene, this.terrain);
      this.bamboo = new BambooForest(this.scene, this.terrain);
      this.bench = new Bench(this.scene, this.terrain);
      this.wildlife = new WildlifeManager(this.scene, this.terrain);
      this.pedestrians = new PedestrianManager(this.scene, this.terrain);
      this.atmosphere = new Atmosphere(this.scene);
      this.avatar = new Avatar(this.scene, this.terrain);
      this.tpsCamera = new TPSCamera(this.camera, this.renderer.domElement);

      this.avatar.setObstacles(this.bamboo.getColliders());
      this.avatar.setRailingBoundary(this.promenade.railingBoundaryX);

      this.bindEvents();
      this.bindUI();

      this.animate = this.animate.bind(this);
      requestAnimationFrame(this.animate);
    }

    bindEvents() {
      window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });

      window.addEventListener('keydown', (e) => {
        this.soundManager.init();
        switch (e.code) {
          case 'KeyW': case 'ArrowUp': this.keys.forward = true; break;
          case 'KeyS': case 'ArrowDown': this.keys.backward = true; break;
          case 'KeyA': case 'ArrowLeft': this.keys.left = true; break;
          case 'KeyD': case 'ArrowRight': this.keys.right = true; break;
          case 'KeyE': this.toggleBenchInteraction(); break;
          case 'Escape': if (this.isMeditation) this.toggleMeditation(); break;
        }
      });

      window.addEventListener('keyup', (e) => {
        switch (e.code) {
          case 'KeyW': case 'ArrowUp': this.keys.forward = false; break;
          case 'KeyS': case 'ArrowDown': this.keys.backward = false; break;
          case 'KeyA': case 'ArrowLeft': this.keys.left = false; break;
          case 'KeyD': case 'ArrowRight': this.keys.right = false; break;
        }
      });

      window.addEventListener('pointerdown', () => {
        this.soundManager.init();
      }, { once: true });
    }

    bindUI() {
      this.promptTooltip = document.getElementById('bench-prompt');
      this.benchModal = document.getElementById('bench-modal');
      this.btnWind = document.getElementById('btn-wind');
      this.btnMeditate = document.getElementById('btn-meditate');
      this.btnStand = document.getElementById('btn-stand');
      this.meditationOverlay = document.getElementById('meditation-overlay');
      this.btnExitMeditate = document.getElementById('btn-exit-meditate');
      this.btnAudioToggle = document.getElementById('btn-audio-toggle');

      this.btnWind.addEventListener('click', () => this.toggleWindFocus());
      this.btnMeditate.addEventListener('click', () => this.toggleMeditation());
      this.btnStand.addEventListener('click', () => this.standUp());
      this.btnExitMeditate.addEventListener('click', () => this.toggleMeditation());

      this.btnAudioToggle.addEventListener('click', () => {
        this.soundManager.init();
        const isMuted = this.soundManager.toggleMute();
        this.btnAudioToggle.textContent = isMuted ? '🔇 소리 켜기' : '🔊 소리 끄기';
      });
    }

    toggleBenchInteraction() {
      if (this.avatar.isSitting) this.standUp();
      else if (this.bench.isNear(this.avatar.position)) this.sitDown();
    }

    sitDown() {
      const sitTransform = this.bench.getSitTransform();
      this.avatar.sitOnBench(sitTransform);
      this.tpsCamera.setScenicView(sitTransform.rotationY);
      this.promptTooltip.classList.add('hidden');
      this.benchModal.classList.remove('hidden');
    }

    standUp() {
      if (this.isMeditation) this.toggleMeditation();
      if (this.isWindFocus) this.toggleWindFocus();
      this.avatar.standUp();
      this.benchModal.classList.add('hidden');
    }

    toggleWindFocus() {
      this.isWindFocus = !this.isWindFocus;
      this.bamboo.setWindFocus(this.isWindFocus);
      this.soundManager.setWindFocus(this.isWindFocus);

      if (this.isWindFocus) {
        this.btnWind.classList.add('active');
        this.btnWind.innerHTML = '🍃 바람소리 집중 중 <span class="badge">ON</span>';
      } else {
        this.btnWind.classList.remove('active');
        this.btnWind.innerHTML = '🍃 바람소리 감상하기';
      }
    }

    toggleMeditation() {
      this.isMeditation = !this.isMeditation;
      this.soundManager.setMeditationMode(this.isMeditation);

      if (this.isMeditation) {
        this.meditationOverlay.classList.remove('hidden');
        setTimeout(() => this.meditationOverlay.classList.add('active'), 50);
      } else {
        this.meditationOverlay.classList.remove('active');
        setTimeout(() => this.meditationOverlay.classList.add('hidden'), 600);
      }
    }

    animate() {
      requestAnimationFrame(this.animate);
      const delta = Math.min(this.clock.getDelta(), 0.1);

      const inputDir = new THREE.Vector2();
      if (this.keys.forward) inputDir.y -= 1;
      if (this.keys.backward) inputDir.y += 1;
      if (this.keys.left) inputDir.x -= 1;
      if (this.keys.right) inputDir.x += 1;

      const camAngle = this.tpsCamera.getHorizontalAngle();

      this.avatar.update(delta, inputDir, camAngle);
      this.tpsCamera.update(this.avatar.position, this.avatar.isSitting);
      this.river.update(delta);
      this.bamboo.update(delta);
      this.wildlife.update(delta, this.avatar.position);
      this.pedestrians.update(delta);
      this.atmosphere.update(delta);

      if (!this.avatar.isSitting) {
        if (this.bench.isNear(this.avatar.position)) {
          this.promptTooltip.classList.remove('hidden');
        } else {
          this.promptTooltip.classList.add('hidden');
        }
      }

      this.renderer.render(this.scene, this.camera);
    }
  }

  // DOMContentLoaded 시 실행
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => new App());
  } else {
    new App();
  }
})();
