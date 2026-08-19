/**
 * Nexa — Detalle Sobreplano
 * Hooks GLB / USDZ / AR preparados
 */

(() => {
  "use strict";

  const api = window.NexaProjectsAPI;
  if (!api) return;

  const params = new URLSearchParams(window.location.search);
  const projectId =
    params.get("id") || document.body.dataset.projectId || "monte-verde";
  const project = api.getById(projectId) || api.getAll()[0];
  if (!project) return;

  document.title = `${project.name} | Sobreplano | Nexa Inmobiliaria`;
  document.body.dataset.projectId = project.id;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText("spName", project.name);
  setText("spLocation", project.location);
  setText("spDescription", project.description);
  setText("spUnits", `${project.units} unidades`);
  setText("spArea", project.areaFrom);
  setText("spPrice", /COP/i.test(project.priceFrom) ? project.priceFrom : `${project.priceFrom} COP`);
  setText("barLocation", project.location);
  setText("barType", project.type === "Apartamentos" ? "Proyecto sobre plano" : project.type);
  setText("barUnits", `${project.units} ${project.type}`);
  setText("barDelivery", project.delivery ? `Entrega estimada ${project.delivery}` : "Por definir");

  /* Feature strip */
  const strip = document.getElementById("spFeatureStrip");
  const icons = {
    lobby: `<svg viewBox="0 0 24 24" fill="none"><path d="M5 20V10l7-5 7 5v10H5Z" stroke="currentColor" stroke-width="1.5"/><path d="M10 20v-5h4v5" stroke="currentColor" stroke-width="1.5"/></svg>`,
    social: `<svg viewBox="0 0 24 24" fill="none"><circle cx="9" cy="9" r="2.5" stroke="currentColor" stroke-width="1.5"/><circle cx="16" cy="10" r="2" stroke="currentColor" stroke-width="1.5"/><path d="M4.5 18c.5-2.2 2.2-3.5 4.5-3.5s4 1.3 4.5 3.5M13 18c.3-1.5 1.4-2.5 3-2.5s2.7 1 3 2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
    terraza: `<svg viewBox="0 0 24 24" fill="none"><path d="M4 18h16M7 18V11l5-4 5 4v7" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><circle cx="17" cy="7" r="2" stroke="currentColor" stroke-width="1.5"/></svg>`,
    seguridad: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 3.5 19.5 7v5.2c0 4.5-3 7.8-7.5 9.3C7.5 20 4.5 16.7 4.5 12.2V7L12 3.5Z" stroke="currentColor" stroke-width="1.5"/></svg>`,
    parking: `<svg viewBox="0 0 24 24" fill="none"><rect x="3" y="10" width="18" height="8" rx="2" stroke="currentColor" stroke-width="1.5"/><circle cx="7.5" cy="18" r="1.5" stroke="currentColor" stroke-width="1.5"/><circle cx="16.5" cy="18" r="1.5" stroke="currentColor" stroke-width="1.5"/><path d="M5 10l2-4h10l2 4" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>`,
    ascensor: `<svg viewBox="0 0 24 24" fill="none"><rect x="6" y="3" width="12" height="18" rx="2" stroke="currentColor" stroke-width="1.5"/><path d="M12 8v8M9.5 10.5 12 8l2.5 2.5M9.5 13.5 12 16l2.5-2.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    ubicacion: `<svg viewBox="0 0 24 24" fill="none"><path d="M12 21s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10Z" stroke="currentColor" stroke-width="1.5"/><circle cx="12" cy="11" r="2" stroke="currentColor" stroke-width="1.5"/></svg>`,
  };

  if (strip) {
    const features =
      project.projectFeatures ||
      [
        { id: "lobby", label: "Lobby moderno" },
        { id: "social", label: "Zonas sociales" },
        { id: "terraza", label: "Terraza panorámica" },
        { id: "seguridad", label: "Seguridad 24/7" },
        { id: "parking", label: "Parqueaderos" },
        { id: "ascensor", label: "Ascensor" },
        { id: "ubicacion", label: "Ubicación privilegiada" },
      ];

    strip.innerHTML = features
      .map(
        (f) => `
      <li class="feature-strip__item">
        <span class="feature-strip__icon" aria-hidden="true">${icons[f.id] || icons.ubicacion}</span>
        <span class="feature-strip__label">${f.label}</span>
      </li>`
      )
      .join("");
  }

  /* Viewer data attrs */
  const apt3D = document.getElementById("aptViewer3D");
  const aptAR = document.getElementById("aptViewerAR");
  if (apt3D) apt3D.dataset.glb = project.glb || "";
  if (aptAR) aptAR.dataset.usdz = project.usdz || "";

  if (project.usdz) {
    const btn = document.getElementById("btnAptAR");
    if (btn) {
      btn.classList.remove("is-soon");
      btn.removeAttribute("aria-disabled");
      const soon = btn.querySelector(".btn__soon");
      if (soon) soon.hidden = true;
    }
  }

  window.NexaSobreplanoViewer = {
    loadBuildingModel(glbUrl, usdzUrl) {
      void glbUrl;
      void usdzUrl;
    },
    loadApartmentModel(glbUrl, usdzUrl) {
      if (apt3D) apt3D.dataset.glb = glbUrl || "";
      if (aptAR) aptAR.dataset.usdz = usdzUrl || "";
    },
    openAR(usdzUrl) {
      void usdzUrl;
    },
    getProject() {
      return project;
    },
  };
})();
