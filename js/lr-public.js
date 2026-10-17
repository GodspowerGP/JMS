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
            .select('id, title, author_name, author_info, genre, excerpt, body, published_at')
            .eq('status', 'published')
            .eq('featured', true)
            .limit(1);

        if (error) throw error;

        container.innerHTML = (works && works.length > 0)
            ? renderFeaturedCard(works[0])
            : renderFeaturedEmpty();

    } catch (err) {
        console.error('[LR] Featured work error:', err);
        container.innerHTML = renderFeaturedEmpty();
    }
}

function renderFeaturedCard(work) {
    const cfg        = LR_GENRE_CONFIG[work.genre] || LR_GENRE_CONFIG.poetry;
    const excerpt    = work.excerpt || autoExcerpt(work.body, 220);
    const date       = fmtDate(work.published_at);
    const authorName = work.author_name || 'Anonymous';

    return `
    <div class="featured-post p-0">
        <div class="row g-0">
            <div class="col-lg-5">
                <div style="background: ${cfg.gradients[0]}; color: white; display: flex;
                     align-items: center; justify-content: center; min-height: 360px;" class="h-100">
                    <div class="text-center p-4">
                        <i class="${cfg.icon} fa-4x mb-3" style="color: rgba(255,255,255,0.85);"></i>
                        <h4 class="font-serif text-white mt-2">${cfg.label} Selection</h4>
                        <span class="badge bg-warning text-dark mt-2">Editor's Choice</span>
                    </div>
                </div>
            </div>
            <div class="col-lg-7">
                <div class="featured-content px-4 py-5 px-md-5">
                    <div class="featured-badge">
                        <i class="fas fa-star"></i> Featured ${cfg.label}
                    </div>
                    <h3 class="featured-title font-serif">${escLR(work.title)}</h3>
                    <div class="lr-card-meta mb-3">
                        <span><i class="fas fa-user"></i> ${escLR(authorName)}</span>
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
            .select('id, title, author_name, author_info, genre, excerpt, body, published_at')
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
    const cfg        = LR_GENRE_CONFIG[work.genre] || LR_GENRE_CONFIG.poetry;
    const gradient   = cfg.gradients[index % cfg.gradients.length];
    const excerpt    = work.excerpt || autoExcerpt(work.body, 160);
    const date       = fmtDate(work.published_at);
    const authorName = work.author_name || 'Anonymous';

    return `
    <div class="${colClass}">
        <div class="lr-card">
            <div class="lr-card-img-wrap">
                <div class="lr-card-img-placeholder"
                     style="background: ${gradient}; color: white; width: 100%; height: 100%;
                            display: flex; align-items: center; justify-content: center;">
                    <i class="${cfg.icon} fa-3x"></i>
                </div>
                <span class="lr-card-tag ${cfg.tagClass}">${cfg.label}</span>
            </div>
            <div class="lr-card-body">
                <div class="lr-card-meta">
                    <span><i class="fas fa-user"></i> ${escLR(authorName)}</span>
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
