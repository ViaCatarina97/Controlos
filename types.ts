
export type RoleType = 'GERENTE_RESTAURANTE' | 'GERENTE' | 'TREINADOR' | 'RP' | 'FUNCIONÁRIO';

export interface Employee {
  id: string;
  name: string;
  role: RoleType;
  isActive: boolean;
  mecanografico?: string;
}

export type RestaurantTypology = 'Loja de Rua' | 'Drive' | 'Shopping';
export type BusinessArea = 'Loja' | 'Drive' | 'Delivery' | 'McCafé';
export type ShiftType = 'ABERTURA' | 'INTERMEDIO' | 'FECHO' | 'MADRUGADA';

export interface StationConfig {
  id: string;
  label: string;
  designation?: string;
  icon: string;
  defaultSlots: number;
  area: 'kitchen' | 'delivery' | 'lobby' | 'beverage' | 'drive' | 'mccafe' | 'fries' | 'counter'; 
  isActive: boolean; 
}

export interface AppSettings {
  restaurantId: string;
  restaurantName: string;
  restaurantType: RestaurantTypology;
  username: string; 
  password: string;
  activeShifts: ShiftType[]; 
  businessAreas: BusinessArea[]; 
  customStations: StationConfig[]; 
  fundoGavetaCount?: number;
  fundoGavetaValue?: number;
}

export interface StaffingTableEntry {
  id: string;
  minSales: number;
  maxSales: number;
  staffCount: number;
  stationLabel: string; 
}

export interface HourlyProjection {
  hour: string; 
  totalSales: number;
  totalGC: number;
  channelGC: {
    counter: number;
    sok: number; 
    drive: number; 
    delivery: number;
  };
}

export interface TimeSlotMetrics {
  sales: number;
  gc: number;
}

export interface HistoryEntry {
  id: string;
  date: string;
  dayOfWeek: number; 
  totalSales: number;
  totalGC: number;
  slots: {
    [key: string]: TimeSlotMetrics; 
  };
}

export interface StationAssignment {
  [stationId: string]: string[]; 
}

export interface DailySchedule {
  date: string;
  shifts: {
    [key in ShiftType]?: StationAssignment; 
  };
  trainees?: {
    [key in ShiftType]?: StationAssignment;
  };
  shiftManagers?: {
    [key in ShiftType]?: {
      leader?: string;
      support?: string;
    }; 
  };
  hourlyProjections?: {
    [key in ShiftType]?: HourlyProjection[];
  };
  projectedSales?: {
    [key in ShiftType]?: number;
  };
  manualAdjustments?: {
    [key in ShiftType]?: number;
  };
  manualStationAdditions?: {
    [key in ShiftType]?: string[];
  };
  shiftManagersCounted?: boolean;
  shiftObjectives?: {
    [key in ShiftType]?: {
       turnObjective?: string;
       productionObjective?: string;
    };
  };
  notes?: string;
  lockedShifts?: ShiftType[]; 
}

// --- Sync Types ---
export interface RestaurantDataSnapshot {
  settings: AppSettings;
  employees: Employee[];
  staffingTable: StaffingTableEntry[];
  history: HistoryEntry[];
  schedules: DailySchedule[];
  lastUpdated: string;
}

// --- Billing Types ---
export interface HaviInvoiceGroup {
  group: string;
  description: string;
  total: number;
}

export interface SmsValue {
  description: string;
  amount: number;
}

export interface PriceDifferenceItem {
  id: string;
  category: string;
  product: string;
  priceHavi: number;
  priceSms: number;
  haviGroup?: string;
}

export interface MissingProduct {
  id: string;
  product: string;
  group: string;
  priceHavi: number;
  reason: string;
}

export interface DeliveryRecord {
  id: string;
  date: string;
  managerId: string;
  haviGroups: HaviInvoiceGroup[];
  pontoVerde: number;
  smsValues: SmsValue[];
  priceDifferences: PriceDifferenceItem[];
  missingProducts: MissingProduct[];
  comments: string;
  isFinalized: boolean;
  isManualInsertion?: boolean;
  manualHaviValues?: Record<string, number>;
}

export interface CreditNoteRecord {
  id: string;
  date: string;
  invoiceNumber: string;
  value: number;
  reason: string;
  status: 'Pendente' | 'Recebido';
  product?: string;
  quantity?: number;
  haviGroup?: string;
  myStoreGroup?: string;
  managerId?: string;
  valueHavi?: number;
  valueMyStore?: number;
}

// --- Finance Types ---
export interface FinanceInvoice {
  id: string;
  number: string;
  supplier: string;
  amount: number;
  category?: string;
  status?: 'aberta' | 'arquivada';
  archivedBy?: string;
  archivedAt?: string;
}

