/**
 * ═══════════════════════════════════════════════
 *  AUTH.JS — Authentication & Route Guard
 *  JMS Website
 * ═══════════════════════════════════════════════
 *
 *  Exports:
 *  - loginAdmin(email, password)  → logs in via Supabase Auth
 *  - logoutAdmin()                → signs out + redirects to login
 *  - requireAuth()                → call on protected pages; redirects if not logged in
 *  - getAdminProfile()            → returns { full_name, role_tag } for current user
 */

'use strict';

/* ── Login ─────────────────────────────────────────────────────────────────── */
async function loginAdmin(email, password) {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password
    });

    if (error) throw error;
    return data;
}

/* ── Logout ────────────────────────────────────────────────────────────────── */
async function logoutAdmin() {
    await supabaseClient.auth.signOut();
    window.location.href = 'admin_login.html';
}

/* ── Route Guard ───────────────────────────────────────────────────────────── */
// Call this at the top of any protected page (admin_dashboard.html).
// If no session exists, immediately redirects to login.
async function requireAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'admin_login.html';
        return null;
    }
    return session;
}

/* ── Get Admin Profile ─────────────────────────────────────────────────────── */
// Fetches the logged-in admin's full_name and role_tag from admin_profiles table
async function getAdminProfile() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabaseClient
        .from('admin_profiles')
        .select('full_name, role_tag')
        .eq('id', user.id)
        .single();

    if (error) {
        console.warn('Could not fetch admin profile:', error.message);
        return { full_name: user.email, role_tag: 'Admin' };
    }

    return data;
}
