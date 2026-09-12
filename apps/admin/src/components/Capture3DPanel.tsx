import type { CaptureRoom, CaptureRoomType, CaptureSession } from "@nexa/contracts";
import { useEffect, useRef, useState } from "react";
import {
  createCaptureRoom,
  capturePhotoContentType,
  deleteCapturePhoto,
  deleteCaptureRoom,
  getCapture,
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

export function Capture3DPanel({ propertyId }: { propertyId: string }) {
  const [session, setSession] = useState<CaptureSession | null>(null);
  const [roomType, setRoomType] = useState<CaptureRoomType>("living_room");
  const [roomName, setRoomName] = useState(roomLabels.living_room);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState<{ roomId: string; current: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [targetRoom, setTargetRoom] = useState<string | null>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const galleryInput = useRef<HTMLInputElement>(null);

  const reload = async () => {
    const snapshot = await getCapture(propertyId);
    setSession(snapshot);
  };

  useEffect(() => {
    setBusy(true);
    setError(null);
    void reload()
      .catch((requestError) => setError(message(requestError)))
      .finally(() => setBusy(false));
  }, [propertyId]);

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
    const invalid = selected.find((file) => !capturePhotoContentType(file) || file.size > maxFileBytes);
    if (invalid) {
      setError(`“${invalid.name}” no es JPG, PNG, WebP, HEIC/HEIF válido o supera 25 MB.`);
      return;
    }

    setError(null);
    setNotice(null);
    setUploading({ roomId, current: 0, total: selected.length });
    try {
      for (let index = 0; index < selected.length; index += 1) {
        const file = selected[index];
        if (!file) continue;
        setUploading({ roomId, current: index + 1, total: selected.length });
        await uploadCapturePhoto(propertyId, roomId, file);
      }
      await reload();
      setNotice(`${selected.length} ${selected.length === 1 ? "fotografía guardada" : "fotografías guardadas"}.`);
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
                        <span>Subiendo {roomUpload.current} de {roomUpload.total}</span>
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
              <strong>Preparar generación 3D</strong>
              <p>Esta acción se conectará al proveedor simulado en la siguiente etapa.</p>
            </div>
            <button className="primary-button" type="button" disabled title="Disponible en la ETAPA 4">
              Preparar generación 3D
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "No fue posible completar la operación";
}
