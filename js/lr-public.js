/**
 * ═══════════════════════════════════════════════
 *  LR-PUBLIC.JS — Literary Review Public Pages
 *  JMS Website
 * ═══════════════════════════════════════════════
 *
 *  Dynamically loads published literary works from
 *  Supabase and renders them on all public LR pages.
 *
 *  Used by:
 *  - literary-review.html   (All Works hub — featured spotlight + grid)
 *  - lr-poetry.html         (Poetry grid)
 *  - lr-fiction.html        (Fiction grid)
 *  - lr-nonfiction.html     (Non-Fiction grid)
 *
 *  Each page sets: window.LR_GENRE_FILTER before this script loads.
 *    null  → all genres (hub page)
 *    'poetry' | 'fiction' | 'nonfiction' → genre-specific page
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   GENRE CONFIGURATION
═══════════════════════════════════════════════════════════════════════════ */
const LR_GENRE_CONFIG = {
    poetry: {
        label:    'Poetry',
        icon:     'fas fa-feather-alt',
        readBtn:  'Read Poem',
        tagClass: 'poetry',
        gradients: [
            'linear-gradient(135deg, #f97316, #fdba74)',
            'linear-gradient(135deg, #7c3aed, #c084fc)',
            'linear-gradient(135deg, #dc2626, #f97316)',
            'linear-gradient(135deg, #0a2540, #3b82f6)',
        ],
    },
    fiction: {
        label:    'Fiction',
        icon:     'fas fa-book',
        readBtn:  'Read Story',
        tagClass: 'fiction',
        gradients: [
            'linear-gradient(135deg, #1e3a8a, #3b82f6)',
            'linear-gradient(135deg, #0284c7, #38bdf8)',
            'linear-gradient(135deg, #0a2540, #1d4ed8)',
            'linear-gradient(135deg, #1e40af, #60a5fa)',
        ],
    },
    nonfiction: {
        label:    'Non-Fiction',
        icon:     'fas fa-file-alt',
        readBtn:  'Read Essay',
        tagClass: 'nonfiction',
        gradients: [
            'linear-gradient(135deg, #10b981, #6ee7b7)',
            'linear-gradient(135deg, #059669, #34d399)',
            'linear-gradient(135deg, #065f46, #10b981)',
            'linear-gradient(135deg, #047857, #6ee7b7)',
        ],
    },
};

function parseLRWorkMeta(work) {
    if (!work) return { coverImage: null, authorImage: null, authorDisplay: 'abbreviation', isAnonymous: false, displayName: 'Anonymous', cleanInfo: '' };

    let coverImage = work.image_url || work.cover_image || null;
    let authorImage = work.author_image || null;
    let authorDisplay = work.author_image_display || 'abbreviation';
    let authorInfo = work.author_info || '';
    let authorName = work.author_name || '';

    if (authorInfo) {
        const coverMatch = authorInfo.match(/\[COVER:([^\]]+)\]/);
        if (coverMatch) {
            if (!coverImage) coverImage = coverMatch[1];
            authorInfo = authorInfo.replace(/\[COVER:[^\]]+\]\s*/g, '');
        }

        const authorImgMatch = authorInfo.match(/\[AUTHOR_IMG:([^\]]+)\]/);
        if (authorImgMatch) {
            if (!authorImage) authorImage = authorImgMatch[1];
            authorInfo = authorInfo.replace(/\[AUTHOR_IMG:[^\]]+\]\s*/g, '');
        }

        const displayMatch = authorInfo.match(/\[AUTHOR_DISPLAY:([^\]]+)\]/);
        if (displayMatch) {
            authorDisplay = displayMatch[1];
            authorInfo = authorInfo.replace(/\[AUTHOR_DISPLAY:[^\]]+\]\s*/g, '');
        }

        const anonMatch = authorInfo.match(/\[ANON:([^\]]+)\]/);
        if (anonMatch) {
            authorInfo = authorInfo.replace(/\[ANON:[^\]]+\]\s*/g, '');
        }
    }

    const isAnonymous = (work.author_name || '').toLowerCase() === 'anonymous' || (work.author_info && work.author_info.includes('[ANON:'));
    const displayName = isAnonymous ? 'Anonymous' : (authorName || 'Anonymous');

    return {
        coverImage,
        authorImage,
        authorDisplay,
        isAnonymous,
        displayName,
        cleanInfo: authorInfo.trim()
    };
}

