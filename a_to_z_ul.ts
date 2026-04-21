// a_to_z_ul.ts provides a custom element that organises a <ul> list into
// alphabetical sections with a jump menu at the top.

class AToZUL extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.render();
  }

  private render() {
    const template = document.createElement("template");
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
        .letter-section li {
          text-decoration: none;
          font-weight: none;
        }
        .back-to-menu {
          display: block;
          margin-top: 20px;
        }
      </style>
      <menu id="menu"></menu>
      <div id="list-container"></div>
      ${
      this.hasAttribute("long")
        ? '<a class="back-to-menu" href="#menu">Back to Menu</a>'
        : ""
    }
    `;

    this.shadowRoot!.appendChild(template.content.cloneNode(true));

    const listContainer = this.shadowRoot!.querySelector(
      "#list-container",
    ) as HTMLElement;
    const menu = this.shadowRoot!.querySelector("#menu") as HTMLElement;

    const ulElement = this.querySelector("ul");
    if (!ulElement) return;

    const items = Array.from(ulElement.querySelectorAll("li"));
    const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
    const sections: Record<string, HTMLLIElement[]> = {};

    items.forEach((item) => {
      const firstLetter = (item.textContent?.trim()[0] ?? "").toUpperCase();
      if (!sections[firstLetter]) sections[firstLetter] = [];
      sections[firstLetter].push(item);
    });

    alphabet.split("").forEach((letter) => {
      if (!sections[letter]) return;

      const menuItem = document.createElement("li");
      const menuLink = document.createElement("a");
      menuLink.href = `#section-${letter}`;
      menuLink.textContent = letter;
      menuLink.addEventListener("click", (event) => {
        event.preventDefault();
        const target = this.shadowRoot!.querySelector(
          `#section-${letter}`,
        ) as HTMLElement | null;
        if (target) this.scrollToSection(target);
      });
      menuItem.appendChild(menuLink);
      menu.appendChild(menuItem);

      const section = document.createElement("ul");
      section.classList.add("letter-section");
      section.id = `section-${letter}`;

      const sectionHeading = document.createElement("li");
      const sectionHeadingLink = document.createElement("a");
      sectionHeadingLink.href = "#menu";
      sectionHeadingLink.textContent = letter;
      sectionHeadingLink.addEventListener("click", (event) => {
        event.preventDefault();
        this.scrollToSection(menu);
      });
      sectionHeading.appendChild(sectionHeadingLink);
      section.appendChild(sectionHeading);

      sections[letter].forEach((item) => {
        section.appendChild(item.cloneNode(true));
      });
      listContainer.appendChild(section);
    });

    const backToMenuLink = this.shadowRoot!.querySelector(
      ".back-to-menu",
    ) as HTMLElement | null;
    backToMenuLink?.addEventListener("click", (event) => {
      event.preventDefault();
      this.scrollToSection(menu);
    });
  }

  private scrollToSection(section: HTMLElement) {
    const yOffset = -100;
    const y = section.getBoundingClientRect().top + window.pageYOffset +
      yOffset;
    window.scrollTo({ top: y, behavior: "smooth" });
  }
}

customElements.define("a-to-z-ul", AToZUL);

export { AToZUL };
