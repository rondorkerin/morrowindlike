import * as THREE from 'three';

export type SpellSchool = 'destruction' | 'restoration' | 'mysticism' | 'alteration' | 'conjuration';

export interface Spell {
  name: string;
  magickaCost: number;
  damage: number;
  range: number;
  cooldown: number; // in milliseconds
  school: SpellSchool;
  projectileColor: number;
  isSelfCast?: boolean;
  healAmount?: number;
  armorBonus?: number;
  buffDuration?: number;
}

export const SPELLS: Record<string, Spell> = {
  FIREBALL: {
    name: 'Fireball',
    magickaCost: 15,
    damage: 25,
    range: 30,
    cooldown: 1500,
    school: 'destruction',
    projectileColor: 0xff8800
  },
  LIGHTNING_BOLT: {
    name: 'Lightning Bolt',
    magickaCost: 20,
    damage: 35,
    range: 40,
    cooldown: 2000,
    school: 'destruction',
    projectileColor: 0x00ffff
  },
  HEAL: {
    name: 'Heal',
    magickaCost: 10,
    damage: 0,
    range: 0,
    cooldown: 3000,
    school: 'restoration',
    projectileColor: 0x00ff00,
    isSelfCast: true,
    healAmount: 20
  },
  FROST_SHARD: {
    name: 'Frost Shard',
    magickaCost: 12,
    damage: 18,
    range: 25,
    cooldown: 1000,
    school: 'destruction',
    projectileColor: 0xaaddff
  },
  SHIELD: {
    name: 'Shield',
    magickaCost: 15,
    damage: 0,
    range: 0,
    cooldown: 8000,
    school: 'alteration',
    projectileColor: 0xffff00,
    isSelfCast: true,
    armorBonus: 20,
    buffDuration: 10000
  }
};

interface Projectile {
  mesh: THREE.Mesh;
  spell: Spell;
  position: THREE.Vector3;
  direction: THREE.Vector3;
  distanceTraveled: number;
  speed: number;
}

interface ActiveBuff {
  spell: Spell;
  startTime: number;
  duration: number;
}

export class SpellSystem {
  scene: THREE.Scene;
  camera: THREE.Camera;
  equippedSpells: Spell[] = [];
  activeProjectiles: Projectile[] = [];
  cooldowns: Map<number, number> = new Map();
  activeBuff: ActiveBuff | null = null;

  constructor(scene: THREE.Scene, camera: THREE.Camera) {
    this.scene = scene;
    this.camera = camera;
  }

  castSpell(
    index: number,
    playerPos: THREE.Vector3,
    direction: THREE.Vector3,
    stats: any
  ): { spell: Spell; projectile?: THREE.Mesh } | null {
    // Check if spell slot exists
    if (index < 0 || index >= this.equippedSpells.length) {
      return null;
    }

    const spell = this.equippedSpells[index];
    if (!spell) return null;

    // Check cooldown
    const now = Date.now();
    const lastCast = this.cooldowns.get(index) || 0;
    if (now - lastCast < spell.cooldown) {
      return null;
    }

    // Check magicka
    if (stats.magicka < spell.magickaCost) {
      return null;
    }

    // Deduct magicka
    stats.magicka = Math.max(0, stats.magicka - spell.magickaCost);

    // Set cooldown
    this.cooldowns.set(index, now);

    // Handle self-cast spells
    if (spell.isSelfCast) {
      if (spell.healAmount) {
        // Heal spell
        stats.health = Math.min(stats.maxHealth, stats.health + spell.healAmount);

        // Visual effect for heal
        const healEffect = this.createSelfCastEffect(playerPos, spell.projectileColor);
        setTimeout(() => {
          this.scene.remove(healEffect);
        }, 500);
      } else if (spell.armorBonus && spell.buffDuration) {
        // Shield spell
        this.activeBuff = {
          spell,
          startTime: now,
          duration: spell.buffDuration
        };

        // Visual effect for shield
        const shieldEffect = this.createSelfCastEffect(playerPos, spell.projectileColor);
        setTimeout(() => {
          this.scene.remove(shieldEffect);
        }, 300);
      }

      return { spell };
    }

    // Create projectile for non-self-cast spells
    const projectileMesh = this.createProjectile(spell, playerPos, direction);

    const projectile: Projectile = {
      mesh: projectileMesh,
      spell,
      position: playerPos.clone(),
      direction: direction.clone().normalize(),
      distanceTraveled: 0,
      speed: 20
    };

    this.activeProjectiles.push(projectile);
    this.scene.add(projectileMesh);

    return { spell, projectile: projectileMesh };
  }

