/**
 * Nexa Inmobiliaria — Detalle de proyecto
 * Hooks listos para GLB / USDZ / Web 3D / AR
 */

(() => {
  "use strict";

  const api = window.NexaProjectsAPI;
  if (!api) return;

  const params = new URLSearchParams(window.location.search);
  const projectId =
    params.get("id") ||
    document.body.dataset.projectId ||
    "monte-verde";

  const project = api.getById(projectId) || api.getAll()[0];
  if (!project) return;

  document.title = `${project.name} | Nexa Inmobiliaria`;
  document.body.dataset.projectId = project.id;

  /* ---------- Fill hero ---------- */
  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText("projectStatus", project.statusLabel);
  setText("projectName", project.name);
  setText("projectLead", project.heroTitle);
  setText("projectSub", project.heroSubtitle);
  setText("specPrice", project.priceFrom);
  setText("specUnits", String(project.units));
  setText("specArea", project.areaFrom);
  setText("specType", project.type);
  setText("projectDescription", project.description);

  const loc = document.querySelector("#projectLocation span");
  if (loc) loc.textContent = project.location;

  const heroMedia = document.getElementById("projectHeroMedia");
  if (heroMedia && project.image) {
    heroMedia.classList.add("has-image");
    heroMedia.innerHTML = `<img src="${project.image}" alt="${project.name}">`;
  }

  const viewerShell = document.getElementById("projectViewerShell");
  if (viewerShell) {
    viewerShell.dataset.glb = project.glb || "";
    viewerShell.dataset.usdz = project.usdz || "";
  }

  const btnAR = document.getElementById("btnProjectAR");
  if (btnAR && project.usdz) {
    btnAR.classList.remove("is-disabled");
    btnAR.removeAttribute("aria-disabled");
  }

  /* ---------- Amenities ---------- */
  const amenitiesGrid = document.getElementById("amenitiesGrid");
  if (amenitiesGrid) {
    amenitiesGrid.innerHTML = (project.amenities || [])
      .map(
        (item) => `
      <article class="amenity-card reveal is-visible">
        <div class="amenity-card__media img-placeholder${item.image ? " has-image" : ""}" role="img" aria-label="${item.label}">
          ${
            item.image
              ? `<img src="${item.image}" alt="${item.label}" loading="lazy">`
              : `<span class="img-placeholder__label">IMAGEN PRÓXIMAMENTE</span>`
          }
        </div>
        <p class="amenity-card__label">${item.label}</p>
      </article>`
      )
      .join("");
  }

  /* ---------- Building board ---------- */
  const board = document.getElementById("buildingBoard");
  const unitPanel = document.getElementById("unitPanel");
  let selectedNumber = null;

  const groupByFloor = (apartments) => {
    const map = new Map();
    apartments.forEach((apt) => {
      if (!map.has(apt.floor)) map.set(apt.floor, []);
      map.get(apt.floor).push(apt);
    });
    return [...map.entries()].sort((a, b) => b[0] - a[0]);
  };

  const openUnit = (apt) => {
    selectedNumber = apt.number;
    document.querySelectorAll(".unit-cell").forEach((cell) => {
      cell.classList.toggle("is-selected", cell.dataset.number === apt.number);
    });

    if (!unitPanel) return;
    unitPanel.hidden = false;

    setText("unitTitle", `Apartamento ${apt.number}`);
    const statusEl = document.getElementById("unitStatus");
    if (statusEl) {
      statusEl.textContent = api.statusLabelApt(apt.status);
      statusEl.className = `unit-panel__status ${api.statusClass(apt.status)}`;
    }

    const specs = document.getElementById("unitSpecs");
    if (specs) {
      specs.innerHTML = `
        <li>Piso<strong>${apt.floor}</strong></li>
        <li>Área<strong>${apt.area} m²</strong></li>
        <li>Habitaciones<strong>${apt.bedrooms}</strong></li>
        <li>Baños<strong>${apt.bathrooms}</strong></li>
        <li>Parqueadero<strong>${apt.parking}</strong></li>
        <li>Estado<strong>${api.statusLabelApt(apt.status)}</strong></li>
      `;
    }

    setText("unitPrice", apt.status === "sold" ? "Vendido" : apt.price);

    const unitViewer = document.getElementById("unitViewer");
    if (unitViewer) {
      unitViewer.dataset.glb = apt.glb || "";
      unitViewer.dataset.usdz = apt.usdz || "";
    }

    const aptAr = unitPanel.querySelector('[data-action="apt-ar"]');
    if (aptAr) {
      if (apt.usdz) {
        aptAr.classList.remove("is-disabled");
        aptAr.removeAttribute("aria-disabled");
      } else {
        aptAr.classList.add("is-disabled");
        aptAr.setAttribute("aria-disabled", "true");
      }
    }

    unitPanel.scrollIntoView({ behavior: "smooth", block: "nearest" });
  };

  if (board) {
    const floors = groupByFloor(project.apartments || []);
    board.innerHTML = floors
      .map(([floor, units]) => {
        const cells = units
          .map((apt) => {
            const cls = api.statusClass(apt.status);
            return `
              <button type="button" class="unit-cell ${cls}" data-number="${apt.number}" aria-label="Apartamento ${apt.number}, ${api.statusLabelApt(apt.status)}">
                <span class="unit-cell__num">${apt.number}</span>
                <span class="unit-cell__status">${api.statusLabelApt(apt.status)}</span>
              </button>`;
          })
          .join("");
        return `
          <div class="building-floor">
            <div class="building-floor__label">Piso ${floor}</div>
            <div class="building-floor__units">${cells}</div>
          </div>`;
      })
      .join("");

    board.addEventListener("click", (event) => {
      const cell = event.target.closest(".unit-cell");
      if (!cell) return;
      const apt = project.apartments.find((a) => a.number === cell.dataset.number);
      if (apt) openUnit(apt);
    });

    const firstAvailable =
      project.apartments.find((a) => a.status === "available") ||
      project.apartments[0];
    if (firstAvailable) openUnit(firstAvailable);
  }

  const unitClose = document.getElementById("unitClose");
  if (unitClose && unitPanel) {
    unitClose.addEventListener("click", () => {
      unitPanel.hidden = true;
      selectedNumber = null;
      document.querySelectorAll(".unit-cell.is-selected").forEach((c) => c.classList.remove("is-selected"));
    });
  }

  /* ---------- Compare slider ---------- */
  const slider = document.getElementById("compareSlider");
  const before = document.getElementById("compareBefore");
  const handle = document.getElementById("compareHandle");

  if (slider && before && handle) {
    let dragging = false;

    const setPosition = (percent) => {
      const value = Math.min(100, Math.max(0, percent));
      before.style.width = `${value}%`;
      handle.style.left = `${value}%`;
      handle.setAttribute("aria-valuenow", String(Math.round(value)));
      slider.dataset.position = String(value);
    };

    const fromEvent = (clientX) => {
      const rect = slider.getBoundingClientRect();
      return ((clientX - rect.left) / rect.width) * 100;
    };

    const onMove = (clientX) => setPosition(fromEvent(clientX));

    handle.addEventListener("pointerdown", (event) => {
      dragging = true;
      handle.setPointerCapture(event.pointerId);
    });

    handle.addEventListener("pointermove", (event) => {
      if (!dragging) return;
      onMove(event.clientX);
    });

    handle.addEventListener("pointerup", () => {
      dragging = false;
    });

    slider.addEventListener("pointerdown", (event) => {
      if (event.target.closest(".compare-slider__handle")) return;
      onMove(event.clientX);
    });

    handle.addEventListener("keydown", (event) => {
      const current = Number(slider.dataset.position || 50);
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setPosition(current - 3);
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setPosition(current + 3);
      }
    });

    setPosition(50);
  }

  /* ---------- Future viewer API ---------- */
  window.NexaProjectViewer = {
    loadProjectModel(glbUrl, usdzUrl) {
      if (viewerShell) {
        viewerShell.dataset.glb = glbUrl || "";
        viewerShell.dataset.usdz = usdzUrl || "";
      }
    },
    loadApartmentModel(glbUrl, usdzUrl) {
      const unitViewer = document.getElementById("unitViewer");
      if (unitViewer) {
        unitViewer.dataset.glb = glbUrl || "";
        unitViewer.dataset.usdz = usdzUrl || "";
      }
    },
    openAR(usdzUrl) {
      // Reserved: native USDZ / WebXR
      void usdzUrl;
    },
    getSelectedApartment() {
      return (
        project.apartments.find((a) => a.number === selectedNumber) || null
      );
    },
    getProject() {
      return project;
    },
  };
})();
