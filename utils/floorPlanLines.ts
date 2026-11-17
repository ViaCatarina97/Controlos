import {
  FloorPlanLabels,
  FloorPlanStageId,
  StationConfig,
} from '../types';

export const MAX_FLOOR_PLAN_LINES = 4;

export interface LineStageOption {
  id: FloorPlanStageId;
  short: string;
  labelKey: keyof FloorPlanLabels;
}

export const KITCHEN_LINE_STAGES: LineStageOption[] = [
  { id: 'iniciador', short: 'INI', labelKey: 'stageIniciador' },
  { id: 'preparador', short: 'PREP', labelKey: 'stagePreparador' },
  { id: 'finalizador', short: 'FIN', labelKey: 'stageFinalizador' },
];

export const SERVICE_LINE_STAGES: LineStageOption[] = [
  { id: 'expedidor', short: 'EXP', labelKey: 'stageExpedidor' },
  { id: 'runner', short: 'RUN', labelKey: 'stageRunner' },
  { id: 'apresentador', short: 'APR', labelKey: 'stageApresentador' },
];

export type LineZone = 'kitchen' | 'counter';

export const lineStagesFor = (zone: LineZone): LineStageOption[] =>
  zone === 'kitchen' ? KITCHEN_LINE_STAGES : SERVICE_LINE_STAGES;

export const lineStationPrefix = (zone: LineZone) => (zone === 'kitchen' ? 'line_p' : 'line_s');

export const isLineStationId = (id: string) => /^line_[ps]\d+_/.test(id);

export const lineNumber = (line: number) => Math.min(MAX_FLOOR_PLAN_LINES, Math.max(1, Math.floor(line) || 1));
