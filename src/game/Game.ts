import * as THREE from 'three';
import { Player } from './Player';
import { World } from './World';
import { NPCManager } from './NPC';
import { RatManager } from './Rat';
import { Cave } from './Cave';
import { LootManager } from './LootSystem';
import { Vendor } from './Vendor';
import { SpellSystem, SPELLS } from './SpellSystem';
import { Bow } from './Bow';
import { ClassSelection } from './ClassSelection';
import { WARRIOR_CLASS, MAGE_CLASS, ARCHER_CLASS, ClassDefinition } from './Stats';

export class Game {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  player!: Player;
  world: World;
  npcManager!: NPCManager;
  ratManager!: RatManager;
  cave!: Cave;
  lootManager!: LootManager;
  vendor!: Vendor;
  spellSystem!: SpellSystem;
  bow!: Bow;
  clock: THREE.Clock;
  selectedClass: string = 'warrior';

  constructor() {
    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.8;
    document.body.appendChild(this.renderer.domElement);

    // Scene setup
    this.scene = new THREE.Scene();

    // Create world
    this.world = new World(this.scene);

    // Clock for delta time
    this.clock = new THREE.Clock();

    // Handle resize
    window.addEventListener('resize', () => this.onResize());

    // Show class selection, then initialize game
    this.showClassSelection();
  }

  async showClassSelection() {
    const classSelection = new ClassSelection();
    const chosen = await classSelection.show();
    classSelection.hide();
    this.selectedClass = chosen;

    const classMap: Record<string, ClassDefinition> = {
      warrior: WARRIOR_CLASS,
      mage: MAGE_CLASS,
      archer: ARCHER_CLASS,
    };

    const classDef = classMap[chosen] || WARRIOR_CLASS;
    this.initializeGame(classDef);
  }

  initializeGame(classDef: ClassDefinition) {
    // Create player with chosen class
    this.player = new Player(classDef);
    const startX = 0;
    const startZ = 5;
    const startY = this.world.getTerrainHeight(startX, startZ);
    this.player.position.set(startX, startY, startZ);
    this.player.model.setPosition(startX, startY, startZ);
    this.player.initializeCamera();
    this.scene.add(this.player.group);

    // Setup player attack callback
    this.player.onAttackHit = (position, range) => {
      this.handlePlayerAttack(position, range);
    };

    // Wire up bed position for sleeping/leveling
    this.player.bedPosition = this.world.getBedPosition();

    // Create NPCs
    this.npcManager = new NPCManager(this.scene);
    this.npcManager.spawnNPCs((x, z) => this.world.getTerrainHeight(x, z));

    // Create rats
    this.ratManager = new RatManager(this.scene);
    this.ratManager.spawnRats(8, (x, z) => this.world.getTerrainHeight(x, z));

    // Create loot manager
    this.lootManager = new LootManager();

    // Create cave with terrain height
    this.cave = new Cave(this.scene, (x, z) => this.world.getTerrainHeight(x, z));
    this.cave.addChests(this.lootManager);

    // Create vendor outside cave
    this.vendor = new Vendor(this.scene, (x, z) => this.world.getTerrainHeight(x, z));

    // Create spell system
    this.spellSystem = new SpellSystem(this.scene, this.player.camera);

    // Create bow
    this.bow = new Bow(this.scene);

    // Setup class-specific equipment
    this.setupClassEquipment();

    // Setup E key interactions
    this.setupInteractions();

    // Setup spell casting keys (1-5)
    this.setupSpellKeys();

    // Start game loop
    this.animate();
  }

  setupClassEquipment() {
    if (this.selectedClass === 'mage') {
      // Equip spells for mage
      this.spellSystem.equipSpell(SPELLS.FIREBALL, 0);
      this.spellSystem.equipSpell(SPELLS.LIGHTNING_BOLT, 1);
      this.spellSystem.equipSpell(SPELLS.HEAL, 2);
      this.spellSystem.equipSpell(SPELLS.FROST_SHARD, 3);
      this.spellSystem.equipSpell(SPELLS.SHIELD, 4);
      // Give mage a spell UI indicator
      this.createSpellBar();
    } else if (this.selectedClass === 'archer') {
      // Archer gets bow - attach to player model
      this.bow.group.position.set(-0.1, -0.55, 0.1);
      this.bow.group.rotation.set(0, 0, 0.3);
      this.player.model.leftArm.add(this.bow.group);
      // Create arrow count UI
      this.createArrowUI();
    }
    // Warrior uses default sword setup from Player constructor
  }

