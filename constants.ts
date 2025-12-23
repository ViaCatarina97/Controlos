import { AppSettings, BusinessArea, Employee, HistoryEntry, RestaurantTypology, RoleType, ShiftType, StaffingTableEntry, StationConfig } from "./types";

export const STATIONS: StationConfig[] = [
  // --- BEBIDAS (PURPLE) ---
  { id: 'bev_1', label: 'Bebidas 1', designation: 'BEB 1', icon: 'CupSoda', defaultSlots: 1, area: 'beverage', isActive: true },
  { id: 'bev_2', label: 'Bebidas 2', designation: 'BEB 2', icon: 'CupSoda', defaultSlots: 1, area: 'beverage', isActive: true },
  { id: 'bev_3', label: 'Bebidas 3', designation: 'BEB 3', icon: 'CupSoda', defaultSlots: 1, area: 'beverage', isActive: true },

  // --- COZINHA PRODUÇÃO (RED) ---
  { id: 'k_bc_1', label: 'Batch Cooker 1', designation: 'BC 1', icon: 'Flame', defaultSlots: 1, area: 'kitchen', isActive: true },
  { id: 'k_bc_2', label: 'Batch Cooker 2', designation: 'BC 2', icon: 'Flame', defaultSlots: 1, area: 'kitchen', isActive: true },
  { id: 'k_bc_3', label: 'Batch Cooker 3', designation: 'BC 3', icon: 'Flame', defaultSlots: 1, area: 'kitchen', isActive: true },
  { id: 'k_ini_1', label: 'Iniciador 1', designation: 'INI 1', icon: 'Sandwich', defaultSlots: 1, area: 'kitchen', isActive: true },
  { id: 'k_ini_2', label: 'Iniciador 2', designation: 'INI 2', icon: 'Sandwich', defaultSlots: 1, area: 'kitchen', isActive: true },
  { id: 'k_fin_1', label: 'Finalizador 1', designation: 'FIN 1', icon: 'Utensils', defaultSlots: 1, area: 'kitchen', isActive: true },
  { id: 'k_fin_2', label: 'Finalizador 2', designation: 'FIN 2', icon: 'Utensils', defaultSlots: 1, area: 'kitchen', isActive: true },

  // --- BALCÃO SERVIÇO (BLUE) ---
  { id: 'svc_exp_1', label: 'Expedidor 1', designation: 'EXP 1', icon: 'Monitor', defaultSlots: 1, area: 'counter', isActive: true },
  { id: 'svc_exp_2', label: 'Expedidor 2', designation: 'EXP 2', icon: 'Monitor', defaultSlots: 1, area: 'counter', isActive: true },
  { id: 'svc_run_1', label: 'Runner 1', designation: 'RUN 1', icon: 'ShoppingBag', defaultSlots: 1, area: 'counter', isActive: true },
  { id: 'svc_run_2', label: 'Runner 2', designation: 'RUN 2', icon: 'ShoppingBag', defaultSlots: 1, area: 'counter', isActive: true },
  { id: 'svc_apr_1', label: 'Apresentador 1', designation: 'APR 1', icon: 'Smile', defaultSlots: 1, area: 'counter', isActive: true },
  { id: 'svc_apr_2', label: 'Apresentador 2', designation: 'APR 2', icon: 'Smile', defaultSlots: 1, area: 'counter', isActive: true },
  { id: 'svc_cax_1', label: 'Caixa 1', designation: 'CX 1', icon: 'UserCircle', defaultSlots: 1, area: 'counter', isActive: true },

  // --- BATATAS (YELLOW) ---
  { id: 'fr_1', label: 'Batata 1', designation: 'BAT 1', icon: 'Utensils', defaultSlots: 1, area: 'fries', isActive: true },

  // --- SALA (YELLOW/BLUE) ---
  { id: 'lb_rp_1', label: 'RP 1', designation: 'RP 1', icon: 'HeartHandshake', defaultSlots: 1, area: 'lobby', isActive: true },
  { id: 'lb_rp_2', label: 'RP 2', designation: 'RP 2', icon: 'HeartHandshake', defaultSlots: 1, area: 'lobby', isActive: true },
  { id: 'lb_sal_1', label: 'Salão', designation: 'SALÃO', icon: 'Users', defaultSlots: 1, area: 'lobby', isActive: true },

  // --- DRIVE (IF ACTIVE) ---
  { id: 'dr_jan_1', label: 'Drive Janela 1', designation: 'DRV JAN 1', icon: 'Car', defaultSlots: 1, area: 'drive', isActive: true },
  { id: 'dr_jan_2', label: 'Drive Janela 2', designation: 'DRV JAN 2', icon: 'Car', defaultSlots: 1, area: 'drive', isActive: true },

  // --- McCAFÉ (IF ACTIVE) ---
  { id: 'mc_cax', label: 'McCafé Caixa', designation: 'MC CX', icon: 'Coffee', defaultSlots: 1, area: 'mccafe', isActive: true },
  { id: 'mc_pre', label: 'McCafé Prep', designation: 'MC PREP', icon: 'Coffee', defaultSlots: 1, area: 'mccafe', isActive: true },

  // --- DELIVERY (IF ACTIVE) ---
  { id: 'dl_pre', label: 'Delivery Prep', designation: 'DEL PREP', icon: 'Package', defaultSlots: 1, area: 'delivery', isActive: true },
];

