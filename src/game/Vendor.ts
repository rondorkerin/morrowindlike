import * as THREE from 'three';
import { CharacterModel, createMerchant } from './CharacterModel';
import { Item, ITEMS } from './Inventory';
import { CharacterStats } from './Stats';

export class Vendor {
  scene: THREE.Scene;
  position: THREE.Vector3;
  model: CharacterModel;
  stallGroup: THREE.Group;

  // Shop state
  isShopOpen = false;
  shopUIElement: HTMLElement | null = null;
  vendorGold = 500;
  vendorStock: Map<string, Item> = new Map();

  // Player references (set when shop opens)
  private playerInventory: any = null;
  private playerStats: any = null;

  // Interaction
  interactionRange = 3.0;
  promptElement: HTMLElement | null = null;

  constructor(scene: THREE.Scene, getTerrainHeight?: (x: number, z: number) => number) {
    this.scene = scene;
    const vx = 20, vz = -6;
    const vy = getTerrainHeight ? getTerrainHeight(vx, vz) : 0;
    this.position = new THREE.Vector3(vx, vy, vz);

    // Create market stall
    this.stallGroup = this.createStall();
    this.stallGroup.position.copy(this.position);
    this.scene.add(this.stallGroup);

    // Create vendor character
    this.model = createMerchant();
    this.model.setPosition(this.position.x, this.position.y, this.position.z);
    this.model.setRotation(Math.PI); // Face away from stall
    this.scene.add(this.model.group);

    // Initialize vendor stock
    this.initializeStock();

    // Create UI
    this.createShopUI();

    // Setup keyboard controls
    this.setupControls();
  }

