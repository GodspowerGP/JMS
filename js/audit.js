/**
 * ═══════════════════════════════════════════════
 *  AUDIT.JS — Audit Trail Tab Logic
 *  JMS Website
 * ═══════════════════════════════════════════════
 *
 *  Handles rendering and viewing system logs from Supabase audit_logs.
 *  Only loaded if the administrator is a Superadmin.
 */

'use strict';

let auditLogs   = [];
const auditLimit  = 50;
let auditOffset = 0;

/**
 * Initialize Audit Log Event Bindings
 */
async function initAuditLogs() {
    const searchInput = document.getElementById('audit-search');
    if (searchInput) {
        searchInput.addEventListener('input', debounce(filterAuditLogs, 250));
    }

    const actionFilter = document.getElementById('audit-action-filter');
    if (actionFilter) {
        actionFilter.addEventListener('change', filterAuditLogs);
    }

    const targetFilter = document.getElementById('audit-target-filter');
    if (targetFilter) {
        targetFilter.addEventListener('change', filterAuditLogs);
    }

    const refreshBtn = document.getElementById('refresh-audit-btn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Refreshing...';
            await loadAuditLogs(true);
            refreshBtn.innerHTML = '<i class="fas fa-sync-alt"></i> Refresh';
        });
    }

    const loadMoreBtn = document.getElementById('load-more-audit-btn');
    if (loadMoreBtn) {
        loadMoreBtn.addEventListener('click', loadMoreAuditLogs);
    }

    await loadAuditLogs(true);
}

/**
 * Fetch logs from database
 */
async function loadAuditLogs(reset = false) {
    if (reset) {
        auditOffset = 0;
        auditLogs = [];
        const container = document.getElementById('audit-log-list');
        if (container) {
            container.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Loading audit logs…</p>
                </div>`;
        }
    }

    try {
        const { data, error } = await supabaseClient
            .from('audit_logs')
            .select('*')
            .order('created_at', { ascending: false })
            .range(auditOffset, auditOffset + auditLimit - 1);

        if (error) throw error;

        if (reset) {
            auditLogs = data || [];
        } else {
            auditLogs = [...auditLogs, ...(data || [])];
        }

        renderAuditLogsList(auditLogs);

        // Manage Load More button
        const loadMoreBtn = document.getElementById('load-more-audit-btn');
        if (loadMoreBtn) {
            if (data && data.length === auditLimit) {
                loadMoreBtn.classList.remove('d-none');
            } else {
                loadMoreBtn.classList.add('d-none');
            }
        }

    } catch (err) {
        console.error('[Audit Log] Error fetching logs:', err.message);
        const container = document.getElementById('audit-log-list');
        if (container) {
            container.innerHTML = `
                <div class="empty-state text-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    <p>Failed to load audit logs. Only accounts with the "Superadmin" role can query this data.<br>
                    <small class="text-muted">${escAud(err.message)}</small></p>
                </div>`;
        }
    }
}

/**
 * Load next page
 */
async function loadMoreAuditLogs() {
    auditOffset += auditLimit;
    const loadMoreBtn = document.getElementById('load-more-audit-btn');
    if (loadMoreBtn) {
        loadMoreBtn.disabled = true;
        loadMoreBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
    }

    await loadAuditLogs(false);

    if (loadMoreBtn) {
        loadMoreBtn.disabled = false;
        loadMoreBtn.innerHTML = 'Load More Logs';
    }
}

/**
 * Render logs on screen
 */
function renderAuditLogsList(logs) {
    const container = document.getElementById('audit-log-list');
    if (!container) return;

    const q      = (document.getElementById('audit-search')?.value || '').toLowerCase();
    const action = document.getElementById('audit-action-filter')?.value || 'all';
    const target = document.getElementById('audit-target-filter')?.value || 'all';

    // Apply filters
    const filtered = logs.filter(log => {
        const matchSearch = (log.admin_name || '').toLowerCase().includes(q) ||
                            (log.admin_email || '').toLowerCase().includes(q) ||
                            (log.target_name || '').toLowerCase().includes(q) ||
                            (log.target_id || '').toLowerCase().includes(q);
        const matchAction = action === 'all' || log.action_type === action;
        const matchTarget = target === 'all' || log.target_type === target;
        return matchSearch && matchAction && matchTarget;
    });

    if (!filtered.length) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-history"></i>
                <p>No matching audit logs found.</p>
            </div>`;
        return;
    }

    const ACTION_CLASSES = {
        CREATE:      'badge bg-success text-white',
        UPDATE:      'badge bg-primary text-white',
        DELETE:      'badge bg-danger text-white',
        PUBLISH:     'badge bg-info text-white',
        UNPUBLISH:   'badge bg-secondary text-white',
        FEATURE:     'badge bg-warning text-dark',
        UNFEATURE:   'badge bg-dark text-white'
    };

    const TARGET_LABELS = {
        BLOG_POST:     'Blog Post',
        LITERARY_WORK: 'Literary Work',
        INBOX_MESSAGE: 'Contact Message'
    };

    const rows = filtered.map(log => {
        const date = new Date(log.created_at).toLocaleString('en-GB', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });

        const actClass    = ACTION_CLASSES[log.action_type] || 'badge bg-light text-dark border';
        const targetLabel = TARGET_LABELS[log.target_type] || log.target_type;
        const detailsHtml = log.details ? renderDetailsCollapse(log.id, log.details) : '';

        return `
        <div class="post-row flex-column align-items-start gap-2 p-3 mb-2" style="border-left: 4px solid ${getBorderColor(log.action_type)};">
            <div class="d-flex align-items-center justify-content-between w-100 flex-wrap gap-2">
                <div class="d-flex align-items-center gap-2 flex-wrap">
                    <span class="${actClass}" style="font-size:10px; font-weight:700; text-transform:uppercase; padding: 3px 8px; border-radius: 20px;">${log.action_type}</span>
                    <strong style="color:var(--text); font-size:14px;">${escAud(log.target_name || log.target_id)}</strong>
                    <span class="blog-tag-sm" style="font-size:10px; font-weight:700; padding: 2px 8px; border-radius: 20px;">${targetLabel}</span>
                </div>
                <span style="font-size:12px; color:var(--muted);"><i class="fas fa-clock me-1"></i>${date}</span>
            </div>
            <div class="post-row-meta w-100 d-flex justify-content-between align-items-center flex-wrap gap-2">
                <span>
                    <i class="fas fa-user-shield me-1"></i>
                    <strong>${escAud(log.admin_name)}</strong>
                    <span class="text-muted">(${escAud(log.admin_email)})</span>
                </span>
                ${detailsHtml}
            </div>
        </div>`;
    }).join('');

    container.innerHTML = rows;
}

