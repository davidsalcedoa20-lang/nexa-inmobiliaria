import type {
  CaptureRoom,
  CaptureRoomType,
  CaptureSession,
  ThreeDStatus,
  ThreeDStatusResponse,
} from "@nexa/contracts";
import { useEffect, useRef, useState } from "react";
import {
  createCaptureRoom,
  capturePhotoContentType,
  deleteCapturePhoto,
  deleteCaptureRoom,
  getCapture,
  getThreeDStatus,
  prepareThreeDGeneration,
  publishThreeDExperience,
  startCaptureSession,
  uploadCapturePhoto,
} from "../lib/api";

const roomLabels: Record<CaptureRoomType, string> = {
  living_room: "Sala",
  kitchen: "Cocina",
  primary_bedroom: "Habitación principal",
  bedroom: "Habitación",
  bathroom: "Baño",
  hallway: "Pasillo",
  terrace: "Terraza",
  exterior: "Exterior",
  other: "Otro",
};

const maxFileBytes = 25 * 1024 * 1024;

const threeDLabels: Record<ThreeDStatus, string> = {
  not_started: "Sin iniciar",
  uploading: "Cargando fotografías",
  queued: "En cola",
  processing: "Procesando",
  review_required: "Revisión requerida",
  ready: "Lista",
  failed: "Falló",
};

const threeDHelp: Record<ThreeDStatus, string> = {
  not_started: "Cuando termines la captura podrás preparar la experiencia 3D simulada.",
  uploading: "Las fotografías técnicas todavía se están preparando.",
  queued: "El trabajo fue registrado y espera comenzar.",
  processing: "El proveedor está preparando la experiencia.",
  review_required: "La preparación simulada terminó. Revísala y publícala cuando corresponda.",
  ready: "La experiencia simulada está aprobada. No se ha generado ningún modelo real.",
  failed: "La preparación no terminó correctamente. Puedes intentarlo de nuevo.",
};

