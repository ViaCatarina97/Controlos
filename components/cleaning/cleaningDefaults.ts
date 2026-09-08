import { CleaningTaskItem, CleaningDayOfWeek } from '../../types';

export const CLEANING_DAYS: { key: CleaningDayOfWeek; label: string; shortLabel: string }[] = [
  { key: 'segunda', label: 'Segunda-feira', shortLabel: '2ª Feira' },
  { key: 'terca', label: 'Terça-feira', shortLabel: '3ª Feira' },
  { key: 'quarta', label: 'Quarta-feira', shortLabel: '4ª Feira' },
  { key: 'quinta', label: 'Quinta-feira', shortLabel: '5ª Feira' },
  { key: 'sexta', label: 'Sexta-feira', shortLabel: '6ª Feira' },
  { key: 'sabado', label: 'Sábado', shortLabel: 'Sáb' },
  { key: 'domingo', label: 'Domingo', shortLabel: 'Dom' },
];

export const CLEANING_SHIFTS: { key: 'abertura' | 'intermedio' | 'fecho'; label: string }[] = [
  { key: 'abertura', label: 'Abertura' },
  { key: 'intermedio', label: 'Intermédio' },
  { key: 'fecho', label: 'Fecho' },
];

export const DEFAULT_CLEANING_AREAS: string[] = [
  'Cozinha',
  'Balcão',
  'Bebidas',
  'Sala',
  'Sala Pausa',
  "WC's",
  'Copa',
  'Corredor',
  'Aquário',
  'Arca Positiva',
  'Arca Negativa',
  'Stock'
];

