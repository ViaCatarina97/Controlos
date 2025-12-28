
export type RoleType = 'GERENTE' | 'TREINADOR' | 'RP' | 'FUNCIONÁRIO';

export interface Employee {
  id: string;
  name: string;
  role: RoleType;
  isActive: boolean;
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
    [key in ShiftType]?: string; 
  };
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
  category: 'Comida' | 'Papel' | 'F. Operacionais' | 'Mat. Adm.' | 'Outros' | 'H.M.';
  product: string;
  priceHavi: number;
  priceSms: number;
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