  createStall(): THREE.Group {
    const stall = new THREE.Group();

    // Wooden table
    const tableGeometry = new THREE.BoxGeometry(2, 0.1, 1);
    const tableMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513,
      roughness: 0.8,
    });
    const table = new THREE.Mesh(tableGeometry, tableMaterial);
    table.position.y = 0.8;
    table.castShadow = true;
    table.receiveShadow = true;
    stall.add(table);

    // Table legs
    const legGeometry = new THREE.BoxGeometry(0.1, 0.8, 0.1);
    const positions = [
      [-0.9, 0.4, -0.4],
      [0.9, 0.4, -0.4],
      [-0.9, 0.4, 0.4],
      [0.9, 0.4, 0.4],
    ];
    positions.forEach(pos => {
      const leg = new THREE.Mesh(legGeometry, tableMaterial);
      leg.position.set(pos[0], pos[1], pos[2]);
      leg.castShadow = true;
      stall.add(leg);
    });

    // Awning (angled plane above)
    const awningGeometry = new THREE.PlaneGeometry(2.4, 1.2);
    const awningMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B0000,
      roughness: 0.9,
      side: THREE.DoubleSide,
    });
    const awning = new THREE.Mesh(awningGeometry, awningMaterial);
    awning.position.y = 2.0;
    awning.rotation.x = Math.PI / 6; // Angle it
    awning.castShadow = true;
    awning.receiveShadow = true;
    stall.add(awning);

    // Awning supports
    const supportGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.3, 8);
    const supportMaterial = new THREE.MeshStandardMaterial({
      color: 0x654321,
      roughness: 0.8,
    });
    [-1, 1].forEach(x => {
      const support = new THREE.Mesh(supportGeometry, supportMaterial);
      support.position.set(x, 1.5, -0.5);
      support.castShadow = true;
      stall.add(support);
    });

    return stall;
  }

  initializeStock() {
    // Add predefined vendor items
    const stockItems = [
      { id: 'iron_sword', quantity: 1, value: 50 },
      { id: 'steel_sword', quantity: 1, value: 150 },
      { id: 'iron_helm', quantity: 1, value: 30 },
      { id: 'iron_cuirass', quantity: 1, value: 80 },
      { id: 'leather_boots', quantity: 1, value: 25 },
      { id: 'health_potion', quantity: 5, value: 15 },
      { id: 'fatigue_potion', quantity: 3, value: 10 },
    ];

    // Add custom items not in ITEMS
    const customItems: Item[] = [
      {
        id: 'arrows',
        name: 'Iron Arrows',
        type: 'misc',
        weight: 0.1,
        value: 1,
        stackable: true,
        quantity: 20,
      },
      {
        id: 'scroll_fireball',
        name: 'Scroll of Fireball',
        type: 'misc',
        weight: 0.2,
        value: 75,
        stackable: true,
        quantity: 1,
      },
    ];

    // Add items from ITEMS catalog with custom values
    stockItems.forEach(({ id, quantity, value }) => {
      if (ITEMS[id]) {
        const item: Item = {
          ...ITEMS[id],
          quantity,
          value, // Override with vendor-specific pricing
        };
        this.vendorStock.set(id, item);
      }
    });

    // Add custom items
    customItems.forEach(item => {
      this.vendorStock.set(item.id, item);
    });
  }

  setupControls() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyE' || e.code === 'Escape') {
        if (this.isShopOpen) {
          this.closeShop();
        }
      }
    });
  }

  update(delta: number, playerPos: THREE.Vector3) {
    // Vendor doesn't move, but we can add idle animation
    this.model.update(delta, false, false);

    // Update interaction prompt
    this.updatePrompt(playerPos);
  }

  updatePrompt(playerPos: THREE.Vector3) {
    const isNear = this.isPlayerNearby(playerPos);

    if (isNear && !this.isShopOpen) {
      this.showPrompt();
    } else {
      this.hidePrompt();
    }
  }

  showPrompt() {
    if (!this.promptElement) {
      this.promptElement = document.createElement('div');
      this.promptElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: rgba(0,0,0,0.8);
        color: #FFD700;
        padding: 15px 25px;
        font-family: 'Georgia', serif;
        font-size: 16px;
        border: 2px solid #8B7355;
        z-index: 900;
        text-align: center;
      `;
      this.promptElement.textContent = this.getInteractionPrompt() || '';
      document.body.appendChild(this.promptElement);
    }
  }

  hidePrompt() {
    if (this.promptElement) {
      this.promptElement.remove();
      this.promptElement = null;
    }
  }

  isPlayerNearby(playerPos: THREE.Vector3): boolean {
    const distance = this.position.distanceTo(playerPos);
    return distance <= this.interactionRange;
  }

  getInteractionPrompt(): string | null {
    if (!this.isShopOpen) {
      return 'Press E to trade';
    }
    return null;
  }

  openShop(inventory: any, stats: any) {
    if (this.isShopOpen) return;

    this.isShopOpen = true;
    this.playerInventory = inventory;
    this.playerStats = stats;

    if (this.shopUIElement) {
      this.shopUIElement.style.display = 'flex';
    }

    this.hidePrompt();
    this.updateShopUI();
  }

  closeShop() {
    if (!this.isShopOpen) return;

    this.isShopOpen = false;
    this.playerInventory = null;
    this.playerStats = null;

    if (this.shopUIElement) {
      this.shopUIElement.style.display = 'none';
    }
  }

  createShopUI() {
    this.shopUIElement = document.createElement('div');
    this.shopUIElement.id = 'vendor-shop-ui';
    this.shopUIElement.innerHTML = `
      <style>
        #vendor-shop-ui {
          display: none;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, rgba(30, 25, 20, 0.98), rgba(20, 15, 10, 0.98));
          border: 3px solid #8B7355;
          box-shadow: 0 0 30px rgba(0,0,0,0.8);
          color: #D4C4A8;
          font-family: 'Georgia', serif;
          z-index: 1500;
          width: 800px;
          max-height: 85vh;
          flex-direction: column;
        }

        #vendor-shop-ui .header {
          background: linear-gradient(to bottom, #3a2a1a, #2a1a0a);
          padding: 15px 20px;
          border-bottom: 2px solid #8B7355;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        #vendor-shop-ui .header h2 {
          margin: 0;
          color: #FFD700;
          font-size: 24px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }

        #vendor-shop-ui .close-btn {
          background: #5a4a3a;
          border: 1px solid #8B7355;
          color: #D4C4A8;
          padding: 8px 15px;
          cursor: pointer;
          font-size: 14px;
          font-family: 'Georgia', serif;
        }

        #vendor-shop-ui .close-btn:hover {
          background: #6a5a4a;
        }

        #vendor-shop-ui .shop-content {
          display: flex;
          gap: 20px;
          padding: 20px;
          overflow-y: auto;
          max-height: calc(85vh - 120px);
        }

        #vendor-shop-ui .shop-column {
          flex: 1;
        }

        #vendor-shop-ui .shop-column h3 {
          color: #FFD700;
          margin: 0 0 15px 0;
          font-size: 16px;
          border-bottom: 2px solid #8B7355;
          padding-bottom: 8px;
        }

        #vendor-shop-ui .shop-column.vendor h3 {
          color: #ff8844;
        }

        #vendor-shop-ui .item-row {
          background: rgba(0,0,0,0.3);
          border: 1px solid #5a4a3a;
          padding: 10px;
          margin: 6px 0;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
          align-items: center;
          transition: background 0.2s;
        }

        #vendor-shop-ui .item-row:hover {
          background: rgba(100,80,60,0.4);
          border-color: #8B7355;
        }

        #vendor-shop-ui .item-name {
          flex: 1;
          font-size: 13px;
        }

        #vendor-shop-ui .item-details {
          display: flex;
          gap: 15px;
          font-size: 12px;
          color: #888;
        }

        #vendor-shop-ui .item-price {
          color: #FFD700;
          font-weight: bold;
        }

        #vendor-shop-ui .item-weight {
          color: #aaa;
        }

        #vendor-shop-ui .footer {
          background: rgba(0,0,0,0.5);
          padding: 15px 20px;
          border-top: 2px solid #5a4a3a;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        #vendor-shop-ui .gold-display {
          color: #FFD700;
          font-size: 14px;
        }

        #vendor-shop-ui .vendor-gold {
          color: #ff8844;
          font-size: 14px;
        }

        #vendor-shop-ui .mercantile-info {
          font-size: 11px;
          color: #888;
        }

        #vendor-shop-ui .empty-state {
          color: #666;
          font-style: italic;
          text-align: center;
          padding: 20px;
        }
      </style>

      <div class="header">
        <h2>Trader</h2>
        <button class="close-btn">Close [E]</button>
      </div>

      <div class="shop-content">
        <div class="shop-column vendor">
          <h3>Vendor Stock</h3>
          <div id="vendor-stock-list"></div>
        </div>

        <div class="shop-column player">
          <h3>Your Items</h3>
          <div id="player-items-list"></div>
        </div>
      </div>

      <div class="footer">
        <div>
          <div class="gold-display">Your Gold: <span id="player-gold">0</span></div>
          <div class="mercantile-info">Mercantile: <span id="mercantile-skill">0</span></div>
        </div>
        <div>
          <div class="vendor-gold">Vendor Gold: <span id="vendor-gold">500</span></div>
        </div>
      </div>
    `;

    document.body.appendChild(this.shopUIElement);

    // Close button handler
    this.shopUIElement.querySelector('.close-btn')?.addEventListener('click', () => {
      this.closeShop();
    });
  }

  updateShopUI() {
    if (!this.shopUIElement || !this.isShopOpen || !this.playerInventory) return;

    // Update gold displays
    const playerGoldEl = this.shopUIElement.querySelector('#player-gold');
    if (playerGoldEl) playerGoldEl.textContent = this.playerInventory.gold.toString();

    const vendorGoldEl = this.shopUIElement.querySelector('#vendor-gold');
    if (vendorGoldEl) vendorGoldEl.textContent = this.vendorGold.toString();

    // Update mercantile skill
    if (this.playerStats) {
      const mercantileEl = this.shopUIElement.querySelector('#mercantile-skill');
      if (mercantileEl) {
        mercantileEl.textContent = this.playerStats.skills.mercantile.toString();
      }
    }

    // Render vendor stock
    this.renderVendorStock();

    // Render player items
    this.renderPlayerItems();
  }

  renderVendorStock() {
    const listEl = this.shopUIElement?.querySelector('#vendor-stock-list');
    if (!listEl) return;

    const items = Array.from(this.vendorStock.values());

    if (items.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No items in stock</div>';
      return;
    }

    listEl.innerHTML = items.map(item => {
      const buyPrice = item.value;
      return `
        <div class="item-row" data-vendor-item="${item.id}">
          <span class="item-name">${item.name}${item.quantity > 1 ? ` (${item.quantity})` : ''}</span>
          <div class="item-details">
            <span class="item-price">${buyPrice}g</span>
            <span class="item-weight">${item.weight}lb</span>
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers for buying
    listEl.querySelectorAll('[data-vendor-item]').forEach(el => {
      el.addEventListener('click', () => {
        const itemId = (el as HTMLElement).dataset.vendorItem!;
        this.handleBuy(itemId);
      });
    });
  }

  renderPlayerItems() {
    const listEl = this.shopUIElement?.querySelector('#player-items-list');
    if (!listEl || !this.playerInventory) return;

    const items = Array.from(this.playerInventory.items.values());

    if (items.length === 0) {
      listEl.innerHTML = '<div class="empty-state">No items to sell</div>';
      return;
    }

    listEl.innerHTML = (items as Item[]).map((item: Item) => {
      const sellPrice = this.calculateSellPrice(item.value);
      return `
        <div class="item-row" data-player-item="${item.id}">
          <span class="item-name">${item.name}${item.quantity > 1 ? ` (${item.quantity})` : ''}</span>
          <div class="item-details">
            <span class="item-price">${sellPrice}g</span>
            <span class="item-weight">${item.weight}lb</span>
          </div>
        </div>
      `;
    }).join('');

    // Add click handlers for selling
    listEl.querySelectorAll('[data-player-item]').forEach(el => {
      el.addEventListener('click', () => {
        const itemId = (el as HTMLElement).dataset.playerItem!;
        this.handleSell(itemId);
      });
    });
  }

  calculateSellPrice(baseValue: number): number {
    if (!this.playerStats) return Math.floor(baseValue * 0.3);

    const mercantileSkill = this.playerStats.skills.mercantile || 0;
    const sellRatio = Math.min(0.6, 0.3 + mercantileSkill * 0.005);
    return Math.floor(baseValue * sellRatio);
  }

  handleBuy(itemId: string) {
    const item = this.vendorStock.get(itemId);
    if (!item || !this.playerInventory) return;

    const buyPrice = item.value;

    // Check if player has enough gold
    if (this.playerInventory.gold < buyPrice) {
      this.showMessage('Not enough gold!', '#ff4444');
      return;
    }

    // Check if player can carry the item
    const itemCopy = { ...item, quantity: 1 };
    if (!this.playerInventory.canCarry(itemCopy)) {
      this.showMessage('Too heavy to carry!', '#ff4444');
      return;
    }

    // Process purchase
    this.playerInventory.gold -= buyPrice;
    this.vendorGold += buyPrice;

    // Add item to player inventory
    this.playerInventory.addItem(itemCopy);

    // Remove from vendor stock
    item.quantity -= 1;
    if (item.quantity <= 0) {
      this.vendorStock.delete(itemId);
    }

    // Gain mercantile skill
    if (this.playerStats && this.playerStats.addSkillProgress) {
      this.playerStats.addSkillProgress('mercantile', 50);
    }

    this.showMessage(`Bought ${item.name} for ${buyPrice}g`, '#44ff44');
    this.updateShopUI();
  }

  handleSell(itemId: string) {
    if (!this.playerInventory) return;

    const item = this.playerInventory.items.get(itemId);
    if (!item) return;

    const sellPrice = this.calculateSellPrice(item.value);

    // Check if vendor has enough gold
    if (this.vendorGold < sellPrice) {
      this.showMessage('Vendor has insufficient gold!', '#ff4444');
      return;
    }

    // Process sale
    this.playerInventory.gold += sellPrice;
    this.vendorGold -= sellPrice;

    // Remove item from player inventory
    this.playerInventory.removeItem(itemId, 1);

    // Add to vendor stock (or increase quantity)
    const existingInStock = this.vendorStock.get(item.id);
    if (existingInStock && item.stackable) {
      existingInStock.quantity += 1;
    } else {
      const itemCopy = { ...item, quantity: 1 };
      this.vendorStock.set(item.id, itemCopy);
    }

    // Gain mercantile skill
    if (this.playerStats && this.playerStats.addSkillProgress) {
      this.playerStats.addSkillProgress('mercantile', 50);
    }

    this.showMessage(`Sold ${item.name} for ${sellPrice}g`, '#44ff44');
    this.updateShopUI();
  }

  showMessage(text: string, color: string) {
    const msg = document.createElement('div');
    msg.style.cssText = `
      position: fixed;
      top: 30%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.9);
      color: ${color};
      padding: 15px 30px;
      font-family: 'Georgia', serif;
      font-size: 16px;
      z-index: 2000;
      border: 1px solid #8B7355;
      text-align: center;
    `;
    msg.textContent = text;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 1500);
  }
}