/**
 * Returns color code corresponding to a logged action
 */
function getBorderColor(action) {
    switch (action) {
        case 'CREATE':    return '#22c55e'; // Green
        case 'DELETE':    return '#ef4444'; // Red
        case 'PUBLISH':   return '#06b6d4'; // Cyan
        case 'UNPUBLISH': return '#64748b'; // Slate Grey
        case 'FEATURE':   return '#eab308'; // Yellow
        case 'UNFEATURE': return '#1e293b'; // Dark Navy
        default:          return '#3b82f6'; // Blue (UPDATE)
    }
}

/**
 * Collapsible details block builder
 */
function renderDetailsCollapse(logId, details) {
    let prettyText = '';
    try {
        const obj = typeof details === 'string' ? JSON.parse(details) : details;
        if (obj.new_values || obj.old_values) {
            let changes = [];
            
            if (obj.new_values && !obj.old_values) {
                // Insert (New)
                const keys = Object.keys(obj.new_values).filter(k => !['body', 'details', 'created_at', 'updated_at'].includes(k));
                changes.push('<strong>Initial Values:</strong>');
                keys.forEach(k => changes.push(`&bull; <strong>${k}</strong>: ${escAud(obj.new_values[k])}`));
            } else if (obj.new_values && obj.old_values) {
                // Update (Compare fields)
                changes.push('<strong>Modified Fields:</strong>');
                const keys = Object.keys(obj.new_values).filter(k => !['body', 'details', 'created_at', 'updated_at'].includes(k));
                keys.forEach(k => {
                    const oldVal = JSON.stringify(obj.old_values[k]);
                    const newVal = JSON.stringify(obj.new_values[k]);
                    if (oldVal !== newVal) {
                        changes.push(`&bull; <strong>${k}</strong>: <span style="text-decoration: line-through; color: #ef4444;">${escAud(obj.old_values[k])}</span> &rarr; <span style="color: #22c55e;">${escAud(obj.new_values[k])}</span>`);
                    }
                });
                if (changes.length === 1) {
                    changes.push('&bull; Content field updated (body edit)');
                }
            } else if (obj.old_values) {
                // Delete
                const keys = Object.keys(obj.old_values).filter(k => !['body', 'details', 'created_at', 'updated_at'].includes(k));
                changes.push('<strong>Deleted Record Metadata:</strong>');
                keys.forEach(k => changes.push(`&bull; <strong>${k}</strong>: ${escAud(obj.old_values[k])}`));
            }
            
            prettyText = changes.join('<br>');
        } else {
            prettyText = escAud(JSON.stringify(obj));
        }
    } catch (e) {
        prettyText = escAud(String(details));
    }

    return `
    <div style="width: 100%; margin-top: 4px;">
        <a class="text-decoration-none" data-bs-toggle="collapse" href="#details-${logId}" role="button" aria-expanded="false" style="color:var(--accent-orange, #f97316); font-weight:700; font-size:11px;">
            <i class="fas fa-info-circle me-1"></i>View Details
        </a>
        <div class="collapse mt-2 p-3 rounded" id="details-${logId}" style="background:#f8fafc; border:1px solid #e2e8f0; font-family:'Inter', sans-serif; font-size:12px; line-height:1.6; max-height:220px; overflow-y:auto;">
            ${prettyText}
        </div>
    </div>`;
}

function filterAuditLogs() {
    renderAuditLogsList(auditLogs);
}

/**
 * Debounce helper
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Escape string for HTML
 */
function escAud(str) {
    if (str === null || str === undefined) return 'N/A';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}
