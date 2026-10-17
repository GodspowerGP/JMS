/**
 * ═══════════════════════════════════════════════
 *  LR-SUBMISSIONS.JS — Literary Review Submission Form
 *  JMS Website
 * ═══════════════════════════════════════════════
 *
 *  Submissions are sent via EmailJS to the editorial team.
 *  No data is stored in any database — email only.
 *
 *  ─────────────────────────────────────────────
 *  ONE-TIME EMAILJS SETUP (do this once):
 *  ─────────────────────────────────────────────
 *  1. Go to https://www.emailjs.com/ → create free account
 *  2. Dashboard → Email Services → Add New Service
 *     → Choose Gmail → connect your Gmail → name it  jms_service
 *  3. Dashboard → Email Templates → Create New Template
 *     Set "To email":  degppowerhouse@gmail.com, crazyjujuinnerslug@gmail.com
 *     Set "Subject":   New LR Submission: {{genre}} — {{title}}
 *     Set "Body" (plain text):
 *
 *       NEW LITERARY REVIEW SUBMISSION — JMS
 *       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *       Submitter Type: {{submitter_type}}
 *       Name:           {{author_name}}
 *       Email:          {{author_email}}
 *       Class / Info:   {{author_info}}
 *       School Name:    {{school_name}}
 *       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *       Genre: {{genre}}
 *       Title: {{title}}
 *       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *
 *       {{body_text}}
 *
 *       ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 *       Sent via Jewel Literary Magazine Website
 *
 *  4. Note the Template ID (e.g. template_xxxxxx)
 *  5. Dashboard → Account → copy your Public Key
 *  6. Paste your credentials into the three constants below:
 *  ─────────────────────────────────────────────
 */

'use strict';

/* ═══════════════════════════════════════════════════════════════════════════
   ⚠️  FILL IN YOUR EMAILJS CREDENTIALS BELOW
═══════════════════════════════════════════════════════════════════════════ */
const LR_EMAILJS_PUBLIC_KEY  = 'jutm8WPQbMX6N1pw9';   // e.g. 'xK2Abc9zDef'
const LR_EMAILJS_SERVICE_ID  = 'jms_service';                // must match your service name
const LR_EMAILJS_TEMPLATE_ID = 'template_baujqxj';          // e.g. 'template_lr4x8k2'

/* ═══════════════════════════════════════════════════════════════════════════
   INIT
═══════════════════════════════════════════════════════════════════════════ */
(function initEmailJS() {
    if (typeof emailjs !== 'undefined') {
        emailjs.init({ publicKey: LR_EMAILJS_PUBLIC_KEY });
    } else {
        console.warn('[LR] EmailJS SDK not loaded — check your <script> tags in lr-submissions.html');
    }
})();

/* ═══════════════════════════════════════════════════════════════════════════
   DOM READY
═══════════════════════════════════════════════════════════════════════════ */
document.addEventListener('DOMContentLoaded', function () {
    bindConditionalFields();
    bindFormSubmit();
});

/* ═══════════════════════════════════════════════════════════════════════════
   CONDITIONAL FIELD VISIBILITY
═══════════════════════════════════════════════════════════════════════════ */
function bindConditionalFields() {
    const subType     = document.getElementById('sub-type');
    const fieldsJMS   = document.getElementById('fields-jms');
    const fieldsOther = document.getElementById('fields-other-school');
    const fieldsIndiv = document.getElementById('fields-individual');
    if (!subType) return;

    subType.addEventListener('change', function () {
        // Hide all
        [fieldsJMS, fieldsOther, fieldsIndiv].forEach(el => el && el.classList.add('d-none'));

        // Remove required from conditional inputs
        safeRemoveRequired('sub-author-class');
        safeRemoveRequired('sub-school-name');
        safeRemoveRequired('sub-other-class');

        // Show relevant section
        if (this.value === 'jms') {
            fieldsJMS && fieldsJMS.classList.remove('d-none');
            safeSetRequired('sub-author-class');
        } else if (this.value === 'other_school') {
            fieldsOther && fieldsOther.classList.remove('d-none');
            safeSetRequired('sub-school-name');
            safeSetRequired('sub-other-class');
        } else if (this.value === 'individual') {
            fieldsIndiv && fieldsIndiv.classList.remove('d-none');
            // affiliation is optional
        }
    });
}

