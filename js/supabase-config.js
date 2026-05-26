/**
 * ═══════════════════════════════════════════════
 *  SUPABASE CONFIGURATION — JMS Website
 * ═══════════════════════════════════════════════
 *
 *  SETUP INSTRUCTIONS:
 *  1. Go to https://supabase.com → your project → Settings → API
 *  2. Copy your "Project URL" and paste it as SUPABASE_URL below
 *  3. Copy your "anon / public" key and paste it as SUPABASE_ANON_KEY below
 *  4. Save this file — all other scripts will use this shared client
 *
 *  ⚠️  NEVER commit your service_role key here — anon key only!
 */

const SUPABASE_URL = 'YOUR_SUPABASE_PROJECT_URL';       // e.g. https://xyzxyz.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY';     // starts with eyJh...

// ─── Create the shared Supabase client (loaded via CDN) ───────────────────────
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
