import * as THREE from 'three';

export class BambooForest {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;

    // 대나무 충돌체 위치 배열 [{x, z, radius}]
    this.colliders = [];
    this.stalkRadius = 0.07; // 늘씬하고 섬세한 대나무 줄기 반경

    // 대나무 간 최소 거리 (훨씬 촘촘하고 빽빽한 군락)
    this.minDistance = 1.25;

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

    // 1. 최소 간격 및 길 회피 알고리즘을 통한 대나무 위치 후보군 생성
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

      // 충돌체 목록에 등록
      this.colliders.push({
        x: p.x,
        z: p.z,
        radius: this.stalkRadius
      });
    }

    this.stalkMesh.instanceMatrix.needsUpdate = true;
    this.foliageMesh.instanceMatrix.needsUpdate = true;

    this.scene.add(this.stalkMesh);
    this.scene.add(this.foliageMesh);
  }

  // 대나무 간격 보장 및 길/인도 회피 위치 생성
  generateBambooPositions() {
    const validPositions = [];
    // 공간 탐색 가속 그리드 (셀 크기 2m)
    const cellSize = this.minDistance;
    const grid = new Map();

    const getCellKey = (gx, gz) => `${gx},${gz}`;

    // 숲의 범위: x: -9 ~ 65, z: -72 ~ 72
    const minX = -9;
    const maxX = 65;
    const minZ = -72;
    const maxZ = 72;

    const maxAttempts = 35000;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const x = minX + Math.random() * (maxX - minX);
      const z = minZ + Math.random() * (maxZ - minZ);

      // 1) 강변 인도 및 제방 회피 (x < -9.5 금지)
      if (x < -9.5) continue;

      // 2) 산책로(주 산책로, 숲속 오솔길, 태화강 연결로) 회피: 최소 2.0m 이상 거리 확보
      const distToPath = this.terrain.getDistanceToNearestPath(x, z);
      if (distToPath < 2.0) continue;

      // 3) 벤치 주변 회피
      const distToBench = Math.sqrt((x - (-10.0)) ** 2 + (z - 3.0) ** 2);
      if (distToBench < 3.8) continue;

      // 4) 다른 대나무와의 최소 간격 검사 (최소 1.9m 보장)
      const gx = Math.floor(x / cellSize);
      const gz = Math.floor(z / cellSize);
      let isTooClose = false;

      // 주변 9개 셀 탐색
      for (let dx = -1; dx <= 1 && !isTooClose; dx++) {
        for (let dz = -1; dz <= 1 && !isTooClose; dz++) {
          const key = getCellKey(gx + dx, gz + dz);
          const cell = grid.get(key);
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

  // 충돌체 배열 반환
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
          // 대나무 마디 링 표현 (약 1.35m 간격)
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