function getLRInitials(name) {
    if (!name) return 'A';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ═══════════════════════════════════════════════════════════════════════════
   GLOBAL STATE & CONSTANTS
   ═══════════════════════════════════════════════════════════════════════════ */
const WORKS_PER_LOAD = 6;
let lrOffset         = 0;
let lrAllLoaded      = false;
let lrActiveGenre    = null;

/* ═══════════════════════════════════════════════════════════════════════════
   ENTRY POINT
   ═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {
    lrActiveGenre = window.LR_GENRE_FILTER || null;

    const featuredContainer = document.getElementById('lr-featured-spotlight');
    const worksGrid         = document.getElementById('lr-works-grid');

    if (featuredContainer) await loadFeaturedWork(featuredContainer);
    if (worksGrid) {
        await loadWorksGrid(true);
        bindLoadMore();
    }
});

/* ═══════════════════════════════════════════════════════════════════════════
   FEATURED SPOTLIGHT  (hub page only)
═══════════════════════════════════════════════════════════════════════════ */
async function loadFeaturedWork(container) {
    try {
        const { data: works, error } = await supabaseClient
            .from('lr_works')
            .select('*')
            .eq('status', 'published')
            .eq('featured', true)
            .order('published_at', { ascending: false });

        if (error) throw error;

        if (!works || works.length === 0) {
            container.innerHTML = renderFeaturedEmpty();
        } else if (works.length === 1) {
            container.innerHTML = renderFeaturedCard(works[0]);
        } else {
            container.innerHTML = renderMultipleFeaturedCards(works);
        }

    } catch (err) {
        console.error('[LR] Featured work error:', err);
        container.innerHTML = renderFeaturedEmpty();
    }
}

function renderMultipleFeaturedCards(works) {
    // If 2 works, use 2-col (col-lg-6 col-12). If 3 works, use 3-col (col-lg-4 col-md-6 col-12).
    // If 4 works, use 2x2 (col-lg-6 col-md-6 col-12). If more, responsive columns.
    const colClass = works.length === 2
        ? 'col-lg-6 col-12'
        : (works.length % 3 === 0 ? 'col-lg-4 col-md-6 col-12' : 'col-lg-6 col-md-6 col-12');

    const cardsHtml = works.map((work) => {
        const meta       = parseLRWorkMeta(work);
        const cfg        = LR_GENRE_CONFIG[work.genre] || LR_GENRE_CONFIG.poetry;
        const excerpt    = work.excerpt || autoExcerpt(work.body, 170);
        const date       = fmtDate(work.published_at);
        const authorName = meta.displayName;
        const initials   = meta.isAnonymous ? 'A' : getLRInitials(authorName);

        const coverHtml = meta.coverImage
            ? `<div class="lr-spotlight-cover-wrap position-relative">
                   <img src="${escLR(meta.coverImage)}" alt="${escLR(work.title)}" class="lr-spotlight-cover-img">
                   <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(10,37,64,0.12) 0%, rgba(10,37,64,0.72) 100%);"></div>
                   <div class="position-absolute top-0 start-0 p-3 d-flex gap-2">
                       <span class="badge bg-warning text-dark"><i class="fas fa-star"></i> Spotlight</span>
                       <span class="badge" style="background:rgba(255,255,255,0.2); backdrop-filter:blur(4px); color:white;"><i class="${cfg.icon} me-1"></i> ${cfg.label}</span>
                   </div>
               </div>`
            : `<div class="lr-spotlight-cover-wrap position-relative" style="background: ${cfg.gradients[0]}; color: white; display: flex; align-items: center; justify-content: center;">
                   <div class="position-absolute top-0 start-0 p-3 d-flex gap-2">
                       <span class="badge bg-warning text-dark"><i class="fas fa-star"></i> Spotlight</span>
                       <span class="badge" style="background:rgba(255,255,255,0.2); backdrop-filter:blur(4px); color:white;"><i class="${cfg.icon} me-1"></i> ${cfg.label}</span>
                   </div>
                   <div class="text-center p-3">
                       <i class="${cfg.icon} fa-3x" style="color: rgba(255,255,255,0.85);"></i>
                   </div>
               </div>`;

        const avatarHtml = (!meta.isAnonymous && meta.authorDisplay === 'photo' && meta.authorImage)
            ? `<img src="${escLR(meta.authorImage)}" alt="${escLR(authorName)}" style="width:22px; height:22px; border-radius:50%; object-fit:cover; margin-right:6px; vertical-align:middle;">`
            : `<span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background:var(--navy,#0a2540); color:#fff; font-size:10px; font-weight:700; margin-right:6px; vertical-align:middle;">${escLR(initials)}</span>`;

        return `
        <div class="${colClass}">
            <div class="lr-spotlight-card">
                ${coverHtml}
                <div class="p-4 d-flex flex-column flex-grow-1" style="color:white;">
                    <div class="d-flex align-items-center justify-content-between mb-3" style="font-size: 0.85rem; color: rgba(255,255,255,0.65);">
                        <span class="d-inline-flex align-items-center text-white">${avatarHtml} ${escLR(authorName)}</span>
                        <span><i class="fas fa-calendar-alt me-1"></i> ${date}</span>
                    </div>
                    <h3 class="font-serif mb-3 lr-spotlight-title" style="font-size: 1.45rem; line-height: 1.35;">
                        <a href="lr-work.html?id=${work.id}" class="text-white text-decoration-none">${escLR(work.title)}</a>
                    </h3>
                    <p class="font-serif fst-italic mb-4" style="color: rgba(255,255,255,0.78); font-size: 0.95rem; line-height: 1.65; flex-grow: 1;">
                        &ldquo;${escLR(excerpt)}&hellip;&rdquo;
                    </p>
                    <div>
                        <a href="lr-work.html?id=${work.id}" class="featured-btn text-decoration-none" style="padding: 10px 22px; font-size: 0.88rem; display: inline-flex; align-items: center; gap: 8px;">
                            ${cfg.readBtn} <i class="fas fa-arrow-right"></i>
                        </a>
                    </div>
                </div>
            </div>
        </div>`;
    }).join('');

    return `
    <div class="row g-4 mb-5">
        ${cardsHtml}
    </div>`;
}

function renderFeaturedCard(work) {
    const meta       = parseLRWorkMeta(work);
    const cfg        = LR_GENRE_CONFIG[work.genre] || LR_GENRE_CONFIG.poetry;
    const excerpt    = work.excerpt || autoExcerpt(work.body, 220);
    const date       = fmtDate(work.published_at);
    const authorName = meta.displayName;
    const initials   = meta.isAnonymous ? 'A' : getLRInitials(authorName);

    const leftColHtml = meta.coverImage
        ? `<div style="background: url('${escLR(meta.coverImage)}') center/cover no-repeat; min-height: 360px;" class="h-100 position-relative">
               <div style="position:absolute; inset:0; background:linear-gradient(180deg, rgba(10,37,64,0.1) 0%, rgba(10,37,64,0.65) 100%);"></div>
               <div class="position-absolute bottom-0 start-0 p-4 text-white">
                   <span class="badge bg-warning text-dark"><i class="fas fa-star"></i> Editor's Choice</span>
               </div>
           </div>`
        : `<div style="background: ${cfg.gradients[0]}; color: white; display: flex;
                 align-items: center; justify-content: center; min-height: 360px;" class="h-100">
               <div class="text-center p-4">
                   <i class="${cfg.icon} fa-4x mb-3" style="color: rgba(255,255,255,0.85);"></i>
                   <h4 class="font-serif text-white mt-2">${cfg.label} Selection</h4>
                   <span class="badge bg-warning text-dark mt-2">Editor's Choice</span>
               </div>
           </div>`;

    const avatarHtml = (!meta.isAnonymous && meta.authorDisplay === 'photo' && meta.authorImage)
        ? `<img src="${escLR(meta.authorImage)}" alt="${escLR(authorName)}" style="width:22px; height:22px; border-radius:50%; object-fit:cover; margin-right:6px; vertical-align:middle;">`
        : `<span style="display:inline-flex; align-items:center; justify-content:center; width:22px; height:22px; border-radius:50%; background:var(--navy,#0a2540); color:#fff; font-size:10px; font-weight:700; margin-right:6px; vertical-align:middle;">${escLR(initials)}</span>`;

    return `
    <div class="featured-post p-0">
        <div class="row g-0">
            <div class="col-lg-5">
                ${leftColHtml}
            </div>
            <div class="col-lg-7">
                <div class="featured-content px-4 py-5 px-md-5">
                    <div class="featured-badge">
                        <i class="fas fa-star"></i> Featured ${cfg.label}
                    </div>
                    <h3 class="featured-title font-serif">${escLR(work.title)}</h3>
                    <div class="lr-card-meta mb-3">
                        <span class="d-inline-flex align-items-center">${avatarHtml} ${escLR(authorName)}</span>
                        <span><i class="fas fa-calendar-alt"></i> ${date}</span>
                    </div>
                    <p class="featured-text font-serif fst-italic">&ldquo;${escLR(excerpt)}&hellip;&rdquo;</p>
                    <a href="lr-work.html?id=${work.id}" class="featured-btn text-decoration-none">
                        ${cfg.readBtn} <i class="fas fa-arrow-right ms-2"></i>
                    </a>
                </div>
            </div>
        </div>
    </div>`;
}

function renderFeaturedEmpty() {
    return `
    <div class="featured-post p-0">
        <div class="row g-0">
            <div class="col-lg-5">
                <div style="background: linear-gradient(135deg, #0a2540, #1e293b); display:flex;
                     align-items:center; justify-content:center; min-height:360px;" class="h-100">
                    <div class="text-center p-4">
                        <i class="fas fa-feather-alt fa-4x mb-3" style="color:rgba(255,255,255,0.25);"></i>
                        <h4 class="font-serif" style="color:rgba(255,255,255,0.45);">Coming Soon</h4>
                    </div>
                </div>
            </div>
            <div class="col-lg-7">
                <div class="featured-content px-4 py-5 px-md-5">
                    <div class="featured-badge"><i class="fas fa-star"></i> Featured Work</div>
                    <h3 class="featured-title font-serif">No Featured Work Yet</h3>
                    <p class="featured-text">Our editorial board is currently reviewing submissions.
                       Check back soon for our first featured piece.</p>
                    <a href="lr-submissions.html" class="featured-btn text-decoration-none">
                        Submit Your Work <i class="fas fa-arrow-right ms-2"></i>
                    </a>
                </div>
            </div>
        </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   WORKS GRID
═══════════════════════════════════════════════════════════════════════════ */
async function loadWorksGrid(reset = false) {
    const container = document.getElementById('lr-works-grid');
    if (!container) return;

    if (reset) {
        lrOffset = 0;
        lrAllLoaded = false;
        container.innerHTML = renderSkeletons(lrActiveGenre ? 4 : 6);
    }

    try {
        let query = supabaseClient
            .from('lr_works')
            .select('*')
            .eq('status', 'published')
            .order('published_at', { ascending: false })
            .range(lrOffset, lrOffset + WORKS_PER_LOAD - 1);

        if (lrActiveGenre) query = query.eq('genre', lrActiveGenre);

        const { data: works, error } = await query;
        if (error) throw error;

        if (!works || works.length === 0) {
            if (reset) {
                container.innerHTML = renderEmptyState(lrActiveGenre);
            }
            lrAllLoaded = true;
            updateLoadMoreBtn();
            return;
        }

        // Hub = 3-col, genre pages = 2-col
        const colClass = lrActiveGenre ? 'col-md-6' : 'col-lg-4 col-md-6';
        const cards = works.map((w, i) => renderWorkCard(w, lrOffset + i, colClass)).join('');

        if (reset) {
            container.innerHTML = cards;
        } else {
            container.insertAdjacentHTML('beforeend', cards);
        }

        lrOffset += works.length;
        if (works.length < WORKS_PER_LOAD) lrAllLoaded = true;
        updateLoadMoreBtn();

    } catch (err) {
        console.error('[LR] Works grid error:', err);
        if (reset) {
            container.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-exclamation-circle fa-2x text-muted mb-3 d-block"></i>
                <p class="text-muted">Unable to load works. Please refresh the page.</p>
            </div>`;
        }
    }
}

