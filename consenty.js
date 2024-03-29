var consenty;
(() => {
  class Consenty {
    elements = {};
    loadProps = {};

    allow(prop) {
      this.change(prop, true);
    }

    click(selector) {
      console.log(selector);
      document.querySelectorAll(selector).forEach((element) => {
        console.log(element);
        element.click();
      });
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
      } else if ((el = e.target.closest("[consenty-show]"))) {
        // clicked on element with show attribute
        const prop = el.getAttribute("consenty-show");
        this.load(prop);
      }

      // trigger consenty:click event if [consenty-click] was clicked
      if ((el = e.target.closest("[consenty-click]"))) {
        const prop = el.getAttribute("consenty-click");
        document.dispatchEvent(
          new CustomEvent("consenty:click", { detail: prop })
        );
        e.preventDefault();
      }
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
      document.dispatchEvent(new CustomEvent("consenty:beforeinit"));
      this.reload();
      document.dispatchEvent(new CustomEvent("consenty:init"));
    }

    initCheckboxes() {
      document.querySelectorAll("[consenty-toggle]").forEach((checkbox) => {
        checkbox.checked = this.isAllowed(
          checkbox.getAttribute("consenty-toggle")
        );
      });
    }

    isAllowed(name) {
      let storage = this.getStorage();
      return storage && name in storage ? !!storage[name] : false;
    }

    reload() {
      this.toggleIFs();
      this.initCheckboxes();
    }

    revoke(prop) {
      this.change(prop, false);
    }

    change(prop, value) {
      document.dispatchEvent(
        new CustomEvent("consenty:beforechange", {
          detail: {
            name: prop,
            from: this.isAllowed(prop),
            to: !!value,
          },
        })
      );
      let storage = this.getStorage();
      const from = this.isAllowed(prop);
      if (!value) {
        document.dispatchEvent(
          new CustomEvent("consenty:beforerevoke", { detail: prop })
        );
        delete storage[prop];
        document.dispatchEvent(
          new CustomEvent("consenty:revoke", { detail: prop })
        );
      } else {
        document.dispatchEvent(
          new CustomEvent("consenty:beforeallow", { detail: prop })
        );
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
            to: this.isAllowed(prop),
          },
        })
      );
      this.reload();
    }

    saveStorage(storage) {
      localStorage.setItem("consenty", JSON.stringify(storage));
    }

    toggleIFs() {
      document.querySelectorAll("[consenty-if]").forEach((el) => {
        // get property name and type
        const rawprop = el.getAttribute("consenty-if");
        const type = rawprop.startsWith("!") ? "hideif" : "showif";
        let prop = type === "showif" ? rawprop : rawprop.substring(1);
        const show = this.loadProps.hasOwnProperty(prop);

        // get or set id of this element for later use
        let id;
        if (!el.hasAttribute("data-consenty-id")) {
          id = Object.keys(this.elements).length + 1;
          this.elements[id] = { old: el, new: false, prop };
          el.setAttribute("data-consenty-id", id);
        } else {
          id = el.getAttribute("data-consenty-id");
        }

        // toggle element / code
        if (type === "showif") {
          if (show || this.isAllowed(prop)) this.loadElement(id);
          else this.hideElement(id);
        } else {
          if (show || this.isAllowed(prop)) this.hideElement(id);
          else this.loadElement(id);
        }
      });
    }

    load(prop) {
      return new Promise((resolve) => {
        this.loadProps[prop] = true;
        this.reload();
        resolve();
      });
    }

    loadElement(id) {
      const element = this.elements[id];
      if (!element.new) {
        let tagName = element.old.tagName.toLowerCase();
        if (tagName !== "template") return;

        document.dispatchEvent(
          new CustomEvent("consenty:beforeload", {
            detail: id,
          })
        );

        let el = element.old;
        let newDiv = document.createElement(
          el.getAttribute("consenty-tag") === "span" ? "span" : "div"
        );
        el.parentNode.insertBefore(newDiv, el.nextSibling);
        newDiv.appendChild(document.importNode(el.content, true));
        element.new = newDiv;
        this.elements[id] = element;

        document.dispatchEvent(
          new CustomEvent("consenty:load", {
            detail: id,
          })
        );

        // this will make it work recursively
        this.reload();
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
