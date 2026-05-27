/**
 * ═══════════════════════════════════════════════
 *  CONTACT.JS — Contact Form Submission
 *  JMS Website
 * ═══════════════════════════════════════════════
 *
 *  Handles submitting contact messages to Supabase.
 */

'use strict';

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault(); // Prevent default page reload

        const submitBtn = document.getElementById('cf-submit');
        const submitText = document.getElementById('cf-submit-text');
        const errorEl = document.getElementById('cf-error');
        
        // Hide previous errors
        errorEl.classList.add('d-none');
        errorEl.textContent = '';

        // Get values
        const payload = {
            name: document.getElementById('cf-name').value.trim(),
            email: document.getElementById('cf-email').value.trim(),
            phone: document.getElementById('cf-phone').value.trim(),
            branch: document.getElementById('cf-branch').value,
            address: document.getElementById('cf-address').value.trim(),
            message: document.getElementById('cf-message').value.trim()
        };

        // Loading state
        submitBtn.disabled = true;
        const originalText = submitText.innerHTML;
        submitText.innerHTML = '<i class="fas fa-circle-notch fa-spin me-2"></i> Sending...';

        try {
            // Insert into Supabase
            const { error } = await supabaseClient
                .from('contact_messages')
                .insert([payload]);

            if (error) throw error;

            // Success -> redirect
            window.location.href = 'success.html';
            
        } catch (err) {
            console.error('Contact form error:', err);
            errorEl.textContent = 'Oops! Something went wrong. Please check your internet connection and try again.';
            errorEl.classList.remove('d-none');
            
            // Restore button
            submitBtn.disabled = false;
            submitText.innerHTML = originalText;
        }
    });
});
