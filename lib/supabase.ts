import { createClient } from '@supabase/supabase-js'

// ⚠️ REMPLACE CI-DESSOUS PAR TES VRAIES URL ET CLÉS (Celles que tu as mises dans l'Admin)
// Exemple : 'https://xyz.supabase.co'
const supabaseUrl = 'https://kdoodpxjgczqajykcqcd.supabase.co' 

// Exemple : 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
const supabaseKey = 'sb_publishable_ddklRnFtTbJ6C9hVK3sU2w_Ocj8QHSs'

export const supabase = createClient(supabaseUrl, supabaseKey)