  createSpellBar() {
    const bar = document.createElement('div');
    bar.id = 'spell-bar';
    bar.innerHTML = `
      <style>
        #spell-bar {
          position: fixed;
          bottom: 60px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 8px;
          z-index: 100;
        }
        .spell-slot {
          width: 50px;
          height: 50px;
          background: rgba(0,0,0,0.7);
          border: 2px solid #5a4a3a;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          font-family: 'Georgia', serif;
          color: #D4C4A8;
          font-size: 10px;
          position: relative;
        }
        .spell-slot .key {
          position: absolute;
          top: 2px;
          left: 4px;
          font-size: 9px;
          color: #888;
        }
        .spell-slot .name {
          font-size: 8px;
          text-align: center;
        }
        .spell-slot .cooldown-overlay {
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          background: rgba(0,0,0,0.6);
          transition: height 0.1s;
        }
      </style>
    `;
    const spells = this.spellSystem.equippedSpells;
    spells.forEach((spell, i) => {
      const slot = document.createElement('div');
      slot.className = 'spell-slot';
      slot.innerHTML = `
        <span class="key">${i + 1}</span>
        <span class="name">${spell.name}</span>
        <div class="cooldown-overlay" id="cd-${i}"></div>
      `;
      slot.style.borderColor = '#' + spell.projectileColor.toString(16).padStart(6, '0');
      bar.appendChild(slot);
    });
    document.body.appendChild(bar);
  }

  createArrowUI() {
    const ui = document.createElement('div');
    ui.id = 'arrow-ui';
    ui.innerHTML = `
      <style>
        #arrow-ui {
          position: fixed;
          bottom: 60px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.7);
          border: 1px solid #5a4a3a;
          padding: 8px 15px;
          font-family: 'Georgia', serif;
          color: #D4C4A8;
          font-size: 14px;
          z-index: 100;
        }
        #arrow-ui .count { color: #FFD700; }
        #arrow-ui .draw-bar {
          height: 4px;
          background: #333;
          margin-top: 4px;
        }
        #arrow-ui .draw-fill {
          height: 100%;
          background: #FFD700;
          width: 0%;
          transition: width 0.05s;
        }
      </style>
      <div>Arrows: <span class="count" id="arrow-count">${this.bow.getArrowCount()}</span></div>
      <div class="draw-bar"><div class="draw-fill" id="draw-fill"></div></div>
    `;
    document.body.appendChild(ui);
  }

  setupInteractions() {
    document.addEventListener('keydown', (e) => {
      if (e.code !== 'KeyE') return;

      // Check cave entrance
      if (!this.cave.isPlayerInCave() && this.cave.checkEntrance(this.player.position)) {
        this.cave.enterCave(this.player);
        this.player.currentGroundY = 0.9;
        this.player.targetGroundY = 0.9;
        return;
      }

      // Check cave exit
      if (this.cave.isPlayerInCave() && this.cave.checkExit(this.player.position)) {
        this.cave.exitCave(this.player);
        const y = this.world.getTerrainHeight(this.player.position.x, this.player.position.z);
        this.player.currentGroundY = y;
        this.player.targetGroundY = y;
        return;
      }

      // Check vendor
      if (this.vendor.isPlayerNearby(this.player.position) && !this.vendor.isShopOpen) {
        this.vendor.openShop(this.player.inventory, this.player.stats);
        return;
      }

      // Check loot pickups
      const lootResult = this.lootManager.checkInteraction(
        this.player.position,
        this.player.inventory,
        this.scene,
        this.player.stats
      );
      if (lootResult.message) {
        this.player.showMessage(lootResult.message);
      }
    });
  }

  setupSpellKeys() {
    document.addEventListener('keydown', (e) => {
      if (this.selectedClass !== 'mage') return;

      const keyMap: Record<string, number> = {
        'Digit1': 0, 'Digit2': 1, 'Digit3': 2, 'Digit4': 3, 'Digit5': 4
      };
      const slot = keyMap[e.code];
      if (slot === undefined) return;

      const effectiveYaw = this.player.characterYaw + this.player.cameraYaw;
      const direction = new THREE.Vector3(
        Math.sin(effectiveYaw),
        0,
        Math.cos(effectiveYaw)
      );
      const castPos = this.player.position.clone();
      castPos.y += 1.5;

      const result = this.spellSystem.castSpell(slot, castPos, direction, this.player.stats);
      if (result) {
        // Gain skill progress for the spell's school
        this.player.stats.addSkillProgress(result.spell.school as any, 50);
        this.player.updateStatsUI();
      }
    });

    // Bow controls for archer
    if (this.selectedClass === 'archer') {
      document.addEventListener('mousedown', (e) => {
        if (!this.player.isLocked) return;
        if (e.button === 0) {
          this.bow.draw(true);
        }
      });
      document.addEventListener('mouseup', (e) => {
        if (!this.player.isLocked) return;
        if (e.button === 0 && this.bow.isDrawing) {
          const effectiveYaw = this.player.characterYaw + this.player.cameraYaw;
          const direction = new THREE.Vector3(
            Math.sin(effectiveYaw),
            0.1, // slight upward arc
            Math.cos(effectiveYaw)
          ).normalize();
          this.bow.release(this.player.position, direction);
          this.bow.draw(false);
          // Gain marksman skill
          this.player.stats.addSkillProgress('marksman', 50);
          this.player.updateStatsUI();
        }
      });
    }
  }

