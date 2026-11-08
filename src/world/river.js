import * as THREE from 'three';

export class River {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.waterMaterial = null;

    // 물고기 점프 시스템
    this.fishes = [];
    this.ripples = [];
    this.splashParticles = null;
    this.activeSplashes = [];

    this.init();
    this.initFishSystem();
  }

  init() {
    const riverWidth = 75;
    const riverLength = 170;
    const geometry = new THREE.PlaneGeometry(riverWidth, riverLength, 64, 64);
    geometry.rotateX(-Math.PI / 2);

    // 밝고 맑은 청록빛/에메랄드 태화강 수면 셰이더
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWaterColor: { value: new THREE.Color(0x64dfdf) }, // 화사하고 맑은 청록빛
        uDeepColor: { value: new THREE.Color(0x28929e) },  // 투명감 있는 깊은 물빛
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
          
          // 프레넬 반사
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 2.8);
          
          // 햇살 스펙큘러 하이라이트 (물결 위 반짝임)
          vec3 reflectDir = reflect(-uSunDirection, vNormal);
          float spec = pow(max(dot(viewDir, reflectDir), 0.0), 36.0);
          
          // 미세 잔물결 광택
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

  // ==========================================
  // 물고기 점프 및 물보라 이펙트 시스템
  // ==========================================
  createFishMesh() {
    const group = new THREE.Group();
    const fishMat = new THREE.MeshStandardMaterial({
      color: 0xc4e0e5, // 반짝이는 은빛
      metalness: 0.85,
      roughness: 0.2
    });
    const finMat = new THREE.MeshStandardMaterial({
      color: 0x88c0d0,
      metalness: 0.5,
      roughness: 0.3,
      side: THREE.DoubleSide
    });

    // 유선형 몸통
    const bodyGeo = new THREE.ConeGeometry(0.12, 0.55, 8);
    bodyGeo.rotateZ(Math.PI / 2);
    bodyGeo.scale(1.0, 0.6, 1.0);
    const body = new THREE.Mesh(bodyGeo, fishMat);
    group.add(body);

    // 꼬리지느러미
    const tailGeo = new THREE.BufferGeometry();
    const tailVerts = new Float32Array([
      0, 0, 0,
      -0.2, 0.14, 0,
      -0.2, -0.14, 0
    ]);
    tailGeo.setAttribute('position', new THREE.BufferAttribute(tailVerts, 3));
    const tail = new THREE.Mesh(tailGeo, finMat);
    tail.position.x = -0.25;
    group.add(tail);

    // 등지느러미
    const finGeo = new THREE.BufferGeometry();
    const finVerts = new Float32Array([
      0, 0, 0,
      -0.1, 0.12, 0,
      -0.15, 0, 0
    ]);
    finGeo.setAttribute('position', new THREE.BufferAttribute(finVerts, 3));
    const fin = new THREE.Mesh(finGeo, finMat);
    fin.position.set(0.05, 0.05, 0);
    group.add(fin);

    group.scale.set(0.8, 0.8, 0.8);
    return { group, tail };
  }

  initFishSystem() {
    // 2마리의 물고기
    for (let i = 0; i < 2; i++) {
      const fishObj = this.createFishMesh();
      const fish = {
        mesh: fishObj.group,
        tail: fishObj.tail,
        isJumping: false,
        timer: 1.5 + i * 3.5, // 점프 대기 시간
        progress: 0,
        startX: 0,
        startZ: 0,
        endX: 0,
        endZ: 0,
        jumpHeight: 1.2 + Math.random() * 0.5
      };
      fish.mesh.visible = false;
      this.fishes.push(fish);
      this.scene.add(fish.mesh);
    }

    // 수면 파문 링 (Ripples) 풀
    const ringGeo = new THREE.RingGeometry(0.08, 0.16, 24);
    ringGeo.rotateX(-Math.PI / 2);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide
    });

    for (let i = 0; i < 6; i++) {
      const ring = new THREE.Mesh(ringGeo, ringMat.clone());
      ring.visible = false;
      this.ripples.push({
        mesh: ring,
        active: false,
        scale: 0.1,
        opacity: 0.8
      });
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

    // 강변 가까운 수면 (x: -18 ~ -32, z: -40 ~ +40)
    fish.startX = -18 - Math.random() * 14;
    fish.startZ = (Math.random() - 0.5) * 80;

    // 점프 방향 (비스듬히 포물선)
    const angle = Math.random() * Math.PI * 2;
    const jumpDist = 1.6 + Math.random() * 1.0;
    fish.endX = fish.startX + Math.cos(angle) * jumpDist;
    fish.endZ = fish.startZ + Math.sin(angle) * jumpDist;

    fish.mesh.position.set(fish.startX, -0.2, fish.startZ);
    fish.mesh.visible = true;

    // 수면 솟구칠 때 파문 발생
    this.triggerRipple(fish.startX, fish.startZ);
  }

  update(delta) {
    if (this.waterMaterial) {
      this.waterMaterial.uniforms.uTime.value += delta;
    }

    // 물고기 점프 업데이트
    for (const fish of this.fishes) {
      if (!fish.isJumping) {
        fish.timer -= delta;
        if (fish.timer <= 0) {
          this.startFishJump(fish);
        }
      } else {
        fish.progress += delta * 1.25; // 점프 시간 약 0.8초

        if (fish.progress >= 1.0) {
          // 물속으로 착수 (Splash!)
          fish.isJumping = false;
          fish.mesh.visible = false;
          fish.timer = 4.0 + Math.random() * 5.0; // 다음 점프까지 4~9초
          this.triggerRipple(fish.endX, fish.endZ);
        } else {
          const t = fish.progress;
          // X, Z 보간
          const curX = fish.startX + (fish.endX - fish.startX) * t;
          const curZ = fish.startZ + (fish.endZ - fish.startZ) * t;
          // Y 포물선 궤적 (t=0 -> -0.2, t=0.5 -> max, t=1 -> -0.2)
          const curY = -0.2 + Math.sin(t * Math.PI) * fish.jumpHeight;

          fish.mesh.position.set(curX, curY, curZ);

          // 포물선 접선에 따른 물고기 몸통 회전
          const dirX = fish.endX - fish.startX;
          const dirZ = fish.endZ - fish.startZ;
          const velY = Math.cos(t * Math.PI) * fish.jumpHeight * 2.5;

          fish.mesh.rotation.y = Math.atan2(dirZ, dirX);
          fish.mesh.rotation.z = Math.atan2(velY, Math.sqrt(dirX * dirX + dirZ * dirZ));

          // 꼬리 살랑거리기
          if (fish.tail) {
            fish.tail.rotation.z = Math.sin(t * 30) * 0.4;
          }
        }
      }
    }

    // 수면 파문 링 확장 및 페이드아웃
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
