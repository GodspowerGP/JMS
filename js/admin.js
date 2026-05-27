/**
 * ═══════════════════════════════════════════════
 *  ADMIN.JS — Dashboard Logic
 *  JMS Website
 * ═══════════════════════════════════════════════
 *
 *  Handles:
 *  - Auth guard + admin profile display
 *  - Stats (total posts, published, drafts, unique tags)
 *  - Create / Edit / Delete blog posts
 *  - Image upload to Supabase Storage (blog-images bucket)
 *  - Quill rich text editor integration
 *  - Recent posts table with edit/delete/featured toggle
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════════════════════════════════ */
const BUCKET     = 'blog-images';
const POSTS_PER_PAGE = 10;

let quillEditor  = null;    // Quill instance
let editingPostId = null;   // null = creating, UUID = editing
let currentPage  = 1;
let allPosts     = [];

/* ═══════════════════════════════════════════════════════════════════════════
   INIT — runs when DOM is ready
═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', async () => {

    // 1. Auth guard — redirect if not logged in
    const { data: { session } } = await supabaseClient.auth.getSession();
    if (!session) {
        window.location.href = 'admin_login.html';
        return;
    }

    // 2. Display admin profile in header
    await renderAdminProfile();

    // 3. Set up Quill editor
    initQuill();

    // 4. Load dashboard data
    await loadStats();
    await loadRecentPosts();

    // 5. Wire up events
    bindEvents();
});

/* ═══════════════════════════════════════════════════════════════════════════
   ADMIN PROFILE
═══════════════════════════════════════════════════════════════════════════ */
async function renderAdminProfile() {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    const { data: profile } = await supabaseClient
        .from('admin_profiles')
        .select('full_name, role_tag')
        .eq('id', user.id)
        .single();

    const name    = profile?.full_name || user.email;
    const roleTag = profile?.role_tag  || 'Admin';

    const nameEl    = document.getElementById('admin-name');
    const roleEl    = document.getElementById('admin-role');
    const avatarEl  = document.getElementById('admin-avatar');

    if (nameEl)   nameEl.textContent = name;
    if (roleEl)   roleEl.textContent = roleTag;
    if (avatarEl) avatarEl.textContent = name.charAt(0).toUpperCase();
}

/* ═══════════════════════════════════════════════════════════════════════════
   QUILL EDITOR INIT
═══════════════════════════════════════════════════════════════════════════ */
function initQuill() {
    quillEditor = new Quill('#quill-editor', {
        theme: 'snow',
        placeholder: 'Write your blog post content here...',
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

/* ═══════════════════════════════════════════════════════════════════════════
   STATS
═══════════════════════════════════════════════════════════════════════════ */
async function loadStats() {
    // Total posts
    const { count: total } = await supabaseClient
        .from('blog_posts')
        .select('*', { count: 'exact', head: true });

    // Published
    const { count: published } = await supabaseClient
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'published');

    // Drafts
    const { count: drafts } = await supabaseClient
        .from('blog_posts')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'draft');

    // Unique tags
    const { data: tagsData } = await supabaseClient
        .from('blog_posts')
        .select('tag');
    const uniqueTags = new Set((tagsData || []).map(p => p.tag).filter(Boolean)).size;

    animateCount('total-posts',     total     || 0);
    animateCount('published-posts', published || 0);
    animateCount('draft-posts',     drafts    || 0);
    animateCount('total-tags',      uniqueTags);
}

function animateCount(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let current = 0;
    const step = Math.max(1, Math.ceil(target / 30));
    const timer = setInterval(() => {
        current = Math.min(current + step, target);
        el.textContent = current;
        if (current >= target) clearInterval(timer);
    }, 40);
}

/* ═══════════════════════════════════════════════════════════════════════════
   LOAD RECENT POSTS
═══════════════════════════════════════════════════════════════════════════ */
async function loadRecentPosts() {
    const { data: posts, error } = await supabaseClient
        .from('blog_posts')
        .select(`
            id,
            title,
            tag,
            status,
            featured,
            created_at,
            admin_profiles ( full_name, role_tag )
        `)
        .order('created_at', { ascending: false })
        .limit(50);

    if (error) {
        console.error('Error loading posts:', error.message);
        return;
    }

    allPosts = posts || [];
    renderPostsTable(allPosts);
}

function renderPostsTable(posts) {
    const container = document.getElementById('recent-blogs-list');
    if (!container) return;

    if (!posts.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-feather-alt"></i>
                <p>No posts yet. Create your first blog post above!</p>
            </div>`;
        return;
    }

    const rows = posts.map(post => {
        const date     = new Date(post.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
        const author   = post.admin_profiles?.full_name || 'Unknown';
        const roleTag  = post.admin_profiles?.role_tag  || '';
        const statusBadge = post.status === 'published'
            ? `<span class="badge-status published"><i class="fas fa-circle"></i> Published</span>`
            : `<span class="badge-status draft"><i class="fas fa-circle"></i> Draft</span>`;
        const featuredStar = post.featured
            ? `<span class="featured-star active" title="Featured post"><i class="fas fa-star"></i></span>`
            : `<span class="featured-star" title="Mark as featured"><i class="far fa-star"></i></span>`;

        return `
        <div class="post-row" data-id="${post.id}">
            <div class="post-row-main">
                <div class="post-row-title">
                    ${featuredStar}
                    <span>${escHtml(post.title)}</span>
                </div>
                <div class="post-row-meta">
                    ${post.tag ? `<span class="blog-tag-sm">${escHtml(post.tag)}</span>` : ''}
                    <span><i class="fas fa-user"></i> ${escHtml(author)}${roleTag ? ` · <em>${escHtml(roleTag)}</em>` : ''}</span>
                    <span><i class="fas fa-calendar"></i> ${date}</span>
                    ${statusBadge}
                </div>
            </div>
            <div class="post-row-actions">
                <button class="action-btn edit-btn"   onclick="startEdit('${post.id}')"   title="Edit post">
                    <i class="fas fa-pen"></i>
                </button>
                <button class="action-btn feat-btn"   onclick="toggleFeatured('${post.id}', ${!post.featured})" title="${post.featured ? 'Remove featured' : 'Set as featured'}">
                    <i class="${post.featured ? 'fas' : 'far'} fa-star"></i>
                </button>
                <button class="action-btn delete-btn" onclick="confirmDelete('${post.id}', '${escHtml(post.title).replace(/'/g, "\\'")}')" title="Delete post">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        </div>`;
    }).join('');

    container.innerHTML = rows;
}

