
export type RoleType = 'GERENTE' | 'TREINADOR' | 'RP' | 'FUNCIONÁRIO';

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

