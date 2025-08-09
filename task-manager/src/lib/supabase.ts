// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

// Soporta Vite y CRA
const url =
  (import.meta as any)?.env?.VITE_SUPABASE_URL ||
  process.env.REACT_APP_SUPABASE_URL;

const anon =
  (import.meta as any)?.env?.VITE_SUPABASE_ANON_KEY ||
  process.env.REACT_APP_SUPABASE_ANON_KEY;

if (!url || !anon) {
  throw new Error(
    'Faltan variables de entorno: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (Vite) ' +
      'o REACT_APP_SUPABASE_URL / REACT_APP_SUPABASE_ANON_KEY (CRA).'
  );
}

export const supabase = createClient(url, anon);
