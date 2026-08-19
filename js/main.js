/**
 * Nexa Inmobiliaria — Home interactions
 * Visual layer only: menu, scroll, microinteractions.
 * Property filters, 3D/AR and forms will connect later.
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

  /* ---------- Favorites (visual only) ---------- */
  document.querySelectorAll(".property-card__fav").forEach((btn) => {
    btn.addEventListener("click", () => {
      const active = btn.classList.toggle("is-active");
      btn.setAttribute("aria-pressed", active ? "true" : "false");
      btn.setAttribute(
        "aria-label",
        active ? "Quitar de favoritos" : "Añadir a favoritos"
      );
    });
  });

  /* ---------- Featured next (visual cue; carousel later) ---------- */
  if (featuredNext) {
    featuredNext.addEventListener("click", () => {
      featuredNext.classList.add("is-pressed");
      window.setTimeout(() => featuredNext.classList.remove("is-pressed"), 180);
    });
  }

  /* ---------- Search form (visual only) ---------- */
  const searchForm = document.querySelector(".search-panel__form");
  if (searchForm) {
    searchForm.addEventListener("submit", (event) => {
      event.preventDefault();
      const target = document.getElementById("casas");
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    });
  }

  /* ---------- 3D / AR / Construir placeholders ---------- */
  document.querySelectorAll("[data-action]").forEach((btn) => {
    btn.addEventListener("click", () => {
      // Reserved for future USDZ / GLB / AR integration
      btn.classList.add("is-pressed");
      window.setTimeout(() => btn.classList.remove("is-pressed"), 180);
    });
  });
})();
