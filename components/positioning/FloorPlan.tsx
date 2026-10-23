import React, { useMemo } from 'react';
import {
  BusinessArea,
  Employee,
  FloorPlanLabels,
  FloorPlanStageId,
  FloorPlanZoneId,
  StaffingTableEntry,
  StationAssignment,
  StationConfig,
} from '../../types';
import {
  buildStationPriorityMap,
  isZoneVisibleForBusinessAreas,
  resolveCounterStage,
  resolveFloorPlanLabels,
  resolveKitchenStage,
  resolveStationLine,
  resolveStationZone,
  sortStationsByPriority,
} from '../../utils/floorPlanLayout';
import { Pencil, Plus } from 'lucide-react';

export interface FloorPlanSlotClickPayload {
  station: StationConfig;
  slotIndex: number;
}

interface FloorPlanProps {
  stations: StationConfig[];
  staffingTable: StaffingTableEntry[];
  businessAreas: BusinessArea[];
  assignments: StationAssignment;
  trainees: StationAssignment;
  employees: Employee[];
  floorPlanLabels?: FloorPlanLabels;
  printMode?: boolean;
  onSlotClick?: (payload: FloorPlanSlotClickPayload) => void;
  onEditZoneClick?: (zoneId: FloorPlanZoneId) => void;
  onAddStationToZone?: (zoneId: FloorPlanZoneId) => void;
}

