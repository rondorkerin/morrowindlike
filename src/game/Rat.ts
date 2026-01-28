import * as THREE from 'three';

export class Rat {
  group: THREE.Group;
  position: THREE.Vector3;
  health = 20;
  maxHealth = 20;
  damage = 5;
  speed = 6;
  attackRange = 1.5;
  aggroRange = 15;
  attackCooldown = 0;
  isAggro = false;
  isDead = false;

  // Animation
  walkCycle = 0;
  body: THREE.Mesh;
  tail: THREE.Mesh;

  constructor(position: THREE.Vector3) {
    this.group = new THREE.Group();
    this.position = position.clone();

    const furMat = new THREE.MeshStandardMaterial({
      color: 0x8B7355,
      roughness: 0.9
    });

    const noseMat = new THREE.MeshStandardMaterial({
      color: 0x4a3a2a,
      roughness: 0.7
    });

    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0x660000
    });

    // Body
    const bodyGeo = new THREE.SphereGeometry(0.3, 8, 6);
    this.body = new THREE.Mesh(bodyGeo, furMat);
    this.body.scale.set(1.5, 0.8, 1);
    this.body.position.y = 0.25;
    this.body.castShadow = true;
    this.group.add(this.body);

    // Head
    const headGeo = new THREE.SphereGeometry(0.2, 8, 6);
    const head = new THREE.Mesh(headGeo, furMat);
    head.position.set(0.35, 0.3, 0);
    head.scale.set(1.2, 1, 1);
    head.castShadow = true;
    this.group.add(head);

    // Snout
    const snoutGeo = new THREE.ConeGeometry(0.08, 0.2, 6);
    const snout = new THREE.Mesh(snoutGeo, furMat);
    snout.rotation.z = -Math.PI / 2;
    snout.position.set(0.55, 0.28, 0);
    snout.castShadow = true;
    this.group.add(snout);

    // Nose
    const noseGeo = new THREE.SphereGeometry(0.03, 6, 6);
    const nose = new THREE.Mesh(noseGeo, noseMat);
    nose.position.set(0.65, 0.28, 0);
    this.group.add(nose);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.04, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(0.45, 0.38, 0.1);
    this.group.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.45, 0.38, -0.1);
    this.group.add(rightEye);

    // Ears
    const earGeo = new THREE.SphereGeometry(0.08, 6, 6);
    const leftEar = new THREE.Mesh(earGeo, furMat);
    leftEar.position.set(0.25, 0.45, 0.12);
    leftEar.scale.set(0.5, 1, 0.5);
    this.group.add(leftEar);
    const rightEar = new THREE.Mesh(earGeo, furMat);
    rightEar.position.set(0.25, 0.45, -0.12);
    rightEar.scale.set(0.5, 1, 0.5);
    this.group.add(rightEar);

    // Tail
    const tailGeo = new THREE.CylinderGeometry(0.02, 0.04, 0.5, 6);
    this.tail = new THREE.Mesh(tailGeo, noseMat);
    this.tail.rotation.z = Math.PI / 3;
    this.tail.position.set(-0.5, 0.25, 0);
    this.tail.castShadow = true;
    this.group.add(this.tail);

    // Legs
    const legGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.15, 6);
    const legPositions = [
      [0.2, 0.07, 0.15],
      [0.2, 0.07, -0.15],
      [-0.15, 0.07, 0.15],
      [-0.15, 0.07, -0.15]
    ];
    for (const [x, y, z] of legPositions) {
      const leg = new THREE.Mesh(legGeo, furMat);
      leg.position.set(x, y, z);
      leg.castShadow = true;
      this.group.add(leg);
    }

    this.group.position.copy(position);
  }

  update(
    delta: number,
    playerPosition: THREE.Vector3,
    getTerrainHeight: (x: number, z: number) => number
  ): { attacked: boolean; damage: number } {
    if (this.isDead) return { attacked: false, damage: 0 };

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

    const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.position);
    toPlayer.y = 0;
    const distance = toPlayer.length();

    // Aggro check
    if (distance < this.aggroRange) {
      this.isAggro = true;
    }

    let attacked = false;
    let damageDealt = 0;

    if (this.isAggro && distance > this.attackRange) {
      // Chase player
      toPlayer.normalize();
      this.position.x += toPlayer.x * this.speed * delta;
      this.position.z += toPlayer.z * this.speed * delta;

      // Face player
      this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z) - Math.PI / 2;

      // Animate
      this.walkCycle += delta * 15;
      this.body.position.y = 0.25 + Math.sin(this.walkCycle) * 0.03;
      this.tail.rotation.z = Math.PI / 3 + Math.sin(this.walkCycle * 2) * 0.3;
    } else if (this.isAggro && distance <= this.attackRange) {
      // Attack
      if (this.attackCooldown <= 0) {
        attacked = true;
        damageDealt = this.damage;
        this.attackCooldown = 1;

        // Lunge animation
        this.body.position.y = 0.35;
      }
    }

    // Stick to terrain
    this.position.y = getTerrainHeight(this.position.x, this.position.z);
    this.group.position.copy(this.position);

    return { attacked, damage: damageDealt };
  }

  takeDamage(amount: number): boolean {
    this.health -= amount;
    this.isAggro = true;

    // Flash red
    this.body.material = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      roughness: 0.9
    });
    setTimeout(() => {
      if (!this.isDead) {
        (this.body.material as THREE.MeshStandardMaterial).color.setHex(0x8B7355);
      }
    }, 100);

    if (this.health <= 0) {
      this.isDead = true;
      // Death animation - fall over
      this.group.rotation.z = Math.PI / 2;
      this.group.position.y -= 0.1;
      return true;
    }
    return false;
  }
}

export class RatManager {
  rats: Rat[] = [];
  scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawnRats(count: number, getTerrainHeight: (x: number, z: number) => number) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 15 + Math.random() * 30;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = getTerrainHeight(x, z);

      if (y > -1) {
        const rat = new Rat(new THREE.Vector3(x, y, z));
        this.rats.push(rat);
        this.scene.add(rat.group);
      }
    }
  }

  update(
    delta: number,
    playerPosition: THREE.Vector3,
    getTerrainHeight: (x: number, z: number) => number
  ): { totalDamage: number } {
    let totalDamage = 0;

    for (const rat of this.rats) {
      const result = rat.update(delta, playerPosition, getTerrainHeight);
      if (result.attacked) {
        totalDamage += result.damage;
      }
    }

    return { totalDamage };
  }

  getRatsInRange(position: THREE.Vector3, range: number): Rat[] {
    return this.rats.filter(rat => {
      if (rat.isDead) return false;
      const dist = rat.position.distanceTo(position);
      return dist <= range;
    });
  }

  removeDeadRats() {
    this.rats = this.rats.filter(rat => {
      if (rat.isDead) {
        // Keep corpse visible but remove from active list after delay
        setTimeout(() => {
          this.scene.remove(rat.group);
        }, 5000);
        return false;
      }
      return true;
    });
  }
}
