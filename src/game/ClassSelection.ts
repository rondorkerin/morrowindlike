// Class selection screen displayed on game start

export class ClassSelection {
  private container: HTMLElement | null = null;
  private resolveSelection: ((className: string) => void) | null = null;
  private selectedClass: string | null = null;

  constructor() {
    this.createUI();
  }

  private createUI() {
    // Main container
    this.container = document.createElement('div');
    this.container.id = 'class-selection';
    this.container.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.95);
      display: none;
      justify-content: center;
      align-items: center;
      z-index: 3000;
      opacity: 0;
      transition: opacity 0.5s;
    `;

    // Content wrapper
    const content = document.createElement('div');
    content.style.cssText = `
      text-align: center;
      max-width: 1000px;
      padding: 40px;
    `;

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Choose Your Class';
    title.style.cssText = `
      font-family: 'Georgia', serif;
      font-size: 48px;
      color: #FFD700;
      margin-bottom: 50px;
      text-shadow: 3px 3px 6px rgba(0,0,0,0.8);
      letter-spacing: 2px;
    `;
    content.appendChild(title);

    // Cards container
    const cardsContainer = document.createElement('div');
    cardsContainer.style.cssText = `
      display: flex;
      gap: 30px;
      justify-content: center;
      margin-bottom: 40px;
    `;

    // Class definitions
    const classes = [
      {
        id: 'warrior',
        name: 'Warrior',
        icon: '⚔️',
        description: 'Master of arms and armor. Excel in close combat with blade and shield.',
        specialization: 'Combat',
        favored: 'Strength, Endurance',
        majorSkills: ['Long Blade', 'Heavy Armor', 'Medium Armor', 'Block', 'Armorer']
      },
      {
        id: 'mage',
        name: 'Mage',
        icon: '✦',
        description: 'Wielder of arcane arts. Command the elements and bend reality.',
        specialization: 'Magic',
        favored: 'Intelligence, Willpower',
        majorSkills: ['Destruction', 'Restoration', 'Mysticism', 'Alteration', 'Conjuration']
      },
      {
        id: 'archer',
        name: 'Archer',
        icon: '🏹',
        description: 'Silent and deadly. Strike from the shadows with precision.',
        specialization: 'Stealth',
        favored: 'Agility, Speed',
        majorSkills: ['Marksman', 'Sneak', 'Light Armor', 'Athletics', 'Acrobatics']
      }
    ];

    // Create cards
    classes.forEach(cls => {
      const card = this.createClassCard(cls);
      cardsContainer.appendChild(card);
    });

    content.appendChild(cardsContainer);

    // Begin button (initially hidden)
    const beginButton = document.createElement('button');
    beginButton.id = 'begin-journey-btn';
    beginButton.textContent = 'Begin Journey';
    beginButton.style.cssText = `
      display: none;
      font-family: 'Georgia', serif;
      font-size: 20px;
      padding: 15px 40px;
      background: linear-gradient(135deg, #8B7355, #6B5345);
      color: #FFD700;
      border: 2px solid #FFD700;
      cursor: pointer;
      transition: all 0.3s;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
      box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    `;
    beginButton.addEventListener('mouseenter', () => {
      beginButton.style.background = 'linear-gradient(135deg, #9B8365, #7B6355)';
      beginButton.style.transform = 'scale(1.05)';
      beginButton.style.boxShadow = '0 6px 20px rgba(255,215,0,0.4)';
    });
    beginButton.addEventListener('mouseleave', () => {
      beginButton.style.background = 'linear-gradient(135deg, #8B7355, #6B5345)';
      beginButton.style.transform = 'scale(1)';
      beginButton.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
    });
    beginButton.addEventListener('click', () => {
      if (this.selectedClass && this.resolveSelection) {
        this.resolveSelection(this.selectedClass);
      }
    });
    content.appendChild(beginButton);

    this.container.appendChild(content);
    document.body.appendChild(this.container);

    // Add keyframes for animations
    if (!document.getElementById('class-selection-style')) {
      const style = document.createElement('style');
      style.id = 'class-selection-style';
      style.textContent = `
        @keyframes cardGlow {
          0%, 100% { box-shadow: 0 0 20px rgba(255,215,0,0.5), inset 0 0 20px rgba(255,215,0,0.1); }
          50% { box-shadow: 0 0 30px rgba(255,215,0,0.8), inset 0 0 30px rgba(255,215,0,0.2); }
        }
      `;
      document.head.appendChild(style);
    }
  }

  private createClassCard(cls: { id: string; name: string; icon: string; description: string; specialization: string; favored: string; majorSkills: string[] }): HTMLElement {
    const card = document.createElement('div');
    card.className = 'class-card';
    card.dataset.class = cls.id;
    card.style.cssText = `
      width: 250px;
      background: rgba(30, 25, 20, 0.9);
      border: 2px solid #8B7355;
      padding: 25px 20px;
      cursor: pointer;
      transition: all 0.3s;
      box-shadow: 0 4px 15px rgba(0,0,0,0.5);
    `;

    // Icon
    const icon = document.createElement('div');
    icon.textContent = cls.icon;
    icon.style.cssText = `
      font-size: 48px;
      margin-bottom: 15px;
      filter: drop-shadow(2px 2px 4px rgba(0,0,0,0.8));
    `;
    card.appendChild(icon);

    // Name
    const name = document.createElement('h2');
    name.textContent = cls.name;
    name.style.cssText = `
      font-family: 'Georgia', serif;
      font-size: 28px;
      color: #FFD700;
      margin-bottom: 15px;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.8);
    `;
    card.appendChild(name);

    // Description
    const description = document.createElement('p');
    description.textContent = cls.description;
    description.style.cssText = `
      font-family: 'Georgia', serif;
      font-size: 13px;
      color: #D4C4A8;
      line-height: 1.5;
      margin-bottom: 20px;
      min-height: 60px;
    `;
    card.appendChild(description);

    // Specialization
    const specialization = document.createElement('div');
    specialization.innerHTML = `<strong style="color: #C9A86C;">Specialization:</strong> ${cls.specialization}`;
    specialization.style.cssText = `
      font-family: 'Georgia', serif;
      font-size: 12px;
      color: #D4C4A8;
      margin-bottom: 8px;
      text-align: left;
    `;
    card.appendChild(specialization);

    // Favored Attributes
    const favored = document.createElement('div');
    favored.innerHTML = `<strong style="color: #C9A86C;">Favored:</strong> ${cls.favored}`;
    favored.style.cssText = `
      font-family: 'Georgia', serif;
      font-size: 12px;
      color: #D4C4A8;
      margin-bottom: 12px;
      text-align: left;
    `;
    card.appendChild(favored);

    // Major Skills
    const skillsLabel = document.createElement('div');
    skillsLabel.textContent = 'Major Skills:';
    skillsLabel.style.cssText = `
      font-family: 'Georgia', serif;
      font-size: 12px;
      color: #C9A86C;
      font-weight: bold;
      margin-bottom: 6px;
      text-align: left;
    `;
    card.appendChild(skillsLabel);

    const skillsList = document.createElement('ul');
    skillsList.style.cssText = `
      font-family: 'Georgia', serif;
      font-size: 11px;
      color: #D4C4A8;
      list-style: none;
      padding: 0;
      text-align: left;
    `;
    cls.majorSkills.forEach(skill => {
      const li = document.createElement('li');
      li.textContent = `• ${skill}`;
      li.style.cssText = `
        margin-bottom: 3px;
      `;
      skillsList.appendChild(li);
    });
    card.appendChild(skillsList);

    // Hover effects
    card.addEventListener('mouseenter', () => {
      card.style.transform = 'scale(1.05)';
      card.style.borderColor = '#FFD700';
      card.style.boxShadow = '0 0 25px rgba(255,215,0,0.6)';
    });
    card.addEventListener('mouseleave', () => {
      if (card.dataset.class !== this.selectedClass) {
        card.style.transform = 'scale(1)';
        card.style.borderColor = '#8B7355';
        card.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
      }
    });

    // Click handler
    card.addEventListener('click', () => {
      this.selectClass(cls.id);
    });

    return card;
  }

  private selectClass(className: string) {
    this.selectedClass = className;

    // Update all cards
    const cards = this.container?.querySelectorAll('.class-card');
    cards?.forEach(card => {
      const cardElement = card as HTMLElement;
      if (cardElement.dataset.class === className) {
        // Selected card
        cardElement.style.borderColor = '#FFD700';
        cardElement.style.transform = 'scale(1.05)';
        cardElement.style.animation = 'cardGlow 2s infinite';
        cardElement.style.boxShadow = '0 0 25px rgba(255,215,0,0.6)';
      } else {
        // Unselected cards
        cardElement.style.borderColor = '#8B7355';
        cardElement.style.transform = 'scale(1)';
        cardElement.style.animation = 'none';
        cardElement.style.boxShadow = '0 4px 15px rgba(0,0,0,0.5)';
      }
    });

    // Show begin button
    const beginButton = this.container?.querySelector('#begin-journey-btn') as HTMLElement;
    if (beginButton) {
      beginButton.style.display = 'inline-block';
    }
  }

  show(): Promise<string> {
    return new Promise((resolve) => {
      this.resolveSelection = resolve;

      if (this.container) {
        this.container.style.display = 'flex';
        // Trigger fade-in
        setTimeout(() => {
          if (this.container) {
            this.container.style.opacity = '1';
          }
        }, 10);
      }
    });
  }

  hide() {
    if (this.container) {
      this.container.style.opacity = '0';
      setTimeout(() => {
        if (this.container) {
          this.container.style.display = 'none';
          this.container.remove();
          this.container = null;
        }
      }, 500);
    }
  }
}
