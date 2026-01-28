import * as THREE from 'three';
import { CharacterModel } from './CharacterModel';
import { Sword } from './Sword';
import { Inventory, ITEMS } from './Inventory';
import { CharacterStats, WARRIOR_CLASS, AttributeName } from './Stats';
import { CharacterMenu } from './CharacterMenu';

export class Player {
  camera: THREE.PerspectiveCamera;
  velocity: THREE.Vector3 = new THREE.Vector3();
  position: THREE.Vector3 = new THREE.Vector3(0, 0, 5);

  // Character systems
  model: CharacterModel;
  sword: Sword;
  inventory: Inventory;
  stats: CharacterStats;
  characterMenu: CharacterMenu;

  isThirdPerson = true;

  // Movement state
  moveForward = false;
  moveBackward = false;
  rotateLeft = false;
  rotateRight = false;
  isRunning = false;

  // Character facing
  characterYaw = 0;
  rotateSpeed = 3;

  // Camera orbit
  cameraYaw = 0;
  cameraPitch = 0.3;
  isRightMouseDown = false;
  mouseSensitivity = 0.003;

  // Camera settings
  cameraDistance = 6;
  cameraHeight = 2.5;
  cameraLerpSpeed = 8;
  currentCameraPos = new THREE.Vector3();

  // Smooth ground following
  targetGroundY = 0;
  currentGroundY = 0;
  groundLerpSpeed = 15;

  // Jumping
  verticalVelocity = 0;
  isGrounded = true;
  jumpForce = 10;
  gravity = 25;

  // Combat
  attackHitThisSwing = false;

  // Settings
  height = 1.7;

  isLocked = false;

  // Callbacks
  onAttackHit?: (position: THREE.Vector3, range: number) => void;

  // Bed interaction
  nearBed = false;
  bedPosition: THREE.Vector3 | null = null;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

    // Create stats with Warrior class
    this.stats = new CharacterStats(WARRIOR_CLASS);

    // Create player character model
    this.model = new CharacterModel({
      skinColor: 0xDEB887,
      clothColor: 0x2E8B57,
      height: 1.8
    });

    // Create sword and attach to right hand
    this.sword = new Sword();
    this.sword.group.position.set(0.1, -0.55, 0.1);
    this.sword.group.rotation.set(0, 0, -0.3);
    this.model.rightArm.add(this.sword.group);

    // Create inventory
    this.inventory = new Inventory();

    // Create character menu
    this.characterMenu = new CharacterMenu(this.stats, this.inventory);

