import * as THREE from 'three';

export class Bench {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;

    // 벤치 위치: 강변 인도 바로 옆 쉼터 데크 (태화강이 가장 잘 내려다보이는 자리)
    this.position = new THREE.Vector3(-10.0, 0, 3.0);
    this.rotationY = Math.PI * 0.5; // 태화강 방향(서쪽)을 정면으로 바라봄

    this.group = new THREE.Group();
    this.interactionRadius = 2.6;

    this.init();
  }

  init() {
    const y = this.terrain.getHeight(this.position.x, this.position.z);
    this.position.y = y;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;

    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x8b5a2b,
      roughness: 0.8,
      metalness: 0.1
    });

    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.5,
      metalness: 0.8
    });

    // 1. 좌판 나무 슬랫
    for (let i = 0; i < 4; i++) {
      const slatGeo = new THREE.BoxGeometry(2.2, 0.08, 0.14);
      const slat = new THREE.Mesh(slatGeo, woodMat);
      slat.position.set(0, 0.52, -0.22 + i * 0.16);
      slat.castShadow = true;
      slat.receiveShadow = true;
      this.group.add(slat);
    }

    // 2. 등받이 나무 슬랫
    for (let i = 0; i < 3; i++) {
      const backGeo = new THREE.BoxGeometry(2.2, 0.12, 0.06);
      const backSlat = new THREE.Mesh(backGeo, woodMat);
      backSlat.position.set(0, 0.78 + i * 0.15, -0.32);
      backSlat.rotation.x = -0.15;
      backSlat.castShadow = true;
      backSlat.receiveShadow = true;
      this.group.add(backSlat);
    }

    // 3. 다리 및 지지대
    const legGeo = new THREE.BoxGeometry(0.08, 0.52, 0.6);
    const leftLeg = new THREE.Mesh(legGeo, ironMat);
    leftLeg.position.set(-0.9, 0.26, 0);
    leftLeg.castShadow = true;
    this.group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, ironMat);
    rightLeg.position.set(0.9, 0.26, 0);
    rightLeg.castShadow = true;
    this.group.add(rightLeg);

    // 벤치 전용 나무 데크 바닥
    const baseGeo = new THREE.BoxGeometry(2.8, 0.06, 1.6);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0xb59975, roughness: 0.8 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.set(0, 0.03, 0.1);
    base.receiveShadow = true;
    this.group.add(base);

    this.scene.add(this.group);
  }

  isNear(playerPosition) {
    const dist = this.position.distanceTo(playerPosition);
    return dist <= this.interactionRadius;
  }

  getSitTransform() {
    const sitPos = this.position.clone();
    // 벤치 좌판(y=0.52) 위에 엉덩이가 올라오도록 y 오프셋 0.42, 등받이 앞인 z=0.04
    const forwardOffset = new THREE.Vector3(0, 0.42, 0.04);
    forwardOffset.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotationY);
    sitPos.add(forwardOffset);

    return {
      position: sitPos,
      rotationY: this.rotationY
    };
  }
}
