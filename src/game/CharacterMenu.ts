// Comprehensive Morrowind-style character menu
// Shows Stats, Skills, Inventory, and Level-up progress

import { CharacterStats, SkillName, AttributeName, SKILL_DEFINITIONS, Specialization } from './Stats';
import { Inventory } from './Inventory';

type MenuTab = 'stats' | 'skills' | 'inventory';

export class CharacterMenu {
  stats: CharacterStats;
  inventory: Inventory;

  isOpen = false;
  currentTab: MenuTab = 'stats';
  uiElement: HTMLElement | null = null;

  constructor(stats: CharacterStats, inventory: Inventory) {
    this.stats = stats;
    this.inventory = inventory;
    this.createUI();
    this.setupControls();
  }

  setupControls() {
    document.addEventListener('keydown', (e) => {
      if (e.code === 'KeyC') {
        this.toggle();
      }
      // Quick level up sword for testing (press L)
      if (e.code === 'KeyL') {
        this.stats.increaseSkill('longBlade', 1);
        this.showSkillIncrease('longBlade');
        this.update();
      }
      // Quick add 10 skill points for testing (press K)
      if (e.code === 'KeyK') {
        for (let i = 0; i < 10; i++) {
          this.stats.increaseSkill('longBlade', 1);
        }
        this.showSkillIncrease('longBlade', 10);
        this.update();
      }
    });
  }

  showSkillIncrease(skill: SkillName, amount = 1) {
    const def = SKILL_DEFINITIONS[skill];
    const msg = document.createElement('div');
    msg.style.cssText = `
      position: fixed;
      top: 40%;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0,0,0,0.9);
      color: #FFD700;
      padding: 15px 30px;
      font-family: 'Georgia', serif;
      font-size: 16px;
      z-index: 2000;
      border: 1px solid #8B7355;
      text-align: center;
    `;
    msg.innerHTML = `
      <div style="color: #00ff00;">Your ${def.name} skill increased${amount > 1 ? ` by ${amount}` : ''}!</div>
      <div style="font-size: 14px; color: #888; margin-top: 5px;">
        ${def.name}: ${this.stats.skills[skill]}
      </div>
    `;
    document.body.appendChild(msg);
    setTimeout(() => msg.remove(), 1500);
  }

  toggle() {
    this.isOpen = !this.isOpen;
    if (this.uiElement) {
      this.uiElement.style.display = this.isOpen ? 'block' : 'none';
    }
    if (this.isOpen) {
      this.update();
    }
  }

