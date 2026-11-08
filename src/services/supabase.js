// src/services/supabase.js
import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error(
    'Supabase não configurado: crie o arquivo .env.local com VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja SUPABASE.md).'
  );
}

// A chave "anon" é pública por natureza. A segurança vem das regras RLS do banco (supabase/schema.sql).
export const supabase = createClient(url, anonKey);
