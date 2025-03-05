class AToZUL extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  connectedCallback() {
    this.render();
  }

  render() {
    const template = document.createElement('template');
    template.innerHTML = `
      <style>
        menu {
          list-style-type: none;
          padding: 0;
        }
        menu li {
          display: inline;
          margin-right: 10px;
        }
        .letter-section {
          list-style-type: none;
        }
        .letter-section li:first a {
          text-decoration: none;
          font-weight: bold;
        }
        .back-to-menu {
          display: block;
          margin-top: 20px;
        }
      </style>
      <menu id="menu"></menu>
      <div id="list-container"></div>
      ${this.hasAttribute('long') ? '<a class="back-to-menu" href="#menu">Back to Menu</a>' : ''}
    `;

    this.shadowRoot.appendChild(template.content.cloneNode(true));

    const listContainer = this.shadowRoot.querySelector('#list-container');
    const menu = this.shadowRoot.querySelector('#menu');

    const ulElement = this.querySelector('ul');
    if (!ulElement) return;

    const items = Array.from(ulElement.querySelectorAll('li'));
    const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const sections = {};

    items.forEach(item => {
      const firstLetter = item.textContent.trim()[0].toUpperCase();
      if (!sections[firstLetter]) {
        sections[firstLetter] = [];
      }
      sections[firstLetter].push(item);
    });

    alphabet.split('').forEach(letter => {
      if (sections[letter]) {
        const menuItem = document.createElement('li');
        const menuLink = document.createElement('a');
        menuLink.href = `#section-${letter}`;
        menuLink.textContent = letter;
        menuLink.addEventListener('click', (event) => {
          event.preventDefault();
          const targetSection = this.shadowRoot.querySelector(`#section-${letter}`);
          this.scrollToSection(targetSection);
        });
        menuItem.appendChild(menuLink);
        menu.appendChild(menuItem);

        const section = document.createElement('ul');
        section.classList.add('letter-section');
        section.id = `section-${letter}`;
        const sectionHeading = document.createElement('li');
        const sectionHeadingLink = document.createElement('a');
        sectionHeadingLink.href = `#menu`;
        sectionHeadingLink.textContent = letter;
        sectionHeadingLink.addEventListener('click', (event) => {
          event.preventDefault();
          this.scrollToSection(menu);
        });
        sectionHeading.appendChild(sectionHeadingLink);
        section.appendChild(sectionHeading);

        sections[letter].forEach(item => {
          const clonedItem = item.cloneNode(true); // Clone the item to preserve nested HTML
          section.appendChild(clonedItem);
        });
        listContainer.appendChild(section);
      }
    });

    const backToMenuLink = this.shadowRoot.querySelector('.back-to-menu');
    if (backToMenuLink) {
      backToMenuLink.addEventListener('click', (event) => {
        event.preventDefault();
        this.scrollToSection(menu);
      });
    }
  }

  scrollToSection(section) {
    const yOffset = -100; // Adjust this value to control the offset from the top
    const y = section.getBoundingClientRect().top + window.pageYOffset + yOffset;

    window.scrollTo({
      top: y,
      behavior: 'smooth'
    });
  }
}

customElements.define('a-to-z-ul', AToZUL);

export { AToZUL };
