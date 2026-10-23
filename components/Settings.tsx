import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AppSettings,
  BusinessArea,
  Employee,
  FloorPlanLabels,
  FloorPlanStageId,
  FloorPlanZoneId,
  RestaurantTypology,
  ShiftType,
  StationConfig,
} from '../types';
import {
  AVAILABLE_AREAS,
  AVAILABLE_SHIFTS,
  AVAILABLE_TYPOLOGIES,
} from '../constants';
import {
  COUNTER_STAGE_OPTIONS,
  FLOOR_PLAN_ZONE_OPTIONS,
  KITCHEN_STAGE_OPTIONS,
  resolveCounterStage,
  resolveFloorPlanLabels,
  resolveKitchenStage,
  resolveStationLine,
  resolveStationZone,
} from '../utils/floorPlanLayout';
import { AreaAndStationEditorModal } from './positioning/AreaAndStationEditorModal';
import { useToast } from './ui/ToastProvider';
import {
  Check,
  CheckSquare,
  Download,
  Edit2,
  Plus,
  Save,
  Sliders,
  Square,
  Trash2,
  Upload,
  X,
} from 'lucide-react';

interface SettingsProps {
  settings: AppSettings;
  onSaveSettings: (settings: AppSettings) => void;
  employees: Employee[];
  setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
  onImportFullData: (data: any) => void;
  onExportFullData: () => void;
}

const ZONE_TITLE_KEYS: Record<FloorPlanZoneId, keyof FloorPlanLabels> = {
  grills: 'grillsTitle',
  kitchen: 'kitchenTitle',
  fryers: 'fryersTitle',
  beverage: 'beverageTitle',
  cashier: 'cashierTitle',
  counter: 'counterTitle',
  fries: 'friesTitle',
  delivery: 'deliveryTitle',
  lobby: 'lobbyTitle',
  drive: 'driveTitle',
  mccafe: 'mccafeTitle',
};

