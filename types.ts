
export type RoleType = 'GERENTE' | 'TREINADOR' | 'RP';

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
  area: 'kitchen' | 'service' | 'delivery' | 'lobby' | 'beverage' | 'drive' | 'mccafe' | 'fries'; // Expanded areas
  isActive: boolean; // New field to toggle in settings
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
  customStations: StationConfig[]; // New field for editable stations
}

// Replaces AllocationRule
export interface StaffingTableEntry {
  id: string;
  minSales: number;
  maxSales: number;
  staffCount: number;
  stationLabel: string; 
}

export interface SalesData {
  date: string; // YYYY-MM-DD
  amount: number;
  isForecast: boolean;
}

export interface HourlyProjection {
  hour: string; // "19h-20h"
  totalSales: number;
  totalGC: number;
  channelGC: {
    counter: number;
    sok: number; // Kiosk
    drive: number; // A/C
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
  [stationId: string]: string[]; // Array of Employee IDs
}

export interface DailySchedule {
  date: string;
  shifts: {
    [key in ShiftType]?: StationAssignment; 
  };
  // New field for trainees (separate from main shifts to not count towards total)
  trainees?: {
    [key in ShiftType]?: StationAssignment;
  };
  shiftManagers?: {
    [key in ShiftType]?: string; 
  };
  // New field for objectives
  shiftObjectives?: {
    [key in ShiftType]?: {
       turnObjective?: string;
       productionObjective?: string;
    };
  };
  notes?: string;
  isLocked?: boolean; // New field to indicate finalized/read-only state
}

export interface AISuggestion {
  rationale: string;
  recommendedCounts: {
    [key in RoleType]: number;
  };
}