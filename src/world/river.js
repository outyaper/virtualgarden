import * as THREE from 'three';

export class River {
  constructor(scene) {
    this.scene = scene;
    this.mesh = null;
    this.waterMaterial = null;
    this.init();
  }

  init() {
    const riverWidth = 70;
    const riverLength = 170;
    const geometry = new THREE.PlaneGeometry(riverWidth, riverLength, 64, 64);
    geometry.rotateX(-Math.PI / 2);

    // 커스텀 물결 셰이더 재질
    this.waterMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uWaterColor: { value: new THREE.Color(0x286378) },
        uDeepColor: { value: new THREE.Color(0x133845) },
        uSunColor: { value: new THREE.Color(0xfff3d1) },
        uSunDirection: { value: new THREE.Vector3(0.5, 0.8, 0.3).normalize() }
      },
      vertexShader: `
        uniform float uTime;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;

        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // 부드러운 다중 주파수 잔물결 계산
          float wave1 = sin(pos.x * 0.4 + uTime * 1.8) * 0.12;
          float wave2 = cos(pos.z * 0.3 + uTime * 1.4) * 0.15;
          float wave3 = sin((pos.x + pos.z) * 0.6 + uTime * 2.2) * 0.08;
          
          pos.y += wave1 + wave2 + wave3;
          
          vec4 worldPos = modelMatrix * vec4(pos, 1.0);
          vWorldPosition = worldPos.xyz;
          
          // 파도 기울기에 따른 근사 노멀
          vec3 n = normal;
          n.x += cos(pos.x * 0.4 + uTime * 1.8) * 0.05;
          n.z += -sin(pos.z * 0.3 + uTime * 1.4) * 0.05;
          vNormal = normalize(normalMatrix * n);
          
          gl_Position = projectionMatrix * viewMatrix * worldPos;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform vec3 uWaterColor;
        uniform vec3 uDeepColor;
        uniform vec3 uSunColor;
        uniform vec3 uSunDirection;
        varying vec3 vWorldPosition;
        varying vec3 vNormal;
        varying vec2 vUv;

        void main() {
          vec3 viewDir = normalize(cameraPosition - vWorldPosition);
          
          // 프레넬 효과 (시선 각도에 따른 반사율)
          float fresnel = pow(1.0 - max(dot(viewDir, vNormal), 0.0), 3.0);
          
          // 태양광 스펙큘러 하이라이트 (물결 위 반짝임)
          vec3 reflectDir = reflect(-uSunDirection, vNormal);
          float spec = pow(max(dot(viewDir, reflectDir), 0.0), 32.0);
          
          // 깊이별 색상 그라데이션
          vec3 waterCol = mix(uDeepColor, uWaterColor, fresnel * 0.7 + 0.3);
          vec3 finalColor = waterCol + uSunColor * spec * 0.8;
          
          gl_FragColor = vec4(finalColor, 0.85);
        }
      `,
      transparent: true,
      side: THREE.DoubleSide
    });

    this.mesh = new THREE.Mesh(geometry, this.waterMaterial);
    // 태화강 위치 (x: -50, y: -0.2 수면 높이)
    this.mesh.position.set(-52, -0.2, 0);
    this.scene.add(this.mesh);
  }

  update(delta) {
    if (this.waterMaterial) {
      this.waterMaterial.uniforms.uTime.value += delta;
    }
  }
}
