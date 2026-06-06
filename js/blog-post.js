/**
 * ═══════════════════════════════════════════════
 *  BLOG-POST.JS — Individual Blog Post Page
 *  JMS Website
 * ═══════════════════════════════════════════════
 *
 *  Handles:
 *  - Reading ?id= from URL
 *  - Fetching single blog post from Supabase
 *  - Rendering rich HTML content (from Quill)
 *  - Showing author name + role tag
 *  - Loading related posts (same tag)
 */

'use strict';

document.addEventListener('DOMContentLoaded', async () => {
    const postId = new URLSearchParams(window.location.search).get('id');

    if (!postId) {
        showError('No blog post specified.');
        return;
    }

    await loadPost(postId);
});

/* ═══════════════════════════════════════════════════════════════════════════
   LOAD POST
═══════════════════════════════════════════════════════════════════════════ */
async function loadPost(postId) {
    const { data: post, error } = await supabaseClient
        .from('blog_posts')
        .select(`
            id, title, body, tag, image_url, created_at, status,
            admin_profiles ( full_name, role_tag )
        `)
        .eq('id', postId)
        .eq('status', 'published')
        .single();

    if (error || !post) {
        showError('This blog post could not be found or is no longer available.');
        return;
    }

    renderPost(post);
    await loadRelatedPosts(post.id, post.tag);
}

/* ═══════════════════════════════════════════════════════════════════════════
   RENDER POST
═══════════════════════════════════════════════════════════════════════════ */
function renderPost(post) {
    const date    = new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
    const author  = post.admin_profiles?.full_name || 'Admin';
    const role    = post.admin_profiles?.role_tag  || '';
    const excerpt = stripHtml(post.body).slice(0, 160);

    // ── Update <head> meta ──
    document.title = `${post.title} | Jewel Model Schools Blog`;
    setMeta('description', excerpt);
    setMeta('og:title',       post.title);
    setMeta('og:description', excerpt);
    if (post.image_url) setMeta('og:image', post.image_url);

    // ── Hero section ──
    const heroEl = document.getElementById('post-hero');
    if (heroEl) {
        heroEl.classList.add('no-image');
    }

    // ── Cover image inside article ──
    const coverEl = document.getElementById('post-cover-img');
    if (coverEl) {
        if (post.image_url) {
            coverEl.src = post.image_url;
            coverEl.alt = post.title;
        } else {
            coverEl.parentElement?.remove();
        }
    }

    // ── Tag ──
    const tagEl = document.getElementById('post-tag');
    if (tagEl) {
        if (post.tag) { tagEl.textContent = post.tag; }
        else          { tagEl.style.display = 'none'; }
    }

    // ── Title ──
    const titleEl = document.getElementById('post-title');
    if (titleEl) titleEl.textContent = post.title;

    // ── Meta (date + author + role) ──
    const metaEl = document.getElementById('post-meta');
    if (metaEl) {
        metaEl.innerHTML = `
            <span><i class="fas fa-calendar-alt"></i> ${date}</span>
            <span><i class="fas fa-user-circle"></i> ${escHtml(author)}${role ? ` &middot; <strong>${escHtml(role)}</strong>` : ''}</span>
            ${post.tag ? `<span><i class="fas fa-tag"></i> ${escHtml(post.tag)}</span>` : ''}`;
    }

    // ── Body (rich HTML from Quill — rendered as-is) ──
    const bodyEl = document.getElementById('post-body');
    if (bodyEl) {
        bodyEl.innerHTML = post.body || '';
        // Make all links in body open in new tab if external
        bodyEl.querySelectorAll('a[href^="http"]').forEach(a => {
            a.setAttribute('target', '_blank');
            a.setAttribute('rel', 'noopener noreferrer');
        });
    }


    // ── Remove loading skeleton ──
    document.getElementById('post-loading')?.remove();
    document.getElementById('post-content-wrap')?.classList.remove('d-none');

    // ── Back to blog link ──
    const backBtn = document.getElementById('back-to-blog');
    if (backBtn) backBtn.href = 'blog.html';
}

/* ═══════════════════════════════════════════════════════════════════════════
   RELATED POSTS
═══════════════════════════════════════════════════════════════════════════ */
async function loadRelatedPosts(currentId, tag) {
    if (!tag) return;

    const { data: posts } = await supabaseClient
        .from('blog_posts')
        .select('id, title, tag, image_url, created_at, admin_profiles(full_name)')
        .eq('status', 'published')
        .eq('tag', tag)
        .neq('id', currentId)
        .order('created_at', { ascending: false })
        .limit(3);

    const section = document.getElementById('related-posts-section');
    const grid    = document.getElementById('related-posts-grid');
    if (!section || !grid || !posts?.length) return;

    grid.innerHTML = posts.map(post => {
        const date   = new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const author = post.admin_profiles?.full_name || 'Admin';
        return `
        <div class="col-md-4">
            <a href="blog-post.html?id=${post.id}" class="related-card">
                <div class="related-img">
                    ${post.image_url
                        ? `<img src="${escHtml(post.image_url)}" alt="${escHtml(post.title)}" loading="lazy">`
                        : `<div class="related-placeholder"><i class="fas fa-newspaper"></i></div>`
                    }
                    ${post.tag ? `<span class="blog-tag">${escHtml(post.tag)}</span>` : ''}
                </div>
                <div class="related-info">
                    <h4>${escHtml(post.title)}</h4>
                    <span>${escHtml(author)} &middot; ${date}</span>
                </div>
            </a>
        </div>`;
    }).join('');

    section.classList.remove('d-none');
}

/* ═══════════════════════════════════════════════════════════════════════════
   ERROR STATE
═══════════════════════════════════════════════════════════════════════════ */
function showError(msg) {
    document.getElementById('post-loading')?.remove();
    const errEl = document.getElementById('post-error');
    if (errEl) {
        document.getElementById('post-error-msg').textContent = msg;
        errEl.classList.remove('d-none');
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */
function stripHtml(html) {
    const d = document.createElement('div');
    d.innerHTML = html || '';
    return d.textContent || d.innerText || '';
}

function escHtml(str) {
    if (!str) return '';
    return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function setMeta(name, content) {
    let el = document.querySelector(`meta[name="${name}"], meta[property="${name}"]`);
    if (!el) {
        el = document.createElement('meta');
        el.setAttribute(name.includes(':') ? 'property' : 'name', name);
        document.head.appendChild(el);
    }
    el.setAttribute('content', content);
}
