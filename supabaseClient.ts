import { createClient } from '@supabase/supabase-js';

// No Vite, usamos import.meta.env
const supabaseUrl = import.meta.env.https://yjfidxhvwblhyxdxwhuu.supabase.co;
const supabaseKey = import.meta.env.eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlqZmlkeGh2d2JsaHl4ZHh3aHV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY0OTMyMTQsImV4cCI6MjA4MjA2OTIxNH0.zOWj65-yWGOZkif38py8MPw8jiegS7R4efGQP67DL0E;

if (!supabaseUrl || !supabaseKey) {
  console.error("ERRO: As chaves do Supabase não foram encontradas!");
}

export const supabase = createClient(supabaseUrl, supabaseKey);
