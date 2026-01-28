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

  constructor(
    model: CharacterModel,
    startPosition: THREE.Vector3,
    wanderRadius: number,
    getTerrainHeight: (x: number, z: number) => number
  ) {
    this.model = model;
    this.getTerrainHeight = getTerrainHeight;

    // Get proper ground height at start position
    const groundY = getTerrainHeight(startPosition.x, startPosition.z);
    this.position = new THREE.Vector3(startPosition.x, groundY, startPosition.z);
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
    if (this.waitTime > 0) {
      this.waitTime -= delta;
      this.model.update(delta, false, false);

      // Keep on ground even when waiting
      this.position.y = this.getTerrainHeight(this.position.x, this.position.z);
      this.model.setPosition(this.position.x, this.position.y, this.position.z);
      return;
    }

    const direction = new THREE.Vector3()
      .subVectors(this.targetPosition, this.position);
    direction.y = 0;

    const distance = direction.length();

    if (distance < 0.5) {
      this.pickNewTarget();
      return;
    }

    direction.normalize();

    // Move
    this.position.x += direction.x * this.speed * delta;
    this.position.z += direction.z * this.speed * delta;

    // Always stick to terrain
    this.position.y = this.getTerrainHeight(this.position.x, this.position.z);

    // Face movement direction
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
    // Spawn some villagers
    for (let i = 0; i < 5; i++) {
      const x = (Math.random() - 0.5) * 60;
      const z = (Math.random() - 0.5) * 60;
      const y = getTerrainHeight(x, z);

      if (y > 0) {
        const model = createVillager();
        const npc = new NPC(model, new THREE.Vector3(x, y, z), 15, getTerrainHeight);
        this.npcs.push(npc);
        this.scene.add(model.group);
      }
    }

    // Spawn some guards
    for (let i = 0; i < 3; i++) {
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;
      const y = getTerrainHeight(x, z);

      if (y > 0) {
        const model = createGuard();
        const npc = new NPC(model, new THREE.Vector3(x, y, z), 8, getTerrainHeight);
        npc.speed = 2.5;
        this.npcs.push(npc);
        this.scene.add(model.group);
      }
    }

    // Spawn some Dunmer
    for (let i = 0; i < 4; i++) {
      const x = (Math.random() - 0.5) * 80;
      const z = (Math.random() - 0.5) * 80;
      const y = getTerrainHeight(x, z);

      if (y > 0) {
        const model = createDunmer();
        const npc = new NPC(model, new THREE.Vector3(x, y, z), 20, getTerrainHeight);
        this.npcs.push(npc);
        this.scene.add(model.group);
      }
    }
  }

  update(delta: number, getTerrainHeight: (x: number, z: number) => number) {
    for (const npc of this.npcs) {
      npc.update(delta);
    }
  }
}
