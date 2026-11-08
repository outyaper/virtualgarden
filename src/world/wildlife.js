import * as THREE from 'three';

export class WildlifeManager {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;

    this.rabbits = [];
    this.flyingBirds = [];
    this.groundBirds = [];

    this.initRabbits(3);
    this.initFlyingBirds(4);
    this.initGroundBirds(3);
  }

  // ==========================================
  // 1. 토끼 (Rabbits) 생성 및 관리
  // ==========================================
  createRabbitMesh() {
    const group = new THREE.Group();
    const furMat = new THREE.MeshStandardMaterial({ color: 0xf5f2eb, roughness: 0.9 });
    const innerEarMat = new THREE.MeshBasicMaterial({ color: 0xffb6c1 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x1a1a1a });
    const noseMat = new THREE.MeshBasicMaterial({ color: 0xffa0b0 });

    // 몸통
    const bodyGeo = new THREE.SphereGeometry(0.18, 12, 10);
    bodyGeo.scale(1.0, 0.85, 1.3);
    const body = new THREE.Mesh(bodyGeo, furMat);
    body.position.y = 0.16;
    body.castShadow = true;
    group.add(body);

    // 머리
    const headGeo = new THREE.SphereGeometry(0.13, 12, 10);
    const head = new THREE.Mesh(headGeo, furMat);
    head.position.set(0, 0.28, 0.18);
    head.castShadow = true;
    group.add(head);

    // 눈
    const eyeGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.08, 0.04, 0.09);
    head.add(leftEye);

    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(-0.08, 0.04, 0.09);
    head.add(rightEye);

    // 코
    const noseGeo = new THREE.SphereGeometry(0.015, 6, 6);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0, 0.01, 0.13);
    head.add(nose);

    // 쫑긋한 귀 (좌/우)
    const earGeo = new THREE.CylinderGeometry(0.025, 0.04, 0.2, 8);
    earGeo.translate(0, 0.1, 0);

    const leftEar = new THREE.Mesh(earGeo, furMat);
    leftEar.position.set(0.05, 0.1, -0.02);
    leftEar.rotation.z = -0.15;
    leftEar.rotation.x = -0.2;
    head.add(leftEar);

    const leftInnerEar = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.14), innerEarMat);
    leftInnerEar.position.set(0, 0.1, 0.025);
    leftEar.add(leftInnerEar);

    const rightEar = new THREE.Mesh(earGeo, furMat);
    rightEar.position.set(-0.05, 0.1, -0.02);
    rightEar.rotation.z = 0.15;
    rightEar.rotation.x = -0.2;
    head.add(rightEar);

    const rightInnerEar = new THREE.Mesh(new THREE.PlaneGeometry(0.03, 0.14), innerEarMat);
    rightInnerEar.position.set(0, 0.1, 0.025);
    rightEar.add(rightInnerEar);

    // 꼬리 (솜뭉치 폼폼)
    const tailGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const tail = new THREE.Mesh(tailGeo, furMat);
    tail.position.set(0, 0.18, -0.24);
    group.add(tail);

    group.scale.set(0.9, 0.9, 0.9);
    return { group, head, leftEar, rightEar };
  }

  initRabbits(count) {
    for (let i = 0; i < count; i++) {
      const rabbitMesh = this.createRabbitMesh();
      const rabbit = {
        mesh: rabbitMesh.group,
        head: rabbitMesh.head,
        leftEar: rabbitMesh.leftEar,
        rightEar: rabbitMesh.rightEar,
        x: 0,
        z: 0,
        targetX: 0,
        targetZ: 0,
        speed: 1.8 + Math.random() * 0.8,
        hopTimer: Math.random() * 10,
        isHopping: false,
        pauseTimer: 0,
        active: false
      };
      this.respawnRabbit(rabbit);
      this.rabbits.push(rabbit);
      this.scene.add(rabbit.mesh);
    }
  }

  respawnRabbit(rabbit) {
    // 숲속 또는 산책로 주변에서 스폰
    const side = Math.random() > 0.5 ? 1 : -1;
    rabbit.x = side > 0 ? (10 + Math.random() * 30) : (-5 + Math.random() * 6);
    rabbit.z = (Math.random() - 0.5) * 80;

    // 반대편 또는 숲속 다른 지점으로 이동
    rabbit.targetX = side > 0 ? (-8 + Math.random() * 4) : (15 + Math.random() * 25);
    rabbit.targetZ = rabbit.z + (Math.random() - 0.5) * 30;

    rabbit.active = true;
    rabbit.pauseTimer = Math.random() * 3;
    const y = this.terrain.getHeight(rabbit.x, rabbit.z);
    rabbit.mesh.position.set(rabbit.x, y, rabbit.z);
  }

  // ==========================================
  // 2. 비행하는 새 (Flying Birds)
  // ==========================================
  createBirdMesh() {
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x486b5e, roughness: 0.7 });
    const wingMat = new THREE.MeshStandardMaterial({ color: 0x324d43, roughness: 0.8, side: THREE.DoubleSide });
    const beakMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x111111 });

    // 몸통
    const bodyGeo = new THREE.ConeGeometry(0.1, 0.35, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    // 머리
    const headGeo = new THREE.SphereGeometry(0.08, 8, 8);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 0.05, 0.16);
    group.add(head);

    // 부리
    const beakGeo = new THREE.ConeGeometry(0.03, 0.09, 4);
    beakGeo.rotateX(Math.PI / 2);
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0, 0.04, 0.26);
    group.add(beak);

    // 날개 (좌/우)
    const wingGeo = new THREE.PlaneGeometry(0.35, 0.16);
    wingGeo.translate(0.18, 0, 0);

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(0.06, 0.05, 0.02);
    group.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.rotation.y = Math.PI;
    rightWing.position.set(-0.06, 0.05, 0.02);
    group.add(rightWing);

    return { group, leftWing, rightWing };
  }

  initFlyingBirds(count) {
    for (let i = 0; i < count; i++) {
      const birdMesh = this.createBirdMesh();
      const bird = {
        mesh: birdMesh.group,
        leftWing: birdMesh.leftWing,
        rightWing: birdMesh.rightWing,
        x: 0,
        y: 0,
        z: 0,
        speed: 7.5 + Math.random() * 4.0,
        flightAngle: 0,
        flapSpeed: 14 + Math.random() * 4,
        animTime: Math.random() * 10
      };
      this.respawnFlyingBird(bird);
      this.flyingBirds.push(bird);
      this.scene.add(bird.mesh);
    }
  }

  respawnFlyingBird(bird) {
    // 숲 한쪽 상공에서 출발
    const angle = (Math.random() - 0.5) * Math.PI * 0.8;
    bird.flightAngle = angle;
    bird.x = -15 + Math.random() * 10;
    bird.z = -75 + Math.random() * 150;
    bird.y = 4.5 + Math.random() * 5.5;

    bird.mesh.position.set(bird.x, bird.y, bird.z);
    bird.mesh.rotation.y = Math.atan2(Math.sin(angle), Math.cos(angle)) + Math.PI / 2;
  }

  // ==========================================
  // 3. 지상 모이 쪼는 새 (Ground Birds)
  // ==========================================
  initGroundBirds(count) {
    for (let i = 0; i < count; i++) {
      const birdMesh = this.createBirdMesh();
      birdMesh.group.scale.set(0.8, 0.8, 0.8);
      const bird = {
        mesh: birdMesh.group,
        leftWing: birdMesh.leftWing,
        rightWing: birdMesh.rightWing,
        x: -5 + Math.random() * 15,
        z: (Math.random() - 0.5) * 50,
        peckTimer: Math.random() * 4,
        isFlushed: false, // 플레이어 접근 시 도망 플래그
        flushVelocity: new THREE.Vector3()
      };
      const y = this.terrain.getHeight(bird.x, bird.z);
      bird.mesh.position.set(bird.x, y + 0.1, bird.z);
      this.groundBirds.push(bird);
      this.scene.add(bird.mesh);
    }
  }

  // ==========================================
  // 전체 업데이트 루프
  // ==========================================
  update(delta, playerPos) {
    // 1. 토끼 깡총깡총 애니메이션 및 AI
    for (const rabbit of this.rabbits) {
      if (!rabbit.active) continue;

      if (rabbit.pauseTimer > 0) {
        rabbit.pauseTimer -= delta;
        // 멈춰 서서 귀 쫑긋거리기
        rabbit.leftEar.rotation.z = -0.15 + Math.sin(Date.now() * 0.006) * 0.08;
        rabbit.rightEar.rotation.z = 0.15 + Math.cos(Date.now() * 0.006) * 0.08;
        continue;
      }

      const dx = rabbit.targetX - rabbit.x;
      const dz = rabbit.targetZ - rabbit.z;
      const dist = Math.sqrt(dx * dx + dz * dz);

      if (dist < 1.0) {
        // 목표 도착 시 잠시 휴식 후 새 목적지
        rabbit.pauseTimer = 2.0 + Math.random() * 3.0;
        this.respawnRabbit(rabbit);
        continue;
      }

      // 회전
      const targetRotY = Math.atan2(dx, dz);
      rabbit.mesh.rotation.y = targetRotY;

      // 깡총 점프 모션 (Hop arc)
      rabbit.hopTimer += delta * 7.0;
      const hopY = Math.abs(Math.sin(rabbit.hopTimer)) * 0.22;
      const step = (rabbit.speed * delta);

      rabbit.x += (dx / dist) * step;
      rabbit.z += (dz / dist) * step;

      const groundY = this.terrain.getHeight(rabbit.x, rabbit.z);
      rabbit.mesh.position.set(rabbit.x, groundY + hopY, rabbit.z);

      // 점프할 때 귀 펄럭임
      const earFlap = Math.sin(rabbit.hopTimer) * 0.25;
      rabbit.leftEar.rotation.x = -0.2 - earFlap;
      rabbit.rightEar.rotation.x = -0.2 - earFlap;
    }

    // 2. 비행하는 새 애니메이션
    for (const bird of this.flyingBirds) {
      bird.animTime += delta;
      const moveX = Math.cos(bird.flightAngle) * bird.speed * delta;
      const moveZ = Math.sin(bird.flightAngle) * bird.speed * delta;

      bird.x += moveX;
      bird.z += moveZ;

      // 상하 완만한 부유
      const waveY = Math.sin(bird.animTime * 2.0) * 0.015;
      bird.y += waveY;

      bird.mesh.position.set(bird.x, bird.y, bird.z);

      // 날개 파닥이기
      const flap = Math.sin(bird.animTime * bird.flapSpeed) * 0.7;
      bird.leftWing.rotation.z = flap;
      bird.rightWing.rotation.z = -flap;

      // 맵 밖으로 벗어나면 리스폰
      if (bird.x > 65 || bird.x < -30 || bird.z > 80 || bird.z < -80) {
        this.respawnFlyingBird(bird);
      }
    }

    // 3. 지상 참새 (플레이어 감지 시 푸드득 날아감)
    for (const bird of this.groundBirds) {
      if (bird.isFlushed) {
        // 날아가기
        bird.mesh.position.addScaledVector(bird.flushVelocity, delta);
        const flap = Math.sin(Date.now() * 0.03) * 0.8;
        bird.leftWing.rotation.z = flap;
        bird.rightWing.rotation.z = -flap;

        if (bird.mesh.position.y > 16) {
          // 멀리 날아가면 리셋
          bird.isFlushed = false;
          bird.x = -6 + Math.random() * 20;
          bird.z = (Math.random() - 0.5) * 60;
          const y = this.terrain.getHeight(bird.x, bird.z);
          bird.mesh.position.set(bird.x, y + 0.1, bird.z);
        }
      } else {
        // 지상 모이 쪼기 & 플레이어 거리 체크
        const distToPlayer = bird.mesh.position.distanceTo(playerPos);
        if (distToPlayer < 4.0) {
          // 플레이어가 다가오면 푸드득 날아감!
          bird.isFlushed = true;
          bird.flushVelocity.set(
            (Math.random() - 0.5) * 6,
            4.0 + Math.random() * 3,
            (Math.random() - 0.5) * 6
          );
          bird.mesh.rotation.y = Math.atan2(bird.flushVelocity.x, bird.flushVelocity.z);
        } else {
          // 콕콕 모이 쪼기 애니메이션
          bird.peckTimer += delta;
          if (Math.sin(bird.peckTimer * 5.0) > 0.7) {
            bird.mesh.rotation.x = 0.45; // 고개 숙여 모이 쪼기
          } else {
            bird.mesh.rotation.x = 0;
          }
        }
      }
    }
  }
}
