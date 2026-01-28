import * as THREE from 'three';
import { LootManager, TreasureChest } from './LootSystem';
import { Item } from './Inventory';

// Procedural Skeleton enemy
class Skeleton {
  group: THREE.Group;
  position: THREE.Vector3;
  health = 40;
  maxHealth = 40;
  damage = 12;
  speed = 4;
  attackRange = 2.0;
  aggroRange = 12;
  attackCooldown = 0;
  isAggro = false;
  isDead = false;
  isBoss = false;

  body: THREE.Mesh;
  head: THREE.Mesh;

  constructor(position: THREE.Vector3, isBoss = false) {
    this.group = new THREE.Group();
    this.position = position.clone();
    this.isBoss = isBoss;

    if (isBoss) {
      this.health = 120;
      this.maxHealth = 120;
      this.damage = 20;
      this.aggroRange = 20;
      this.attackRange = 2.5;
    }

    const boneMat = new THREE.MeshStandardMaterial({
      color: 0xF5F5DC,
      roughness: 0.8
    });

    const scale = isBoss ? 1.5 : 1.0;

    // Head (sphere with dark eye sockets)
    const headGeo = new THREE.SphereGeometry(0.15 * scale, 8, 8);
    this.head = new THREE.Mesh(headGeo, boneMat);
    this.head.position.y = 1.6 * scale;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Eye sockets (dark spheres)
    const eyeGeo = new THREE.SphereGeometry(0.03 * scale, 6, 6);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: isBoss ? 0xff0000 : 0x1a1a1a,
      emissive: isBoss ? 0xff0000 : 0x000000,
      emissiveIntensity: isBoss ? 0.5 : 0
    });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.06 * scale, 0, 0.12 * scale);
    this.head.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.06 * scale, 0, 0.12 * scale);
    this.head.add(rightEye);

    // Spine/torso (thin cylinder)
    const spineGeo = new THREE.CylinderGeometry(0.06 * scale, 0.08 * scale, 0.6 * scale, 8);
    this.body = new THREE.Mesh(spineGeo, boneMat);
    this.body.position.y = 1.2 * scale;
    this.body.castShadow = true;
    this.group.add(this.body);

    // Ribs (curved thin cylinders)
    const ribGeo = new THREE.CylinderGeometry(0.02 * scale, 0.02 * scale, 0.3 * scale, 6);
    for (let i = 0; i < 4; i++) {
      const leftRib = new THREE.Mesh(ribGeo, boneMat);
      leftRib.position.set(-0.15 * scale, 1.3 * scale - i * 0.12 * scale, 0);
      leftRib.rotation.z = Math.PI / 4;
      this.group.add(leftRib);

      const rightRib = new THREE.Mesh(ribGeo, boneMat);
      rightRib.position.set(0.15 * scale, 1.3 * scale - i * 0.12 * scale, 0);
      rightRib.rotation.z = -Math.PI / 4;
      this.group.add(rightRib);
    }

    // Arms (thin cylinders)
    const armGeo = new THREE.CylinderGeometry(0.03 * scale, 0.03 * scale, 0.5 * scale, 6);
    const leftArm = new THREE.Mesh(armGeo, boneMat);
    leftArm.position.set(-0.25 * scale, 1.3 * scale, 0);
    leftArm.rotation.z = Math.PI / 6;
    leftArm.castShadow = true;
    this.group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, boneMat);
    rightArm.position.set(0.25 * scale, 1.3 * scale, 0);
    rightArm.rotation.z = -Math.PI / 6;
    rightArm.castShadow = true;
    this.group.add(rightArm);

    // Legs (thin cylinders)
    const legGeo = new THREE.CylinderGeometry(0.04 * scale, 0.04 * scale, 0.8 * scale, 6);
    const leftLeg = new THREE.Mesh(legGeo, boneMat);
    leftLeg.position.set(-0.1 * scale, 0.5 * scale, 0);
    leftLeg.castShadow = true;
    this.group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, boneMat);
    rightLeg.position.set(0.1 * scale, 0.5 * scale, 0);
    rightLeg.castShadow = true;
    this.group.add(rightLeg);

    this.group.position.copy(position);
    this.group.scale.setScalar(scale);
  }

  update(delta: number, playerPosition: THREE.Vector3): { attacked: boolean; damage: number } {
    if (this.isDead) return { attacked: false, damage: 0 };

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

    const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.position);
    toPlayer.y = 0;
    const distance = toPlayer.length();

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
      this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);
    } else if (this.isAggro && distance <= this.attackRange) {
      // Attack
      if (this.attackCooldown <= 0) {
        attacked = true;
        damageDealt = this.damage;
        this.attackCooldown = 1.5;

        // Attack animation
        this.body.position.y = 1.3;
        setTimeout(() => {
          if (!this.isDead) this.body.position.y = 1.2;
        }, 100);
      }
    }

    this.group.position.copy(this.position);
    return { attacked, damage: damageDealt };
  }

  takeDamage(amount: number): boolean {
    this.health -= amount;
    this.isAggro = true;

    // Flash red
    const origColor = (this.body.material as THREE.MeshStandardMaterial).color.getHex();
    (this.body.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
    setTimeout(() => {
      if (!this.isDead) {
        (this.body.material as THREE.MeshStandardMaterial).color.setHex(origColor);
      }
    }, 100);

    if (this.health <= 0) {
      this.isDead = true;
      // Death animation - collapse
      this.group.rotation.x = Math.PI / 2;
      this.group.position.y -= 0.5;
      return true;
    }
    return false;
  }
}

