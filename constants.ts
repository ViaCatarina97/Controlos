
import { AppSettings, BusinessArea, Employee, HistoryEntry, RestaurantTypology, RoleType, ShiftType, StaffingTableEntry, StationConfig } from "./types";

export const STATIONS: StationConfig[] = [
  // --- BEBIDAS ---
  { id: 'bev_1', label: 'Bebidas 1', designation: 'BEB 1', icon: 'CupSoda', defaultSlots: 1, area: 'beverage', isActive: true },
  { id: 'bev_2', label: 'Bebidas 2', designation: 'BEB 2', icon: 'CupSoda', defaultSlots: 1, area: 'beverage', isActive: true },
  { id: 'bev_3', label: 'Bebidas 3', designation: 'BEB 3', icon: 'CupSoda', defaultSlots: 1, area: 'beverage', isActive: true },

  // --- GRELHADORES & COZINHA ---
  { id: 'k_bc_1', label: 'Batch Cooker 1', designation: 'BC 1', icon: 'Flame', defaultSlots: 1, area: 'kitchen', zoneOverride: 'grills', isActive: true },
  { id: 'k_bc_2', label: 'Batch Cooker 2', designation: 'BC 2', icon: 'Flame', defaultSlots: 1, area: 'kitchen', zoneOverride: 'grills', isActive: true },
  { id: 'k_bc_3', label: 'Batch Cooker 3', designation: 'BC 3', icon: 'Flame', defaultSlots: 1, area: 'kitchen', zoneOverride: 'grills', isActive: true },
  { id: 'k_bc_4', label: 'Batch Cooker 4', designation: 'BC 4', icon: 'Flame', defaultSlots: 1, area: 'kitchen', zoneOverride: 'grills', isActive: true },
  { id: 'k_ini_1', label: 'Iniciador 1', designation: 'INI 1', icon: 'Sandwich', defaultSlots: 1, area: 'kitchen', stageOverride: 'iniciador', lineOverride: 1, isActive: true },
  { id: 'k_ini_2', label: 'Iniciador 2', designation: 'INI 2', icon: 'Sandwich', defaultSlots: 1, area: 'kitchen', stageOverride: 'iniciador', lineOverride: 2, isActive: true },
  { id: 'k_prep_1', label: 'Preparador 1', designation: 'PREP 1', icon: 'Utensils', defaultSlots: 1, area: 'kitchen', stageOverride: 'preparador', lineOverride: 1, isActive: true },
  { id: 'k_prep_2', label: 'Preparador 2', designation: 'PREP 2', icon: 'Utensils', defaultSlots: 1, area: 'kitchen', stageOverride: 'preparador', lineOverride: 2, isActive: true },
  { id: 'k_prep_3', label: 'Preparador 3', designation: 'PREP 3', icon: 'Utensils', defaultSlots: 1, area: 'kitchen', stageOverride: 'preparador', lineOverride: 1, isActive: true },
  { id: 'k_prep_4', label: 'Preparador 4', designation: 'PREP 4', icon: 'Utensils', defaultSlots: 1, area: 'kitchen', stageOverride: 'preparador', lineOverride: 2, isActive: true },
  { id: 'k_fin_1', label: 'Finalizador 1', designation: 'FIN 1', icon: 'Utensils', defaultSlots: 1, area: 'kitchen', stageOverride: 'finalizador', lineOverride: 1, isActive: true },
  { id: 'k_fin_2', label: 'Finalizador 2', designation: 'FIN 2', icon: 'Utensils', defaultSlots: 1, area: 'kitchen', stageOverride: 'finalizador', lineOverride: 2, isActive: true },

  // --- BALCÃO SERVIÇO ---
  { id: 'svc_exp_1', label: 'Expedidor 1', designation: 'EXP 1', icon: 'Monitor', defaultSlots: 1, area: 'counter', stageOverride: 'expedidor', lineOverride: 1, isActive: true },
  { id: 'svc_exp_2', label: 'Expedidor 2', designation: 'EXP 2', icon: 'Monitor', defaultSlots: 1, area: 'counter', stageOverride: 'expedidor', lineOverride: 2, isActive: true },
  { id: 'svc_run_1', label: 'Runner 1', designation: 'RUN 1', icon: 'ShoppingBag', defaultSlots: 1, area: 'counter', stageOverride: 'runner', lineOverride: 1, isActive: true },
  { id: 'svc_run_2', label: 'Runner 2', designation: 'RUN 2', icon: 'ShoppingBag', defaultSlots: 1, area: 'counter', stageOverride: 'runner', lineOverride: 2, isActive: true },
  { id: 'svc_run_3', label: 'Runner 3', designation: 'RUN 3', icon: 'ShoppingBag', defaultSlots: 1, area: 'counter', stageOverride: 'runner', lineOverride: 1, isActive: true },
  { id: 'svc_run_4', label: 'Runner 4', designation: 'RUN 4', icon: 'ShoppingBag', defaultSlots: 1, area: 'counter', stageOverride: 'runner', lineOverride: 2, isActive: true },
  { id: 'svc_apr_1', label: 'Apresentador 1', designation: 'APR 1', icon: 'Smile', defaultSlots: 1, area: 'counter', stageOverride: 'apresentador', lineOverride: 1, isActive: true },
  { id: 'svc_apr_ext_1', label: 'Apresentador Externo 1', designation: 'APR EXT 1', icon: 'Smile', defaultSlots: 1, area: 'counter', stageOverride: 'apresentador', lineOverride: 1, isActive: true },
  { id: 'svc_apr_2', label: 'Apresentador 2', designation: 'APR 2', icon: 'Smile', defaultSlots: 1, area: 'counter', stageOverride: 'apresentador', lineOverride: 2, isActive: true },
  { id: 'svc_apr_ext_2', label: 'Apresentador Externo 2', designation: 'APR EXT 2', icon: 'Smile', defaultSlots: 1, area: 'counter', stageOverride: 'apresentador', lineOverride: 2, isActive: true },

  // --- CAIXA ---
  { id: 'svc_cax_1', label: 'Caixa 1', designation: 'CX 1', icon: 'UserCircle', defaultSlots: 1, area: 'counter', zoneOverride: 'cashier', isActive: true },
  { id: 'svc_cax_2', label: 'Caixa 2', designation: 'CX 2', icon: 'UserCircle', defaultSlots: 1, area: 'counter', zoneOverride: 'cashier', isActive: true },
  { id: 'svc_cax_3', label: 'Caixa 3', designation: 'CX 3', icon: 'UserCircle', defaultSlots: 1, area: 'counter', zoneOverride: 'cashier', isActive: true },

  // --- BATATEIRA ---
  { id: 'fr_1', label: 'Batata 1', designation: 'BAT 1', icon: 'Utensils', defaultSlots: 1, area: 'fries', isActive: true },
  { id: 'fr_2', label: 'Batata 2', designation: 'BAT 2', icon: 'Utensils', defaultSlots: 1, area: 'fries', isActive: true },

  // --- SALA ---
  { id: 'lb_rp_1', label: 'RP 1', designation: 'RP 1', icon: 'HeartHandshake', defaultSlots: 1, area: 'lobby', isActive: true },
  { id: 'lb_sal_1', label: 'Salão', designation: 'SALÃO', icon: 'Users', defaultSlots: 1, area: 'lobby', isActive: true },
  { id: 'lb_rp_2', label: 'RP 2', designation: 'RP 2', icon: 'HeartHandshake', defaultSlots: 1, area: 'lobby', isActive: true },

  // --- DRIVE (IF ACTIVE) ---
  { id: 'dr_jan_1', label: 'Drive Janela 1', designation: 'DRV JAN 1', icon: 'Car', defaultSlots: 1, area: 'drive', isActive: true },
  { id: 'dr_jan_2', label: 'Drive Janela 2', designation: 'DRV JAN 2', icon: 'Car', defaultSlots: 1, area: 'drive', isActive: true },

  // --- McCAFÉ (IF ACTIVE) ---
  { id: 'mc_cax', label: 'McCafé Caixa', designation: 'MC CX', icon: 'Coffee', defaultSlots: 1, area: 'mccafe', isActive: true },
  { id: 'mc_pre', label: 'McCafé Prep', designation: 'MC PREP', icon: 'Coffee', defaultSlots: 1, area: 'mccafe', isActive: true },

  // --- DELIVERY ---
  { id: 'dl_pre', label: 'Delivery Prep', designation: 'DEL PREP', icon: 'Package', defaultSlots: 1, area: 'delivery', isActive: true },
  { id: 'dl_2', label: 'Delivery 2', designation: 'DLV 2', icon: 'Package', defaultSlots: 1, area: 'delivery', isActive: true },
  { id: 'dl_3', label: 'Delivery 3', designation: 'DLV 3', icon: 'Package', defaultSlots: 1, area: 'delivery', isActive: true },
];

