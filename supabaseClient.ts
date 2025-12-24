import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Erro: As chaves do Supabase não foram encontradas nas variáveis de ambiente!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
