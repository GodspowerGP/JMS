/**
 * ═══════════════════════════════════════════════
 *  BLOG-HOME.JS — Home Page Blog Preview
 *  JMS Website
 * ═══════════════════════════════════════════════
 *
 *  Fetches the 3 most recent published posts from
 *  Supabase and renders them in the home page
 *  "Latest Stories" section.
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.getElementById('home-blog-grid');
    if (!grid) return;

    try {
        const { data: posts, error } = await supabaseClient
            .from('blog_posts')
            .select(`
                id, title, body, tag, image_url, created_at,
                admin_profiles ( full_name, role_tag )
            `)
            .eq('status', 'published')
            .order('created_at', { ascending: false })
            .limit(3);

        if (error || !posts || posts.length === 0) {
            // Silently hide section if no posts yet
            const section = document.getElementById('home-blog');
            if (section) section.style.display = 'none';
            return;
        }

        grid.innerHTML = posts.map((post, i) => {
            const date    = new Date(post.created_at).toLocaleDateString('en-GB', {
                day: 'numeric', month: 'long', year: 'numeric'
            });
            const isAnon  = !post.author_id;
            const author  = isAnon ? 'Anonymous' : (post.admin_profiles?.full_name || 'Admin');
            const role    = isAnon ? '' : (post.admin_profiles?.role_tag  || '');
            const excerpt = stripHtml(post.body).slice(0, 130) + '…';
            return `
            <div class="col-md-6 col-xl-4" style="animation: fadeIn 0.6s ease forwards;">
                <article class="blog-card">
                    <div class="blog-img-wrap">
                        ${post.tag ? `<span class="blog-tag">${esc(post.tag)}</span>` : ''}
                        ${post.image_url
                            ? `<img src="${esc(post.image_url)}" alt="${esc(post.title)}" loading="lazy">`
                            : `<div style="width:100%;height:200px;background:#f0f4f9;display:flex;align-items:center;justify-content:center;color:#cbd5e1;font-size:32px;"><i class="fas fa-newspaper"></i></div>`
                        }
                    </div>
                    <div class="blog-content">
                        <div class="blog-meta">
                            <span><i class="fas fa-calendar"></i> ${date}</span>
                            <span><i class="fas fa-user"></i> ${esc(author)}${role ? ` &middot; <em style="color:var(--accent-orange,#f97316);font-style:normal;font-weight:600;">${esc(role)}</em>` : ''}</span>
                        </div>
                        <h3 class="blog-card-title">
                            <a href="blog-post.html?id=${post.id}">${esc(post.title)}</a>
                        </h3>
                        <p class="blog-desc">${esc(excerpt)}</p>
                        <a href="blog-post.html?id=${post.id}" class="blog-read">
                            Read More <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </article>
            </div>`;
        }).join('');

    } catch (err) {
        // Fail silently on home page — just hide the section
        const section = document.getElementById('home-blog');
        if (section) section.style.display = 'none';
        console.warn('Home blog section error:', err.message);
    }
});

function stripHtml(html) {
    const d = document.createElement('div');
    d.innerHTML = html || '';
    return d.textContent || d.innerText || '';
}

function esc(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
