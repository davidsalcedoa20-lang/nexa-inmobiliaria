/**
 * Nexa Inmobiliaria — Datos demo de Casas
 * Edita este archivo para actualizar fichas de casas.
 * image/images: null → placeholder "IMAGEN PRÓXIMAMENTE"
 * glb / usdz: "" → botones 3D/AR en estado "Próximamente"
 */

window.NEXA_CASAS = [
  {
    id: "el-encanto",
    slug: "casa-el-encanto",
    name: "Casa Campestre El Encanto",
    shortName: "Casa El Encanto",
    status: "available",
    statusLabel: "Casa disponible",
    location: "Condominio El Encanto, Norte de Santander",
    price: "$850.000.000 COP",
    priceLabel: "Desde",
    bedrooms: 3,
    bathrooms: 2,
    builtArea: "186 m²",
    lotArea: "450 m²",
    parking: 2,
    type: "Casa campestre",
    image: null,
    images: [null, null, null, null],
    photosCount: 12,
    description:
      "Casa campestre diseñada para el confort familiar, con amplios espacios sociales, excelente iluminación natural y una implantación pensada para aprovechar el entorno del condominio.",
    features: [
      "Construcción de alto estándar",
      "Cocina integral",
      "Zonas sociales amplias",
      "Terraza y jardín",
      "Parqueadero para 2 vehículos",
      "Condominio cerrado con vigilancia 24/7",
    ],
    finishes: [
      "Pisos en porcelanato",
      "Cocina en cuarzo",
      "Carpintería en madera",
      "Iluminación LED",
    ],
    services: [
      "Agua potable",
      "Energía eléctrica",
      "Gas natural / propano",
      "Internet fibra óptica disponible",
    ],
    rooms: [
      { id: "sala", label: "Sala" },
      { id: "comedor", label: "Comedor" },
      { id: "cocina", label: "Cocina" },
      { id: "habitacion-principal", label: "Habitación principal" },
      { id: "habitacion-2", label: "Habitación 2" },
      { id: "habitacion-3", label: "Habitación 3" },
      { id: "banos", label: "Baños" },
      { id: "exterior", label: "Exterior" },
    ],
    glb: "",
    usdz: "",
  },
  {
    id: "montana-azul",
    slug: "casa-montana-azul",
    name: "Casa Montaña Azul",
    shortName: "Casa Montaña Azul",
    status: "available",
    statusLabel: "Casa disponible",
    location: "Condominio Monte Verde, Norte de Santander",
    price: "$1.250.000.000 COP",
    priceLabel: "Desde",
    bedrooms: 4,
    bathrooms: 3,
    builtArea: "210 m²",
    lotArea: "600 m²",
    parking: 2,
    type: "Casa campestre",
    image: null,
    images: [null, null, null, null],
    photosCount: 14,
    description:
      "Casa de mayor área con vistas privilegiadas, espacios flexibles y una distribución ideal para familias que buscan amplitud y conexión con la montaña.",
    features: [
      "Diseño contemporáneo",
      "Sala doble altura",
      "Cocina abierta",
      "Suite principal con vestier",
      "Jardín perimetral",
      "Seguridad del condominio",
    ],
    finishes: [
      "Acabados premium",
      "Ventanería de alto desempeño",
      "Cubiertas térmicas",
      "Iluminación arquitectónica",
    ],
    services: [
      "Agua potable",
      "Energía eléctrica",
      "Gas",
      "Acceso pavimentado",
    ],
    rooms: [
      { id: "sala", label: "Sala" },
      { id: "comedor", label: "Comedor" },
      { id: "cocina", label: "Cocina" },
      { id: "habitacion-principal", label: "Habitación principal" },
      { id: "habitacion-2", label: "Habitación 2" },
      { id: "habitacion-3", label: "Habitación 3" },
      { id: "habitacion-4", label: "Habitación 4" },
      { id: "exterior", label: "Exterior" },
    ],
    glb: "",
    usdz: "",
  },
];

window.NexaCasasAPI = {
  getAll() {
    return window.NEXA_CASAS || [];
  },
  getById(id) {
    return this.getAll().find((c) => c.id === id || c.slug === id) || null;
  },
};
