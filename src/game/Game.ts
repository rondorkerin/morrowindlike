import * as THREE from 'three';
import { Player } from './Player';
import { World } from './World';
import { NPCManager } from './NPC';
import { RatManager } from './Rat';

export class Game {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  player: Player;
  world: World;
  npcManager: NPCManager;
  ratManager: RatManager;
  clock: THREE.Clock;

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

    // Create player and place on terrain
    this.player = new Player();
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

    // Clock for delta time
    this.clock = new THREE.Clock();

    // Handle resize
    window.addEventListener('resize', () => this.onResize());

    // Start game loop
    this.animate();
  }

  handlePlayerAttack(position: THREE.Vector3, range: number) {
    const damage = this.player.inventory.getEquippedDamage();
    const ratsHit = this.ratManager.getRatsInRange(position, range);

    for (const rat of ratsHit) {
      const killed = rat.takeDamage(damage);
      if (killed) {
        this.showDamageNumber(rat.position, 'KILLED');
      } else {
        this.showDamageNumber(rat.position, `-${damage}`);
      }
    }

    // Clean up dead rats
    this.ratManager.removeDeadRats();
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

    const delta = Math.min(this.clock.getDelta(), 0.1); // Cap delta to avoid physics issues

    // Update player
    this.player.update(delta, (x, z) => this.world.getTerrainHeight(x, z));

    // Update NPCs
    this.npcManager.update(delta, (x, z) => this.world.getTerrainHeight(x, z));

    // Update rats and handle damage to player
    const ratResult = this.ratManager.update(
      delta,
      this.player.position,
      (x, z) => this.world.getTerrainHeight(x, z)
    );

    if (ratResult.totalDamage > 0) {
      this.player.takeDamage(ratResult.totalDamage);
    }

    // Render
    this.renderer.render(this.scene, this.player.camera);
  }

  onResize() {
    this.player.onResize();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}
