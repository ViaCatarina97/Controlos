import { AppSettings, BusinessArea, Employee, HistoryEntry, RestaurantTypology, RoleType, ShiftType, StaffingTableEntry, StationConfig } from "./types";

export const STATIONS: StationConfig[] = [
  // --- PRODUÇÃO (COZINHA) ---
  { id: 'k_grill_1', label: 'BC Grelhador 1', designation: 'GRELH 1', icon: 'Flame', defaultSlots: 1, area: 'kitchen', isActive: true },
  { id: 'k_grill_2', label: 'BC Grelhador 2', designation: 'GRELH 2', icon: 'Flame', defaultSlots: 1, area: 'kitchen', isActive: true },
  
  { id: 'k_fry_1', label: 'BC Fritadeiras 1', designation: 'FRIT 1', icon: 'Thermometer', defaultSlots: 1, area: 'kitchen', isActive: true },
  { id: 'k_fry_2', label: 'BC Fritadeiras 2', designation: 'FRIT 2', icon: 'Thermometer', defaultSlots: 1, area: 'kitchen', isActive: true },
  
  { id: 'k_init_1', label: 'Iniciador 1', designation: 'INI 1', icon: 'Sandwich', defaultSlots: 1, area: 'kitchen', isActive: true },
  { id: 'k_init_2', label: 'Iniciador 2', designation: 'INI 2', icon: 'Sandwich', defaultSlots: 1, area: 'kitchen', isActive: true },
  
  { id: 'k_prep_1', label: 'Preparador (Montagem) 1', designation: 'PREP 1', icon: 'Utensils', defaultSlots: 1, area: 'kitchen', isActive: true },
  { id: 'k_prep_2', label: 'Preparador (Montagem) 2', designation: 'PREP 2', icon: 'Utensils', defaultSlots: 1, area: 'kitchen', isActive: true },
  { id: 'k_prep_3', label: 'Preparador (Montagem) 3', designation: 'PREP 3', icon: 'Utensils', defaultSlots: 1, area: 'kitchen', isActive: true },
  { id: 'k_prep_4', label: 'Preparador (Montagem) 4', designation: 'PREP 4', icon: 'Utensils', defaultSlots: 1, area: 'kitchen', isActive: true },
  
  { id: 'k_fin_1', label: 'Finalizador 1', designation: 'FIN 1', icon: 'Utensils', defaultSlots: 1, area: 'kitchen', isActive: true },
  { id: 'k_fin_2', label: 'Finalizador 2', designation: 'FIN 2', icon: 'Utensils', defaultSlots: 1, area: 'kitchen', isActive: true },
  
  { id: 'k_fries_1', label: 'Batata 1', designation: 'BAT 1', icon: 'UtensilsCrossed', defaultSlots: 1, area: 'kitchen', isActive: true },
  { id: 'k_fries_2', label: 'Batata 2', designation: 'BAT 2', icon: 'UtensilsCrossed', defaultSlots: 1, area: 'kitchen', isActive: true },

  // --- BEBIDAS (CELL) ---
  { id: 'bev_init', label: 'Bebidas - Iniciador', designation: 'BEB INI', icon: 'CupSoda', defaultSlots: 1, area: 'beverage', isActive: true },
  { id: 'bev_fin', label: 'Bebidas - Finalizador', designation: 'BEB FIN', icon: 'CupSoda', defaultSlots: 1, area: 'beverage', isActive: true },
  { id: 'bev_ice', label: 'Bebidas - Gelados', designation: 'GELADOS', icon: 'IceCream', defaultSlots: 1, area: 'beverage', isActive: true },

  // --- SERVIÇO ---
  { id: 'svc_exp_1', label: 'Expedidor 1', designation: 'EXP 1', icon: 'Monitor', defaultSlots: 1, area: 'service', isActive: true },
  { id: 'svc_exp_2', label: 'Expedidor 2', designation: 'EXP 2', icon: 'Monitor', defaultSlots: 1, area: 'service', isActive: true },
  
  { id: 'svc_run_1', label: 'Runner 1', designation: 'RUN 1', icon: 'ShoppingBag', defaultSlots: 1, area: 'service', isActive: true },
  { id: 'svc_run_2', label: 'Runner 2', designation: 'RUN 2', icon: 'ShoppingBag', defaultSlots: 1, area: 'service', isActive: true },
  { id: 'svc_run_3', label: 'Runner 3', designation: 'RUN 3', icon: 'ShoppingBag', defaultSlots: 1, area: 'service', isActive: true },
  { id: 'svc_run_4', label: 'Runner 4', designation: 'RUN 4', icon: 'ShoppingBag', defaultSlots: 1, area: 'service', isActive: true },
  
  { id: 'svc_pres_1', label: 'Apresentador 1', designation: 'APRES 1', icon: 'Smile', defaultSlots: 1, area: 'service', isActive: true },
  { id: 'svc_pres_2', label: 'Apresentador 2', designation: 'APRES 2', icon: 'Smile', defaultSlots: 1, area: 'service', isActive: true },
  
  { id: 'svc_ext_1', label: 'Apresentador Externo 1', designation: 'EXT 1', icon: 'CarFront', defaultSlots: 1, area: 'service', isActive: true },
  { id: 'svc_ext_2', label: 'Apresentador Externo 2', designation: 'EXT 2', icon: 'CarFront', defaultSlots: 1, area: 'service', isActive: true },
  
  { id: 'svc_cash_1', label: 'Caixa 1', designation: 'CX 1', icon: 'UserCircle', defaultSlots: 1, area: 'service', isActive: true },
  { id: 'svc_cash_2', label: 'Caixa 2', designation: 'CX 2', icon: 'UserCircle', defaultSlots: 1, area: 'service', isActive: true },
  { id: 'svc_cash_3', label: 'Caixa 3', designation: 'CX 3', icon: 'UserCircle', defaultSlots: 1, area: 'service', isActive: true },

  // --- DELIVERY ---
  { id: 'del_prep', label: 'Delivery - Preparador', designation: 'DEL PREP', icon: 'ShoppingBag', defaultSlots: 1, area: 'delivery', isActive: true },
  { id: 'del_check', label: 'Delivery - Verificador', designation: 'DEL CHECK', icon: 'CheckCircle2', defaultSlots: 1, area: 'delivery', isActive: true },
  { id: 'del_hot', label: 'Delivery - Quentes', designation: 'DEL HOT', icon: 'Coffee', defaultSlots: 1, area: 'delivery', isActive: true },

  // --- SALA ---
  { id: 'lobby_1', label: 'Sala 1', designation: 'SALA 1', icon: 'Users', defaultSlots: 1, area: 'lobby', isActive: true },
  { id: 'lobby_2', label: 'Sala 2', designation: 'SALA 2', icon: 'Users', defaultSlots: 1, area: 'lobby', isActive: true },
  
  { id: 'rp_1', label: 'RP / GEL 1', designation: 'RP 1', icon: 'HeartHandshake', defaultSlots: 1, area: 'lobby', isActive: true },
  { id: 'rp_2', label: 'RP / GEL 2', designation: 'RP 2', icon: 'HeartHandshake', defaultSlots: 1, area: 'lobby', isActive: true },
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
  customStations: STATIONS // Initialize with default list
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
  RP: "Relações Públicas"
};