// Procedural Spider enemy
class Spider {
  group: THREE.Group;
  position: THREE.Vector3;
  health = 25;
  maxHealth = 25;
  damage = 8;
  speed = 6;
  attackRange = 1.5;
  aggroRange = 10;
  attackCooldown = 0;
  isAggro = false;
  isDead = false;

  body: THREE.Mesh;
  legs: THREE.Mesh[] = [];

  constructor(position: THREE.Vector3) {
    this.group = new THREE.Group();
    this.position = position.clone();

    const spiderMat = new THREE.MeshStandardMaterial({
      color: 0x2a2a2a,
      roughness: 0.9
    });

    // Body (dark sphere)
    const bodyGeo = new THREE.SphereGeometry(0.3, 8, 8);
    this.body = new THREE.Mesh(bodyGeo, spiderMat);
    this.body.scale.set(1.2, 0.8, 1);
    this.body.position.y = 0.3;
    this.body.castShadow = true;
    this.group.add(this.body);

    // Eyes (small red glowing dots)
    const eyeGeo = new THREE.SphereGeometry(0.02, 6, 6);
    const eyeMat = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xff0000,
      emissiveIntensity: 0.5
    });

    const eyePositions = [
      [-0.08, 0.35, 0.25],
      [-0.04, 0.35, 0.28],
      [0.04, 0.35, 0.28],
      [0.08, 0.35, 0.25]
    ];

    for (const [x, y, z] of eyePositions) {
      const eye = new THREE.Mesh(eyeGeo, eyeMat);
      eye.position.set(x, y, z);
      this.group.add(eye);
    }

    // 8 legs (thin cylinders at angles)
    const legGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6);
    const legAngles = [0, Math.PI / 4, Math.PI / 2, (3 * Math.PI) / 4, Math.PI, (5 * Math.PI) / 4, (3 * Math.PI) / 2, (7 * Math.PI) / 4];

    for (const angle of legAngles) {
      const leg = new THREE.Mesh(legGeo, spiderMat);
      const x = Math.cos(angle) * 0.25;
      const z = Math.sin(angle) * 0.25;
      leg.position.set(x, 0.2, z);

      // Angle legs outward and down
      const legRotX = -Math.PI / 3;
      const legRotZ = Math.atan2(z, x) + Math.PI / 2;
      leg.rotation.set(legRotX, 0, legRotZ);

      leg.castShadow = true;
      this.legs.push(leg);
      this.group.add(leg);
    }

    this.group.position.copy(position);
  }

  update(delta: number, playerPosition: THREE.Vector3): { attacked: boolean; damage: number } {
    if (this.isDead) return { attacked: false, damage: 0 };

    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

    const toPlayer = new THREE.Vector3().subVectors(playerPosition, this.position);
    toPlayer.y = 0;
    const distance = toPlayer.length();

    if (distance < this.aggroRange) {
      this.isAggro = true;
    }

    let attacked = false;
    let damageDealt = 0;

    if (this.isAggro && distance > this.attackRange) {
      // Chase player (faster than skeleton)
      toPlayer.normalize();
      this.position.x += toPlayer.x * this.speed * delta;
      this.position.z += toPlayer.z * this.speed * delta;

      // Face player
      this.group.rotation.y = Math.atan2(toPlayer.x, toPlayer.z);

      // Animate legs
      this.legs.forEach((leg, i) => {
        leg.rotation.x = -Math.PI / 3 + Math.sin(delta * 20 + i) * 0.2;
      });
    } else if (this.isAggro && distance <= this.attackRange) {
      // Attack
      if (this.attackCooldown <= 0) {
        attacked = true;
        damageDealt = this.damage;
        this.attackCooldown = 0.8;

        // Lunge animation
        this.body.position.y = 0.4;
        setTimeout(() => {
          if (!this.isDead) this.body.position.y = 0.3;
        }, 100);
      }
    }

    this.group.position.copy(this.position);
    return { attacked, damage: damageDealt };
  }

  takeDamage(amount: number): boolean {
    this.health -= amount;
    this.isAggro = true;

    // Flash red
    (this.body.material as THREE.MeshStandardMaterial).color.setHex(0xff0000);
    setTimeout(() => {
      if (!this.isDead) {
        (this.body.material as THREE.MeshStandardMaterial).color.setHex(0x2a2a2a);
      }
    }, 100);

    if (this.health <= 0) {
      this.isDead = true;
      // Death animation - shrivel
      this.group.scale.set(0.5, 0.2, 0.5);
      this.group.position.y -= 0.2;
      return true;
    }
    return false;
  }
}

