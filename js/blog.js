/**
 * ═══════════════════════════════════════════════
 *  BLOG.JS — Public Blog Page Logic
 *  JMS Website
 * ═══════════════════════════════════════════════
 *
 *  Handles:
 *  - Fetching published posts from Supabase
 *  - Rendering featured post + blog card grid
 *  - Newsletter subscription
 *  - "Load More" pagination
 */

'use strict';

const POSTS_PER_LOAD = 6;
let   blogOffset     = 0;
let   allLoaded      = false;

/* ═══════════════════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
    await loadFeaturedPost();
    await loadBlogPosts(true);
    bindNewsletter();
    bindLoadMore();
});

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURED POST
═══════════════════════════════════════════════════════════════════════════ */
async function loadFeaturedPost() {
    const { data: post, error } = await supabaseClient
        .from('blog_posts')
        .select(`
            id, title, body, tag, image_url, created_at,
            admin_profiles ( full_name, role_tag )
        `)
        .eq('status', 'published')
        .eq('featured', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

    const container = document.getElementById('featured-post-container');
    if (!container) return;

    if (error || !post) {
        container.style.display = 'none';
        return;
    }

    const date   = formatDate(post.created_at);
    const author = post.admin_profiles?.full_name || 'Admin';
    const role   = post.admin_profiles?.role_tag  || '';
    const excerpt = stripHtml(post.body).slice(0, 200) + (post.body.length > 200 ? '…' : '');

    container.innerHTML = `
        <div class="featured-post ap-mv2">
            <div class="row g-0 align-items-center">
                <div class="col-lg-6">
                    <div class="featured-img d-flex justify-content-center align-items-center p-4">
                        ${post.image_url
                            ? `<img class="img-fluid rounded-5" src="${escHtml(post.image_url)}" alt="${escHtml(post.title)}">`
                            : `<div class="featured-img-placeholder"><i class="fas fa-image"></i></div>`
                        }
                    </div>
                </div>
                <div class="col-lg-6">
                    <div class="featured-content">
                        <span class="featured-badge">
                            <i class="fas fa-star"></i> Featured Story
                        </span>
                        <h2 class="featured-title">${escHtml(post.title)}</h2>
                        <p class="featured-text">${escHtml(excerpt)}</p>
                        <div class="featured-meta">
                            <span><i class="fas fa-user"></i> ${escHtml(author)}${role ? ` · <em>${escHtml(role)}</em>` : ''}</span>
                            <span><i class="fas fa-calendar"></i> ${date}</span>
                            ${post.tag ? `<span class="blog-tag">${escHtml(post.tag)}</span>` : ''}
                        </div>
                        <div class="d-flex justify-content-start align-items-center mt-3">
                            <a href="blog-post.html?id=${post.id}" class="btn-primary-jms gap-2">
                                Read Full Story <i class="fas fa-arrow-right"></i>
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   BLOG CARD GRID
═══════════════════════════════════════════════════════════════════════════ */
async function loadBlogPosts(reset = false) {
    if (reset) {
        blogOffset = 0;
        allLoaded  = false;
        const grid = document.getElementById('blog-grid');
        if (grid) grid.innerHTML = renderSkeletons(6);
    }

    const { data: posts, error } = await supabaseClient
        .from('blog_posts')
        .select(`
            id, title, body, tag, image_url, created_at,
            admin_profiles ( full_name, role_tag )
        `)
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .range(blogOffset, blogOffset + POSTS_PER_LOAD - 1);

    const grid = document.getElementById('blog-grid');
    if (!grid) return;

    if (error) {
        grid.innerHTML = `<div class="blog-error"><i class="fas fa-exclamation-circle"></i> Could not load posts. Please refresh the page.</div>`;
        return;
    }

    if (!posts || posts.length === 0) {
        if (reset) {
            grid.innerHTML = `<div class="blog-empty"><i class="fas fa-feather-alt"></i><p>No blog posts yet. Check back soon!</p></div>`;
        }
        allLoaded = true;
        updateLoadMoreBtn();
        return;
    }

    const cards = posts.map((post, i) => buildCard(post, i)).join('');

    if (reset) {
        grid.innerHTML = cards;
    } else {
        grid.insertAdjacentHTML('beforeend', cards);
    }

    blogOffset += posts.length;
    if (posts.length < POSTS_PER_LOAD) allLoaded = true;
    updateLoadMoreBtn();
}

function buildCard(post, index) {
    const date    = formatDate(post.created_at);
    const author  = post.admin_profiles?.full_name || 'Admin';
    const role    = post.admin_profiles?.role_tag  || '';
    const excerpt = stripHtml(post.body).slice(0, 140) + '…';

    return `
    <div class="col-md-6 col-xl-4" style="animation: fadeIn 0.6s ease forwards;">
        <article class="blog-card">
            <div class="blog-img-wrap">
                ${post.tag ? `<span class="blog-tag">${escHtml(post.tag)}</span>` : ''}
                ${post.image_url
                    ? `<img src="${escHtml(post.image_url)}" alt="${escHtml(post.title)}" loading="lazy">`
                    : `<div class="blog-img-placeholder"><i class="fas fa-newspaper"></i></div>`
                }
            </div>
            <div class="blog-content">
                <div class="blog-meta">
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                    <span><i class="fas fa-user"></i> ${escHtml(author)}${role ? ` · <em style="color:var(--accent-orange);font-style:normal;">${escHtml(role)}</em>` : ''}</span>
                </div>
                <h3 class="blog-card-title">
                    <a href="blog-post.html?id=${post.id}">${escHtml(post.title)}</a>
                </h3>
                <p class="blog-desc">${escHtml(excerpt)}</p>
                <a href="blog-post.html?id=${post.id}" class="blog-read">
                    Read More <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        </article>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOAD MORE
═══════════════════════════════════════════════════════════════════════════ */
function bindLoadMore() {
    const btn = document.getElementById('load-more-btn');
    if (!btn) return;
    btn.addEventListener('click', () => loadBlogPosts(false));
}

function updateLoadMoreBtn() {
    const btn = document.getElementById('load-more-btn');
    if (!btn) return;
    btn.style.display = allLoaded ? 'none' : 'inline-flex';
}

/* ═══════════════════════════════════════════════════════════════════════════
   NEWSLETTER SUBSCRIPTION
═══════════════════════════════════════════════════════════════════════════ */
function bindNewsletter() {
    const form = document.getElementById('newsletter-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const emailInput = form.querySelector('input[type="email"]');
        const submitBtn  = form.querySelector('button[type="submit"]');
        const email = emailInput?.value.trim();

        if (!email) return;

        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Subscribing…';
        submitBtn.disabled = true;

        const { error } = await supabaseClient
            .from('subscribers')
            .insert([{ email }]);

        if (error) {
            if (error.code === '23505') {
                // Unique constraint — already subscribed
                showNewsletterMsg(form, 'You\'re already subscribed! Thank you.', 'info');
            } else {
                showNewsletterMsg(form, 'Something went wrong. Please try again.', 'error');
                submitBtn.innerHTML = originalText;
                submitBtn.disabled = false;
            }
        } else {
            showNewsletterMsg(form, '🎉 You\'re subscribed! Welcome to the JMS community.', 'success');
            emailInput.value = '';
        }
    });
}

function showNewsletterMsg(form, msg, type) {
    let msgEl = document.getElementById('newsletter-msg');
    if (!msgEl) {
        msgEl = document.createElement('p');
        msgEl.id = 'newsletter-msg';
        msgEl.style.cssText = 'margin-top:12px; font-size:13px; font-weight:500;';
        form.parentNode.appendChild(msgEl);
    }
    const colors = { success: '#22c55e', error: '#ef4444', info: '#06b6d4' };
    msgEl.style.color = colors[type] || '#22c55e';
    msgEl.textContent = msg;
}

/* ═══════════════════════════════════════════════════════════════════════════
   SKELETON LOADERS
═══════════════════════════════════════════════════════════════════════════ */
function renderSkeletons(n) {
    return Array.from({ length: n }, () => `
        <div class="col-md-6 col-xl-4">
            <div class="blog-card skeleton-card">
                <div class="skeleton skeleton-img"></div>
                <div class="blog-content">
                    <div class="skeleton skeleton-line short"></div>
                    <div class="skeleton skeleton-line"></div>
                    <div class="skeleton skeleton-line medium"></div>
                    <div class="skeleton skeleton-line short"></div>
                </div>
            </div>
        </div>`).join('');
}

/* ═══════════════════════════════════════════════════════════════════════════
   UTILITIES
═══════════════════════════════════════════════════════════════════════════ */
function stripHtml(html) {
    const div = document.createElement('div');
    div.innerHTML = html || '';
    return div.textContent || div.innerText || '';
}

function escHtml(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g,'&amp;')
        .replace(/</g,'&lt;')
        .replace(/>/g,'&gt;')
        .replace(/"/g,'&quot;');
}

function formatDate(iso) {
    return new Date(iso).toLocaleDateString('en-GB', {
        day: 'numeric', month: 'long', year: 'numeric'
    });
}
