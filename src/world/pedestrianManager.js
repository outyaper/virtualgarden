import * as THREE from 'three';

export class PedestrianManager {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;

    // 강변 인도 경로 파라미터
    this.promenadeX = -11.5;
    this.minZ = -70;
    this.maxZ = 70;

    this.pedestrians = [];
    this.spawnTimer = 2.0; // 첫 등장 2초 후

    this.initPedestrians(2);
  }

  // 3등신 보행자 NPC 메쉬 생성
  createPedestrianMesh(styleIndex) {
    const group = new THREE.Group();

    // 다양한 의상 컬러 스타일
    const styles = [
      { shirt: 0x3a86ff, pants: 0x1d3557, hat: 0x0077b6, hair: 0x3d2b1f }, // 스포티 블루
      { shirt: 0xffb703, pants: 0x2b2d42, hat: 0xfb8500, hair: 0x4a3728 }, // 산뜻한 옐로우
      { shirt: 0xff70a6, pants: 0x4a4e69, hat: 0x70d6ff, hair: 0x222222 }  // 화사한 핑크
    ];
    const style = styles[styleIndex % styles.length];

    const skinMat = new THREE.MeshStandardMaterial({ color: 0xffdfc4, roughness: 0.6 });
    const shirtMat = new THREE.MeshStandardMaterial({ color: style.shirt, roughness: 0.8 });
    const pantsMat = new THREE.MeshStandardMaterial({ color: style.pants, roughness: 0.8 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x333333, roughness: 0.5 });
    const hatMat = new THREE.MeshStandardMaterial({ color: style.hat, roughness: 0.7 });

    // 몸통
    const bodyGeo = new THREE.CylinderGeometry(0.22, 0.26, 0.44, 10);
    const body = new THREE.Mesh(bodyGeo, shirtMat);
    body.position.y = 0.62;
    body.castShadow = true;
    group.add(body);

    // 머리
    const headGeo = new THREE.SphereGeometry(0.28, 14, 14);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.05;
    head.castShadow = true;
    group.add(head);

    // 모자 (스포티 캡)
    const capGeo = new THREE.SphereGeometry(0.29, 12, 10, 0, Math.PI * 2, 0, Math.PI * 0.45);
    const cap = new THREE.Mesh(capGeo, hatMat);
    cap.position.y = 1.1;
    group.add(cap);

    const brimGeo = new THREE.BoxGeometry(0.26, 0.03, 0.2);
    const brim = new THREE.Mesh(brimGeo, hatMat);
    brim.position.set(0, 1.14, 0.24);
    group.add(brim);

    // 눈
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const eyeGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.09, 0.04, 0.25);
    head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.09, 0.04, 0.25);
    head.add(rightEye);

    // 팔
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

    // 다리
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

    // 신발
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
        dirZ: 1, // 1: 남->북, -1: 북->남
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

    // 양쪽 끝 중 무작위 시작
    const fromNorth = Math.random() > 0.5;
    ped.dirZ = fromNorth ? 1 : -1;
    ped.z = fromNorth ? this.minZ : this.maxZ;
    // 인도 폭(-12.3 ~ -10.8) 내에서 좌우 무작위 오프셋
    ped.x = this.promenadeX + (Math.random() - 0.5) * 0.9;

    ped.speed = 2.0 + Math.random() * 1.0; // 산책 ~ 가벼운 조깅
    ped.active = true;
    ped.mesh.visible = true;

    // 걷는 방향을 정면으로
    ped.mesh.rotation.y = ped.dirZ > 0 ? 0 : Math.PI;

    const y = this.terrain.getHeight(ped.x, ped.z);
    ped.mesh.position.set(ped.x, y, ped.z);
  }

  update(delta) {
    // 주기적 스폰 (약 12~18초마다 한 번씩)
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

      // 자연스러운 보행 애니메이션 (Limb Swing & Bobbing)
      const swing = Math.sin(ped.animTime) * 0.5;
      ped.leftLeg.rotation.x = -swing;
      ped.rightLeg.rotation.x = swing;
      ped.leftArm.rotation.x = swing * 0.7;
      ped.rightArm.rotation.x = -swing * 0.7;

      const bob = Math.abs(Math.sin(ped.animTime)) * 0.05;
      ped.body.position.y = 0.62 + bob;
      ped.head.position.y = 1.05 + bob;

      // 끝에 도달하면 디스폰
      if ((ped.dirZ > 0 && ped.z > this.maxZ + 5) || (ped.dirZ < 0 && ped.z < this.minZ - 5)) {
        ped.active = false;
        ped.mesh.visible = false;
      }
    }
  }
}
