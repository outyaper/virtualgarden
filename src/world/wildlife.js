import * as THREE from 'three';

export class WildlifeManager {
  constructor(scene, terrain) {
    this.scene = scene;
    this.terrain = terrain;

    this.rabbits = [];
    this.flyingBirds = [];
    this.groundBirds = [];

    this.initRabbits(5);
    this.initFlyingBirds(4);
    this.initGroundBirds(4);
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

    // 귀 (좌/우)
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

    // 꼬리
    const tailGeo = new THREE.SphereGeometry(0.06, 8, 8);
    const tail = new THREE.Mesh(tailGeo, furMat);
    tail.position.set(0, 0.18, -0.24);
    group.add(tail);

    group.scale.set(0.85, 0.85, 0.85);
    return { group, head, leftEar, rightEar, body };
  }

  initRabbits(count) {
    for (let i = 0; i < count; i++) {
      const rabbitMesh = this.createRabbitMesh();
      const rabbit = {
        mesh: rabbitMesh.group,
        head: rabbitMesh.head,
        body: rabbitMesh.body,
        leftEar: rabbitMesh.leftEar,
        rightEar: rabbitMesh.rightEar,
        x: 0,
        z: 0,
        state: 'sitting', // 'sitting' | 'hopping' | 'fleeing'
        fleeDir: new THREE.Vector2(),
        hopTimer: 0,
        sitTimer: 2.0 + Math.random() * 5.0,
        targetX: 0,
        targetZ: 0,
        alertness: 0
      };
      this.respawnRabbit(rabbit);
      this.rabbits.push(rabbit);
      this.scene.add(rabbit.mesh);
    }
  }

  respawnRabbit(rabbit) {
    // 산책로 주변 풀밭이나 숲속에 스폰
    rabbit.x = -5 + Math.random() * 35;
    rabbit.z = (Math.random() - 0.5) * 90;
    rabbit.state = 'sitting';
    rabbit.sitTimer = 3.0 + Math.random() * 6.0;
    rabbit.mesh.rotation.y = Math.random() * Math.PI * 2;

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

    const bodyGeo = new THREE.ConeGeometry(0.09, 0.32, 6);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    group.add(body);

    const headGeo = new THREE.SphereGeometry(0.075, 8, 8);
    const head = new THREE.Mesh(headGeo, bodyMat);
    head.position.set(0, 0.05, 0.15);
    group.add(head);

    const beakGeo = new THREE.ConeGeometry(0.025, 0.08, 4);
    beakGeo.rotateX(Math.PI / 2);
    const beak = new THREE.Mesh(beakGeo, beakMat);
    beak.position.set(0, 0.04, 0.24);
    group.add(beak);

    const wingGeo = new THREE.PlaneGeometry(0.32, 0.15);
    wingGeo.translate(0.16, 0, 0);

    const leftWing = new THREE.Mesh(wingGeo, wingMat);
    leftWing.position.set(0.05, 0.05, 0.02);
    group.add(leftWing);

    const rightWing = new THREE.Mesh(wingGeo, wingMat);
    rightWing.rotation.y = Math.PI;
    rightWing.position.set(-0.05, 0.05, 0.02);
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
        speed: 7.0 + Math.random() * 3.5,
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
    const angle = (Math.random() - 0.5) * Math.PI * 0.8;
    bird.flightAngle = angle;
    bird.x = -15 + Math.random() * 10;
    bird.z = -75 + Math.random() * 150;
    bird.y = 4.0 + Math.random() * 5.0;

    bird.mesh.position.set(bird.x, bird.y, bird.z);
    bird.mesh.rotation.y = Math.atan2(Math.sin(angle), Math.cos(angle)) + Math.PI / 2;
  }

