import * as THREE from 'three';
import { CharacterModel, createVillager, createGuard, createDunmer } from './CharacterModel';

export class NPC {
  model: CharacterModel;
  position: THREE.Vector3;
  targetPosition: THREE.Vector3;
  speed = 2;
  waitTime = 0;
  wanderRadius: number;
  homePosition: THREE.Vector3;
  getTerrainHeight: (x: number, z: number) => number;

  // Smooth ground following
  currentGroundY = 0;
  groundLerpSpeed = 10;

  constructor(
    model: CharacterModel,
    startPosition: THREE.Vector3,
    wanderRadius: number,
    getTerrainHeight: (x: number, z: number) => number
  ) {
    this.model = model;
    this.getTerrainHeight = getTerrainHeight;

    const groundY = getTerrainHeight(startPosition.x, startPosition.z);
    this.position = new THREE.Vector3(startPosition.x, groundY, startPosition.z);
    this.currentGroundY = groundY;
    this.homePosition = this.position.clone();
    this.targetPosition = this.position.clone();
    this.wanderRadius = wanderRadius;

    this.model.setPosition(this.position.x, this.position.y, this.position.z);
    this.pickNewTarget();
  }

  pickNewTarget() {
    const angle = Math.random() * Math.PI * 2;
    const distance = Math.random() * this.wanderRadius;

    const newX = this.homePosition.x + Math.cos(angle) * distance;
    const newZ = this.homePosition.z + Math.sin(angle) * distance;
    const newY = this.getTerrainHeight(newX, newZ);

    this.targetPosition.set(newX, newY, newZ);
    this.waitTime = 2 + Math.random() * 4;
  }

  update(delta: number) {
    // Get current terrain height
    const targetY = this.getTerrainHeight(this.position.x, this.position.z);

    // Smooth interpolation to terrain
    this.currentGroundY += (targetY - this.currentGroundY) * this.groundLerpSpeed * delta;
    this.position.y = this.currentGroundY;

    if (this.waitTime > 0) {
      this.waitTime -= delta;
      this.model.update(delta, false, false);
      this.model.setPosition(this.position.x, this.position.y, this.position.z);
      return;
    }

    const direction = new THREE.Vector3().subVectors(this.targetPosition, this.position);
    direction.y = 0;
    const distance = direction.length();

    if (distance < 0.5) {
      this.pickNewTarget();
      return;
    }

    direction.normalize();

    this.position.x += direction.x * this.speed * delta;
    this.position.z += direction.z * this.speed * delta;

    const angle = Math.atan2(direction.x, direction.z);
    this.model.setRotation(angle);

    this.model.setPosition(this.position.x, this.position.y, this.position.z);
    this.model.update(delta, true, false);
  }
}

export class NPCManager {
  npcs: NPC[] = [];
  scene: THREE.Scene;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  spawnNPCs(getTerrainHeight: (x: number, z: number) => number) {
    for (let i = 0; i < 5; i++) {
      const angle = i * 0.618033 * Math.PI * 2;
      const radius = 20 + i * 8;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = getTerrainHeight(x, z);

      if (y > 0) {
        const model = createVillager();
        const npc = new NPC(model, new THREE.Vector3(x, y, z), 15, getTerrainHeight);
        this.npcs.push(npc);
        this.scene.add(model.group);
      }
    }

    for (let i = 0; i < 3; i++) {
      const angle = i * 0.753 * Math.PI * 2 + 0.5;
      const radius = 15 + i * 6;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = getTerrainHeight(x, z);

      if (y > 0) {
        const model = createGuard();
        const npc = new NPC(model, new THREE.Vector3(x, y, z), 8, getTerrainHeight);
        npc.speed = 2.5;
        this.npcs.push(npc);
        this.scene.add(model.group);
      }
    }

    for (let i = 0; i < 4; i++) {
      const angle = i * 0.9 * Math.PI * 2 + 1;
      const radius = 30 + i * 10;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = getTerrainHeight(x, z);

      if (y > 0) {
        const model = createDunmer();
        const npc = new NPC(model, new THREE.Vector3(x, y, z), 20, getTerrainHeight);
        this.npcs.push(npc);
        this.scene.add(model.group);
      }
    }
  }

  update(delta: number) {
    for (const npc of this.npcs) {
      npc.update(delta);
    }
  }
}
