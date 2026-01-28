// Morrowind-style inventory system with equipment slots

import { SkillName } from './Stats';

export type ItemType = 'weapon' | 'armor' | 'clothing' | 'potion' | 'ingredient' | 'book' | 'misc' | 'gold';
export type ArmorSlot = 'head' | 'chest' | 'legs' | 'feet' | 'leftHand' | 'rightHand' | 'ring1' | 'ring2' | 'amulet';
export type WeaponType = 'longBlade' | 'shortBlade' | 'axe' | 'bluntWeapon' | 'spear' | 'marksman' | 'handToHand';
export type ArmorType = 'lightArmor' | 'mediumArmor' | 'heavyArmor' | 'unarmored';

export interface Item {
  id: string;
  name: string;
  type: ItemType;
  weight: number;
  value: number;
  icon?: string;
  stackable: boolean;
  quantity: number;

  // Weapon properties
  weaponType?: WeaponType;
  damage?: number;

  // Armor properties
  armorType?: ArmorType;
  armorSlot?: ArmorSlot;
  armorRating?: number;

  // Potion properties
  healthRestore?: number;
  magickaRestore?: number;
  fatigueRestore?: number;
}

export interface EquipmentSlots {
  head: Item | null;
  chest: Item | null;
  legs: Item | null;
  feet: Item | null;
  leftHand: Item | null;   // Shield or second weapon
  rightHand: Item | null;  // Primary weapon
  ring1: Item | null;
  ring2: Item | null;
  amulet: Item | null;
}

// Predefined items
export const ITEMS: Record<string, Omit<Item, 'quantity'>> = {
  iron_sword: {
    id: 'iron_sword',
    name: 'Iron Long Sword',
    type: 'weapon',
    weight: 8,
    value: 25,
    stackable: false,
    weaponType: 'longBlade',
    damage: 12,
  },
  iron_dagger: {
    id: 'iron_dagger',
    name: 'Iron Dagger',
    type: 'weapon',
    weight: 2,
    value: 10,
    stackable: false,
    weaponType: 'shortBlade',
    damage: 6,
  },
  steel_sword: {
    id: 'steel_sword',
    name: 'Steel Long Sword',
    type: 'weapon',
    weight: 10,
    value: 60,
    stackable: false,
    weaponType: 'longBlade',
    damage: 18,
  },
  iron_helm: {
    id: 'iron_helm',
    name: 'Iron Helmet',
    type: 'armor',
    weight: 4,
    value: 15,
    stackable: false,
    armorType: 'heavyArmor',
    armorSlot: 'head',
    armorRating: 10,
  },
  iron_cuirass: {
    id: 'iron_cuirass',
    name: 'Iron Cuirass',
    type: 'armor',
    weight: 20,
    value: 60,
    stackable: false,
    armorType: 'heavyArmor',
    armorSlot: 'chest',
    armorRating: 20,
  },
  leather_boots: {
    id: 'leather_boots',
    name: 'Leather Boots',
    type: 'armor',
    weight: 3,
    value: 8,
    stackable: false,
    armorType: 'lightArmor',
    armorSlot: 'feet',
    armorRating: 5,
  },
  health_potion: {
    id: 'health_potion',
    name: 'Restore Health Potion',
    type: 'potion',
    weight: 0.5,
    value: 20,
    stackable: true,
    healthRestore: 25,
  },
  fatigue_potion: {
    id: 'fatigue_potion',
    name: 'Restore Fatigue Potion',
    type: 'potion',
    weight: 0.5,
    value: 10,
    stackable: true,
    fatigueRestore: 50,
  },
  gold: {
    id: 'gold',
    name: 'Gold',
    type: 'gold',
    weight: 0,
    value: 1,
    stackable: true,
  },
  rat_meat: {
    id: 'rat_meat',
    name: 'Rat Meat',
    type: 'ingredient',
    weight: 0.5,
    value: 2,
    stackable: true,
  },
};

export class Inventory {
  items: Map<string, Item> = new Map();
  equipment: EquipmentSlots = {
    head: null,
    chest: null,
    legs: null,
    feet: null,
    leftHand: null,
    rightHand: null,
    ring1: null,
    ring2: null,
    amulet: null,
  };

  maxWeight = 200;
  gold = 50;

  // UI state
  isOpen = false;
  uiElement: HTMLElement | null = null;

  constructor() {
    this.createUI();
    this.setupControls();

    // Starting equipment - iron sword
    const sword = this.createItem('iron_sword');
    this.addItem(sword);
    this.equip(sword);

    // Starting items
    this.addItem(this.createItem('health_potion', 3));
  }

  createItem(itemId: string, quantity = 1): Item {
    const template = ITEMS[itemId];
    if (!template) throw new Error(`Unknown item: ${itemId}`);
    return { ...template, quantity };
  }

  getCurrentWeight(): number {
    let weight = 0;
    for (const item of this.items.values()) {
      weight += item.weight * item.quantity;
    }
    return weight;
  }

  canCarry(item: Item): boolean {
    return this.getCurrentWeight() + (item.weight * item.quantity) <= this.maxWeight;
  }

