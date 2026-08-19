/**
 * Nexa Inmobiliaria — Listado de proyectos
 */

(() => {
  "use strict";

  const grid = document.getElementById("projectsGrid");
  if (!grid || !window.NexaProjectsAPI) return;

  const api = window.NexaProjectsAPI;
  let filter = "all";

  const mediaHTML = (image, label = "IMAGEN PRÓXIMAMENTE") => {
    if (image) {
      return `<img src="${image}" alt="" loading="lazy">`;
    }
    return `<span class="img-placeholder__label">${label}</span>`;
  };

  const cardHTML = (project) => {
    const href = `proyecto.html?id=${encodeURIComponent(project.id)}`;
    const statusClass = api.statusClass(project.status);
    const hasImage = Boolean(project.image);

    return `
      <article class="project-card reveal is-visible" data-status="${project.status}">
        <a href="${href}" class="project-card__media img-placeholder${hasImage ? " has-image" : ""}" aria-label="${project.name}">
          ${mediaHTML(project.image)}
          <span class="project-card__badge ${statusClass}">${project.statusLabel}</span>
        </a>
        <div class="project-card__body">
          <p class="project-card__type">${project.type}</p>
          <h3 class="project-card__title"><a href="${href}">${project.name}</a></h3>
          <p class="project-card__location">
            <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              <path d="M12 21s6-5.4 6-10a6 6 0 1 0-12 0c0 4.6 6 10 6 10Z" stroke="currentColor" stroke-width="1.6"/>
              <circle cx="12" cy="11" r="2" stroke="currentColor" stroke-width="1.6"/>
            </svg>
            ${project.location}
          </p>
          <div class="project-card__meta">
            <div><span>Unidades</span><strong>${project.units}</strong></div>
            <div><span>Área</span><strong>${project.availableArea || project.areaFrom}</strong></div>
          </div>
          <p class="project-card__price">Desde ${project.priceFrom}</p>
          <div class="project-card__progress">
            <div class="project-card__progress-label">
              <span>Vendidos</span>
              <span>${project.soldPercent}%</span>
            </div>
            <div class="project-card__bar" aria-hidden="true"><span style="width:${project.soldPercent}%"></span></div>
          </div>
          <div class="project-card__actions">
            <a href="${href}" class="btn btn--outline btn--sm">Ver proyecto</a>
            <a href="${href}#disponibilidad" class="btn btn--gold btn--sm">Disponibilidad</a>
          </div>
        </div>
      </article>
    `;
  };

  const render = () => {
    const projects = api.getAll().filter((p) => filter === "all" || p.status === filter);
    if (!projects.length) {
      grid.innerHTML = `<p class="section-subtitle">No hay proyectos en este estado por ahora.</p>`;
      return;
    }
    grid.innerHTML = projects.map(cardHTML).join("");
  };

  document.querySelectorAll(".projects-filters__btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".projects-filters__btn").forEach((b) => b.classList.remove("is-active"));
      btn.classList.add("is-active");
      filter = btn.dataset.filter || "all";
      render();
    });
  });

  render();
})();