export const ROLE_COLORS: Record<RoleType, string> = {
  GERENTE: "bg-blue-100 text-blue-800 border-blue-200 ring-blue-500",
  TREINADOR: "bg-green-100 text-green-800 border-green-200 ring-green-500",
  RP: "bg-pink-100 text-pink-800 border-pink-200 ring-pink-500"
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
  },
  {
    id: '2', date: '2023-10-13', dayOfWeek: 5, totalSales: 8050, totalGC: 1113,
    slots: {
      "12:00-13:00": { sales: 1050, gc: 159 },
      "13:00-14:00": { sales: 1113, gc: 200 },
      "14:00-15:00": { sales: 606, gc: 108 },
      "19:00-20:00": { sales: 641, gc: 80 },
      "20:00-21:00": { sales: 629, gc: 93 },
      "21:00-22:00": { sales: 305, gc: 46 },
    }
  },
  {
    id: '3', date: '2023-10-20', dayOfWeek: 5, totalSales: 7760, totalGC: 1078,
    slots: {
      "12:00-13:00": { sales: 776, gc: 116 },
      "13:00-14:00": { sales: 1078, gc: 176 },
      "14:00-15:00": { sales: 569, gc: 102 },
      "19:00-20:00": { sales: 542, gc: 62 },
      "20:00-21:00": { sales: 467, gc: 73 },
      "21:00-22:00": { sales: 307, gc: 45 },
    }
  },
  {
    id: '4', date: '2023-10-27', dayOfWeek: 5, totalSales: 8134, totalGC: 1046,
    slots: {
      "12:00-13:00": { sales: 1134, gc: 174 },
      "13:00-14:00": { sales: 1046, gc: 173 },
      "14:00-15:00": { sales: 543, gc: 100 },
      "19:00-20:00": { sales: 505, gc: 64 },
      "20:00-21:00": { sales: 707, gc: 87 },
      "21:00-22:00": { sales: 162, gc: 33 },
    }
  },
  {
    id: '5', date: '2023-11-03', dayOfWeek: 5, totalSales: 7004, totalGC: 1208,
    slots: {
      "12:00-13:00": { sales: 1004, gc: 147 },
      "13:00-14:00": { sales: 1208, gc: 174 },
      "14:00-15:00": { sales: 479, gc: 87 },
      "19:00-20:00": { sales: 626, gc: 84 },
      "20:00-21:00": { sales: 574, gc: 71 },
      "21:00-22:00": { sales: 205, gc: 37 },
    }
  }
];

