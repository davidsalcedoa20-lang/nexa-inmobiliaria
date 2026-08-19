/**
 * Nexa Inmobiliaria — Página de lote
 * Interacciones visuales + hooks para futuro 3D / AR / GLB / USDZ
 */

(() => {
  "use strict";

  const modelAreas = {
    a: { built: "120 m²", free: "130 m² (52%)" },
    b: { built: "150 m²", free: "100 m² (40%)" },
    c: { built: "180 m²", free: "70 m² (28%)" },
  };

  /* ---------- Gallery thumbs (visual) ---------- */
  const thumbs = document.querySelectorAll(".lote-thumb");
  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      thumbs.forEach((t) => {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      thumb.classList.add("is-active");
      thumb.setAttribute("aria-selected", "true");
    });
  });

  /* ---------- Tabs ---------- */
  const tabBtns = document.querySelectorAll(".lote-tabs__btn");
  const tabPanels = document.querySelectorAll(".lote-tab-panel");

  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.tab;
      tabBtns.forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      tabPanels.forEach((panel) => {
        const match = panel.id === `tab-${id}`;
        panel.classList.toggle("is-active", match);
        if (match) {
          panel.removeAttribute("hidden");
        } else {
          panel.setAttribute("hidden", "");
        }
      });
    });
  });

  /* ---------- House model selector ---------- */
  const models = document.querySelectorAll(".lote-model");
  const viewer = document.getElementById("nexaViewer");
  const builtArea = document.getElementById("builtArea");
  const freeArea = document.getElementById("freeArea");

  const selectModel = (modelEl) => {
    const id = modelEl.dataset.model;
    models.forEach((m) => {
      const active = m === modelEl;
      m.classList.toggle("is-active", active);
      m.setAttribute("aria-pressed", active ? "true" : "false");
    });
    if (viewer) viewer.dataset.modelId = id || "";
    const areas = modelAreas[id];
    if (areas && builtArea && freeArea) {
      builtArea.textContent = areas.built;
      freeArea.textContent = areas.free;
    }
  };

  models.forEach((model) => {
    model.addEventListener("click", () => selectModel(model));
    model.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        selectModel(model);
      }
    });
  });

  /* ---------- Viewer mode 3D / AR (visual only) ---------- */
  const modeBtns = document.querySelectorAll(".lote-viewer__mode");
  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
      if (viewer) viewer.dataset.viewMode = btn.dataset.viewMode || "3d";
    });
  });

  /* ---------- Future integration API (no-op stubs) ---------- */
  window.NexaViewer = {
    /**
     * Mount a GLB model into #viewerStage later.
     * @param {string} glbUrl
     * @param {string} [usdzUrl]
     */
    loadModel(glbUrl, usdzUrl) {
      if (!viewer) return;
      viewer.dataset.glb = glbUrl || "";
      viewer.dataset.usdz = usdzUrl || "";
      // Reserved: instantiate model-viewer / Three.js here
    },
    openAR() {
      // Reserved: launch USDZ / WebXR experience
    },
    getState() {
      if (!viewer) return null;
      return {
        lotId: viewer.dataset.lotId,
        modelId: viewer.dataset.modelId,
        glb: viewer.dataset.glb,
        usdz: viewer.dataset.usdz,
        viewMode: viewer.dataset.viewMode || "3d",
      };
    },
  };
})();
