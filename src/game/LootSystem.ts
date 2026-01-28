import * as THREE from 'three';
import { Item } from './Inventory';

// Drop table entry
interface DropTableEntry {
  item: Omit<Item, 'quantity'>;
  weight: number;
  minCount: number;
  maxCount: number;
}

// Drop tables per enemy type
const DROP_TABLES: Record<string, DropTableEntry[]> = {
  rat: [
    {
      item: {
        id: 'gold',
        name: 'Gold',
        type: 'gold',
        weight: 0,
        value: 1,
        stackable: true,
      },
      weight: 80,
      minCount: 5,
      maxCount: 15,
    },
    {
      item: {
        id: 'health_potion',
        name: 'Restore Health Potion',
        type: 'potion',
        weight: 0.5,
        value: 20,
        stackable: true,
        healthRestore: 25,
      },
      weight: 20,
      minCount: 1,
      maxCount: 1,
    },
  ],
  skeleton: [
    {
      item: {
        id: 'gold',
        name: 'Gold',
        type: 'gold',
        weight: 0,
        value: 1,
        stackable: true,
      },
      weight: 70,
      minCount: 10,
      maxCount: 30,
    },
    {
      item: {
        id: 'iron_sword',
        name: 'Iron Long Sword',
        type: 'weapon',
        weight: 8,
        value: 25,
        stackable: false,
        weaponType: 'longBlade',
        damage: 12,
      },
      weight: 15,
      minCount: 1,
      maxCount: 1,
    },
    {
      item: {
        id: 'health_potion',
        name: 'Restore Health Potion',
        type: 'potion',
        weight: 0.5,
        value: 20,
        stackable: true,
        healthRestore: 25,
      },
      weight: 15,
      minCount: 1,
      maxCount: 1,
    },
  ],
  spider: [
    {
      item: {
        id: 'gold',
        name: 'Gold',
        type: 'gold',
        weight: 0,
        value: 1,
        stackable: true,
      },
      weight: 60,
      minCount: 3,
      maxCount: 10,
    },
    {
      item: {
        id: 'spider_venom',
        name: 'Spider Venom',
        type: 'ingredient',
        weight: 0.1,
        value: 15,
        stackable: true,
      },
      weight: 30,
      minCount: 1,
      maxCount: 2,
    },
    {
      item: {
        id: 'fatigue_potion',
        name: 'Restore Fatigue Potion',
        type: 'potion',
        weight: 0.5,
        value: 10,
        stackable: true,
        fatigueRestore: 50,
      },
      weight: 10,
      minCount: 1,
      maxCount: 1,
    },
  ],
  boss: [
    {
      item: {
        id: 'gold',
        name: 'Gold',
        type: 'gold',
        weight: 0,
        value: 1,
        stackable: true,
      },
      weight: 100,
      minCount: 50,
      maxCount: 100,
    },
    {
      item: {
        id: 'steel_sword',
        name: 'Steel Long Sword',
        type: 'weapon',
        weight: 10,
        value: 60,
        stackable: false,
        weaponType: 'longBlade',
        damage: 18,
      },
      weight: 40,
      minCount: 1,
      maxCount: 1,
    },
    {
      item: {
        id: 'health_potion',
        name: 'Restore Health Potion',
        type: 'potion',
        weight: 0.5,
        value: 20,
        stackable: true,
        healthRestore: 25,
      },
      weight: 40,
      minCount: 2,
      maxCount: 2,
    },
    {
      item: {
        id: 'ruby',
        name: 'Ruby',
        type: 'misc',
        weight: 0.1,
        value: 100,
        stackable: true,
      },
      weight: 20,
      minCount: 1,
      maxCount: 3,
    },
  ],
};

// LootDrop class - represents a pickup in the world
export class LootDrop {
  mesh: THREE.Group;
  item: Item;
  position: THREE.Vector3;
  lifetime = 60;
  rotation = 0;
  floatOffset = 0;
  label: HTMLElement;

