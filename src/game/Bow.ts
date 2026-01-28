import * as THREE from 'three';

interface Arrow {
  mesh: THREE.Group;
  velocity: THREE.Vector3;
  damage: number;
  lifetime: number;
  stuck: boolean;
}

export class Bow {
  scene: THREE.Scene;
  group: THREE.Group;
  arrows: Arrow[] = [];
  arrowCount = 30;

  isDrawing = false;
  drawTime = 0;
  maxDrawTime = 1.0; // 1 second for full draw

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.group = new THREE.Group();

    // Bow material - brown wood
    const bowMat = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.7,
    });

    // Bow limb - curved arc using TorusGeometry segment
    const torusGeo = new THREE.TorusGeometry(0.3, 0.015, 8, 16, Math.PI);
    const bowArc = new THREE.Mesh(torusGeo, bowMat);
    bowArc.rotation.z = Math.PI / 2;
    bowArc.position.y = 0.3;
    bowArc.castShadow = true;
    this.group.add(bowArc);

    // Bow string (thin line)
    const stringMat = new THREE.MeshStandardMaterial({
      color: 0xEEEEEE,
      roughness: 0.9,
    });
    const stringGeo = new THREE.CylinderGeometry(0.005, 0.005, 0.6, 4);
    const bowString = new THREE.Mesh(stringGeo, stringMat);
    bowString.position.y = 0.3;
    bowString.castShadow = true;
    this.group.add(bowString);

    // Grip area (darker)
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x3a2a1a,
      roughness: 0.9,
    });
    const gripGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.1, 8);
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.y = 0.3;
    grip.castShadow = true;
    this.group.add(grip);
  }

  draw(isDrawing: boolean) {
    this.isDrawing = isDrawing;
    if (!isDrawing) {
      this.drawTime = 0;
    }
  }

  release(playerPos: THREE.Vector3, direction: THREE.Vector3) {
    if (this.arrowCount <= 0) return;
    if (this.drawTime < 0.1) return; // Must draw a minimum amount

    // Calculate damage based on draw time
    const drawProgress = Math.min(this.drawTime / this.maxDrawTime, 1.0);
    const damage = 10 + (20 * drawProgress); // 10-30 damage

    // Create arrow
    const arrow = this.createArrowMesh();

    // Position arrow slightly ahead of player
    arrow.position.copy(playerPos);
    arrow.position.y += 1.5; // Eye level

    // Orient arrow in direction
    const lookTarget = new THREE.Vector3()
      .copy(direction)
      .add(arrow.position);
    arrow.lookAt(lookTarget);
    arrow.rotateX(Math.PI / 2); // Adjust for model orientation

    this.scene.add(arrow);

    // Calculate velocity - stronger draw = faster arrow
    const speed = 20 + (10 * drawProgress); // 20-30 units/sec
    const velocity = direction.clone().multiplyScalar(speed);

    this.arrows.push({
      mesh: arrow,
      velocity: velocity.clone(),
      damage,
      lifetime: 0,
      stuck: false,
    });

    this.arrowCount--;
    this.drawTime = 0;
  }

  createArrowMesh(): THREE.Group {
    const arrowGroup = new THREE.Group();

    // Shaft material - wooden
    const shaftMat = new THREE.MeshStandardMaterial({
      color: 0x8B7355,
      roughness: 0.8,
    });

    // Arrow shaft - thin cylinder
    const shaftGeo = new THREE.CylinderGeometry(0.01, 0.01, 0.5, 6);
    const shaft = new THREE.Mesh(shaftGeo, shaftMat);
    shaft.castShadow = true;
    arrowGroup.add(shaft);

    // Arrow tip - cone
    const tipMat = new THREE.MeshStandardMaterial({
      color: 0x888888,
      metalness: 0.6,
      roughness: 0.3,
    });
    const tipGeo = new THREE.ConeGeometry(0.02, 0.1, 6);
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.y = 0.3;
    tip.castShadow = true;
    arrowGroup.add(tip);

    // Fletching (small fins at back)
    const fletchMat = new THREE.MeshStandardMaterial({
      color: 0xFF0000,
      roughness: 0.9,
    });
    const fletchGeo = new THREE.BoxGeometry(0.05, 0.01, 0.001);
    const fletch1 = new THREE.Mesh(fletchGeo, fletchMat);
    fletch1.position.y = -0.2;
    arrowGroup.add(fletch1);

    const fletch2 = new THREE.Mesh(fletchGeo, fletchMat);
    fletch2.position.y = -0.2;
    fletch2.rotation.y = Math.PI / 2;
    arrowGroup.add(fletch2);

    arrowGroup.scale.set(0.8, 0.8, 0.8);

    return arrowGroup;
  }

  update(delta: number, enemies: any[]) {
    // Update draw time
    if (this.isDrawing && this.drawTime < this.maxDrawTime) {
      this.drawTime += delta;
    }

    // Update arrows in flight
    for (let i = this.arrows.length - 1; i >= 0; i--) {
      const arrow = this.arrows[i];
      arrow.lifetime += delta;

      // Remove arrows after 3 seconds if stuck, or 10 seconds if still flying
      if ((arrow.stuck && arrow.lifetime > 3) || arrow.lifetime > 10) {
        this.scene.remove(arrow.mesh);
        this.arrows.splice(i, 1);
        continue;
      }

      if (arrow.stuck) continue;

      // Apply gravity
      arrow.velocity.y -= 9.8 * delta;

      // Update position
      const movement = arrow.velocity.clone().multiplyScalar(delta);
      arrow.mesh.position.add(movement);

      // Update rotation to match velocity direction
      const lookTarget = new THREE.Vector3()
        .copy(arrow.mesh.position)
        .add(arrow.velocity.normalize());
      arrow.mesh.lookAt(lookTarget);
      arrow.mesh.rotateX(Math.PI / 2);

      // Check ground collision
      if (arrow.mesh.position.y < 0.1) {
        arrow.mesh.position.y = 0.1;
        arrow.stuck = true;
        arrow.velocity.set(0, 0, 0);
        continue;
      }

      // Check enemy collisions
      for (const enemy of enemies) {
        if (enemy.isDead) continue;

        const distance = arrow.mesh.position.distanceTo(enemy.position);
        if (distance < 1.5) {
          // Hit!
          if (enemy.takeDamage) {
            enemy.takeDamage(arrow.damage);
          }

          // Stick arrow in place
          arrow.stuck = true;
          arrow.velocity.set(0, 0, 0);
          arrow.lifetime = 0; // Reset lifetime for stuck timer
          break;
        }
      }
    }
  }

  getArrowCount(): number {
    return this.arrowCount;
  }

  addArrows(count: number) {
    this.arrowCount += count;
  }

  getDrawProgress(): number {
    return Math.min(this.drawTime / this.maxDrawTime, 1.0);
  }
}
