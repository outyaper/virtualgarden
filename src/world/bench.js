import * as THREE from 'three';

export class Bench {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;

    // 벤치 위치: 강변 인도 바로 옆 햇살 쉼터 전망대
    this.position = new THREE.Vector3(-10.0, 0, 3.0);
    this.rotationY = Math.PI * 0.5; // 태화강 방향(서쪽)을 정면으로 조망

    this.group = new THREE.Group();
    this.interactionRadius = 2.8;

    this.init();
  }

  init() {
    const y = this.terrain.getHeight(this.position.x, this.position.z);
    this.position.y = y;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;

    // 1. 화사하고 따뜻한 밝은 네이처 오크 원목 재질
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0xdfad71, // 밝고 화사한 허니 오크
      roughness: 0.65,
      metalness: 0.05
    });

    const ironMat = new THREE.MeshStandardMaterial({
      color: 0x3d403a, // 세련된 다크 차콜 메탈
      roughness: 0.4,
      metalness: 0.7
    });

    // 좌판 나무 슬랫
    for (let i = 0; i < 4; i++) {
      const slatGeo = new THREE.BoxGeometry(2.3, 0.09, 0.15);
      const slat = new THREE.Mesh(slatGeo, woodMat);
      slat.position.set(0, 0.52, -0.22 + i * 0.16);
      slat.castShadow = true;
      slat.receiveShadow = true;
      this.group.add(slat);
    }

    // 등받이 나무 슬랫
    for (let i = 0; i < 3; i++) {
      const backGeo = new THREE.BoxGeometry(2.3, 0.13, 0.07);
      const backSlat = new THREE.Mesh(backGeo, woodMat);
      backSlat.position.set(0, 0.78 + i * 0.16, -0.32);
      backSlat.rotation.x = -0.15;
      backSlat.castShadow = true;
      backSlat.receiveShadow = true;
      this.group.add(backSlat);
    }

    // 다리 및 프레임
    const legGeo = new THREE.BoxGeometry(0.08, 0.52, 0.6);
    const leftLeg = new THREE.Mesh(legGeo, ironMat);
    leftLeg.position.set(-0.95, 0.26, 0);
    leftLeg.castShadow = true;
    this.group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, ironMat);
    rightLeg.position.set(0.95, 0.26, 0);
    rightLeg.castShadow = true;
    this.group.add(rightLeg);

    // 2. 밝고 눈에 띄는 화이트오크 원목 전망 데크 바닥
    const baseGeo = new THREE.BoxGeometry(3.6, 0.1, 2.6);
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0xf3e5ab, // 눈에 확 띄는 밝은 바닐라빛 원목 데크
      roughness: 0.7,
      metalness: 0.05
    });
    const base = new THREE.Mesh(baseGeo, deckMat);
    base.position.set(0, 0.05, 0.2);
    base.receiveShadow = true;
    this.group.add(base);

    // 데크 테두리 골드/브라운 몰딩
    const borderGeo = new THREE.BoxGeometry(3.7, 0.12, 2.7);
    const borderMat = new THREE.MeshStandardMaterial({ color: 0xb58a57, roughness: 0.8 });
    const border = new THREE.Mesh(borderGeo, borderMat);
    border.position.set(0, 0.03, 0.2);
    this.group.add(border);

    // 3. 벤치를 환하게 비추는 감성 스탠드 조명 (포인트 라이트 탑재)
    const lampMat = new THREE.MeshStandardMaterial({ color: 0x2b2b2b, metalness: 0.8, roughness: 0.3 });
    const shadeMat = new THREE.MeshBasicMaterial({ color: 0xfff4d6 }); // 빛나는 등갓

    const lampPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 2.2, 8), lampMat);
    lampPole.position.set(1.4, 1.1, -0.4);
    lampPole.castShadow = true;
    this.group.add(lampPole);

    const lampShade = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.2, 8), shadeMat);
    lampShade.position.set(1.4, 2.15, -0.4);
    this.group.add(lampShade);

    // 벤치 주변을 비추는 따뜻한 쉼터 조명
    const spotLight = new THREE.PointLight(0xffecd1, 2.2, 8.0, 1.2);
    spotLight.position.set(1.4, 2.2, -0.4);
    this.group.add(spotLight);

    // 4. 벤치 옆 화사한 꽃 화분 (Planters with Blossoms)
    const potMat = new THREE.MeshStandardMaterial({ color: 0x9e7b66, roughness: 0.8 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x40916c, roughness: 0.7 });
    const flowerMat = new THREE.MeshStandardMaterial({ color: 0xff99c8, roughness: 0.5 }); // 분홍 꽃잎

    const planter = new THREE.Group();
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.18, 0.35, 10), potMat);
    pot.position.y = 0.18;
    planter.add(pot);

    // 꽃과 잎
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
    const dist = this.position.distanceTo(playerPosition);
    return dist <= this.interactionRadius;
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
