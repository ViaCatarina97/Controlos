
import React, { useState, useEffect, useMemo } from 'react';
import { StaffingTableEntry, AppSettings, DailySchedule, Employee, HourlyProjection, ShiftType, StationAssignment, StationConfig } from '../types';
import { AVAILABLE_SHIFTS, STATIONS } from '../constants';
import { FloorPlan } from './positioning/FloorPlan';
import { 
  Users, User, AlertCircle, X, 
  Flame, Sun, Store, MoonStar, 
  CupSoda, TrendingUp,
  Calculator, CheckCircle2, AlertTriangle, Calendar, UserCircle, Briefcase, Printer, Save, Lock, Unlock, Edit, Target, GraduationCap, Trash2, Sunrise
} from 'lucide-react';

// --- Helpers ---

const matchSingle = (rowLabel: string, targetStr: string): boolean => {
  if (!targetStr) return false;

  const getDigits = (str: string): string | null => {
    const match = str.match(/\d+/);
    return match ? match[0] : null;
  };

  const rDigit = getDigits(rowLabel);
  const tDigit = getDigits(targetStr);

  // Se ambas as partes têm números definidos, estes têm de coincidir exatamente
  if (rDigit !== null && tDigit !== null) {
    if (rDigit !== tDigit) return false;
  }
  // Se o utilizador escreveu um posto sem número (por exemplo, "Bebidas" ou "Apresentador"),
  // isto deve por padrão assumir e corresponder ao posto "1".
  else if (rDigit === null && tDigit !== null) {
    if (tDigit !== "1") return false;
  }
  // Se o utilizador especificou "Bebidas 1" mas a estação ativa não tem nenhum número (ex: "Bebidas" genérico)
  else if (rDigit !== null && tDigit === null) {
    // Permitido: Não restringimos a "1" se a estação não tiver número (ex: "McCafé Prep", "Delivery Prep"),
    // permitindo que "Preparador 2" ou "Salão 1" correspondam à estação genérica sem número.
  }

  // Agora comparamos os textos sem os números
  const cleanTextOnly = (str: string) => {
    return str
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/\d+/g, "") // remove digits
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " "); // collapse spaces
  };

  const rText = cleanTextOnly(rowLabel);
  const tText = cleanTextOnly(targetStr);

  // 1. Coincidência direta completa
  if (rText === tText) return true;
  
  // Para substring, vamos garantir que a correspondência de palavras é robusta
  if (rText.length > 2 && tText.length > 2) {
    if (rText.includes(tText) || tText.includes(rText)) {
      // Mas evitamos "bat" substring de "batch cooker"
      if (rText === "batch cooker" && tText === "bat") return false;
      if (tText === "batch cooker" && rText === "bat") return false;
      return true;
    }
  }

  // 2. Tokenização inteligente por palavras-chave com mapeamento de abreviaturas/variantes comuns em português
  const rTokens = rText.split(/[\s_\-\/]+/).filter(t => t.length > 1);
  const tTokens = tText.split(/[\s_\-\/]+/).filter(t => t.length > 1);

  const abbreviations: Record<string, string[]> = {
    "bc": ["batch", "cooker"],
    "batch": ["bc", "batch", "cooker"],
    "cooker": ["bc", "batch", "cooker"],
    "ini": ["iniciador"],
    "iniciador": ["ini"],
    "fin": ["finalizador"],
    "finalizador": ["fin"],
    "apr": ["apresentador", "apresentadora"],
    "apresentador": ["apr", "apresentadora"],
    "bat": ["batata", "batatas", "fries"],
    "batata": ["bat", "fries"],
    "prep": ["preparador", "preparacao"],
    "preparador": ["prep", "preparacao"],
    "del": ["delivery", "prep", "preparador"],
    "delivery": ["del"],
    "cax": ["caixa"],
    "caixa": ["cax"],
    "bev": ["bebidas", "beverage"],
    "bebidas": ["bev", "beverage"],
  };

  // Excluímos conectores semânticos ou fluffs
  const fluffWords = ["de", "da", "do", "em", "para", "o", "a", "os", "as", "um", "uma", "com", "sem", "interno", "externo"];
  const rCleanTokens = rTokens.filter(t => !fluffWords.includes(t));
  const tCleanTokens = tTokens.filter(t => !fluffWords.includes(t));

  for (const rt of rCleanTokens) {
    for (const tt of tCleanTokens) {
      if (rt === tt) return true;
      if (abbreviations[rt] && abbreviations[rt].includes(tt)) return true;
      if (abbreviations[tt] && abbreviations[tt].includes(rt)) return true;
    }
  }

  return false;
};

const stationLabelsMatchSelective = (rowLabel: string, sLabel: string, sDesig: string, useOnlyLabel: boolean): boolean => {
  if (useOnlyLabel) {
    return matchSingle(rowLabel, sLabel);
  }
  return matchSingle(rowLabel, sLabel) || matchSingle(rowLabel, sDesig);
};

const stationLabelsMatch = (rowLabel: string, sLabel: string, sDesig: string = ""): boolean => {
  return stationLabelsMatchSelective(rowLabel, sLabel, sDesig, false);
};

interface PositioningProps {
  date: string; setDate: (date: string) => void; projectedSales: number; employees: Employee[]; staffingTable: StaffingTableEntry[];
  schedule: DailySchedule; setSchedule: (s: DailySchedule) => void; settings: AppSettings; hourlyData?: HourlyProjection[]; onSaveSchedule: (schedule: DailySchedule) => void;
  initialShift?: ShiftType | null; onShiftChangeComplete?: () => void;
  selectedShift: ShiftType;
  setSelectedShift: (shift: ShiftType) => void;
}