export const DEFAULT_WEEKLY_TASKS: CleaningTaskItem[] = [
  // --- SEGUNDA-FEIRA ---
  // Abertura
  { id: 'w_seg_ab_1', day: 'segunda', shift: 'abertura', tarefa: 'Cortina', area: 'Arca Negativa' },
  { id: 'w_seg_ab_2', day: 'segunda', shift: 'abertura', tarefa: 'Porta', area: 'Arca Negativa' },
  { id: 'w_seg_ab_3', day: 'segunda', shift: 'abertura', tarefa: 'Armário', area: 'Arca Negativa' },
  { id: 'w_seg_ab_4', day: 'segunda', shift: 'abertura', tarefa: 'Chão', area: 'Arca Negativa' },
  { id: 'w_seg_ab_5', day: 'segunda', shift: 'abertura', tarefa: 'Madeiras', area: 'Sala' },
  { id: 'w_seg_ab_6', day: 'segunda', shift: 'abertura', tarefa: 'Monitores', area: 'Balcão' },
  // Intermédio
  { id: 'w_seg_int_1', day: 'segunda', shift: 'intermedio', tarefa: 'Dispensadores coberturas sólidas e líquidas', area: 'Bebidas' },
  { id: 'w_seg_int_2', day: 'segunda', shift: 'intermedio', tarefa: 'Zona MOP', area: 'Copa' },
  { id: 'w_seg_int_3', day: 'segunda', shift: 'intermedio', tarefa: 'Carrinho filtragens nº 1', area: 'Cozinha' },
  { id: 'w_seg_int_4', day: 'segunda', shift: 'intermedio', tarefa: 'Saboneteiras', area: "WC's" },
  // Fecho
  { id: 'w_seg_fec_1', day: 'segunda', shift: 'fecho', tarefa: 'Arca 10:1', area: 'Cozinha' },
  { id: 'w_seg_fec_2', day: 'segunda', shift: 'fecho', tarefa: 'Mesas cozinha', area: 'Cozinha' },
  { id: 'w_seg_fec_3', day: 'segunda', shift: 'fecho', tarefa: 'Balcão bebidas', area: 'Bebidas' },
  { id: 'w_seg_fec_4', day: 'segunda', shift: 'fecho', tarefa: 'Frigomilk', area: 'Bebidas' },
  { id: 'w_seg_fec_5', day: 'segunda', shift: 'fecho', tarefa: 'Torre de bebidas', area: 'Bebidas' },
  { id: 'w_seg_fec_6', day: 'segunda', shift: 'fecho', tarefa: 'Ralos', area: 'Bebidas' },

  // --- TERÇA-FEIRA ---
  // Abertura
  { id: 'w_ter_ab_1', day: 'terca', shift: 'abertura', tarefa: 'Porta', area: 'Sala Pausa' },
  { id: 'w_ter_ab_2', day: 'terca', shift: 'abertura', tarefa: 'Mesas', area: 'Sala Pausa' },
  { id: 'w_ter_ab_3', day: 'terca', shift: 'abertura', tarefa: 'Sofás', area: 'Sala Pausa' },
  { id: 'w_ter_ab_4', day: 'terca', shift: 'abertura', tarefa: 'Caixote lixo', area: 'Sala Pausa' },
  { id: 'w_ter_ab_5', day: 'terca', shift: 'abertura', tarefa: "Inox's", area: 'Sala Pausa' },
  // Intermédio
  { id: 'w_ter_int_1', day: 'terca', shift: 'intermedio', tarefa: 'Garagens gavetas grelhador e UHC', area: 'Cozinha' },
  { id: 'w_ter_int_2', day: 'terca', shift: 'intermedio', tarefa: 'Gavetas UHC', area: 'Cozinha' },
  { id: 'w_ter_int_3', day: 'terca', shift: 'intermedio', tarefa: 'Grelhas UHC', area: 'Cozinha' },
  // Fecho
  { id: 'w_ter_fec_1', day: 'terca', shift: 'fecho', tarefa: 'Máquina tabuleiros', area: 'Copa' },
  { id: 'w_ter_fec_2', day: 'terca', shift: 'fecho', tarefa: 'Arch Fry', area: 'Cozinha' },
  { id: 'w_ter_fec_3', day: 'terca', shift: 'fecho', tarefa: 'Arca auxiliar positiva', area: 'Cozinha' },
  { id: 'w_ter_fec_4', day: 'terca', shift: 'fecho', tarefa: 'Ralos', area: 'Cozinha' },

  // --- QUARTA-FEIRA ---
  // Abertura
  { id: 'w_qua_ab_1', day: 'quarta', shift: 'abertura', tarefa: 'Mesa bebidas', area: 'Bebidas' },
  { id: 'w_qua_ab_2', day: 'quarta', shift: 'abertura', tarefa: 'Mesa serviço', area: 'Balcão' },
  { id: 'w_qua_ab_3', day: 'quarta', shift: 'abertura', tarefa: 'Mesas sala', area: 'Sala' },
  { id: 'w_qua_ab_4', day: 'quarta', shift: 'abertura', tarefa: 'Cadeiras e sofás', area: 'Sala' },
  { id: 'w_qua_ab_5', day: 'quarta', shift: 'abertura', tarefa: 'Monitores', area: 'Sala' },
  // Intermédio
  { id: 'w_qua_int_1', day: 'quarta', shift: 'intermedio', tarefa: 'Baldes brancos e cinzentos', area: 'Copa' },
  { id: 'w_qua_int_2', day: 'quarta', shift: 'intermedio', tarefa: 'Caixotes vermelhos', area: 'Copa' },
  { id: 'w_qua_int_3', day: 'quarta', shift: 'intermedio', tarefa: 'Caixotes cozinha', area: 'Cozinha' },
  { id: 'w_qua_int_4', day: 'quarta', shift: 'intermedio', tarefa: 'Máquina de lavar', area: 'Copa' },
  // Fecho
  { id: 'w_qua_fec_1', day: 'quarta', shift: 'fecho', tarefa: 'Estufas UHC', area: 'Cozinha' },
  { id: 'w_qua_fec_2', day: 'quarta', shift: 'fecho', tarefa: 'Arca 4:1', area: 'Cozinha' },
  { id: 'w_qua_fec_3', day: 'quarta', shift: 'fecho', tarefa: 'Armário bebidas', area: 'Corredor' },
  { id: 'w_qua_fec_4', day: 'quarta', shift: 'fecho', tarefa: 'Ralos', area: 'Bebidas' },

  // --- QUINTA-FEIRA ---
  // Abertura
  { id: 'w_qui_ab_1', day: 'quinta', shift: 'abertura', tarefa: 'Parede preta e rodapé', area: 'Balcão' },
  { id: 'w_qui_ab_2', day: 'quinta', shift: 'abertura', tarefa: 'Cortina', area: 'Arca Positiva' },
  { id: 'w_qui_ab_3', day: 'quinta', shift: 'abertura', tarefa: 'Porta', area: 'Arca Positiva' },
  { id: 'w_qui_ab_4', day: 'quinta', shift: 'abertura', tarefa: 'Prateleiras', area: 'Arca Positiva' },
  { id: 'w_qui_ab_5', day: 'quinta', shift: 'abertura', tarefa: "Inox's", area: 'Arca Positiva' },
  // Intermédio
  { id: 'w_qui_int_1', day: 'quinta', shift: 'intermedio', tarefa: 'Rodas equipamentos', area: 'Cozinha' },
  { id: 'w_qui_int_2', day: 'quinta', shift: 'intermedio', tarefa: 'Saídas AVAC', area: 'Sala' },
  { id: 'w_qui_int_3', day: 'quinta', shift: 'intermedio', tarefa: 'Chão Stock', area: 'Stock' },
  { id: 'w_qui_int_4', day: 'quinta', shift: 'intermedio', tarefa: 'Armário Detergentes', area: 'Corredor' },
  // Fecho
  { id: 'w_qui_fec_1', day: 'quinta', shift: 'fecho', tarefa: 'Suporte molhos', area: 'Cozinha' },
  { id: 'w_qui_fec_2', day: 'quinta', shift: 'fecho', tarefa: 'Tampas fritadeiras', area: 'Cozinha' },
  { id: 'w_qui_fec_3', day: 'quinta', shift: 'fecho', tarefa: 'Carrinhos cestos', area: 'Cozinha' },
  { id: 'w_qui_fec_4', day: 'quinta', shift: 'fecho', tarefa: 'Ralos', area: 'Cozinha' },

  // --- SEXTA-FEIRA ---
  // Abertura
  { id: 'w_sex_ab_1', day: 'sexta', shift: 'abertura', tarefa: 'Louças', area: "WC's" },
  { id: 'w_sex_ab_2', day: 'sexta', shift: 'abertura', tarefa: 'Espelhos', area: "WC's" },
  { id: 'w_sex_ab_3', day: 'sexta', shift: 'abertura', tarefa: 'Cacifos', area: "WC's" },
  { id: 'w_sex_ab_4', day: 'sexta', shift: 'abertura', tarefa: 'Chão', area: "WC's" },
  { id: 'w_sex_ab_5', day: 'sexta', shift: 'abertura', tarefa: 'Portas', area: "WC's" },
  { id: 'w_sex_ab_6', day: 'sexta', shift: 'abertura', tarefa: 'Monitores', area: "WC's" },
  // Intermédio
  { id: 'w_sex_int_1', day: 'sexta', shift: 'intermedio', tarefa: 'Carrinhos pão', area: 'Cozinha' },
  { id: 'w_sex_int_2', day: 'sexta', shift: 'intermedio', tarefa: 'Carrinhos ambientação', area: 'Copa' },
  { id: 'w_sex_int_3', day: 'sexta', shift: 'intermedio', tarefa: 'Posto lavagem das mãos', area: 'Copa' },
  { id: 'w_sex_int_4', day: 'sexta', shift: 'intermedio', tarefa: 'Arca auxiliar bebidas', area: 'Bebidas' },
  // Fecho
  { id: 'w_sex_fec_1', day: 'sexta', shift: 'fecho', tarefa: 'Batateira', area: 'Balcão' },
  { id: 'w_sex_fec_2', day: 'sexta', shift: 'fecho', tarefa: 'Carrinhos batateira', area: 'Cozinha' },
  { id: 'w_sex_fec_3', day: 'sexta', shift: 'fecho', tarefa: 'Arca auxiliar negativa', area: 'Cozinha' },
  { id: 'w_sex_fec_4', day: 'sexta', shift: 'fecho', tarefa: 'Ralos', area: 'Balcão' },

  // --- SÁBADO ---
  // Abertura
  { id: 'w_sab_ab_1', day: 'sabado', shift: 'abertura', tarefa: 'Porta', area: 'Aquário' },
  { id: 'w_sab_ab_2', day: 'sabado', shift: 'abertura', tarefa: 'Armários', area: 'Aquário' },
  { id: 'w_sab_ab_3', day: 'sabado', shift: 'abertura', tarefa: 'Bastidor', area: 'Aquário' },
  { id: 'w_sab_ab_4', day: 'sabado', shift: 'abertura', tarefa: 'Balcão', area: 'Aquário' },
  { id: 'w_sab_ab_5', day: 'sabado', shift: 'abertura', tarefa: 'Grades sala', area: 'Sala' },
  { id: 'w_sab_ab_6', day: 'sabado', shift: 'abertura', tarefa: 'Ponto entrega', area: 'Balcão' },
  { id: 'w_sab_ab_7', day: 'sabado', shift: 'abertura', tarefa: "Inox's", area: 'Sala' },
  // Intermédio
  { id: 'w_sab_int_1', day: 'sabado', shift: 'intermedio', tarefa: 'Recipientes mesa condimentação', area: 'Cozinha' },
  { id: 'w_sab_int_2', day: 'sabado', shift: 'intermedio', tarefa: 'Recipientes mesa serviço', area: 'Balcão' },
  { id: 'w_sab_int_3', day: 'sabado', shift: 'intermedio', tarefa: "Bobby's", area: 'Corredor' },
  { id: 'w_sab_int_4', day: 'sabado', shift: 'intermedio', tarefa: 'Multiplex', area: 'Corredor' },
  // Fecho
  { id: 'w_sab_fec_1', day: 'sabado', shift: 'fecho', tarefa: 'Carrinho filtragem nº 2', area: 'Cozinha' },
  { id: 'w_sab_fec_2', day: 'sabado', shift: 'fecho', tarefa: 'Linhas multiplex', area: 'Corredor' },
  { id: 'w_sab_fec_3', day: 'sabado', shift: 'fecho', tarefa: 'Fritadeiras', area: 'Cozinha' },
  { id: 'w_sab_fec_4', day: 'sabado', shift: 'fecho', tarefa: 'Exaustão fritadeiras', area: 'Cozinha' },
  { id: 'w_sab_fec_5', day: 'sabado', shift: 'fecho', tarefa: 'Ralos', area: 'Cozinha' },

  // --- DOMINGO ---
  // Abertura
  { id: 'w_dom_ab_1', day: 'domingo', shift: 'abertura', tarefa: 'Vidros', area: 'Sala' },
  { id: 'w_dom_ab_2', day: 'domingo', shift: 'abertura', tarefa: 'Porta cais', area: 'Corredor' },
  { id: 'w_dom_ab_3', day: 'domingo', shift: 'abertura', tarefa: "POS's", area: 'Balcão' },
  { id: 'w_dom_ab_4', day: 'domingo', shift: 'abertura', tarefa: 'Montra HM', area: 'Sala' },
  { id: 'w_dom_ab_5', day: 'domingo', shift: 'abertura', tarefa: "DMB's", area: 'Balcão' },
  { id: 'w_dom_ab_6', day: 'domingo', shift: 'abertura', tarefa: "Kiosk's", area: 'Sala' },
  // Intermédio
  { id: 'w_dom_int_1', day: 'domingo', shift: 'intermedio', tarefa: 'Pinos sala', area: 'Sala' },
  { id: 'w_dom_int_2', day: 'domingo', shift: 'intermedio', tarefa: "Soup holder's", area: 'Bebidas' },
  { id: 'w_dom_int_3', day: 'domingo', shift: 'intermedio', tarefa: 'Carrinhos balcão', area: 'Balcão' },
  { id: 'w_dom_int_4', day: 'domingo', shift: 'intermedio', tarefa: 'Rodapés', area: 'Copa' },
  { id: 'w_dom_int_5', day: 'domingo', shift: 'intermedio', tarefa: 'Rodapés', area: 'Corredor' },
  // Fecho
  { id: 'w_dom_fec_1', day: 'domingo', shift: 'fecho', tarefa: 'Grelhadores', area: 'Cozinha' },
  { id: 'w_dom_fec_2', day: 'domingo', shift: 'fecho', tarefa: 'Exaustão grelhadores', area: 'Cozinha' },
  { id: 'w_dom_fec_3', day: 'domingo', shift: 'fecho', tarefa: 'OAT', area: 'Balcão' },
  { id: 'w_dom_fec_4', day: 'domingo', shift: 'fecho', tarefa: 'Ralos', area: 'Balcão' }
];

