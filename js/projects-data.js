/**
 * Nexa Inmobiliaria — Datos demo de Proyectos
 * Edita este archivo para actualizar proyectos y apartamentos.
 * image: null → se muestra placeholder "IMAGEN PRÓXIMAMENTE"
 * Cuando tengas archivos reales, pon la ruta relativa, ej: "../assets/images/monte-verde/hero.jpg"
 */

window.NEXA_PROJECTS = [
  {
    id: "monte-verde",
    slug: "proyecto-monte-verde",
    name: "Proyecto Monte Verde",
    location: "Pamplona, Norte de Santander",
    type: "Apartamentos",
    status: "sobre-planos",
    statusLabel: "SOBRE PLANOS",
    priceFrom: "$320.000.000",
    units: 48,
    sold: 12,
    availableArea: "Desde 58 m²",
    areaFrom: "58 m²",
    soldPercent: 25,
    image: null,
    delivery: "Dic. 2026",
    heroTitle: "Tu próximo apartamento empieza aquí.",
    heroSubtitle: "Conoce cómo será el proyecto antes de estar terminado.",
    description:
      "Monte Verde es un proyecto de apartamentos sobre planos en Pamplona. Diseñado para quienes quieren asegurar su hogar con visión de futuro, en un entorno natural y con excelente proyección de valorización.",
    projectFeatures: [
      { id: "lobby", label: "Lobby moderno" },
      { id: "social", label: "Zonas sociales" },
      { id: "terraza", label: "Terraza panorámica" },
      { id: "seguridad", label: "Seguridad 24/7" },
      { id: "parking", label: "Parqueaderos" },
      { id: "ascensor", label: "Ascensor" },
      { id: "ubicacion", label: "Ubicación privilegiada" },
    ],
    amenities: [
      { id: "fachada", label: "Fachada", image: null },
      { id: "lobby", label: "Lobby", image: null },
      { id: "apartamentos", label: "Apartamentos", image: null },
      { id: "zonas-sociales", label: "Zonas sociales", image: null },
      { id: "piscina", label: "Piscina", image: null },
      { id: "parqueaderos", label: "Parqueaderos", image: null },
      { id: "zonas-verdes", label: "Zonas verdes", image: null },
      { id: "areas-comunes", label: "Áreas comunes", image: null },
    ],
    floors: 6,
    unitsPerFloor: 4,
    glb: "",
    usdz: "",
    apartments: [
      { number: "101", floor: 1, area: 68, bedrooms: 2, bathrooms: 2, parking: 1, price: "$320.000.000", status: "available", image: null, plan: null, glb: "", usdz: "" },
      { number: "102", floor: 1, area: 68, bedrooms: 2, bathrooms: 2, parking: 1, price: "$320.000.000", status: "sold", image: null, plan: null, glb: "", usdz: "" },
      { number: "103", floor: 1, area: 72, bedrooms: 2, bathrooms: 2, parking: 1, price: "$335.000.000", status: "reserved", image: null, plan: null, glb: "", usdz: "" },
      { number: "104", floor: 1, area: 58, bedrooms: 1, bathrooms: 1, parking: 1, price: "$265.000.000", status: "available", image: null, plan: null, glb: "", usdz: "" },
      { number: "201", floor: 2, area: 68, bedrooms: 2, bathrooms: 2, parking: 1, price: "$328.000.000", status: "available", image: null, plan: null, glb: "", usdz: "" },
      { number: "202", floor: 2, area: 68, bedrooms: 2, bathrooms: 2, parking: 1, price: "$328.000.000", status: "sold", image: null, plan: null, glb: "", usdz: "" },
      { number: "203", floor: 2, area: 72, bedrooms: 2, bathrooms: 2, parking: 1, price: "$342.000.000", status: "available", image: null, plan: null, glb: "", usdz: "" },
      { number: "204", floor: 2, area: 58, bedrooms: 1, bathrooms: 1, parking: 1, price: "$272.000.000", status: "sold", image: null, plan: null, glb: "", usdz: "" },
      { number: "301", floor: 3, area: 68, bedrooms: 2, bathrooms: 2, parking: 1, price: "$335.000.000", status: "reserved", image: null, plan: null, glb: "", usdz: "" },
      { number: "302", floor: 3, area: 68, bedrooms: 2, bathrooms: 2, parking: 1, price: "$335.000.000", status: "available", image: null, plan: null, glb: "", usdz: "" },
      { number: "303", floor: 3, area: 72, bedrooms: 2, bathrooms: 2, parking: 1, price: "$348.000.000", status: "available", image: null, plan: null, glb: "", usdz: "" },
      { number: "304", floor: 3, area: 58, bedrooms: 1, bathrooms: 1, parking: 1, price: "$278.000.000", status: "sold", image: null, plan: null, glb: "", usdz: "" },
      { number: "401", floor: 4, area: 68, bedrooms: 2, bathrooms: 2, parking: 1, price: "$342.000.000", status: "available", image: null, plan: null, glb: "", usdz: "" },
      { number: "402", floor: 4, area: 68, bedrooms: 2, bathrooms: 2, parking: 1, price: "$342.000.000", status: "sold", image: null, plan: null, glb: "", usdz: "" },
      { number: "403", floor: 4, area: 72, bedrooms: 2, bathrooms: 2, parking: 1, price: "$355.000.000", status: "available", image: null, plan: null, glb: "", usdz: "" },
      { number: "404", floor: 4, area: 58, bedrooms: 1, bathrooms: 1, parking: 1, price: "$285.000.000", status: "available", image: null, plan: null, glb: "", usdz: "" },
    ],
  },
  {
    id: "altos-del-norte",
    slug: "proyecto-altos-del-norte",
    name: "Proyecto Altos del Norte",
    location: "Cúcuta, Norte de Santander",
    type: "Apartamentos",
    status: "en-construccion",
    statusLabel: "EN CONSTRUCCIÓN",
    priceFrom: "$280.000.000",
    units: 36,
    sold: 22,
    availableArea: "Desde 52 m²",
    areaFrom: "52 m²",
    soldPercent: 61,
    image: null,
    delivery: "Jun. 2026",
    heroTitle: "Tu próximo apartamento empieza aquí.",
    heroSubtitle: "Conoce cómo será el proyecto antes de estar terminado.",
    description:
      "Altos del Norte avanza en construcción. Un desarrollo de apartamentos con excelente ubicación urbana y espacios pensados para el día a día.",
    amenities: [
      { id: "fachada", label: "Fachada", image: null },
      { id: "lobby", label: "Lobby", image: null },
      { id: "apartamentos", label: "Apartamentos", image: null },
      { id: "zonas-sociales", label: "Zonas sociales", image: null },
      { id: "piscina", label: "Piscina", image: null },
      { id: "parqueaderos", label: "Parqueaderos", image: null },
      { id: "zonas-verdes", label: "Zonas verdes", image: null },
      { id: "areas-comunes", label: "Áreas comunes", image: null },
    ],
    floors: 4,
    unitsPerFloor: 4,
    glb: "",
    usdz: "",
    apartments: [
      { number: "101", floor: 1, area: 52, bedrooms: 1, bathrooms: 1, parking: 1, price: "$280.000.000", status: "sold", image: null, plan: null, glb: "", usdz: "" },
      { number: "102", floor: 1, area: 64, bedrooms: 2, bathrooms: 2, parking: 1, price: "$310.000.000", status: "available", image: null, plan: null, glb: "", usdz: "" },
      { number: "103", floor: 1, area: 64, bedrooms: 2, bathrooms: 2, parking: 1, price: "$310.000.000", status: "reserved", image: null, plan: null, glb: "", usdz: "" },
      { number: "104", floor: 1, area: 52, bedrooms: 1, bathrooms: 1, parking: 1, price: "$280.000.000", status: "sold", image: null, plan: null, glb: "", usdz: "" },
      { number: "201", floor: 2, area: 52, bedrooms: 1, bathrooms: 1, parking: 1, price: "$288.000.000", status: "available", image: null, plan: null, glb: "", usdz: "" },
      { number: "202", floor: 2, area: 64, bedrooms: 2, bathrooms: 2, parking: 1, price: "$318.000.000", status: "sold", image: null, plan: null, glb: "", usdz: "" },
      { number: "203", floor: 2, area: 64, bedrooms: 2, bathrooms: 2, parking: 1, price: "$318.000.000", status: "available", image: null, plan: null, glb: "", usdz: "" },
      { number: "204", floor: 2, area: 52, bedrooms: 1, bathrooms: 1, parking: 1, price: "$288.000.000", status: "sold", image: null, plan: null, glb: "", usdz: "" },
    ],
  },
  {
    id: "reserva-campestre",
    slug: "proyecto-reserva-campestre",
    name: "Proyecto Reserva Campestre",
    location: "Condominio El Encanto",
    type: "Casas",
    status: "proxima-entrega",
    statusLabel: "PRÓXIMA ENTREGA",
    priceFrom: "$780.000.000",
    units: 18,
    sold: 14,
    availableArea: "Desde 145 m²",
    areaFrom: "145 m²",
    soldPercent: 78,
    image: null,
    delivery: "Mar. 2026",
    heroTitle: "Tu próximo hogar empieza aquí.",
    heroSubtitle: "Conoce cómo será el proyecto antes de estar terminado.",
    description:
      "Reserva Campestre ofrece casas en un entorno natural exclusivo, con entrega próxima y acabados de alto estándar.",
    amenities: [
      { id: "fachada", label: "Fachada", image: null },
      { id: "lobby", label: "Acceso", image: null },
      { id: "apartamentos", label: "Casas modelo", image: null },
      { id: "zonas-sociales", label: "Zonas sociales", image: null },
      { id: "piscina", label: "Piscina", image: null },
      { id: "parqueaderos", label: "Parqueaderos", image: null },
      { id: "zonas-verdes", label: "Zonas verdes", image: null },
      { id: "areas-comunes", label: "Áreas comunes", image: null },
    ],
    floors: 1,
    unitsPerFloor: 4,
    glb: "",
    usdz: "",
    apartments: [
      { number: "Casa 01", floor: 1, area: 145, bedrooms: 3, bathrooms: 3, parking: 2, price: "$780.000.000", status: "sold", image: null, plan: null, glb: "", usdz: "" },
      { number: "Casa 02", floor: 1, area: 160, bedrooms: 3, bathrooms: 3, parking: 2, price: "$820.000.000", status: "available", image: null, plan: null, glb: "", usdz: "" },
      { number: "Casa 03", floor: 1, area: 145, bedrooms: 3, bathrooms: 3, parking: 2, price: "$780.000.000", status: "reserved", image: null, plan: null, glb: "", usdz: "" },
      { number: "Casa 04", floor: 1, area: 180, bedrooms: 4, bathrooms: 4, parking: 2, price: "$920.000.000", status: "available", image: null, plan: null, glb: "", usdz: "" },
    ],
  },
];

window.NexaProjectsAPI = {
  getAll() {
    return window.NEXA_PROJECTS || [];
  },
  getById(id) {
    return this.getAll().find((p) => p.id === id) || null;
  },
  getBySlug(slug) {
    return this.getAll().find((p) => p.slug === slug) || null;
  },
  statusClass(status) {
    const map = {
      "sobre-planos": "is-planos",
      "en-construccion": "is-construccion",
      "proxima-entrega": "is-entrega",
      entregado: "is-entregado",
      available: "is-available",
      reserved: "is-reserved",
      sold: "is-sold",
    };
    return map[status] || "";
  },
  statusLabelApt(status) {
    const map = {
      available: "Disponible",
      reserved: "Reservado",
      sold: "Vendido",
    };
    return map[status] || status;
  },
};