    this.setupControls();
    this.createUI();
  }

  get group(): THREE.Group {
    return this.model.group;
  }

  get walkSpeed(): number {
    // Speed based on Athletics skill and Speed attribute
    const base = 6;
    const speedBonus = this.stats.attributes.speed / 50;
    const athleticsBonus = this.stats.skills.athletics / 100;
    return base * (1 + speedBonus) * (1 + athleticsBonus * 0.5);
  }

  get runSpeed(): number {
    return this.walkSpeed * 1.8;
  }

  createUI() {
    // Stats display
    const statsUI = document.createElement('div');
    statsUI.id = 'stats-ui';
    statsUI.innerHTML = `
      <style>
        #stats-ui {
          position: fixed;
          top: 20px;
          right: 20px;
          color: #D4C4A8;
          font-family: 'Georgia', serif;
          font-size: 12px;
          background: rgba(0,0,0,0.6);
          padding: 10px 15px;
          border: 1px solid #5a4a3a;
          min-width: 150px;
        }
        #stats-ui .title {
          color: #FFD700;
          font-size: 14px;
          margin-bottom: 8px;
          border-bottom: 1px solid #5a4a3a;
          padding-bottom: 5px;
        }
        #stats-ui .bar {
          margin: 4px 0;
        }
        #stats-ui .bar-label {
          display: flex;
          justify-content: space-between;
          font-size: 10px;
        }
        #stats-ui .bar-bg {
          height: 8px;
          background: rgba(0,0,0,0.5);
          border: 1px solid #3a3a3a;
        }
        #stats-ui .bar-fill {
          height: 100%;
          transition: width 0.3s;
        }
        #stats-ui .health-fill { background: linear-gradient(to right, #8b0000, #cc0000); }
        #stats-ui .magicka-fill { background: linear-gradient(to right, #000088, #0000cc); }
        #stats-ui .fatigue-fill { background: linear-gradient(to right, #006600, #00aa00); }
        #stats-ui .level-info {
          margin-top: 8px;
          font-size: 11px;
          color: #888;
        }
        #stats-ui .can-level {
          color: #FFD700;
          animation: pulse 1s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        #bed-prompt {
          display: none;
          position: fixed;
          bottom: 100px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.8);
          color: #FFD700;
          padding: 10px 20px;
          font-family: 'Georgia', serif;
          border: 1px solid #8B7355;
        }
      </style>
      <div class="title">Warrior - Level <span id="player-level">1</span></div>
      <div class="bar">
        <div class="bar-label"><span>Health</span><span id="health-text">0/0</span></div>
        <div class="bar-bg"><div class="bar-fill health-fill" id="health-bar"></div></div>
      </div>
      <div class="bar">
        <div class="bar-label"><span>Magicka</span><span id="magicka-text">0/0</span></div>
        <div class="bar-bg"><div class="bar-fill magicka-fill" id="magicka-bar"></div></div>
      </div>
      <div class="bar">
        <div class="bar-label"><span>Fatigue</span><span id="fatigue-text">0/0</span></div>
        <div class="bar-bg"><div class="bar-fill fatigue-fill" id="fatigue-bar"></div></div>
      </div>
      <div class="level-info" id="level-info">Skills: 0/10</div>
    `;
    document.body.appendChild(statsUI);

    // Bed prompt
    const bedPrompt = document.createElement('div');
    bedPrompt.id = 'bed-prompt';
    bedPrompt.textContent = 'Press E to Sleep';
    document.body.appendChild(bedPrompt);

    this.updateStatsUI();
  }

  updateStatsUI() {
    const s = this.stats;

    const levelEl = document.getElementById('player-level');
    if (levelEl) levelEl.textContent = s.level.toString();

    const healthBar = document.getElementById('health-bar') as HTMLElement;
    const healthText = document.getElementById('health-text');
    if (healthBar && healthText) {
      healthBar.style.width = `${(s.health / s.maxHealth) * 100}%`;
      healthText.textContent = `${Math.floor(s.health)}/${s.maxHealth}`;
    }

    const magickaBar = document.getElementById('magicka-bar') as HTMLElement;
    const magickaText = document.getElementById('magicka-text');
    if (magickaBar && magickaText) {
      magickaBar.style.width = `${(s.magicka / s.maxMagicka) * 100}%`;
      magickaText.textContent = `${Math.floor(s.magicka)}/${s.maxMagicka}`;
    }

    const fatigueBar = document.getElementById('fatigue-bar') as HTMLElement;
    const fatigueText = document.getElementById('fatigue-text');
    if (fatigueBar && fatigueText) {
      fatigueBar.style.width = `${(s.fatigue / s.maxFatigue) * 100}%`;
      fatigueText.textContent = `${Math.floor(s.fatigue)}/${s.maxFatigue}`;
    }

    const levelInfo = document.getElementById('level-info');
    if (levelInfo) {
      if (s.canLevelUp) {
        levelInfo.className = 'level-info can-level';
        levelInfo.textContent = 'LEVEL UP READY - Sleep to level up!';
      } else {
        levelInfo.className = 'level-info';
        levelInfo.textContent = `Skills: ${s.skillIncreasesThisLevel}/${s.skillIncreasesNeeded}`;
      }
    }
  }

  initializeCamera() {
    const totalYaw = this.characterYaw + this.cameraYaw;
    this.currentCameraPos.set(
      this.position.x - Math.sin(totalYaw) * this.cameraDistance,
      this.position.y + this.cameraHeight,
      this.position.z - Math.cos(totalYaw) * this.cameraDistance
    );
    this.currentGroundY = this.position.y;
    this.targetGroundY = this.position.y;
    this.camera.position.copy(this.currentCameraPos);
    this.camera.lookAt(this.position.x, this.position.y + this.height, this.position.z);
  }

  setupControls() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));
    document.addEventListener('mouseup', (e) => this.onMouseUp(e));
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyV') {
        this.isThirdPerson = !this.isThirdPerson;
      }
    });

    const instructions = document.getElementById('instructions');
    instructions?.addEventListener('click', () => {
      document.body.requestPointerLock();
    });

    document.addEventListener('pointerlockchange', () => {
      this.isLocked = document.pointerLockElement === document.body;
      const instructions = document.getElementById('instructions');
      if (instructions) {
        instructions.classList.toggle('hidden', this.isLocked);
      }
    });
  }

  onKeyDown(event: KeyboardEvent) {
    switch (event.code) {
      case 'KeyW': this.moveForward = true; break;
      case 'KeyS': this.moveBackward = true; break;
      case 'KeyA': this.rotateLeft = true; break;
      case 'KeyD': this.rotateRight = true; break;
      case 'ShiftLeft': this.isRunning = true; break;
      case 'Space':
        if (this.isGrounded) {
          this.verticalVelocity = this.jumpForce;
          this.isGrounded = false;
          // Acrobatics skill progress
          this.stats.addSkillProgress('acrobatics', 5);
        }
        break;
      case 'KeyE':
        if (this.nearBed) {
          this.sleep();
        }
        break;
    }
  }

  onKeyUp(event: KeyboardEvent) {
    switch (event.code) {
      case 'KeyW': this.moveForward = false; break;
      case 'KeyS': this.moveBackward = false; break;
      case 'KeyA': this.rotateLeft = false; break;
      case 'KeyD': this.rotateRight = false; break;
      case 'ShiftLeft': this.isRunning = false; break;
    }
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isLocked) return;

    if (this.isRightMouseDown) {
      this.cameraYaw -= event.movementX * this.mouseSensitivity;
      this.cameraPitch -= event.movementY * this.mouseSensitivity;
      this.cameraPitch = Math.max(0.1, Math.min(1.2, this.cameraPitch));
    }
  }

  onMouseDown(event: MouseEvent) {
    if (!this.isLocked) return;

    if (event.button === 0) {
      this.sword.swing();
      this.attackHitThisSwing = false;
      // Drain fatigue on attack
      this.stats.fatigue = Math.max(0, this.stats.fatigue - 5);
      this.updateStatsUI();
    } else if (event.button === 2) {
      this.isRightMouseDown = true;
    }
  }

  onMouseUp(event: MouseEvent) {
    if (event.button === 2) {
      if (this.isRightMouseDown) {
        this.characterYaw += this.cameraYaw;
        this.cameraYaw = 0;
      }
      this.isRightMouseDown = false;
    }
  }

  get isMoving(): boolean {
    return this.moveForward || this.moveBackward;
  }

  takeDamage(amount: number) {
    // Apply armor reduction
    const armorRating = this.inventory.getTotalArmorRating();
    const reduction = armorRating / (armorRating + 100);
    const actualDamage = amount * (1 - reduction);

    this.stats.health = Math.max(0, this.stats.health - actualDamage);
    this.updateStatsUI();

    // Flash red
    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 0, 0, 0.3); pointer-events: none; z-index: 1000;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 100);

    if (this.stats.health <= 0) {
      this.die();
    }
  }

  die() {
    const deathScreen = document.createElement('div');
    deathScreen.innerHTML = `
      <style>
        #death-screen {
          position: fixed; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          z-index: 2000; color: #8b0000; font-family: 'Georgia', serif; font-size: 48px;
        }
        #death-screen button {
          margin-top: 30px; padding: 15px 30px; font-family: 'Georgia', serif; font-size: 18px;
          background: #3a2a1a; color: #c9a86c; border: 2px solid #5a4a3a; cursor: pointer;
        }
      </style>
      <div id="death-screen"><div>You Died</div><button onclick="location.reload()">Respawn</button></div>
    `;
    document.body.appendChild(deathScreen);
    document.exitPointerLock();
  }

  sleep() {
    if (this.stats.canLevelUp) {
      this.showLevelUpUI();
    } else {
      // Just rest
      this.stats.rest(8);
      this.updateStatsUI();
      this.characterMenu.update();
      this.showMessage('You rest for 8 hours.');
    }
  }

  showLevelUpUI() {
    const ui = document.createElement('div');
    ui.id = 'levelup-ui';
    ui.innerHTML = `
      <style>
        #levelup-ui {
          position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
          background: rgba(20, 15, 10, 0.95); border: 2px solid #FFD700;
          color: #D4C4A8; font-family: 'Georgia', serif; padding: 20px;
          z-index: 2000; min-width: 400px;
        }
        #levelup-ui h2 { color: #FFD700; margin: 0 0 15px 0; text-align: center; }
        #levelup-ui p { margin: 10px 0; font-size: 14px; }
        #levelup-ui .attrs { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin: 15px 0; }
        #levelup-ui .attr {
          background: rgba(0,0,0,0.3); border: 1px solid #5a4a3a; padding: 10px;
          cursor: pointer; text-align: center;
        }
        #levelup-ui .attr:hover { background: rgba(100,80,60,0.3); }
        #levelup-ui .attr.selected { border-color: #FFD700; background: rgba(100,80,0,0.3); }
        #levelup-ui .attr .mult { color: #00ff00; font-size: 12px; }
        #levelup-ui button {
          width: 100%; padding: 10px; margin-top: 15px;
          background: #5a4a3a; border: 1px solid #8B7355; color: #D4C4A8;
          font-family: 'Georgia', serif; font-size: 16px; cursor: pointer;
        }
        #levelup-ui button:disabled { opacity: 0.5; cursor: not-allowed; }
      </style>
      <h2>Level Up!</h2>
      <p>Choose 3 attributes to increase:</p>
      <div class="attrs" id="attr-choices"></div>
      <p id="selected-count">Selected: 0/3</p>
      <button id="confirm-levelup" disabled>Confirm Level Up</button>
    `;
    document.body.appendChild(ui);

    const attrs: AttributeName[] = ['strength', 'intelligence', 'willpower', 'agility', 'speed', 'endurance', 'personality', 'luck'];
    const selected: AttributeName[] = [];

    const attrsEl = ui.querySelector('#attr-choices')!;
    attrsEl.innerHTML = attrs.map(attr => {
      const mult = this.stats.getAttributeMultiplier(attr);
      const current = this.stats.attributes[attr];
      return `
        <div class="attr" data-attr="${attr}">
          <div>${attr.charAt(0).toUpperCase() + attr.slice(1)}</div>
          <div>Current: ${current}</div>
          <div class="mult">+${mult}</div>
        </div>
      `;
    }).join('');

    attrsEl.querySelectorAll('.attr').forEach(el => {
      el.addEventListener('click', () => {
        const attr = (el as HTMLElement).dataset.attr as AttributeName;
        const idx = selected.indexOf(attr);
        if (idx >= 0) {
          selected.splice(idx, 1);
          el.classList.remove('selected');
        } else if (selected.length < 3) {
          selected.push(attr);
          el.classList.add('selected');
        }
        ui.querySelector('#selected-count')!.textContent = `Selected: ${selected.length}/3`;
        (ui.querySelector('#confirm-levelup') as HTMLButtonElement).disabled = selected.length !== 3;
      });
    });

    ui.querySelector('#confirm-levelup')?.addEventListener('click', () => {
      if (selected.length === 3) {
        this.stats.levelUp(selected as [AttributeName, AttributeName, AttributeName]);
        this.stats.rest(8);
        this.updateStatsUI();
        this.characterMenu.update();
        ui.remove();
        this.showMessage(`You are now level ${this.stats.level}!`);
      }
    });
  }

  showMessage(text: string) {
    const msg = document.createElement('div');
    msg.style.cssText = `
      position: fixed; top: 30%; left: 50%; transform: translateX(-50%);
      background: rgba(0,0,0,0.8); color: #FFD700; padding: 15px 30px;
      font-family: 'Georgia', serif; font-size: 18px; z-index: 1500;
      border: 1px solid #8B7355;
    `;
    msg.textContent = text;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 2000);
  }

  update(delta: number, getTerrainHeight: (x: number, z: number) => number) {
    if (!this.isLocked || this.stats.health <= 0) return;

    const speed = this.isRunning ? this.runSpeed : this.walkSpeed;

    // Rotate character
    if (this.rotateLeft) this.characterYaw += this.rotateSpeed * delta;
    if (this.rotateRight) this.characterYaw -= this.rotateSpeed * delta;

    // Movement
    let moveSpeed = 0;
    if (this.moveForward) moveSpeed = speed;
    if (this.moveBackward) moveSpeed = -speed * 0.6;

    const effectiveYaw = this.characterYaw + this.cameraYaw;
    this.velocity.x = Math.sin(effectiveYaw) * moveSpeed;
    this.velocity.z = Math.cos(effectiveYaw) * moveSpeed;

    // Apply gravity only when not grounded
    if (!this.isGrounded) {
      this.verticalVelocity -= this.gravity * delta;
    }

    // Move horizontally
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;

    // Get terrain height at new position
    this.targetGroundY = getTerrainHeight(this.position.x, this.position.z);

    // Smooth ground following when grounded
    if (this.isGrounded) {
      // Smoothly interpolate to terrain height
      this.currentGroundY += (this.targetGroundY - this.currentGroundY) * this.groundLerpSpeed * delta;
      this.position.y = this.currentGroundY;
    } else {
      // In air - apply vertical velocity
      this.position.y += this.verticalVelocity * delta;

      // Check for landing
      if (this.position.y <= this.targetGroundY) {
        this.position.y = this.targetGroundY;
        this.currentGroundY = this.targetGroundY;
        this.verticalVelocity = 0;
        this.isGrounded = true;
      }
    }

    // Athletics skill progress while moving
    if (this.isMoving) {
      this.stats.addSkillProgress('athletics', delta * 2);
      // Drain fatigue while running
      if (this.isRunning) {
        this.stats.fatigue = Math.max(0, this.stats.fatigue - delta * 5);
      }
    }

    // Regenerate fatigue slowly
    this.stats.fatigue = Math.min(this.stats.maxFatigue, this.stats.fatigue + delta * 2);

    // Check bed proximity
    if (this.bedPosition) {
      const distToBed = this.position.distanceTo(this.bedPosition);
      this.nearBed = distToBed < 3;
      const bedPrompt = document.getElementById('bed-prompt');
      if (bedPrompt) {
        bedPrompt.style.display = this.nearBed ? 'block' : 'none';
      }
    }

    // Update model
    this.model.setPosition(this.position.x, this.position.y, this.position.z);
    this.model.setRotation(effectiveYaw);
    this.model.update(delta, this.isMoving, this.isRunning);

    // Sword hit detection
    const hitFrame = this.sword.update(delta);
    if (hitFrame && !this.attackHitThisSwing && this.onAttackHit) {
      const attackPos = new THREE.Vector3(
        this.position.x + Math.sin(effectiveYaw) * 1.5,
        this.position.y + 1,
        this.position.z + Math.cos(effectiveYaw) * 1.5
      );
      this.onAttackHit(attackPos, 2);
      this.attackHitThisSwing = true;

      // Weapon skill progress (high for testing - 50 per hit means ~2 hits per skill point)
      const weaponSkill = this.inventory.getEquippedWeaponSkill();
      this.stats.addSkillProgress(weaponSkill, 50);
    }

    // Update stats UI periodically
    this.updateStatsUI();

    // Update character menu if open
    if (this.characterMenu.isOpen) {
      this.characterMenu.update();
    }

    // Camera
    if (this.isThirdPerson) {
      const totalYaw = this.characterYaw + this.cameraYaw;
      const targetCamX = this.position.x - Math.sin(totalYaw) * this.cameraDistance * Math.cos(this.cameraPitch);
      const targetCamZ = this.position.z - Math.cos(totalYaw) * this.cameraDistance * Math.cos(this.cameraPitch);
      const targetCamY = this.position.y + this.cameraHeight + Math.sin(this.cameraPitch) * this.cameraDistance;

      this.currentCameraPos.x += (targetCamX - this.currentCameraPos.x) * this.cameraLerpSpeed * delta;
      this.currentCameraPos.y += (targetCamY - this.currentCameraPos.y) * this.cameraLerpSpeed * delta;
      this.currentCameraPos.z += (targetCamZ - this.currentCameraPos.z) * this.cameraLerpSpeed * delta;

      this.camera.position.copy(this.currentCameraPos);
      this.camera.lookAt(this.position.x, this.position.y + this.height, this.position.z);
      this.model.group.visible = true;
    } else {
      this.camera.position.set(this.position.x, this.position.y + this.height, this.position.z);
      const lookDist = 10;
      this.camera.lookAt(
        this.position.x + Math.sin(this.characterYaw) * lookDist,
        this.position.y + this.height,
        this.position.z + Math.cos(this.characterYaw) * lookDist
      );
      this.model.group.visible = false;
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
