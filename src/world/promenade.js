import * as THREE from 'three';

export class Promenade {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;

    this.group = new THREE.Group();
    // 인도의 중심 X 위치 및 폭
    this.centerX = -11.5;
    this.width = 2.6;
    this.length = 150;
    this.deckHeight = 0.52; // 지형(0.5m) 살짝 위

    // 안전 난간 X 경계선 (이보다 서쪽으로는 갈 수 없음)
    this.railingBoundaryX = -12.2;

    this.init();
  }

  init() {
    // 1. 강변 산책로 보행 데크 바닥 (우아한 석재/목재 보도)
    const deckGeo = new THREE.PlaneGeometry(this.width, this.length, 1, 100);
    deckGeo.rotateX(-Math.PI / 2);

    const deckMat = new THREE.MeshStandardMaterial({
      color: 0xd2c0a5, // 깔끔한 베이지빛 산책 보도블록
      roughness: 0.85,
      metalness: 0.05
    });

    const deckMesh = new THREE.Mesh(deckGeo, deckMat);
    deckMesh.position.set(this.centerX, this.deckHeight, 0);
    deckMesh.receiveShadow = true;
    this.group.add(deckMesh);

    // 인도 경계석 (Border Stones) - 양쪽 가장자리
    const borderMat = new THREE.MeshStandardMaterial({
      color: 0x7a7873,
      roughness: 0.9
    });

    const leftBorderGeo = new THREE.BoxGeometry(0.18, 0.12, this.length);
    const leftBorder = new THREE.Mesh(leftBorderGeo, borderMat);
    leftBorder.position.set(this.centerX - this.width / 2 + 0.09, this.deckHeight + 0.04, 0);
    this.group.add(leftBorder);

    const rightBorder = new THREE.Mesh(leftBorderGeo, borderMat);
    rightBorder.position.set(this.centerX + this.width / 2 - 0.09, this.deckHeight + 0.04, 0);
    this.group.add(rightBorder);

    // 2. 강 쪽 안전 나무 난간 (Wood Posts & Cross Rails)
    const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.05, 8);
    const railMat = new THREE.MeshStandardMaterial({
      color: 0x5a3d28,
      roughness: 0.7
    });

    const postSpacing = 3.0; // 3m 간격으로 기둥 설치
    const postCount = Math.floor(this.length / postSpacing);
    const railingX = this.centerX - this.width / 2 + 0.1; // 약 -12.7

    // 인스턴스로 기둥 렌더링 최적화
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

    // 가로 난간 바 (상단/중단 난간)
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

    // 3. 인도 중간중간 감성 강변 가로등 (Lanterns)
    const lanternMat = new THREE.MeshStandardMaterial({ color: 0x222222, metalness: 0.8, roughness: 0.3 });
    const glassMat = new THREE.MeshBasicMaterial({ color: 0xfff0c4 }); // 따스한 불빛

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
