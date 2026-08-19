/**
 * Nexa — Detalle de casa
 * Hooks listos para GLB / USDZ
 */

(() => {
  "use strict";

  const api = window.NexaCasasAPI;
  if (!api) return;

  const params = new URLSearchParams(window.location.search);
  const casaId =
    params.get("id") || document.body.dataset.casaId || "el-encanto";
  const casa = api.getById(casaId) || api.getAll()[0];
  if (!casa) return;

  document.title = `${casa.name} | Nexa Inmobiliaria`;
  document.body.dataset.casaId = casa.id;

  const setText = (id, value) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  };

  setText("casaName", casa.name);
  setText("casaStatusText", casa.statusLabel);
  setText("casaStatusPillText", casa.statusLabel);
  setText("casaPrice", casa.price);
  setText("casaPriceLabel", casa.priceLabel || "Desde");
  setText("specBedrooms", String(casa.bedrooms));
  setText("specBaths", String(casa.bathrooms));
  setText("specBuilt", casa.builtArea);
  setText("specLot", casa.lotArea);
  setText("casaDescription", casa.description);
  setText("casaUbicacionText", casa.location);
  setText("stripBeds", `${casa.bedrooms} Habitaciones`);
  setText("stripBaths", `${casa.bathrooms} Baños`);
  setText("stripParking", `${casa.parking} Parqueaderos`);
  setText("stripBuilt", `${casa.builtArea} construidos`);
  setText("stripLot", `${casa.lotArea} de lote`);

  const loc = document.querySelector("#casaLocation span");
  if (loc) loc.textContent = casa.location;

  const listHTML = (items) =>
    (items || []).map((item) => `<li>${item}</li>`).join("");

  const features = document.getElementById("casaFeatures");
  const featuresExtra = document.getElementById("casaFeaturesExtra");
  const finishes = document.getElementById("casaFinishes");
  if (features) features.innerHTML = listHTML(casa.features);
  if (featuresExtra) featuresExtra.innerHTML = listHTML(casa.features);
  if (finishes) finishes.innerHTML = listHTML(casa.finishes);

  /* Gallery thumbs */
  const thumbs = document.getElementById("casaThumbs");
  const photosCount = casa.photosCount || 12;
  if (thumbs) {
    const slots = [0, 1, 2, 3];
    thumbs.innerHTML = slots
      .map((i) => {
        const more =
          i === 3
            ? `<span class="detail-thumb__more">+${Math.max(0, photosCount - 3)} Fotos</span>`
            : "";
        return `<button type="button" class="detail-thumb${i === 0 ? " is-active" : ""}" data-index="${i}" aria-label="Foto ${i + 1}">
          <span class="img-placeholder detail-thumb__media"><span class="img-placeholder__label">IMAGEN PRÓXIMAMENTE</span></span>
          ${more}
        </button>`;
      })
      .join("");

    thumbs.addEventListener("click", (event) => {
      const btn = event.target.closest(".detail-thumb");
      if (!btn) return;
      thumbs.querySelectorAll(".detail-thumb").forEach((t) => t.classList.remove("is-active"));
      btn.classList.add("is-active");
    });
  }

  document.getElementById("casaPrev")?.addEventListener("click", () => {});
  document.getElementById("casaNext")?.addEventListener("click", () => {});

  /* Rooms */
  const rooms = document.getElementById("casaRooms");
  if (rooms) {
    rooms.innerHTML = (casa.rooms || [])
      .map(
        (room, index) => `
      <li>
        <button type="button" class="casa-rooms__item${index === 0 ? " is-active" : ""}" data-room="${room.id}">
          <span>${room.label}</span>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M9 6l6 6-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>
        </button>
      </li>`
      )
      .join("");

    rooms.addEventListener("click", (event) => {
      const btn = event.target.closest(".casa-rooms__item");
      if (!btn) return;
      rooms.querySelectorAll(".casa-rooms__item").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
    });
  }

  /* Tabs */
  const tabBtns = document.querySelectorAll(".detail-tabs__btn");
  const panels = document.querySelectorAll(".detail-tab-panel");
  tabBtns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.tab;
      tabBtns.forEach((b) => {
        b.classList.toggle("is-active", b === btn);
        b.setAttribute("aria-selected", b === btn ? "true" : "false");
      });
      panels.forEach((panel) => {
        const match = panel.id === `tab-${id}`;
        panel.classList.toggle("is-active", match);
        if (match) panel.removeAttribute("hidden");
        else panel.setAttribute("hidden", "");
      });
    });
  });

  /* Viewer modes */
  document.querySelectorAll(".viewer-shell__mode").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".viewer-shell__mode").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
    });
  });

  /* 3D / AR readiness */
  const viewer = document.getElementById("casaViewer");
  if (viewer) {
    viewer.dataset.glb = casa.glb || "";
    viewer.dataset.usdz = casa.usdz || "";
  }

  const btn3D = document.getElementById("btnCasa3D");
  const btnAR = document.getElementById("btnCasaAR");
  if (btn3D && !casa.glb) {
    btn3D.classList.add("is-soon");
    const soon = btn3D.querySelector(".btn__soon");
    if (soon) soon.hidden = false;
  }
  if (btnAR && casa.usdz) {
    btnAR.classList.remove("is-soon");
    btnAR.removeAttribute("aria-disabled");
    const soon = btnAR.querySelector(".btn__soon");
    if (soon) soon.hidden = true;
  }

  window.NexaCasaViewer = {
    loadModel(glbUrl, usdzUrl) {
      if (!viewer) return;
      viewer.dataset.glb = glbUrl || "";
      viewer.dataset.usdz = usdzUrl || "";
    },
    openAR() {},
    getCasa() {
      return casa;
    },
  };
})();
