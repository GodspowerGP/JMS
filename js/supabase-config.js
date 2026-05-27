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

const SUPABASE_URL = 'https://puofqlazzsjcbsiucuie.supabase.co';       // e.g. https://xyzxyz.supabase.co
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InB1b2ZxbGF6enNqY2JzaXVjdWllIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3OTc1NzMsImV4cCI6MjA5NTM3MzU3M30.fxuOs0MukHeWqKB-RgMevjgdmE30-dMyMmDPr4Abrm0';     // starts with eyJh...

// ─── Create the shared Supabase client (loaded via CDN) ───────────────────────
const { createClient } = supabase;
const supabaseClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
