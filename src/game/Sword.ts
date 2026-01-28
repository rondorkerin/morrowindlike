import * as THREE from 'three';

export class Sword {
  group: THREE.Group;
  isSwinging = false;
  swingProgress = 0;
  swingSpeed = 8;

  constructor() {
    this.group = new THREE.Group();

    const bladeMat = new THREE.MeshStandardMaterial({
      color: 0x8899aa,
      metalness: 0.8,
      roughness: 0.2
    });

    const handleMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      roughness: 0.9
    });

    const guardMat = new THREE.MeshStandardMaterial({
      color: 0x5a4a3a,
      metalness: 0.5,
      roughness: 0.5
    });

    // Blade
    const bladeGeo = new THREE.BoxGeometry(0.05, 0.8, 0.02);
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.position.y = 0.5;
    blade.castShadow = true;
    this.group.add(blade);

    // Blade tip (triangular)
    const tipGeo = new THREE.ConeGeometry(0.025, 0.15, 4);
    const tip = new THREE.Mesh(tipGeo, bladeMat);
    tip.position.y = 0.97;
    tip.rotation.y = Math.PI / 4;
    tip.castShadow = true;
    this.group.add(tip);

    // Guard (crossguard)
    const guardGeo = new THREE.BoxGeometry(0.2, 0.04, 0.04);
    const guard = new THREE.Mesh(guardGeo, guardMat);
    guard.position.y = 0.08;
    guard.castShadow = true;
    this.group.add(guard);

    // Handle
    const handleGeo = new THREE.CylinderGeometry(0.02, 0.025, 0.15, 8);
    const handle = new THREE.Mesh(handleGeo, handleMat);
    handle.position.y = -0.02;
    handle.castShadow = true;
    this.group.add(handle);

    // Pommel
    const pommelGeo = new THREE.SphereGeometry(0.03, 8, 8);
    const pommel = new THREE.Mesh(pommelGeo, guardMat);
    pommel.position.y = -0.12;
    pommel.castShadow = true;
    this.group.add(pommel);
  }

  swing() {
    if (!this.isSwinging) {
      this.isSwinging = true;
      this.swingProgress = 0;
    }
  }

  update(delta: number): boolean {
    let hitFrame = false;

    if (this.isSwinging) {
      this.swingProgress += delta * this.swingSpeed;

      // Swing arc
      const swingAngle = Math.sin(this.swingProgress * Math.PI) * 1.2;
      this.group.rotation.x = -swingAngle;

      // Hit detection happens at peak of swing
      if (this.swingProgress >= 0.4 && this.swingProgress < 0.6) {
        hitFrame = true;
      }

      if (this.swingProgress >= 1) {
        this.isSwinging = false;
        this.swingProgress = 0;
        this.group.rotation.x = 0;
      }
    }

    return hitFrame;
  }
}