  constructor(item: Item, position: THREE.Vector3, scene: THREE.Scene) {
    this.item = item;
    this.position = position.clone();
    this.mesh = new THREE.Group();

    // Create visual based on item type
    let visual: THREE.Mesh;
    if (item.type === 'gold') {
      const geo = new THREE.OctahedronGeometry(0.3);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        emissive: 0xFFAA00,
        metalness: 0.8,
        roughness: 0.2,
      });
      visual = new THREE.Mesh(geo, mat);
    } else if (item.type === 'potion') {
      const geo = new THREE.SphereGeometry(0.25, 8, 8);
      let color = 0xFF0000; // red for health
      if (item.fatigueRestore) color = 0x00FF00; // green for fatigue
      if (item.magickaRestore) color = 0x0000FF; // blue for magicka
      const mat = new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: 0.3,
        transparent: true,
        opacity: 0.8,
      });
      visual = new THREE.Mesh(geo, mat);
    } else if (item.type === 'weapon') {
      const geo = new THREE.BoxGeometry(0.2, 0.6, 0.1);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x808080,
        metalness: 0.9,
        roughness: 0.3,
      });
      visual = new THREE.Mesh(geo, mat);
    } else if (item.type === 'ingredient') {
      const geo = new THREE.SphereGeometry(0.2, 8, 8);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x8B4513,
        roughness: 0.8,
      });
      visual = new THREE.Mesh(geo, mat);
    } else if (item.type === 'misc') {
      const geo = new THREE.OctahedronGeometry(0.25);
      const mat = new THREE.MeshStandardMaterial({
        color: 0xFF00FF,
        emissive: 0x660066,
        metalness: 0.7,
        roughness: 0.3,
      });
      visual = new THREE.Mesh(geo, mat);
    } else {
      const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3);
      const mat = new THREE.MeshStandardMaterial({ color: 0xCCCCCC });
      visual = new THREE.Mesh(geo, mat);
    }

    visual.castShadow = true;
    this.mesh.add(visual);
    this.mesh.position.copy(position);
    scene.add(this.mesh);

    // Create floating label
    this.label = document.createElement('div');
    this.label.style.position = 'fixed';
    this.label.style.color = '#FFD700';
    this.label.style.fontFamily = 'Georgia, serif';
    this.label.style.fontSize = '12px';
    this.label.style.textShadow = '2px 2px 4px rgba(0,0,0,0.8)';
    this.label.style.pointerEvents = 'none';
    this.label.style.zIndex = '100';
    this.label.textContent = `${item.name}${item.quantity > 1 ? ` (${item.quantity})` : ''}`;
    document.body.appendChild(this.label);
  }

  update(delta: number, camera: THREE.Camera, canvas: HTMLCanvasElement): boolean {
    this.lifetime -= delta;
    if (this.lifetime <= 0) {
      return false; // signal removal
    }

    // Rotate
    this.rotation += delta * 2;
    this.mesh.rotation.y = this.rotation;

    // Float up and down
    this.floatOffset += delta * 3;
    this.mesh.position.y = this.position.y + 0.5 + Math.sin(this.floatOffset) * 0.1;

    // Update label position
    const vector = this.mesh.position.clone();
    vector.y += 0.5;
    vector.project(camera);

    const x = (vector.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (-(vector.y * 0.5) + 0.5) * canvas.clientHeight;

    this.label.style.left = `${x}px`;
    this.label.style.top = `${y - 20}px`;

    return true;
  }

  destroy(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.label.remove();
  }

  canPickup(playerPos: THREE.Vector3): boolean {
    return this.position.distanceTo(playerPos) <= 2.0;
  }
}

// TreasureChest class
export class TreasureChest {
  mesh: THREE.Group;
  position: THREE.Vector3;
  contents: Item[];
  locked: boolean;
  lockLevel: number;
  isOpen = false;
  lid: THREE.Mesh;

