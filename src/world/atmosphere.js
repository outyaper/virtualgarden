import * as THREE from 'three';

export class Atmosphere {
  constructor(scene) {
    this.scene = scene;
    this.particles = null;
    this.particlePositions = [];
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
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 160;
    const d = 40;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.0005;
    this.scene.add(sunLight);

    // 4. 공기 중 떠다니는 빛가루 & 흩날리는 잎사귀 파티클
    const particleGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const scales = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      positions[i * 3 + 0] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 12 + 0.5;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 80;
      scales[i] = Math.random() * 0.15 + 0.08;
    }

    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));

    // 파티클 재질 (햇살을 머금은 황금빛 반딧불/포자)
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
      // 좌우로 살랑살랑 흔들리며 위아래로 부유
      pos[idx + 0] += Math.sin(time + i) * 0.015;
      pos[idx + 1] += Math.cos(time * 0.8 + i) * 0.01;
      pos[idx + 2] += Math.sin(time * 0.6 + i) * 0.012;

      // 일정 높이를 벗어나면 리셋
      if (pos[idx + 1] > 14) pos[idx + 1] = 0.5;
      if (pos[idx + 1] < 0.2) pos[idx + 1] = 13.5;
    }
    this.particles.geometry.attributes.position.needsUpdate = true;
  }
}