export const DEFAULT_ZELADOR_TASKS: CleaningTaskItem[] = [
  // Segunda Feira
  { id: 'z_seg_1', day: 'segunda', tarefa: 'Limpeza Eletroestáticos', area: 'Cozinha' },
  { id: 'z_seg_2', day: 'segunda', tarefa: 'Verificação e substituição lâminas espátulas e raspadores', area: 'Cozinha' },
  { id: 'z_seg_3', day: 'segunda', tarefa: 'Recuperação Chão', area: 'Bebidas' },
  { id: 'z_seg_4', day: 'segunda', tarefa: 'Recuperação Chão', area: 'Balcão' },

  // Terça Feira
  { id: 'z_ter_1', day: 'terca', tarefa: 'Limpeza das Aletas - Arcas auxiliares, Arch Fry, Máquina Gelados', area: 'Cozinha' },
  { id: 'z_ter_2', day: 'terca', tarefa: 'Limpeza Sistema Ansul', area: 'Cozinha' },
  { id: 'z_ter_3', day: 'terca', tarefa: 'Limpeza fossa sala de pausa', area: 'Sala Pausa' },
  { id: 'z_ter_4', day: 'terca', tarefa: 'Tetos e Saídas AVAC', area: 'Bebidas' },

  // Quarta Feira
  { id: 'z_qua_1', day: 'quarta', tarefa: 'Limpeza Eletroestáticos', area: 'Cozinha' },
  { id: 'z_qua_2', day: 'quarta', tarefa: 'Organização Arrecadação', area: 'Cozinha' },
  { id: 'z_qua_3', day: 'quarta', tarefa: 'Tetos e Saídas AVAC', area: 'Cozinha' },
  { id: 'z_qua_4', day: 'quarta', tarefa: 'Verificação iluminação', area: 'Sala' },

  // Quinta Feira
  { id: 'z_qui_1', day: 'quinta', tarefa: 'Limpeza impressoras stick e POS', area: 'Cozinha' },
  { id: 'z_qui_2', day: 'quinta', tarefa: 'Limpeza candeeiros', area: 'Sala' },
  { id: 'z_qui_3', day: 'quinta', tarefa: 'Tetos e Saídas AVAC', area: 'Copa' },
  { id: 'z_qui_4', day: 'quinta', tarefa: 'Tetos e Saídas AVAC', area: 'Corredor' },

  // Sexta Feira
  { id: 'z_sex_1', day: 'sexta', tarefa: 'Limpeza Eletroestáticos', area: 'Cozinha' },
  { id: 'z_sex_2', day: 'sexta', tarefa: 'Manutenção caixa de gordura', area: 'Copa' },
  { id: 'z_sex_3', day: 'sexta', tarefa: 'Recuperação Chão', area: 'Cozinha' },
  { id: 'z_sex_4', day: 'sexta', tarefa: 'Recuperação Chão', area: 'Corredor' },

  // Sábado
  { id: 'z_sab_1', day: 'sabado', tarefa: 'Limpeza Profunda Equipamentos de Fritura', area: 'Cozinha' },
  { id: 'z_sab_2', day: 'sabado', tarefa: 'Verificação e Higienização Ralos Exteriores', area: 'Corredor' },

  // Domingo
  { id: 'z_dom_1', day: 'domingo', tarefa: 'Limpeza Geral Grelhas e Motores de Frio', area: 'Arca Positiva' },
  { id: 'z_dom_2', day: 'domingo', tarefa: 'Organização e Lavagem Baldes e Caixotes', area: 'Copa' }
];