export const INITIAL_RESTAURANTS: AppSettings[] = [
  {
    restaurantId: "via_1",
    restaurantName: "Via Catarina",
    restaurantType: "Shopping",
    username: "Via Catarina",
    password: "Via97",
    activeShifts: ['ABERTURA', 'INTERMEDIO', 'FECHO'],
    businessAreas: ['Loja', 'Delivery', 'McCafé'],
    deliveryProviders: ["Uber Eats", "Glovo"],
    customStations: STATIONS
  },
  {
    restaurantId: "imp_1",
    restaurantName: "Imperial",
    restaurantType: "Loja de Rua",
    username: "Imperial",
    password: "Imperial96",
    activeShifts: ['ABERTURA', 'INTERMEDIO', 'FECHO'],
    businessAreas: ['Loja', 'Delivery', 'McCafé'],
    deliveryProviders: ["Uber Eats", "Glovo"],
    customStations: STATIONS
  }
];

export const DEFAULT_SETTINGS: AppSettings = {
  restaurantId: "1",
  restaurantName: "Loja Principal",
  restaurantType: "Loja de Rua",
  username: "admin",
  password: "123",
  activeShifts: ['ABERTURA', 'INTERMEDIO', 'FECHO'],
  businessAreas: ['Loja', 'Delivery', 'McCafé'],
  deliveryProviders: ["Uber Eats", "Glovo"],
  customStations: STATIONS
};

export const AVAILABLE_TYPOLOGIES: RestaurantTypology[] = ['Loja de Rua', 'Drive', 'Shopping'];
export const AVAILABLE_AREAS: BusinessArea[] = ['Loja', 'Drive', 'Delivery', 'McCafé'];
export const AVAILABLE_SHIFTS: { id: ShiftType; label: string }[] = [
  { id: 'ABERTURA', label: 'Abertura' },
  { id: 'INTERMEDIO', label: 'Intermédio' },
  { id: 'FECHO', label: 'Fecho' },
  { id: 'MADRUGADA', label: 'Madrugada' }
];

export const ROLE_LABELS: Record<RoleType, string> = {
  GERENTE: "Gerente",
  TREINADOR: "Treinador",
  RP: "Relações Públicas",
  FUNCIONÁRIO: "Funcionário"
};

export const ROLE_COLORS: Record<RoleType, string> = {
  GERENTE: "bg-blue-100 text-blue-800 border-blue-200 ring-blue-500",
  TREINADOR: "bg-green-100 text-green-800 border-green-200 ring-green-500",
  RP: "bg-pink-100 text-pink-800 border-pink-200 ring-pink-500",
  FUNCIONÁRIO: "bg-gray-100 text-gray-800 border-gray-200 ring-gray-500"
};

export const TIME_SLOTS_KEYS = [
  "12:00-13:00", "13:00-14:00", "14:00-15:00", 
  "19:00-20:00", "20:00-21:00", "21:00-22:00"
];

export const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: '1', date: '2023-10-06', dayOfWeek: 5, totalSales: 7850, totalGC: 833,
    slots: {
      "12:00-13:00": { sales: 785, gc: 101 },
      "13:00-14:00": { sales: 833, gc: 155 },
      "14:00-15:00": { sales: 524, gc: 80 },
      "19:00-20:00": { sales: 382, gc: 59 },
      "20:00-21:00": { sales: 598, gc: 93 },
      "21:00-22:00": { sales: 269, gc: 47 },
    }
  }
];

export const DEFAULT_STAFFING_TABLE: StaffingTableEntry[] = [
    { id: '1', minSales: 0, maxSales: 99, staffCount: 3, stationLabel: 'Batch Cooker 1' },
    { id: '2', minSales: 100, maxSales: 290, staffCount: 4, stationLabel: 'Expedidor 1' },
    { id: '3', minSales: 291, maxSales: 370, staffCount: 5, stationLabel: 'Iniciador 1' },
    { id: '4', minSales: 371, maxSales: 450, staffCount: 6, stationLabel: 'Bebidas 1' },
    { id: '5', minSales: 451, maxSales: 530, staffCount: 7, stationLabel: 'Iniciador 2' },
    { id: '6', minSales: 531, maxSales: 580, staffCount: 8, stationLabel: 'Caixa 1' },
    { id: '7', minSales: 581, maxSales: 620, staffCount: 9, stationLabel: 'Batch Cooker 2' },
    { id: '8', minSales: 621, maxSales: 740, staffCount: 10, stationLabel: 'Batata 1' },
    { id: '9', minSales: 741, maxSales: 830, staffCount: 11, stationLabel: 'RP 1' },
    { id: '10', minSales: 831, maxSales: 910, staffCount: 12, stationLabel: 'Apresentador 1' },
    { id: '11', minSales: 911, maxSales: 990, staffCount: 13, stationLabel: 'Finalizador 1' },
];

export const MOCK_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Ana Silva', role: 'GERENTE', isActive: true },
  { id: '2', name: 'Carlos Sousa', role: 'TREINADOR', isActive: true },
  { id: '3', name: 'Beatriz Costa', role: 'RP', isActive: true },
  { id: '4', name: 'David Lima', role: 'TREINADOR', isActive: true },
];