export const Settings: React.FC<SettingsProps> = ({
  settings,
  onSaveSettings,
  onImportFullData,
  onExportFullData,
}) => {
  const { showToast: toast } = useToast();
  const [activeTab, setActiveTab] = useState<'stations' | 'general'>('stations');
  const [localSettings, setLocalSettings] = useState<AppSettings>(settings);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isStationModalOpen, setIsStationModalOpen] = useState(false);
  const [editingStation, setEditingStation] = useState<StationConfig | null>(null);
  const [fullEditorOpen, setFullEditorOpen] = useState(false);
  const [fullEditorZone, setFullEditorZone] = useState<FloorPlanZoneId | null>(null);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const resolvedLabels = useMemo(
    () => resolveFloorPlanLabels(localSettings.floorPlanLabels),
    [localSettings.floorPlanLabels]
  );

  const groupedZones = useMemo(() => {
    return FLOOR_PLAN_ZONE_OPTIONS.map(zoneOpt => {
      const titleKey = ZONE_TITLE_KEYS[zoneOpt.id];
      const stationsInZone = (localSettings.customStations || []).filter(
        st => resolveStationZone(st) === zoneOpt.id
      );
      return {
        zoneId: zoneOpt.id,
        titleKey,
        title: resolvedLabels[titleKey] || zoneOpt.label,
        defaultHint: zoneOpt.label,
        stations: stationsInZone,
      };
    });
  }, [localSettings.customStations, resolvedLabels]);

  const hasStationChanges = useMemo(() => {
    return (
      JSON.stringify(localSettings.customStations) !== JSON.stringify(settings.customStations) ||
      JSON.stringify(localSettings.floorPlanLabels || {}) !==
        JSON.stringify(settings.floorPlanLabels || {})
    );
  }, [localSettings, settings]);

  const toggleShift = (shiftId: ShiftType) => {
    setLocalSettings(prev => {
      const activeShifts = prev.activeShifts.includes(shiftId)
        ? prev.activeShifts.filter(s => s !== shiftId)
        : [...prev.activeShifts, shiftId];
      const updated = { ...prev, activeShifts };
      onSaveSettings(updated);
      return updated;
    });
  };

  const toggleArea = (area: BusinessArea) => {
    setLocalSettings(prev => {
      const businessAreas = prev.businessAreas.includes(area)
        ? prev.businessAreas.filter(a => a !== area)
        : [...prev.businessAreas, area];
      const updated = { ...prev, businessAreas };
      onSaveSettings(updated);
      return updated;
    });
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        onImportFullData(data);
        toast('Backup importado com sucesso!', 'success');
      } catch {
        toast('Ficheiro JSON inválido.', 'error');
      }
    };
    reader.readAsText(file);
  };

  const handleSaveStations = () => {
    onSaveSettings(localSettings);
    toast('Áreas e postos de trabalho guardados!', 'success');
  };

  const handleOpenStationModal = (station?: StationConfig, defaultZone: FloorPlanZoneId = 'grills') => {
    if (station) {
      setEditingStation({ ...station });
    } else {
      const zoneOpt = FLOOR_PLAN_ZONE_OPTIONS.find(z => z.id === defaultZone)!;
      setEditingStation({
        id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        label: '',
        designation: '',
        icon: 'Users',
        defaultSlots: 1,
        area: zoneOpt.defaultArea,
        zoneOverride: defaultZone,
        stageOverride:
          defaultZone === 'kitchen'
            ? 'preparador'
            : defaultZone === 'counter'
            ? 'apresentador'
            : undefined,
        lineOverride: defaultZone === 'kitchen' || defaultZone === 'counter' ? 1 : undefined,
        isActive: true,
      });
    }
    setIsStationModalOpen(true);
  };

  const handleSaveStation = () => {
    if (!editingStation || !editingStation.label.trim()) return;
    const normalizedStation: StationConfig = {
      ...editingStation,
      designation: (editingStation.designation || editingStation.label).trim().toUpperCase(),
      label: editingStation.label.trim(),
    };
    setLocalSettings(prev => {
      const exists = prev.customStations.some(s => s.id === normalizedStation.id);
      const updatedStations = exists
        ? prev.customStations.map(s => (s.id === normalizedStation.id ? normalizedStation : s))
        : [...prev.customStations, normalizedStation];
      return { ...prev, customStations: updatedStations };
    });
    setIsStationModalOpen(false);
    setEditingStation(null);
  };

  const handleDeleteStation = (id: string) => {
    setLocalSettings(prev => ({
      ...prev,
      customStations: prev.customStations.filter(s => s.id !== id),
    }));
  };

  const editingZone = editingStation ? resolveStationZone(editingStation) : 'grills';

  return (
    <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 rounded-2xl shadow-xs border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
      {/* Top Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 p-1.5 gap-1">
        <button
          type="button"
          onClick={() => setActiveTab('stations')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all ${
            activeTab === 'stations'
              ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Áreas & Postos do Posicionamento
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('general')}
          className={`flex-1 py-2.5 px-4 rounded-xl font-extrabold text-xs uppercase tracking-wider transition-all ${
            activeTab === 'general'
              ? 'bg-white dark:bg-slate-900 text-slate-950 dark:text-white shadow-2xs'
              : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
          }`}
        >
          Dados Gerais & Backup da Loja
        </button>
      </div>

      <div className="p-5 sm:p-7 overflow-auto flex-1">
        {activeTab === 'general' && (
          <div className="space-y-7 max-w-4xl mx-auto pb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nome da Unidade
                </label>
                <input
                  type="text"
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-slate-900 font-bold text-slate-900 dark:text-white"
                  value={localSettings.restaurantName}
                  onChange={e => {
                    const updated = { ...localSettings, restaurantName: e.target.value };
                    setLocalSettings(updated);
                    onSaveSettings(updated);
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-1.5">
                  Tipologia de Loja
                </label>
                <select
                  className="w-full p-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none font-bold text-slate-900 dark:text-white"
                  value={localSettings.restaurantType}
                  onChange={e => {
                    const updated = {
                      ...localSettings,
                      restaurantType: e.target.value as RestaurantTypology,
                    };
                    setLocalSettings(updated);
                    onSaveSettings(updated);
                  }}
                >
                  {AVAILABLE_TYPOLOGIES.map(t => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3.5">
                  Turnos Operacionais Ativos
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {AVAILABLE_SHIFTS.map(shift => {
                    const isActive = localSettings.activeShifts.includes(shift.id);
                    return (
                      <button
                        key={shift.id}
                        type="button"
                        onClick={() => toggleShift(shift.id)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-xs font-extrabold ${
                          isActive
                            ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        {isActive ? <CheckSquare size={16} /> : <Square size={16} />}
                        {shift.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800">
                <h4 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider mb-3.5">
                  Áreas de Negócio Visíveis
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  {AVAILABLE_AREAS.map(area => {
                    const isActive = localSettings.businessAreas.includes(area);
                    return (
                      <button
                        key={area}
                        type="button"
                        onClick={() => toggleArea(area)}
                        className={`flex items-center gap-2.5 p-3 rounded-xl border transition-all text-xs font-extrabold ${
                          isActive
                            ? 'bg-[#DA291C] border-[#DA291C] text-white shadow-xs'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-500'
                        }`}
                      >
                        {isActive ? <CheckSquare size={16} /> : <Square size={16} />}
                        {area}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Backup Export / Import */}
            <div className="bg-slate-50 dark:bg-slate-800/50 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Cópia de Segurança Completa (JSON)
                </h4>
                <p className="text-xs text-slate-500">
                  Exporte ou restaure as definições, equipa, critérios e histórico desta loja.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  className="hidden"
                  onChange={handleImportFile}
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-100"
                >
                  <Upload className="w-4 h-4" /> Importar JSON
                </button>
                <button
                  type="button"
                  onClick={onExportFullData}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white"
                >
                  <Download className="w-4 h-4" /> Exportar Backup
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'stations' && (
          <div className="pb-8 space-y-6">
            <div className="flex flex-wrap justify-between items-center gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 dark:text-white">
                  Áreas e Postos do Posicionamento
                </h3>
                <p className="text-xs text-slate-500">
                  Edite o nome de cada área diretamente no cabeçalho vermelho ou ajuste siglas, linhas e etapas de qualquer posto.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFullEditorZone(null);
                    setFullEditorOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl font-extrabold text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-700 transition-colors"
                >
                  <Sliders size={15} className="text-[#DA291C]" />
                  Editor de Linhas & Etapas
                </button>

                <button
                  type="button"
                  onClick={() => handleOpenStationModal()}
                  className="bg-slate-900 text-white px-4 py-2.5 rounded-xl font-extrabold hover:bg-slate-800 transition-all flex items-center gap-1.5 text-xs"
                >
                  <Plus size={16} /> Novo Posto
                </button>

                <button
                  type="button"
                  onClick={handleSaveStations}
                  disabled={!hasStationChanges}
                  className={`px-4 py-2.5 rounded-xl font-extrabold transition-all flex items-center gap-1.5 text-xs ${
                    hasStationChanges
                      ? 'bg-[#DA291C] hover:bg-red-700 text-white shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 cursor-not-allowed'
                  }`}
                >
                  <Save size={16} /> Gravar Alterações
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {groupedZones.map(group => (
                <div
                  key={group.zoneId}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-2xs flex flex-col"
                >
                  {/* Editable Red Zone Header */}
                  <div className="px-3.5 py-2.5 bg-[#DA291C] text-white flex items-center justify-between gap-2">
                    <input
                      type="text"
                      aria-label={`Nome da área ${group.defaultHint}`}
                      value={group.title}
                      onChange={e =>
                        setLocalSettings(prev => ({
                          ...prev,
                          floorPlanLabels: {
                            ...resolveFloorPlanLabels(prev.floorPlanLabels),
                            [group.titleKey]: e.target.value,
                          },
                        }))
                      }
                      className="min-w-0 flex-1 bg-white/10 hover:bg-white/20 focus:bg-white focus:text-slate-950 rounded px-2 py-0.5 text-xs font-black uppercase tracking-wide outline-none transition-colors"
                    />
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="bg-[#FFC72C] text-slate-950 text-[10.5px] font-black px-2 py-0.5 rounded-full">
                        {group.stations.length}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleOpenStationModal(undefined, group.zoneId)}
                        title={`Adicionar posto em ${group.title}`}
                        className="p-1 rounded bg-white/15 hover:bg-white/25 text-white"
                      >
                        <Plus size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Stations inside Zone */}
                  <div className="divide-y divide-slate-100 dark:divide-slate-800 flex-1">
                    {group.stations.length === 0 ? (
                      <div className="p-4 text-center text-xs text-slate-400 font-semibold">
                        Sem postos configurados
                      </div>
                    ) : (
                      group.stations.map(station => (
                        <div
                          key={station.id}
                          className="px-3.5 py-2.5 flex justify-between items-center gap-2 hover:bg-slate-50 dark:hover:bg-slate-800/60"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-[11px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-900 text-white shrink-0">
                                {station.designation || station.label}
                              </span>
                              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                                {station.label}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-[10px] font-bold text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              {station.defaultSlots}v
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenStationModal(station)}
                              className="p-1.5 text-slate-600 hover:text-slate-950 hover:bg-slate-100 rounded-lg"
                              title="Editar posto"
                            >
                              <Edit2 size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStation(station.id)}
                              className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg"
                              title="Remover posto"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Single Station Modal */}
      {isStationModalOpen && editingStation && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md p-6 border border-slate-200 dark:border-slate-800">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Configurar Posto
              </h3>
              <button
                type="button"
                onClick={() => setIsStationModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Nome Completo do Posto
                </label>
                <input
                  type="text"
                  value={editingStation.label}
                  onChange={e =>
                    setEditingStation({ ...editingStation, label: e.target.value })
                  }
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-semibold text-slate-900 dark:text-white"
                  placeholder="Ex: Preparador 3"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Sigla no Cartão
                  </label>
                  <input
                    type="text"
                    value={editingStation.designation || ''}
                    onChange={e =>
                      setEditingStation({
                        ...editingStation,
                        designation: e.target.value.toUpperCase(),
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-black uppercase text-slate-900 dark:text-white"
                    placeholder="PREP 3"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Vagas no Posto
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="4"
                    value={editingStation.defaultSlots}
                    onChange={e =>
                      setEditingStation({
                        ...editingStation,
                        defaultSlots: Math.max(1, parseInt(e.target.value, 10) || 1),
                      })
                    }
                    className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-bold text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                  Área / Bloco no Quadro
                </label>
                <select
                  value={editingZone}
                  onChange={e => {
                    const nextZone = e.target.value as FloorPlanZoneId;
                    const opt = FLOOR_PLAN_ZONE_OPTIONS.find(z => z.id === nextZone)!;
                    setEditingStation({
                      ...editingStation,
                      area: opt.defaultArea,
                      zoneOverride: nextZone,
                      stageOverride:
                        nextZone === 'kitchen'
                          ? resolveKitchenStage(editingStation)
                          : nextZone === 'counter'
                          ? resolveCounterStage(editingStation)
                          : undefined,
                      lineOverride:
                        nextZone === 'kitchen' || nextZone === 'counter'
                          ? resolveStationLine(editingStation)
                          : undefined,
                    });
                  }}
                  className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-bold text-slate-900 dark:text-white"
                >
                  {FLOOR_PLAN_ZONE_OPTIONS.map(opt => (
                    <option key={opt.id} value={opt.id}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {(editingZone === 'kitchen' || editingZone === 'counter') && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Etapa Vertical
                    </label>
                    <select
                      value={
                        editingZone === 'kitchen'
                          ? resolveKitchenStage(editingStation)
                          : resolveCounterStage(editingStation)
                      }
                      onChange={e =>
                        setEditingStation({
                          ...editingStation,
                          stageOverride: e.target.value as FloorPlanStageId,
                        })
                      }
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-bold text-slate-900 dark:text-white"
                    >
                      {(editingZone === 'kitchen'
                        ? KITCHEN_STAGE_OPTIONS
                        : COUNTER_STAGE_OPTIONS
                      ).map(stOpt => (
                        <option key={stOpt.id} value={stOpt.id}>
                          {resolvedLabels[stOpt.labelKey] || stOpt.defaultLabel}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Linha
                    </label>
                    <select
                      value={resolveStationLine(editingStation)}
                      onChange={e =>
                        setEditingStation({
                          ...editingStation,
                          lineOverride: Number(e.target.value) as 1 | 2,
                        })
                      }
                      className="w-full p-2.5 border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 rounded-xl outline-none text-sm font-bold text-slate-900 dark:text-white"
                    >
                      <option value={1}>{resolvedLabels.line1Label}</option>
                      <option value={2}>{resolvedLabels.line2Label}</option>
                    </select>
                  </div>
                </div>
              )}

              <div className="pt-4 flex gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsStationModalOpen(false)}
                  className="flex-1 py-2.5 text-slate-600 font-bold hover:bg-slate-100 rounded-xl transition-all text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveStation}
                  className="flex-1 py-2.5 bg-slate-900 text-white font-extrabold rounded-xl hover:bg-slate-800 transition-all flex items-center justify-center gap-1.5 text-xs"
                >
                  <Check size={16} /> Aplicar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <AreaAndStationEditorModal
        isOpen={fullEditorOpen}
        onClose={() => setFullEditorOpen(false)}
        settings={localSettings}
        onSaveSettings={updated => {
          setLocalSettings(updated);
          onSaveSettings(updated);
          toast('Áreas, linhas e postos atualizados!', 'success');
        }}
        initialZone={fullEditorZone}
      />
    </div>
  );
};
