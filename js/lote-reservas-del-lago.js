/**
 * Nexa Inmobiliaria — Lote Reservas del Lago Country House
 * Interacciones visuales + integración real del visor 3D/AR (<model-viewer>)
 */

(() => {
  "use strict";

  /* ---------- Gallery: click thumb swaps main image ---------- */
  const mainImg = document.getElementById("loteMainImg");
  const thumbs = document.querySelectorAll(".lote-thumb:not([disabled])");
  thumbs.forEach((thumb) => {
    thumb.addEventListener("click", () => {
      document.querySelectorAll(".lote-thumb").forEach((t) => {
        t.classList.remove("is-active");
        t.setAttribute("aria-selected", "false");
      });
      thumb.classList.add("is-active");
      thumb.setAttribute("aria-selected", "true");
      const src = thumb.dataset.src;
      if (mainImg && src) mainImg.src = src;
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

  /* ---------- 3D / AR viewer (model-viewer real) ---------- */
  const viewer = document.getElementById("nexaViewer");
  const modelViewer = document.getElementById("casaModelViewer");
  const modeBtns = document.querySelectorAll(".lote-viewer__mode");

  const activateAR = () => {
    if (!modelViewer) return;
    if (typeof modelViewer.activateAR === "function") {
      modelViewer.activateAR();
    }
  };

  modeBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      modeBtns.forEach((b) => {
        const active = b === btn;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", active ? "true" : "false");
      });
      if (viewer) viewer.dataset.viewMode = btn.dataset.viewMode || "3d";
      if (btn.dataset.action === "ar") activateAR();
    });
  });

  /* Rotate toggle */
  const toolRotar = document.getElementById("toolRotar");
  if (toolRotar && modelViewer) {
    toolRotar.addEventListener("click", () => {
      const isRotating = modelViewer.hasAttribute("auto-rotate");
      if (isRotating) {
        modelViewer.removeAttribute("auto-rotate");
      } else {
        modelViewer.setAttribute("auto-rotate", "");
      }
      toolRotar.setAttribute("aria-pressed", String(!isRotating));
      toolRotar.classList.toggle("is-active", !isRotating);
    });
  }

  /* Reset camera to default framing */
  const toolReset = document.getElementById("toolReset");
  if (toolReset && modelViewer) {
    toolReset.addEventListener("click", () => {
      modelViewer.cameraOrbit = "0deg 75deg 105%";
      modelViewer.cameraTarget = "auto";
      modelViewer.jumpCameraToGoal();
    });
  }

  /* Loading progress feedback */
  if (modelViewer) {
    const progress = document.getElementById("viewerProgress");
    modelViewer.addEventListener("progress", (event) => {
      if (!progress) return;
      const pct = Math.round((event.detail.totalProgress || 0) * 100);
      progress.style.width = `${pct}%`;
      progress.parentElement && progress.parentElement.classList.toggle("is-loading", pct < 100);
    });

    modelViewer.addEventListener("ar-status", (event) => {
      if (viewer) viewer.dataset.arStatus = event.detail.status;
    });
  }

  window.NexaViewer = {
    loadModel(glbUrl, usdzUrl) {
      if (!viewer || !modelViewer) return;
      viewer.dataset.glb = glbUrl || "";
      viewer.dataset.usdz = usdzUrl || "";
      if (glbUrl) modelViewer.src = glbUrl;
      if (usdzUrl) modelViewer.iosSrc = usdzUrl;
    },
    openAR: activateAR,
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
