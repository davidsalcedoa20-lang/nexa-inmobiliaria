import type { CreatePropertyInput, Property, PropertyType } from "@nexa/contracts";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { createProperty, updateProperty } from "../lib/api";

type PropertyFormValues = {
  type: PropertyType;
  title: string;
  slug: string;
  summary: string;
  description: string;
  price: string;
  currency: "COP" | "USD";
  areaSquareMeters: string;
  bedrooms: string;
  bathrooms: string;
  parkingSpaces: string;
  address: string;
  neighborhood: string;
  city: string;
  department: string;
  country: string;
  latitude: string;
  longitude: string;
};

const typeLabels: Record<PropertyType, string> = {
  house: "Casa",
  lot: "Lote",
  preconstruction: "Sobreplano",
};

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function numeric(value: string) {
  if (!value.trim()) return null;
  return Number(value);
}

function defaults(property?: Property): PropertyFormValues {
  return {
    type: property?.type ?? "house",
    title: property?.title ?? "",
    slug: property?.slug ?? "",
    summary: property?.summary ?? "",
    description: property?.description ?? "",
    price: property?.price?.toString() ?? "",
    currency: property?.currency ?? "COP",
    areaSquareMeters: property?.areaSquareMeters?.toString() ?? "",
    bedrooms: property?.bedrooms?.toString() ?? "",
    bathrooms: property?.bathrooms?.toString() ?? "",
    parkingSpaces: property?.parkingSpaces?.toString() ?? "",
    address: property?.address ?? "",
    neighborhood: property?.neighborhood ?? "",
    city: property?.city ?? "",
    department: property?.department ?? "",
    country: property?.country ?? "Colombia",
    latitude: property?.latitude?.toString() ?? "",
    longitude: property?.longitude?.toString() ?? "",
  };
}

