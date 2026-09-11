/**
 * Andrés Lizcano — navegación, filtros y microinteracciones compartidas.
 */

(() => {
  "use strict";

  const header = document.getElementById("header");
  const nav = document.getElementById("nav");
  const menuToggle = document.getElementById("menuToggle");
  const yearEl = document.getElementById("year");
  const featuredNext = document.getElementById("featuredNext");

  /* ---------- Year ---------- */
  if (yearEl) {
    yearEl.textContent = String(new Date().getFullYear());
  }

  /* ---------- Header scroll state ---------- */
  const onScroll = () => {
    if (!header) return;
    header.classList.toggle("is-scrolled", window.scrollY > 12);
  };

  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Mobile / overlay menu ---------- */
  const setMenuOpen = (open) => {
    if (!nav || !menuToggle) return;
    nav.classList.toggle("is-open", open);
    menuToggle.classList.toggle("is-open", open);
    menuToggle.setAttribute("aria-expanded", open ? "true" : "false");
    menuToggle.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
    document.body.style.overflow = open ? "hidden" : "";
  };

  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      setMenuOpen(!nav.classList.contains("is-open"));
    });

    nav.querySelectorAll(".nav__link").forEach((link) => {
      link.addEventListener("click", () => setMenuOpen(false));
    });

    document.addEventListener("keydown", (event) => {
      if (event.key === "Escape") setMenuOpen(false);
    });

    window.addEventListener(
      "resize",
      () => {
        if (window.innerWidth > 1024) setMenuOpen(false);
      },
      { passive: true }
    );
  }

  /* ---------- Active nav on scroll (home only) ---------- */
  const isHome = document.body.dataset.page === "home" || Boolean(document.getElementById("inicio"));

  if (isHome) {
    const sections = [
      { id: "inicio" },
      { id: "casas" },
      { id: "lotes" },
      { id: "proyectos" },
      { id: "sobreplano" },
      { id: "nosotros" },
      { id: "contacto" },
    ];

    const navLinks = document.querySelectorAll(".nav__link");

    const updateActiveNav = () => {
      const offset = window.scrollY + (header?.offsetHeight || 80) + 40;
      let current = "inicio";

      for (const item of sections) {
        const el = document.getElementById(item.id);
        if (el && el.offsetTop <= offset) current = item.id;
      }

      navLinks.forEach((link) => {
        const href = link.getAttribute("href") || "";
        if (href.includes(".html")) return;
        const match =
          (current === "inicio" && href === "#inicio") ||
          (current === "casas" && href === "#casas") ||
          (current === "lotes" && href === "#lotes") ||
          ((current === "sobreplano" || current === "proyectos") && (href === "#sobreplano" || href === "#proyectos")) ||
          (current === "nosotros" && href === "#nosotros") ||
          (current === "contacto" && href === "#contacto");
        link.classList.toggle("is-active", match);
      });
    };

    window.addEventListener("scroll", updateActiveNav, { passive: true });
  }
  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll(".reveal");

  if ("IntersectionObserver" in window) {
    const revealObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            revealObserver.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" }
    );

    revealEls.forEach((el) => revealObserver.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Favorites (persistencia local, sin cuenta de usuario) ---------- */
  document.querySelectorAll(".property-card__fav").forEach((btn) => {
    const scope = btn.closest(".property-card, .detail-summary, .lote-summary") || document.body;
    const title = scope.querySelector("h1, h2, h3")?.textContent?.trim() || document.body.dataset.page || "propiedad";
    const storageKey = `al-favorite:${title}`;
    let stored = false;
    try {
      stored = window.localStorage.getItem(storageKey) === "true";
    } catch (_) {
      stored = false;
    }
    btn.classList.toggle("is-active", stored);
    btn.setAttribute("aria-pressed", String(stored));

    btn.addEventListener("click", () => {
      const active = btn.classList.toggle("is-active");
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        active ? "Quitar de favoritos" : "Añadir a favoritos"
      );
      try {
        window.localStorage.setItem(storageKey, String(active));
      } catch (_) {
        /* La preferencia sigue funcionando durante la sesión. */
      }
    });
  });

  /* ---------- Featured next (visual cue; carousel later) ---------- */
  if (featuredNext) {
    featuredNext.addEventListener("click", () => {
      featuredNext.classList.add("is-pressed");
      window.setTimeout(() => featuredNext.classList.remove("is-pressed"), 180);
    });
  }

  /* ---------- Explorador de propiedades ---------- */
  const searchForm = document.querySelector(".search-panel__form");
  const searchCategory = document.getElementById("search-que");
  const searchTabs = document.querySelectorAll("[data-search-category]");

  searchTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      searchTabs.forEach((item) => item.classList.toggle("is-active", item === tab));
      if (searchCategory) searchCategory.value = tab.dataset.searchCategory || "all";
    });
  });

  if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const category = searchCategory?.value || "all";
      const location = document.getElementById("search-ubicacion")?.value || "todas";
      const status = document.getElementById("search-tipo")?.value || "todos";
      const maxPriceValue = document.getElementById("search-precio")?.value || "cualquiera";
      const maxPrice = maxPriceValue === "cualquiera" ? Infinity : Number(maxPriceValue);
      const cards = document.querySelectorAll(".property-card[data-category]");
      let matches = 0;

      cards.forEach((card) => {
        const categoryMatch = category === "all" || card.dataset.category === category;
        const locationMatch = location === "todas" || card.dataset.location === location;
        const statusMatch = status === "todos" || card.dataset.status === status;
        const price = Number(card.dataset.price || 0);
        const priceMatch = !price || price <= maxPrice;
        const visible = categoryMatch && locationMatch && statusMatch && priceMatch;
        card.hidden = !visible;
        if (visible) matches += 1;
      });

      const targetId = category === "all" ? "casas" : category;
      const target = document.getElementById(targetId);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      const statusEl = document.getElementById("searchStatus");
      if (statusEl) {
        statusEl.textContent = matches
          ? `${matches} resultado${matches === 1 ? "" : "s"} en el catálogo actual.`
          : "No hay coincidencias en el catálogo actual.";
      }
    });
  }

})();