  handlePlayerAttack(position: THREE.Vector3, range: number) {
    const damage = this.player.inventory.getEquippedDamage();

    // Check overworld rats
    const ratsHit = this.ratManager.getRatsInRange(position, range);
    for (const rat of ratsHit) {
      const killed = rat.takeDamage(damage);
      if (killed) {
        this.showDamageNumber(rat.position, 'KILLED');
        this.lootManager.spawnEnemyLoot('rat', rat.position, this.scene);
      } else {
        this.showDamageNumber(rat.position, `-${damage}`);
      }
    }
    this.ratManager.removeDeadRats();

    // Check cave enemies
    if (this.cave.isPlayerInCave()) {
      const caveEnemies = this.cave.getEnemies();
      for (const enemy of caveEnemies) {
        if (enemy.isDead) continue;
        const dist = position.distanceTo(enemy.position);
        if (dist < range + 1) {
          const killed = enemy.takeDamage(damage);
          if (killed) {
            this.showDamageNumber(enemy.position, 'KILLED');
            // Determine enemy type for loot
            const isBoss = (enemy as any).isBoss;
            const type = isBoss ? 'boss' : ((enemy as any).legs ? 'spider' : 'skeleton');
            this.lootManager.spawnEnemyLoot(type, enemy.position, this.scene);
          } else {
            this.showDamageNumber(enemy.position, `-${damage}`);
          }
        }
      }
    }
  }

  showDamageNumber(position: THREE.Vector3, text: string) {
    const screenPos = position.clone();
    screenPos.y += 1;
    screenPos.project(this.player.camera);

    const x = (screenPos.x * 0.5 + 0.5) * window.innerWidth;
    const y = (-screenPos.y * 0.5 + 0.5) * window.innerHeight;

    const dmgEl = document.createElement('div');
    dmgEl.textContent = text;
    dmgEl.style.cssText = `
      position: fixed;
      left: ${x}px;
      top: ${y}px;
      color: #ff4444;
      font-family: 'Georgia', serif;
      font-size: 24px;
      font-weight: bold;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      pointer-events: none;
      z-index: 100;
      animation: floatUp 1s ease-out forwards;
    `;
    document.body.appendChild(dmgEl);

    // Add animation style if not exists
    if (!document.getElementById('damage-style')) {
      const style = document.createElement('style');
      style.id = 'damage-style';
      style.textContent = `
        @keyframes floatUp {
          0% { transform: translateY(0); opacity: 1; }
          100% { transform: translateY(-50px); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => dmgEl.remove(), 1000);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = Math.min(this.clock.getDelta(), 0.1);

    if (!this.player) return;

    // Determine terrain height function based on location
    const getHeight = this.cave.isPlayerInCave()
      ? () => 0
      : (x: number, z: number) => this.world.getTerrainHeight(x, z);

    // Update player
    this.player.update(delta, getHeight);

    // Update NPCs
    this.npcManager.update(delta);

    // Gather all enemies for combat checks
    const allEnemies: any[] = [];

    if (this.cave.isPlayerInCave()) {
      // Update cave
      this.cave.update(delta, this.player.position, this.player.camera, this.renderer.domElement);
      this.cave.checkBossChest();

      // Cave enemy damage to player
      const caveEnemies = this.cave.getEnemies();
      for (const enemy of caveEnemies) {
        const result = enemy.update(delta, this.player.position);
        if (result.attacked && result.damage > 0) {
          this.player.takeDamage(result.damage);
        }
      }
      allEnemies.push(...caveEnemies);
    } else {
      // Update overworld cave entrance label
      this.cave.update(delta, this.player.position, this.player.camera, this.renderer.domElement);

      // Update rats and handle damage to player
      const ratResult = this.ratManager.update(
        delta,
        this.player.position,
        (x, z) => this.world.getTerrainHeight(x, z)
      );
      if (ratResult.totalDamage > 0) {
        this.player.takeDamage(ratResult.totalDamage);
      }

      // Collect overworld enemies for spell/bow hits
      const rats = this.ratManager.getRatsInRange(this.player.position, 100);
      allEnemies.push(...rats);
    }

    // Update spell system
    this.spellSystem.update(delta, allEnemies);

    // Update bow
    this.bow.update(delta, allEnemies);

    // Update loot manager
    this.lootManager.update(delta, this.player.camera, this.renderer.domElement, this.scene);

    // Update vendor
    this.vendor.update(delta, this.player.position);

    // Update class-specific UI
    this.updateClassUI();

    // Render
    this.renderer.render(this.scene, this.player.camera);
  }

  updateClassUI() {
    if (this.selectedClass === 'mage') {
      // Update spell cooldown overlays
      for (let i = 0; i < this.spellSystem.equippedSpells.length; i++) {
        const cdEl = document.getElementById(`cd-${i}`);
        if (cdEl) {
          const progress = this.spellSystem.getCooldownProgress(i);
          cdEl.style.height = `${(1 - progress) * 100}%`;
        }
      }
    } else if (this.selectedClass === 'archer') {
      const countEl = document.getElementById('arrow-count');
      if (countEl) countEl.textContent = this.bow.getArrowCount().toString();
      const drawEl = document.getElementById('draw-fill');
      if (drawEl) drawEl.style.width = `${this.bow.getDrawProgress() * 100}%`;
    }
  }

  onResize() {
    if (this.player) {
      this.player.onResize();
    }
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