  private createProjectile(spell: Spell, position: THREE.Vector3, direction: THREE.Vector3): THREE.Mesh {
    const geometry = new THREE.SphereGeometry(0.15, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color: spell.projectileColor,
      transparent: true,
      opacity: 0.9
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.copy(position);

    // Add glow effect
    const glowGeometry = new THREE.SphereGeometry(0.2, 8, 8);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: spell.projectileColor,
      transparent: true,
      opacity: 0.3
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    mesh.add(glow);

    return mesh;
  }

  private createSelfCastEffect(position: THREE.Vector3, color: number): THREE.Group {
    const group = new THREE.Group();

    // Create multiple particles in a sphere around the player
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const geometry = new THREE.SphereGeometry(0.1, 6, 6);
      const material = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.7
      });

      const particle = new THREE.Mesh(geometry, material);
      particle.position.set(
        Math.cos(angle) * 0.5,
        0.8 + Math.random() * 0.4,
        Math.sin(angle) * 0.5
      );
      group.add(particle);
    }

    group.position.copy(position);
    this.scene.add(group);

    return group;
  }

  update(delta: number, enemies: any[]) {
    // Update projectiles
    for (let i = this.activeProjectiles.length - 1; i >= 0; i--) {
      const projectile = this.activeProjectiles[i];

      // Move projectile
      const movement = projectile.direction.clone().multiplyScalar(projectile.speed * delta);
      projectile.position.add(movement);
      projectile.mesh.position.copy(projectile.position);
      projectile.distanceTraveled += movement.length();

      // Animate projectile (rotate)
      projectile.mesh.rotation.x += delta * 5;
      projectile.mesh.rotation.y += delta * 5;

      // Check if projectile exceeded range
      if (projectile.distanceTraveled >= projectile.spell.range) {
        this.scene.remove(projectile.mesh);
        this.activeProjectiles.splice(i, 1);
        continue;
      }

      // Check collision with enemies
      let hit = false;
      for (const enemy of enemies) {
        if (enemy.isDead) continue;

        const distance = projectile.position.distanceTo(enemy.position);
        if (distance < 0.8) {
          // Hit enemy
          enemy.takeDamage(projectile.spell.damage);
          hit = true;
          break;
        }
      }

      if (hit) {
        // Create impact effect
        this.createImpactEffect(projectile.position, projectile.spell.projectileColor);

        // Remove projectile
        this.scene.remove(projectile.mesh);
        this.activeProjectiles.splice(i, 1);
      }
    }

    // Update active buff
    if (this.activeBuff) {
      const elapsed = Date.now() - this.activeBuff.startTime;
      if (elapsed >= this.activeBuff.duration) {
        this.activeBuff = null;
      }
    }
  }

  private createImpactEffect(position: THREE.Vector3, color: number) {
    const geometry = new THREE.SphereGeometry(0.3, 8, 8);
    const material = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.8
    });

    const impact = new THREE.Mesh(geometry, material);
    impact.position.copy(position);
    this.scene.add(impact);

    // Animate impact expansion and fade
    let scale = 1;
    const interval = setInterval(() => {
      scale += 0.1;
      impact.scale.set(scale, scale, scale);
      (impact.material as THREE.MeshBasicMaterial).opacity -= 0.1;

      if ((impact.material as THREE.MeshBasicMaterial).opacity <= 0) {
        this.scene.remove(impact);
        clearInterval(interval);
      }
    }, 50);
  }

  getActiveProjectiles(): THREE.Mesh[] {
    return this.activeProjectiles.map(p => p.mesh);
  }

  getActiveArmorBonus(): number {
    if (this.activeBuff && this.activeBuff.spell.armorBonus) {
      return this.activeBuff.spell.armorBonus;
    }
    return 0;
  }

  equipSpell(spell: Spell, slot: number) {
    if (slot >= 0 && slot < 5) {
      this.equippedSpells[slot] = spell;
    }
  }

  getCooldownProgress(slot: number): number {
    const spell = this.equippedSpells[slot];
    if (!spell) return 1;

    const now = Date.now();
    const lastCast = this.cooldowns.get(slot) || 0;
    const elapsed = now - lastCast;

    if (elapsed >= spell.cooldown) return 1;
    return elapsed / spell.cooldown;
  }
}
