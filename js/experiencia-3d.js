(() => {
  "use strict";

  const shell = document.getElementById("home3dViewer");
  const viewer = document.getElementById("homeModelViewer");
  const rotateButton = document.getElementById("home3dRotate");
  const resetButton = document.getElementById("home3dReset");
  const progress = document.getElementById("home3dProgress");
  const status = document.getElementById("home3dStatus");

  if (!shell || !viewer) return;

  rotateButton?.addEventListener("click", () => {
    const rotating = viewer.hasAttribute("auto-rotate");
    viewer.toggleAttribute("auto-rotate", !rotating);
    rotateButton.classList.toggle("is-active", !rotating);
    rotateButton.setAttribute("aria-pressed", String(!rotating));
    rotateButton.textContent = rotating ? "Activar rotación" : "Rotación automática";
  });

  resetButton?.addEventListener("click", () => {
    viewer.cameraOrbit = "0deg 75deg 105%";
    viewer.cameraTarget = "auto";
    if (typeof viewer.jumpCameraToGoal === "function") viewer.jumpCameraToGoal();
  });

  viewer.addEventListener("progress", (event) => {
    const loaded = Math.round((event.detail?.totalProgress || 0) * 100);
    if (progress) progress.style.width = `${loaded}%`;
    if (status && loaded < 100) status.textContent = `Cargando experiencia 3D… ${loaded}%`;
  });

  viewer.addEventListener("load", () => {
    shell.dataset.modelStatus = "loaded";
    if (progress) progress.style.width = "100%";
  });

  viewer.addEventListener("error", () => {
    shell.dataset.modelStatus = "error";
    if (status) status.textContent = "No fue posible cargar el modelo 3D en este momento.";
  });
})();
