import * as THREE from 'three';
import { CharacterModel } from './CharacterModel';
import { Sword } from './Sword';
import { Inventory } from './Inventory';

export class Player {
  camera: THREE.PerspectiveCamera;
  velocity: THREE.Vector3 = new THREE.Vector3();
  direction: THREE.Vector3 = new THREE.Vector3();
  position: THREE.Vector3 = new THREE.Vector3(0, 0, 5);

  // Character model for third person
  model: CharacterModel;
  sword: Sword;
  inventory: Inventory;
  isThirdPerson = true;

  // Movement state
  moveForward = false;
  moveBackward = false;
  moveLeft = false;
  moveRight = false;
  isRunning = false;

  // Jumping
  verticalVelocity = 0;
  isGrounded = true;
  jumpForce = 12;
  gravity = 30;

  // Combat
  health = 100;
  maxHealth = 100;
  isAttacking = false;
  attackHitThisSwing = false;

  // Settings
  walkSpeed = 8;
  runSpeed = 16;
  height = 1.7;

  // Camera control - yaw is the horizontal angle we're FACING
  yaw = 0;
  pitch = 0;
  mouseSensitivity = 0.002;
  thirdPersonDistance = 5;
  thirdPersonHeight = 2;

  isLocked = false;

  // Callbacks
  onAttackHit?: (position: THREE.Vector3, range: number) => void;

  constructor() {
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );

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

