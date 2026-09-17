(() => {
  "use strict";

  const api = window.NexaRealProperties;
  const id = new URLSearchParams(window.location.search).get("id");
  const property = api?.getById(id) || api?.getAll()[0];
  if (!property) return;

  document.title = `${property.name} | Andrés Lizcano`;
  document.body.dataset.propertyId = property.id;

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };

  setText("propertyType", property.type);
  setText("propertyStatus", property.statusLabel);
  setText("propertyName", property.name);
  setText("propertyLocation", property.location);
  setText("propertySummary", property.summary);
  setText("propertyPrice", property.price);
  setText("propertyDescription", property.description);
  setText("videoTitle", `Recorrido de ${property.name}`);

  const image = document.getElementById("propertyImage");
  if (image) {
    image.src = property.image;
    image.alt = property.name;
  }

  const video = document.getElementById("propertyVideo");
  if (video) {
    video.poster = property.image;
    video.src = property.video;
  }

  const specs = document.getElementById("propertySpecs");
  if (specs) {
    specs.innerHTML = property.specs.map((item) => `<li>${item}</li>`).join("");
  }

  const details = document.getElementById("propertyDetails");
  if (details) {
    details.innerHTML = property.details
      .map(([label, value]) => `<li><span>${label}</span><strong>${value}</strong></li>`)
      .join("");
  }

  document.querySelectorAll("[data-property-whatsapp]").forEach((link) => {
    link.dataset.whatsappMessage = `Hola Andrés, quiero recibir información sobre ${property.name}.`;
  });
})();
