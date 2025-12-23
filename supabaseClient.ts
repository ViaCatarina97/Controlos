import { createClient } from '@supabase/supabase-js';

// Podes encontrar estes valores em Supabase > Settings > API
const supabaseUrl = https://yjfidxhvwblhyxdxwhuu.supabase.co;
const supabaseKey = sb_publishable_pO8tjSbdX6H5HDcfuFAQ7Q_AlS2UAhq;

export const supabase = createClient(supabaseUrl, supabaseKey);
