import type { AdminRole, Property, PropertyType, PublicationStatus } from "@nexa/contracts";
import { useCallback, useEffect, useState } from "react";
import {
  changePublication,
  deleteProperty,
  listProperties,
} from "../lib/api";
import { PropertyForm } from "./PropertyForm";

const typeLabels: Record<PropertyType, string> = {
  house: "Casa",
  lot: "Lote",
  preconstruction: "Sobreplano",
};

const statusLabels: Record<PublicationStatus, string> = {
  draft: "Borrador",
  published: "Publicada",
  unpublished: "Despublicada",
};

function money(property: Property) {
  if (property.price == null) return "Precio por definir";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: property.currency,
    maximumFractionDigits: 0,
  }).format(property.price);
}

export function PropertyDashboard({ role }: { role: AdminRole }) {
  const [properties, setProperties] = useState<Property[]>([]);
  const [selected, setSelected] = useState<Property | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [type, setType] = useState<PropertyType | "">("");
  const [status, setStatus] = useState<PublicationStatus | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await listProperties({
        pageSize: 100,
        ...(search ? { search } : {}),
        ...(type ? { type } : {}),
        ...(status ? { publicationStatus: status } : {}),
      });
      setProperties(result.data);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No fue posible cargar las propiedades");
    } finally {
      setLoading(false);
    }
  }, [search, status, type]);

  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 250);
    return () => window.clearTimeout(timer);
  }, [load]);

  const closeEditor = () => {
    setCreating(false);
    setSelected(null);
  };

  const saved = (property: Property) => {
    setCreating(false);
    setSelected(property);
    void load();
  };

  const publicationAction = async (property: Property) => {
    const action = property.publicationStatus === "published" ? "unpublish" : "publish";
    setActingId(property.id);
    setError(null);
    try {
      const updated = await changePublication(property, action);
      setNotice(action === "publish" ? `${updated.title} fue publicada.` : `${updated.title} fue despublicada.`);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No fue posible cambiar la publicación");
    } finally {
      setActingId(null);
    }
  };

  const remove = async (property: Property) => {
    if (!window.confirm(`¿Eliminar definitivamente “${property.title}”?`)) return;
    setActingId(property.id);
    try {
      await deleteProperty(property);
      setNotice(`${property.title} fue eliminada.`);
      await load();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "No fue posible eliminar la propiedad");
    } finally {
      setActingId(null);
    }
  };

  if (creating || selected) {
    return <PropertyForm property={selected ?? undefined} onCancel={closeEditor} onSaved={saved} />;
  }

  return (
    <section className="property-dashboard" aria-labelledby="properties-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">Portafolio inmobiliario</p>
          <h1 id="properties-title">Propiedades</h1>
          <p className="muted">Administra casas, lotes y proyectos sobreplano.</p>
        </div>
        <button className="primary-button new-property-button" type="button" onClick={() => setCreating(true)}>
          <span aria-hidden="true">＋</span> Nueva propiedad
        </button>
      </div>

      <div className="filters" aria-label="Filtros de propiedades">
        <label className="search-field">
          <span>Buscar</span>
          <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Nombre, ciudad o conjunto" />
        </label>
        <label>
          <span>Tipo</span>
          <select value={type} onChange={(event) => setType(event.target.value as PropertyType | "")}>
            <option value="">Todos</option>
            {Object.entries(typeLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
        <label>
          <span>Estado</span>
          <select value={status} onChange={(event) => setStatus(event.target.value as PublicationStatus | "")}>
            <option value="">Todos</option>
            {Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </label>
      </div>

      {notice && <div className="notice" role="status"><span>✓</span>{notice}<button onClick={() => setNotice(null)} aria-label="Cerrar">×</button></div>}
      {error && <p className="form-error" role="alert">{error}</p>}

      {loading ? (
        <div className="content-state">Cargando propiedades…</div>
      ) : properties.length === 0 ? (
        <div className="empty-state">
          <div aria-hidden="true">⌂</div>
          <h2>No hay propiedades para mostrar</h2>
          <p>Crea el primer borrador o modifica los filtros.</p>
          <button className="primary-button" type="button" onClick={() => setCreating(true)}>Crear propiedad</button>
        </div>
      ) : (
        <div className="property-list">
          {properties.map((property) => (
            <article className="property-row" key={property.id}>
              <div className={`property-placeholder property-placeholder--${property.type}`} aria-hidden="true">
                <span>{typeLabels[property.type].slice(0, 1)}</span>
              </div>
              <div className="property-copy">
                <div className="property-meta">
                  <span className="type-chip">{typeLabels[property.type]}</span>
                  <span className={`status-chip status-chip--${property.publicationStatus}`}>
                    {statusLabels[property.publicationStatus]}
                  </span>
                </div>
                <h2>{property.title}</h2>
                <p>{property.city || property.neighborhood || "Ubicación pendiente"} · {property.areaSquareMeters ? `${property.areaSquareMeters} m²` : "Área pendiente"}</p>
                <strong>{money(property)}</strong>
              </div>
              <div className="property-actions">
                <button className="secondary-button" type="button" onClick={() => setSelected(property)}>Editar</button>
                {role === "admin" && (
                  <button
                    className={property.publicationStatus === "published" ? "secondary-button" : "gold-button"}
                    type="button"
                    disabled={actingId === property.id}
                    onClick={() => void publicationAction(property)}
                  >
                    {property.publicationStatus === "published" ? "Despublicar" : "Publicar"}
                  </button>
                )}
                {role === "admin" && (
                  <button className="danger-text-button" type="button" disabled={actingId === property.id} onClick={() => void remove(property)}>
                    Eliminar
                  </button>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