// Torch with animated flame
class Torch {
  group: THREE.Group;
  light: THREE.PointLight;
  flame: THREE.Mesh;
  flickerTime = 0;
  baseIntensity = 1.5;

  constructor(position: THREE.Vector3) {
    this.group = new THREE.Group();

    // Base (cylinder)
    const baseGeo = new THREE.CylinderGeometry(0.05, 0.08, 0.4, 8);
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a, roughness: 0.9 });
    const base = new THREE.Mesh(baseGeo, baseMat);
    base.position.y = 0.2;
    base.castShadow = true;
    this.group.add(base);

    // Flame (cone with emissive orange)
    const flameGeo = new THREE.ConeGeometry(0.08, 0.2, 8);
    const flameMat = new THREE.MeshStandardMaterial({
      color: 0xff6600,
      emissive: 0xff4400,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.9
    });
    this.flame = new THREE.Mesh(flameGeo, flameMat);
    this.flame.position.y = 0.5;
    this.group.add(this.flame);

    // Point light
    this.light = new THREE.PointLight(0xff6600, this.baseIntensity, 15);
    this.light.position.y = 0.5;
    this.group.add(this.light);

    this.group.position.copy(position);
  }

  update(delta: number) {
    // Flicker animation
    this.flickerTime += delta * 10;
    const flicker = Math.sin(this.flickerTime) * 0.3 + Math.sin(this.flickerTime * 2.3) * 0.2;
    this.light.intensity = this.baseIntensity + flicker;

    // Flame scale animation
    this.flame.scale.y = 1 + Math.sin(this.flickerTime * 1.5) * 0.1;
  }
}

export class Cave {
  scene: THREE.Scene;
  entrancePosition = new THREE.Vector3(15, 0, -10);
  caveOffset = new THREE.Vector3(500, 0, 500);
  playerInCave = false;

  // Cave geometry
  entranceGroup: THREE.Group;
  caveGroup: THREE.Group;
  exitPortal!: THREE.Mesh;

  // Enemies
  skeletons: Skeleton[] = [];
  spiders: Spider[] = [];
  boss: Skeleton | null = null;
  bossDefeated = false;

  // Torches
  torches: Torch[] = [];

  // Lighting
  overworldLights: THREE.Light[] = [];

  // Entrance label
  entranceLabel: HTMLElement;

  // Boss chest
  bossChest: TreasureChest | null = null;