export function PropertyForm({
  property,
  onCancel,
  onSaved,
}: {
  property?: Property | undefined;
  onCancel: () => void;
  onSaved: (property: Property) => void;
}) {
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    getValues,
    setValue,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<PropertyFormValues>({ defaultValues: defaults(property) });

  useEffect(() => reset(defaults(property)), [property, reset]);

  const submit = async (values: PropertyFormValues) => {
    setServerError(null);
    const input: CreatePropertyInput = {
      type: values.type,
      title: values.title.trim(),
      slug: values.slug.trim(),
      summary: values.summary.trim() || null,
      description: values.description.trim() || null,
      price: numeric(values.price),
      currency: values.currency,
      areaSquareMeters: numeric(values.areaSquareMeters),
      bedrooms: numeric(values.bedrooms),
      bathrooms: numeric(values.bathrooms),
      parkingSpaces: numeric(values.parkingSpaces),
      address: values.address.trim() || null,
      neighborhood: values.neighborhood.trim() || null,
      city: values.city.trim() || null,
      department: values.department.trim() || null,
      country: values.country.trim(),
      latitude: numeric(values.latitude),
      longitude: numeric(values.longitude),
      specifications: property?.specifications ?? {},
    };

    try {
      const saved = property
        ? await updateProperty(property.id, { ...input, version: property.version })
        : await createProperty(input);
      reset(defaults(saved));
      onSaved(saved);
    } catch (error) {
      setServerError(error instanceof Error ? error.message : "No fue posible guardar la propiedad");
    }
  };

  return (
    <section className="editor-panel" aria-labelledby="property-editor-title">
      <div className="section-heading">
        <div>
          <p className="eyebrow">{property ? "Editar propiedad" : "Nueva propiedad"}</p>
          <h1 id="property-editor-title">{property?.title ?? "Crear propiedad"}</h1>
          <p className="muted">La propiedad se guarda primero como borrador.</p>
        </div>
        <button className="secondary-button desktop-action" type="button" onClick={onCancel}>
          Volver al listado
        </button>
      </div>

      <form className="property-form" onSubmit={handleSubmit(submit)} noValidate>
        <fieldset className="form-section">
          <legend>Información principal</legend>
          <div className="form-grid">
            <label>
              Tipo de propiedad
              <select {...register("type", { required: true })}>
                {Object.entries(typeLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>

            <label className="wide-field">
              Título
              <input
                {...register("title", {
                  required: "El título es obligatorio",
                  minLength: { value: 3, message: "Escribe al menos 3 caracteres" },
                  maxLength: { value: 180, message: "Máximo 180 caracteres" },
                })}
              />
              {errors.title && <span className="field-error">{errors.title.message}</span>}
            </label>

            <label className="wide-field">
              URL interna
              <div className="input-action">
                <input
                  {...register("slug", {
                    required: "La URL interna es obligatoria",
                    pattern: {
                      value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                      message: "Usa minúsculas, números y guiones",
                    },
                  })}
                />
                <button
                  className="compact-button"
                  type="button"
                  onClick={() => setValue("slug", slugify(getValues("title")), { shouldDirty: true })}
                >
                  Generar
                </button>
              </div>
              {errors.slug && <span className="field-error">{errors.slug.message}</span>}
            </label>

            <label className="wide-field">
              Resumen
              <textarea rows={3} maxLength={320} {...register("summary")} />
            </label>

            <label className="wide-field">
              Descripción
              <textarea rows={7} maxLength={10_000} {...register("description")} />
            </label>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Precio y características</legend>
          <div className="form-grid three-columns">
            <label>
              Precio
              <input type="number" min="0" step="0.01" inputMode="decimal" {...register("price")} />
            </label>
            <label>
              Moneda
              <select {...register("currency")}>
                <option value="COP">COP</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label>
              Área (m²)
              <input type="number" min="0.01" step="0.01" inputMode="decimal" {...register("areaSquareMeters")} />
            </label>
            <label>
              Habitaciones
              <input type="number" min="0" step="1" inputMode="numeric" {...register("bedrooms")} />
            </label>
            <label>
              Baños
              <input type="number" min="0" step="0.5" inputMode="decimal" {...register("bathrooms")} />
            </label>
            <label>
              Parqueaderos
              <input type="number" min="0" step="1" inputMode="numeric" {...register("parkingSpaces")} />
            </label>
          </div>
        </fieldset>

        <fieldset className="form-section">
          <legend>Ubicación</legend>
          <div className="form-grid">
            <label className="wide-field">
              Dirección
              <input {...register("address")} />
            </label>
            <label>
              Barrio o conjunto
              <input {...register("neighborhood")} />
            </label>
            <label>
              Ciudad
              <input {...register("city")} />
            </label>
            <label>
              Departamento
              <input {...register("department")} />
            </label>
            <label>
              País
              <input {...register("country", { required: true })} />
            </label>
            <label>
              Latitud
              <input type="number" min="-90" max="90" step="any" inputMode="decimal" {...register("latitude")} />
            </label>
            <label>
              Longitud
              <input type="number" min="-180" max="180" step="any" inputMode="decimal" {...register("longitude")} />
            </label>
          </div>
        </fieldset>

        <section className="future-module" aria-label="Captura 3D pendiente">
          <div className="future-icon" aria-hidden="true">3D</div>
          <div>
            <strong>Captura 3D</strong>
            <p>Las habitaciones y fotografías técnicas se habilitarán en la ETAPA 3.</p>
          </div>
          <span>Próximamente</span>
        </section>

        {serverError && <p className="form-error" role="alert">{serverError}</p>}

        <div className="form-actions sticky-actions">
          <button className="secondary-button" type="button" onClick={onCancel}>Cancelar</button>
          <button className="primary-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Guardando…" : property?.publicationStatus === "draft" || !property ? "Guardar borrador" : "Guardar cambios"}
          </button>
        </div>
        {property && !isDirty && <p className="saved-hint">Todos los cambios están guardados.</p>}
      </form>
    </section>
  );
}
