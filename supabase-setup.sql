-- ═══════════════════════════════════════════════════════════════════════════
--  JMS SUPABASE DATABASE SETUP SCRIPT
--  Jewel Model Schools Website
--
--  HOW TO USE:
--  1. Go to https://supabase.com → your project → SQL Editor
--  2. Click "New Query"
--  3. Paste this ENTIRE script and click "Run"
--  4. Then follow STEP 3 below to create your 5 admin accounts
-- ═══════════════════════════════════════════════════════════════════════════


-- ══════════════════════════════════════════
--  STEP 1: CREATE TABLES
-- ══════════════════════════════════════════

-- Table 1: Admin Profiles
-- Linked to Supabase Auth users via UUID
CREATE TABLE IF NOT EXISTS admin_profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL,
    role_tag    TEXT NOT NULL DEFAULT 'Admin',
    created_at  TIMESTAMPTZ DEFAULT now()
);

-- Table 2: Blog Posts
CREATE TABLE IF NOT EXISTS blog_posts (
    id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title       TEXT NOT NULL,
    body        TEXT NOT NULL DEFAULT '',     -- Rich HTML from Quill editor
    tag         TEXT,
    author_id   UUID REFERENCES admin_profiles(id) ON DELETE SET NULL,
    image_url   TEXT,
    status      TEXT DEFAULT 'published'
                    CHECK (status IN ('published', 'draft')),
    featured    BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- Table 3: Newsletter Subscribers
CREATE TABLE IF NOT EXISTS subscribers (
    id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email         TEXT UNIQUE NOT NULL,
    subscribed_at TIMESTAMPTZ DEFAULT now()
);

-- Table 4: Site Settings (news ticker, announcements, etc.)
CREATE TABLE IF NOT EXISTS site_settings (
    key         TEXT PRIMARY KEY,
    value       JSONB NOT NULL,
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- ── Default site settings ──────────────────────────────────────────────────
INSERT INTO site_settings (key, value) VALUES
    ('ticker_items', '[
        "🏆 JMS wins Overall at HIASFEST 2026",
        "📚 Admissions now open for 2026/2027 session",
        "🌟 Nigeria Teen Authors Prize – Poetry Winner 2026",
        "🎨 Teen Artist of the Year 2025 – SEVHAGE Award",
        "📖 Korea-Nigeria Poetry Prize – Multiple Winners"
    ]'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ══════════════════════════════════════════
--  STEP 2: ROW LEVEL SECURITY (RLS)
-- ══════════════════════════════════════════

-- ── Admin Profiles ────────────────────────
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Anyone (public) can read profiles (needed to show author name on blog)
CREATE POLICY "Public can read profiles"
    ON admin_profiles FOR SELECT
    USING (true);

-- Admins can update their own profile only
CREATE POLICY "Admins can update own profile"
    ON admin_profiles FOR UPDATE
    USING (auth.uid() = id);

-- ── Blog Posts ────────────────────────────
ALTER TABLE blog_posts ENABLE ROW LEVEL SECURITY;

-- Public can read published posts
CREATE POLICY "Public can read published posts"
    ON blog_posts FOR SELECT
    USING (status = 'published');

-- Authenticated admins can read all posts (including drafts in dashboard)
CREATE POLICY "Admins can read all posts"
    ON blog_posts FOR SELECT
    USING (auth.role() = 'authenticated');

-- Authenticated admins can insert new posts
CREATE POLICY "Admins can insert posts"
    ON blog_posts FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

-- Authenticated admins can update any post
CREATE POLICY "Admins can update posts"
    ON blog_posts FOR UPDATE
    USING (auth.role() = 'authenticated');

-- Authenticated admins can delete any post
CREATE POLICY "Admins can delete posts"
    ON blog_posts FOR DELETE
    USING (auth.role() = 'authenticated');

-- ── Subscribers ───────────────────────────
ALTER TABLE subscribers ENABLE ROW LEVEL SECURITY;

-- Anyone can subscribe (insert their email)
CREATE POLICY "Anyone can subscribe"
    ON subscribers FOR INSERT
    WITH CHECK (true);

-- Only authenticated admins can read subscriber list
CREATE POLICY "Admins can read subscribers"
    ON subscribers FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only authenticated admins can delete subscribers
CREATE POLICY "Admins can delete subscribers"
    ON subscribers FOR DELETE
    USING (auth.role() = 'authenticated');

-- ── Site Settings ─────────────────────────
ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

-- Public can read site settings (ticker, etc.)
CREATE POLICY "Public can read settings"
    ON site_settings FOR SELECT
    USING (true);

-- Only authenticated admins can update settings
CREATE POLICY "Admins can update settings"
    ON site_settings FOR ALL
    USING (auth.role() = 'authenticated');


-- ══════════════════════════════════════════
--  STEP 3: STORAGE BUCKET
-- ══════════════════════════════════════════
-- NOTE: Run this after creating the bucket manually:
--   Supabase Dashboard → Storage → New Bucket
--   Name: blog-images
--   Public: YES (toggle ON)
--
-- Then come back and run these storage policies:

INSERT INTO storage.buckets (id, name, public)
    VALUES ('blog-images', 'blog-images', true)
    ON CONFLICT (id) DO NOTHING;

-- Public can view images
CREATE POLICY "Public can view blog images"
    ON storage.objects FOR SELECT
    USING ( bucket_id = 'blog-images' );

-- Authenticated admins can upload images
CREATE POLICY "Admins can upload blog images"
    ON storage.objects FOR INSERT
    WITH CHECK (
        bucket_id = 'blog-images'
        AND auth.role() = 'authenticated'
    );

-- Authenticated admins can delete images
CREATE POLICY "Admins can delete blog images"
    ON storage.objects FOR DELETE
    USING (
        bucket_id = 'blog-images'
        AND auth.role() = 'authenticated'
    );


-- ══════════════════════════════════════════
--  STEP 4: CREATE ADMIN USERS
--  (Run AFTER creating users in Auth → Users)
-- ══════════════════════════════════════════
--
--  1. Go to Supabase Dashboard → Authentication → Users
--  2. Click "Add User" for each admin:
--
--     Email              Password (you choose)
--     ──────────────────────────────────────────
--     admin1@jms.com     (set a strong password)
--     admin2@jms.com     (set a strong password)
--     admin3@jms.com     (set a strong password)
--     admin4@jms.com     (set a strong password)
--     admin5@jms.com     (set a strong password)
--
--  3. After creating each user, copy their UUID from the Users list.
--  4. Replace the UUIDs below with the real ones, then run this INSERT.
--
--  EXAMPLE (replace all placeholder UUIDs and names):

INSERT INTO admin_profiles (id, full_name, role_tag) VALUES
    ('REPLACE-WITH-USER-1-UUID', 'Full Name Here', 'Principal'),
    ('REPLACE-WITH-USER-2-UUID', 'Full Name Here', 'Media Lead'),
    ('REPLACE-WITH-USER-3-UUID', 'Full Name Here', 'Academic Director'),
    ('REPLACE-WITH-USER-4-UUID', 'Full Name Here', 'IT Admin'),
    ('REPLACE-WITH-USER-5-UUID', 'Full Name Here', 'Content Writer')
ON CONFLICT (id) DO NOTHING;


-- ══════════════════════════════════════════
--  STEP 5: USEFUL HELPER QUERIES
--  (You can run these anytime to check data)
-- ══════════════════════════════════════════

-- View all blog posts with author names:
-- SELECT bp.title, bp.status, bp.featured, bp.created_at,
--        ap.full_name, ap.role_tag
-- FROM blog_posts bp
-- LEFT JOIN admin_profiles ap ON bp.author_id = ap.id
-- ORDER BY bp.created_at DESC;

-- View all subscribers:
-- SELECT email, subscribed_at FROM subscribers ORDER BY subscribed_at DESC;

-- View site settings:
-- SELECT * FROM site_settings;

-- Count posts by status:
-- SELECT status, COUNT(*) FROM blog_posts GROUP BY status;


-- ══════════════════════════════════════════
--  DONE! ✅
--  Your database is ready.
--  Next step: Fill in your Supabase credentials
--  in js/supabase-config.js
-- ══════════════════════════════════════════
