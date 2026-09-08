import React, { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, CameraOff, RefreshCw, X, Check, Trash2, 
  Image as ImageIcon, AlertCircle, CheckCircle2, User, 
  Eye, ZoomIn, Upload, ShieldCheck, Sparkles, AlertTriangle 
} from 'lucide-react';
import { Employee, CleaningTaskStatus, ZeladorTaskStatus } from '../../types';

interface EvidenceCameraModalProps {
  isOpen: boolean;
  taskTitle: string;
  taskArea: string;
  dayLabel?: string;
  shiftLabel?: string;
  assignedManager?: string;
  eligibleManagers: Employee[];
  currentStatus?: CleaningTaskStatus | ZeladorTaskStatus;
  readOnly?: boolean;
  onClose: () => void;
  onSaveEvidence: (data: { completedBy: string; photos: string[]; notes?: string }) => void;
  onUnmarkTask?: () => void;
}

export const EvidenceCameraModal: React.FC<EvidenceCameraModalProps> = ({
  isOpen,
  taskTitle,
  taskArea,
  dayLabel,
  shiftLabel,
  assignedManager,
  eligibleManagers,
  currentStatus,
  readOnly = false,
  onClose,
  onSaveEvidence,
  onUnmarkTask
}) => {
  // Photos array (base64 data URLs)
  const [photos, setPhotos] = useState<string[]>([]);
  const [selectedManager, setSelectedManager] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [activeFacingMode, setActiveFacingMode] = useState<'environment' | 'user'>('environment');

  // Camera stream state
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);

  // Zoomed photo preview modal
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Stop camera tracks safely
  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
  }, []);

  // Initialize camera stream
  const startCamera = useCallback(async (facingMode: 'environment' | 'user' = 'environment') => {
    stopCameraStream();
    setCameraError(null);
    setIsStartingCamera(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Acesso à câmara não suportado neste navegador. Utilize o botão de carregar foto.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
      setIsStartingCamera(false);
    } catch (err: any) {
      console.warn("Could not start live camera:", err);
      setIsStartingCamera(false);
      setIsCameraActive(false);
      setCameraError(
        err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError'
          ? 'Permissão de câmara recusada. Por favor autorize a câmara ou use o botão de carregar foto abaixo.'
          : 'Não foi possível ligar a câmara em direto. Utilize o botão de carregar/tirar foto do dispositivo.'
      );
    }
  }, [stopCameraStream]);

  // When modal opens, populate current status and determine manager
  useEffect(() => {
    if (isOpen) {
      const initialPhotos = currentStatus?.photos ? [...currentStatus.photos] : [];
      setPhotos(initialPhotos);
      setNotes(currentStatus && 'notes' in currentStatus ? (currentStatus.notes || '') : (currentStatus && 'comentario' in currentStatus ? (currentStatus.comentario || '') : ''));

      // Manager priority:
      // 1. Current completedBy / funcionario
      // 2. assignedManager from shift
      // 3. First eligible manager
      const existingDoneBy = currentStatus && 'completedBy' in currentStatus ? currentStatus.completedBy : (currentStatus && 'funcionario' in currentStatus ? currentStatus.funcionario : '');
      if (existingDoneBy) {
        setSelectedManager(existingDoneBy);
      } else if (assignedManager) {
        setSelectedManager(assignedManager);
      } else if (eligibleManagers.length > 0) {
        setSelectedManager(eligibleManagers[0].name);
      } else {
        setSelectedManager('');
      }

      // If not read-only and no photos yet, attempt starting camera
      if (!readOnly) {
        startCamera(activeFacingMode);
      }
    } else {
      stopCameraStream();
      setZoomedPhoto(null);
    }

    return () => {
      stopCameraStream();
    };
  }, [isOpen, currentStatus, assignedManager, eligibleManagers, readOnly]);

  // Compress image to JPEG base64 (max dimension 1024px, 0.75 quality)
  const compressImage = (source: CanvasImageSource, originalWidth: number, originalHeight: number): string => {
    const maxDim = 1024;
    let targetWidth = originalWidth;
    let targetHeight = originalHeight;

    if (targetWidth > maxDim || targetHeight > maxDim) {
      if (targetWidth > targetHeight) {
        targetHeight = Math.round((targetHeight * maxDim) / targetWidth);
        targetWidth = maxDim;
      } else {
        targetWidth = Math.round((targetWidth * maxDim) / targetHeight);
        targetHeight = maxDim;
      }
    }

    const canvas = document.createElement('canvas');
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    ctx.drawImage(source, 0, 0, targetWidth, targetHeight);
    return canvas.toDataURL('image/jpeg', 0.78);
  };

  // Capture photo from live video stream
  const handleCapturePhoto = () => {
    if (!videoRef.current || !isCameraActive) return;

    const video = videoRef.current;
    const width = video.videoWidth || 640;
    const height = video.videoHeight || 480;

    const dataUrl = compressImage(video, width, height);
    if (dataUrl) {
      setPhotos(prev => [...prev, dataUrl]);
    }
  };

  // Toggle front/back camera
  const handleSwitchCamera = () => {
    const nextMode = activeFacingMode === 'environment' ? 'user' : 'environment';
    setActiveFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Handle file input (fallback / external camera on mobile)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (!file) continue;
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          const compressed = compressImage(img, img.width, img.height);
          if (compressed) {
            setPhotos(prev => [...prev, compressed]);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Remove photo from gallery
  const handleRemovePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };

  // Save evidence and mark as seen
  const handleSave = () => {
    if (photos.length < 1) {
      return; // Mandatory 1 photo minimum
    }

    const finalManager = selectedManager.trim() || (eligibleManagers[0]?.name || 'Gerente de Turno');
    onSaveEvidence({
      completedBy: finalManager,
      photos,
      notes: notes.trim()
    });
    stopCameraStream();
    onClose();
  };

  if (!isOpen) return null;

  const isCompleted = currentStatus?.completed;
  const canSave = photos.length >= 1;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/80 backdrop-blur-xs overflow-y-auto animate-fadeIn">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-xs">
              <Camera size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-300 border border-teal-500/30">
                  Evidência Obrigatória
                </span>
                {dayLabel && (
                  <span className="text-xs text-slate-400 font-medium">
                    {dayLabel} {shiftLabel ? `• ${shiftLabel}` : ''}
                  </span>
                )}
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white line-clamp-1">
                {taskTitle}
              </h2>
            </div>
          </div>
          <button
            onClick={() => {
              stopCameraStream();
              onClose();
            }}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
          {/* Task Info Pill */}
          <div className="bg-teal-50/70 border border-teal-200/80 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-teal-600" />
              <span className="text-xs font-bold text-teal-900">Área: {taskArea}</span>
            </div>
            {isCompleted && (
              <span className="flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                <CheckCircle2 size={13} />
                <span>Atualmente Marcada como Vista</span>
              </span>
            )}
          </div>

          {/* Gerente Responsável Face ao Cargo */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <User size={14} className="text-teal-600" />
              <span>Gerente Responsável pela Verificação (Face ao Cargo)</span>
            </label>
            {readOnly ? (
              <p className="text-sm font-bold text-gray-900 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                {selectedManager || 'Não especificado'}
              </p>
            ) : (
              <div className="space-y-1">
                <select
                  value={selectedManager}
                  onChange={(e) => setSelectedManager(e.target.value)}
                  className="w-full p-2.5 bg-gray-50 hover:bg-white border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl text-sm font-semibold text-gray-800 outline-hidden transition-colors"
                >
                  <option value="">-- Selecione o Gerente --</option>
                  {eligibleManagers.map(emp => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.role === 'GERENTE_RESTAURANTE' ? 'Gerente de Restaurante' : 'Gerente'})
                    </option>
                  ))}
                  {selectedManager && !eligibleManagers.some(e => e.name === selectedManager) && (
                    <option value={selectedManager}>{selectedManager}</option>
                  )}
                </select>
                {eligibleManagers.length === 0 && (
                  <p className="text-[11px] text-amber-600 flex items-center gap-1 mt-1">
                    <AlertTriangle size={12} />
                    <span>Nenhum colaborador com cargo de Gerente ativo nas Definições. Adicione colaboradores nas Definições de Equipa.</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Camera Viewfinder & Controls (Only when not read-only) */}
          {!readOnly && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Camera size={14} className="text-teal-600" />
                  <span>Captura de Evidência com Câmara</span>
                </span>
                <div className="flex items-center gap-1.5">
                  {isCameraActive && (
                    <button
                      type="button"
                      onClick={handleSwitchCamera}
                      className="text-xs px-2.5 py-1 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold flex items-center gap-1 transition-colors"
                      title="Alternar entre câmara traseira e frontal"
                    >
                      <RefreshCw size={12} />
                      <span>Inverter</span>
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs px-2.5 py-1 rounded-lg bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold flex items-center gap-1 border border-teal-200 transition-colors"
                  >
                    <Upload size={12} />
                    <span>Carregar do Dispositivo</span>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>
              </div>

              {/* Viewfinder area */}
              <div className="relative bg-slate-950 rounded-2xl overflow-hidden aspect-video sm:aspect-16/9 flex items-center justify-center border-2 border-slate-800 shadow-inner">
                {isCameraActive ? (
                  <>
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    {/* Capture button overlay */}
                    <div className="absolute bottom-4 left-0 right-0 flex items-center justify-center pointer-events-auto">
                      <button
                        type="button"
                        onClick={handleCapturePhoto}
                        className="group flex items-center gap-2 px-5 py-2.5 bg-teal-600 hover:bg-teal-500 active:scale-95 text-white font-bold text-sm rounded-full shadow-lg transition-all border-2 border-white/80"
                      >
                        <div className="w-3 h-3 rounded-full bg-white group-hover:scale-125 transition-transform" />
                        <span>Tirar Foto de Evidência</span>
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center text-slate-400 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-slate-800 mx-auto flex items-center justify-center text-slate-300">
                      {isStartingCamera ? (
                        <RefreshCw size={24} className="animate-spin text-teal-400" />
                      ) : (
                        <CameraOff size={24} />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-300">
                        {isStartingCamera
                          ? 'A iniciar câmara em direto...'
                          : cameraError || 'Câmara em direto não iniciada'}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">
                        Pode ligar a câmara ou tirar/carregar diretamente ficheiros com a câmara do telemóvel ou tablet.
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() => startCamera(activeFacingMode)}
                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5"
                      >
                        <Camera size={14} />
                        <span>Ativar Câmara em Direto</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5"
                      >
                        <Upload size={14} />
                        <span>Tirar / Selecionar Foto</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Mandatory requirement indicator */}
          <div className={`p-3 rounded-xl border flex items-center gap-2.5 transition-colors ${
            photos.length >= 1
              ? 'bg-emerald-50 border-emerald-300 text-emerald-900'
              : 'bg-amber-50 border-amber-300 text-amber-900'
          }`}>
            {photos.length >= 1 ? (
              <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle size={20} className="text-amber-600 shrink-0" />
            )}
            <div className="text-xs">
              <span className="font-black">
                {photos.length >= 1 ? 'Requisito Cumprido:' : 'Obrigatório (Mínimo 1 Imagem):'}
              </span>{' '}
              <span>
                {photos.length >= 1
                  ? `${photos.length} fotografia(s) de evidência adicionada(s). Pode confirmar e marcar como visto.`
                  : 'É obrigatório capturar ou carregar pelo menos 1 fotografia que comprove a execução da limpeza antes de poder marcar como visto.'}
              </span>
            </div>
          </div>

          {/* Gallery of Captured Photos */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5">
                <ImageIcon size={14} className="text-teal-600" />
                <span>Evidências Fotográficas ({photos.length})</span>
              </label>
              {photos.length > 0 && !readOnly && (
                <button
                  type="button"
                  onClick={() => setPhotos([])}
                  className="text-[11px] text-red-500 hover:text-red-700 font-semibold"
                >
                  Limpar todas
                </button>
              )}
            </div>

            {photos.length === 0 ? (
              <div className="p-6 border-2 border-dashed border-gray-200 rounded-xl text-center text-gray-400">
                <ImageIcon size={28} className="mx-auto mb-1 text-gray-300" />
                <p className="text-xs font-semibold">Nenhuma foto de evidência adicionada ainda.</p>
                <p className="text-[11px] text-gray-400 mt-0.5">Use a câmara acima ou o botão de carregar.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((imgUrl, idx) => (
                  <div
                    key={idx}
                    className="group relative bg-slate-900 rounded-xl overflow-hidden aspect-4/3 border border-gray-200 shadow-xs"
                  >
                    <img
                      src={imgUrl}
                      alt={`Evidência ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                    {/* Badge */}
                    <span className="absolute top-1.5 left-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md backdrop-blur-xs">
                      Foto {idx + 1} {idx === 0 ? '(Obrigatória)' : ''}
                    </span>

                    {/* Action buttons */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => setZoomedPhoto(imgUrl)}
                        className="p-1.5 bg-white/90 hover:bg-white text-gray-800 rounded-lg shadow-sm"
                        title="Ampliar foto"
                      >
                        <ZoomIn size={16} />
                      </button>
                      {!readOnly && (
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(idx)}
                          className="p-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-sm"
                          title="Remover foto"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Optional Notes */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Observações Adicionais da Limpeza (Opcional)
            </label>
            {readOnly ? (
              notes ? (
                <p className="text-xs text-gray-700 bg-gray-50 p-2.5 rounded-lg border border-gray-200">
                  {notes}
                </p>
              ) : (
                <p className="text-xs text-gray-400 italic">Sem observações.</p>
              )
            ) : (
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Bancadas e grelhas desinfetadas com detergente sanitizante, sem sujidade residual..."
                rows={2}
                className="w-full p-2.5 bg-gray-50 hover:bg-white border border-gray-300 focus:border-teal-500 focus:ring-1 focus:ring-teal-500 rounded-xl text-xs text-gray-800 outline-hidden transition-colors"
              />
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-gray-50 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div>
            {isCompleted && onUnmarkTask && !readOnly && (
              <button
                type="button"
                onClick={() => {
                  if (window.confirm('Tem a certeza que deseja desmarcar esta tarefa de limpeza?')) {
                    onUnmarkTask();
                    stopCameraStream();
                    onClose();
                  }
                }}
                className="text-xs font-bold text-red-600 hover:text-red-800 hover:underline flex items-center gap-1"
              >
                <Trash2 size={13} />
                <span>Desmarcar Tarefa</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                stopCameraStream();
                onClose();
              }}
              className="px-4 py-2 text-xs font-bold text-gray-600 hover:text-gray-800 hover:bg-gray-200 rounded-xl transition-colors"
            >
              Cancelar
            </button>

            {!readOnly && (
              <button
                type="button"
                disabled={!canSave}
                onClick={handleSave}
                className={`px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-sm ${
                  canSave
                    ? 'bg-teal-600 hover:bg-teal-700 text-white cursor-pointer active:scale-95 ring-2 ring-teal-500/30'
                    : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
                title={!canSave ? 'Tire pelo menos 1 foto para poder guardar' : 'Guardar evidências e marcar como visto'}
              >
                <ShieldCheck size={16} />
                <span>Marcar como Visto & Concluir</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox zoomed preview */}
      {zoomedPhoto && (
        <div
          className="fixed inset-0 z-60 bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setZoomedPhoto(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh] flex flex-col items-center">
            <button
              onClick={() => setZoomedPhoto(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 p-1"
            >
              <X size={24} />
            </button>
            <img
              src={zoomedPhoto}
              alt="Evidência ampliada"
              className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
};