  createUI() {
    this.uiElement = document.createElement('div');
    this.uiElement.id = 'character-menu';
    this.uiElement.innerHTML = `
      <style>
        #character-menu {
          display: none;
          position: fixed;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          background: linear-gradient(135deg, rgba(30, 25, 20, 0.98), rgba(20, 15, 10, 0.98));
          border: 3px solid #8B7355;
          box-shadow: 0 0 30px rgba(0,0,0,0.8), inset 0 0 50px rgba(0,0,0,0.3);
          color: #D4C4A8;
          font-family: 'Georgia', serif;
          z-index: 1500;
          width: 750px;
          max-height: 85vh;
          overflow: hidden;
        }

        #character-menu .header {
          background: linear-gradient(to bottom, #3a2a1a, #2a1a0a);
          padding: 15px 20px;
          border-bottom: 2px solid #8B7355;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        #character-menu .header h2 {
          margin: 0;
          color: #FFD700;
          font-size: 20px;
          text-shadow: 2px 2px 4px rgba(0,0,0,0.5);
        }

        #character-menu .level-badge {
          background: #5a4a3a;
          padding: 8px 15px;
          border: 1px solid #8B7355;
          font-size: 14px;
        }

        #character-menu .level-badge .level {
          color: #FFD700;
          font-size: 18px;
          font-weight: bold;
        }

        #character-menu .tabs {
          display: flex;
          background: #2a1a0a;
          border-bottom: 1px solid #5a4a3a;
        }

        #character-menu .tab {
          flex: 1;
          padding: 12px;
          text-align: center;
          cursor: pointer;
          background: transparent;
          border: none;
          color: #888;
          font-family: 'Georgia', serif;
          font-size: 14px;
          transition: all 0.2s;
        }

        #character-menu .tab:hover {
          background: rgba(100,80,60,0.3);
          color: #D4C4A8;
        }

        #character-menu .tab.active {
          background: rgba(100,80,0,0.3);
          color: #FFD700;
          border-bottom: 2px solid #FFD700;
        }

        #character-menu .content {
          padding: 20px;
          max-height: calc(85vh - 120px);
          overflow-y: auto;
        }

        #character-menu .close-btn {
          background: #5a4a3a;
          border: 1px solid #8B7355;
          color: #D4C4A8;
          padding: 5px 12px;
          cursor: pointer;
          font-size: 14px;
        }

        #character-menu .close-btn:hover {
          background: #6a5a4a;
        }

        /* Level Progress Section */
        #character-menu .level-progress {
          background: rgba(0,0,0,0.3);
          border: 1px solid #5a4a3a;
          padding: 15px;
          margin-bottom: 20px;
        }

        #character-menu .level-progress h3 {
          color: #FFD700;
          margin: 0 0 10px 0;
          font-size: 14px;
        }

        #character-menu .progress-bar-container {
          background: rgba(0,0,0,0.5);
          border: 1px solid #3a3a3a;
          height: 20px;
          margin: 10px 0;
          position: relative;
        }

        #character-menu .progress-bar-fill {
          height: 100%;
          background: linear-gradient(to right, #4a6a2a, #6a8a3a);
          transition: width 0.3s;
        }

        #character-menu .progress-text {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          font-size: 12px;
          color: #fff;
          text-shadow: 1px 1px 2px rgba(0,0,0,0.8);
        }

        #character-menu .can-level {
          background: rgba(100,80,0,0.3);
          border-color: #FFD700;
        }

        #character-menu .can-level h3 {
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.6; }
        }

        /* Multipliers Grid */
        #character-menu .multipliers {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-top: 15px;
        }

        #character-menu .multiplier {
          background: rgba(0,0,0,0.3);
          border: 1px solid #3a3a3a;
          padding: 8px;
          text-align: center;
          font-size: 11px;
        }

        #character-menu .multiplier .attr-name {
          color: #888;
          margin-bottom: 3px;
        }

        #character-menu .multiplier .mult-value {
          color: #00ff00;
          font-size: 14px;
          font-weight: bold;
        }

        #character-menu .multiplier .mult-value.x1 { color: #888; }
        #character-menu .multiplier .mult-value.x2 { color: #88ff88; }
        #character-menu .multiplier .mult-value.x3 { color: #ffff00; }
        #character-menu .multiplier .mult-value.x4 { color: #ff8800; }
        #character-menu .multiplier .mult-value.x5 { color: #ff4400; }

        /* Attributes Section */
        #character-menu .attributes {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 10px;
          margin-bottom: 20px;
        }

        #character-menu .attribute {
          background: rgba(0,0,0,0.3);
          border: 1px solid #5a4a3a;
          padding: 10px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        #character-menu .attribute .name {
          color: #C9A86C;
        }

        #character-menu .attribute .value {
          color: #FFD700;
          font-size: 18px;
          font-weight: bold;
        }

        /* Derived Stats */
        #character-menu .derived-stats {
          display: flex;
          gap: 15px;
          margin-bottom: 20px;
        }

        #character-menu .derived-stat {
          flex: 1;
          background: rgba(0,0,0,0.3);
          border: 1px solid #5a4a3a;
          padding: 10px;
          text-align: center;
        }

        #character-menu .derived-stat .label {
          font-size: 11px;
          color: #888;
          margin-bottom: 5px;
        }

        #character-menu .derived-stat .bar {
          height: 15px;
          background: rgba(0,0,0,0.5);
          border: 1px solid #3a3a3a;
          margin-bottom: 5px;
        }

        #character-menu .derived-stat .fill {
          height: 100%;
        }

        #character-menu .health-fill { background: linear-gradient(to right, #8b0000, #cc0000); }
        #character-menu .magicka-fill { background: linear-gradient(to right, #000088, #0000cc); }
        #character-menu .fatigue-fill { background: linear-gradient(to right, #006600, #00aa00); }

        /* Skills Section */
        #character-menu .skills-container {
          display: flex;
          gap: 20px;
        }

        #character-menu .skill-category {
          flex: 1;
        }

        #character-menu .skill-category h4 {
          color: #FFD700;
          margin: 0 0 10px 0;
          font-size: 13px;
          border-bottom: 1px solid #5a4a3a;
          padding-bottom: 5px;
        }

        #character-menu .skill-category.combat h4 { border-color: #cc4444; color: #ff6666; }
        #character-menu .skill-category.magic h4 { border-color: #4444cc; color: #6666ff; }
        #character-menu .skill-category.stealth h4 { border-color: #44cc44; color: #66ff66; }

        #character-menu .skill {
          display: flex;
          align-items: center;
          padding: 4px 0;
          font-size: 11px;
          border-bottom: 1px solid rgba(90,74,58,0.3);
        }

        #character-menu .skill .name {
          flex: 1;
          color: #D4C4A8;
        }

        #character-menu .skill .name.major {
          color: #FFD700;
        }

        #character-menu .skill .name.minor {
          color: #C9A86C;
        }

        #character-menu .skill .value {
          width: 30px;
          text-align: right;
          color: #fff;
          font-weight: bold;
        }

        #character-menu .skill .progress {
          width: 60px;
          height: 8px;
          background: rgba(0,0,0,0.5);
          border: 1px solid #3a3a3a;
          margin-left: 8px;
        }

        #character-menu .skill .progress-fill {
          height: 100%;
          background: #4a8a4a;
        }

        #character-menu .skill .tag {
          font-size: 9px;
          padding: 1px 4px;
          margin-left: 5px;
          background: rgba(0,0,0,0.3);
          border: 1px solid;
        }

        #character-menu .skill .tag.major {
          border-color: #FFD700;
          color: #FFD700;
        }

        #character-menu .skill .tag.minor {
          border-color: #C9A86C;
          color: #C9A86C;
        }

        /* Inventory Tab Styles */
        #character-menu .inv-columns {
          display: flex;
          gap: 20px;
        }

        #character-menu .inv-column {
          flex: 1;
        }

        #character-menu .inv-column h4 {
          color: #FFD700;
          margin: 0 0 10px 0;
          font-size: 13px;
          border-bottom: 1px solid #5a4a3a;
          padding-bottom: 5px;
        }

        #character-menu .inv-slot {
          background: rgba(0,0,0,0.3);
          border: 1px solid #5a4a3a;
          padding: 6px 10px;
          margin: 4px 0;
          font-size: 11px;
          cursor: pointer;
        }

        #character-menu .inv-slot:hover {
          background: rgba(100,80,60,0.3);
        }

        #character-menu .inv-slot.empty {
          color: #555;
          font-style: italic;
        }

        #character-menu .inv-slot.equipped {
          border-color: #FFD700;
          background: rgba(100,80,0,0.2);
        }

        #character-menu .inv-item {
          background: rgba(0,0,0,0.3);
          border: 1px solid #5a4a3a;
          padding: 6px 10px;
          margin: 4px 0;
          font-size: 11px;
          display: flex;
          justify-content: space-between;
          cursor: pointer;
        }

        #character-menu .inv-item:hover {
          background: rgba(100,80,60,0.3);
        }

        #character-menu .inv-footer {
          margin-top: 15px;
          padding-top: 10px;
          border-top: 1px solid #5a4a3a;
          display: flex;
          justify-content: space-between;
          font-size: 12px;
        }

        #character-menu .inv-footer .gold {
          color: #FFD700;
        }

        /* Testing notice */
        #character-menu .test-notice {
          background: rgba(100,0,0,0.3);
          border: 1px solid #884444;
          padding: 10px;
          margin-bottom: 15px;
          font-size: 11px;
          color: #ffaaaa;
        }
      </style>

      <div class="header">
        <h2>${this.stats.class.name}</h2>
        <div class="level-badge">
          Level <span class="level">${this.stats.level}</span>
        </div>
        <button class="close-btn">Close [C]</button>
      </div>

      <div class="tabs">
        <button class="tab active" data-tab="stats">Stats</button>
        <button class="tab" data-tab="skills">Skills</button>
        <button class="tab" data-tab="inventory">Inventory</button>
      </div>

      <div class="content" id="menu-content">
        <!-- Content filled dynamically -->
      </div>
    `;

    document.body.appendChild(this.uiElement);

    // Tab switching
    this.uiElement.querySelectorAll('.tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentTab = (tab as HTMLElement).dataset.tab as MenuTab;
        this.uiElement!.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        this.update();
      });
    });

    // Close button
    this.uiElement.querySelector('.close-btn')?.addEventListener('click', () => {
      this.toggle();
    });
  }

  update() {
    if (!this.uiElement || !this.isOpen) return;

    // Update level in header
    const levelEl = this.uiElement.querySelector('.level-badge .level');
    if (levelEl) levelEl.textContent = this.stats.level.toString();

    const content = this.uiElement.querySelector('#menu-content');
    if (!content) return;

    switch (this.currentTab) {
      case 'stats':
        content.innerHTML = this.renderStatsTab();
        break;
      case 'skills':
        content.innerHTML = this.renderSkillsTab();
        break;
      case 'inventory':
        content.innerHTML = this.renderInventoryTab();
        this.setupInventoryHandlers();
        break;
    }
  }

  renderStatsTab(): string {
    const s = this.stats;
    const progress = (s.skillIncreasesThisLevel / s.skillIncreasesNeeded) * 100;
    const canLevel = s.canLevelUp;

    const attrs: AttributeName[] = ['strength', 'intelligence', 'willpower', 'agility', 'speed', 'endurance', 'personality', 'luck'];

    return `
      <div class="test-notice">
        <strong>Testing:</strong> Press <b>L</b> to increase Long Blade skill by 1 | Press <b>K</b> to increase by 10
      </div>

      <div class="level-progress ${canLevel ? 'can-level' : ''}">
        <h3>${canLevel ? '🌟 READY TO LEVEL UP! Sleep in bed to level up! 🌟' : 'Level Progress'}</h3>
        <div class="progress-bar-container">
          <div class="progress-bar-fill" style="width: ${Math.min(100, progress)}%"></div>
          <div class="progress-text">${s.skillIncreasesThisLevel} / ${s.skillIncreasesNeeded} Major/Minor Skill Increases</div>
        </div>

        <div style="margin-top: 15px; font-size: 12px; color: #888;">
          Level-Up Attribute Multipliers (based on skill increases this level):
        </div>
        <div class="multipliers">
          ${attrs.map(attr => {
            const mult = s.getAttributeMultiplier(attr);
            const increases = s.attributeSkillIncreases[attr];
            return `
              <div class="multiplier">
                <div class="attr-name">${attr.slice(0, 3).toUpperCase()}</div>
                <div class="mult-value x${mult}">x${mult}</div>
                <div style="font-size: 9px; color: #666;">(${increases} skills)</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <h3 style="color: #FFD700; margin-bottom: 10px;">Attributes</h3>
      <div class="attributes">
        ${attrs.map(attr => `
          <div class="attribute">
            <span class="name">${attr.charAt(0).toUpperCase() + attr.slice(1)}</span>
            <span class="value">${s.attributes[attr]}</span>
          </div>
        `).join('')}
      </div>

      <h3 style="color: #FFD700; margin-bottom: 10px;">Derived Stats</h3>
      <div class="derived-stats">
        <div class="derived-stat">
          <div class="label">Health</div>
          <div class="bar"><div class="fill health-fill" style="width: ${(s.health / s.maxHealth) * 100}%"></div></div>
          <div>${Math.floor(s.health)} / ${s.maxHealth}</div>
        </div>
        <div class="derived-stat">
          <div class="label">Magicka</div>
          <div class="bar"><div class="fill magicka-fill" style="width: ${(s.magicka / s.maxMagicka) * 100}%"></div></div>
          <div>${Math.floor(s.magicka)} / ${s.maxMagicka}</div>
        </div>
        <div class="derived-stat">
          <div class="label">Fatigue</div>
          <div class="bar"><div class="fill fatigue-fill" style="width: ${(s.fatigue / s.maxFatigue) * 100}%"></div></div>
          <div>${Math.floor(s.fatigue)} / ${s.maxFatigue}</div>
        </div>
      </div>

      <div style="font-size: 11px; color: #666; margin-top: 10px;">
        Class: ${s.class.name} | Specialization: ${s.class.specialization.charAt(0).toUpperCase() + s.class.specialization.slice(1)}
        <br>Favored Attributes: ${s.class.favoredAttributes.map(a => a.charAt(0).toUpperCase() + a.slice(1)).join(', ')}
      </div>
    `;
  }

  renderSkillsTab(): string {
    const s = this.stats;

    const groupBySpec = (spec: Specialization) => {
      return (Object.entries(SKILL_DEFINITIONS) as [SkillName, typeof SKILL_DEFINITIONS[SkillName]][])
        .filter(([_, def]) => def.specialization === spec)
        .map(([skill, def]) => {
          const value = s.skills[skill];
          const progress = s.skillProgress[skill];
          const isMajor = s.majorSkills.has(skill);
          const isMinor = s.minorSkills.has(skill);
          const govAttr = def.governingAttribute.slice(0, 3).toUpperCase();

          return `
            <div class="skill">
              <span class="name ${isMajor ? 'major' : ''} ${isMinor ? 'minor' : ''}">${def.name}</span>
              ${isMajor ? '<span class="tag major">Major</span>' : ''}
              ${isMinor ? '<span class="tag minor">Minor</span>' : ''}
              <span style="color: #666; font-size: 9px; margin-left: 5px;">${govAttr}</span>
              <span class="value">${value}</span>
              <div class="progress">
                <div class="progress-fill" style="width: ${progress}%"></div>
              </div>
            </div>
          `;
        }).join('');
    };

    return `
      <div class="test-notice">
        <strong>Testing:</strong> Press <b>L</b> to increase Long Blade skill by 1 | Press <b>K</b> to increase by 10
      </div>

      <div style="margin-bottom: 15px; font-size: 11px; color: #888;">
        <span style="color: #FFD700;">■</span> Major Skills (+25 start, count toward level)
        <span style="color: #C9A86C; margin-left: 10px;">■</span> Minor Skills (+10 start, count toward level)
        <br>Progress bars show advancement toward next skill point (100% = +1 skill)
      </div>

      <div class="skills-container">
        <div class="skill-category combat">
          <h4>Combat</h4>
          ${groupBySpec('combat')}
        </div>
        <div class="skill-category magic">
          <h4>Magic</h4>
          ${groupBySpec('magic')}
        </div>
        <div class="skill-category stealth">
          <h4>Stealth</h4>
          ${groupBySpec('stealth')}
        </div>
      </div>
    `;
  }

  renderInventoryTab(): string {
    const inv = this.inventory;

    const slotNames: Record<string, string> = {
      head: 'Head',
      chest: 'Chest',
      legs: 'Legs',
      feet: 'Feet',
      leftHand: 'Left Hand',
      rightHand: 'Right Hand (Weapon)',
      ring1: 'Ring 1',
      ring2: 'Ring 2',
      amulet: 'Amulet',
    };

    const equipmentHTML = Object.entries(slotNames).map(([slot, label]) => {
      const item = inv.equipment[slot as keyof typeof inv.equipment];
      if (item) {
        return `
          <div class="inv-slot equipped" data-slot="${slot}">
            <strong>${label}:</strong> ${item.name}
            ${item.damage ? ` (${item.damage} dmg)` : ''}
            ${item.armorRating ? ` (${item.armorRating} AR)` : ''}
          </div>
        `;
      }
      return `<div class="inv-slot empty" data-slot="${slot}"><strong>${label}:</strong> (empty)</div>`;
    }).join('');

    const items = Array.from(inv.items.values());
    const itemsHTML = items.length > 0
      ? items.map(item => `
          <div class="inv-item" data-id="${item.id}">
            <span>${item.name}${item.quantity > 1 ? ` (${item.quantity})` : ''}</span>
            <span style="color: #888;">${item.weight}lb ${item.value}g</span>
          </div>
        `).join('')
      : '<div class="inv-slot empty">No items in inventory</div>';

    return `
      <div class="inv-columns">
        <div class="inv-column">
          <h4>Equipment</h4>
          ${equipmentHTML}
        </div>
        <div class="inv-column">
          <h4>Items</h4>
          ${itemsHTML}
        </div>
      </div>

      <div class="inv-footer">
        <span class="gold">Gold: ${inv.gold}</span>
        <span>Weight: ${inv.getCurrentWeight().toFixed(1)} / ${inv.maxWeight}</span>
        <span>Armor Rating: ${inv.getTotalArmorRating()}</span>
      </div>
    `;
  }

  setupInventoryHandlers() {
    if (!this.uiElement) return;

    // Equipment slot click - unequip
    this.uiElement.querySelectorAll('.inv-slot.equipped').forEach(el => {
      el.addEventListener('click', () => {
        const slot = (el as HTMLElement).dataset.slot;
        if (slot) {
          this.inventory.unequip(slot as any);
          this.update();
        }
      });
    });

    // Item click - equip if weapon/armor
    this.uiElement.querySelectorAll('.inv-item').forEach(el => {
      el.addEventListener('click', () => {
        const id = (el as HTMLElement).dataset.id;
        if (id) {
          const item = this.inventory.items.get(id);
          if (item && (item.type === 'weapon' || item.type === 'armor')) {
            this.inventory.equip(item);
            this.update();
          }
        }
      });
    });
  }
}
