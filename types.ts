
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
  designation?: string; // Short code/name
  icon: string;
  defaultSlots: number;
  area: 'kitchen' | 'delivery' | 'lobby' | 'beverage' | 'drive' | 'mccafe' | 'fries' | 'counter'; 
  isActive: boolean; 
}

export interface AppSettings {
  restaurantId: string;
  restaurantName: string;
  restaurantType: RestaurantTypology;
  // Auth
  username: string; 
  password: string;
  // Configs
  activeShifts: ShiftType[]; 
  businessAreas: BusinessArea[]; 
  deliveryProviders: string[];
  customStations: StationConfig[]; 
}

export interface StaffingTableEntry {
  id: string;
  minSales: number;
  maxSales: number;
  staffCount: number;
  stationLabel: string; 
}

export interface SalesData {
  date: string; 
  amount: number;
  isForecast: boolean;
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
  isLocked?: boolean; 
}

export interface AISuggestion {
  rationale: string;
  recommendedCounts: {
    [key in RoleType]: number;
  };
}
