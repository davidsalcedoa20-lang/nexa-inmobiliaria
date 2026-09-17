(() => {
  "use strict";
  const cards = [...document.querySelectorAll(".service-card")];
  const options = document.getElementById("serviceOptions");
  const steps = [...document.querySelectorAll(".diagnostic-step")];
  const indicators = [...document.querySelectorAll(".diagnostic-steps li")];
  const next = document.getElementById("nextStep");
  const previous = document.getElementById("previousStep");
  const status = document.getElementById("diagnosticStatus");
  const form = document.getElementById("diagnosticForm");
  const documents = document.getElementById("documents");
  const documentNote = document.getElementById("documentNote");
  let selected = cards[0]?.dataset.service || "Avalúos inmobiliarios";
  let current = 1;

  const selectService = (name) => {
    selected = name;
    cards.forEach((card) => card.classList.toggle("is-selected", card.dataset.service === name));
    options?.querySelectorAll("button").forEach((button) => button.classList.toggle("is-selected", button.dataset.service === name));
    if (status) status.innerHTML = `Servicio seleccionado: <strong>${selected}</strong>`;
  };

  cards.forEach((card) => card.addEventListener("click", () => { selectService(card.dataset.service); document.getElementById("diagnostico")?.scrollIntoView({ behavior: "smooth", block: "start" }); }));
  if (options) {
    cards.forEach((card) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.service = card.dataset.service;
      button.innerHTML = `<strong>${card.dataset.service}</strong><span>${card.dataset.description}</span>`;
      button.addEventListener("click", () => selectService(card.dataset.service));
      options.append(button);
    });
  }

  const showStep = (step) => {
    current = step;
    steps.forEach((panel) => { const active = Number(panel.dataset.step) === step; panel.hidden = !active; panel.classList.toggle("is-active", active); });
    indicators.forEach((item, index) => item.classList.toggle("is-active", index + 1 === step));
    previous.hidden = step === 1;
    next.innerHTML = step === 5 ? "Enviar por WhatsApp <span aria-hidden=\"true\">↗</span>" : "Siguiente <span aria-hidden=\"true\">→</span>";
  };

  next?.addEventListener("click", () => {
    if (current < 5) return showStep(current + 1);
    const data = new FormData(form);
    const name = String(data.get("nombre") || "").trim();
    const phone = String(data.get("telefono") || "").trim();
    if (!name || !phone) { if (status) status.textContent = "Completa tu nombre y teléfono para continuar."; return; }
    const parts = [
      "Hola Andrés, quiero solicitar un diagnóstico técnico.",
      `Servicio: ${selected}.`,
      `Nombre: ${name}.`,
      `Teléfono: ${phone}.`,
      data.get("tipo") ? `Inmueble: ${data.get("tipo")}.` : "",
      data.get("ubicacion") ? `Ubicación: ${data.get("ubicacion")}.` : "",
      data.get("area") ? `Área aproximada: ${data.get("area")}.` : "",
      data.get("detalle") ? `Detalle: ${data.get("detalle")}.` : "",
      documents?.files?.length ? `Tengo ${documents.files.length} archivo(s) para adjuntar.` : "",
    ].filter(Boolean);
    window.open(`https://wa.me/573176740334?text=${encodeURIComponent(parts.join("\n"))}`, "_blank", "noopener");
    if (status) status.textContent = "Abrimos WhatsApp con el resumen de tu solicitud.";
  });
  previous?.addEventListener("click", () => showStep(Math.max(1, current - 1)));
  documents?.addEventListener("change", () => { if (documentNote) documentNote.textContent = documents.files?.length ? `${documents.files.length} archivo(s) seleccionado(s). Adjunta estos archivos directamente en WhatsApp al abrir la conversación.` : "Los archivos se revisarán directamente con el asesor; podrás adjuntarlos al abrir la conversación."; });
  selectService(selected);
})();