  // ==========================================
  // 3. 지상 모이 쪼는 참새 (Ground Birds)
  // ==========================================
  initGroundBirds(count) {
    for (let i = 0; i < count; i++) {
      const birdMesh = this.createBirdMesh();
      birdMesh.group.scale.set(0.75, 0.75, 0.75);
      const bird = {
        mesh: birdMesh.group,
        leftWing: birdMesh.leftWing,
        rightWing: birdMesh.rightWing,
        x: -6 + Math.random() * 18,
        z: (Math.random() - 0.5) * 60,
        peckTimer: Math.random() * 4,
        isFlushed: false,
        flushVelocity: new THREE.Vector3()
      };
      const y = this.terrain.getHeight(bird.x, bird.z);
      bird.mesh.position.set(bird.x, y + 0.1, bird.z);
      this.groundBirds.push(bird);
      this.scene.add(bird.mesh);
    }
  }

  // ==========================================
  // 메인 업데이트 루프
  // ==========================================
  update(delta, playerPos) {
    const now = Date.now() * 0.001;

    // 1. 토끼 AI (평소에는 가만히 앉아있다가 캐릭터 접근 시 도망)
    for (const rabbit of this.rabbits) {
      const dxToPlayer = rabbit.x - playerPos.x;
      const dzToPlayer = rabbit.z - playerPos.z;
      const distToPlayer = Math.sqrt(dxToPlayer * dxToPlayer + dzToPlayer * dzToPlayer);

      // 플레이어가 4.6m 이내로 접근하면 도망치기(Flee) 모드 전환!
      if (distToPlayer < 4.6) {
        if (rabbit.state !== 'fleeing') {
          rabbit.state = 'fleeing';
          // 플레이어의 반대 방향으로 도망 벡터 설정
          rabbit.fleeDir.set(dxToPlayer, dzToPlayer).normalize();
          // 약간의 무작위 숲속 방향 가미
          rabbit.fleeDir.x += (Math.random() - 0.3) * 0.4;
          rabbit.fleeDir.y += (Math.random() - 0.5) * 0.4;
          rabbit.fleeDir.normalize();
        }
      }

      if (rabbit.state === 'sitting') {
        rabbit.sitTimer -= delta;

        // 가만히 앉아 숨쉬기 & 귀/고개 쫑긋거리기
        const breathe = Math.sin(now * 3.5) * 0.01;
        rabbit.head.position.y = 0.28 + breathe;
        rabbit.leftEar.rotation.z = -0.15 + Math.sin(now * 2.0) * 0.12;
        rabbit.rightEar.rotation.z = 0.15 + Math.cos(now * 2.2) * 0.12;

        // 일정 시간 앉아있은 후 아주 가끔 한두 걸음 가볍게 이동
        if (rabbit.sitTimer <= 0) {
          rabbit.state = 'hopping';
          rabbit.hopTimer = 0;
          // 주변 1.5m 이내로 짧게 이동
          const randAngle = Math.random() * Math.PI * 2;
          rabbit.targetX = rabbit.x + Math.cos(randAngle) * 1.5;
          rabbit.targetZ = rabbit.z + Math.sin(randAngle) * 1.5;
          rabbit.sitTimer = 4.0 + Math.random() * 6.0;
        }
      } else if (rabbit.state === 'hopping') {
        // 평화로운 짧은 깡총 이동
        rabbit.hopTimer += delta * 6.0;
        const dx = rabbit.targetX - rabbit.x;
        const dz = rabbit.targetZ - rabbit.z;
        const dist = Math.sqrt(dx * dx + dz * dz);

        if (dist < 0.2 || rabbit.hopTimer > Math.PI * 2) {
          rabbit.state = 'sitting';
          const groundY = this.terrain.getHeight(rabbit.x, rabbit.z);
          rabbit.mesh.position.y = groundY;
          continue;
        }

        rabbit.mesh.rotation.y = Math.atan2(dx, dz);
        const hopY = Math.abs(Math.sin(rabbit.hopTimer)) * 0.18;
        const speed = 1.6;
        rabbit.x += (dx / dist) * speed * delta;
        rabbit.z += (dz / dist) * speed * delta;

        const groundY = this.terrain.getHeight(rabbit.x, rabbit.z);
        rabbit.mesh.position.set(rabbit.x, groundY + hopY, rabbit.z);
      } else if (rabbit.state === 'fleeing') {
        // 캐릭터를 피해 펄쩍펄쩍 쏜살같이 도망치기!
        rabbit.hopTimer += delta * 11.5; // 매우 빠른 깡총 템포
        const fleeSpeed = 5.2;

        rabbit.x += rabbit.fleeDir.x * fleeSpeed * delta;
        rabbit.z += rabbit.fleeDir.y * fleeSpeed * delta;

        // 도망 방향 바라보기
        rabbit.mesh.rotation.y = Math.atan2(rabbit.fleeDir.x, rabbit.fleeDir.y);

        // 높은 점프 & 귀 펄럭임
        const hopY = Math.abs(Math.sin(rabbit.hopTimer)) * 0.32;
        const groundY = this.terrain.getHeight(rabbit.x, rabbit.z);
        rabbit.mesh.position.set(rabbit.x, groundY + hopY, rabbit.z);

        const earFlap = Math.sin(rabbit.hopTimer) * 0.45;
        rabbit.leftEar.rotation.x = -0.4 - earFlap;
        rabbit.rightEar.rotation.x = -0.4 - earFlap;

        // 플레이어와 충분히 멀어지면(8.5m 이상) 다시 멈추어 앉기
        if (distToPlayer > 8.5) {
          rabbit.state = 'sitting';
          rabbit.sitTimer = 5.0 + Math.random() * 5.0;
          rabbit.mesh.position.y = groundY;
          rabbit.leftEar.rotation.x = -0.2;
          rabbit.rightEar.rotation.x = -0.2;
        }

        // 맵 가장자리로 너무 멀리 가면 리스폰
        if (rabbit.x > 55 || rabbit.x < -10 || rabbit.z > 70 || rabbit.z < -70) {
          this.respawnRabbit(rabbit);
        }
      }
    }

    // 2. 비행하는 새 애니메이션
    for (const bird of this.flyingBirds) {
      bird.animTime += delta;
      const moveX = Math.cos(bird.flightAngle) * bird.speed * delta;
      const moveZ = Math.sin(bird.flightAngle) * bird.speed * delta;

      bird.x += moveX;
      bird.z += moveZ;

      const waveY = Math.sin(bird.animTime * 2.0) * 0.015;
      bird.y += waveY;

      bird.mesh.position.set(bird.x, bird.y, bird.z);

      const flap = Math.sin(bird.animTime * bird.flapSpeed) * 0.7;
      bird.leftWing.rotation.z = flap;
      bird.rightWing.rotation.z = -flap;

      if (bird.x > 65 || bird.x < -30 || bird.z > 80 || bird.z < -80) {
        this.respawnFlyingBird(bird);
      }
    }

    // 3. 지상 참새 (플레이어 감지 시 푸드득 날아감)
    for (const bird of this.groundBirds) {
      if (bird.isFlushed) {
        bird.mesh.position.addScaledVector(bird.flushVelocity, delta);
        const flap = Math.sin(Date.now() * 0.035) * 0.85;
        bird.leftWing.rotation.z = flap;
        bird.rightWing.rotation.z = -flap;

        if (bird.mesh.position.y > 15) {
          bird.isFlushed = false;
          bird.x = -5 + Math.random() * 22;
          bird.z = (Math.random() - 0.5) * 60;
          const y = this.terrain.getHeight(bird.x, bird.z);
          bird.mesh.position.set(bird.x, y + 0.1, bird.z);
        }
      } else {
        const distToPlayer = bird.mesh.position.distanceTo(playerPos);
        if (distToPlayer < 4.2) {
          // 캐릭터가 다가오면 짹짹거리며 푸드득 날아오름
          bird.isFlushed = true;
          bird.flushVelocity.set(
            (Math.random() - 0.5) * 7,
            4.5 + Math.random() * 3.5,
            (Math.random() - 0.5) * 7
          );
          bird.mesh.rotation.y = Math.atan2(bird.flushVelocity.x, bird.flushVelocity.z);
        } else {
          bird.peckTimer += delta;
          if (Math.sin(bird.peckTimer * 5.0) > 0.65) {
            bird.mesh.rotation.x = 0.45;
          } else {
            bird.mesh.rotation.x = 0;
          }
        }
      }
    }
  }
}