export const DEFAULT_STAFFING_TABLE: StaffingTableEntry[] = [
    { id: '1', minSales: 0, maxSales: 99, staffCount: 3, stationLabel: 'BC Grelhador 1' },
    { id: '2', minSales: 100, maxSales: 290, staffCount: 4, stationLabel: 'Expedidor 1' },
    { id: '3', minSales: 291, maxSales: 370, staffCount: 5, stationLabel: 'Iniciador 1' },
    { id: '4', minSales: 371, maxSales: 450, staffCount: 6, stationLabel: 'Bebidas - Iniciador' },
    { id: '5', minSales: 451, maxSales: 530, staffCount: 7, stationLabel: 'Iniciador 2' },
    { id: '6', minSales: 531, maxSales: 580, staffCount: 8, stationLabel: 'Caixa 1' },
    { id: '7', minSales: 581, maxSales: 620, staffCount: 9, stationLabel: 'BC Grelhador 2' },
    { id: '8', minSales: 621, maxSales: 740, staffCount: 10, stationLabel: 'Batata 1' },
    { id: '9', minSales: 741, maxSales: 830, staffCount: 11, stationLabel: 'RP / GEL 1' },
    { id: '10', minSales: 831, maxSales: 910, staffCount: 12, stationLabel: 'Apresentador 1' },
    { id: '11', minSales: 911, maxSales: 990, staffCount: 13, stationLabel: 'Finalizador 1' },
    { id: '12', minSales: 991, maxSales: 1100, staffCount: 14, stationLabel: 'Delivery - Preparador' },
    { id: '13', minSales: 1101, maxSales: 1200, staffCount: 15, stationLabel: 'Expedidor 2' },
    { id: '14', minSales: 1201, maxSales: 1300, staffCount: 16, stationLabel: 'Finalizador 2' },
    { id: '15', minSales: 1301, maxSales: 1400, staffCount: 17, stationLabel: 'Apresentador 2' },
    { id: '16', minSales: 1401, maxSales: 1550, staffCount: 18, stationLabel: 'Preparador (Montagem) 1' },
    { id: '17', minSales: 1551, maxSales: 1750, staffCount: 19, stationLabel: 'Bebidas - Finalizador' },
    { id: '18', minSales: 1751, maxSales: 1950, staffCount: 20, stationLabel: 'Sala 1' },
    { id: '19', minSales: 1951, maxSales: 2100, staffCount: 21, stationLabel: 'Preparador (Montagem) 2' },
    { id: '20', minSales: 2101, maxSales: 2300, staffCount: 22, stationLabel: 'Runner 1' },
    { id: '21', minSales: 2301, maxSales: 2450, staffCount: 23, stationLabel: 'Batata 2' },
    { id: '22', minSales: 2451, maxSales: 2600, staffCount: 24, stationLabel: 'Preparador (Montagem) 3' },
    { id: '23', minSales: 2601, maxSales: 2750, staffCount: 25, stationLabel: 'Runner 2' },
    { id: '24', minSales: 2751, maxSales: 2900, staffCount: 26, stationLabel: 'Caixa 2' },
    { id: '25', minSales: 2901, maxSales: 3050, staffCount: 27, stationLabel: 'Bebidas - Gelados' },
    { id: '26', minSales: 3051, maxSales: 3200, staffCount: 28, stationLabel: 'Delivery - Verificador' },
    { id: '27', minSales: 3201, maxSales: 3350, staffCount: 29, stationLabel: 'Preparador (Montagem) 4' },
    { id: '28', minSales: 3351, maxSales: 3500, staffCount: 30, stationLabel: 'BC Fritadeiras 1' },
    { id: '29', minSales: 3501, maxSales: 3650, staffCount: 31, stationLabel: 'Sala 2' },
    { id: '30', minSales: 3651, maxSales: 3800, staffCount: 32, stationLabel: 'BC Fritadeiras 2' },
    { id: '31', minSales: 3801, maxSales: 3950, staffCount: 33, stationLabel: 'Caixa 3' },
    { id: '32', minSales: 3951, maxSales: 4100, staffCount: 34, stationLabel: 'Apresentador Externo 1' }
];

export const MOCK_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Ana Silva', role: 'GERENTE', isActive: true },
  { id: '2', name: 'Carlos Sousa', role: 'TREINADOR', isActive: true },
  { id: '3', name: 'Beatriz Costa', role: 'RP', isActive: true },
  { id: '4', name: 'David Lima', role: 'TREINADOR', isActive: true },
  { id: '5', name: 'Eduardo Reis', role: 'TREINADOR', isActive: true },
  { id: '6', name: 'Sofia Martins', role: 'RP', isActive: true },
  { id: '7', name: 'João Santos', role: 'TREINADOR', isActive: true },
  { id: '8', name: 'Maria Dias', role: 'RP', isActive: true },
];