  constructor(scene: THREE.Scene, getTerrainHeight?: (x: number, z: number) => number) {
    this.scene = scene;
    this.entranceGroup = new THREE.Group();
    this.caveGroup = new THREE.Group();

    // Set entrance Y to terrain height
    if (getTerrainHeight) {
      this.entrancePosition.y = getTerrainHeight(this.entrancePosition.x, this.entrancePosition.z);
    }

    this.createEntranceOverworld();
    this.createCaveInterior();

    this.scene.add(this.entranceGroup);
    this.scene.add(this.caveGroup);

    // Create entrance label
    this.entranceLabel = document.createElement('div');
    this.entranceLabel.style.position = 'fixed';
    this.entranceLabel.style.color = '#FFD700';
    this.entranceLabel.style.fontFamily = 'Georgia, serif';
    this.entranceLabel.style.fontSize = '16px';
    this.entranceLabel.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    this.entranceLabel.style.pointerEvents = 'none';
    this.entranceLabel.style.zIndex = '100';
    this.entranceLabel.style.display = 'none';
    this.entranceLabel.textContent = 'Cave Entrance';
    document.body.appendChild(this.entranceLabel);
  }

  createEntranceOverworld() {
    const rockMat = new THREE.MeshStandardMaterial({
      color: 0x6a6a6a,
      roughness: 1.0,
      flatShading: true
    });

    const darkRockMat = new THREE.MeshStandardMaterial({
      color: 0x4a4a4a,
      roughness: 1.0,
      flatShading: true
    });

    // Main mountain body - large cone
    const mountainGeo = new THREE.ConeGeometry(12, 20, 8);
    const mountain = new THREE.Mesh(mountainGeo, rockMat);
    mountain.position.set(0, 8, -4);
    mountain.castShadow = true;
    mountain.receiveShadow = true;
    this.entranceGroup.add(mountain);

    // Secondary peak offset to the right (makes it look more natural)
    const peak2Geo = new THREE.ConeGeometry(8, 14, 7);
    const peak2 = new THREE.Mesh(peak2Geo, darkRockMat);
    peak2.position.set(6, 5, -6);
    peak2.castShadow = true;
    this.entranceGroup.add(peak2);

    // Smaller rocky outcrop on left
    const peak3Geo = new THREE.ConeGeometry(5, 10, 6);
    const peak3 = new THREE.Mesh(peak3Geo, rockMat);
    peak3.position.set(-5, 3, -3);
    peak3.castShadow = true;
    this.entranceGroup.add(peak3);

    // Boulder clusters around the base
    const boulderGeo = new THREE.DodecahedronGeometry(2, 0);
    const boulderPositions = [
      [-8, 1, 2], [9, 1.2, 1], [-4, 0.8, 4], [6, 0.8, 5],
      [-10, 0.6, 0], [11, 0.7, -2], [0, 1, 5], [-6, 0.5, 6]
    ];
    for (const [bx, by, bz] of boulderPositions) {
      const boulder = new THREE.Mesh(boulderGeo, darkRockMat);
      boulder.position.set(bx, by, bz);
      boulder.scale.set(0.6 + Math.random() * 0.5, 0.4 + Math.random() * 0.3, 0.6 + Math.random() * 0.5);
      boulder.rotation.set(Math.random(), Math.random(), Math.random());
      boulder.castShadow = true;
      this.entranceGroup.add(boulder);
    }

    // Rock face around the cave opening (frame the dark hole)
    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 1.0,
      flatShading: true
    });

    // Left wall of opening
    const leftWallGeo = new THREE.BoxGeometry(2, 5, 3);
    const leftWall = new THREE.Mesh(leftWallGeo, frameMat);
    leftWall.position.set(-2.5, 2.5, 0);
    leftWall.castShadow = true;
    this.entranceGroup.add(leftWall);

    // Right wall of opening
    const rightWall = new THREE.Mesh(leftWallGeo, frameMat);
    rightWall.position.set(2.5, 2.5, 0);
    rightWall.castShadow = true;
    this.entranceGroup.add(rightWall);

    // Arch above opening
    const archGeo = new THREE.BoxGeometry(7, 2, 3);
    const arch = new THREE.Mesh(archGeo, frameMat);
    arch.position.set(0, 5.5, 0);
    arch.castShadow = true;
    this.entranceGroup.add(arch);

    // Rock overhang above arch
    const overhangGeo = new THREE.DodecahedronGeometry(3, 0);
    const overhang = new THREE.Mesh(overhangGeo, rockMat);
    overhang.position.set(0, 7, 0.5);
    overhang.scale.set(1.5, 0.6, 1);
    overhang.castShadow = true;
    this.entranceGroup.add(overhang);

    // Dark cave opening (recessed black plane)
    const openingGeo = new THREE.PlaneGeometry(3.5, 4.5);
    const openingMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const opening = new THREE.Mesh(openingGeo, openingMat);
    opening.position.set(0, 2.5, 0.5);
    this.entranceGroup.add(opening);

    // Ground-level rock ramp leading to opening
    const rampGeo = new THREE.BoxGeometry(5, 0.3, 4);
    const ramp = new THREE.Mesh(rampGeo, darkRockMat);
    ramp.position.set(0, 0.15, 2);
    ramp.receiveShadow = true;
    this.entranceGroup.add(ramp);

    // Set entrance group position using terrain height
    this.entranceGroup.position.copy(this.entrancePosition);
  }

  createCaveInterior() {
    const wallMat = new THREE.MeshStandardMaterial({
      color: 0x4a4030,
      roughness: 1.0
    });

    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x3a3030,
      roughness: 1.0
    });

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x2a2020,
      roughness: 1.0,
      side: THREE.DoubleSide
    });

    // Room 1 (entry, 15x15) at cave offset
    this.createRoom(0, 0, 15, 15, floorMat, wallMat, ceilingMat);

    // Exit portal in Room 1 (south wall)
    const portalGeo = new THREE.PlaneGeometry(2, 3);
    const portalMat = new THREE.MeshStandardMaterial({
      color: 0x6699ff,
      emissive: 0x4477ff,
      emissiveIntensity: 0.8,
      transparent: true,
      opacity: 0.7
    });
    this.exitPortal = new THREE.Mesh(portalGeo, portalMat);
    this.exitPortal.position.copy(this.caveOffset);
    this.exitPortal.position.z -= 7;
    this.exitPortal.position.y = 1.5;
    this.caveGroup.add(this.exitPortal);

    // Corridor 1 (5x15 going north)
    this.createCorridor(0, 7.5, 5, 15, floorMat, wallMat, ceilingMat, true);

    // Room 2 (20x20)
    this.createRoom(0, 22.5, 20, 20, floorMat, wallMat, ceilingMat);

    // Corridor 2 (15x5 going east)
    this.createCorridor(17.5, 22.5, 15, 5, floorMat, wallMat, ceilingMat, false);

    // Room 3 (25x25, boss room)
    this.createRoom(37.5, 22.5, 25, 25, floorMat, wallMat, ceilingMat);

    // Place torches
    this.placeTorches();

    // Spawn enemies
    this.spawnEnemies();
  }

  createRoom(offsetX: number, offsetZ: number, width: number, depth: number, floorMat: THREE.Material, wallMat: THREE.Material, ceilingMat: THREE.Material) {
    const x = this.caveOffset.x + offsetX;
    const z = this.caveOffset.z + offsetZ;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(width, depth);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, 0, z);
    floor.receiveShadow = true;
    this.caveGroup.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(floorGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(x, 4, z);
    this.caveGroup.add(ceiling);

    // Walls (4 sides)
    const wallHeight = 4;

    // North wall
    const northGeo = new THREE.BoxGeometry(width, wallHeight, 0.5);
    const northWall = new THREE.Mesh(northGeo, wallMat);
    northWall.position.set(x, wallHeight / 2, z + depth / 2);
    northWall.castShadow = true;
    northWall.receiveShadow = true;
    this.caveGroup.add(northWall);

    // South wall
    const southWall = new THREE.Mesh(northGeo, wallMat);
    southWall.position.set(x, wallHeight / 2, z - depth / 2);
    southWall.castShadow = true;
    southWall.receiveShadow = true;
    this.caveGroup.add(southWall);

    // East wall
    const eastGeo = new THREE.BoxGeometry(0.5, wallHeight, depth);
    const eastWall = new THREE.Mesh(eastGeo, wallMat);
    eastWall.position.set(x + width / 2, wallHeight / 2, z);
    eastWall.castShadow = true;
    eastWall.receiveShadow = true;
    this.caveGroup.add(eastWall);

    // West wall
    const westWall = new THREE.Mesh(eastGeo, wallMat);
    westWall.position.set(x - width / 2, wallHeight / 2, z);
    westWall.castShadow = true;
    westWall.receiveShadow = true;
    this.caveGroup.add(westWall);
  }

  createCorridor(offsetX: number, offsetZ: number, width: number, depth: number, floorMat: THREE.Material, wallMat: THREE.Material, ceilingMat: THREE.Material, vertical: boolean) {
    const x = this.caveOffset.x + offsetX;
    const z = this.caveOffset.z + offsetZ;

    // Floor
    const floorGeo = new THREE.PlaneGeometry(width, depth);
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(x, 0, z);
    floor.receiveShadow = true;
    this.caveGroup.add(floor);

    // Ceiling
    const ceiling = new THREE.Mesh(floorGeo, ceilingMat);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.set(x, 4, z);
    this.caveGroup.add(ceiling);

    const wallHeight = 4;

    if (vertical) {
      // East and West walls for vertical corridor
      const sideGeo = new THREE.BoxGeometry(0.5, wallHeight, depth);
      const eastWall = new THREE.Mesh(sideGeo, wallMat);
      eastWall.position.set(x + width / 2, wallHeight / 2, z);
      eastWall.castShadow = true;
      eastWall.receiveShadow = true;
      this.caveGroup.add(eastWall);

      const westWall = new THREE.Mesh(sideGeo, wallMat);
      westWall.position.set(x - width / 2, wallHeight / 2, z);
      westWall.castShadow = true;
      westWall.receiveShadow = true;
      this.caveGroup.add(westWall);
    } else {
      // North and South walls for horizontal corridor
      const sideGeo = new THREE.BoxGeometry(width, wallHeight, 0.5);
      const northWall = new THREE.Mesh(sideGeo, wallMat);
      northWall.position.set(x, wallHeight / 2, z + depth / 2);
      northWall.castShadow = true;
      northWall.receiveShadow = true;
      this.caveGroup.add(northWall);

      const southWall = new THREE.Mesh(sideGeo, wallMat);
      southWall.position.set(x, wallHeight / 2, z - depth / 2);
      southWall.castShadow = true;
      southWall.receiveShadow = true;
      this.caveGroup.add(southWall);
    }
  }

  placeTorches() {
    // Room 1 torches
    const room1TorchPositions = [
      [-5, 1.5, -5],
      [5, 1.5, -5],
      [-5, 1.5, 5],
      [5, 1.5, 5]
    ];

    for (const [x, y, z] of room1TorchPositions) {
      const torch = new Torch(new THREE.Vector3(
        this.caveOffset.x + x,
        y,
        this.caveOffset.z + z
      ));
      this.torches.push(torch);
      this.caveGroup.add(torch.group);
    }

    // Room 2 torches
    const room2TorchPositions = [
      [-8, 1.5, 22.5 - 8],
      [8, 1.5, 22.5 - 8],
      [-8, 1.5, 22.5 + 8],
      [8, 1.5, 22.5 + 8],
      [0, 1.5, 22.5 - 8],
      [0, 1.5, 22.5 + 8]
    ];

    for (const [x, y, z] of room2TorchPositions) {
      const torch = new Torch(new THREE.Vector3(
        this.caveOffset.x + x,
        y,
        this.caveOffset.z + z
      ));
      this.torches.push(torch);
      this.caveGroup.add(torch.group);
    }

    // Room 3 (boss room) torches - more dramatic lighting
    const room3TorchPositions = [
      [37.5 - 10, 1.5, 22.5 - 10],
      [37.5 + 10, 1.5, 22.5 - 10],
      [37.5 - 10, 1.5, 22.5 + 10],
      [37.5 + 10, 1.5, 22.5 + 10],
      [37.5 - 10, 1.5, 22.5],
      [37.5 + 10, 1.5, 22.5],
      [37.5, 1.5, 22.5 - 10],
      [37.5, 1.5, 22.5 + 10]
    ];

    for (const [x, y, z] of room3TorchPositions) {
      const torch = new Torch(new THREE.Vector3(
        this.caveOffset.x + x,
        y,
        this.caveOffset.z + z
      ));
      this.torches.push(torch);
      this.caveGroup.add(torch.group);
    }
  }

  spawnEnemies() {
    // 3 Spiders in Room 1
    const room1SpiderPositions = [
      [-3, 0, -3],
      [3, 0, 2],
      [0, 0, 4]
    ];

    for (const [x, y, z] of room1SpiderPositions) {
      const spider = new Spider(new THREE.Vector3(
        this.caveOffset.x + x,
        y,
        this.caveOffset.z + z
      ));
      this.spiders.push(spider);
      this.caveGroup.add(spider.group);
    }

    // 2 Skeletons in Room 2
    const room2SkeletonPositions = [
      [-5, 0, 22.5 - 5],
      [5, 0, 22.5 + 5]
    ];

    for (const [x, y, z] of room2SkeletonPositions) {
      const skeleton = new Skeleton(new THREE.Vector3(
        this.caveOffset.x + x,
        y,
        this.caveOffset.z + z
      ));
      this.skeletons.push(skeleton);
      this.caveGroup.add(skeleton.group);
    }

    // Boss in Room 3
    this.boss = new Skeleton(new THREE.Vector3(
      this.caveOffset.x + 37.5,
      0,
      this.caveOffset.z + 22.5
    ), true);
    this.caveGroup.add(this.boss.group);
  }

  enterCave(player: any) {
    this.playerInCave = true;

    // Teleport player to cave entry room
    player.position.set(
      this.caveOffset.x,
      0.9,
      this.caveOffset.z
    );

    // Store and remove overworld lights
    this.overworldLights = [];
    this.scene.traverse((obj) => {
      if (obj instanceof THREE.Light && !this.caveGroup.children.includes(obj)) {
        this.overworldLights.push(obj);
      }
    });

    this.overworldLights.forEach(light => {
      this.scene.remove(light);
    });

    // Remove fog
    this.scene.fog = null;
    this.scene.background = new THREE.Color(0x000000);
  }

  exitCave(player: any) {
    this.playerInCave = false;

    // Teleport player back to overworld in front of cave
    player.position.set(
      this.entrancePosition.x,
      this.entrancePosition.y + 1,
      this.entrancePosition.z + 8
    );

    // Restore overworld lights
    this.overworldLights.forEach(light => {
      this.scene.add(light);
    });
    this.overworldLights = [];

    // Restore fog and sky
    this.scene.fog = new THREE.Fog(0x87ceeb, 80, 200);
    this.scene.background = new THREE.Color(0x87ceeb);
  }

  update(delta: number, playerPos: THREE.Vector3, camera: THREE.Camera, canvas: HTMLCanvasElement) {
    // Update torches
    this.torches.forEach(torch => torch.update(delta));

    // Animate exit portal
    if (this.exitPortal) {
      (this.exitPortal.material as THREE.MeshStandardMaterial).emissiveIntensity =
        0.8 + Math.sin(Date.now() * 0.003) * 0.2;
    }

    if (this.playerInCave) {
      // Update enemies
      this.spiders = this.spiders.filter(spider => {
        if (spider.isDead) {
          setTimeout(() => {
            this.caveGroup.remove(spider.group);
          }, 5000);
          return false;
        }
        return true;
      });

      this.skeletons = this.skeletons.filter(skeleton => {
        if (skeleton.isDead) {
          setTimeout(() => {
            this.caveGroup.remove(skeleton.group);
          }, 5000);
          return false;
        }
        return true;
      });

      // Check boss death
      if (this.boss && this.boss.isDead && !this.bossDefeated) {
        this.bossDefeated = true;
        setTimeout(() => {
          if (this.boss) this.caveGroup.remove(this.boss.group);
        }, 5000);
      }
    } else {
      // Update entrance label - show from up to 20 units away
      const distToEntrance = playerPos.distanceTo(this.entrancePosition);
      if (distToEntrance < 20) {
        const vector = this.entrancePosition.clone();
        vector.y += 8;
        vector.project(camera);

        const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
        const y = (-(vector.y * 0.5) + 0.5) * canvas.clientHeight;

        this.entranceLabel.style.left = `${x}px`;
        this.entranceLabel.style.top = `${y}px`;
        this.entranceLabel.style.display = 'block';
        this.entranceLabel.textContent = distToEntrance < 6
          ? '[E] Enter Cave'
          : 'Cave Entrance';
      } else {
        this.entranceLabel.style.display = 'none';
      }
    }
  }

  isPlayerInCave(): boolean {
    return this.playerInCave;
  }

  getEnemies(): Array<Skeleton | Spider> {
    const enemies: Array<Skeleton | Spider> = [];

    if (this.playerInCave) {
      enemies.push(...this.spiders.filter(s => !s.isDead));
      enemies.push(...this.skeletons.filter(s => !s.isDead));
      if (this.boss && !this.boss.isDead) {
        enemies.push(this.boss);
      }
    }

    return enemies;
  }

  checkEntrance(playerPos: THREE.Vector3): boolean {
    const distance = playerPos.distanceTo(this.entrancePosition);
    return distance < 6 && !this.playerInCave;
  }

  checkExit(playerPos: THREE.Vector3): boolean {
    if (!this.playerInCave) return false;
    const exitPos = new THREE.Vector3(
      this.caveOffset.x,
      0,
      this.caveOffset.z - 7
    );
    const distance = playerPos.distanceTo(exitPos);
    return distance < 2;
  }

  // Add chests to cave (call this from external loot manager)
  addChests(lootManager: LootManager) {
    // Room 1 chest (unlocked)
    const room1Items: Item[] = [
      {
        id: 'health_potion',
        name: 'Restore Health Potion',
        type: 'potion',
        weight: 0.5,
        value: 20,
        stackable: true,
        healthRestore: 25,
        quantity: 1
      },
      {
        id: 'gold',
        name: 'Gold',
        type: 'gold',
        weight: 0,
        value: 1,
        stackable: true,
        quantity: 15
      }
    ];

    lootManager.addChest(
      new THREE.Vector3(this.caveOffset.x - 5, 0, this.caveOffset.z + 5),
      room1Items,
      this.scene,
      false,
      0
    );

    // Room 2 chest (locked level 25)
    const room2Items: Item[] = [
      {
        id: 'steel_sword',
        name: 'Steel Long Sword',
        type: 'weapon',
        weight: 10,
        value: 60,
        stackable: false,
        weaponType: 'longBlade',
        damage: 18,
        quantity: 1
      },
      {
        id: 'gold',
        name: 'Gold',
        type: 'gold',
        weight: 0,
        value: 1,
        stackable: true,
        quantity: 30
      },
      {
        id: 'health_potion',
        name: 'Restore Health Potion',
        type: 'potion',
        weight: 0.5,
        value: 20,
        stackable: true,
        healthRestore: 25,
        quantity: 1
      }
    ];

    lootManager.addChest(
      new THREE.Vector3(this.caveOffset.x + 8, 0, this.caveOffset.z + 22.5),
      room2Items,
      this.scene,
      true,
      25
    );

    // Store reference to boss chest (spawns after boss dies)
    const room3Items: Item[] = [
      {
        id: 'gold',
        name: 'Gold',
        type: 'gold',
        weight: 0,
        value: 1,
        stackable: true,
        quantity: 100
      },
      {
        id: 'health_potion',
        name: 'Restore Health Potion',
        type: 'potion',
        weight: 0.5,
        value: 20,
        stackable: true,
        healthRestore: 25,
        quantity: 2
      },
      {
        id: 'ruby',
        name: 'Ruby',
        type: 'misc',
        weight: 0.1,
        value: 100,
        stackable: true,
        quantity: 1
      }
    ];

    // Note: This chest should be spawned when boss is defeated
    // Store position and items for later
    this.bossChest = lootManager.addChest(
      new THREE.Vector3(this.caveOffset.x + 37.5, 0, this.caveOffset.z + 22.5 + 8),
      room3Items,
      this.scene,
      true,
      50
    );

    // Hide boss chest initially
    if (this.bossChest) {
      this.bossChest.mesh.visible = false;
    }
  }

  // Check if boss is defeated and show boss chest
  checkBossChest() {
    if (this.bossDefeated && this.bossChest && !this.bossChest.mesh.visible) {
      this.bossChest.mesh.visible = true;
    }
  }

  cleanup() {
    this.entranceLabel.remove();
    this.scene.remove(this.entranceGroup);
    this.scene.remove(this.caveGroup);
  }
}