export interface FundoCofrePart {
  moedas: {
    '0.05': number;
    '0.10': number;
    '0.20': number;
    '0.50': number;
    '1.00': number;
    loose: number; // Moedas Soltas (loose coins)
  };
  notas: {
    '5': number;
    '10': number;
    '20': number;
    '50': number;
    '100': number;
    '200': number;
  };
  totalCoins: number;
  totalNotes: number;
  total: number;
}

export interface CofreCount {
  id: string;
  date: string;
  turn: 'Abertura' | 'Tarde' | 'Fecho';
  managerId: string;
  managerId2?: string;
  fundoGerente: FundoCofrePart;
  cofre: FundoCofrePart;
  invoices: FinanceInvoice[];
  totalFaturas: number;
  fundosCount: number;
  fundosValuePerFundo: number;
  fundosTotal: number;
  moedasProsegur: number;
  totalGeral: number;
  diferenca: number;
  observacoes?: string;
  isLocked?: boolean;
  isDayClosed?: boolean;
  isRealCount?: boolean;
  isNotPerformed?: boolean;
}

export interface DepositRow {
  caixa: string;
  colaboradorNo?: string;
  colaboradorNome: string;
  valorRapport: number;
  sangria: number;
  dinheiro: number;
  multibanco: number;
  tickets: number;
  delivery: number;
  mop: number;
  diferenca: number;
}

export interface DepositRecord {
  id: string;
  date: string;
  turn: 'Abertura' | 'Fecho';
  managerId: string;
  rows: DepositRow[];
  comments: string;
  isLocked?: boolean;
  isDayClosed?: boolean;
}

export interface CaixaSurpresaRecord {
  id: string;
  date: string;
  turn: string;
  expectedValue: number;
  actualValue: number;
  difference: number;
  employeeName: string;
  managerName: string;
}

export interface ProsegurDepositRecord {
  id: string;
  date: string;
  bagNumber: string;
  amountNotes: number;
  amountCoins: number;
  amountTotal: number;
  prosegurReceipt: string;
  status: 'Pendente' | 'Recolhido' | 'Confirmado';
  comment: string;
}

// --- Operational Summary Types ---
export interface OtherSupplierEntry {
  id: string;
  supplier: string;
  date: string;
  quantity: number;
  invoiceValue: number;
  myStoreValue: number;
  managerId: string;
}

export interface MonthlyOperationalData {
  month: string;
  vendasMes: number;
  comprasComida: number;
  comprasPapel: number;
  comprasTotalOps: number;
  consumoComida: number;
  consumoPapel: number;
  consumoOps: number;
  invInicialComida: number;
  invInicialOps: number;
  perdasComida: number;
  refeicoesComida: number;
  promoComida: number;
  invFinalComida: number;
  invFinalPapel: number;
  invFinalOps: number;
  comprasOpsHavi: number;
  invInicialPapel: number;
  perdasPapel: number;
  refeicoesPapel: number;
  promoPapel: number;
  comprasOpsMaiaPapper: number;
  otherSuppliers: OtherSupplierEntry[];
  isFinalized?: boolean;
}

export interface ProsegurDailyDeposit {
  dayIndex: number;
  date: string;
  amount: number;
  managerName: string;
}

export interface ProsegurWeeklyDeposit {
  id: string;
  status: 'Aberto' | 'Encerrado';
  startDate: string;
  endDate?: string;
  managerOpen: string;
  managerClose?: string;
  prosegurEmployee?: string;
  prosegurCredential?: string;
  bagNumber?: string;
  prosegurReceipt?: string;
  dailyDeposits: ProsegurDailyDeposit[];
  coinDepositsValue1: number;
  coinDepositsValue2: number;
  coinDepositId1?: string;
  coinDepositId2?: string;
  totalVal: number;
}

export interface ProsegurCoinMovement {
  id: string;
  date: string;
  type: 'Recebido' | 'Enviado';
  amount: number;
  managerName: string;
  comment?: string;
  sendDate?: string;
  sendAmount?: number;
  sendManagerName?: string;
  isClosed?: boolean;
}

// --- MANAGER WORK & TASK CHECKLISTS ---
export interface ManagerTask {
  id: string;
  name: string;
  department: string; // e.g. "Qualidade", "Higiene", "Segurança", "Financeiro", "Recursos Humanos" or custom text
}

export interface ManagerTaskChecklist {
  id: string;               // Unique checklist ID, e.g., "checklist_{restaurantId}_{managerId}_{monthYear}"
  restaurantId: string;
  managerId: string;        // The ID of the manager
  managerName: string;
  department: string;       // The department or category
  monthYear: string;        // format "YYYY-MM"
  taskAnswers: {
    [taskId: string]: {
      week1?: boolean;
      week2?: boolean;
      week3?: boolean;
      week4?: boolean;
      month?: boolean;
    };
  };
  comments?: string;
  notes?: string;           // Note input or custom mark score
  isCompleted?: boolean;    // Marked as completed by the manager
  isApproved?: boolean;     // Validated/Approved by the supervisor
  approvedBy?: string;      // Name of the person who validated
  approvedAt?: string;      // ISO string
}