export function Capture3DPanel({
  propertyId,
  canPublish,
}: {
  propertyId: string;
  canPublish: boolean;
}) {
  const [session, setSession] = useState<CaptureSession | null>(null);
  const [threeD, setThreeD] = useState<ThreeDStatusResponse | null>(null);
  const [roomType, setRoomType] = useState<CaptureRoomType>("living_room");
  const [roomName, setRoomName] = useState(roomLabels.living_room);
  const [busy, setBusy] = useState(false);
  const [threeDBusy, setThreeDBusy] = useState(false);
  const [uploading, setUploading] = useState<{ roomId: string; current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [targetRoom, setTargetRoom] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const reload = async () => {
    const [snapshot, status] = await Promise.all([
      getCapture(propertyId),
      getThreeDStatus(propertyId),
    ]);
    setSession(snapshot);
    setThreeD(status);
  };

  useEffect(() => {
    setBusy(true);
    setError(null);
    void reload()
      .catch((requestError) => setError(message(requestError)))
      .finally(() => setBusy(false));
  }, [propertyId]);

  useEffect(() => {
    if (threeD?.status !== "queued" && threeD?.status !== "processing") return;
    const timer = window.setInterval(() => {
      void getThreeDStatus(propertyId).then(setThreeD).catch(() => undefined);
    }, 3000);
    return () => window.clearInterval(timer);
  }, [propertyId, threeD?.status]);

  const begin = async () => {
    setBusy(true);
    setError(null);
    try {
      setSession(await startCaptureSession(propertyId));
      setNotice("Sesión de captura creada. Ahora añade la primera habitación.");
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setBusy(false);
    }
  };

  const addRoom = async () => {
    if (!roomName.trim()) return;
    setBusy(true);
    setError(null);
    try {
      await createCaptureRoom(propertyId, {
        type: roomType,
        name: roomName.trim(),
        sortOrder: session?.rooms.length ?? 0,
      });
      await reload();
      setNotice(`${roomName.trim()} fue añadida.`);
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setBusy(false);
    }
  };

  const removeRoom = async (room: CaptureRoom) => {
    if (!window.confirm(`¿Eliminar “${room.name}” y todas sus fotografías técnicas?`)) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCaptureRoom(propertyId, room.id);
      await reload();
      setNotice(`${room.name} fue eliminada.`);
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setBusy(false);
    }
  };

  const openPicker = (roomId: string, source: "camera" | "gallery") => {
    setTargetRoom(roomId);
    window.setTimeout(() => {
      (source === "camera" ? cameraInput.current : galleryInput.current)?.click();
    }, 0);
  };

  const uploadFiles = async (files: FileList | null) => {
    const roomId = targetRoom;
    if (!roomId || !files?.length) return;
    const selected = Array.from(files);
    const invalid = selected.find((file) => !capturePhotoContentType(file) || file.size === 0 || file.size > maxFileBytes);
    if (invalid) {
      setError(`“${invalid.name}” no es JPG, PNG, WebP, HEIC/HEIF válido o supera 25 MB.`);
      return;
    }

    setError(null);
    setNotice(null);
    setUploading({ roomId, current: 0, total: selected.length });
    let saved = 0;
    const failed: string[] = [];
    try {
      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        if (!file) continue;
        try {
          await uploadCapturePhoto(propertyId, roomId, file);
          saved += 1;
        } catch {
          failed.push(file.name);
        }
        setUploading({ roomId, current: index + 1, total: selected.length });
      }
      await reload();
      setNotice(`${saved} ${saved === 1 ? "fotografía guardada" : "fotografías guardadas"}.`);
      if (failed.length) setError(`No se pudieron confirmar ${failed.length} fotos: ${failed.join(", ")}. Revisa las miniaturas antes de volver a seleccionarlas.`);
    } catch (requestError) {
      await reload().catch(() => undefined);
      setError(message(requestError));
    } finally {
      setUploading(null);
      if (cameraInput.current) cameraInput.current.value = "";
      if (galleryInput.current) galleryInput.current.value = "";
    }
  };

  const removePhoto = async (photoId: string) => {
    if (!window.confirm("¿Eliminar esta fotografía técnica?")) return;
    setBusy(true);
    setError(null);
    try {
      await deleteCapturePhoto(propertyId, photoId);
      await reload();
      setNotice("Fotografía eliminada.");
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setBusy(false);
    }
  };

  const prepareThreeD = async () => {
    setThreeDBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await prepareThreeDGeneration(propertyId);
      setThreeD(result);
      setNotice("La preparación simulada terminó y está lista para revisión.");
    } catch (requestError) {
      await getThreeDStatus(propertyId).then(setThreeD).catch(() => undefined);
      setError(message(requestError));
    } finally {
      setThreeDBusy(false);
    }
  };

  const publishThreeD = async () => {
    setThreeDBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await publishThreeDExperience(propertyId);
      setThreeD(result);
      setNotice("La experiencia 3D simulada quedó marcada como lista.");
    } catch (requestError) {
      setError(message(requestError));
    } finally {
      setThreeDBusy(false);
    }
  };

  return (
    <section className="capture-panel" aria-labelledby="capture-title">
      <input
        ref={cameraInput}
        className="visually-hidden-input"
        type="file"
        accept="image/*"
        capture="environment"
        onChange={(event) => void uploadFiles(event.target.files)}
      />
      <input
        ref={galleryInput}
        className="visually-hidden-input"
        type="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        multiple
        onChange={(event) => void uploadFiles(event.target.files)}
      />

      <div className="capture-heading">
        <div>
          <p className="eyebrow">Material técnico separado de la galería</p>
          <h2 id="capture-title">Captura 3D</h2>
          <p className="muted">Organiza las fotografías por habitación para preparar el futuro modelo 3D.</p>
          <p className="muted">Máximo 25 MB por foto. Mantén esta pantalla abierta hasta que termine la subida. Las fotos guardadas se conservan al salir.</p>
        </div>
        {session && <span className="capture-total">{session.totalPhotoCount} fotos</span>}
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}
      {notice && <p className="success-message" role="status">{notice}</p>}

      {busy && !session ? (
        <div className="capture-empty">Cargando captura…</div>
      ) : !session ? (
        <div className="capture-empty">
          <div aria-hidden="true">⌁</div>
          <strong>Aún no hay una sesión de captura</strong>
          <p>Créala para comenzar a registrar habitaciones y sus fotografías.</p>
          <button className="primary-button" type="button" disabled={busy} onClick={() => void begin()}>
            Iniciar captura 3D
          </button>
        </div>
      ) : (
        <>
          <div className="room-creator">
            <label>
              Tipo de habitación
              <select
                value={roomType}
                onChange={(event) => {
                  const value = event.target.value as CaptureRoomType;
                  setRoomType(value);
                  setRoomName(roomLabels[value]);
                }}
              >
                {Object.entries(roomLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label>
              Nombre visible
              <input maxLength={80} value={roomName} onChange={(event) => setRoomName(event.target.value)} />
            </label>
            <button className="secondary-button" type="button" disabled={busy || !roomName.trim()} onClick={() => void addRoom()}>
              ＋ Añadir habitación
            </button>
          </div>

          {session.rooms.length === 0 ? (
            <div className="capture-empty compact"><p>Añade una habitación para comenzar a tomar fotos.</p></div>
          ) : (
            <div className="capture-room-list">
              {session.rooms.map((room) => {
                const roomUpload = uploading?.roomId === room.id ? uploading : null;
                return (
                  <article className="capture-room" key={room.id}>
                    <div className="room-header">
                      <div>
                        <span className="room-type">{roomLabels[room.type]}</span>
                        <h3>{room.name}</h3>
                        <p>{room.photoCount} {room.photoCount === 1 ? "fotografía" : "fotografías"}</p>
                      </div>
                      <button className="room-delete" type="button" disabled={busy || Boolean(uploading)} onClick={() => void removeRoom(room)} aria-label={`Eliminar ${room.name}`}>
                        Eliminar
                      </button>
                    </div>

                    {room.photos.length > 0 && (
                      <div className="capture-thumbnails">
                        {room.photos.map((photo) => (
                          <div className="capture-thumbnail" key={photo.id}>
                            {photo.previewUrl ? (
                              <img src={photo.previewUrl} alt={`Fotografía técnica de ${room.name}`} loading="lazy" />
                            ) : (
                              <div className="photo-pending">{photo.status === "failed" ? "Falló" : "Subiendo"}</div>
                            )}
                            <button type="button" disabled={busy || Boolean(uploading)} onClick={() => void removePhoto(photo.id)} aria-label="Eliminar fotografía">×</button>
                          </div>
                        ))}
                      </div>
                    )}

                    {roomUpload && (
                      <div className="upload-progress" role="status">
                        <span>Procesadas {roomUpload.current} de {roomUpload.total}</span>
                        <progress value={roomUpload.current} max={roomUpload.total} />
                      </div>
                    )}

                    <div className="capture-actions">
                      <button className="gold-button" type="button" disabled={busy || Boolean(uploading)} onClick={() => openPicker(room.id, "camera")}>
                        {room.photoCount > 0 ? "Continuar captura" : "Tomar fotos"}
                      </button>
                      <button className="secondary-button" type="button" disabled={busy || Boolean(uploading)} onClick={() => openPicker(room.id, "gallery")}>
                        Elegir del dispositivo
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          <div className="prepare-3d">
            <div>
              <div className="three-d-status-line">
                <strong>Preparar generación 3D</strong>
                {threeD && (
                  <span className={`three-d-chip three-d-chip--${threeD.status}`}>
                    {threeDLabels[threeD.status]}
                  </span>
                )}
              </div>
              <p>{threeD ? threeDHelp[threeD.status] : "Consultando el estado de preparación…"}</p>
              {threeD?.latestJob && (
                <small>Proveedor: {threeD.latestJob.provider === "mock" ? "Simulado" : threeD.latestJob.provider}</small>
              )}
            </div>
            {threeD?.status === "review_required" ? (
              <button
                className="primary-button"
                type="button"
                disabled={!canPublish || threeDBusy}
                onClick={() => void publishThreeD()}
                title={canPublish ? undefined : "Solo un administrador puede publicar"}
              >
                {threeDBusy ? "Publicando…" : canPublish ? "Publicar experiencia 3D" : "Pendiente de administrador"}
              </button>
            ) : threeD?.status === "ready" ? (
              <span className="three-d-ready-mark" aria-label="Experiencia 3D lista">✓ Lista</span>
            ) : (
              <button
                className="primary-button"
                type="button"
                disabled={
                  threeDBusy ||
                  Boolean(uploading) ||
                  session.totalPhotoCount === 0 ||
                  threeD?.status === "queued" ||
                  threeD?.status === "processing" ||
                  !threeD
                }
                onClick={() => void prepareThreeD()}
              >
                {threeDBusy
                  ? "Preparando…"
                  : threeD?.status === "failed"
                    ? "Reintentar preparación"
                    : "Preparar generación 3D"}
              </button>
            )}
          </div>
        </>
      )}
    </section>
  );
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "No fue posible completar la operación";
}
