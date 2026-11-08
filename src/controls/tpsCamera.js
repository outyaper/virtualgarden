import * as THREE from 'three';

export class TPSCamera {
  constructor(camera, domElement) {
    this.camera = camera;
    this.domElement = domElement;

    // 카메라 각도 및 거리
    this.theta = Math.PI * 0.9; // 수평 회전각 (초기: 남서쪽 조망)
    this.phi = 0.28;            // 수직 피치각
    this.distance = 4.8;         // 캐릭터와의 기본 거리
    this.targetDistance = 4.8;

    this.targetLookAt = new THREE.Vector3();
    this.currentLookAt = new THREE.Vector3();

    // 마우스 드래그 상태
    this.isDragging = false;
    this.prevMousePos = { x: 0, y: 0 };

    this.initEvents();
  }

  initEvents() {
    this.domElement.addEventListener('mousedown', (e) => {
      // 캔버스 클릭 시
      if (e.button === 0) {
        this.isDragging = true;
        this.prevMousePos = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isDragging) return;
      const dx = e.clientX - this.prevMousePos.x;
      const dy = e.clientY - this.prevMousePos.y;

      this.theta -= dx * 0.005;
      this.phi += dy * 0.005;

      // 상하 회전각 제한 (-15도 ~ 70도)
      this.phi = Math.max(-0.15, Math.min(Math.PI * 0.38, this.phi));

      this.prevMousePos = { x: e.clientX, y: e.clientY };
    });

    // 휠 줌
    this.domElement.addEventListener('wheel', (e) => {
      e.preventDefault();
      this.targetDistance += e.deltaY * 0.005;
      this.targetDistance = Math.max(2.4, Math.min(9.0, this.targetDistance));
    }, { passive: false });

    // 모바일 터치 드래그 지원
    let touchStartX = 0, touchStartY = 0;
    this.domElement.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    });

    this.domElement.addEventListener('touchmove', (e) => {
      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        this.theta -= dx * 0.006;
        this.phi += dy * 0.006;
        this.phi = Math.max(-0.15, Math.min(Math.PI * 0.38, this.phi));
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }
    });
  }

  // 착석 시 감성적인 전경 앵글로 카메라 세팅
  setScenicView(benchRotationY) {
    // 벤치 측면에서 태화강과 캐릭터가 함께 보이는 황금 앵글
    this.theta = benchRotationY - Math.PI * 0.55;
    this.phi = 0.18;
    this.targetDistance = 4.0;
  }

  update(avatarPos, isSitting) {
    // 거리 보간
    this.distance += (this.targetDistance - this.distance) * 0.1;

    // 타겟 바라보는 위치 (캐릭터 상체 중심: y + 0.9)
    const targetY = avatarPos.y + (isSitting ? 0.75 : 0.95);
    this.targetLookAt.set(avatarPos.x, targetY, avatarPos.z);
    this.currentLookAt.lerp(this.targetLookAt, 0.12);

    // 구면 좌표계로부터 카메라 오프셋 계산
    const cosPhi = Math.cos(this.phi);
    const offsetX = this.distance * cosPhi * Math.sin(this.theta);
    const offsetY = this.distance * Math.sin(this.phi);
    const offsetZ = this.distance * cosPhi * Math.cos(this.theta);

    const desiredCamPos = new THREE.Vector3(
      this.currentLookAt.x + offsetX,
      this.currentLookAt.y + offsetY,
      this.currentLookAt.z + offsetZ
    );

    // 지형 아래로 파묻히지 않도록 카메라 최소 높이 보장
    if (desiredCamPos.y < avatarPos.y + 0.3) {
      desiredCamPos.y = avatarPos.y + 0.3;
    }

    this.camera.position.lerp(desiredCamPos, 0.15);
    this.camera.lookAt(this.currentLookAt);
  }

  getHorizontalAngle() {
    return this.theta;
  }
}