/**
 * Computes the Monday (start) and Sunday (end) date strings (YYYY-MM-DD) for any reference date.
 */
export function getWeekRange(dateInput: Date | string = new Date()): {
  weekStartDate: string;
  weekEndDate: string;
  weekNumber: number;
  year: number;
  formattedRange: string;
} {
  const d = new Date(dateInput);
  d.setHours(0, 0, 0, 0);

  // Day of week: 0 is Sunday, 1 is Monday, ..., 6 is Saturday
  const day = d.getDay();
  // Calculate difference to Monday
  const diffToMonday = (day === 0 ? -6 : 1) - day;
  const monday = new Date(d);
  monday.setDate(d.getDate() + diffToMonday);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);

  const formatISO = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const dayStr = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${dayStr}`;
  };

  const formatShort = (date: Date) => {
    const dayStr = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    return `${dayStr}/${m}`;
  };

  // ISO week number calculation
  const target = new Date(monday.valueOf());
  const dayNr = (monday.getDay() + 6) % 7;
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);

  const weekStartDate = formatISO(monday);
  const weekEndDate = formatISO(sunday);
  const formattedRange = `${formatShort(monday)} a ${formatShort(sunday)}/${sunday.getFullYear()}`;

  return {
    weekStartDate,
    weekEndDate,
    weekNumber,
    year: monday.getFullYear(),
    formattedRange
  };
}

/**
 * Returns formatted date for each day of the week given the week's Monday date.
 */
export function getDatesForWeek(weekStartDate: string): Record<CleaningDayOfWeek, { dateStr: string; displayStr: string }> {
  const [y, m, d] = weekStartDate.split('-').map(Number);
  const monday = new Date(y, m - 1, d);

  const keys: CleaningDayOfWeek[] = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];
  const res = {} as Record<CleaningDayOfWeek, { dateStr: string; displayStr: string }>;

  keys.forEach((key, index) => {
    const current = new Date(monday);
    current.setDate(monday.getDate() + index);

    const year = current.getFullYear();
    const month = String(current.getMonth() + 1).padStart(2, '0');
    const day = String(current.getDate()).padStart(2, '0');

    res[key] = {
      dateStr: `${year}-${month}-${day}`,
      displayStr: `${day}/${month}/${year}`
    };
  });

  return res;
}

/**
 * Returns Monday YYYY-MM-DD for any date or today
 */
export function getMondayOfWeek(dateInput: Date | string = new Date()): string {
  return getWeekRange(dateInput).weekStartDate;
}

export const DEFAULT_WEEKLY_CLEANING_TASKS = DEFAULT_WEEKLY_TASKS;
export const DEFAULT_ZELADOR_CLEANING_TASKS = DEFAULT_ZELADOR_TASKS;