function bindLoadMore() {
    const btn = document.getElementById('lr-load-more-btn');
    if (!btn) return;
    btn.addEventListener('click', () => loadWorksGrid(false));
}

function updateLoadMoreBtn() {
    const btn = document.getElementById('lr-load-more-btn');
    if (!btn) return;
    btn.style.display = lrAllLoaded ? 'none' : 'inline-flex';
}

function renderWorkCard(work, index, colClass) {
    const meta       = parseLRWorkMeta(work);
    const cfg        = LR_GENRE_CONFIG[work.genre] || LR_GENRE_CONFIG.poetry;
    const gradient   = cfg.gradients[index % cfg.gradients.length];
    const excerpt    = work.excerpt || autoExcerpt(work.body, 160);
    const date       = fmtDate(work.published_at);
    const authorName = meta.displayName;
    const initials   = meta.isAnonymous ? 'A' : getLRInitials(authorName);

    const imageHtml = meta.coverImage
        ? `<img src="${escLR(meta.coverImage)}" alt="${escLR(work.title)}" class="lr-card-img" style="width:100%; height:100%; object-fit:cover; display:block;">`
        : `<div class="lr-card-img-placeholder"
                style="background: ${gradient}; color: white; width: 100%; height: 100%;
                       display: flex; align-items: center; justify-content: center;">
               <i class="${cfg.icon} fa-3x"></i>
           </div>`;

    const avatarHtml = (!meta.isAnonymous && meta.authorDisplay === 'photo' && meta.authorImage)
        ? `<img src="${escLR(meta.authorImage)}" alt="${escLR(authorName)}" style="width:20px; height:20px; border-radius:50%; object-fit:cover; margin-right:5px; vertical-align:middle;">`
        : `<span style="display:inline-flex; align-items:center; justify-content:center; width:20px; height:20px; border-radius:50%; background:var(--navy,#0a2540); color:#fff; font-size:10px; font-weight:700; margin-right:5px; vertical-align:middle;">${escLR(initials)}</span>`;

    return `
    <div class="${colClass}">
        <div class="lr-card">
            <div class="lr-card-img-wrap" style="position:relative; overflow:hidden; height:210px;">
                ${imageHtml}
                <span class="lr-card-tag ${cfg.tagClass}">${cfg.label}</span>
            </div>
            <div class="lr-card-body">
                <div class="lr-card-meta">
                    <span class="d-inline-flex align-items-center">${avatarHtml} ${escLR(authorName)}</span>
                    <span><i class="fas fa-calendar-alt"></i> ${date}</span>
                </div>
                <h3 class="lr-card-title">
                    <a href="lr-work.html?id=${work.id}">${escLR(work.title)}</a>
                </h3>
                <p class="lr-card-excerpt">${escLR(excerpt)}</p>
                <a href="lr-work.html?id=${work.id}" class="lr-card-link">
                    ${cfg.readBtn} <i class="fas fa-arrow-right"></i>
                </a>
            </div>
        </div>
    </div>`;
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */
function autoExcerpt(text, maxLen) {
    if (!text) return '';
    const stripped = text.replace(/<[^>]*>/g, ' ');
    const plain = stripped.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    if (plain.length <= maxLen) return plain;
    const cut = plain.lastIndexOf(' ', maxLen);
    return plain.substring(0, cut > 40 ? cut : maxLen) + '…';
}

function fmtDate(isoStr) {
    if (!isoStr) return '';
    return new Date(isoStr).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' });
}

function escLR(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function renderSkeletons(count) {
    return Array.from({ length: count }, () => `
    <div class="col-md-6">
        <div class="lr-card" style="pointer-events:none;">
            <div class="lr-card-img-wrap" style="background:#e2e8f0;"></div>
            <div class="lr-card-body">
                <div style="height:11px;background:#e2e8f0;border-radius:6px;width:55%;margin-bottom:10px;"></div>
                <div style="height:20px;background:#e2e8f0;border-radius:6px;width:80%;margin-bottom:14px;"></div>
                <div style="height:11px;background:#e2e8f0;border-radius:6px;width:100%;margin-bottom:7px;"></div>
                <div style="height:11px;background:#e2e8f0;border-radius:6px;width:70%;"></div>
            </div>
        </div>
    </div>`).join('');
}

function renderEmptyState(genre) {
    const label = genre ? (LR_GENRE_CONFIG[genre]?.label || genre) : 'Works';
    return `
    <div class="col-12 text-center py-5">
        <i class="fas fa-feather-alt fa-3x d-block mb-4" style="color:#cbd5e1;"></i>
        <h4 class="font-serif mb-2" style="color:#64748b;">No ${label} Published Yet</h4>
        <p class="text-muted mb-4">Be the first! The editorial board welcomes submissions from all writers.</p>
        <a href="lr-submissions.html" class="btn-primary-jms d-inline-flex align-items-center gap-2 text-decoration-none px-4 py-3">
            <i class="fas fa-paper-plane"></i> Submit Your Work
        </a>
    </div>`;
}