  addItem(item: Item): boolean {
    if (!this.canCarry(item)) return false;

    if (item.type === 'gold') {
      this.gold += item.quantity;
      this.updateUI();
      return true;
    }

    const existing = this.items.get(item.id);
    if (existing && item.stackable) {
      existing.quantity += item.quantity;
    } else {
      // For non-stackable, create unique key
      const key = item.stackable ? item.id : `${item.id}_${Date.now()}`;
      this.items.set(key, { ...item });
    }

    this.updateUI();
    return true;
  }

  removeItem(itemId: string, quantity = 1): boolean {
    const item = this.items.get(itemId);
    if (!item) return false;

    item.quantity -= quantity;
    if (item.quantity <= 0) {
      this.items.delete(itemId);
      // Unequip if equipped
      for (const [slot, equipped] of Object.entries(this.equipment)) {
        if (equipped?.id === itemId) {
          this.equipment[slot as ArmorSlot] = null;
        }
      }
    }

    this.updateUI();
    return true;
  }

  equip(item: Item): boolean {
    if (item.type === 'weapon') {
      // Unequip current weapon
      if (this.equipment.rightHand) {
        this.equipment.rightHand = null;
      }
      this.equipment.rightHand = item;
      this.updateUI();
      return true;
    }

    if (item.type === 'armor' && item.armorSlot) {
      const slot = item.armorSlot;
      this.equipment[slot] = item;
      this.updateUI();
      return true;
    }

    return false;
  }

  unequip(slot: ArmorSlot): Item | null {
    const item = this.equipment[slot];
    this.equipment[slot] = null;
    this.updateUI();
    return item;
  }

  getEquippedWeapon(): Item | null {
    return this.equipment.rightHand;
  }

  getEquippedDamage(): number {
    const weapon = this.equipment.rightHand;
    return weapon?.damage ?? 5; // Fist damage
  }

  getEquippedWeaponSkill(): SkillName {
    const weapon = this.equipment.rightHand;
    return (weapon?.weaponType as SkillName) ?? 'handToHand';
  }

  getTotalArmorRating(): number {
    let total = 0;
    for (const item of Object.values(this.equipment)) {
      if (item?.armorRating) {
        total += item.armorRating;
      }
    }
    return total;
  }

  usePotion(itemId: string): { health: number; magicka: number; fatigue: number } | null {
    const item = this.items.get(itemId);
    if (!item || item.type !== 'potion') return null;

    const result = {
      health: item.healthRestore ?? 0,
      magicka: item.magickaRestore ?? 0,
      fatigue: item.fatigueRestore ?? 0,
    };

    this.removeItem(itemId, 1);
    return result;
  }

