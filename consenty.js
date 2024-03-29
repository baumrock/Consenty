var consenty;
(() => {
  class Consenty {
    elements = {};

    allow(prop) {
      this.save(prop, true);
    }

    getStorage() {
      let json = localStorage.getItem("consenty") || "{}";
      let storage;
      try {
        storage = JSON.parse(json);
        if (typeof storage !== "object") return {};
        if (!storage) return {};
        return storage;
      } catch (e) {
        return {};
      }
    }

    handleChange(e) {
      const el = e.target;

      // handle checkbox toggle
      if (el.type === "checkbox" && el.hasAttribute("consenty-toggle")) {
        const prop = el.getAttribute("consenty-toggle");
        if (el.checked) this.allow(prop);
        else this.revoke(prop);
      }
    }

    handleClick(e) {
      let el;
      if ((el = e.target.closest("[consenty-allow]"))) {
        // clicked on element with allow attribute
        const prop = el.getAttribute("consenty-allow");
        this.allow(prop);
      } else if ((el = e.target.closest("[consenty-revoke]"))) {
        // clicked on element with revoke attribute
        const prop = el.getAttribute("consenty-revoke");
        this.revoke(prop);
      }
    }

    hasConsent(name) {
      let storage = this.getStorage();
      return storage && name in storage ? !!storage[name] : false;
    }

    hideElement(id) {
      const element = this.elements[id];
      if (element.new) {
        element.new.remove();
        element.new = false;
        this.elements[id] = element;
      }
    }

    init() {
      this.reload();
      document.dispatchEvent(new CustomEvent("consenty:init"));
    }

    initCheckboxes() {
      document.querySelectorAll("[consenty-toggle]").forEach((checkbox) => {
        checkbox.checked = this.hasConsent(
          checkbox.getAttribute("consenty-toggle")
        );
      });
    }

    reload() {
      this.toggleIFs();
      this.initCheckboxes();
    }

    revoke(prop) {
      this.save(prop, false);
    }

    save(prop, value) {
      let storage = this.getStorage();
      const from = this.hasConsent(prop);
      if (!value) {
        delete storage[prop];
        document.dispatchEvent(
          new CustomEvent("consenty:revoke", { detail: prop })
        );
      } else {
        storage[prop] = 1;
        document.dispatchEvent(
          new CustomEvent("consenty:allow", { detail: prop })
        );
      }
      this.saveStorage(storage);
      document.dispatchEvent(
        new CustomEvent("consenty:change", {
          detail: {
            name: prop,
            from: from,
            to: this.hasConsent(prop),
          },
        })
      );
      this.toggleIFs();
    }

    saveStorage(storage) {
      localStorage.setItem("consenty", JSON.stringify(storage));
    }

    toggleIFs() {
      document.querySelectorAll("[consenty-if]").forEach((el) => {
        // get or set id of this element for later use
        let id;
        if (!el.hasAttribute("data-consenty-id")) {
          id = Object.keys(this.elements).length + 1;
          this.elements[id] = { old: el, new: false };
          el.setAttribute("data-consenty-id", id);
        } else {
          id = el.getAttribute("data-consenty-id");
        }

        // get property name and type
        const rawprop = el.getAttribute("consenty-if");
        const type = rawprop.startsWith("!") ? "hideif" : "showif";
        let prop = type === "showif" ? rawprop : rawprop.substring(1);

        // toggle element / code
        if (type === "showif") {
          if (this.hasConsent(prop)) this.showElement(id);
          else this.hideElement(id);
        } else {
          if (this.hasConsent(prop)) this.hideElement(id);
          else this.showElement(id);
        }
      });
    }

    showElement(id) {
      const element = this.elements[id];
      if (!element.new) {
        let tagName = element.old.tagName.toLowerCase();
        if (tagName === "template") {
          let newDiv = document.createElement("div");
          let el = element.old;
          el.parentNode.insertBefore(newDiv, el.nextSibling);
          newDiv.appendChild(document.importNode(el.content, true));
          element.new = newDiv;
          this.elements[id] = element;
          this.reload();
        }
      }
    }
  }

  // load consenty when dom is ready
  document.addEventListener("DOMContentLoaded", function () {
    consenty = new Consenty();
    consenty.init();
    document.addEventListener("click", consenty.handleClick.bind(consenty));
    document.addEventListener("change", consenty.handleChange.bind(consenty));
  });
})();
