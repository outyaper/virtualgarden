import * as THREE from 'three';
import { Terrain } from './world/terrain.js';
import { River } from './world/river.js';
import { Promenade } from './world/promenade.js';
import { BambooForest } from './world/bamboo.js';
import { Bench } from './world/bench.js';
import { Atmosphere } from './world/atmosphere.js';
import { Avatar } from './character/avatar.js';
import { TPSCamera } from './controls/tpsCamera.js';
import { SoundManager } from './audio/soundManager.js';
import { WildlifeManager } from './world/wildlife.js';

class App {
  constructor() {
    this.canvas = document.getElementById('webgl-canvas');
    this.clock = new THREE.Clock();

    // 입력 상태
    this.keys = {
      forward: false,
      backward: false,
      left: false,
      right: false
    };

    // 힐링 모드 상태
    this.isWindFocus = false;
    this.isMeditation = false;

    this.init();
  }

  init() {
    // 1. 렌더러 생성
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

    // 2. 씬 및 카메라
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 300);

    // 3. 컴포넌트 생성
    this.soundManager = new SoundManager();
    this.terrain = new Terrain(this.scene);
    this.river = new River(this.scene);
    this.promenade = new Promenade(this.scene, this.terrain);
    this.bamboo = new BambooForest(this.scene, this.terrain);
    this.bench = new Bench(this.scene, this.terrain);
    this.wildlife = new WildlifeManager(this.scene, this.terrain);
    this.atmosphere = new Atmosphere(this.scene);
    this.avatar = new Avatar(this.scene, this.terrain);
    this.tpsCamera = new TPSCamera(this.camera, this.renderer.domElement);

    // 4. 아바타에 충돌체 및 경계선 등록
    this.avatar.setObstacles(this.bamboo.getColliders());
    this.avatar.setRailingBoundary(this.promenade.railingBoundaryX);

    // 5. 이벤트 및 UI 바인딩
    this.bindEvents();
    this.bindUI();

    // 6. 렌더 루프 시작
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
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = true;
          break;
        case 'KeyE':
          this.toggleBenchInteraction();
          break;
        case 'Escape':
          if (this.isMeditation) {
            this.toggleMeditation();
          }
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.keys.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.keys.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          this.keys.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          this.keys.right = false;
          break;
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

    this.btnWind.addEventListener('click', () => {
      this.toggleWindFocus();
    });

    this.btnMeditate.addEventListener('click', () => {
      this.toggleMeditation();
    });

    this.btnStand.addEventListener('click', () => {
      this.standUp();
    });

    this.btnExitMeditate.addEventListener('click', () => {
      this.toggleMeditation();
    });

    this.btnAudioToggle.addEventListener('click', () => {
      this.soundManager.init();
      const isMuted = this.soundManager.toggleMute();
      this.btnAudioToggle.textContent = isMuted ? '🔇 소리 켜기' : '🔊 소리 끄기';
    });
  }

  toggleBenchInteraction() {
    if (this.avatar.isSitting) {
      this.standUp();
    } else if (this.bench.isNear(this.avatar.position)) {
      this.sitDown();
    }
  }

  sitDown() {
    const sitTransform = this.bench.getSitTransform();
    this.avatar.sitOnBench(sitTransform);
    this.tpsCamera.setScenicView(sitTransform.rotationY);

    this.promptTooltip.classList.add('hidden');
    this.benchModal.classList.remove('hidden');
  }

  standUp() {
    if (this.isMeditation) {
      this.toggleMeditation();
    }
    if (this.isWindFocus) {
      this.toggleWindFocus();
    }
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
      setTimeout(() => {
        this.meditationOverlay.classList.add('active');
      }, 50);
    } else {
      this.meditationOverlay.classList.remove('active');
      setTimeout(() => {
        this.meditationOverlay.classList.add('hidden');
      }, 600);
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

window.addEventListener('DOMContentLoaded', () => {
  new App();
});
