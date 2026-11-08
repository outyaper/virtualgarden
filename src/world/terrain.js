import * as THREE from 'three';

export class Terrain {
  constructor(scene) {
    this.scene = scene;
    this.width = 160;
    this.depth = 160;
    this.mesh = null;
    
    // 산책로 커브들
    this.mainPath = null;
    this.innerPath = null;
    this.connectorPath = null;

    this.init();
  }

  // 1. 산책로 네트워크 정의
  initPaths() {
    // 1) 주 산책로 (강변 언덕길)
    this.mainPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-9, 0, -65),
      new THREE.Vector3(-6, 0, -35),
      new THREE.Vector3(-3, 0, -10),
      new THREE.Vector3(1, 0, 15),
      new THREE.Vector3(-4, 0, 40),
      new THREE.Vector3(-7, 0, 65)
    ]);

    // 2) 대나무 숲 내부 흙길 (숲속 오솔길)
    this.innerPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-4, 0, -35), // 주 산책로에서 분기
      new THREE.Vector3(12, 0, -20),
      new THREE.Vector3(22, 0, 0),   // 울창한 대나무 숲 한가운데
      new THREE.Vector3(14, 0, 25),
      new THREE.Vector3(-4, 0, 40)   // 다시 주 산책로와 합류
    ]);

    // 3) 태화강으로 바로 이어지는 연결 샛길
    this.connectorPath = new THREE.CatmullRomCurve3([
      new THREE.Vector3(22, 0, 0),   // 숲속 오솔길 중심
      new THREE.Vector3(8, 0, 2),
      new THREE.Vector3(-3, 0, 3),   // 주 산책로 통과
      new THREE.Vector3(-12.5, 0, 3) // 태화강변 인도로 직접 연결
    ]);
  }

  // 주어진 (x, z)에서 가장 가까운 산책로와의 거리 계산
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

  // 지형 고도 계산
  getHeight(x, z) {
    // 태화강 수변 구역 (x < -14: 강물 수면 높이 -0.2보다 낮음)
    if (x < -20) {
      return -1.5 + Math.sin(z * 0.05) * 0.2;
    } else if (x < -13) {
      const t = (x - (-20)) / 7;
      return -1.5 + t * 2.0; // 강변 제방
    } else if (x <= -10) {
      // 강변 인도(Promenade) 평탄 구역: 높이 약 0.5m 고정
      return 0.5;
    }

    // 숲속 구릉 지형
    const hill1 = Math.sin(x * 0.07) * Math.cos(z * 0.05) * 0.8;
    const hill2 = Math.sin(x * 0.03 + 1.2) * Math.sin(z * 0.04) * 0.5;
    let h = 0.5 + hill1 + hill2;

    // 길(산책로) 구역은 걷기 편하도록 평탄화
    const distToPath = this.getDistanceToNearestPath(x, z);
    if (distToPath < 3.0) {
      h = h * 0.5 + 0.35;
    }

    return Math.max(0.1, h);
  }

  init() {
    this.initPaths();

    const segments = 140;
    const geometry = new THREE.PlaneGeometry(this.width, this.depth, segments, segments);
    geometry.rotateX(-Math.PI / 2);

    const pos = geometry.attributes.position;
    const colors = [];
    const colorGrass = new THREE.Color(0x3e6b35); // 짙은 초록 잔디
    const colorPath = new THREE.Color(0xc7ab7e);  // 따뜻한 황토 흙길
    const colorBank = new THREE.Color(0x5a6344);  // 강변 자갈/모래

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const y = this.getHeight(x, z);
      pos.setY(i, y);

      const dist = this.getDistanceToNearestPath(x, z);
      const tempColor = new THREE.Color();

      if (x < -12.5) {
        // 강변 비탈
        tempColor.copy(colorBank).offsetHSL(0, 0, (Math.random() - 0.5) * 0.05);
      } else if (dist < 2.6) {
        // 흙길 산책로 (중심부는 흙, 가장자리는 잔디와 부드럽게 블렌딩)
        const factor = Math.min(1.0, dist / 2.6);
        tempColor.copy(colorPath).lerp(colorGrass, factor * 0.8);
      } else {
        // 숲속 잔디밭
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
