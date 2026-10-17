/**
 * ═══════════════════════════════════════════════
 *  LR-ADMIN.JS — Literary Review Admin Tab Logic
 *  JMS Website
 * ═══════════════════════════════════════════════
 *
 *  Handles the "Literary Review" tab inside admin_dashboard.html.
 *
 *  Features:
 *  - Stats (total, published, drafts, featured)
 *  - Add / Edit / Delete literary works
 *  - Publish / Unpublish toggle
 *  - Featured flag (only one at a time)
 *  - Search / filter list
 *  - Excerpts auto-generated from body text
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   STATE
═══════════════════════════════════════════════════════════════════════════ */
let lrEditingId   = null;   // null = creating new, UUID = editing
let allLRWorks    = [];
let lrQuillEditor = null;   // Quill instance for Literary Magazine

const GENRE_LABELS = { poetry: 'Poetry', fiction: 'Fiction', nonfiction: 'Non-Fiction' };
const GENRE_ICONS  = { poetry: 'fas fa-feather-alt', fiction: 'fas fa-book', nonfiction: 'fas fa-file-alt' };
const LR_STORAGE_BUCKET = 'blog-images';

function parseLRWorkMeta(work) {
    if (!work) return { coverImage: null, authorImage: null, authorDisplay: 'abbreviation', isAnonymous: false, displayName: 'Anonymous', realName: '', cleanInfo: '' };

    let coverImage = work.image_url || work.cover_image || null;
    let authorImage = work.author_image || null;
    let authorDisplay = work.author_image_display || 'abbreviation';
    let authorInfo = work.author_info || '';
    let authorName = work.author_name || '';
    let realName = authorName;

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
            realName = anonMatch[1] === 'Anonymous' ? '' : anonMatch[1];
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
        realName,
        cleanInfo: authorInfo.trim()
    };
}

