/**
 * Andrés Lizcano — detalle de casa y hooks GLB / USDZ.
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

  document.title = `${casa.name} | Andrés Lizcano`;
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

  /* Galería: usa imágenes reales cuando existan y evita controles ficticios. */
  const thumbs = document.getElementById("casaThumbs");
  const mainMedia = document.getElementById("casaMainMedia");
  const prevBtn = document.getElementById("casaPrev");
  const nextBtn = document.getElementById("casaNext");
  const galleryImages = (casa.images || []).filter(Boolean);
  if (casa.image && !galleryImages.includes(casa.image)) galleryImages.unshift(casa.image);
  const photosCount = casa.photosCount || 12;
  let activeImage = 0;

  const showImage = (index) => {
    if (!mainMedia || !galleryImages.length) return;
    activeImage = (index + galleryImages.length) % galleryImages.length;
    mainMedia.classList.add("has-image");
    mainMedia.setAttribute("role", "group");
    mainMedia.setAttribute("aria-label", `Foto ${activeImage + 1} de ${casa.name}`);
    mainMedia.querySelector(".img-placeholder__label")?.remove();
    let mainImg = mainMedia.querySelector(":scope > img");
    if (!mainImg) {
      mainImg = document.createElement("img");
      mainMedia.prepend(mainImg);
    }
    mainImg.src = galleryImages[activeImage];
    mainImg.alt = `${casa.name}, foto ${activeImage + 1}`;
    thumbs?.querySelectorAll(".detail-thumb").forEach((item, i) => item.classList.toggle("is-active", i === activeImage));
  };

  if (thumbs && galleryImages.length) {
    thumbs.hidden = false;
    thumbs.innerHTML = galleryImages
      .slice(0, 4)
      .map((src, i) => {
        const more =
          i === 3 && photosCount > 4
            ? `<span class="detail-thumb__more">+${photosCount - 4} Fotos</span>`
            : "";
        return `<button type="button" class="detail-thumb${i === 0 ? " is-active" : ""}" data-index="${i}" aria-label="Foto ${i + 1}">
          <span class="img-placeholder has-image detail-thumb__media"><img src="${src}" alt=""></span>
          ${more}
        </button>`;
      })
      .join("");

    thumbs.addEventListener("click", (event) => {
      const btn = event.target.closest(".detail-thumb");
      if (!btn) return;
      showImage(Number(btn.dataset.index || 0));
    });
    showImage(0);
  } else if (thumbs) {
    thumbs.hidden = true;
    if (prevBtn) prevBtn.disabled = true;
    if (nextBtn) nextBtn.disabled = true;
  }

  prevBtn?.addEventListener("click", () => showImage(activeImage - 1));
  nextBtn?.addEventListener("click", () => showImage(activeImage + 1));

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
    viewer.querySelector(".viewer-shell__tools")?.toggleAttribute("hidden", !casa.glb);
    viewer.querySelector(".viewer-shell__modes")?.toggleAttribute("hidden", !casa.glb);
  }

  const btn3D = document.getElementById("btnCasa3D");
  const btnAR = document.getElementById("btnCasaAR");
  if (btn3D && !casa.glb) {
    btn3D.classList.add("is-soon");
    btn3D.disabled = true;
    const soon = btn3D.querySelector(".btn__soon");
    if (soon) soon.hidden = false;
  }
  if (btnAR) {
    btnAR.disabled = !casa.usdz;
    if (casa.usdz) {
      btnAR.classList.remove("is-soon");
      btnAR.removeAttribute("aria-disabled");
      const soon = btnAR.querySelector(".btn__soon");
      if (soon) soon.hidden = true;
    }
  }

  const link3D = document.getElementById("link3D");
  const linkAR = document.getElementById("linkAR");
  if (link3D && !casa.glb) {
    link3D.removeAttribute("href");
    link3D.setAttribute("aria-disabled", "true");
    link3D.textContent = "3D próximamente";
  }
  if (linkAR) linkAR.disabled = !casa.usdz;

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