/* ═══════════════════════════════════════════════════════════════════════════
   BIND EVENTS
═══════════════════════════════════════════════════════════════════════════ */
function bindEvents() {
    // Form submit
    const blogForm = document.getElementById('blog-form');
    if (blogForm) blogForm.addEventListener('submit', handleFormSubmit);

    // Cancel edit
    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) cancelBtn.addEventListener('click', resetForm);

    // Logout
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', async () => {
            await supabaseClient.auth.signOut();
            window.location.href = 'admin_login.html';
        });
    }

    // Image preview
    const fileInput = document.getElementById('formFile');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const preview = document.getElementById('image-preview');
                if (preview) {
                    preview.src = ev.target.result;
                    preview.style.display = 'block';
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // Search / filter
    const searchInput = document.getElementById('posts-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const q = e.target.value.toLowerCase();
            const filtered = allPosts.filter(p =>
                p.title.toLowerCase().includes(q) ||
                (p.tag || '').toLowerCase().includes(q)
            );
            renderPostsTable(filtered);
        });
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   FORM SUBMIT — CREATE OR UPDATE
═══════════════════════════════════════════════════════════════════════════ */
async function handleFormSubmit(e) {
    e.preventDefault();

    const title   = document.getElementById('blog-title').value.trim();
    const tag     = document.getElementById('blog-tag').value.trim();
    const status  = document.getElementById('blog-status')?.value || 'published';
    const featured= document.getElementById('blog-featured')?.checked || false;
    const fileInput = document.getElementById('formFile');
    const body    = quillEditor.root.innerHTML;

    // Validation
    if (!title) return showFormError('Please enter a blog title.');
    if (quillEditor.getText().trim().length < 10) return showFormError('Please write some content (at least 10 characters).');

    const submitBtn = document.getElementById('submit-btn');
    setFormLoading(true);
    clearFormError();

    try {
        // Get current user
        const { data: { user } } = await supabaseClient.auth.getUser();

        // Upload image if provided
        let imageUrl = document.getElementById('current-image-url')?.value || null;
        if (fileInput.files.length > 0) {
            imageUrl = await uploadImage(fileInput.files[0]);
        }

        const postData = {
            title,
            body,
            tag: tag || null,
            author_id: user.id,
            image_url: imageUrl,
            status,
            featured,
            updated_at: new Date().toISOString()
        };

        if (editingPostId) {
            // UPDATE existing post
            const { error } = await supabaseClient
                .from('blog_posts')
                .update(postData)
                .eq('id', editingPostId);

            if (error) throw error;
            showSuccessToast('Post updated successfully!');
        } else {
            // CREATE new post
            const { error } = await supabaseClient
                .from('blog_posts')
                .insert([postData]);

            if (error) throw error;
            showSuccessToast('Post published successfully!');
        }

        resetForm();
        await loadStats();
        await loadRecentPosts();

    } catch (err) {
        showFormError('Error saving post: ' + err.message);
        console.error(err);
    } finally {
        setFormLoading(false);
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   IMAGE UPLOAD
═══════════════════════════════════════════════════════════════════════════ */
async function uploadImage(file) {
    const ext      = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `posts/${fileName}`;

    const { error: uploadError } = await supabaseClient.storage
        .from(BUCKET)
        .upload(filePath, file, { upsert: false, contentType: file.type });

    if (uploadError) throw uploadError;

    const { data } = supabaseClient.storage
        .from(BUCKET)
        .getPublicUrl(filePath);

    return data.publicUrl;
}

/* ═══════════════════════════════════════════════════════════════════════════
   EDIT POST
═══════════════════════════════════════════════════════════════════════════ */
async function startEdit(postId) {
    const { data: post, error } = await supabaseClient
        .from('blog_posts')
        .select('*')
        .eq('id', postId)
        .single();

    if (error || !post) {
        showSuccessToast('Could not load post for editing.', true);
        return;
    }

    editingPostId = postId;

    // Populate form
    document.getElementById('blog-title').value = post.title || '';
    document.getElementById('blog-tag').value   = post.tag   || '';

    const statusEl = document.getElementById('blog-status');
    if (statusEl) statusEl.value = post.status || 'published';

    const featuredEl = document.getElementById('blog-featured');
    if (featuredEl) featuredEl.checked = !!post.featured;

    // Set Quill content
    quillEditor.root.innerHTML = post.body || '';

    // Show existing image
    if (post.image_url) {
        const preview = document.getElementById('image-preview');
        if (preview) {
            preview.src = post.image_url;
            preview.style.display = 'block';
        }
        const currentImgUrl = document.getElementById('current-image-url');
        if (currentImgUrl) currentImgUrl.value = post.image_url;
    }

    // Update form heading
    const formHeading = document.getElementById('form-heading');
    if (formHeading) formHeading.innerHTML = '<i class="fas fa-edit"></i> Edit Blog Post';

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-save"></i> Update Post';

    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'inline-flex';

    // Scroll to form
    document.getElementById('blog-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/* ═══════════════════════════════════════════════════════════════════════════
   DELETE POST
═══════════════════════════════════════════════════════════════════════════ */
function confirmDelete(postId, title) {
    const modal = document.getElementById('delete-modal');
    const titleEl = document.getElementById('delete-post-title');
    if (titleEl) titleEl.textContent = title;

    const confirmBtn = document.getElementById('confirm-delete-btn');
    if (confirmBtn) {
        // Remove any previous listener
        const newBtn = confirmBtn.cloneNode(true);
        confirmBtn.parentNode.replaceChild(newBtn, confirmBtn);
        newBtn.addEventListener('click', () => deletePost(postId));
    }

    if (modal) {
        const bsModal = new bootstrap.Modal(modal);
        bsModal.show();
    }
}

async function deletePost(postId) {
    try {
        const { error } = await supabaseClient
            .from('blog_posts')
            .delete()
            .eq('id', postId);

        if (error) throw error;

        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('delete-modal'));
        if (modal) modal.hide();

        showSuccessToast('Post deleted.');
        await loadStats();
        await loadRecentPosts();

    } catch (err) {
        showSuccessToast('Error deleting post: ' + err.message, true);
        console.error(err);
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   TOGGLE FEATURED
═══════════════════════════════════════════════════════════════════════════ */
async function toggleFeatured(postId, setFeatured) {
    try {
        // If setting featured, unfeatured all others first
        if (setFeatured) {
            await supabaseClient.from('blog_posts').update({ featured: false }).eq('featured', true);
        }
        await supabaseClient.from('blog_posts').update({ featured: setFeatured }).eq('id', postId);
        showSuccessToast(setFeatured ? 'Post set as featured!' : 'Featured status removed.');
        await loadRecentPosts();
    } catch (err) {
        console.error('Featured toggle error:', err);
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   RESET FORM
═══════════════════════════════════════════════════════════════════════════ */
function resetForm() {
    editingPostId = null;
    document.getElementById('blog-form')?.reset();
    if (quillEditor) quillEditor.root.innerHTML = '';

    const preview = document.getElementById('image-preview');
    if (preview) { preview.src = ''; preview.style.display = 'none'; }

    const currentImgUrl = document.getElementById('current-image-url');
    if (currentImgUrl) currentImgUrl.value = '';

    const formHeading = document.getElementById('form-heading');
    if (formHeading) formHeading.innerHTML = '<i class="fas fa-plus-circle"></i> Add New Blog Post';

    const submitBtn = document.getElementById('submit-btn');
    if (submitBtn) submitBtn.innerHTML = '<i class="fas fa-paper-plane"></i> Publish Post';

    const cancelBtn = document.getElementById('cancel-edit-btn');
    if (cancelBtn) cancelBtn.style.display = 'none';

    clearFormError();
}

/* ═══════════════════════════════════════════════════════════════════════════
   UI HELPERS
═══════════════════════════════════════════════════════════════════════════ */
function setFormLoading(state) {
    const btn = document.getElementById('submit-btn');
    if (!btn) return;
    btn.disabled = state;
    if (state) {
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving…';
    }
}

function showFormError(msg) {
    const el = document.getElementById('form-error');
    if (el) { el.textContent = msg; el.style.display = 'block'; }
}

function clearFormError() {
    const el = document.getElementById('form-error');
    if (el) { el.textContent = ''; el.style.display = 'none'; }
}

function showSuccessToast(msg, isError = false) {
    const toast = document.getElementById('toast-notification');
    const toastMsg = document.getElementById('toast-msg');
    if (!toast || !toastMsg) return;

    toastMsg.textContent = msg;
    toast.className = `toast-notification ${isError ? 'error' : 'success'} show`;

    setTimeout(() => toast.classList.remove('show'), 3500);
}

function escHtml(str) {
    if (!str) return '';
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