function safeSetRequired(id) {
    const el = document.getElementById(id);
    if (el) el.setAttribute('required', '');
}

function safeRemoveRequired(id) {
    const el = document.getElementById(id);
    if (el) el.removeAttribute('required');
}

/* ═══════════════════════════════════════════════════════════════════════════
   FORM SUBMIT → EMAILJS
═══════════════════════════════════════════════════════════════════════════ */
function bindFormSubmit() {
    const form = document.getElementById('lr-submission-form');
    if (form) form.addEventListener('submit', handleLRSubmit);
}

async function handleLRSubmit(e) {
    e.preventDefault();

    const btn        = document.getElementById('submit-btn');
    const successBox = document.getElementById('submission-success');
    const errorBox   = document.getElementById('submission-error');

    // Hide previous feedback
    if (successBox) successBox.classList.add('d-none');
    if (errorBox)   errorBox.classList.add('d-none');

    // Collect core fields
    const submitterType = document.getElementById('sub-type')?.value || '';
    const authorName    = (document.getElementById('sub-author-name')?.value || '').trim();
    const authorEmail   = (document.getElementById('sub-email')?.value || '').trim();
    const genre         = document.getElementById('sub-genre')?.value || '';
    const title         = (document.getElementById('sub-title')?.value || '').trim();
    const bodyText      = (document.getElementById('sub-body')?.value || '').trim();

    // Collect conditional fields
    let authorInfo = '';
    let schoolName = '';
    if (submitterType === 'jms') {
        authorInfo = (document.getElementById('sub-author-class')?.value || '').trim();
    } else if (submitterType === 'other_school') {
        schoolName  = (document.getElementById('sub-school-name')?.value || '').trim();
        authorInfo  = (document.getElementById('sub-other-class')?.value || '').trim();
    } else if (submitterType === 'individual') {
        authorInfo  = (document.getElementById('sub-affiliation')?.value || '').trim();
    }

    // Human-readable labels
    const TYPE_LABELS  = { jms: 'JMS Contributor', other_school: 'Contributor from Peer School', individual: 'Independent / Individual Writer' };
    const GENRE_LABELS = { poetry: 'Poetry', fiction: 'Fiction', nonfiction: 'Non-Fiction' };
    const typeLabel    = TYPE_LABELS[submitterType]  || submitterType;
    const genreLabel   = GENRE_LABELS[genre] || genre;

    // Loading state
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Submitting…';

    try {
        if (typeof emailjs === 'undefined') {
            throw new Error('Email service unavailable.');
        }

        await emailjs.send(LR_EMAILJS_SERVICE_ID, LR_EMAILJS_TEMPLATE_ID, {
            submitter_type: typeLabel,
            author_name:    authorName,
            author_email:   authorEmail,
            author_info:    authorInfo || 'N/A',
            school_name:    schoolName || 'N/A',
            genre:          genreLabel,
            title:          title,
            body_text:      bodyText,
        });

        // ✅ Success
        resetLRForm();
        if (successBox) {
            successBox.classList.remove('d-none');
            successBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }

    } catch (err) {
        console.error('[LR] EmailJS error:', err);
        // Restore button
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Draft for Review';
        // Show error
        if (errorBox) {
            errorBox.textContent = 'There was a problem sending your submission. Please try again, or email us directly at jewelmodel1996@gmail.com.';
            errorBox.classList.remove('d-none');
            errorBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }
}

/* ═══════════════════════════════════════════════════════════════════════════
   RESET FORM
═══════════════════════════════════════════════════════════════════════════ */
function resetLRForm() {
    const form = document.getElementById('lr-submission-form');
    if (form) form.reset();

    ['fields-jms', 'fields-other-school', 'fields-individual'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.classList.add('d-none');
    });

    const btn = document.getElementById('submit-btn');
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Submit Draft for Review';
        btn.classList.remove('d-none');
    }
}