  constructor(
    position: THREE.Vector3,
    contents: Item[],
    scene: THREE.Scene,
    locked = false,
    lockLevel = 0
  ) {
    this.position = position.clone();
    this.contents = contents;
    this.locked = locked;
    this.lockLevel = lockLevel;
    this.mesh = new THREE.Group();

    // Chest body
    const bodyGeo = new THREE.BoxGeometry(1.2, 0.8, 0.8);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.9,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    body.position.y = 0.4;
    body.castShadow = true;
    this.mesh.add(body);

    // Chest lid (slightly larger, darker)
    const lidGeo = new THREE.BoxGeometry(1.3, 0.2, 0.9);
    const lidMat = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.9,
    });
    this.lid = new THREE.Mesh(lidGeo, lidMat);
    this.lid.position.y = 0.9;
    this.lid.castShadow = true;
    this.mesh.add(this.lid);

    // Metal bands
    const bandGeo = new THREE.BoxGeometry(1.3, 0.05, 0.05);
    const bandMat = new THREE.MeshStandardMaterial({
      color: 0x404040,
      metalness: 0.8,
      roughness: 0.3,
    });
    const band1 = new THREE.Mesh(bandGeo, bandMat);
    band1.position.set(0, 0.4, 0.4);
    this.mesh.add(band1);
    const band2 = new THREE.Mesh(bandGeo, bandMat);
    band2.position.set(0, 0.4, -0.4);
    this.mesh.add(band2);

    // Lock (if locked)
    if (locked) {
      const lockGeo = new THREE.BoxGeometry(0.15, 0.2, 0.1);
      const lockMat = new THREE.MeshStandardMaterial({
        color: 0xFFD700,
        metalness: 1,
        roughness: 0.2,
      });
      const lock = new THREE.Mesh(lockGeo, lockMat);
      lock.position.set(0, 0.5, 0.45);
      this.mesh.add(lock);
    }

    this.mesh.position.copy(position);
    scene.add(this.mesh);
  }

  canInteract(playerPos: THREE.Vector3): boolean {
    return !this.isOpen && this.position.distanceTo(playerPos) <= 2.5;
  }

  open(scene: THREE.Scene, lootManager: LootManager, stats?: any): { success: boolean; message?: string } {
    if (this.isOpen) {
      return { success: false, message: 'Already opened' };
    }

    // Check lock
    if (this.locked) {
      const securitySkill = stats?.skills?.security?.value ?? 0;
      if (securitySkill < this.lockLevel) {
        return {
          success: false,
          message: `Locked (requires Security ${this.lockLevel})`,
        };
      }
    }

    this.isOpen = true;

    // Animate lid opening
    const openDuration = 0.5;
    const startRotation = this.lid.rotation.x;
    const targetRotation = -Math.PI / 2;
    let elapsed = 0;

    const animateLid = () => {
      elapsed += 0.016;
      const progress = Math.min(elapsed / openDuration, 1);
      this.lid.rotation.x = startRotation + (targetRotation - startRotation) * progress;
      this.lid.position.z -= 0.3 * 0.016 / openDuration;

      if (progress < 1) {
        requestAnimationFrame(animateLid);
      }
    };
    animateLid();

    // Spawn loot drops from contents
    this.contents.forEach((item, index) => {
      const angle = (index / this.contents.length) * Math.PI * 2;
      const offset = new THREE.Vector3(
        Math.cos(angle) * 0.5,
        0.5,
        Math.sin(angle) * 0.5
      );
      const dropPos = this.position.clone().add(offset);
      lootManager.addLootDrop(item, dropPos, scene);
    });

    return { success: true };
  }

  destroy(scene: THREE.Scene) {
    scene.remove(this.mesh);
  }
}

// LootManager class
export class LootManager {
  lootDrops: LootDrop[] = [];
  chests: TreasureChest[] = [];