export const INITIAL_RESTAURANTS: AppSettings[] = [
  {
    restaurantId: "via_1",
    restaurantName: "Via Catarina",
    restaurantType: "Shopping",
    username: "Via Catarina",
    password: "Via97",
    activeShifts: ['ABERTURA', 'INTERMEDIO', 'FECHO'],
    businessAreas: ['Loja', 'Delivery'],
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
  customStations: STATIONS
};

export const APP_VERSION = '5.3.2';

export const AVAILABLE_TYPOLOGIES: RestaurantTypology[] = ['Loja de Rua', 'Drive', 'Shopping'];
export const AVAILABLE_AREAS: BusinessArea[] = ['Loja', 'Drive', 'Delivery', 'McCafé'];
export const AVAILABLE_SHIFTS: { id: ShiftType; label: string }[] = [
  { id: 'ABERTURA', label: 'Abertura' },
  { id: 'INTERMEDIO', label: 'Intermédio' },
  { id: 'FECHO', label: 'Fecho' },
  { id: 'MADRUGADA', label: 'Madrugada' }
];

export const ROLE_LABELS: Record<RoleType, string> = {
  GERENTE_RESTAURANTE: "Gerente de Restaurante",
  GERENTE: "Gerente",
  TREINADOR: "Treinador",
  RP: "RP",
  FUNCIONÁRIO: "Funcionário"
};

export const ROLE_COLORS: Record<RoleType, string> = {
  GERENTE_RESTAURANTE: "bg-indigo-100 text-indigo-800 border-indigo-200 ring-indigo-500",
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
    { id: '1', minSales: 0, maxSales: 0, staffCount: 1, stationLabel: 'Batch Cooker 1' },
    { id: '2', minSales: 0, maxSales: 0, staffCount: 2, stationLabel: 'Expedidor 1' },
    { id: '3', minSales: 0, maxSales: 0, staffCount: 3, stationLabel: 'Iniciador 1' },
    { id: '4', minSales: 110, maxSales: 219, staffCount: 4, stationLabel: 'Bebidas 1' },
    { id: '5', minSales: 220, maxSales: 328, staffCount: 5, stationLabel: 'Iniciador 2' },
    { id: '6', minSales: 329, maxSales: 439, staffCount: 6, stationLabel: 'Caixa 1' },
    { id: '7', minSales: 440, maxSales: 548, staffCount: 7, stationLabel: 'Batch Cooker 2' },
    { id: '8', minSales: 549, maxSales: 659, staffCount: 8, stationLabel: 'Batata 1' },
    { id: '9', minSales: 660, maxSales: 769, staffCount: 9, stationLabel: 'RP 1' },
    { id: '10', minSales: 770, maxSales: 879, staffCount: 10, stationLabel: 'Apresentador 1' },
    { id: '11', minSales: 880, maxSales: 934, staffCount: 11, stationLabel: 'Apresentador Externo 1' },
    { id: '12', minSales: 935, maxSales: 989, staffCount: 12, stationLabel: 'Finalizador 1' },
    { id: '13', minSales: 990, maxSales: 1100, staffCount: 13, stationLabel: 'Delivery Prep' },
    { id: '14', minSales: 1101, maxSales: 1210, staffCount: 14, stationLabel: 'Expedidor 2' },
    { id: '15', minSales: 1211, maxSales: 1321, staffCount: 15, stationLabel: 'Finalizador 2' },
    { id: '16', minSales: 1322, maxSales: 1376, staffCount: 16, stationLabel: 'Apresentador 2' },
    { id: '17', minSales: 1377, maxSales: 1431, staffCount: 17, stationLabel: 'Apresentador Externo 2' },
    { id: '18', minSales: 1432, maxSales: 1542, staffCount: 18, stationLabel: 'Batch Cooker 3' },
    { id: '19', minSales: 1543, maxSales: 1657, staffCount: 19, stationLabel: 'Bebidas 2' },
    { id: '20', minSales: 1658, maxSales: 1773, staffCount: 20, stationLabel: 'Salão' },
    { id: '21', minSales: 1774, maxSales: 1890, staffCount: 21, stationLabel: 'Preparador 2' },
    { id: '22', minSales: 1891, maxSales: 2007, staffCount: 22, stationLabel: 'Runner 1' },
    { id: '23', minSales: 2008, maxSales: 2124, staffCount: 23, stationLabel: 'Batata 2' },
    { id: '24', minSales: 2125, maxSales: 2247, staffCount: 24, stationLabel: 'Preparador 1' },
    { id: '25', minSales: 2248, maxSales: 2371, staffCount: 25, stationLabel: 'Runner 2' },
    { id: '26', minSales: 2372, maxSales: 2496, staffCount: 26, stationLabel: 'Caixa 2' },
    { id: '27', minSales: 2497, maxSales: 2620, staffCount: 27, stationLabel: 'Bebidas 3' },
    { id: '28', minSales: 2621, maxSales: 2746, staffCount: 28, stationLabel: 'Delivery 2' },
    { id: '29', minSales: 2747, maxSales: 2878, staffCount: 29, stationLabel: 'Preparador 3' },
    { id: '30', minSales: 2879, maxSales: 3010, staffCount: 30, stationLabel: 'Batch Cooker 4' },
    { id: '31', minSales: 3144, maxSales: 3277, staffCount: 31, stationLabel: 'Preparador 4' },
    { id: '32', minSales: 3278, maxSales: 3412, staffCount: 32, stationLabel: 'Caixa 3' },
    { id: '33', minSales: 3554, maxSales: 3696, staffCount: 33, stationLabel: 'Runner 3' },
    { id: '34', minSales: 3840, maxSales: 3982, staffCount: 34, stationLabel: 'Runner 4' },
    { id: '35', minSales: 3983, maxSales: 4125, staffCount: 35, stationLabel: 'Delivery 3' },
    { id: '36', minSales: 4126, maxSales: 4300, staffCount: 36, stationLabel: 'RP 2' },
];

export const MOCK_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Ana Silva', role: 'GERENTE', isActive: true },
  { id: '2', name: 'Carlos Sousa', role: 'TREINADOR', isActive: true },
  { id: '3', name: 'Beatriz Costa', role: 'RP', isActive: true },
  { id: '4', name: 'David Lima', role: 'TREINADOR', isActive: true },
];