// --- DIGITAL AGENDA & EVENTS ---
export type AgendaEventType = 'aniversario' | 'reuniao' | 'tarefa' | 'visita' | 'auditoria' | 'outro';

export interface AgendaEvent {
  id: string;
  title: string;
  type: AgendaEventType;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm (optional, if empty or missing -> "Dia inteiro")
  isAllDay?: boolean;
  description: string;
  managerId?: string; // Gerente (opcional)
  managerName?: string; // Gerente name display
  reminderDuration?: string; // e.g. "no_dia" | "1_dia" | "2_dias" | "3_dias" | "1_semana"
  isCompleted?: boolean; // For tracking completed tasks or milestones
  createdAt?: string;
  updatedAt?: string;
}

// --- PLANO DE LIMPEZA (MAPA SEMANAL & ZELADOR) ---

export type CleaningDayOfWeek = 'segunda' | 'terca' | 'quarta' | 'quinta' | 'sexta' | 'sabado' | 'domingo';
export type CleaningShift = 'abertura' | 'intermedio' | 'fecho';

export interface CleaningTaskItem {
  id: string;
  tarefa: string;
  area: string;
  day: CleaningDayOfWeek;
  shift?: CleaningShift; // used for weekly tasks (abertura, intermedio, fecho)
}

export interface CleaningTaskStatus {
  taskId?: string;
  completed: boolean;
  completedBy?: string; // Gerente de turno ou staff
  completedAt?: string; // ISO ou hora
  justification?: string; // Justificação caso a tarefa não seja realizada
  notes?: string;
  photos?: string[]; // Fotografias de evidência obrigatórias (mínimo 1)
}

export interface ZeladorTaskStatus {
  completed: boolean;
  funcionario?: string; // Nome do funcionário responsável (ex: Gilberto Soutelo)
  comentario?: string; // Comentário ou justificação
  completedAt?: string;
  photos?: string[]; // Fotografias de evidência obrigatórias (mínimo 1)
}

export interface CleaningPlanWeek {
  id: string; // e.g. "plan_2026-08-17" (Monday date)
  restaurantId: string;
  weekStartDate: string; // YYYY-MM-DD (Segunda-feira)
  weekEndDate: string; // YYYY-MM-DD (Domingo)
  weekNumber: number;
  year: number;
  status: 'aberta' | 'validada' | 'encerrada';
  validatedBy?: string;
  validatedByRole?: string;
  validatedAt?: string;
  validationNotes?: string;

  // Gerente de turno em cada turno de cada dia:
  // shiftManagers[day][shift] = managerName
  shiftManagers: {
    [day in CleaningDayOfWeek]?: {
      abertura?: string;
      intermedio?: string;
      fecho?: string;
    };
  };

  // Estado de realização de cada tarefa semanal
  taskStatuses: {
    [taskId: string]: CleaningTaskStatus;
  };

  // Estado de realização de cada tarefa do zelador
  zeladorStatuses: {
    [zeladorTaskId: string]: ZeladorTaskStatus;
  };

  // Tarefas personalizadas específicas desta semana (se houver adições/remoções)
  customWeeklyTasks?: CleaningTaskItem[];
  customZeladorTasks?: CleaningTaskItem[];

  // Responsáveis por cada área operacional (definidos pelo utilizador / editáveis)
  areaResponsibles?: {
    [area: string]: AreaResponsibleConfig;
  };

  createdAt: string;
  updatedAt: string;
}

export interface AreaResponsibleConfig {
  area: string;
  managerName: string; // Gerente responsável (pode gerir 1 ou mais áreas)
  managerRole?: string; // Cargo do gerente
  notes?: string; // Notas de supervisão ou diretrizes operacionais
  color?: string; // Cor do nó no fluxograma
  subAreas?: string[]; // Sub-zonas ou equipamentos críticos sob supervisão
  priority?: 'alta' | 'media' | 'baixa';
  updatedAt?: string;
}

export interface CleaningTemplateConfig {
  id: string;
  restaurantId: string;
  weeklyTasks: CleaningTaskItem[];
  zeladorTasks: CleaningTaskItem[];
  areas: string[];
  areaResponsibles?: {
    [area: string]: AreaResponsibleConfig;
  };
  updatedAt: string;
}

export interface ExtraordinaryCleaningTask {
  id: string;
  restaurantId: string;
  data: string; // YYYY-MM-DD
  area: string;
  tarefa: string;
  assignedManager?: string; // Opcional
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
  photos: string[]; // Fotos de evidência (mínimo 1 quando concluída)
  notes?: string;
  scheduledAt?: string;
  scheduledBy?: string;
  createdAt: string;
  updatedAt: string;
}