  // Roll on a drop table and return items
  private rollDropTable(enemyType: string): Item[] {
    const table = DROP_TABLES[enemyType];
    if (!table) return [];

    const items: Item[] = [];

    // Calculate total weight
    const totalWeight = table.reduce((sum, entry) => sum + entry.weight, 0);

    // Roll once for each entry
    table.forEach(entry => {
      const roll = Math.random() * 100;
      if (roll <= (entry.weight / totalWeight) * 100) {
        const count = Math.floor(
          Math.random() * (entry.maxCount - entry.minCount + 1) + entry.minCount
        );
        items.push({
          ...entry.item,
          quantity: count,
        });
      }
    });

    return items;
  }

  // Spawn loot drops from enemy death
  spawnEnemyLoot(enemyType: string, position: THREE.Vector3, scene: THREE.Scene) {
    const items = this.rollDropTable(enemyType);
    items.forEach((item, index) => {
      // Spread drops around death position
      const angle = (index / items.length) * Math.PI * 2;
      const radius = 0.5 + Math.random() * 0.3;
      const offset = new THREE.Vector3(
        Math.cos(angle) * radius,
        0,
        Math.sin(angle) * radius
      );
      const dropPos = position.clone().add(offset);
      this.addLootDrop(item, dropPos, scene);
    });
  }

  // Add a single loot drop
  addLootDrop(item: Item, position: THREE.Vector3, scene: THREE.Scene) {
    const drop = new LootDrop(item, position, scene);
    this.lootDrops.push(drop);
  }

  // Add a treasure chest
  addChest(
    position: THREE.Vector3,
    items: Item[],
    scene: THREE.Scene,
    locked = false,
    lockLevel = 0
  ): TreasureChest {
    const chest = new TreasureChest(position, items, scene, locked, lockLevel);
    this.chests.push(chest);
    return chest;
  }

  // Update all loot drops
  update(delta: number, camera: THREE.Camera, canvas: HTMLCanvasElement, scene: THREE.Scene) {
    // Update drops, remove expired ones
    this.lootDrops = this.lootDrops.filter(drop => {
      const alive = drop.update(delta, camera, canvas);
      if (!alive) {
        drop.destroy(scene);
      }
      return alive;
    });
  }

  // Check for E key interaction
  checkInteraction(
    playerPos: THREE.Vector3,
    inventory: any,
    scene: THREE.Scene,
    stats?: any
  ): { message?: string } {
    // Check loot drops
    for (let i = this.lootDrops.length - 1; i >= 0; i--) {
      const drop = this.lootDrops[i];
      if (drop.canPickup(playerPos)) {
        // Attempt to add to inventory
        if (inventory.addItem(drop.item)) {
          drop.destroy(scene);
          this.lootDrops.splice(i, 1);
          return { message: `Picked up ${drop.item.name}` };
        } else {
          return { message: 'Inventory full' };
        }
      }
    }

    // Check chests
    for (const chest of this.chests) {
      if (chest.canInteract(playerPos)) {
        const result = chest.open(scene, this, stats);
        if (result.success) {
          return { message: 'Opened chest' };
        } else {
          return { message: result.message };
        }
      }
    }

    return {};
  }

  // Get nearby interactable prompt
  getInteractionPrompt(playerPos: THREE.Vector3): string | null {
    // Check drops
    for (const drop of this.lootDrops) {
      if (drop.canPickup(playerPos)) {
        return `[E] Pick up ${drop.item.name}`;
      }
    }

    // Check chests
    for (const chest of this.chests) {
      if (chest.canInteract(playerPos)) {
        if (chest.locked) {
          return `[E] Open chest (Security ${chest.lockLevel})`;
        }
        return '[E] Open chest';
      }
    }

    return null;
  }

  // Cleanup
  cleanup(scene: THREE.Scene) {
    this.lootDrops.forEach(drop => drop.destroy(scene));
    this.chests.forEach(chest => chest.destroy(scene));
    this.lootDrops = [];
    this.chests = [];
  }
}