    this.setupControls();
    this.createHealthBar();
  }

  createHealthBar() {
    const healthBar = document.createElement('div');
    healthBar.id = 'health-bar';
    healthBar.innerHTML = `
      <style>
        #health-bar {
          position: fixed;
          top: 60px;
          left: 20px;
          width: 200px;
          pointer-events: none;
        }
        #health-bar .bar-bg {
          background: rgba(0,0,0,0.5);
          border: 1px solid #5a4a3a;
          height: 20px;
          width: 100%;
        }
        #health-bar .bar-fill {
          background: linear-gradient(to right, #8b0000, #cc0000);
          height: 100%;
          transition: width 0.2s;
        }
        #health-bar .label {
          color: #222;
          font-family: 'Georgia', serif;
          font-size: 12px;
          text-shadow: 1px 1px 2px rgba(255,255,255,0.5);
        }
      </style>
      <div class="label">Health</div>
      <div class="bar-bg">
        <div class="bar-fill" style="width: 100%"></div>
      </div>
    `;
    document.body.appendChild(healthBar);
  }

  updateHealthBar() {
    const fill = document.querySelector('#health-bar .bar-fill') as HTMLElement;
    if (fill) {
      fill.style.width = `${(this.health / this.maxHealth) * 100}%`;
    }
  }

  get group(): THREE.Group {
    return this.model.group;
  }

  setupControls() {
    document.addEventListener('keydown', (e) => this.onKeyDown(e));
    document.addEventListener('keyup', (e) => this.onKeyUp(e));
    document.addEventListener('mousemove', (e) => this.onMouseMove(e));
    document.addEventListener('mousedown', (e) => this.onMouseDown(e));

    // Toggle view mode with V
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyV') {
        this.isThirdPerson = !this.isThirdPerson;
      }
    });

    // Pointer lock
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
      case 'KeyA': this.moveLeft = true; break;
      case 'KeyD': this.moveRight = true; break;
      case 'ShiftLeft': this.isRunning = true; break;
      case 'Space':
        if (this.isGrounded) {
          this.verticalVelocity = this.jumpForce;
          this.isGrounded = false;
        }
        break;
    }
  }

  onKeyUp(event: KeyboardEvent) {
    switch (event.code) {
      case 'KeyW': this.moveForward = false; break;
      case 'KeyS': this.moveBackward = false; break;
      case 'KeyA': this.moveLeft = false; break;
      case 'KeyD': this.moveRight = false; break;
      case 'ShiftLeft': this.isRunning = false; break;
    }
  }

  onMouseMove(event: MouseEvent) {
    if (!this.isLocked) return;

    this.yaw -= event.movementX * this.mouseSensitivity;
    this.pitch -= event.movementY * this.mouseSensitivity;

    // Clamp pitch
    this.pitch = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, this.pitch));
  }

  onMouseDown(event: MouseEvent) {
    if (!this.isLocked) return;
    if (event.button === 0) {
      this.sword.swing();
      this.attackHitThisSwing = false;
    }
  }

  get isMoving(): boolean {
    return this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
  }

  takeDamage(amount: number) {
    this.health = Math.max(0, this.health - amount);
    this.updateHealthBar();

    const flash = document.createElement('div');
    flash.style.cssText = `
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(255, 0, 0, 0.3);
      pointer-events: none;
      z-index: 1000;
    `;
    document.body.appendChild(flash);
    setTimeout(() => flash.remove(), 100);

    if (this.health <= 0) {
      this.die();
    }
  }

  die() {
    const deathScreen = document.createElement('div');
    deathScreen.innerHTML = `
      <style>
        #death-screen {
          position: fixed;
          top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(0, 0, 0, 0.8);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          z-index: 2000;
          color: #8b0000;
          font-family: 'Georgia', serif;
          font-size: 48px;
        }
        #death-screen button {
          margin-top: 30px;
          padding: 15px 30px;
          font-family: 'Georgia', serif;
          font-size: 18px;
          background: #3a2a1a;
          color: #c9a86c;
          border: 2px solid #5a4a3a;
          cursor: pointer;
        }
      </style>
      <div id="death-screen">
        <div>You Died</div>
        <button onclick="location.reload()">Respawn</button>
      </div>
    `;
    document.body.appendChild(deathScreen);
    document.exitPointerLock();
  }

  update(delta: number, getTerrainHeight: (x: number, z: number) => number) {
    if (!this.isLocked || this.health <= 0) return;

    const speed = this.isRunning ? this.runSpeed : this.walkSpeed;

    // Movement is relative to camera yaw (where we're looking)
    // W = forward (negative Z in camera space)
    // S = backward (positive Z)
    // A = left (negative X)
    // D = right (positive X)

    let moveX = 0;
    let moveZ = 0;

    if (this.moveForward) moveZ -= 1;
    if (this.moveBackward) moveZ += 1;
    if (this.moveLeft) moveX -= 1;
    if (this.moveRight) moveX += 1;

    // Normalize diagonal movement
    const length = Math.sqrt(moveX * moveX + moveZ * moveZ);
    if (length > 0) {
      moveX /= length;
      moveZ /= length;
    }

    // Rotate movement by camera yaw
    // yaw = 0 means looking down negative Z
    // We want W to move in the direction we're looking
    const sinYaw = Math.sin(this.yaw);
    const cosYaw = Math.cos(this.yaw);

    // Transform local movement to world space
    const worldMoveX = moveX * cosYaw - moveZ * sinYaw;
    const worldMoveZ = moveX * sinYaw + moveZ * cosYaw;

    // Update velocity
    this.velocity.x = worldMoveX * speed;
    this.velocity.z = worldMoveZ * speed;

    // Apply gravity
    this.verticalVelocity -= this.gravity * delta;

    // Move player position
    this.position.x += this.velocity.x * delta;
    this.position.z += this.velocity.z * delta;
    this.position.y += this.verticalVelocity * delta;

    // Ground collision
    const terrainY = getTerrainHeight(this.position.x, this.position.z);
    if (this.position.y <= terrainY) {
      this.position.y = terrainY;
      this.verticalVelocity = 0;
      this.isGrounded = true;
    } else {
      this.isGrounded = false;
    }

    // Update character model position
    this.model.setPosition(this.position.x, this.position.y, this.position.z);

    // Character faces the direction of movement OR camera direction
    if (this.isMoving) {
      // Face movement direction
      const faceAngle = Math.atan2(worldMoveX, worldMoveZ);
      this.model.setRotation(faceAngle);
    } else {
      // When standing still, face camera direction
      this.model.setRotation(this.yaw);
    }

    // Animate character
    this.model.update(delta, this.isMoving, this.isRunning);

    // Update sword and check for hit
    const hitFrame = this.sword.update(delta);
    if (hitFrame && !this.attackHitThisSwing && this.onAttackHit) {
      const attackPos = new THREE.Vector3(
        this.position.x + Math.sin(this.model.group.rotation.y) * 1.5,
        this.position.y + 1,
        this.position.z + Math.cos(this.model.group.rotation.y) * 1.5
      );
      this.onAttackHit(attackPos, 2);
      this.attackHitThisSwing = true;
    }

    // Update camera
    if (this.isThirdPerson) {
      // Camera orbits around player based on yaw
      const camX = this.position.x - Math.sin(this.yaw) * this.thirdPersonDistance;
      const camZ = this.position.z - Math.cos(this.yaw) * this.thirdPersonDistance;
      const camY = this.position.y + this.thirdPersonHeight - this.pitch * 2;

      this.camera.position.set(camX, camY, camZ);
      this.camera.lookAt(
        this.position.x,
        this.position.y + this.height,
        this.position.z
      );

      this.model.group.visible = true;
    } else {
      // First person - camera at eye level
      this.camera.position.set(
        this.position.x,
        this.position.y + this.height,
        this.position.z
      );

      // Look in yaw/pitch direction
      const lookDist = 10;
      const lookX = this.position.x + Math.sin(this.yaw) * lookDist * Math.cos(this.pitch);
      const lookZ = this.position.z + Math.cos(this.yaw) * lookDist * Math.cos(this.pitch);
      const lookY = this.position.y + this.height + Math.sin(this.pitch) * lookDist;

      this.camera.lookAt(lookX, lookY, lookZ);
      this.model.group.visible = false;
    }
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
  }
}
