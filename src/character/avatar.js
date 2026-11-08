import * as THREE from 'three';

export class Avatar {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;

    this.group = new THREE.Group();
    this.state = 'idle';

    // 물리 및 이동 파라미터
    this.position = new THREE.Vector3(-6, 0, -35); // 산책로 시작 지점
    this.rotationY = 0;
    this.targetRotationY = 0;
    this.speed = 4.2;
    this.isSitting = false;

    // 캐릭터 충돌체 반경
    this.radius = 0.35;
    this.obstacles = [];
    this.railingBoundaryX = -11.85;

    this.animTime = 0;

    // 파츠 참조
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

    // 1. 몸통 (Body)
    const bodyGeo = new THREE.CylinderGeometry(0.24, 0.28, 0.45, 12);
    this.body = new THREE.Mesh(bodyGeo, clothesMat);
    this.body.position.y = 0.62;
    this.body.castShadow = true;
    this.group.add(this.body);

    // 배낭 (Backpack - 뒤쪽 -Z)
    const packGeo = new THREE.BoxGeometry(0.26, 0.3, 0.16);
    const packMat = new THREE.MeshStandardMaterial({ color: 0x966844, roughness: 0.7 });
    const backpack = new THREE.Mesh(packGeo, packMat);
    backpack.position.set(0, 0.05, -0.2);
    backpack.castShadow = true;
    this.body.add(backpack);

    // 2. 머리 (Head)
    const headGeo = new THREE.SphereGeometry(0.3, 16, 16);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 1.08;
    this.head.castShadow = true;
    this.group.add(this.head);

    // 눈 (Eyes - 앞쪽 +Z)
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x222222 });
    const eyeGeo = new THREE.SphereGeometry(0.035, 8, 8);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.1, 0.04, 0.26);
    this.head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.1, 0.04, 0.26);
    this.head.add(rightEye);

    // 볼터치 (Blush)
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

    // 밀짚모자
    const hatBrimGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.03, 16);
    const hatBrim = new THREE.Mesh(hatBrimGeo, hatMat);
    hatBrim.position.y = 0.18;
    this.head.add(hatBrim);

    const hatCrownGeo = new THREE.CylinderGeometry(0.26, 0.29, 0.22, 16);
    const hatCrown = new THREE.Mesh(hatCrownGeo, hatMat);
    hatCrown.position.y = 0.29;
    this.head.add(hatCrown);

    const hatRibbonGeo = new THREE.CylinderGeometry(0.295, 0.295, 0.05, 16);
    const hatRibbon = new THREE.Mesh(hatRibbonGeo, ribbonMat);
    hatRibbon.position.y = 0.22;
    this.head.add(hatRibbon);

    // 3. 팔 (Arms)
    // 피벗을 어깨 상단에 둠 (translate Y -0.16)
    const armGeo = new THREE.CylinderGeometry(0.065, 0.065, 0.32, 8);
    armGeo.translate(0, -0.16, 0);

    // 왼팔
    this.leftArm = new THREE.Mesh(armGeo, clothesMat);
    this.leftArm.position.set(0.32, 0.82, 0);
    this.leftArm.castShadow = true;
    this.group.add(this.leftArm);

    // 오른팔
    this.rightArm = new THREE.Mesh(armGeo, clothesMat);
    this.rightArm.position.set(-0.32, 0.82, 0);
    this.rightArm.castShadow = true;
    this.group.add(this.rightArm);

    // 손 (Hands - 귀여운 둥근 손)
    const handGeo = new THREE.SphereGeometry(0.065, 8, 8);
    const leftHand = new THREE.Mesh(handGeo, skinMat);
    leftHand.position.set(0, -0.32, 0);
    this.leftArm.add(leftHand);

    const rightHand = new THREE.Mesh(handGeo, skinMat);
    rightHand.position.set(0, -0.32, 0);
    this.rightArm.add(rightHand);

    // 4. 관절형 다리 (Thigh & Shin)
    // 허벅지 (Thigh): 피벗은 골반 (y=0.42)
    const thighLength = 0.22;
    const shinLength = 0.22;

    const thighGeo = new THREE.CylinderGeometry(0.075, 0.075, thighLength, 8);
    thighGeo.translate(0, -thighLength / 2, 0);

    // 왼다리 허벅지
    this.leftLeg = new THREE.Mesh(thighGeo, pantsMat);
    this.leftLeg.position.set(0.14, 0.42, 0);
    this.leftLeg.castShadow = true;
    this.group.add(this.leftLeg);

    // 오른다리 허벅지
    this.rightLeg = new THREE.Mesh(thighGeo, pantsMat);
    this.rightLeg.position.set(-0.14, 0.42, 0);
    this.rightLeg.castShadow = true;
    this.group.add(this.rightLeg);

    // 종아리 (Shin) - 무릎 피벗 (y = -thighLength)
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

    // 신발 (Shoes)
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

  // 착석 자세 (올바른 부호 및 관절 각도)
  sitOnBench(sitTransform) {
    this.isSitting = true;
    this.state = 'sit';
    this.position.copy(sitTransform.position);
    this.rotationY = sitTransform.rotationY;
    this.targetRotationY = sitTransform.rotationY;
    this.group.position.copy(this.position);
    this.group.rotation.y = this.rotationY;

    // 허벅지: 앞으로 85도 뻗음 (음수 각도가 앞쪽 +Z 방향임!)
    this.leftLeg.rotation.set(-Math.PI * 0.48, 0, 0.05);
    this.rightLeg.rotation.set(-Math.PI * 0.48, 0, -0.05);

    // 종아리: 무릎에서 아래로 85도 자연스럽게 꺾여 벤치 아래로 내려옴
    this.leftShin.rotation.set(Math.PI * 0.48, 0, 0);
    this.rightShin.rotation.set(Math.PI * 0.48, 0, 0);

    // 팔: 어깨에서 앞으로 부드럽게 내려 손을 무릎 위에 살포시 얹음
    // x = -0.5 (앞으로 숙임), z = 안쪽으로 살짝 모아 무릎 위에 안착
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

    // 모든 관절 중립 각도 복귀
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

      // 걷기 모션: 음수(앞)/양수(뒤) 스윙
      const swing = Math.sin(this.animTime) * 0.55;
      this.leftLeg.rotation.x = -swing;
      this.rightLeg.rotation.x = swing;
      this.leftShin.rotation.x = Math.max(0, -swing * 0.5); // 걷는 도중 무릎 살짝 굽힘
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

      const breathe = Math.sin(this.animTime) * 0.02;
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
