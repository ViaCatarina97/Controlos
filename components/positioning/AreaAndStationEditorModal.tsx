import React, { useEffect, useMemo, useState } from 'react';
import {
  AppSettings,
  FloorPlanLabels,
  FloorPlanStageId,
  FloorPlanZoneId,
  StationConfig,
} from '../../types';
import {
  COUNTER_STAGE_OPTIONS,
  DEFAULT_FLOOR_PLAN_LABELS,
  FLOOR_PLAN_ZONE_OPTIONS,
  KITCHEN_STAGE_OPTIONS,
  resolveCounterStage,
  resolveFloorPlanLabels,
  resolveKitchenStage,
  resolveStationLine,
  resolveStationZone,
} from '../../utils/floorPlanLayout';
import {
  Check,
  Eye,
  EyeOff,
  Layers,
  Plus,
  RotateCcw,
  Save,
  Search,
  Sliders,
  Trash2,
  X,
} from 'lucide-react';

interface AreaAndStationEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onSaveSettings: (updated: AppSettings) => Promise<void> | void;
  initialZone?: FloorPlanZoneId | null;
  initialStationId?: string | null;
  initialTab?: 'areas' | 'stations';
}

const ZONE_LABEL_FIELDS: {
  zoneId: FloorPlanZoneId;
  groupName: string;
  titleKey: keyof FloorPlanLabels;
  subtitleKey?: keyof FloorPlanLabels;
}[] = [
  { zoneId: 'grills', groupName: 'Grelhadores (Topo Esquerda)', titleKey: 'grillsTitle', subtitleKey: 'grillsSubtitle' },
  { zoneId: 'kitchen', groupName: 'Cozinha (Topo Centro)', titleKey: 'kitchenTitle', subtitleKey: 'kitchenSubtitle' },
  { zoneId: 'fryers', groupName: 'Fritadeiras (Topo Direita)', titleKey: 'fryersTitle', subtitleKey: 'fryersSubtitle' },
  { zoneId: 'beverage', groupName: 'Bebidas (Meio Esquerda)', titleKey: 'beverageTitle', subtitleKey: 'beverageSubtitle' },
  { zoneId: 'cashier', groupName: 'Caixa (Fundo Esquerda)', titleKey: 'cashierTitle', subtitleKey: 'cashierSubtitle' },
  { zoneId: 'counter', groupName: 'Balcão (Meio Centro)', titleKey: 'counterTitle', subtitleKey: 'counterSubtitle' },
  { zoneId: 'fries', groupName: 'Batateira (Meio Direita)', titleKey: 'friesTitle', subtitleKey: 'friesSubtitle' },
  { zoneId: 'delivery', groupName: 'Delivery (Direita)', titleKey: 'deliveryTitle', subtitleKey: 'deliverySubtitle' },
  { zoneId: 'lobby', groupName: 'Sala / RP (Base)', titleKey: 'lobbyTitle', subtitleKey: 'lobbySubtitle' },
  { zoneId: 'drive', groupName: 'Drive-Thru (Opcional)', titleKey: 'driveTitle' },
  { zoneId: 'mccafe', groupName: 'McCafé (Opcional)', titleKey: 'mccafeTitle' },
];