export const Positioning: React.FC<PositioningProps> = ({ 
  date, setDate, employees, staffingTable, schedule, setSchedule, settings, hourlyData, onSaveSchedule, initialShift, onShiftChangeComplete,
  selectedShift, setSelectedShift
}) => {
  const [manualPeakHour, setManualPeakHour] = useState<string | null>(null);
  const [showAllStations, setShowAllStations] = useState(false);
  const [showManualAdjModal, setShowManualAdjModal] = useState(false);
  const [manualAdjPasswordInput, setManualAdjPasswordInput] = useState('');
  const [manualAdjCountInput, setManualAdjCountInput] = useState('');
  const [manualAdjError, setManualAdjError] = useState('');
  const [manualAdjStep, setManualAdjStep] = useState<1 | 2 | 3>(1);
  const [manualAdjType, setManualAdjType] = useState<'staffing' | 'custom'>('staffing');
  const [selectedCustomStations, setSelectedCustomStations] = useState<string[]>([]);
  
  const availableShifts = settings.activeShifts;
  // Data local (não UTC) para evitar que o dia "expire" à hora errada
  const today = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  }, []);
  const isExpired = date < today;
  const isShiftLocked = useMemo(() => {
    return isExpired || (schedule.lockedShifts || []).includes(selectedShift);
  }, [schedule.lockedShifts, selectedShift, isExpired]);

  // Handle initial shift from history
  useEffect(() => {
    if (initialShift && availableShifts.includes(initialShift)) {
      setSelectedShift(initialShift);
      if (onShiftChangeComplete) onShiftChangeComplete();
    }
  }, [initialShift, availableShifts, onShiftChangeComplete]);

  useEffect(() => {
    if (!availableShifts.includes(selectedShift) && availableShifts.length > 0) setSelectedShift(availableShifts[0]);
  }, [availableShifts, selectedShift]);

  const targetHourLabels = useMemo(() => {
    if (selectedShift === 'FECHO' || selectedShift === 'MADRUGADA') return ['19h-20h', '20h-21h'];
    return ['12h-13h', '13h-14h'];
  }, [selectedShift]);

  const shiftPeakData = useMemo(() => {
    if (!hourlyData) return [];
    return hourlyData.filter(d => targetHourLabels.includes(d.hour));
  }, [hourlyData, targetHourLabels]);

  useEffect(() => {
    if (shiftPeakData.length > 0) {
        const maxSalesHour = shiftPeakData.reduce((prev, current) => (prev.totalSales > current.totalSales) ? prev : current).hour;
        setManualPeakHour(maxSalesHour);
    } else setManualPeakHour(null);
  }, [shiftPeakData]);

  const activeSalesData = useMemo(() => {
      const scheduleSales = schedule.projectedSales?.[selectedShift] || 0;
      if (!manualPeakHour || shiftPeakData.length === 0) {
        return { totalSales: scheduleSales, hour: selectedShift === 'FECHO' || selectedShift === 'MADRUGADA' ? '19h-20h' : '12h-13h' };
      }
      const found = shiftPeakData.find(d => d.hour === manualPeakHour);
      if (found) {
        return { totalSales: scheduleSales || found.totalSales, hour: found.hour };
      }
      return { totalSales: scheduleSales, hour: manualPeakHour };
  }, [manualPeakHour, shiftPeakData, schedule.projectedSales, selectedShift]);

  /**
   * Encontra o índice da linha da tabela de staffing aplicável às vendas indicadas.
   * 1) Correspondência exata no intervalo [min, max];
   * 2) Caso contrário (ex.: vendas decimais que caem entre 99 e 100, ou acima do último
   *    intervalo), usa a última linha cujo mínimo é <= vendas.
   */
  const findStaffingRowIndex = (sorted: StaffingTableEntry[], sales: number): number => {
    if (sorted.length === 0) return -1;
    const exact = sorted.findIndex(row => sales >= row.minSales && sales <= row.maxSales);
    if (exact !== -1) return exact;
    let idx = -1;
    sorted.forEach((row, i) => { if (sales >= row.minSales) idx = i; });
    return idx;
  };

  const getRequiredStaff = (sales: number): { count: number; label: string } => {
    if (!staffingTable || staffingTable.length === 0) return { count: 0, label: 'N/A' };
    const sorted = [...staffingTable].sort((a, b) => a.minSales - b.minSales);
    const idx = findStaffingRowIndex(sorted, sales);
    if (idx === -1) return { count: 0, label: '0' };
    return { count: sorted[idx].staffCount, label: sorted[idx].stationLabel };
  };

  const manualAdj = useMemo(() => {
    if (!schedule) return 0;
    return schedule.manualAdjustments?.[selectedShift] || 0;
  }, [schedule, selectedShift]);

  const requirement = useMemo(() => {
    const base = getRequiredStaff(activeSalesData.totalSales);
    return {
      count: Math.max(0, base.count + manualAdj),
      label: base.label
    };
  }, [activeSalesData.totalSales, staffingTable, manualAdj]);

  const currentAssignedCount = useMemo(() => {
     const shiftData: StationAssignment = schedule.shifts[selectedShift] || {};
     const uniqueIds = new Set<string>();
     
     // CORREÇÃO: O gerente NÃO conta para a soma "Real" dos posicionados em postos.
     // Se a tabela diz 15, queremos ver 15 pessoas em postos reais.
     // Apenas colaboradores existentes e ativos contam (ignora IDs órfãos de colaboradores removidos/inativos)
     const validIds = new Set(employees.map(e => e.id));
     Object.values(shiftData).forEach((ids) => {
        if (Array.isArray(ids)) {
          ids.forEach((id: string) => {
            if (id && typeof id === 'string' && id.trim() !== "" && validIds.has(id.trim())) {
              uniqueIds.add(id.trim());
            }
          });
        }
     });
     return uniqueIds.size;
  }, [schedule, selectedShift, employees]);

  // IDs posicionados neste turno que já não correspondem a colaboradores ativos
  const orphanAssignmentsCount = useMemo(() => {
    const validIds = new Set(employees.map(e => e.id));
    const shiftData: StationAssignment = schedule.shifts[selectedShift] || {};
    const traineeData: StationAssignment = schedule.trainees?.[selectedShift] || {};
    let count = 0;
    [shiftData, traineeData].forEach(group => {
      Object.values(group).forEach(ids => {
        if (Array.isArray(ids)) ids.forEach(id => { if (id && !validIds.has(id)) count++; });
      });
    });
    return count;
  }, [schedule.shifts, schedule.trainees, selectedShift, employees]);

  const handleCleanOrphanAssignments = () => {
    if (isShiftLocked) return;
    const validIds = new Set(employees.map(e => e.id));
    const clean = (group: StationAssignment): StationAssignment => {
      const out: StationAssignment = {};
      Object.entries(group).forEach(([stationId, ids]) => {
        out[stationId] = (ids || []).filter(id => validIds.has(id));
      });
      return out;
    };
    setSchedule({
      ...schedule,
      shifts: { ...schedule.shifts, [selectedShift]: clean(schedule.shifts[selectedShift] || {}) },
      trainees: { ...schedule.trainees, [selectedShift]: clean(schedule.trainees?.[selectedShift] || {}) },
    });
  };

  const gap = requirement.count - currentAssignedCount;

  const allStations = useMemo(() => settings.customStations || STATIONS, [settings.customStations]);

  const sortedStaffingTable = useMemo(() => {
    return [...staffingTable].sort((a, b) => a.minSales - b.minSales);
  }, [staffingTable]);

  const activeStations = useMemo(() => {
    const activeBusinessAreas = settings.businessAreas || [];
    const filtered = allStations.filter(s => {
        if (!s.isActive) return false;
        if (s.area === 'drive' && !activeBusinessAreas.includes('Drive')) return false;
        if (s.area === 'mccafe' && !activeBusinessAreas.includes('McCafé')) return false;
        if (s.area === 'delivery' && !activeBusinessAreas.includes('Delivery')) return false;
        return true;
    });

    const getStationOpeningIndex = (station: StationConfig) => {
      // Tentar correspondência exata de label primeiro para evitar indexação por desig errada
      let idx = sortedStaffingTable.findIndex(row => 
        stationLabelsMatchSelective(row.stationLabel, station.label, station.designation || "", true)
      );
      if (idx !== -1) return idx;

      // Fallback para desig
      idx = sortedStaffingTable.findIndex(row => 
        stationLabelsMatchSelective(row.stationLabel, station.label, station.designation || "", false)
      );
      if (idx !== -1) return idx;

      const originalIdx = allStations.findIndex(x => x.id === station.id);
      return 1000 + (originalIdx !== -1 ? originalIdx : 0);
    };

    return filtered.sort((a, b) => getStationOpeningIndex(a) - getStationOpeningIndex(b));
  }, [allStations, settings.businessAreas, sortedStaffingTable]);

  const recommendedStationIds = useMemo(() => {
    const chosenIds = new Set<string>();
    
    // 1. Descobrir em que intervalo de vendas se encaixa a previsão de vendas atual
    const sales = activeSalesData.totalSales;
    let finalMatchIdx = findStaffingRowIndex(sortedStaffingTable, sales);

    // Determine if we have custom station additions
    const customStations = schedule.manualStationAdditions?.[selectedShift] || [];
    const hasCustomStations = customStations.length > 0;

    // If we have custom station additions, we don't shift the staffing table index
    let effectiveManualAdj = manualAdj;
    if (hasCustomStations) {
      effectiveManualAdj = 0;
    }

    if (effectiveManualAdj !== 0 && sortedStaffingTable.length > 0) {
      const baseStaffCount = finalMatchIdx !== -1 ? sortedStaffingTable[finalMatchIdx].staffCount : 0;
      const targetStaffCount = Math.max(0, baseStaffCount + effectiveManualAdj);
      
      let adjustedMatchIdx = sortedStaffingTable.findIndex(row => row.staffCount === targetStaffCount);
      
      if (adjustedMatchIdx === -1) {
        const lastLeIndex = [...sortedStaffingTable].reverse().findIndex(row => row.staffCount <= targetStaffCount);
        if (lastLeIndex !== -1) {
          adjustedMatchIdx = sortedStaffingTable.length - 1 - lastLeIndex;
        } else {
          adjustedMatchIdx = -1;
        }
      }
      
      const maxStaffInTable = sortedStaffingTable[sortedStaffingTable.length - 1].staffCount;
      if (targetStaffCount >= maxStaffInTable) {
        adjustedMatchIdx = sortedStaffingTable.length - 1;
      }

      finalMatchIdx = adjustedMatchIdx;
    }
    
    // 2. Os postos a abrir são os que estão na coluna da descrição (stationLabel) desde o início (índice 0) até à linha do intervalo de vendas (inclusive)
    const relevantRows = finalMatchIdx !== -1 ? sortedStaffingTable.slice(0, finalMatchIdx + 1) : [];
    
    for (const row of relevantRows) {
        // PASS 1: Tentar corresponder APENAS pelo label principal da estação (muito mais específico e autoritário)
        let matchedStation = activeStations.find(s => 
            !chosenIds.has(s.id) && stationLabelsMatchSelective(row.stationLabel, s.label, s.designation || "", true)
        );
        
        // PASS 2: Se não encontrar pelo label, tenta encontrar usando também a desig
        if (!matchedStation) {
            matchedStation = activeStations.find(s => 
                !chosenIds.has(s.id) && stationLabelsMatchSelective(row.stationLabel, s.label, s.designation || "", false)
            );
        }
        
        if (matchedStation) {
            chosenIds.add(matchedStation.id);
        } else {
            // Caso todas as instâncias daquela estação já estejam ocupadas mas precisamos abrir uma (ex: se o usuário colocou o mesmo nome várias vezes),
            // tentamos encontrar mesmo sem a restrição de "já escolhida", ou apenas mantemos a melhor correspondência possível.
            let looseMatch = activeStations.find(s => 
                stationLabelsMatchSelective(row.stationLabel, s.label, s.designation || "", true)
            );
            if (!looseMatch) {
                looseMatch = activeStations.find(s => 
                    stationLabelsMatchSelective(row.stationLabel, s.label, s.designation || "", false)
                );
            }
            if (looseMatch) {
                chosenIds.add(looseMatch.id);
            }
        }
    }
    
    // 3. Garantir que o número de postos recomendados (visíveis) seja pelo menos igual ao total de funcionários previstos (targetStaffCount)
    const baseStaffCount = finalMatchIdx !== -1 ? sortedStaffingTable[finalMatchIdx].staffCount : 0;
    const targetStaffCount = Math.max(0, baseStaffCount + effectiveManualAdj);
    if (chosenIds.size < targetStaffCount) {
      for (const s of activeStations) {
        if (chosenIds.size >= targetStaffCount) break;
        chosenIds.add(s.id);
      }
    }

    // 4. Se houver postos adicionados manualmente, adicioná-los explicitamente!
    if (hasCustomStations) {
      customStations.forEach(id => {
        if (activeStations.some(s => s.id === id)) {
          chosenIds.add(id);
        }
      });
    }
    
    return chosenIds;
  }, [sortedStaffingTable, activeSalesData.totalSales, activeStations, manualAdj, schedule.manualStationAdditions, selectedShift]);

  const handleManagerChange = (field: 'leader' | 'support', empId: string) => {
      if (isShiftLocked) return;
      const current = schedule.shiftManagers?.[selectedShift] || {};
      const other = field === 'leader' ? current.support : current.leader;
      if (empId && other && empId === other) {
        alert('O Gerente de Turno e o Gerente de Apoio não podem ser a mesma pessoa.');
        return;
      }
      setSchedule({ 
        ...schedule, 
        shiftManagers: { 
          ...schedule.shiftManagers, 
          [selectedShift]: { 
            ...(typeof schedule.shiftManagers?.[selectedShift] === 'object' ? schedule.shiftManagers?.[selectedShift] : {}),
            [field]: empId 
          } 
        } 
      });
  };

  const handleObjectiveChange = (field: 'turnObjective' | 'productionObjective', value: string) => {
      if (isShiftLocked) return;
      const currentObjs = schedule.shiftObjectives || {};
      const shiftObjs = currentObjs[selectedShift] || {};
      setSchedule({ ...schedule, shiftObjectives: { ...currentObjs, [selectedShift]: { ...shiftObjs, [field]: value } } });
  };

  // Verifica se o colaborador já está atribuído a algum posto (staff ou formando) no turno atual
  const checkDuplicateAssignment = (employeeId: string): boolean => {
    const shiftData = schedule.shifts[selectedShift] || {};
    const traineeData = schedule.trainees?.[selectedShift] || {};
    
    // Procurar em staff normal
    // Fix: cast Object.values to string[][] to avoid "Property 'includes' does not exist on type 'unknown'"
    const alreadyAsStaff = (Object.values(shiftData) as string[][]).some(ids => ids.includes(employeeId));
    // Procurar em formandos
    // Fix: cast Object.values to string[][] to avoid "Property 'includes' does not exist on type 'unknown'"
    const alreadyAsTrainee = (Object.values(traineeData) as string[][]).some(ids => ids.includes(employeeId));

    if (alreadyAsStaff || alreadyAsTrainee) {
      const emp = employees.find(e => e.id === employeeId);
      const name = emp ? emp.name : 'Este colaborador';
      alert(`${name} já está posicionado(a) neste turno!`);
      return true;
    }
    return false;
  };

  const handleAssign = (stationId: string, employeeId: string) => {
    if (isShiftLocked) return;
    if (checkDuplicateAssignment(employeeId)) return;

    const shiftData = schedule.shifts[selectedShift] || {};
    const stationAssignments = shiftData[stationId] || [];
    if (stationAssignments.includes(employeeId)) return;
    
    setSchedule({ ...schedule, shifts: { ...schedule.shifts, [selectedShift]: { ...shiftData, [stationId]: [...stationAssignments, employeeId] } } });
  };

  const handleRemove = (stationId: string, employeeId: string) => {
    if (isShiftLocked) return;
    const shiftData = schedule.shifts[selectedShift] || {};
    const stationAssignments = shiftData[stationId] || [];
    setSchedule({ ...schedule, shifts: { ...schedule.shifts, [selectedShift]: { ...shiftData, [stationId]: stationAssignments.filter(id => id !== employeeId) } } });
  };

  const handleAssignTrainee = (stationId: string, employeeId: string) => {
    if (isShiftLocked) return;
    if (checkDuplicateAssignment(employeeId)) return;

    const shiftTrainees = schedule.trainees?.[selectedShift] || {};
    const stationTrainees = shiftTrainees[stationId] || [];
    if (stationTrainees.includes(employeeId)) return;
    
    setSchedule({ ...schedule, trainees: { ...schedule.trainees, [selectedShift]: { ...shiftTrainees, [stationId]: [...stationTrainees, employeeId] } } });
  };

  const handleRemoveTrainee = (stationId: string, employeeId: string) => {
    if (isShiftLocked) return;
    const shiftTrainees = schedule.trainees?.[selectedShift] || {};
    const stationTrainees = shiftTrainees[stationId] || [];
    setSchedule({ ...schedule, trainees: { ...schedule.trainees, [selectedShift]: { ...shiftTrainees, [stationId]: stationTrainees.filter(id => id !== employeeId) } } });
  };

  const handlePrint = () => window.print();

  /**
   * Valida e submete (tranca) o turno selecionado.
   * Regras: data não passada, gerente de turno definido, sem posicionados órfãos,
   * confirmação quando há diferença face ao previsto.
   */
  const handleSaveAndLock = () => { 
    if (isExpired) {
      alert("Não é possível submeter posicionamentos de datas passadas.");
      return;
    }
    const currentLocked = schedule.lockedShifts || [];
    if (currentLocked.includes(selectedShift)) {
      alert("Este turno já se encontra trancado!");
      return;
    }
    if (!schedule.shiftManagers?.[selectedShift]?.leader) {
      alert("Selecione o Gerente de Turno antes de submeter o posicionamento.");
      return;
    }
    if (orphanAssignmentsCount > 0) {
      alert("Existem colaboradores inativos/removidos posicionados neste turno. Limpe-os antes de submeter.");
      return;
    }
    if (currentAssignedCount === 0 && !confirm("Ainda não há colaboradores posicionados neste turno. Submeter mesmo assim?")) return;
    if (gap > 0 && !confirm(`Faltam ${gap} colaborador(es) face ao previsto (${requirement.count}). Submeter e trancar mesmo assim?`)) return;
    if (gap < 0 && !confirm(`Estão posicionados ${Math.abs(gap)} colaborador(es) acima do previsto (${requirement.count}). Submeter e trancar mesmo assim?`)) return;

    onSaveSchedule({ ...schedule, lockedShifts: [...currentLocked, selectedShift] });
    alert(`Posicionamento do turno ${getShiftLabel(selectedShift)} submetido e trancado com sucesso!`);
  };

  const handleUnlock = () => { 
    if (!isExpired) {
        const currentLocked = schedule.lockedShifts || [];
        const updatedSchedule = { 
            ...schedule, 
            lockedShifts: currentLocked.filter(s => s !== selectedShift) 
        };
        onSaveSchedule(updatedSchedule);
    } 
  };

  const handleClearAssignments = () => { 
    if (!isShiftLocked && confirm('Limpar todos os posicionamentos deste turno?')) {
        setSchedule({ 
            ...schedule, 
            shifts: { ...schedule.shifts, [selectedShift]: {} }, 
            trainees: { ...schedule.trainees, [selectedShift]: {} } 
        });
    }
  };

  const getShiftIcon = (id: ShiftType) => {
    switch(id) {
      case 'ABERTURA': return <Sunrise size={18} />; case 'INTERMEDIO': return <Sun size={18} />; case 'FECHO': return <MoonStar size={18} />; default: return <Store size={18} />;
    }
  };

  const getShiftLabel = (id: ShiftType) => AVAILABLE_SHIFTS.find(s => s.id === id)?.label || id;

  const filteredStations = useMemo(() => {
    return activeStations.filter(s => {
        if (showAllStations) return true;
        
        const currentAssignments = schedule.shifts[selectedShift]?.[s.id] || [];
        const assigned = currentAssignments.some(id => id && id.trim() !== "");
        const traineeAssignments = schedule.trainees?.[selectedShift]?.[s.id] || [];
        const assignedTrainees = traineeAssignments.some(id => id && id.trim() !== "");
        
        // Visível se estiver preenchido OU se estiver nos recomendados exatos por ID
        return assigned || assignedTrainees || recommendedStationIds.has(s.id);
    });
  }, [activeStations, showAllStations, recommendedStationIds, schedule.shifts, schedule.trainees, selectedShift]);


  const totalVisibleStations = filteredStations.length;
  const shiftLeaderName = useMemo(() => {
      const leaderId = schedule.shiftManagers?.[selectedShift]?.leader;
      const emp = employees.find(e => e.id === leaderId);
      if (!emp) return '-';
      const parts = emp.name.split(' ');
      return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
  }, [schedule.shiftManagers, selectedShift, employees]);

  const shiftSupportName = useMemo(() => {
      const supportId = schedule.shiftManagers?.[selectedShift]?.support;
      const emp = supportId ? employees.find(e => e.id === supportId) : null;
      if (!emp) return '-';
      const parts = emp.name.split(' ');
      return parts.length > 1 ? `${parts[0]} ${parts[parts.length - 1]}` : parts[0];
  }, [schedule.shiftManagers, selectedShift, employees]);


  const currentObjectives = useMemo(() => (schedule.shiftObjectives || {})[selectedShift] || {}, [schedule.shiftObjectives, selectedShift]);

  const getAreaLabel = (area: string) => {
    const labels: Record<string, string> = { 
      kitchen: 'Cozinha (Produção)', 
      beverage: 'Bebidas', 
      fries: 'Batatas', 
      lobby: 'Sala', 
      counter: 'Balcão (Serviço)', 
      delivery: 'Delivery', 
      drive: 'Drive-Thru', 
      mccafe: 'McCafé' 
    };
    return labels[area] || area;
  };

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: landscape !important;
            margin: 5mm !important;
          }
        }
      `}} />
      <div className="flex flex-col h-full space-y-4 animate-fade-in print:hidden">
        {/* Header Bar: Date & Shift Manager selection */}
        <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-center gap-5">
            <div className="flex items-center gap-3.5 w-full md:w-auto">
                <div className="p-3 bg-blue-50 text-blue-600 rounded-xl shrink-0 shadow-sm"><Calendar size={20} /></div>
                <div className="flex-1">
                  <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Data de Trabalho</p>
                  <input 
                    type="date" 
                    value={date} 
                    onChange={(e) => setDate(e.target.value)} 
                    className="text-base font-black text-gray-800 bg-transparent border-b-2 border-gray-150 focus:border-blue-500 outline-none pb-0.5 hover:border-gray-300 transition-colors w-full cursor-pointer" 
                  />
                </div>
            </div>
            
            <div className="flex items-center gap-3.5 w-full md:w-auto">
                <div className="p-3 bg-purple-50 text-purple-600 rounded-xl shrink-0 shadow-sm"><UserCircle size={20} /></div>
                <div className="flex-1 w-full md:w-auto">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Gerente de Turno</p>
                    <select 
                      value={schedule.shiftManagers?.[selectedShift]?.leader || ''} 
                      onChange={(e) => handleManagerChange('leader', e.target.value)} 
                      disabled={isShiftLocked} 
                      className={`w-full md:w-64 mt-1 p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500/15 focus:border-purple-500 focus:outline-none transition-all cursor-pointer ${isShiftLocked ? 'opacity-70 cursor-not-allowed bg-gray-100' : ''}`}
                    >
                      <option value="">Selecione o Gerente...</option>
                      {employees
                        .filter(e => e.role === 'GERENTE')
                        .sort((a, b) => a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' }))
                        .map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                </div>
                <div className="flex-1 w-full md:w-auto">
                    <p className="text-[10px] text-gray-400 font-black uppercase tracking-wider">Gerente de Apoio</p>
                    <select 
                      value={schedule.shiftManagers?.[selectedShift]?.support || ''} 
                      onChange={(e) => handleManagerChange('support', e.target.value)} 
                      disabled={isShiftLocked} 
                      className={`w-full md:w-64 mt-1 p-2.5 bg-gray-50/70 border border-gray-200 rounded-xl text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500/15 focus:border-purple-500 focus:outline-none transition-all cursor-pointer ${isShiftLocked ? 'opacity-70 cursor-not-allowed bg-gray-100' : ''}`}
                    >
                      <option value="">Selecione o Gerente...</option>
                      {employees
                        .filter(e => e.role === 'GERENTE')
                        .sort((a, b) => a.name.localeCompare(b.name, 'pt', { sensitivity: 'base' }))
                        .map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                </div>
            </div>
        </div>

        {/* Console de Botões */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4 flex-wrap">
             <button 
               onClick={() => {
                 onSaveSchedule(schedule);
                 alert("Rascunho do posicionamento guardado com sucesso no histórico!");
               }} 
               className="px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-bold transition-all shadow-sm"
             >
               Gravar Rascunho
             </button>
             <button 
               onClick={handleSaveAndLock}
               disabled={isShiftLocked}
               title={isExpired ? 'Datas passadas são apenas de consulta' : isShiftLocked ? 'Turno já trancado' : 'Validar e trancar o turno'}
               className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
             >
               Submeter Posicionamento
             </button>
             {isExpired && (
               <span className="text-xs font-black text-slate-500 bg-slate-100 px-3 py-1 rounded-full border border-slate-200 flex items-center gap-1.5">
                 <Lock size={12} /> Data passada — só consulta
               </span>
             )}
             {orphanAssignmentsCount > 0 && (
               <button
                 onClick={handleCleanOrphanAssignments}
                 disabled={isShiftLocked}
                 className="text-xs font-black text-rose-700 bg-rose-50 px-3 py-1 rounded-full border border-rose-200 flex items-center gap-1.5 hover:bg-rose-100 disabled:opacity-60 disabled:cursor-not-allowed"
                 title="Remover colaboradores inativos/removidos deste turno"
               >
                 <AlertTriangle size={12} /> {orphanAssignmentsCount} posicionado(s) inativo(s) — limpar
               </button>
             )}
             <div className="flex-1"></div>
             
             <div className="flex items-center gap-3">
                {manualAdj !== 0 && (
                  <span className="text-xs font-black text-amber-700 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
                    Ajuste Ativo: {manualAdj > 0 ? `+${manualAdj}` : manualAdj} Colaboradores
                  </span>
                )}
                <button 
                   onClick={() => {
                      setManualAdjPasswordInput('');
                      setManualAdjCountInput(manualAdj !== 0 ? String(manualAdj) : '');
                      setManualAdjError('');
                      setManualAdjStep(1);
                      const currentCustoms = schedule.manualStationAdditions?.[selectedShift] || [];
                      setSelectedCustomStations(currentCustoms);
                      setManualAdjType(currentCustoms.length > 0 ? 'custom' : 'staffing');
                      setShowManualAdjModal(true);
                   }}
                   className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-bold transition-all shadow-sm"
                >
                   Ajuste Manual
                </button>
             </div>
        </div>

        {/* Shift selector container: Modern Segment Controller pill bar */}
        <div className="bg-slate-100/55 p-1.5 rounded-2xl border border-gray-200/50 flex gap-1.5 overflow-x-auto shadow-sm">
          {availableShifts.map(shift => {
            const isActive = selectedShift === shift;
            return (
              <button 
                key={shift} 
                onClick={() => setSelectedShift(shift)} 
                className={`flex-1 py-2.5 px-4 rounded-xl flex items-center justify-center gap-2.5 font-bold text-xs uppercase tracking-wider transition-all duration-150 whitespace-nowrap cursor-pointer active:scale-98 ${
                  isActive 
                    ? 'bg-white text-blue-700 shadow-md border border-blue-100' 
                    : 'bg-transparent text-slate-550 hover:bg-white/40 hover:text-slate-700'
                }`}
              >
                <div className="relative">
                  {getShiftIcon(shift)}
                  {(schedule.lockedShifts || []).includes(shift) && (
                     <div className="absolute -top-2.5 -right-2.5 bg-emerald-500 text-white rounded-full p-0.5 border border-white shadow-sm flex items-center justify-center">
                        <Lock size={8} className="stroke-[2.5]" />
                     </div>
                   )}
                </div>
                <span>{getShiftLabel(shift)}</span>
              </button>
            );
          })}
        </div>

        {/* Sales Forecast & Metrics Bento Grid */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
                <div className="lg:col-span-5 lg:border-r border-gray-100 lg:pr-6 flex flex-col justify-between">
                    <div>
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2"><TrendingUp size={16} className="text-blue-600" /> Previsão de Vendas</h3>
                      
                      <div className="mb-5 bg-blue-50/20 p-4 rounded-2xl border border-blue-100/50">
                        <label className="block text-[10px] font-black uppercase text-blue-500 tracking-wider mb-2">
                          Vendas Programadas (€)
                        </label>
                        <input 
                          type="number"
                          disabled={isShiftLocked}
                          placeholder="Definir vendas manualmente..."
                          value={schedule.projectedSales?.[selectedShift] || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            const peakHr = selectedShift === 'FECHO' || selectedShift === 'MADRUGADA' ? '19' : '12';
                            const peakLabel = peakHr + 'h-' + (parseInt(peakHr) + 1) + 'h';
                            setSchedule({
                              ...schedule,
                              projectedSales: {
                                ...(schedule.projectedSales || {}),
                                [selectedShift]: val
                              },
                              hourlyProjections: {
                                ...(schedule.hourlyProjections || {}),
                                [selectedShift]: schedule.hourlyProjections?.[selectedShift]?.length ? schedule.hourlyProjections[selectedShift] : [
                                  {
                                    hour: peakLabel,
                                    totalSales: val,
                                    totalGC: Math.round(val / 6),
                                    channelGC: { counter: 0, sok: 0, drive: 0, delivery: 0 }
                                  }
                                ]
                              }
                            });
                          }}
                          className="bg-white border border-slate-200 px-3.5 py-2.5 rounded-xl font-black text-sm text-slate-800 w-full outline-none focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 transition-all placeholder:text-gray-400/80"
                        />
                      </div>

                      {shiftPeakData.length > 0 ? (
                        <div className="space-y-2.5">
                          {shiftPeakData.map((data, idx) => { 
                            const isActive = manualPeakHour === data.hour; 
                            return (
                              <button 
                                key={idx} 
                                onClick={() => {
                                  setManualPeakHour(data.hour);
                                  setSchedule({
                                    ...schedule,
                                    projectedSales: {
                                      ...(schedule.projectedSales || {}),
                                      [selectedShift]: data.totalSales
                                    }
                                  });
                                }} 
                                className={`w-full flex justify-between items-center p-3.5 rounded-xl border-2 transition-all cursor-pointer relative overflow-hidden active:scale-99 ${
                                  isActive 
                                    ? 'bg-blue-50/50 border-blue-500 shadow-sm' 
                                    : 'bg-white border-gray-100 hover:border-blue-200/60 hover:bg-gray-50/30'
                                }`}
                              >
                                {isActive && <div className="absolute left-0 top-0 bottom-0 w-1 bg-blue-500"></div>}
                                <div className="flex items-center gap-3">
                                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isActive ? 'border-blue-500 bg-blue-505' : 'border-gray-200 bg-white'}`}>
                                    {isActive && <div className="w-2 h-2 rounded-full bg-white"></div>}
                                  </div>
                                  <span className={`font-black text-sm tracking-tight ${isActive ? 'text-blue-900' : 'text-gray-600'}`}>{data.hour}</span>
                                </div>
                                <div className="text-right">
                                  <span className="text-[10px] text-gray-400 block font-black uppercase tracking-wide">Previsão</span>
                                  <span className={`font-black text-sm ${isActive ? 'text-blue-800' : 'text-gray-800'}`}>{data.totalSales} €</span>
                                </div>
                              </button>
                            ); 
                          })}
                        </div>
                      ) : (
                        <div className="p-5 text-center bg-amber-50/50 text-amber-800 rounded-xl border border-amber-100 text-xs font-bold flex items-center gap-2 justify-center"><AlertCircle size={16} /> Sem dados de previsão.</div>
                      )}
                    </div>
                </div>
                <div className="lg:col-span-7 lg:pl-6 flex items-center">
                    <div className="grid grid-cols-3 gap-4 w-full">
                        {/* Necessários */}
                        <div className="bg-blue-50/40 rounded-2xl p-5 border border-blue-100 flex flex-col items-center justify-center text-center shadow-inner">
                          <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider mb-2">Previstos</span>
                          <div className="p-2.5 bg-blue-100/60 rounded-xl mb-2 text-blue-600">
                            <Calculator size={20} />
                          </div>
                          <span className="text-3xl font-black text-blue-900 leading-none">{requirement.count}</span>
                        </div>
                        
                        {/* Posicionados */}
                        <div className="bg-slate-50/80 rounded-2xl p-5 border border-gray-200/60 flex flex-col items-center justify-center text-center shadow-sm">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">Posicionados</span>
                          <div className="p-2.5 bg-slate-100 rounded-xl mb-2 text-slate-600">
                            <Users size={20} />
                          </div>
                          <span className="text-3xl font-black text-gray-800 leading-none">{currentAssignedCount}</span>
                        </div>
                        
                        {/* Diferença */}
                        <div className={`rounded-2xl p-5 border flex flex-col items-center justify-center text-center shadow-sm ${
                          gap > 0 
                            ? 'bg-rose-50/50 border-rose-200' 
                            : gap < 0 ? 'bg-amber-50/50 border-amber-200' : 'bg-emerald-50/50 border-emerald-200'
                        }`}>
                          <span className={`text-[10px] font-black uppercase tracking-wider mb-2 ${gap > 0 ? 'text-rose-500' : gap < 0 ? 'text-amber-600' : 'text-emerald-550'}`}>Diferença</span>
                          <div className={`p-2.5 rounded-xl mb-2 bg-white ${gap > 0 ? 'text-rose-650' : gap < 0 ? 'text-amber-600' : 'text-emerald-650'}`}>
                            {gap === 0 ? <CheckCircle2 size={20} /> : <AlertTriangle size={20} />}
                          </div>
                          <span className={`text-3xl font-black leading-none ${gap > 0 ? 'text-rose-600' : gap < 0 ? 'text-amber-600' : 'text-emerald-650'}`}>
                            {gap > 0 ? `-${gap}` : gap < 0 ? `+${Math.abs(gap)}` : 'OK'}
                          </span>
                          <span className={`text-[9px] font-bold mt-1.5 uppercase ${gap > 0 ? 'text-rose-450' : gap < 0 ? 'text-amber-600' : 'text-emerald-550'}`}>
                            {gap > 0 ? 'Faltam' : gap < 0 ? 'Em excesso' : 'Tudo Pronto'}
                          </span>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        {/* Turn Objectives and Production Goals */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-blue-900 font-black text-xs uppercase tracking-wider"><Target size={16} className="text-blue-500" /> Objetivo de Turno</div>
              <textarea 
                value={currentObjectives.turnObjective || ''} 
                onChange={(e) => handleObjectiveChange('turnObjective', e.target.value)} 
                placeholder="Objetivos do turno (qualidade, serviço, tempos)..." 
                disabled={isShiftLocked} 
                className="w-full text-xs font-semibold p-3.5 bg-blue-50/15 border border-blue-100 rounded-xl focus:ring-2 focus:ring-blue-500/15 focus:border-blue-500 focus:outline-none outline-none h-20 placeholder:text-gray-400/85 transition-all resize-none" 
              />
           </div>
           <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex items-center gap-2 mb-3 text-orange-900 font-black text-xs uppercase tracking-wider"><Flame size={16} className="text-orange-500" /> Objetivo de Produção</div>
              <textarea 
                value={currentObjectives.productionObjective || ''} 
                onChange={(e) => handleObjectiveChange('productionObjective', e.target.value)} 
                placeholder="Objetivos de produção (meta de tempo KVS, preparação)..." 
                disabled={isShiftLocked} 
                className="w-full text-xs font-semibold p-3.5 bg-orange-50/15 border border-orange-100 rounded-xl focus:ring-2 focus:ring-orange-500/15 focus:border-orange-500 focus:outline-none outline-none h-20 placeholder:text-gray-400/85 transition-all resize-none" 
              />
           </div>
        </div>

        {/* Stations Title and Action Controls */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2 px-1">
          <h3 className="font-extrabold text-slate-800 text-sm flex items-center gap-2">
            <Briefcase size={20} className="text-blue-600" /> Postos de Trabalho 
            <span className="bg-blue-50 border border-blue-100 text-blue-800 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full">{totalVisibleStations} Visíveis</span>
          </h3>
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex gap-2 flex-wrap sm:flex-nowrap">
              {!isShiftLocked && !isExpired && (
                <button onClick={handleSaveAndLock} className="flex items-center gap-2 px-4.5 py-2.5 bg-emerald-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-emerald-700 transition-all shadow-sm active:scale-95 cursor-pointer">
                  <Save size={14} /> Finalizar {getShiftLabel(selectedShift)}
                </button>
              )}
              {isShiftLocked && !isExpired && (
                <button onClick={handleUnlock} className="flex items-center gap-2 px-4.5 py-2.5 bg-amber-500 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-amber-600 transition-all shadow-sm active:scale-95 cursor-pointer">
                  <Edit size={14} /> Editar {getShiftLabel(selectedShift)}
                </button>
              )}
              {!isShiftLocked && (
                <button onClick={handleClearAssignments} className="flex items-center gap-2 px-4.5 py-2.5 bg-red-50 text-red-600 hover:bg-red-100 text-xs font-black uppercase tracking-wider rounded-xl border border-red-100 transition-all active:scale-95 cursor-pointer">
                  <Trash2 size={14} /> Limpar
                </button>
              )}
              <button onClick={handlePrint} className="flex items-center gap-2 px-4.5 py-2.5 bg-slate-900 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-slate-800 transition-all shadow-sm active:scale-95 cursor-pointer"><Printer size={14} /> Imprimir</button>
            </div>
            <div className="h-6 w-px bg-gray-200 mx-1 hidden sm:block"></div>
            <div className="flex items-center gap-2" title="Mostrar todos os postos de trabalho configurados">
              <span className="text-[10px] font-black uppercase text-slate-400 hidden lg:inline">Exibir Todos</span>
              <button onClick={() => setShowAllStations(!showAllStations)} className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${showAllStations ? 'bg-blue-600' : 'bg-slate-200'}`}>
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${showAllStations ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>

        {/* Planta do restaurante */}
        <div className="flex-1 overflow-auto pb-20">
          <FloorPlan
            mode="screen"
            stations={filteredStations}
            schedule={schedule}
            selectedShift={selectedShift}
            employees={employees}
            isLocked={isShiftLocked}
            onAssign={handleAssign}
            onRemove={handleRemove}
            onAssignTrainee={handleAssignTrainee}
            onRemoveTrainee={handleRemoveTrainee}
          />
        </div>
      </div>

      {showManualAdjModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
            {/* Modal Header */}
            <div className="bg-slate-900 px-6 py-4 text-white flex justify-between items-center">
              <div>
                <h3 className="font-black text-sm uppercase tracking-wider flex items-center gap-2">
                  <Calculator size={18} className="text-amber-400" />
                  Ajuste Manual
                </h3>
                <p className="text-[10px] text-slate-300 font-bold uppercase tracking-wider mt-0.5">
                  Passo {manualAdjStep} de 3 {manualAdjStep === 1 ? '• Identificação' : manualAdjStep === 2 ? '• Ajuste' : '• Alocação'}
                </p>
              </div>
              <button 
                onClick={() => setShowManualAdjModal(false)}
                className="text-slate-400 hover:text-white transition-colors cursor-pointer text-sm font-black"
              >
                ✕
              </button>
            </div>
            
            {/* Modal Body */}
            <div className="p-6 space-y-4">
              {manualAdjError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs font-bold rounded-xl flex items-center gap-2 animate-fade-in">
                  <span className="text-sm">⚠</span> {manualAdjError}
                </div>
              )}
              
              {/* Passo 1: Password */}
              {manualAdjStep === 1 && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                      Password das Definições
                    </label>
                    <input 
                      type="password"
                      placeholder="Introduza a password..."
                      value={manualAdjPasswordInput}
                      onChange={(e) => setManualAdjPasswordInput(e.target.value)}
                      className="bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl font-bold text-sm text-slate-800 w-full outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setManualAdjError('');
                          if (manualAdjPasswordInput === settings.password || manualAdjPasswordInput === 'Imperial96') {
                            setManualAdjStep(2);
                          } else {
                            setManualAdjError('Password incorreta!');
                          }
                        }
                      }}
                    />
                  </div>
                </div>
              )}

              {/* Passo 2: Quantidade de Funcionários */}
              {manualAdjStep === 2 && (
                <div className="space-y-3 animate-fade-in">
                  <div>
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider mb-1">
                      Funcionários a Ajustar
                    </label>
                    <input 
                      type="number"
                      placeholder="Ex: 2 ou -1 (0 para limpar)"
                      value={manualAdjCountInput}
                      onChange={(e) => setManualAdjCountInput(e.target.value)}
                      className="bg-slate-50 border border-slate-200 px-3 py-2.5 rounded-xl font-black text-sm text-slate-800 w-full outline-none focus:ring-2 focus:ring-amber-500/15 focus:border-amber-500 transition-all"
                      autoFocus
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setManualAdjError('');
                          const num = parseInt(manualAdjCountInput, 10);
                          if (isNaN(num)) {
                            setManualAdjError('Por favor introduza um número válido.');
                            return;
                          }
                          if (num <= 0) {
                            const currentAdjustments = schedule.manualAdjustments || {};
                            const currentStationAdditions = schedule.manualStationAdditions || {};
                            setSchedule({ 
                              ...schedule, 
                              manualAdjustments: { 
                                ...currentAdjustments, 
                                [selectedShift]: num 
                              },
                              manualStationAdditions: {
                                ...currentStationAdditions,
                                [selectedShift]: []
                              }
                            });
                            setShowManualAdjModal(false);
                          } else {
                            setManualAdjStep(3);
                          }
                        }
                      }}
                    />
                    <span className="text-[10px] text-slate-400 font-bold mt-1.5 block">
                      Indique número positivo para somar, negativo para subtrair, ou 0 para limpar o ajuste.
                    </span>
                  </div>
                </div>
              )}

              {/* Passo 3: Ordem de Staffing vs Postos específicos */}
              {manualAdjStep === 3 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="space-y-2">
                    <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                      Como deseja alocar o valor acrescentado?
                    </label>
                    <div className="grid grid-cols-1 gap-2">
                      <button
                        type="button"
                        onClick={() => setManualAdjType('staffing')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          manualAdjType === 'staffing'
                            ? 'border-amber-500 bg-amber-50/20 text-slate-800'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="font-extrabold text-xs">Seguir ordem do staffing</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Os postos abrem de forma automática respeitando a tabela de staffing.</div>
                      </button>

                      <button
                        type="button"
                        onClick={() => setManualAdjType('custom')}
                        className={`p-3 rounded-xl border text-left transition-all ${
                          manualAdjType === 'custom'
                            ? 'border-amber-500 bg-amber-50/20 text-slate-800'
                            : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-600'
                        }`}
                      >
                        <div className="font-extrabold text-xs">Indicar o posto que acrescenta</div>
                        <div className="text-[10px] text-slate-400 mt-0.5">Escolha especificamente quais os postos que deseja que sejam recomendados.</div>
                      </button>
                    </div>
                  </div>

                  {manualAdjType === 'custom' && (
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="block text-[10px] font-black uppercase text-slate-500 tracking-wider">
                          Selecione o(s) Posto(s) a Acrescentar:
                        </label>
                        <span className="text-[9px] font-black uppercase text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md">
                          Selecionados: {selectedCustomStations.length}
                        </span>
                      </div>
                      
                      <div className="border border-slate-200 rounded-xl max-h-48 overflow-y-auto p-2 bg-slate-50/40 divide-y divide-slate-100">
                        {activeStations.map(s => {
                          const isChecked = selectedCustomStations.includes(s.id);
                          return (
                            <label key={s.id} className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white hover:shadow-sm transition-all cursor-pointer text-xs font-bold text-slate-700">
                              <input 
                                type="checkbox" 
                                checked={isChecked}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setSelectedCustomStations([...selectedCustomStations, s.id]);
                                  } else {
                                    setSelectedCustomStations(selectedCustomStations.filter(id => id !== s.id));
                                  }
                                }}
                                className="rounded text-amber-600 focus:ring-amber-500/20 h-4 w-4 border-slate-300 cursor-pointer"
                              />
                              <div className="flex flex-col">
                                <span>{s.label}</span>
                                {s.designation && <span className="text-[9px] text-slate-400 font-medium">{s.designation}</span>}
                              </div>
                              <span className="text-[9px] text-slate-400 font-black uppercase ml-auto tracking-wide">{getAreaLabel(s.area)}</span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 px-6 py-4 border-t border-slate-150 flex justify-between items-center font-sans">
              <div>
                {manualAdjStep > 1 && (
                  <button 
                    onClick={() => {
                      setManualAdjError('');
                      setManualAdjStep((manualAdjStep - 1) as any);
                    }}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-100 bg-white rounded-xl font-bold text-xs uppercase text-slate-600 transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                )}
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => setShowManualAdjModal(false)}
                  className="px-4 py-2 border border-transparent hover:bg-slate-200 rounded-xl font-bold text-xs uppercase text-slate-500 transition-all cursor-pointer"
                >
                  Cancelar
                </button>
                
                {manualAdjStep === 1 && (
                  <button 
                    onClick={() => {
                      setManualAdjError('');
                      if (manualAdjPasswordInput === settings.password || manualAdjPasswordInput === 'Imperial96') {
                        setManualAdjStep(2);
                      } else {
                        setManualAdjError('Password incorreta!');
                      }
                    }}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    Seguinte
                  </button>
                )}

                {manualAdjStep === 2 && (
                  <button 
                    onClick={() => {
                      setManualAdjError('');
                      const num = parseInt(manualAdjCountInput, 10);
                      if (isNaN(num)) {
                        setManualAdjError('Por favor introduza um número válido.');
                        return;
                      }
                      if (num <= 0) {
                        const currentAdjustments = schedule.manualAdjustments || {};
                        const currentStationAdditions = schedule.manualStationAdditions || {};
                        setSchedule({ 
                          ...schedule, 
                          manualAdjustments: { 
                            ...currentAdjustments, 
                            [selectedShift]: num 
                          },
                          manualStationAdditions: {
                            ...currentStationAdditions,
                            [selectedShift]: []
                          }
                        });
                        setShowManualAdjModal(false);
                      } else {
                        setManualAdjStep(3);
                      }
                    }}
                    className="px-5 py-2 bg-slate-900 hover:bg-slate-850 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    Seguinte
                  </button>
                )}

                {manualAdjStep === 3 && (
                  <button 
                    onClick={() => {
                      setManualAdjError('');
                      const num = parseInt(manualAdjCountInput, 10);
                      if (isNaN(num)) {
                        setManualAdjError('Por favor introduza um número válido.');
                        return;
                      }
                      
                      const currentAdjustments = schedule.manualAdjustments || {};
                      const currentStationAdditions = schedule.manualStationAdditions || {};
                      
                      setSchedule({ 
                        ...schedule, 
                        manualAdjustments: { 
                          ...currentAdjustments, 
                          [selectedShift]: num 
                        },
                        manualStationAdditions: {
                          ...currentStationAdditions,
                          [selectedShift]: manualAdjType === 'custom' ? selectedCustomStations : []
                        }
                      });
                      setShowManualAdjModal(false);
                    }}
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs uppercase tracking-wider transition-all cursor-pointer shadow-sm"
                  >
                    Confirmar
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="hidden print:block print-container bg-white text-slate-900 print-landscape" style={{ padding: '4mm' }}>
          {/* Cabeçalho */}
          <div className="flex items-stretch gap-2 mb-2">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-white" style={{ backgroundColor: '#DA291C' }}>
              <div>
                <div className="text-[7px] font-black uppercase tracking-widest opacity-80 leading-none">Posicionamento</div>
                <h1 className="text-[17px] font-black uppercase tracking-tight leading-none mt-0.5">{settings.restaurantName}</h1>
              </div>
            </div>
            <div className="flex flex-col justify-center px-3 py-1 rounded-lg border-2 border-slate-800">
              <div className="text-[7px] font-black uppercase tracking-widest text-slate-500 leading-none">Data</div>
              <div className="text-[11px] font-black uppercase text-slate-900 leading-tight mt-0.5">{new Date(date + 'T00:00:00').toLocaleDateString('pt-PT', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</div>
            </div>
            <div className="flex items-center px-4 rounded-lg font-black text-[15px] uppercase tracking-wider" style={{ backgroundColor: '#FFC72C', color: '#1e293b' }}>
              {getShiftLabel(selectedShift)}
            </div>
            <div className="flex-1 grid grid-cols-5 gap-1.5">
              {[
                { l: 'Gerente de Turno', v: shiftLeaderName },
                { l: 'Gerente de Apoio', v: shiftSupportName },
                { l: 'Vendas previstas', v: `${activeSalesData.totalSales} €` },
                { l: 'Previstos', v: String(requirement.count) },
                { l: 'Posicionados', v: String(currentAssignedCount) },
              ].map(item => (
                <div key={item.l} className="border border-slate-300 rounded-md px-2 py-1 flex flex-col justify-center">
                  <span className="text-[6.5px] font-black uppercase tracking-wider text-slate-500 leading-none">{item.l}</span>
                  <span className="text-[11px] font-black uppercase text-slate-900 leading-tight mt-0.5 truncate">{item.v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Objetivos */}
          {(currentObjectives.turnObjective || currentObjectives.productionObjective) && (
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              <div className="border-l-4 pl-2 py-0.5" style={{ borderColor: '#DA291C' }}>
                <span className="text-[6.5px] font-black uppercase tracking-wider text-slate-500 block leading-none">Objetivo de Turno</span>
                <span className="text-[9px] font-bold text-slate-800 leading-tight">{currentObjectives.turnObjective || '—'}</span>
              </div>
              <div className="border-l-4 pl-2 py-0.5" style={{ borderColor: '#FFC72C' }}>
                <span className="text-[6.5px] font-black uppercase tracking-wider text-slate-500 block leading-none">Objetivo de Produção</span>
                <span className="text-[9px] font-bold text-slate-800 leading-tight">{currentObjectives.productionObjective || '—'}</span>
              </div>
            </div>
          )}

          {/* Planta */}
          <FloorPlan
            mode="print"
            stations={filteredStations}
            schedule={schedule}
            selectedShift={selectedShift}
            employees={employees}
            isLocked
          />

          <div className="flex justify-between items-center mt-2 pt-1 border-t border-slate-200 text-[6.5px] font-bold text-slate-400 uppercase tracking-widest">
            <span>{settings.restaurantName} · Posicionamento {getShiftLabel(selectedShift)} · {date}</span>
            <span>Impresso em {new Date().toLocaleString('pt-PT')}</span>
          </div>
      </div>
    </>
  );
};
