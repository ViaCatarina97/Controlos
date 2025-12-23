import { createClient } from '@supabase/supabase-js';

// Estas variáveis serão lidas das 'Environment Variables' que configuraste no Vercel
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERRO: As chaves do Supabase não foram encontradas no ambiente!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