async function uploadLRImage(file, folder = 'lr-pieces') {
    const ext      = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `${folder}/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
        .from(LR_STORAGE_BUCKET)
        .upload(filePath, file, { upsert: false, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data } = supabaseClient.storage
        .from(LR_STORAGE_BUCKET)
        .getPublicUrl(filePath);

    return data.publicUrl;
}

/* ═══════════════════════════════════════════════════════════════════════════
   INIT — called from admin_dashboard.html after DOM ready
═══════════════════════════════════════════════════════════════════════════ */
async function initLRAdmin() {
    initLRQuill();
    await loadLRStats();
    await loadLRWorks();
    bindLREvents();
}

function initLRQuill() {
    const el = document.getElementById('lr-quill-editor');
    if (!el) return;

    if (!lrQuillEditor) {
        lrQuillEditor = new Quill('#lr-quill-editor', {
            theme: 'snow',
            placeholder: 'Write or paste the literary work here...',
            modules: {
                toolbar: [
                    [{ 'header': [1, 2, 3, false] }],
                    ['bold', 'italic', 'underline', 'strike'],
                    [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                    ['blockquote', 'code-block'],
                    ['link', 'image'],
                    [{ 'align': [] }],
                    ['clean']
                ]
            }
        });
    }

    if (lrQuillEditor) {
        lrQuillEditor.enable(true);
        if (lrQuillEditor.root) {
            lrQuillEditor.root.setAttribute('contenteditable', 'true');
        }
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   STATS
═══════════════════════════════════════════════════════════════════════════ */
async function loadLRStats() {
    try {
        const { count: total }     = await supabaseClient.from('lr_works').select('*', { count: 'exact', head: true });
        const { count: published } = await supabaseClient.from('lr_works').select('*', { count: 'exact', head: true }).eq('status', 'published');
        const { count: drafts }    = await supabaseClient.from('lr_works').select('*', { count: 'exact', head: true }).eq('status', 'draft');
        const { count: featured }  = await supabaseClient.from('lr_works').select('*', { count: 'exact', head: true }).eq('featured', true);

        animateLRCount('lr-stat-total',     total     || 0);
        animateLRCount('lr-stat-published', published || 0);
        animateLRCount('lr-stat-drafts',    drafts    || 0);
        animateLRCount('lr-stat-featured',  featured  || 0);
    } catch (err) {
        console.error('[LR Admin] Stats error:', err);
    }
}

function animateLRCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 25));
    const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current;
        if (current >= target) clearInterval(timer);
    }, 40);
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOAD WORKS LIST
═══════════════════════════════════════════════════════════════════════════ */
async function loadLRWorks() {
    const list = document.getElementById('lr-works-list');
    if (!list) return;

    list.innerHTML = `<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Loading works…</p></div>`;

    try {
        const { data: works, error } = await supabaseClient
            .from('lr_works')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(100);

        if (error) throw error;
        allLRWorks = works || [];
        renderLRList(allLRWorks);
    } catch (err) {
        console.error('[LR Admin] Load error:', err);
        list.innerHTML = `<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Failed to load works.</p></div>`;
    }
}

function renderLRList(works) {
    const list = document.getElementById('lr-works-list');
    if (!list) return;

    if (!works.length) {
        list.innerHTML = `<div class="empty-state"><i class="fas fa-feather-alt"></i><p>No works yet. Add the first literary work above!</p></div>`;
        return;
    }

    const rows = works.map(w => {
        const meta        = parseLRWorkMeta(w);
        const date        = new Date(w.published_at || w.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const genreLabel  = GENRE_LABELS[w.genre] || w.genre;
        const genreIcon   = GENRE_ICONS[w.genre]  || 'fas fa-file';
        const statusBadge = w.status === 'published'
            ? `<span class="badge-status published"><i class="fas fa-circle"></i> Published</span>`
            : `<span class="badge-status draft"><i class="fas fa-circle"></i> Draft</span>`;
        const featStar = w.featured
            ? `<span class="featured-star active" title="Featured"><i class="fas fa-star"></i></span>`
            : `<span class="featured-star" title="Not featured"><i class="far fa-star"></i></span>`;
        
        let authorDisplay = escAdm(meta.displayName);
        if (meta.isAnonymous && meta.realName) {
            authorDisplay = `Anonymous <em style="color:var(--muted);font-size:12px;">(${escAdm(meta.realName)})</em>`;
        }
        const authorLine = meta.cleanInfo ? `${authorDisplay} — ${escAdm(meta.cleanInfo)}` : authorDisplay;

        const coverThumbnail = meta.coverImage
            ? `<img src="${escAdm(meta.coverImage)}" alt="Cover" style="width:34px; height:34px; border-radius:6px; object-fit:cover; flex-shrink:0;">`
            : '';

        const authorAvatar = (!meta.isAnonymous && meta.authorDisplay === 'photo' && meta.authorImage)
            ? `<img src="${escAdm(meta.authorImage)}" alt="Author" style="width:18px; height:18px; border-radius:50%; object-fit:cover; vertical-align:middle; margin-right:3px;">`
            : `<i class="fas fa-user"></i>`;

        return `
        <div class="post-row" data-id="${w.id}">
            <div class="post-row-main">
                <div class="post-row-title">
                    ${featStar}
                    ${coverThumbnail}
                    <i class="${genreIcon}" style="font-size:12px; color:var(--orange); flex-shrink:0;"></i>
                    <span>${escAdm(w.title)}</span>
                </div>
                <div class="post-row-meta">
                    <span class="blog-tag-sm">${genreLabel}</span>
                    <span>${authorAvatar} ${authorLine}</span>
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                    ${statusBadge}
                </div>
            </div>
            <div class="post-row-actions">
                <button class="action-btn edit-btn"   onclick="startEditLR('${w.id}')"    title="Edit work"><i class="fas fa-pen"></i></button>
                <button class="action-btn feat-btn"   onclick="toggleLRFeatured('${w.id}', ${!w.featured})" title="${w.featured ? 'Remove featured' : 'Set as featured'}"><i class="${w.featured ? 'fas' : 'far'} fa-star"></i></button>
                <button class="action-btn" style="width:32px;height:32px;border-radius:8px;border:1px solid var(--border);background:white;display:flex;align-items:center;justify-content:center;font-size:13px;cursor:pointer;color:var(--muted);transition:all 0.15s;" onclick="toggleLRPublish('${w.id}', '${w.status}')" title="${w.status === 'published' ? 'Unpublish' : 'Publish'}">
                    <i class="fas fa-${w.status === 'published' ? 'eye-slash' : 'globe'}"></i>
                </button>
                <button class="action-btn delete-btn" onclick="confirmDeleteLR('${w.id}', '${escAdm(w.title).replace(/'/g, "\\'")}')" title="Delete work"><i class="fas fa-trash"></i></button>
            </div>
        </div>`;
    }).join('');

    list.innerHTML = rows;
}

/* ═══════════════════════════════════════════════════════════════════════════
   BIND EVENTS
═══════════════════════════════════════════════════════════════════════════ */
function bindLREvents() {
    // Tab shown listener to ensure Quill is initialized & focused
    const lrTabBtn = document.getElementById('lr-tab');
    if (lrTabBtn) {
        const onTabActivate = () => {
            initLRQuill();
            setTimeout(() => {
                if (lrQuillEditor) {
                    lrQuillEditor.enable(true);
                }
            }, 50);
        };
        lrTabBtn.addEventListener('shown.bs.tab', onTabActivate);
        lrTabBtn.addEventListener('click', onTabActivate);
    }

    // Click wrapper to focus Quill editor
    const quillWrapper = document.querySelector('#lr-panel .quill-wrapper');
    if (quillWrapper) {
        quillWrapper.addEventListener('click', (e) => {
            if (!e.target.closest('.ql-toolbar') && lrQuillEditor) {
                lrQuillEditor.focus();
            }
        });
    }

    // Anonymous toggle listener
    const anonCheckbox = document.getElementById('lr-anonymous');
    const authorNameInput = document.getElementById('lr-author-name');
    if (anonCheckbox && authorNameInput) {
        anonCheckbox.addEventListener('change', () => {
            if (anonCheckbox.checked) {
                authorNameInput.required = false;
                authorNameInput.placeholder = 'Optional (leave blank or enter real name for records)';
            } else {
                authorNameInput.required = true;
                authorNameInput.placeholder = 'e.g. John Doe';
            }
        });
    }

    // Form submit
    const form = document.getElementById('lr-work-form');
    if (form) form.addEventListener('submit', handleLRFormSubmit);

    // Cancel edit
    const cancelBtn = document.getElementById('lr-cancel-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', resetLRForm);

    // Cover Image preview & remove
    const coverFileInput = document.getElementById('lr-cover-file');
    const coverPreview   = document.getElementById('lr-cover-preview');
    const coverRemoveBtn = document.getElementById('lr-remove-cover-btn');
    const coverUrlInput  = document.getElementById('lr-current-cover-url');

    if (coverFileInput && coverPreview) {
        coverFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                coverPreview.src = URL.createObjectURL(file);
                coverPreview.style.display = 'block';
                if (coverRemoveBtn) coverRemoveBtn.style.display = 'inline-block';
            }
        });
    }

    if (coverRemoveBtn) {
        coverRemoveBtn.addEventListener('click', () => {
            if (coverFileInput) coverFileInput.value = '';
            if (coverUrlInput) coverUrlInput.value = '';
            if (coverPreview) { coverPreview.src = ''; coverPreview.style.display = 'none'; }
            coverRemoveBtn.style.display = 'none';
        });
    }

    // Author Photo preview & remove
    const authorFileInput = document.getElementById('lr-author-file');
    const authorPreview   = document.getElementById('lr-author-preview');
    const authorRemoveBtn = document.getElementById('lr-remove-author-btn');
    const authorUrlInput  = document.getElementById('lr-current-author-url');
    const photoRadio      = document.getElementById('lr-author-display-photo');

    if (authorFileInput && authorPreview) {
        authorFileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                authorPreview.src = URL.createObjectURL(file);
                authorPreview.style.display = 'block';
                if (authorRemoveBtn) authorRemoveBtn.style.display = 'inline-block';
                if (photoRadio) photoRadio.checked = true;
            }
        });
    }

    if (authorRemoveBtn) {
        authorRemoveBtn.addEventListener('click', () => {
            if (authorFileInput) authorFileInput.value = '';
            if (authorUrlInput) authorUrlInput.value = '';
            if (authorPreview) { authorPreview.src = ''; authorPreview.style.display = 'none'; }
            authorRemoveBtn.style.display = 'none';
            const abbrevRadio = document.getElementById('lr-author-display-abbrev');
            if (abbrevRadio) abbrevRadio.checked = true;
        });
    }

    // Search
    const searchInput = document.getElementById('lr-works-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = allLRWorks.filter(w =>
                w.title.toLowerCase().includes(q) ||
                (w.author_name || '').toLowerCase().includes(q) ||
                (w.genre || '').toLowerCase().includes(q)
            );
            renderLRList(filtered);
        });
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   FORM SUBMIT — CREATE OR UPDATE
═══════════════════════════════════════════════════════════════════════════ */
async function handleLRFormSubmit(e) {
    e.preventDefault();

    const isAnonymous = document.getElementById('lr-anonymous')?.checked || false;
    let authorName   = (document.getElementById('lr-author-name')?.value || '').trim();
    let authorInfo   = (document.getElementById('lr-author-info')?.value || '').trim();
    const title      = (document.getElementById('lr-title')?.value || '').trim();
    const genre      = document.getElementById('lr-genre')?.value || '';
    const body       = lrQuillEditor ? lrQuillEditor.root.innerHTML : (document.getElementById('lr-body')?.value || '').trim();
    const textLen    = lrQuillEditor ? lrQuillEditor.getText().trim().length : body.length;
    const status     = document.getElementById('lr-status')?.value || 'draft';
    const featured   = document.getElementById('lr-featured')?.checked || false;

    if (!title) return showLRFormError('Please enter a title.');
    if (!authorName && !isAnonymous) return showLRFormError('Please enter the author\'s name or check "Publish as Anonymous".');
    if (!genre) return showLRFormError('Please select a genre.');
    if (textLen < 20) return showLRFormError('Please paste the full work (at least 20 characters).');

    let savedAuthorName = authorName || 'Anonymous';
    let savedAuthorInfo = authorInfo || null;

    clearLRFormError();
    setLRFormLoading(true, 'Saving…');

    try {
        let coverUrl = document.getElementById('lr-current-cover-url')?.value || null;
        const coverFileInput = document.getElementById('lr-cover-file');
        if (coverFileInput && coverFileInput.files && coverFileInput.files[0]) {
            setLRFormLoading(true, 'Uploading piece cover image…');
            coverUrl = await uploadLRImage(coverFileInput.files[0], 'lr-pieces');
        }

        let authorImgUrl = document.getElementById('lr-current-author-url')?.value || null;
        const authorFileInput = document.getElementById('lr-author-file');
        if (authorFileInput && authorFileInput.files && authorFileInput.files[0]) {
            setLRFormLoading(true, 'Uploading author photo…');
            authorImgUrl = await uploadLRImage(authorFileInput.files[0], 'lr-authors');
        }

        const authorDisplay = document.querySelector('input[name="lr-author-display"]:checked')?.value || 'abbreviation';

        let metaTags = '';
        if (isAnonymous) {
            metaTags += `[ANON:${authorName || 'Anonymous'}] `;
        }
        if (coverUrl) {
            metaTags += `[COVER:${coverUrl}] `;
        }
        if (authorImgUrl) {
            metaTags += `[AUTHOR_IMG:${authorImgUrl}] `;
        }
        metaTags += `[AUTHOR_DISPLAY:${authorDisplay}] `;

        savedAuthorInfo = (metaTags + (authorInfo || '')).trim() || null;

        const { data: { user } } = await supabaseClient.auth.getUser();

        // Auto-generate excerpt from first 200 chars
        const excerpt = autoLRExcerpt(body, 200);

        const workData = {
            title,
            author_name:  savedAuthorName,
            author_info:  savedAuthorInfo,
            genre,
            body,
            excerpt,
            status,
            featured,
            author_id:    user?.id || null,
            updated_at:   new Date().toISOString(),
        };

        // If publishing, set published_at
        if (status === 'published' && !lrEditingId) {
            workData.published_at = new Date().toISOString();
        }

        if (lrEditingId) {
            // Also set published_at if switching to published now
            if (status === 'published') {
                const existing = allLRWorks.find(w => w.id === lrEditingId);
                if (existing && existing.status !== 'published') {
                    workData.published_at = new Date().toISOString();
                }
            }
            const { error } = await supabaseClient.from('lr_works').update(workData).eq('id', lrEditingId);
            if (error) throw error;
            showAdminToast('Work updated successfully!');
        } else {
            const { error } = await supabaseClient.from('lr_works').insert([workData]);
            if (error) throw error;
            showAdminToast(status === 'published' ? 'Work published!' : 'Work saved as draft.');
        }

        resetLRForm();
        await loadLRStats();
        await loadLRWorks();

    } catch (err) {
        showLRFormError('Error saving work: ' + err.message);
        console.error('[LR Admin] Save error:', err);
    } finally {
        setLRFormLoading(false);
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   EDIT WORK
═══════════════════════════════════════════════════════════════════════════ */
async function startEditLR(workId) {
    const { data: work, error } = await supabaseClient.from('lr_works').select('*').eq('id', workId).single();
    if (error || !work) { showAdminToast('Could not load work for editing.', true); return; }

    lrEditingId = workId;

    const meta = parseLRWorkMeta(work);

    const anonCheckbox = document.getElementById('lr-anonymous');
    if (anonCheckbox) anonCheckbox.checked = meta.isAnonymous;

    const authorInput = document.getElementById('lr-author-name');
    if (authorInput) {
        authorInput.value = meta.realName || (meta.isAnonymous ? '' : work.author_name) || '';
        authorInput.required = !meta.isAnonymous;
        authorInput.placeholder = meta.isAnonymous ? 'Optional (leave blank or enter real name for records)' : 'e.g. John Doe';
    }

    setValue('lr-title',       work.title);
    setValue('lr-author-info', meta.cleanInfo);
    setValue('lr-genre',       work.genre);

    // Cover image preview
    const coverUrlInput  = document.getElementById('lr-current-cover-url');
    const coverPreview   = document.getElementById('lr-cover-preview');
    const coverRemoveBtn = document.getElementById('lr-remove-cover-btn');
    const coverFileInput = document.getElementById('lr-cover-file');
    if (coverFileInput) coverFileInput.value = '';
    if (meta.coverImage) {
        if (coverUrlInput) coverUrlInput.value = meta.coverImage;
        if (coverPreview) { coverPreview.src = meta.coverImage; coverPreview.style.display = 'block'; }
        if (coverRemoveBtn) coverRemoveBtn.style.display = 'inline-block';
    } else {
        if (coverUrlInput) coverUrlInput.value = '';
        if (coverPreview) { coverPreview.src = ''; coverPreview.style.display = 'none'; }
        if (coverRemoveBtn) coverRemoveBtn.style.display = 'none';
    }

    // Author photo preview
    const authorUrlInput  = document.getElementById('lr-current-author-url');
    const authorPreview   = document.getElementById('lr-author-preview');
    const authorRemoveBtn = document.getElementById('lr-remove-author-btn');
    const authorFileInput = document.getElementById('lr-author-file');
    if (authorFileInput) authorFileInput.value = '';
    if (meta.authorImage) {
        if (authorUrlInput) authorUrlInput.value = meta.authorImage;
        if (authorPreview) { authorPreview.src = meta.authorImage; authorPreview.style.display = 'block'; }
        if (authorRemoveBtn) authorRemoveBtn.style.display = 'inline-block';
    } else {
        if (authorUrlInput) authorUrlInput.value = '';
        if (authorPreview) { authorPreview.src = ''; authorPreview.style.display = 'none'; }
        if (authorRemoveBtn) authorRemoveBtn.style.display = 'none';
    }

    // Display mode choice
    const photoRadio  = document.getElementById('lr-author-display-photo');
    const abbrevRadio = document.getElementById('lr-author-display-abbrev');
    if (meta.authorDisplay === 'photo' && photoRadio) {
        photoRadio.checked = true;
    } else if (abbrevRadio) {
        abbrevRadio.checked = true;
    }

    if (lrQuillEditor) {
        if (work.body && !/<[a-z][\s\S]*>/i.test(work.body)) {
            lrQuillEditor.setText(work.body);
        } else {
            lrQuillEditor.root.innerHTML = work.body || '';
        }
    } else {
        setValue('lr-body', work.body);
    }
    setValue('lr-status',      work.status);
    const featEl = document.getElementById('lr-featured');
    if (featEl) featEl.checked = !!work.featured;

    const heading = document.getElementById('lr-form-heading');
    if (heading) heading.innerHTML = '<i class="fas fa-edit"></i> Edit Literary Work';

    const submitBtn = document.getElementById('lr-submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Work';

    const cancelBtn = document.getElementById('lr-cancel-btn');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';

    document.getElementById('lr-work-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOGGLE PUBLISH
═══════════════════════════════════════════════════════════════════════════ */
async function toggleLRPublish(workId, currentStatus) {
    try {
        const newStatus = currentStatus === 'published' ? 'draft' : 'published';
        const updateData = { status: newStatus };
        if (newStatus === 'published') updateData.published_at = new Date().toISOString();

        const { error } = await supabaseClient.from('lr_works').update(updateData).eq('id', workId);
        if (error) throw error;

        showAdminToast(newStatus === 'published' ? 'Work published!' : 'Work unpublished.');
        await loadLRStats();
        await loadLRWorks();
    } catch (err) {
        showAdminToast('Error updating status.', true);
        console.error(err);
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOGGLE FEATURED
═══════════════════════════════════════════════════════════════════════════ */
async function toggleLRFeatured(workId, setFeatured) {
    try {
        await supabaseClient.from('lr_works').update({ featured: setFeatured }).eq('id', workId);
        showAdminToast(setFeatured ? 'Set as featured!' : 'Featured status removed.');
        await loadLRStats();
        await loadLRWorks();
    } catch (err) {
        showAdminToast('Error updating featured.', true);
        console.error(err);
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   DELETE WORK
═══════════════════════════════════════════════════════════════════════════ */
function confirmDeleteLR(workId, title) {
    const modal   = document.getElementById('lr-delete-modal');
    const titleEl = document.getElementById('lr-delete-title');
    if (titleEl) titleEl.textContent = title;

    const confirmBtn = document.getElementById('lr-confirm-delete-btn');
    if (confirmBtn) {
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        newBtn.addEventListener('click', () => deleteLRWork(workId));
    }

    if (modal) new bootstrap.Modal(modal).show();
}

async function deleteLRWork(workId) {
    try {
        const { error } = await supabaseClient.from('lr_works').delete().eq('id', workId);
        if (error) throw error;

        const modal = bootstrap.Modal.getInstance(document.getElementById('lr-delete-modal'));
        if (modal) modal.hide();

        showAdminToast('Work deleted.');
        await loadLRStats();
        await loadLRWorks();
    } catch (err) {
        showAdminToast('Error deleting: ' + err.message, true);
        console.error(err);
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   RESET FORM
═══════════════════════════════════════════════════════════════════════════ */
function resetLRForm() {
    lrEditingId = null;
    document.getElementById('lr-work-form')?.reset();
    if (lrQuillEditor) {
        lrQuillEditor.root.innerHTML = '';
    }

    const anonCheckbox = document.getElementById('lr-anonymous');
    if (anonCheckbox) anonCheckbox.checked = false;
    const authorInput = document.getElementById('lr-author-name');
    if (authorInput) {
        authorInput.required = true;
        authorInput.placeholder = 'e.g. John Doe';
    }

    // Reset image inputs & previews
    const coverUrlInput  = document.getElementById('lr-current-cover-url');
    const coverPreview   = document.getElementById('lr-cover-preview');
    const coverRemoveBtn = document.getElementById('lr-remove-cover-btn');
    const coverFileInput = document.getElementById('lr-cover-file');
    if (coverUrlInput) coverUrlInput.value = '';
    if (coverFileInput) coverFileInput.value = '';
    if (coverPreview) { coverPreview.src = ''; coverPreview.style.display = 'none'; }
    if (coverRemoveBtn) coverRemoveBtn.style.display = 'none';

    const authorUrlInput  = document.getElementById('lr-current-author-url');
    const authorPreview   = document.getElementById('lr-author-preview');
    const authorRemoveBtn = document.getElementById('lr-remove-author-btn');
    const authorFileInput = document.getElementById('lr-author-file');
    if (authorUrlInput) authorUrlInput.value = '';
    if (authorFileInput) authorFileInput.value = '';
    if (authorPreview) { authorPreview.src = ''; authorPreview.style.display = 'none'; }
    if (authorRemoveBtn) authorRemoveBtn.style.display = 'none';

    const abbrevRadio = document.getElementById('lr-author-display-abbrev');
    if (abbrevRadio) abbrevRadio.checked = true;

    const heading = document.getElementById('lr-form-heading');
    if (heading) heading.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Literary Work';

    const submitBtn = document.getElementById('lr-submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Save Work';

    const cancelBtn = document.getElementById('lr-cancel-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';

    clearLRFormError();
}

/* ═══════════════════════════════════════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════════════════════════════════════ */
function autoLRExcerpt(text, maxLen) {
    if (!text) return '';
    const stripped = text.replace(/<[^>]*>/g, ' ');
    const plain = stripped.replace(/\n+/g, ' ').replace(/\s+/g, ' ').trim();
    if (plain.length <= maxLen) return plain;
    const cut = plain.lastIndexOf(' ', maxLen);
    return plain.substring(0, cut > 40 ? cut : maxLen) + '…';
}

function setValue(id, val) {
    const el = document.getElementById(id);
    if (el) el.value = val || '';
}

function setLRFormLoading(state, text = 'Saving…') {
    const btn = document.getElementById('lr-submit-btn');
    if (!btn) return;
    btn.disabled = state;
    if (state) btn.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${text}`;
}

function showLRFormError(msg) {
    const el = document.getElementById('lr-form-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function clearLRFormError() {
    const el = document.getElementById('lr-form-error');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
}

function showAdminToast(msg, isError = false) {
    // Reuse the existing admin dashboard toast
    const toast    = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-msg');
    if (!toast || !toastMsg) return;
    toastMsg.textContent = msg;
    toast.className = `toast-notification ${isError ? 'error' : 'success'} show`;
    setTimeout(() => toast.classList.remove('show'), 3500);
}

function escAdm(str) {
    if (!str) return '';
    return String(str)
        .replace(/&/g,'&amp;').replace(/</g,'&lt;')
        .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