export const FloorPlan: React.FC<FloorPlanProps> = ({
  stations,
  staffingTable,
  businessAreas,
  assignments,
  trainees,
  employees,
  floorPlanLabels,
  printMode = false,
  onSlotClick,
  onEditZoneClick,
  onAddStationToZone,
}) => {
  const labels = useMemo(() => resolveFloorPlanLabels(floorPlanLabels), [floorPlanLabels]);

  const employeeMap = useMemo(() => {
    const map = new Map<string, Employee>();
    employees.forEach(e => map.set(e.id, e));
    return map;
  }, [employees]);

  const priorityMap = useMemo(
    () => buildStationPriorityMap(stations, staffingTable),
    [stations, staffingTable]
  );

  const activeStations = useMemo(
    () =>
      stations.filter(
        s => s.isActive && isZoneVisibleForBusinessAreas(resolveStationZone(s), businessAreas)
      ),
    [stations, businessAreas]
  );

  const stationsByZone = useMemo(() => {
    const grouped: Record<FloorPlanZoneId, StationConfig[]> = {
      grills: [],
      kitchen: [],
      fryers: [],
      beverage: [],
      cashier: [],
      counter: [],
      fries: [],
      delivery: [],
      lobby: [],
      drive: [],
      mccafe: [],
    };
    activeStations.forEach(s => {
      grouped[resolveStationZone(s)].push(s);
    });
    (Object.keys(grouped) as FloorPlanZoneId[]).forEach(z => {
      grouped[z] = sortStationsByPriority(grouped[z], priorityMap);
    });
    return grouped;
  }, [activeStations, priorityMap]);

  const getZoneCounts = (list: StationConfig[]) => {
    let filled = 0;
    let total = 0;
    list.forEach(st => {
      const slots = Math.max(1, st.defaultSlots || 1);
      total += slots;
      const assigned = (assignments[st.id] || []).slice(0, slots).filter(Boolean).length;
      filled += assigned;
    });
    return { filled, total };
  };

  const renderZoneHeader = (
    zoneId: FloorPlanZoneId,
    title: string,
    subtitle: string,
    list: StationConfig[]
  ) => {
    const { filled, total } = getZoneCounts(list);
    const badgeText = total > 0 ? `${filled} / até ${total}` : '0';

    return (
      <div
        className={`bg-[#DA291C] text-white flex items-center justify-between gap-2 select-none ${
          printMode ? 'px-2.5 py-1' : 'px-3 py-1.5'
        }`}
      >
        <div className="min-w-0 flex items-baseline gap-1.5 flex-1 overflow-hidden">
          <span
            className={`font-black uppercase tracking-wide text-white shrink-0 ${
              printMode ? 'text-[10.5px] leading-tight' : 'text-xs leading-tight'
            }`}
          >
            {title}
          </span>
          {subtitle ? (
            <span
              className={`font-semibold text-white/90 truncate ${
                printMode ? 'text-[9.5px]' : 'text-[11px]'
              }`}
              title={subtitle}
            >
              {subtitle}
            </span>
          ) : null}
          {!printMode && onEditZoneClick && (
            <button
              type="button"
              onClick={e => {
                e.stopPropagation();
                onEditZoneClick(zoneId);
              }}
              title={`Editar nome ou postos de ${title}`}
              className="ml-0.5 p-0.5 rounded text-white/70 hover:text-white hover:bg-white/15 transition-colors shrink-0 no-print"
            >
              <Pencil className="w-3 h-3" />
            </button>
          )}
        </div>

        <span
          className={`shrink-0 bg-[#FFC72C] text-slate-950 font-black rounded-full whitespace-nowrap shadow-2xs ${
            printMode ? 'text-[9px] px-2 py-0.5 leading-none' : 'text-[11px] px-2.5 py-0.5 leading-none'
          }`}
        >
          {badgeText}
        </span>
      </div>
    );
  };

  const renderStationCard = (station: StationConfig) => {
    const slotCount = Math.max(1, station.defaultSlots || 1);
    const assignedIds = assignments[station.id] || [];
    const traineeIds = trainees[station.id] || [];
    const filledCount = Array.from({ length: slotCount }, (_, i) => assignedIds[i]).filter(Boolean).length;
    const isFilled = filledCount > 0;
    const priorityRank = priorityMap.get(station.id);
    const shortCode = (station.designation || station.label).toUpperCase();

    return (
      <div
        key={station.id}
        className={`rounded-md overflow-hidden bg-white dark:bg-slate-900 print:bg-white transition-all ${
          isFilled
            ? 'border-[1.5px] border-[#DA291C] shadow-2xs'
            : 'border border-slate-300 dark:border-slate-700 print:border-slate-300'
        }`}
      >
        {/* Station Card Header */}
        <div
          className={`flex items-center justify-between gap-1.5 ${
            isFilled ? 'bg-[#DA291C] text-white' : 'bg-[#6B7280] text-white'
          } ${printMode ? 'px-1.5 py-0.5' : 'px-2 py-1'}`}
        >
          <div className="min-w-0 flex items-center gap-1.5 flex-1">
            {priorityRank !== undefined && (
              <span
                className={`shrink-0 rounded font-black tabular-nums text-center bg-white ${
                  isFilled ? 'text-[#DA291C]' : 'text-slate-800'
                } ${
                  printMode
                    ? 'text-[8.5px] leading-none px-1 py-0.5 min-w-[16px]'
                    : 'text-[10px] leading-none px-1.5 py-0.5 min-w-[20px]'
                }`}
              >
                {priorityRank}
              </span>
            )}
            <span
              style={{ letterSpacing: '0.02em', wordSpacing: '0.1em' }}
              className={`font-extrabold uppercase text-white leading-tight break-words ${
                printMode ? 'text-[8.5px]' : 'text-[11px]'
              }`}
              title={`${station.label} (${shortCode})`}
            >
              {shortCode}
            </span>
          </div>

          <span
            className={`shrink-0 bg-[#FFC72C] text-slate-950 font-black rounded px-1.5 py-0.5 leading-none tabular-nums ${
              printMode ? 'text-[8px]' : 'text-[10px]'
            }`}
          >
            {filledCount}/{slotCount}
          </span>
        </div>

        {/* Station Card Slots */}
        <div className={printMode ? 'p-1 space-y-0.5' : 'p-1.5 space-y-1'}>
          {Array.from({ length: slotCount }).map((_, slotIdx) => {
            const empId = assignedIds[slotIdx] || '';
            const traineeId = traineeIds[slotIdx] || '';
            const emp = empId ? employeeMap.get(empId) : undefined;
            const traineeEmp = traineeId ? employeeMap.get(traineeId) : undefined;

            if (printMode) {
              return (
                <div
                  key={slotIdx}
                  className={`flex flex-col items-center justify-center text-center rounded ${
                    emp
                      ? 'min-h-[18px] px-1 py-0.5 bg-white'
                      : 'min-h-[18px] px-1 py-0.5 border border-dashed border-slate-300 bg-slate-50/40'
                  }`}
                >
                  {emp ? (
                    <>
                      <span
                        style={{ letterSpacing: '0.02em', wordSpacing: '0.14em' }}
                        className="text-[8.5px] font-black uppercase text-slate-950 leading-[1.15] break-words w-full"
                      >
                        {emp.name}
                      </span>
                      {traineeEmp && (
                        <span
                          style={{ letterSpacing: '0.015em', wordSpacing: '0.12em' }}
                          className="text-[7px] font-bold uppercase text-amber-800 bg-amber-50 border border-amber-300 rounded px-1 mt-0.5 leading-tight break-words max-w-full"
                        >
                          Form: {traineeEmp.name}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[8.5px] font-bold text-slate-300 leading-none">—</span>
                  )}
                </div>
              );
            }

            return (
              <button
                key={slotIdx}
                type="button"
                onClick={() => onSlotClick?.({ station, slotIndex: slotIdx })}
                className={`w-full flex flex-col items-center justify-center text-center rounded transition-colors cursor-pointer ${
                  emp
                    ? 'min-h-[30px] px-1.5 py-1 bg-white dark:bg-slate-900 hover:bg-red-50/60 dark:hover:bg-slate-800'
                    : 'min-h-[30px] px-1.5 py-1 border border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/40 dark:bg-slate-800/40 hover:border-slate-500 hover:bg-slate-100/70'
                }`}
              >
                {emp ? (
                  <>
                    <span
                      style={{ letterSpacing: '0.02em', wordSpacing: '0.14em' }}
                      className="text-[11px] font-extrabold uppercase text-slate-950 dark:text-white leading-tight break-words w-full"
                    >
                      {emp.name}
                    </span>
                    {traineeEmp && (
                      <span
                        style={{ letterSpacing: '0.015em', wordSpacing: '0.12em' }}
                        className="text-[9.5px] font-bold uppercase text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/50 border border-amber-300 dark:border-amber-700 rounded px-1.5 py-0.5 mt-0.5 leading-tight break-words max-w-full"
                      >
                        Form: {traineeEmp.name}
                      </span>
                    )}
                  </>
                ) : (
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 leading-none">
                    — Selecionar —
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEmptyZoneBody = (zoneId: FloorPlanZoneId) => (
    <div
      className={`flex-1 flex flex-col items-center justify-center rounded-md border border-dashed border-slate-300 dark:border-slate-700 print:border-slate-300 text-center ${
        printMode ? 'm-1.5 min-h-[70px] p-2' : 'm-2.5 min-h-[120px] p-3 gap-2'
      }`}
    >
      <span
        className={`font-bold uppercase tracking-wider text-slate-400 ${
          printMode ? 'text-[8.5px]' : 'text-[11px]'
        }`}
      >
        SEM POSTOS
      </span>
      {!printMode && onAddStationToZone && (
        <button
          type="button"
          onClick={() => onAddStationToZone(zoneId)}
          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors no-print"
        >
          <Plus className="w-3 h-3" /> Adicionar Posto
        </button>
      )}
    </div>
  );

  const renderSimpleZone = (
    zoneId: FloorPlanZoneId,
    title: string,
    subtitle: string,
    className = ''
  ) => {
    const list = stationsByZone[zoneId];
    return (
      <div
        className={`flex flex-col rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 print:border-slate-400 bg-white dark:bg-slate-900 print:bg-white shadow-2xs ${className}`}
      >
        {renderZoneHeader(zoneId, title, subtitle, list)}
        {list.length === 0 ? (
          renderEmptyZoneBody(zoneId)
        ) : (
          <div className={printMode ? 'p-1.5 space-y-1.5 flex-1' : 'p-2.5 space-y-2 flex-1'}>
            {list.map(s => renderStationCard(s))}
          </div>
        )}
      </div>
    );
  };

  const renderDualLineZone = (
    zoneId: 'kitchen' | 'counter',
    title: string,
    subtitle: string,
    stages: { id: FloorPlanStageId; label: string }[]
  ) => {
    const list = stationsByZone[zoneId];
    const stageResolver = zoneId === 'kitchen' ? resolveKitchenStage : resolveCounterStage;

    return (
      <div className="flex flex-col rounded-lg overflow-hidden border border-slate-300 dark:border-slate-700 print:border-slate-400 bg-white dark:bg-slate-900 print:bg-white shadow-2xs h-full">
        {renderZoneHeader(zoneId, title, subtitle, list)}

        <div className={printMode ? 'p-1.5 space-y-1.5 flex-1' : 'p-2.5 space-y-2 flex-1'}>
          {/* LINHA 1 / LINHA 2 Header Row aligned exactly with the 2 columns after the vertical stage rail */}
          <div
            className={`grid items-center ${
              printMode ? 'grid-cols-[20px_1fr_1fr] gap-1.5' : 'grid-cols-[26px_1fr_1fr] gap-2.5'
            }`}
          >
            <div />
            <div
              className={`bg-slate-100 dark:bg-slate-800 print:bg-slate-100 border border-slate-200 dark:border-slate-700 print:border-slate-300 rounded text-center font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 print:text-slate-900 ${
                printMode ? 'py-0.5 text-[8.5px]' : 'py-1 text-[11px]'
              }`}
            >
              {labels.line1Label}
            </div>
            <div
              className={`bg-slate-100 dark:bg-slate-800 print:bg-slate-100 border border-slate-200 dark:border-slate-700 print:border-slate-300 rounded text-center font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 print:text-slate-900 ${
                printMode ? 'py-0.5 text-[8.5px]' : 'py-1 text-[11px]'
              }`}
            >
              {labels.line2Label}
            </div>
          </div>

          {/* Stage Rows with Red Vertical Rail */}
          {stages.map(stage => {
            const stageStations = list.filter(s => stageResolver(s) === stage.id);
            const line1Stations = stageStations.filter(s => resolveStationLine(s) === 1);
            const line2Stations = stageStations.filter(s => resolveStationLine(s) === 2);

            if (stageStations.length === 0) return null;

            return (
              <div
                key={stage.id}
                className={`grid items-stretch rounded-md border border-slate-200/90 dark:border-slate-700/80 print:border-slate-200 overflow-hidden bg-slate-50/40 dark:bg-slate-800/20 print:bg-slate-50/30 ${
                  printMode ? 'grid-cols-[20px_1fr_1fr]' : 'grid-cols-[26px_1fr_1fr]'
                }`}
              >
                {/* Left Vertical Red Stage Rail */}
                <div className="bg-[#DA291C] text-white flex items-center justify-center py-1 select-none">
                  <span
                    style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
                    className={`font-black uppercase tracking-wider whitespace-nowrap leading-none ${
                      printMode ? 'text-[7.5px]' : 'text-[9.5px]'
                    }`}
                  >
                    {stage.label}
                  </span>
                </div>

                {/* Line 1 Column */}
                <div
                  className={
                    printMode
                      ? 'p-1 space-y-1 border-r border-slate-200/80'
                      : 'p-1.5 space-y-1.5 border-r border-slate-200/80 dark:border-slate-700/60'
                  }
                >
                  {line1Stations.map(s => renderStationCard(s))}
                </div>

                {/* Line 2 Column */}
                <div className={printMode ? 'p-1 space-y-1' : 'p-1.5 space-y-1.5'}>
                  {line2Stations.map(s => renderStationCard(s))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const showDelivery = businessAreas.includes('Delivery');
  const showDrive = businessAreas.includes('Drive') && stationsByZone.drive.length > 0;
  const showMcCafe = businessAreas.includes('McCafé') && stationsByZone.mccafe.length > 0;

  return (
    <div className={printMode ? 'space-y-2' : 'space-y-3'}>
      {/* BAND 1: GRELHADORES (3) | COZINHA · Produção (6) | FRITADEIRAS (3) */}
      <div
        className={`grid grid-cols-1 ${
          printMode ? 'grid-cols-12 gap-2' : 'lg:grid-cols-12 gap-3'
        } items-stretch`}
      >
        <div className={printMode ? 'col-span-3 flex flex-col' : 'lg:col-span-3 flex flex-col'}>
          {renderSimpleZone('grills', labels.grillsTitle, labels.grillsSubtitle, 'h-full')}
        </div>

        <div className={printMode ? 'col-span-6 flex flex-col' : 'lg:col-span-6 flex flex-col'}>
          {renderDualLineZone('kitchen', labels.kitchenTitle, labels.kitchenSubtitle, [
            { id: 'iniciador', label: labels.stageIniciador },
            { id: 'preparador', label: labels.stagePreparador },
            { id: 'finalizador', label: labels.stageFinalizador },
          ])}
        </div>

        <div className={printMode ? 'col-span-3 flex flex-col' : 'lg:col-span-3 flex flex-col'}>
          {renderSimpleZone('fryers', labels.fryersTitle, labels.fryersSubtitle, 'h-full')}
        </div>
      </div>

      {/* BAND 2 + BAND 3:
          Left (3 cols): BEBIDAS + CAIXA stacked
          Right (9 cols):
            - Upper row: BALCÃO · Serviço (6 cols) + [BATATEIRA + DELIVERY] (3 cols)
            - Bottom row: SALA spanning full 9 cols (+ Drive / McCafé if active) */}
      <div
        className={`grid grid-cols-1 ${
          printMode ? 'grid-cols-12 gap-2' : 'lg:grid-cols-12 gap-3'
        } items-stretch`}
      >
        {/* Left 3 Columns: BEBIDAS + CAIXA */}
        <div
          className={
            printMode
              ? 'col-span-3 flex flex-col gap-2'
              : 'lg:col-span-3 flex flex-col gap-3'
          }
        >
          {renderSimpleZone('beverage', labels.beverageTitle, labels.beverageSubtitle)}
          {renderSimpleZone('cashier', labels.cashierTitle, labels.cashierSubtitle, 'flex-1')}
        </div>

        {/* Right 9 Columns: Upper [BALCÃO (6) + BATATEIRA/DELIVERY (3)] + Bottom [SALA (9)] */}
        <div
          className={
            printMode
              ? 'col-span-9 flex flex-col gap-2'
              : 'lg:col-span-9 flex flex-col gap-3'
          }
        >
          <div
            className={`grid grid-cols-1 ${
              printMode ? 'grid-cols-9 gap-2' : 'lg:grid-cols-9 gap-3'
            } items-stretch`}
          >
            <div className={printMode ? 'col-span-6 flex flex-col' : 'lg:col-span-6 flex flex-col'}>
              {renderDualLineZone('counter', labels.counterTitle, labels.counterSubtitle, [
                { id: 'expedidor', label: labels.stageExpedidor },
                { id: 'runner', label: labels.stageRunner },
                { id: 'apresentador', label: labels.stageApresentador },
              ])}
            </div>

            <div
              className={
                printMode
                  ? 'col-span-3 flex flex-col gap-2'
                  : 'lg:col-span-3 flex flex-col gap-3'
              }
            >
              {renderSimpleZone('fries', labels.friesTitle, labels.friesSubtitle)}
              {showDelivery &&
                renderSimpleZone('delivery', labels.deliveryTitle, labels.deliverySubtitle, 'flex-1')}
            </div>
          </div>

          {/* Bottom Row: SALA spanning cleanly across all 9 columns (or shared with Drive / McCafé if active) */}
          <div
            className={`grid grid-cols-1 ${
              showDrive && showMcCafe
                ? printMode
                  ? 'grid-cols-3 gap-2'
                  : 'lg:grid-cols-3 gap-3'
                : showDrive || showMcCafe
                ? printMode
                  ? 'grid-cols-2 gap-2'
                  : 'lg:grid-cols-2 gap-3'
                : 'grid-cols-1'
            }`}
          >
            {renderSimpleZone('lobby', labels.lobbyTitle, labels.lobbySubtitle)}
            {showDrive && renderSimpleZone('drive', labels.driveTitle, '')}
            {showMcCafe && renderSimpleZone('mccafe', labels.mccafeTitle, '')}
          </div>
        </div>
      </div>
    </div>
  );
};
