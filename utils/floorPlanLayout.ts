import {
  BusinessArea,
  FloorPlanLabels,
  FloorPlanStageId,
  FloorPlanZoneId,
  StaffingTableEntry,
  StationConfig,
} from '../types';

export const DEFAULT_FLOOR_PLAN_LABELS: Required<FloorPlanLabels> = {
  grillsTitle: 'GRELHADORES',
  grillsSubtitle: '',
  kitchenTitle: 'COZINHA',
  kitchenSubtitle: 'Produção',
  fryersTitle: 'FRITADEIRAS',
  fryersSubtitle: '',
  beverageTitle: 'BEBIDAS',
  beverageSubtitle: '',
  cashierTitle: 'CAIXA',
  cashierSubtitle: '',
  counterTitle: 'BALCÃO',
  counterSubtitle: 'Serviço',
  friesTitle: 'BATATEIRA',
  friesSubtitle: '',
  deliveryTitle: 'DELIVERY',
  deliverySubtitle: '',
  lobbyTitle: 'SALA',
  lobbySubtitle: '',
  driveTitle: 'DRIVE-THRU',
  mccafeTitle: 'McCAFÉ',
  line1Label: 'LINHA 1',
  line2Label: 'LINHA 2',
  stageIniciador: 'INICIADOR',
  stagePreparador: 'PREPARADOR',
  stageFinalizador: 'FINALIZADOR',
  stageExpedidor: 'EXPEDIDOR',
  stageRunner: 'RUNNER',
  stageApresentador: 'APRESENTADOR',
};

export const FLOOR_PLAN_ZONE_OPTIONS: {
  id: FloorPlanZoneId;
  label: string;
  defaultArea: StationConfig['area'];
  hasLines?: boolean;
}[] = [
  { id: 'grills', label: 'Grelhadores (Batch Cookers)', defaultArea: 'kitchen' },
  { id: 'kitchen', label: 'Cozinha · Produção (Linhas 1/2)', defaultArea: 'kitchen', hasLines: true },
  { id: 'fryers', label: 'Fritadeiras', defaultArea: 'fryers' },
  { id: 'beverage', label: 'Bebidas', defaultArea: 'beverage' },
  { id: 'cashier', label: 'Caixa', defaultArea: 'cashier' },
  { id: 'counter', label: 'Balcão · Serviço (Linhas 1/2)', defaultArea: 'counter', hasLines: true },
  { id: 'fries', label: 'Batateira', defaultArea: 'fries' },
  { id: 'delivery', label: 'Delivery', defaultArea: 'delivery' },
  { id: 'lobby', label: 'Sala / RP', defaultArea: 'lobby' },
  { id: 'drive', label: 'Drive-Thru', defaultArea: 'drive' },
  { id: 'mccafe', label: 'McCafé', defaultArea: 'mccafe' },
];

export const KITCHEN_STAGE_OPTIONS: { id: FloorPlanStageId; labelKey: keyof FloorPlanLabels; defaultLabel: string }[] = [
  { id: 'iniciador', labelKey: 'stageIniciador', defaultLabel: 'INICIADOR' },
  { id: 'preparador', labelKey: 'stagePreparador', defaultLabel: 'PREPARADOR' },
  { id: 'finalizador', labelKey: 'stageFinalizador', defaultLabel: 'FINALIZADOR' },
];

export const COUNTER_STAGE_OPTIONS: { id: FloorPlanStageId; labelKey: keyof FloorPlanLabels; defaultLabel: string }[] = [
  { id: 'expedidor', labelKey: 'stageExpedidor', defaultLabel: 'EXPEDIDOR' },
  { id: 'runner', labelKey: 'stageRunner', defaultLabel: 'RUNNER' },
  { id: 'apresentador', labelKey: 'stageApresentador', defaultLabel: 'APRESENTADOR' },
];

export function resolveFloorPlanLabels(custom?: FloorPlanLabels): Required<FloorPlanLabels> {
  return {
    ...DEFAULT_FLOOR_PLAN_LABELS,
    ...(custom || {}),
  };
}

