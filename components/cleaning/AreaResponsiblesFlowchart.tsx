import React, { useState, useMemo } from 'react';
import { 
  Users, Layers, ShieldCheck, CheckCircle2, AlertTriangle, Edit3, 
  Printer, Search, ArrowDown, Sparkles, ChevronRight, Info, 
  X, Check, Crown, LayoutGrid, GitFork, UserCheck, AlertCircle, RefreshCw
} from 'lucide-react';
import { 
  AreaResponsibleConfig, CleaningPlanWeek, CleaningTaskItem, Employee, CleaningTemplateConfig 
} from '../../types';
import { DEFAULT_AREA_CONFIGS, DEFAULT_CLEANING_AREAS } from './cleaningDefaults';

interface ManagerGroupData {
  areas: string[];
  totalTasks: number;
  completedTasks: number;
  rate: number;
}

interface AreaResponsiblesFlowchartProps {
  currentWeek: CleaningPlanWeek;
  template: CleaningTemplateConfig | null;
  weeklyTasks: CleaningTaskItem[];
  areas: string[];
  employees: Employee[];
  readOnly?: boolean;
  restaurantId: string;
  onSaveResponsibles: (updatedResponsibles: { [area: string]: AreaResponsibleConfig }) => Promise<void>;
}

export const AreaResponsiblesFlowchart: React.FC<AreaResponsiblesFlowchartProps> = ({
  currentWeek,
  template,
  weeklyTasks,
  areas,
  employees,
  readOnly = false,
  restaurantId,
  onSaveResponsibles
}) => {
  const [viewMode, setViewMode] = useState<'flowchart' | 'grid' | 'by_manager'>('flowchart');
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingArea, setEditingArea] = useState<string | null>(null);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedManagerFilter, setSelectedManagerFilter] = useState<string>('all');
  const [isSaving, setIsSaving] = useState(false);

  // Eligible managers (Gerente de Restaurante, Gerente, etc.)
  const eligibleManagers = useMemo(() => {
    const managers = employees.filter(
      e => e.isActive && (e.role === 'GERENTE_RESTAURANTE' || e.role === 'GERENTE')
    );
    return managers.length > 0 ? managers : employees.filter(e => e.isActive);
  }, [employees]);

  // Merge stored responsibles from currentWeek -> template -> defaults
  const effectiveResponsibles = useMemo(() => {
    const map: { [area: string]: AreaResponsibleConfig } = {};

    // 1. Start with template or default areas
    const allKnownAreas = areas && areas.length > 0 ? areas : DEFAULT_CLEANING_AREAS;

    allKnownAreas.forEach(area => {
      const fromWeek = currentWeek?.areaResponsibles?.[area];
      const fromTemplate = template?.areaResponsibles?.[area];
      const defaultConfig = DEFAULT_AREA_CONFIGS[area];

      if (fromWeek && fromWeek.managerName) {
        map[area] = { ...fromWeek };
      } else if (fromTemplate && fromTemplate.managerName) {
        map[area] = { ...fromTemplate };
      } else {
        // Fallback default structure
        map[area] = {
          area,
          managerName: '',
          notes: '',
          subAreas: defaultConfig?.defaultSubAreas || [],
          priority: (area === 'Cozinha' || area === "WC's" || area === 'Bebidas') ? 'alta' : 'media',
          color: defaultConfig?.color || 'teal'
        };
      }
    });

    return map;
  }, [currentWeek, template, areas]);

  // Area performance calculations for current week
  const areaStats = useMemo(() => {
    const stats: { [area: string]: { total: number; completed: number; rate: number; justified: number; pending: number } } = {};
    
    areas.forEach(area => {
      const tasks = weeklyTasks.filter(t => t.area === area);
      const completed = tasks.filter(t => currentWeek?.taskStatuses?.[t.id]?.completed).length;
      const justified = tasks.filter(t => !currentWeek?.taskStatuses?.[t.id]?.completed && currentWeek?.taskStatuses?.[t.id]?.justification).length;
      const pending = tasks.length - completed - justified;
      const rate = tasks.length > 0 ? Math.round((completed / tasks.length) * 100) : 0;

      stats[area] = {
        total: tasks.length,
        completed,
        rate,
        justified,
        pending
      };
    });

    return stats;
  }, [areas, weeklyTasks, currentWeek]);

  // Group areas by manager
  const managerGroups = useMemo(() => {
    const groups: { [manager: string]: ManagerGroupData } = {};
    const unassigned: string[] = [];

    areas.forEach(area => {
      const resp = effectiveResponsibles[area];
      const st = areaStats[area] || { total: 0, completed: 0, rate: 0, justified: 0, pending: 0 };

      if (resp && resp.managerName && resp.managerName.trim() !== '') {
        const mgr = resp.managerName;
        if (!groups[mgr]) {
          groups[mgr] = { areas: [], totalTasks: 0, completedTasks: 0, rate: 0 };
        }
        groups[mgr].areas.push(area);
        groups[mgr].totalTasks += st.total;
        groups[mgr].completedTasks += st.completed;
      } else {
        unassigned.push(area);
      }
    });

    // Calculate rates
    Object.keys(groups).forEach(mgr => {
      const g = groups[mgr];
      g.rate = g.totalTasks > 0 ? Math.round((g.completedTasks / g.totalTasks) * 100) : 0;
    });

    return { groups, unassigned };
  }, [areas, effectiveResponsibles, areaStats]);

  // Filtered areas for grid or search
  const filteredAreas = useMemo(() => {
    return areas.filter(area => {
      const matchesSearch = area.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (effectiveResponsibles[area]?.managerName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (effectiveResponsibles[area]?.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesManager = selectedManagerFilter === 'all' 
        ? true 
        : selectedManagerFilter === 'unassigned'
        ? !effectiveResponsibles[area]?.managerName
        : effectiveResponsibles[area]?.managerName === selectedManagerFilter;

      return matchesSearch && matchesManager;
    });
  }, [areas, searchQuery, selectedManagerFilter, effectiveResponsibles]);

  // Form state for single edit
  const [singleForm, setSingleForm] = useState<{
    area: string;
    managerName: string;
    notes: string;
    priority: 'alta' | 'media' | 'baixa';
    subAreasInput: string;
  }>({
    area: '',
    managerName: '',
    notes: '',
    priority: 'media',
    subAreasInput: ''
  });

  const handleOpenEdit = (area: string) => {
    const existing = effectiveResponsibles[area];
    setSingleForm({
      area,
      managerName: existing?.managerName || '',
      notes: existing?.notes || '',
      priority: existing?.priority || 'media',
      subAreasInput: (existing?.subAreas || DEFAULT_AREA_CONFIGS[area]?.defaultSubAreas || []).join(', ')
    });
    setEditingArea(area);
    setIsEditModalOpen(true);
  };

  const handleSaveSingle = async () => {
    if (!editingArea) return;
    setIsSaving(true);
    try {
      const updated = { ...effectiveResponsibles };
      const managerObj = employees.find(e => e.name === singleForm.managerName);
      
      updated[editingArea] = {
        area: editingArea,
        managerName: singleForm.managerName,
        managerRole: managerObj ? (managerObj.role === 'GERENTE_RESTAURANTE' ? 'Gerente de Restaurante' : managerObj.role === 'GERENTE' ? 'Gerente' : managerObj.role) : undefined,
        notes: singleForm.notes,
        priority: singleForm.priority,
        subAreas: singleForm.subAreasInput.split(',').map(s => s.trim()).filter(Boolean),
        color: DEFAULT_AREA_CONFIGS[editingArea]?.color || 'teal',
        updatedAt: new Date().toISOString()
      };

      await onSaveResponsibles(updated);
      setIsEditModalOpen(false);
      setEditingArea(null);
    } catch (error) {
      console.error("Error saving area responsible:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Bulk assignment state (Assign Multiple Areas to a Single Manager)
  const [bulkManager, setBulkManager] = useState<string>('');
  const [bulkSelectedAreas, setBulkSelectedAreas] = useState<string[]>([]);

  const handleOpenBulk = () => {
    const firstMgr = eligibleManagers[0]?.name || '';
    setBulkManager(firstMgr);
    // select areas currently assigned to this manager or unassigned
    const curr = areas.filter(a => effectiveResponsibles[a]?.managerName === firstMgr);
    setBulkSelectedAreas(curr);
    setIsBulkModalOpen(true);
  };

  const handleSaveBulk = async () => {
    if (!bulkManager) return;
    setIsSaving(true);
    try {
      const updated = { ...effectiveResponsibles };
      const managerObj = employees.find(e => e.name === bulkManager);
      const role = managerObj ? (managerObj.role === 'GERENTE_RESTAURANTE' ? 'Gerente de Restaurante' : managerObj.role === 'GERENTE' ? 'Gerente' : managerObj.role) : undefined;

      areas.forEach(area => {
        if (bulkSelectedAreas.includes(area)) {
          updated[area] = {
            ...updated[area],
            area,
            managerName: bulkManager,
            managerRole: role,
            updatedAt: new Date().toISOString()
          };
        } else if (updated[area]?.managerName === bulkManager) {
          // unassign if previously belonged to this manager and was unchecked
          updated[area] = {
            ...updated[area],
            area,
            managerName: '',
            managerRole: undefined,
            updatedAt: new Date().toISOString()
          };
        }
      });

      await onSaveResponsibles(updated);
      setIsBulkModalOpen(false);
    } catch (error) {
      console.error("Error saving bulk assignments:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const assignedCount = areas.filter(a => Boolean(effectiveResponsibles[a]?.managerName)).length;
  const totalAreasCount = areas.length;
  const managersWithAreasCount = Object.keys(managerGroups.groups).length;

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="bg-white p-6 rounded-2xl shadow-xs border border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 bg-teal-50 text-teal-700 rounded-xl">
                <GitFork size={20} />
              </span>
              <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                Fluxograma de Responsáveis por Área
              </h2>
            </div>
            <p className="text-xs text-gray-500 max-w-2xl">
              Estrutura organizacional e mapeamento de supervisão das áreas de limpeza. Cada gerente é responsável por uma ou mais áreas operacionais e pela garantia da execução com evidência fotográfica.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200 text-xs font-bold">
              <button
                onClick={() => setViewMode('flowchart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'flowchart' ? 'bg-white text-teal-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <GitFork size={14} />
                <span>Fluxograma</span>
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'grid' ? 'bg-white text-teal-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid size={14} />
                <span>Grelha de Áreas</span>
              </button>
              <button
                onClick={() => setViewMode('by_manager')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'by_manager' ? 'bg-white text-teal-700 shadow-2xs' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users size={14} />
                <span>Por Gerente</span>
              </button>
            </div>

            {/* Action Buttons */}
            {!readOnly && (
              <>
                <button
                  onClick={handleOpenBulk}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                >
                  <Edit3 size={14} />
                  <span>Atribuir Áreas em Lote</span>
                </button>
              </>
            )}

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-xl text-xs font-bold transition-colors"
              title="Imprimir Organograma / Fluxograma"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
          </div>
        </div>

        {/* Quick KPI ribbon */}
        <div className="mt-5 pt-4 border-t border-gray-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Áreas Mapeadas</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-gray-900">{totalAreasCount}</span>
              <span className="text-[11px] text-gray-400">setores</span>
            </div>
          </div>

          <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Cobertura de Gerência</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-teal-700">{assignedCount}/{totalAreasCount}</span>
              <span className="text-[11px] font-bold text-teal-600">
                ({totalAreasCount > 0 ? Math.round((assignedCount / totalAreasCount) * 100) : 0}%)
              </span>
            </div>
          </div>

          <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Gerentes Responsáveis</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className="text-xl font-black text-indigo-600">{managersWithAreasCount}</span>
              <span className="text-[11px] text-gray-500">designados</span>
            </div>
          </div>

          <div className="bg-gray-50/80 p-3 rounded-xl border border-gray-100">
            <span className="text-[11px] font-bold text-gray-500 uppercase tracking-wider block">Áreas Sem Atribuição</span>
            <div className="mt-1 flex items-baseline gap-2">
              <span className={`text-xl font-black ${managerGroups.unassigned.length > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {managerGroups.unassigned.length}
              </span>
              <span className="text-[11px] text-gray-500">
                {managerGroups.unassigned.length > 0 ? 'pendentes' : 'todas cobertas'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* VIEW 1: FLOWCHART VISUAL TREE */}
      {viewMode === 'flowchart' && (
        <div className="bg-white rounded-2xl shadow-xs border border-gray-200 p-6 overflow-x-auto">
          <div className="min-w-[860px] flex flex-col items-center">
            
            {/* LEVEL 1: ROOT NODE - RESTAURANTE / DIREÇÃO OPERACIONAL */}
            <div className="relative flex flex-col items-center group">
              <div className="bg-gradient-to-r from-teal-800 via-teal-700 to-teal-900 text-white px-8 py-4 rounded-2xl shadow-md border border-teal-600 flex items-center gap-4 text-center max-w-md">
                <div className="w-12 h-12 rounded-xl bg-white/10 flex items-center justify-center text-white border border-white/20">
                  <ShieldCheck size={26} />
                </div>
                <div className="text-left">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-widest bg-teal-500/30 text-teal-200 px-2 py-0.5 rounded-full">
                      Direção Operacional
                    </span>
                    <span className="text-[10px] text-teal-200">Semana {currentWeek.weekNumber}</span>
                  </div>
                  <h3 className="text-base font-black text-white mt-0.5 tracking-tight">
                    Plano de Limpeza e Higiene
                  </h3>
                  <p className="text-[11px] text-teal-100 mt-0.5">
                    {totalAreasCount} áreas ativas • {managersWithAreasCount} gerentes com supervisão
                  </p>
                </div>
              </div>

              {/* Vertical connector down */}
              <div className="w-0.5 h-8 bg-teal-600/40 my-0"></div>
              <div className="w-3 h-3 rounded-full bg-teal-700 ring-4 ring-teal-100"></div>
            </div>

            {/* Horizontal Branch Connector for Managers */}
            {Object.keys(managerGroups.groups).length > 0 && (
              <div className="w-full max-w-5xl flex flex-col items-center mt-2">
                <div className="w-0.5 h-6 bg-gray-300"></div>
                <div className="w-4/5 h-0.5 bg-gray-300"></div>
              </div>
            )}

            {/* LEVEL 2 & 3: MANAGERS AND THEIR AREAS */}
            <div className="w-full max-w-6xl mt-4 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
              {(Object.entries(managerGroups.groups) as [string, ManagerGroupData][]).map(([managerName, group]) => {
                const managerObj = employees.find(e => e.name === managerName);
                const role = managerObj 
                  ? (managerObj.role === 'GERENTE_RESTAURANTE' ? 'Gerente Restaurante' : managerObj.role === 'GERENTE' ? 'Gerente' : managerObj.role)
                  : 'Gerente';

                return (
                  <div key={managerName} className="flex flex-col items-center">
                    {/* Top branch hook */}
                    <div className="w-0.5 h-4 bg-gray-300"></div>

                    {/* MANAGER CARD NODE */}
                    <div className="w-full bg-linear-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-4 shadow-sm border border-gray-700 relative group hover:border-teal-400 transition-all">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-teal-600/30 text-teal-300 border border-teal-500/40 flex items-center justify-center font-black text-sm">
                            {managerName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <Crown size={12} className="text-amber-400" />
                              <h4 className="font-bold text-xs text-white tracking-tight">{managerName}</h4>
                            </div>
                            <span className="text-[10px] text-gray-400 block">{role}</span>
                          </div>
                        </div>

                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-900/60 text-teal-300 border border-teal-700">
                          {group.areas.length} {group.areas.length === 1 ? 'área' : 'áreas'}
                        </span>
                      </div>

                      {/* Performance Bar for Manager's Areas */}
                      <div className="mt-3 pt-3 border-t border-gray-800/80 flex items-center justify-between text-[11px]">
                        <span className="text-gray-400">Cumprimento Semanal:</span>
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-700 h-1.5 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                group.rate >= 80 ? 'bg-emerald-400' : group.rate >= 60 ? 'bg-amber-400' : 'bg-red-400'
                              }`}
                              style={{ width: `${group.rate}%` }}
                            />
                          </div>
                          <span className="font-bold text-white">{group.rate}%</span>
                          <span className="text-gray-400 text-[10px]">({group.completedTasks}/{group.totalTasks})</span>
                        </div>
                      </div>
                    </div>

                    {/* Connector from Manager to Areas */}
                    <div className="w-0.5 h-4 bg-teal-600/40"></div>
                    <ArrowDown size={14} className="text-teal-600 -mt-1 mb-2" />

                    {/* AREAS UNDER THIS MANAGER */}
                    <div className="w-full space-y-2.5">
                      {group.areas.map(area => {
                        const config = effectiveResponsibles[area];
                        const meta = DEFAULT_AREA_CONFIGS[area];
                        const st = areaStats[area] || { total: 0, completed: 0, rate: 0, justified: 0, pending: 0 };

                        return (
                          <div
                            key={area}
                            className="bg-white rounded-xl p-3.5 border border-gray-200 shadow-2xs hover:shadow-xs hover:border-teal-400 transition-all text-left group"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2">
                                <span className={`w-2.5 h-2.5 rounded-full ${meta?.badgeBg || 'bg-teal-500'}`}></span>
                                <h5 className="font-bold text-xs text-gray-900">{area}</h5>
                                {config?.priority === 'alta' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.2 rounded-sm bg-red-50 text-red-700 border border-red-200">
                                    Alta Prioridade
                                  </span>
                                )}
                              </div>

                              {!readOnly && (
                                <button
                                  onClick={() => handleOpenEdit(area)}
                                  className="text-[10px] font-bold text-teal-700 hover:text-teal-900 bg-teal-50 hover:bg-teal-100 px-2 py-0.5 rounded-md transition-colors"
                                >
                                  Editar
                                </button>
                              )}
                            </div>

                            {/* Progress bar in Area */}
                            <div className="mt-2.5 flex items-center justify-between text-[10px] text-gray-500">
                              <span>Tarefas: {st.completed}/{st.total} feitas</span>
                              <span className={`font-bold ${
                                st.rate >= 80 ? 'text-emerald-600' : st.rate >= 60 ? 'text-amber-600' : 'text-red-500'
                              }`}>
                                {st.rate}%
                              </span>
                            </div>
                            <div className="mt-1 w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  st.rate >= 80 ? 'bg-emerald-500' : st.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                                }`}
                                style={{ width: `${st.rate}%` }}
                              />
                            </div>

                            {/* Subareas tags */}
                            {config?.subAreas && config.subAreas.length > 0 && (
                              <div className="mt-2.5 flex flex-wrap gap-1">
                                {config.subAreas.slice(0, 3).map((sub, idx) => (
                                  <span key={idx} className="text-[9px] bg-gray-50 text-gray-600 px-1.5 py-0.5 rounded-sm border border-gray-100 font-medium">
                                    {sub}
                                  </span>
                                ))}
                                {config.subAreas.length > 3 && (
                                  <span className="text-[9px] text-gray-400 font-medium">
                                    +{config.subAreas.length - 3}
                                  </span>
                                )}
                              </div>
                            )}

                            {/* Manager notes if present */}
                            {config?.notes && (
                              <div className="mt-2 text-[10px] text-gray-600 bg-gray-50 p-1.5 rounded-md border border-gray-100 italic">
                                "{config.notes}"
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* UNASSIGNED AREAS NODE (IF ANY) */}
              {managerGroups.unassigned.length > 0 && (
                <div className="flex flex-col items-center">
                  <div className="w-0.5 h-4 bg-amber-400"></div>

                  <div className="w-full bg-amber-50 rounded-2xl p-4 border border-amber-300 shadow-2xs text-left">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-600" />
                        <div>
                          <h4 className="font-bold text-xs text-amber-900">Áreas Sem Gerente</h4>
                          <p className="text-[10px] text-amber-700">Requerem atribuição</p>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full">
                        {managerGroups.unassigned.length}
                      </span>
                    </div>

                    <div className="mt-3 space-y-2">
                      {managerGroups.unassigned.map(area => (
                        <div key={area} className="bg-white p-2.5 rounded-xl border border-amber-200 flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-800">{area}</span>
                          {!readOnly && (
                            <button
                              onClick={() => handleOpenEdit(area)}
                              className="text-[10px] font-bold bg-teal-700 hover:bg-teal-800 text-white px-2 py-1 rounded-md transition-colors"
                            >
                              Atribuir
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* VIEW 2: DETAILED GRID */}
      {viewMode === 'grid' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white p-4 rounded-2xl border border-gray-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search size={14} className="absolute left-3 top-2.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Pesquisar por área, gerente ou notas..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-800 outline-hidden w-64 focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <select
                value={selectedManagerFilter}
                onChange={(e) => setSelectedManagerFilter(e.target.value)}
                className="p-1.5 bg-gray-50 border border-gray-200 rounded-xl text-xs font-bold text-gray-700 outline-hidden"
              >
                <option value="all">Todos os Gerentes</option>
                <option value="unassigned">Sem Gerente Atribuído</option>
                {Object.keys(managerGroups.groups).map(mgr => (
                  <option key={mgr} value={mgr}>{mgr}</option>
                ))}
              </select>
            </div>

            <span className="text-xs text-gray-500 font-semibold">
              Mostrando {filteredAreas.length} de {areas.length} áreas
            </span>
          </div>

          {/* Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAreas.map(area => {
              const config = effectiveResponsibles[area];
              const meta = DEFAULT_AREA_CONFIGS[area];
              const st = areaStats[area] || { total: 0, completed: 0, rate: 0, justified: 0, pending: 0 };

              return (
                <div
                  key={area}
                  className="bg-white rounded-2xl border border-gray-200 p-5 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-4"
                >
                  <div>
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <span className={`w-3.5 h-3.5 rounded-full ${meta?.badgeBg || 'bg-teal-600'}`}></span>
                        <div>
                          <h4 className="font-bold text-sm text-gray-900">{area}</h4>
                          <span className="text-[10px] text-gray-400 uppercase font-semibold">
                            {meta?.category || 'Setor'}
                          </span>
                        </div>
                      </div>

                      {config?.priority && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          config.priority === 'alta'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : config.priority === 'media'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-blue-50 text-blue-700 border-blue-200'
                        }`}>
                          Prioridade {config.priority}
                        </span>
                      )}
                    </div>

                    {/* Assigned Manager badge */}
                    <div className="mt-4 p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                          Gerente Responsável
                        </span>
                        {config?.managerName ? (
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Crown size={12} className="text-amber-500" />
                            <span className="text-xs font-bold text-gray-900">{config.managerName}</span>
                            {config.managerRole && (
                              <span className="text-[10px] text-gray-500 font-medium">({config.managerRole})</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs font-bold text-amber-600 flex items-center gap-1 mt-0.5">
                            <AlertCircle size={12} />
                            Não atribuído
                          </span>
                        )}
                      </div>

                      {!readOnly && (
                        <button
                          onClick={() => handleOpenEdit(area)}
                          className="text-xs font-bold text-teal-700 hover:text-teal-900 bg-white border border-gray-200 hover:bg-teal-50 px-2.5 py-1 rounded-lg transition-colors"
                        >
                          Alterar
                        </button>
                      )}
                    </div>

                    {/* Progress Bar & Current Status */}
                    <div className="mt-4 space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 font-medium">Conclusão Semanal:</span>
                        <span className="font-black text-gray-900">{st.completed}/{st.total} ({st.rate}%)</span>
                      </div>
                      <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-500 ${
                            st.rate >= 80 ? 'bg-emerald-500' : st.rate >= 60 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${st.rate}%` }}
                        />
                      </div>
                    </div>

                    {/* Sub-areas */}
                    {config?.subAreas && config.subAreas.length > 0 && (
                      <div className="mt-4">
                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block mb-1.5">
                          Pontos Críticos / Equipamentos:
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {config.subAreas.map((sub, i) => (
                            <span key={i} className="text-[10px] font-medium bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md border border-gray-200">
                              {sub}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Notes */}
                    {config?.notes && (
                      <div className="mt-3 text-xs text-gray-600 bg-teal-50/60 border border-teal-100 p-2.5 rounded-xl">
                        <span className="font-bold text-teal-900 text-[10px] block mb-0.5">Diretrizes do Gerente:</span>
                        <p className="text-xs text-gray-700 italic">"{config.notes}"</p>
                      </div>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-500">
                    <span>{st.justified} justificada(s)</span>
                    <span>{st.pending} pendente(s)</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: BY MANAGER SUMMARY */}
      {viewMode === 'by_manager' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {(Object.entries(managerGroups.groups) as [string, ManagerGroupData][]).map(([managerName, group]) => {
              const managerObj = employees.find(e => e.name === managerName);
              const role = managerObj 
                ? (managerObj.role === 'GERENTE_RESTAURANTE' ? 'Gerente Restaurante' : managerObj.role === 'GERENTE' ? 'Gerente' : managerObj.role)
                : 'Gerente';

              return (
                <div
                  key={managerName}
                  className="bg-white rounded-2xl border border-gray-200 p-6 shadow-2xs hover:shadow-xs transition-all space-y-4"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-teal-700 text-white flex items-center justify-center font-black text-base shadow-xs">
                        {managerName.split(' ').map(n => n[0]).slice(0, 2).join('')}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <Crown size={14} className="text-amber-500" />
                          <h4 className="font-bold text-base text-gray-900">{managerName}</h4>
                        </div>
                        <span className="text-xs text-gray-500 font-medium">{role}</span>
                      </div>
                    </div>

                    <span className="px-3 py-1 bg-teal-50 text-teal-800 rounded-full text-xs font-bold border border-teal-200">
                      {group.areas.length} {group.areas.length === 1 ? 'Área Atribuída' : 'Áreas Atribuídas'}
                    </span>
                  </div>

                  {/* Aggregate stats */}
                  <div className="grid grid-cols-3 gap-2 py-3 border-y border-gray-100 text-center">
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Tarefas Totais</span>
                      <p className="text-base font-black text-gray-800">{group.totalTasks}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Concluídas</span>
                      <p className="text-base font-black text-emerald-600">{group.completedTasks}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">% Conclusão</span>
                      <p className={`text-base font-black ${
                        group.rate >= 80 ? 'text-emerald-600' : group.rate >= 60 ? 'text-amber-600' : 'text-red-500'
                      }`}>
                        {group.rate}%
                      </p>
                    </div>
                  </div>

                  {/* List of areas */}
                  <div>
                    <span className="text-xs font-bold text-gray-700 block mb-2">Áreas sob supervisão:</span>
                    <div className="flex flex-wrap gap-2">
                      {group.areas.map(area => {
                        const st = areaStats[area];
                        return (
                          <div
                            key={area}
                            className="bg-gray-50 border border-gray-200 px-3 py-1.5 rounded-xl flex items-center gap-2 text-xs"
                          >
                            <span className="font-bold text-gray-800">{area}</span>
                            <span className="text-[10px] font-semibold text-gray-500">
                              ({st ? `${st.rate}%` : '0%'})
                            </span>
                            {!readOnly && (
                              <button
                                onClick={() => handleOpenEdit(area)}
                                className="text-gray-400 hover:text-teal-700 transition-colors ml-1"
                                title="Editar"
                              >
                                <Edit3 size={12} />
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL 1: EDIT SINGLE AREA RESPONSIBLE */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-teal-800 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-200">Definição de Responsabilidade</span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Área: {singleForm.area}
                </h3>
              </div>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-teal-200 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Gerente Responsável Selector */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Gerente Responsável:
                </label>
                <select
                  value={singleForm.managerName}
                  onChange={(e) => setSingleForm({ ...singleForm, managerName: e.target.value })}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  <option value="">-- Selecionar Gerente --</option>
                  {eligibleManagers.map(emp => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.role === 'GERENTE_RESTAURANTE' ? 'Gerente de Restaurante' : emp.role === 'GERENTE' ? 'Gerente' : emp.role})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">
                  Pode atribuir várias áreas ao mesmo gerente.
                </p>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Nível de Prioridade da Área:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['baixa', 'media', 'alta'] as const).map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setSingleForm({ ...singleForm, priority: p })}
                      className={`py-2 rounded-xl text-xs font-bold capitalize border transition-all ${
                        singleForm.priority === p
                          ? p === 'alta'
                            ? 'bg-red-500 text-white border-red-600 shadow-xs'
                            : p === 'media'
                            ? 'bg-amber-500 text-white border-amber-600 shadow-xs'
                            : 'bg-blue-500 text-white border-blue-600 shadow-xs'
                          : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>

              {/* Sub-areas / Critical points */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Sub-zonas / Equipamentos Críticos:
                </label>
                <input
                  type="text"
                  value={singleForm.subAreasInput}
                  onChange={(e) => setSingleForm({ ...singleForm, subAreasInput: e.target.value })}
                  placeholder="Ex: Fritadeiras, Grelhas, Arca 10:1, Ralos (separados por vírgula)"
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 outline-hidden focus:ring-2 focus:ring-teal-500"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  Separar por vírgula para exibir como etiquetas no fluxograma.
                </p>
              </div>

              {/* Supervision Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  Notas de Supervisão / Diretrizes do Gerente:
                </label>
                <textarea
                  rows={3}
                  value={singleForm.notes}
                  onChange={(e) => setSingleForm({ ...singleForm, notes: e.target.value })}
                  placeholder="Diretrizes operacionais para a equipa, pontos de atenção ou rotinas especiais..."
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-medium text-gray-800 outline-hidden focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleSaveSingle}
                className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Guardar Responsabilidade</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BULK ASSIGNMENT (1 Gerente -> Múltiplas Áreas) */}
      {isBulkModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-xl w-full overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 bg-teal-800 text-white flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-teal-200">Atribuição Rápida em Lote</span>
                <h3 className="text-lg font-bold text-white mt-0.5">
                  Designar Áreas por Gerente
                </h3>
              </div>
              <button
                onClick={() => setIsBulkModalOpen(false)}
                className="text-teal-200 hover:text-white p-1 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                  1. Selecionar Gerente:
                </label>
                <select
                  value={bulkManager}
                  onChange={(e) => {
                    const newMgr = e.target.value;
                    setBulkManager(newMgr);
                    // auto-check areas currently assigned to him
                    setBulkSelectedAreas(areas.filter(a => effectiveResponsibles[a]?.managerName === newMgr));
                  }}
                  className="w-full p-2.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-gray-800 outline-hidden focus:ring-2 focus:ring-teal-500"
                >
                  {eligibleManagers.map(emp => (
                    <option key={emp.id} value={emp.name}>
                      {emp.name} ({emp.role === 'GERENTE_RESTAURANTE' ? 'Gerente Restaurante' : emp.role === 'GERENTE' ? 'Gerente' : emp.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider">
                    2. Selecionar Áreas sob responsabilidade de {bulkManager}:
                  </label>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={() => setBulkSelectedAreas([...areas])}
                      className="text-teal-700 font-bold hover:underline"
                    >
                      Selecionar Todas
                    </button>
                    <span>•</span>
                    <button
                      type="button"
                      onClick={() => setBulkSelectedAreas([])}
                      className="text-gray-500 font-bold hover:underline"
                    >
                      Limpar
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-60 overflow-y-auto p-3 bg-gray-50 rounded-2xl border border-gray-200">
                  {areas.map(area => {
                    const isChecked = bulkSelectedAreas.includes(area);
                    const currentMgr = effectiveResponsibles[area]?.managerName;

                    return (
                      <label
                        key={area}
                        className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                          isChecked
                            ? 'bg-teal-50 border-teal-400 text-teal-900 font-bold'
                            : 'bg-white border-gray-200 text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <div className="text-xs truncate mr-2">
                          <span className="block truncate">{area}</span>
                          {currentMgr && currentMgr !== bulkManager && (
                            <span className="text-[9px] text-amber-600 block truncate">
                              Atual: {currentMgr}
                            </span>
                          )}
                        </div>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setBulkSelectedAreas([...bulkSelectedAreas, area]);
                            } else {
                              setBulkSelectedAreas(bulkSelectedAreas.filter(a => a !== area));
                            }
                          }}
                          className="w-4 h-4 text-teal-600 rounded-md border-gray-300 focus:ring-teal-500"
                        />
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 border-t border-gray-200 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkModalOpen(false)}
                className="px-4 py-2 bg-white border border-gray-300 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-bold transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isSaving || !bulkManager}
                onClick={handleSaveBulk}
                className="px-5 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-xl text-xs font-bold transition-colors shadow-xs flex items-center gap-1.5"
              >
                {isSaving ? <RefreshCw size={14} className="animate-spin" /> : <Check size={14} />}
                <span>Guardar Atribuições ({bulkSelectedAreas.length} áreas)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
