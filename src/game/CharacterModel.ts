import * as THREE from 'three';

// Procedurally generated humanoid character model
// All geometry is code-defined - no external assets needed

export class CharacterModel {
  group: THREE.Group;

  // Body parts for animation
  head: THREE.Mesh;
  torso: THREE.Mesh;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;

  // Animation state
  walkCycle = 0;

  constructor(options: {
    skinColor?: number;
    clothColor?: number;
    height?: number;
  } = {}) {
    const {
      skinColor = 0x8d6e5a,
      clothColor = 0x4a3728,
      height = 1.8
    } = options;

    this.group = new THREE.Group();
    const scale = height / 1.8;

    // Materials
    const skinMat = new THREE.MeshStandardMaterial({
      color: skinColor,
      roughness: 0.7,
      metalness: 0.1
    });

    const clothMat = new THREE.MeshStandardMaterial({
      color: clothColor,
      roughness: 0.8,
      metalness: 0.0
    });

    const bootMat = new THREE.MeshStandardMaterial({
      color: 0x2a1a0a,
      roughness: 0.9,
      metalness: 0.0
    });

    // Head
    const headGeo = new THREE.BoxGeometry(0.25, 0.3, 0.25);
    this.head = new THREE.Mesh(headGeo, skinMat);
    this.head.position.y = 1.6 * scale;
    this.head.castShadow = true;
    this.group.add(this.head);

    // Hair/hood (simple cap shape)
    const hoodGeo = new THREE.SphereGeometry(0.18, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2);
    const hood = new THREE.Mesh(hoodGeo, clothMat);
    hood.position.y = 0.1;
    hood.scale.set(1, 0.6, 1);
    this.head.add(hood);

    // Eyes (simple dark spots)
    const eyeGeo = new THREE.SphereGeometry(0.025, 6, 6);
    const eyeMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.06, 0.05, 0.12);
    this.head.add(leftEye);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.06, 0.05, 0.12);
    this.head.add(rightEye);

    // Torso
    const torsoGeo = new THREE.BoxGeometry(0.4, 0.5, 0.25);
    this.torso = new THREE.Mesh(torsoGeo, clothMat);
    this.torso.position.y = 1.2 * scale;
    this.torso.castShadow = true;
    this.group.add(this.torso);

    // Belt
    const beltGeo = new THREE.BoxGeometry(0.42, 0.08, 0.27);
    const beltMat = new THREE.MeshStandardMaterial({ color: 0x3a2a1a });
    const belt = new THREE.Mesh(beltGeo, beltMat);
    belt.position.y = -0.22;
    this.torso.add(belt);

    // Left Arm
    this.leftArm = this.createArm(skinMat, clothMat, scale);
    this.leftArm.position.set(-0.28 * scale, 1.35 * scale, 0);
    this.group.add(this.leftArm);

    // Right Arm
    this.rightArm = this.createArm(skinMat, clothMat, scale);
    this.rightArm.position.set(0.28 * scale, 1.35 * scale, 0);
    this.group.add(this.rightArm);

    // Left Leg
    this.leftLeg = this.createLeg(clothMat, bootMat, scale);
    this.leftLeg.position.set(-0.1 * scale, 0.9 * scale, 0);
    this.group.add(this.leftLeg);

    // Right Leg
    this.rightLeg = this.createLeg(clothMat, bootMat, scale);
    this.rightLeg.position.set(0.1 * scale, 0.9 * scale, 0);
    this.group.add(this.rightLeg);

    this.group.scale.setScalar(scale);
  }

  createArm(skinMat: THREE.Material, clothMat: THREE.Material, scale: number): THREE.Group {
    const arm = new THREE.Group();

    // Upper arm (sleeve)
    const upperGeo = new THREE.BoxGeometry(0.12, 0.3, 0.12);
    const upper = new THREE.Mesh(upperGeo, clothMat);
    upper.position.y = -0.15;
    upper.castShadow = true;
    arm.add(upper);

    // Lower arm (skin)
    const lowerGeo = new THREE.BoxGeometry(0.1, 0.25, 0.1);
    const lower = new THREE.Mesh(lowerGeo, skinMat);
    lower.position.y = -0.42;
    lower.castShadow = true;
    arm.add(lower);

    // Hand
    const handGeo = new THREE.BoxGeometry(0.08, 0.12, 0.05);
    const hand = new THREE.Mesh(handGeo, skinMat);
    hand.position.y = -0.6;
    hand.castShadow = true;
    arm.add(hand);

    return arm;
  }

  createLeg(clothMat: THREE.Material, bootMat: THREE.Material, scale: number): THREE.Group {
    const leg = new THREE.Group();

    // Upper leg (pants)
    const upperGeo = new THREE.BoxGeometry(0.14, 0.35, 0.14);
    const upper = new THREE.Mesh(upperGeo, clothMat);
    upper.position.y = -0.18;
    upper.castShadow = true;
    leg.add(upper);

    // Lower leg (pants)
    const lowerGeo = new THREE.BoxGeometry(0.12, 0.35, 0.12);
    const lower = new THREE.Mesh(lowerGeo, clothMat);
    lower.position.y = -0.52;
    lower.castShadow = true;
    leg.add(lower);

    // Boot
    const bootGeo = new THREE.BoxGeometry(0.13, 0.15, 0.18);
    const boot = new THREE.Mesh(bootGeo, bootMat);
    boot.position.set(0, -0.76, 0.02);
    boot.castShadow = true;
    leg.add(boot);

    return leg;
  }

  // Animate walk cycle
  update(delta: number, isMoving: boolean, isRunning: boolean) {
    const speed = isRunning ? 12 : 6;

    if (isMoving) {
      this.walkCycle += delta * speed;
    } else {
      // Smoothly return to idle
      this.walkCycle *= 0.9;
    }

    const swing = Math.sin(this.walkCycle) * 0.5;
    const armSwing = Math.sin(this.walkCycle) * 0.3;

    // Leg animation
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = -swing;

    // Arm swing (opposite to legs)
    this.leftArm.rotation.x = -armSwing;
    this.rightArm.rotation.x = armSwing;

    // Subtle body bob
    this.torso.position.y = 1.2 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.02;
    this.head.position.y = 1.6 + Math.abs(Math.sin(this.walkCycle * 2)) * 0.02;
  }

  setPosition(x: number, y: number, z: number) {
    this.group.position.set(x, y, z);
  }

  setRotation(y: number) {
    this.group.rotation.y = y;
  }
}

// Factory for creating different NPC types
export function createVillager(): CharacterModel {
  return new CharacterModel({
    skinColor: 0xDEB887,
    clothColor: 0x8B4513,
    height: 1.75
  });
}

export function createGuard(): CharacterModel {
  return new CharacterModel({
    skinColor: 0xD2B48C,
    clothColor: 0x4169E1,
    height: 1.85
  });
}

export function createMerchant(): CharacterModel {
  return new CharacterModel({
    skinColor: 0xF5DEB3,
    clothColor: 0x8B0000,
    height: 1.7
  });
}

export function createDunmer(): CharacterModel {
  // Dark elf style - grayish skin, purple clothes
  return new CharacterModel({
    skinColor: 0x9090A0,
    clothColor: 0x4B0082,
    height: 1.8
  });
}