  setupControls() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyI' || e.code === 'Tab') {
        e.preventDefault();
        this.toggleUI();
      }
    });
  }

  toggleUI() {
    this.isOpen = !this.isOpen;
    if (this.uiElement) {
      this.uiElement.style.display = this.isOpen ? 'flex' : 'none';
    }
    this.updateUI();
  }

  createUI() {
    this.uiElement = document.createElement('div');
    this.uiElement.id = 'inventory-ui';
    this.uiElement.innerHTML = `
      <style>
        #inventory-ui {
          display: none;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: rgba(20, 15, 10, 0.95);
          border: 2px solid #8B7355;
          color: #D4C4A8;
          font-family: 'Georgia', serif;
          padding: 20px;
          z-index: 1000;
          min-width: 600px;
          max-height: 80vh;
          overflow-y: auto;
        }
        #inventory-ui h2 {
          margin: 0 0 15px 0;
          color: #FFD700;
          border-bottom: 1px solid #8B7355;
          padding-bottom: 10px;
        }
        #inventory-ui .columns {
          display: flex;
          gap: 20px;
        }
        #inventory-ui .equipment-panel, #inventory-ui .items-panel {
          flex: 1;
        }
        #inventory-ui h3 {
          color: #C9A86C;
          margin: 10px 0 5px 0;
          font-size: 14px;
        }
        #inventory-ui .slot {
          background: rgba(0,0,0,0.3);
          border: 1px solid #5a4a3a;
          padding: 5px 10px;
          margin: 3px 0;
          font-size: 12px;
          cursor: pointer;
        }
        #inventory-ui .slot:hover {
          background: rgba(100,80,60,0.3);
        }
        #inventory-ui .slot.empty {
          color: #666;
          font-style: italic;
        }
        #inventory-ui .slot.equipped {
          border-color: #FFD700;
          background: rgba(100,80,0,0.2);
        }
        #inventory-ui .item {
          background: rgba(0,0,0,0.3);
          border: 1px solid #5a4a3a;
          padding: 5px 10px;
          margin: 3px 0;
          font-size: 12px;
          cursor: pointer;
          display: flex;
          justify-content: space-between;
        }
        #inventory-ui .item:hover {
          background: rgba(100,80,60,0.3);
        }
        #inventory-ui .gold-display {
          color: #FFD700;
          margin: 10px 0;
        }
        #inventory-ui .weight-display {
          color: #888;
          font-size: 11px;
        }
        #inventory-ui .close-btn {
          position: absolute;
          top: 10px;
          right: 10px;
          background: #5a4a3a;
          border: 1px solid #8B7355;
          color: #D4C4A8;
          padding: 5px 10px;
          cursor: pointer;
        }
      </style>
      <button class="close-btn">X</button>
      <h2>Inventory</h2>
      <div class="gold-display">Gold: <span id="inv-gold">0</span></div>
      <div class="weight-display">Weight: <span id="inv-weight">0</span> / <span id="inv-max-weight">200</span></div>
      <div class="columns">
        <div class="equipment-panel">
          <h3>Equipment</h3>
          <div id="equipment-slots"></div>
        </div>
        <div class="items-panel">
          <h3>Items</h3>
          <div id="item-list"></div>
        </div>
      </div>
    `;
    document.body.appendChild(this.uiElement);

    this.uiElement.querySelector('.close-btn')?.addEventListener('click', () => {
      this.toggleUI();
    });
  }

  updateUI() {
    if (!this.uiElement) return;

    // Update gold
    const goldEl = this.uiElement.querySelector('#inv-gold');
    if (goldEl) goldEl.textContent = this.gold.toString();

    // Update weight
    const weightEl = this.uiElement.querySelector('#inv-weight');
    if (weightEl) weightEl.textContent = this.getCurrentWeight().toFixed(1);

    const maxWeightEl = this.uiElement.querySelector('#inv-max-weight');
    if (maxWeightEl) maxWeightEl.textContent = this.maxWeight.toString();

    // Update equipment slots
    const slotsEl = this.uiElement.querySelector('#equipment-slots');
    if (slotsEl) {
      const slotNames: Record<ArmorSlot, string> = {
        head: 'Head',
        chest: 'Chest',
        legs: 'Legs',
        feet: 'Feet',
        leftHand: 'Left Hand',
        rightHand: 'Right Hand',
        ring1: 'Ring 1',
        ring2: 'Ring 2',
        amulet: 'Amulet',
      };

      slotsEl.innerHTML = Object.entries(slotNames).map(([slot, label]) => {
        const item = this.equipment[slot as ArmorSlot];
        const isEmpty = !item;
        return `
          <div class="slot ${isEmpty ? 'empty' : 'equipped'}" data-slot="${slot}">
            <strong>${label}:</strong> ${item ? item.name : '(empty)'}
            ${item?.damage ? ` (${item.damage} dmg)` : ''}
            ${item?.armorRating ? ` (${item.armorRating} AR)` : ''}
          </div>
        `;
      }).join('');

      // Add click handlers for unequipping
      slotsEl.querySelectorAll('.slot.equipped').forEach(el => {
        el.addEventListener('click', () => {
          const slot = (el as HTMLElement).dataset.slot as ArmorSlot;
          this.unequip(slot);
        });
      });
    }

    // Update item list
    const itemsEl = this.uiElement.querySelector('#item-list');
    if (itemsEl) {
      const items = Array.from(this.items.values());
      if (items.length === 0) {
        itemsEl.innerHTML = '<div class="slot empty">No items</div>';
      } else {
        itemsEl.innerHTML = items.map(item => `
          <div class="item" data-id="${item.id}">
            <span>${item.name}${item.quantity > 1 ? ` (${item.quantity})` : ''}</span>
            <span>${item.weight}lbs, ${item.value}g</span>
          </div>
        `).join('');

        // Add click handlers for using/equipping items
        itemsEl.querySelectorAll('.item').forEach(el => {
          el.addEventListener('click', () => {
            const itemId = (el as HTMLElement).dataset.id!;
            const item = this.items.get(itemId);
            if (item) {
              if (item.type === 'weapon' || item.type === 'armor') {
                this.equip(item);
              } else if (item.type === 'potion') {
                // Potions handled by player
              }
            }
          });
        });
      }
    }

    // Also update the simple equipped display
    this.updateSimpleDisplay();
  }

  updateSimpleDisplay() {
    let simpleEl = document.getElementById('equipped-simple');
    if (!simpleEl) {
      simpleEl = document.createElement('div');
      simpleEl.id = 'equipped-simple';
      simpleEl.innerHTML = `
        <style>
          #equipped-simple {
            position: fixed;
            bottom: 20px;
            left: 20px;
            color: #D4C4A8;
            font-family: 'Georgia', serif;
            font-size: 12px;
            background: rgba(0,0,0,0.5);
            padding: 8px 12px;
            border: 1px solid #5a4a3a;
          }
          #equipped-simple .weapon {
            color: #FFD700;
          }
        </style>
        <div class="content"></div>
      `;
      document.body.appendChild(simpleEl);
    }

    const weapon = this.equipment.rightHand;
    const content = simpleEl.querySelector('.content')!;
    content.innerHTML = `
      <span class="weapon">${weapon ? weapon.name : 'Fists'}</span>
      ${weapon?.damage ? ` (${weapon.damage} dmg)` : ' (5 dmg)'}
      | AR: ${this.getTotalArmorRating()}
      | Gold: ${this.gold}
    `;
  }
}