export function normalizeKey(str?: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Computes the exact 1..N staffing priority badge number for every station
 * by matching sorted `staffingTable` entries against `stations` (including historic aliases
 * like "Delivery 1" -> "Delivery Prep", "Salão 1" -> "Salão", "Salão 2" -> "RP 2").
 */
export function buildStationPriorityMap(
  stations: StationConfig[],
  staffingTable: StaffingTableEntry[]
): Map<string, number> {
  const priorityMap = new Map<string, number>();
  // Staffing renders the table ordered by minSales. Mirror that exact progression here;
  // keep stable source order for equal thresholds (especially the three 0€ opening posts).
  const sortedRules = [...staffingTable].sort((a, b) => a.minSales - b.minSales);

  const usedStationIds = new Set<string>();

  const ALIAS_KEYS: Record<string, string[]> = {
    'delivery 1': ['delivery prep', 'del prep', 'dl_pre', 'dlv 1'],
    'delivery prep': ['delivery 1', 'del prep', 'dl_pre'],
    'salao 1': ['salao', 'lb_sal_1'],
    salao: ['salao 1', 'lb_sal_1'],
    'salao 2': ['rp 2', 'lb_rp_2'],
    'rp 2': ['salao 2', 'lb_rp_2'],
    'preparador 3': ['pre 3', 'prep 3'],
    'preparador 4': ['pre 4', 'prep 4'],
  };

  sortedRules.forEach((rule, index) => {
    const rank = index + 1;
    const ruleKey = normalizeKey(rule.stationLabel);
    if (!ruleKey) return;

    const candidateKeys = [ruleKey, ...(ALIAS_KEYS[ruleKey] || [])];

    const compactKey = (value: string) => value.replace(/[^a-z0-9]/g, '');
    const compactCandidates = candidateKeys.map(compactKey);
    const matched = stations.find(s => {
      if (usedStationIds.has(s.id)) return false;
      const stationKeys = [normalizeKey(s.label), normalizeKey(s.designation), normalizeKey(s.id)];
      return candidateKeys.some(k => stationKeys.includes(k)) ||
        compactCandidates.some(k => stationKeys.some(stationKey => compactKey(stationKey) === k));
    });

    if (matched) {
      usedStationIds.add(matched.id);
      priorityMap.set(matched.id, rank);
    }
  });

  return priorityMap;
}

export function resolveStationZone(station: StationConfig): FloorPlanZoneId {
  if (station.zoneOverride) return station.zoneOverride;

  const combined = `${station.designation || ''} ${station.label || ''} ${station.id || ''}`;

  if (station.area === 'fryers') return 'fryers';
  if (station.area === 'cashier') return 'cashier';
  if (station.area === 'beverage') return 'beverage';
  if (station.area === 'fries') return 'fries';
  if (station.area === 'delivery') return 'delivery';
  if (station.area === 'lobby') return 'lobby';
  if (station.area === 'drive') return 'drive';
  if (station.area === 'mccafe') return 'mccafe';

  if (station.area === 'kitchen') {
    if (/\bbc\b|\bbc\s*\d|batch|grelha/i.test(combined)) return 'grills';
    if (/fritad|fritos|fried|mcnugget/i.test(combined)) return 'fryers';
    return 'kitchen';
  }

  if (station.area === 'counter') {
    if (/\bcx\b|\bcx\s*\d|\bcax|caixa/i.test(combined)) return 'cashier';
    return 'counter';
  }

  return 'counter';
}

export function resolveKitchenStage(station: StationConfig): 'iniciador' | 'preparador' | 'finalizador' {
  if (
    station.stageOverride === 'iniciador' ||
    station.stageOverride === 'preparador' ||
    station.stageOverride === 'finalizador'
  ) {
    return station.stageOverride;
  }

  const combined = `${station.designation || ''} ${station.label || ''} ${station.id || ''}`;
  if (/\bini|iniciad/i.test(combined)) return 'iniciador';
  if (/\bpre\b|\bpre\s*\d|\bprep|preparad|montag/i.test(combined)) return 'preparador';
  return 'finalizador';
}

export function resolveCounterStage(station: StationConfig): 'expedidor' | 'runner' | 'apresentador' {
  if (
    station.stageOverride === 'expedidor' ||
    station.stageOverride === 'runner' ||
    station.stageOverride === 'apresentador'
  ) {
    return station.stageOverride;
  }

  const combined = `${station.designation || ''} ${station.label || ''} ${station.id || ''}`;
  if (/\bexp|expedid/i.test(combined)) return 'expedidor';
  if (/\brun|runner/i.test(combined)) return 'runner';
  return 'apresentador';
}

export function resolveStationLine(station: StationConfig): 1 | 2 {
  if (station.lineOverride === 1 || station.lineOverride === 2) {
    return station.lineOverride;
  }

  const match = `${station.designation || ''} ${station.label || ''}`.match(/(\d+)/);
  if (match) {
    const num = parseInt(match[1], 10);
    return num % 2 === 0 ? 2 : 1;
  }
  return 1;
}

export function isZoneVisibleForBusinessAreas(zone: FloorPlanZoneId, businessAreas: BusinessArea[]): boolean {
  if (zone === 'delivery') return businessAreas.includes('Delivery');
  if (zone === 'drive') return businessAreas.includes('Drive');
  if (zone === 'mccafe') return businessAreas.includes('McCafé');
  return businessAreas.includes('Loja');
}

export function sortStationsByPriority(
  list: StationConfig[],
  priorityMap: Map<string, number>
): StationConfig[] {
  return [...list].sort((a, b) => {
    const pa = priorityMap.get(a.id) ?? 9999;
    const pb = priorityMap.get(b.id) ?? 9999;
    if (pa !== pb) return pa - pb;
    return (a.designation || a.label).localeCompare(b.designation || b.label, 'pt-PT', { numeric: true });
  });
}