export const AreaAndStationEditorModal: React.FC<AreaAndStationEditorModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  initialZone = null,
  initialStationId = null,
  initialTab = 'areas',
}) => {
  const [activeTab, setActiveTab] = useState<'areas' | 'stations'>(initialTab);
  const [labelsDraft, setLabelsDraft] = useState<Required<FloorPlanLabels>>(() =>
    resolveFloorPlanLabels(settings.floorPlanLabels)
  );
  const [stationsDraft, setStationsDraft] = useState<StationConfig[]>(() => settings.customStations || []);
  const [zoneFilter, setZoneFilter] = useState<FloorPlanZoneId | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setLabelsDraft(resolveFloorPlanLabels(settings.floorPlanLabels));
    setStationsDraft(settings.customStations || []);
    setActiveTab(initialStationId ? 'stations' : initialTab);
    setZoneFilter(initialZone || 'ALL');
    setSearchQuery('');
  }, [isOpen, settings, initialZone, initialStationId, initialTab]);

  const filteredStations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return stationsDraft.filter(s => {
      const z = resolveStationZone(s);
      if (zoneFilter !== 'ALL' && z !== zoneFilter) return false;
      if (!q) return true;
      return (
        s.label.toLowerCase().includes(q) ||
        (s.designation || '').toLowerCase().includes(q)
      );
    });
  }, [stationsDraft, zoneFilter, searchQuery]);

  if (!isOpen) return null;

  const updateStation = (id: string, patch: Partial<StationConfig>) => {
    setStationsDraft(prev => prev.map(s => (s.id === id ? { ...s, ...patch } : s)));
  };

  const handleZoneChange = (station: StationConfig, nextZone: FloorPlanZoneId) => {
    const opt = FLOOR_PLAN_ZONE_OPTIONS.find(z => z.id === nextZone);
    const nextPatch: Partial<StationConfig> = {
      zoneOverride: nextZone,
      area: opt ? opt.defaultArea : station.area,
    };
    if (nextZone === 'kitchen') {
      nextPatch.stageOverride = resolveKitchenStage(station);
      nextPatch.lineOverride = resolveStationLine(station);
    } else if (nextZone === 'counter') {
      nextPatch.stageOverride = resolveCounterStage(station);
      nextPatch.lineOverride = resolveStationLine(station);
    } else {
      nextPatch.stageOverride = undefined;
      nextPatch.lineOverride = undefined;
    }
    updateStation(station.id, nextPatch);
  };

  const handleAddStation = () => {
    const targetZone: FloorPlanZoneId = zoneFilter === 'ALL' ? 'grills' : zoneFilter;
    const zoneMeta = FLOOR_PLAN_ZONE_OPTIONS.find(z => z.id === targetZone)!;
    const existingInZone = stationsDraft.filter(s => resolveStationZone(s) === targetZone).length;
    const idx = existingInZone + 1;
    const codePrefixMap: Record<FloorPlanZoneId, string> = {
      grills: 'BC',
      kitchen: 'PREP',
      fryers: 'FRIT',
      beverage: 'BEB',
      cashier: 'CX',
      counter: 'APR',
      fries: 'BAT',
      delivery: 'DLV',
      lobby: 'RP',
      drive: 'DRV',
      mccafe: 'MC',
    };
    const prefix = codePrefixMap[targetZone];
    const newStation: StationConfig = {
      id: `st_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      designation: `${prefix} ${idx}`,
      label: `${zoneMeta.label.split(' ')[0]} ${idx}`,
      icon: 'Users',
      defaultSlots: 1,
      area: zoneMeta.defaultArea,
      zoneOverride: targetZone,
      stageOverride:
        targetZone === 'kitchen'
          ? 'preparador'
          : targetZone === 'counter'
          ? 'apresentador'
          : undefined,
      lineOverride: targetZone === 'kitchen' || targetZone === 'counter' ? ((idx % 2 === 0 ? 2 : 1) as 1 | 2) : undefined,
      isActive: true,
    };
    setStationsDraft(prev => [newStation, ...prev]);
    setActiveTab('stations');
  };

  const handleDeleteStation = (id: string) => {
    setStationsDraft(prev => prev.filter(s => s.id !== id));
  };

  const handleResetLabels = () => {
    setLabelsDraft({ ...DEFAULT_FLOOR_PLAN_LABELS });
  };

  const handleSaveAll = async () => {
    setIsSaving(true);
    try {
      await onSaveSettings({
        ...settings,
        floorPlanLabels: labelsDraft,
        customStations: stationsDraft,
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/60 backdrop-blur-xs no-print">
      <div className="w-full max-w-5xl max-h-[90vh] flex flex-col rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
        {/* Top Modal Header */}
        <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#DA291C] flex items-center justify-center shrink-0">
              <Sliders className="w-4 h-4 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold tracking-tight truncate">
                Configurar Nomes das Áreas, Linhas e Postos — {settings.restaurantName}
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                Personalize qualquer título de área, etapa vertical, sigla de cartão ou zona de cada posto
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="px-5 pt-3 pb-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-xl bg-slate-200/80 dark:bg-slate-800 p-1 gap-1">
            <button
              type="button"
              onClick={() => setActiveTab('areas')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                activeTab === 'areas'
                  ? 'bg-white dark:bg-slate-950 text-slate-950 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-[#DA291C]" />
              Nomes das Áreas & Etapas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('stations')}
              className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold transition-all ${
                activeTab === 'stations'
                  ? 'bg-white dark:bg-slate-950 text-slate-950 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900'
              }`}
            >
              <Check className="w-3.5 h-3.5 text-[#DA291C]" />
              Postos de Trabalho ({stationsDraft.filter(s => s.isActive).length} ativos)
            </button>
          </div>

          {activeTab === 'areas' ? (
            <button
              type="button"
              onClick={handleResetLabels}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Repor Nomes Padrão
            </button>
          ) : (
            <button
              type="button"
              onClick={handleAddStation}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-extrabold bg-[#DA291C] hover:bg-red-700 text-white shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" /> Novo Posto
            </button>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {activeTab === 'areas' ? (
            <>
              {/* Main Area Titles & Optional Subtitles */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                  Títulos e Subtítulos de Cada Bloco do Quadro
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {ZONE_LABEL_FIELDS.map(field => {
                    const isHighlighted = initialZone === field.zoneId;
                    return (
                      <div
                        key={field.zoneId}
                        className={`rounded-xl p-3 border transition-all ${
                          isHighlighted
                            ? 'border-[#DA291C] ring-2 ring-[#DA291C]/20 bg-red-50/30 dark:bg-red-950/10'
                            : 'border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">
                            {field.groupName}
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              setZoneFilter(field.zoneId);
                              setActiveTab('stations');
                            }}
                            className="text-[10px] font-bold text-[#DA291C] hover:underline"
                          >
                            Ver postos →
                          </button>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                              Título Principal
                            </label>
                            <input
                              type="text"
                              value={labelsDraft[field.titleKey] || ''}
                              onChange={e =>
                                setLabelsDraft(prev => ({
                                  ...prev,
                                  [field.titleKey]: e.target.value,
                                }))
                              }
                              className="w-full px-2.5 py-1.5 rounded-lg text-xs font-extrabold uppercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-slate-900"
                            />
                          </div>

                          {field.subtitleKey && (
                            <div>
                              <label className="block text-[10px] font-bold text-slate-600 dark:text-slate-400 mb-0.5">
                                Subtítulo (opcional, ex.: Produção / Serviço)
                              </label>
                              <input
                                type="text"
                                placeholder="Sem subtítulo"
                                value={labelsDraft[field.subtitleKey] || ''}
                                onChange={e =>
                                  setLabelsDraft(prev => ({
                                    ...prev,
                                    [field.subtitleKey!]: e.target.value,
                                  }))
                                }
                                className="w-full px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-slate-900"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Lines & Vertical Stage Rails */}
              <div>
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3">
                  Colunas de Linha & Etapas Verticais (Cozinha e Balcão)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {(
                    [
                      { key: 'line1Label', label: 'Coluna Esquerda' },
                      { key: 'line2Label', label: 'Coluna Direita' },
                      { key: 'stageIniciador', label: 'Cozinha · Etapa 1' },
                      { key: 'stagePreparador', label: 'Cozinha · Etapa 2' },
                      { key: 'stageFinalizador', label: 'Cozinha · Etapa 3' },
                      { key: 'stageExpedidor', label: 'Balcão · Etapa 1' },
                      { key: 'stageRunner', label: 'Balcão · Etapa 2' },
                      { key: 'stageApresentador', label: 'Balcão · Etapa 3' },
                    ] as { key: keyof FloorPlanLabels; label: string }[]
                  ).map(item => (
                    <div
                      key={item.key}
                      className="rounded-xl p-2.5 border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-800/40"
                    >
                      <label className="block text-[10px] font-bold text-slate-500 mb-1">
                        {item.label}
                      </label>
                      <input
                        type="text"
                        value={labelsDraft[item.key] || ''}
                        onChange={e =>
                          setLabelsDraft(prev => ({
                            ...prev,
                            [item.key]: e.target.value,
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg text-xs font-extrabold uppercase bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="space-y-3">
              {/* Filter Bar */}
              <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setZoneFilter('ALL')}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-extrabold transition-colors ${
                      zoneFilter === 'ALL'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                  >
                    Todas ({stationsDraft.length})
                  </button>
                  {FLOOR_PLAN_ZONE_OPTIONS.map(z => {
                    const count = stationsDraft.filter(s => resolveStationZone(s) === z.id).length;
                    return (
                      <button
                        key={z.id}
                        type="button"
                        onClick={() => setZoneFilter(z.id)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                          zoneFilter === z.id
                            ? 'bg-[#DA291C] text-white'
                            : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                        }`}
                      >
                        {z.label.split(' · ')[0].split(' (')[0]} ({count})
                      </button>
                    );
                  })}
                </div>

                <div className="relative min-w-[210px]">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filtrar posto..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white"
                  />
                </div>
              </div>

              {/* Editable Stations Table */}
              <div className="space-y-2">
                {filteredStations.length === 0 ? (
                  <div className="p-8 text-center rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                    <p className="text-xs font-bold text-slate-500 mb-2">
                      Nenhum posto nesta área ainda.
                    </p>
                    <button
                      type="button"
                      onClick={handleAddStation}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-extrabold bg-[#DA291C] text-white"
                    >
                      <Plus className="w-3.5 h-3.5" /> Criar Primeiro Posto Aqui
                    </button>
                  </div>
                ) : (
                  filteredStations.map(st => {
                    const zone = resolveStationZone(st);
                    const isHighlighted = initialStationId === st.id;
                    const currentStage =
                      zone === 'kitchen'
                        ? resolveKitchenStage(st)
                        : zone === 'counter'
                        ? resolveCounterStage(st)
                        : '';
                    const currentLine = resolveStationLine(st);

                    return (
                      <div
                        key={st.id}
                        className={`grid grid-cols-1 md:grid-cols-12 gap-2 items-center p-2.5 rounded-xl border transition-all ${
                          !st.isActive
                            ? 'opacity-55 bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            : isHighlighted
                            ? 'border-[#DA291C] ring-2 ring-[#DA291C]/20 bg-red-50/30'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                        }`}
                      >
                        {/* Sigla no Cartão */}
                        <div className="md:col-span-2">
                          <label className="block text-[9.5px] font-bold uppercase text-slate-400 mb-0.5">
                            Sigla no Quadro
                          </label>
                          <input
                            type="text"
                            value={st.designation || ''}
                            placeholder="Ex: BC 1"
                            onChange={e => updateStation(st.id, { designation: e.target.value })}
                            className="w-full px-2 py-1 rounded-md text-xs font-black uppercase bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-950 dark:text-white"
                          />
                        </div>

                        {/* Nome Completo */}
                        <div className="md:col-span-3">
                          <label className="block text-[9.5px] font-bold uppercase text-slate-400 mb-0.5">
                            Nome do Posto
                          </label>
                          <input
                            type="text"
                            value={st.label}
                            placeholder="Ex: Batch Cooker 1"
                            onChange={e => updateStation(st.id, { label: e.target.value })}
                            className="w-full px-2 py-1 rounded-md text-xs font-semibold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                          />
                        </div>

                        {/* Zona no Quadro */}
                        <div className="md:col-span-2">
                          <label className="block text-[9.5px] font-bold uppercase text-slate-400 mb-0.5">
                            Área / Bloco
                          </label>
                          <select
                            value={zone}
                            onChange={e => handleZoneChange(st, e.target.value as FloorPlanZoneId)}
                            className="w-full px-2 py-1 rounded-md text-xs font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                          >
                            {FLOOR_PLAN_ZONE_OPTIONS.map(opt => (
                              <option key={opt.id} value={opt.id}>
                                {opt.label.split(' · ')[0].split(' (')[0]}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Etapa + Linha (apenas Cozinha / Balcão) */}
                        <div className="md:col-span-3">
                          {zone === 'kitchen' || zone === 'counter' ? (
                            <div className="grid grid-cols-3 gap-1.5">
                              <div className="col-span-2">
                                <label className="block text-[9.5px] font-bold uppercase text-slate-400 mb-0.5">
                                  Etapa
                                </label>
                                <select
                                  value={currentStage}
                                  onChange={e =>
                                    updateStation(st.id, {
                                      stageOverride: e.target.value as FloorPlanStageId,
                                    })
                                  }
                                  className="w-full px-2 py-1 rounded-md text-[11px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                >
                                  {(zone === 'kitchen'
                                    ? KITCHEN_STAGE_OPTIONS
                                    : COUNTER_STAGE_OPTIONS
                                  ).map(sOpt => (
                                    <option key={sOpt.id} value={sOpt.id}>
                                      {labelsDraft[sOpt.labelKey] || sOpt.defaultLabel}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="col-span-1">
                                <label className="block text-[9.5px] font-bold uppercase text-slate-400 mb-0.5">
                                  Linha
                                </label>
                                <select
                                  value={currentLine}
                                  onChange={e =>
                                    updateStation(st.id, {
                                      lineOverride: Number(e.target.value) as 1 | 2,
                                    })
                                  }
                                  className="w-full px-1.5 py-1 rounded-md text-[11px] font-bold bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white"
                                >
                                  <option value={1}>L1</option>
                                  <option value={2}>L2</option>
                                </select>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10.5px] text-slate-400 font-medium pt-3">
                              Lista direta
                            </div>
                          )}
                        </div>

                        {/* Vagas + Visibilidade + Apagar */}
                        <div className="md:col-span-2 flex items-center justify-end gap-1.5 pt-2 md:pt-3">
                          <div className="inline-flex items-center rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-1.5 py-0.5 text-[11px] font-bold">
                            <button
                              type="button"
                              onClick={() =>
                                updateStation(st.id, {
                                  defaultSlots: Math.max(1, (st.defaultSlots || 1) - 1),
                                })
                              }
                              className="px-1 text-slate-500 hover:text-slate-900"
                            >
                              -
                            </button>
                            <span className="px-1.5 tabular-nums">{st.defaultSlots || 1}</span>
                            <button
                              type="button"
                              onClick={() =>
                                updateStation(st.id, {
                                  defaultSlots: Math.min(4, (st.defaultSlots || 1) + 1),
                                })
                              }
                              className="px-1 text-slate-500 hover:text-slate-900"
                            >
                              +
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => updateStation(st.id, { isActive: !st.isActive })}
                            title={st.isActive ? 'Ocultar posto' : 'Ativar posto'}
                            className={`p-1.5 rounded-md border transition-colors ${
                              st.isActive
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-slate-100 text-slate-400'
                            }`}
                          >
                            {st.isActive ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteStation(st.id)}
                            title="Remover posto"
                            className="p-1.5 rounded-md border border-red-100 bg-red-50/70 text-red-600 hover:bg-red-100 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/90 flex items-center justify-between gap-3">
          <span className="text-[11px] text-slate-500">
            As alterações ficam gravadas na loja <strong>{settings.restaurantName}</strong> e refletem-se de imediato no ecrã e na impressão A4.
          </span>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isSaving}
              onClick={handleSaveAll}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-extrabold bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'A guardar...' : 'Guardar Áreas & Postos'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
