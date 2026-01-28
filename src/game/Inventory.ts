export interface Item {
  id: string;
  name: string;
  type: 'weapon' | 'armor' | 'consumable' | 'misc';
  damage?: number;
  defense?: number;
  quantity: number;
  icon?: string;
}

export class Inventory {
  items: Map<string, Item> = new Map();
  maxSlots = 20;
  equippedWeapon: Item | null = null;

  constructor() {
    // Start with a basic sword
    this.addItem({
      id: 'iron_sword',
      name: 'Iron Sword',
      type: 'weapon',
      damage: 10,
      quantity: 1
    });
    this.equipWeapon('iron_sword');
  }

  addItem(item: Item): boolean {
    const existing = this.items.get(item.id);
    if (existing) {
      existing.quantity += item.quantity;
      this.updateUI();
      return true;
    }

    if (this.items.size >= this.maxSlots) {
      return false;
    }

    this.items.set(item.id, { ...item });
    this.updateUI();
    return true;
  }

  removeItem(id: string, quantity = 1): boolean {
    const item = this.items.get(id);
    if (!item) return false;

    item.quantity -= quantity;
    if (item.quantity <= 0) {
      this.items.delete(id);
      if (this.equippedWeapon?.id === id) {
        this.equippedWeapon = null;
      }
    }
    this.updateUI();
    return true;
  }

  equipWeapon(id: string): boolean {
    const item = this.items.get(id);
    if (!item || item.type !== 'weapon') return false;
    this.equippedWeapon = item;
    this.updateUI();
    return true;
  }

  getEquippedDamage(): number {
    return this.equippedWeapon?.damage ?? 5; // Fist damage
  }

  updateUI() {
    let inventoryEl = document.getElementById('inventory');
    if (!inventoryEl) {
      inventoryEl = document.createElement('div');
      inventoryEl.id = 'inventory';
      inventoryEl.innerHTML = `
        <style>
          #inventory {
            position: fixed;
            bottom: 20px;
            left: 20px;
            color: #c9a86c;
            font-family: 'Georgia', serif;
            font-size: 14px;
            text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
            pointer-events: none;
            background: rgba(0,0,0,0.5);
            padding: 10px 15px;
            border: 1px solid #5a4a3a;
          }
          #inventory .equipped {
            color: #ffd700;
          }
        </style>
        <div class="content"></div>
      `;
      document.body.appendChild(inventoryEl);
    }

    const content = inventoryEl.querySelector('.content')!;
    const equipped = this.equippedWeapon;

    content.innerHTML = `
      <div class="equipped">Equipped: ${equipped ? `${equipped.name} (${equipped.damage} dmg)` : 'Fists'}</div>
    `;
  }
}
