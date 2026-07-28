/**
 * BigQuery Pulse - Frontend Application Logic
 */

document.addEventListener('DOMContentLoaded', () => {
    // State Variables
    let allNotes = [];
    let categoriesList = [];
    let activeCategory = 'ALL';
    let searchQuery = '';
    let sortOrder = 'newest';
    let selectedNote = null;
    let currentTemplate = 'standard';

    // DOM Elements
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    const themeToggleLabel = document.getElementById('themeToggleLabel');
    const refreshBtn = document.getElementById('refreshBtn');
    const refreshIcon = document.getElementById('refreshIcon');
    const refreshBtnLabel = document.getElementById('refreshBtnLabel');
    const statusText = document.getElementById('statusText');
    const feedStatusPill = document.getElementById('feedStatusPill');
    const searchInput = document.getElementById('searchInput');
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    const totalCountEl = document.getElementById('totalCount');
    const lastRefreshedText = document.getElementById('lastRefreshedText');
    const categoryChipsEl = document.getElementById('categoryChips');
    const sortOrderSelect = document.getElementById('sortOrder');
    const exportCsvBtn = document.getElementById('exportCsvBtn');
    const notesGrid = document.getElementById('notesGrid');
    const skeletonView = document.getElementById('skeletonView');
    const emptyState = document.getElementById('emptyState');
    const resetFilterBtn = document.getElementById('resetFilterBtn');

    // Theme Switcher Logic
    let currentTheme = localStorage.getItem('bq_pulse_theme') || 'dark';
    applyTheme(currentTheme);

    function applyTheme(theme) {
        currentTheme = theme;
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('bq_pulse_theme', theme);

        if (!themeToggleBtn) return;
        const sunIcon = themeToggleBtn.querySelector('.sun-icon');
        const moonIcon = themeToggleBtn.querySelector('.moon-icon');

        if (theme === 'light') {
            if (sunIcon) sunIcon.style.display = 'none';
            if (moonIcon) moonIcon.style.display = 'block';
            if (themeToggleLabel) themeToggleLabel.textContent = 'Dark Mode';
        } else {
            if (sunIcon) sunIcon.style.display = 'block';
            if (moonIcon) moonIcon.style.display = 'none';
            if (themeToggleLabel) themeToggleLabel.textContent = 'Light Mode';
        }
    }

    if (themeToggleBtn) {
        themeToggleBtn.addEventListener('click', () => {
            const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
            applyTheme(nextTheme);
            showToast(`Switched to ${nextTheme.charAt(0).toUpperCase() + nextTheme.slice(1)} Mode`, 'info');
        });
    }

    // Modal Elements
    const tweetModalBackdrop = document.getElementById('tweetModalBackdrop');
    const closeModalBtn = document.getElementById('closeModalBtn');
    const modalCategoryBadge = document.getElementById('modalCategoryBadge');
    const modalDate = document.getElementById('modalDate');
    const modalSnippet = document.getElementById('modalSnippet');
    const tweetTextArea = document.getElementById('tweetTextArea');
    const charCountEl = document.getElementById('charCount');
    const charProgressFill = document.getElementById('charProgressFill');
    const charStatusMsg = document.getElementById('charStatusMsg');
    const postTweetBtn = document.getElementById('postTweetBtn');
    const copyTweetBtn = document.getElementById('copyTweetBtn');
    const presetButtons = document.querySelectorAll('.btn-preset');
    const toastContainer = document.getElementById('toastContainer');

    // Initial Fetch
    fetchNotes(false);

    // Event Listeners
    refreshBtn.addEventListener('click', () => {
        fetchNotes(true);
    });

    if (exportCsvBtn) {
        exportCsvBtn.addEventListener('click', exportToCSV);
    }

    searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        clearSearchBtn.style.display = searchQuery ? 'block' : 'none';
        renderFeed();
    });

    clearSearchBtn.addEventListener('click', () => {
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        renderFeed();
    });

    sortOrderSelect.addEventListener('change', (e) => {
        sortOrder = e.target.value;
        renderFeed();
    });

    resetFilterBtn.addEventListener('click', () => {
        activeCategory = 'ALL';
        searchInput.value = '';
        searchQuery = '';
        clearSearchBtn.style.display = 'none';
        updateCategoryChipsUI();
        renderFeed();
    });

    closeModalBtn.addEventListener('click', closeTweetModal);
    tweetModalBackdrop.addEventListener('click', (e) => {
        if (e.target === tweetModalBackdrop) closeTweetModal();
    });

    tweetTextArea.addEventListener('input', updateCharCount);

    presetButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            presetButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTemplate = btn.dataset.template;
            if (selectedNote) {
                applyTweetTemplate(selectedNote, currentTemplate);
            }
        });
    });

    postTweetBtn.addEventListener('click', () => {
        const text = tweetTextArea.value.trim();
        if (!text) {
            showToast('Tweet content cannot be empty', 'error');
            return;
        }
        if (text.length > 280) {
            showToast('Tweet text exceeds 280 characters limit!', 'error');
            return;
        }
        
        const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`;
        window.open(twitterUrl, '_blank', 'noopener,noreferrer');
        showToast('Opened Twitter / X composer window!', 'success');
        closeTweetModal();
    });

    copyTweetBtn.addEventListener('click', () => {
        const text = tweetTextArea.value.trim();
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            showToast('Copied tweet text to clipboard!', 'success');
        }).catch(() => {
            showToast('Failed to copy text', 'error');
        });
    });

    // Fetch Notes Function
    async function fetchNotes(forceRefresh = false) {
        setLoadingState(true);
        try {
            const url = '/api/notes' + (forceRefresh ? '?refresh=true' : '');
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
            
            const data = await response.json();
            
            if (data.status === 'error') {
                throw new Error(data.message || 'Failed to fetch release notes');
            }

            allNotes = data.notes || [];
            categoriesList = data.categories || [];
            
            lastRefreshedText.textContent = `Last checked: ${data.fetched_at || 'Just now'}`;
            statusText.textContent = 'Connected to Feed';

            buildCategoryChips();
            renderFeed();

            if (forceRefresh) {
                showToast(`Refreshed ${allNotes.length} BigQuery release notes!`, 'success');
            }
        } catch (err) {
            console.error('Fetch error:', err);
            statusText.textContent = 'Connection Error';
            showToast(`Error: ${err.message}`, 'error');
        } finally {
            setLoadingState(false);
        }
    }

    function setLoadingState(isLoading) {
        if (isLoading) {
            refreshBtn.classList.add('loading');
            refreshBtnLabel.textContent = 'Fetching...';
            feedStatusPill.querySelector('.status-dot').className = 'status-dot spinning';
        } else {
            refreshBtn.classList.remove('loading');
            refreshBtnLabel.textContent = 'Refresh Notes';
            feedStatusPill.querySelector('.status-dot').className = 'status-dot green';
        }
    }

    // Build Dynamic Category Filter Chips
    function buildCategoryChips() {
        const counts = {};
        allNotes.forEach(note => {
            counts[note.category] = (counts[note.category] || 0) + 1;
        });

        let html = `<button class="chip ${activeCategory === 'ALL' ? 'active' : ''}" data-category="ALL">All (${allNotes.length})</button>`;
        
        categoriesList.forEach(cat => {
            const count = counts[cat] || 0;
            const isActive = activeCategory === cat ? 'active' : '';
            html += `<button class="chip ${isActive}" data-category="${cat}">${cat} (${count})</button>`;
        });

        categoryChipsEl.innerHTML = html;

        categoryChipsEl.querySelectorAll('.chip').forEach(chip => {
            chip.addEventListener('click', () => {
                activeCategory = chip.dataset.category;
                updateCategoryChipsUI();
                renderFeed();
            });
        });
    }

    function updateCategoryChipsUI() {
        categoryChipsEl.querySelectorAll('.chip').forEach(chip => {
            if (chip.dataset.category === activeCategory) {
                chip.classList.add('active');
            } else {
                chip.classList.remove('active');
            }
        });
    }

    // Filter & Sort helper
    function getFilteredNotes() {
        let filtered = allNotes.filter(note => {
            const matchesCategory = activeCategory === 'ALL' || note.category === activeCategory;
            const matchesSearch = !searchQuery || 
                note.date.toLowerCase().includes(searchQuery) ||
                note.category.toLowerCase().includes(searchQuery) ||
                note.content_text.toLowerCase().includes(searchQuery);
            return matchesCategory && matchesSearch;
        });

        if (sortOrder === 'oldest') {
            filtered = [...filtered].reverse();
        }
        return filtered;
    }

    // Export displayed notes to CSV format
    function exportToCSV() {
        const filtered = getFilteredNotes();
        if (!filtered || filtered.length === 0) {
            showToast('No release notes available to export', 'error');
            return;
        }

        const headers = ["Note ID", "Date", "Category", "Summary Content", "Documentation Link"];
        
        const csvRows = [
            headers.join(','),
            ...filtered.map(note => {
                const id = `"${(note.id || '').replace(/"/g, '""')}"`;
                const date = `"${(note.date || '').replace(/"/g, '""')}"`;
                const category = `"${(note.category || '').replace(/"/g, '""')}"`;
                const content = `"${(note.content_text || '').replace(/"/g, '""')}"`;
                const link = `"${(note.link || '').replace(/"/g, '""')}"`;
                return [id, date, category, content, link].join(',');
            })
        ];

        const csvString = csvRows.join('\r\n');
        const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        const timestamp = new Date().toISOString().slice(0, 10);
        link.setAttribute('download', `bigquery_release_notes_${timestamp}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showToast(`Exported ${filtered.length} release notes to CSV!`, 'success');
    }

    // Filter, Sort & Render Feed Cards
    function renderFeed() {
        skeletonView.style.display = 'none';

        const filtered = getFilteredNotes();

        totalCountEl.textContent = filtered.length;

        if (filtered.length === 0) {
            notesGrid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        notesGrid.style.display = 'flex';

        notesGrid.innerHTML = filtered.map(note => createNoteCardHTML(note)).join('');

        // Attach event listeners to card actions
        notesGrid.querySelectorAll('.btn-tweet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const noteId = e.currentTarget.dataset.id;
                const note = allNotes.find(n => n.id === noteId);
                if (note) openTweetModal(note);
            });
        });

        notesGrid.querySelectorAll('.btn-copy-snippet').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const targetBtn = e.currentTarget;
                const text = targetBtn.dataset.text;
                navigator.clipboard.writeText(text).then(() => {
                    const originalHTML = targetBtn.innerHTML;
                    targetBtn.classList.add('copied');
                    targetBtn.innerHTML = `
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.5">
                            <polyline points="20 6 9 17 4 12"></polyline>
                        </svg>
                        Copied!
                    `;
                    showToast('Snippet copied to clipboard!', 'success');
                    setTimeout(() => {
                        targetBtn.classList.remove('copied');
                        targetBtn.innerHTML = originalHTML;
                    }, 2000);
                }).catch(() => {
                    showToast('Failed to copy to clipboard', 'error');
                });
            });
        });
    }

    function getCategoryClass(category) {
        const cat = (category || '').toLowerCase();
        if (cat.includes('feature')) return 'feature';
        if (cat.includes('change')) return 'change';
        if (cat.includes('security')) return 'security';
        if (cat.includes('issue') || cat.includes('fix')) return 'issue';
        if (cat.includes('announcement')) return 'announcement';
        return 'general';
    }

    function getCategoryIcon(category) {
        const cat = (category || '').toLowerCase();
        if (cat.includes('feature')) return '🚀';
        if (cat.includes('change')) return '⚡';
        if (cat.includes('security')) return '🛡️';
        if (cat.includes('issue')) return '⚠️';
        if (cat.includes('announcement')) return '📢';
        return '📌';
    }

    function createNoteCardHTML(note) {
        const catClass = getCategoryClass(note.category);
        const catIcon = getCategoryIcon(note.category);
        
        return `
        <article class="note-card" id="${note.id}">
            <div class="card-header">
                <div class="card-meta-left">
                    <span class="category-badge ${catClass}">${catIcon} ${escapeHtml(note.category)}</span>
                    <span class="card-date">${escapeHtml(note.date)}</span>
                </div>
            </div>

            <div class="card-body">
                ${note.content_html}
            </div>

            <div class="card-footer">
                <a href="${escapeHtml(note.link)}" target="_blank" rel="noopener noreferrer" class="doc-link">
                    Official BigQuery Release Docs &rarr;
                </a>

                <div class="card-actions-right">
                    <button class="btn btn-secondary btn-copy-snippet" data-text="${escapeHtml(note.content_text)}" title="Copy text snippet">
                        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                        </svg>
                        Copy
                    </button>

                    <button class="btn btn-tweet" data-id="${note.id}">
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                        Tweet Update
                    </button>
                </div>
            </div>
        </article>
        `;
    }

    // Tweet Modal Handlers
    function openTweetModal(note) {
        selectedNote = note;
        const catClass = getCategoryClass(note.category);
        const catIcon = getCategoryIcon(note.category);

        modalCategoryBadge.className = `category-badge ${catClass}`;
        modalCategoryBadge.textContent = `${catIcon} ${note.category}`;
        modalDate.textContent = note.date;
        modalSnippet.textContent = note.content_text;

        // Reset preset active button to standard
        presetButtons.forEach(b => b.classList.remove('active'));
        document.querySelector('.btn-preset[data-template="standard"]').classList.add('active');
        currentTemplate = 'standard';

        applyTweetTemplate(note, currentTemplate);
        tweetModalBackdrop.classList.add('active');
    }

    function applyTweetTemplate(note, template) {
        let text = '';
        const icon = getCategoryIcon(note.category);
        const date = note.date;
        const snippet = note.content_text;
        const link = note.link;

        if (template === 'standard') {
            text = `${icon} BigQuery ${note.category} (${date}):\n\n${snippet}\n\nRead more: ${link}\n#BigQuery #GoogleCloud`;
        } else if (template === 'short') {
            // Trim snippet if too long
            const trimmed = snippet.length > 140 ? snippet.substring(0, 137) + '...' : snippet;
            text = `${icon} BigQuery Update (${date}): ${trimmed} #BigQuery`;
        } else if (template === 'hashtags') {
            text = `${icon} Google BigQuery ${note.category} Update:\n\n"${snippet}"\n\n#BigQuery #GCP #DataEngineering #Cloud #GoogleCloud #Data`;
        }

        // Truncate to 280 max if needed by default template
        if (text.length > 280) {
            const availLength = 280 - (text.length - snippet.length) - 4;
            if (availLength > 20) {
                const truncatedSnippet = snippet.substring(0, availLength) + '...';
                if (template === 'standard') {
                    text = `${icon} BigQuery ${note.category} (${date}):\n\n${truncatedSnippet}\n\n#BigQuery #GoogleCloud`;
                } else if (template === 'hashtags') {
                    text = `${icon} BigQuery Update:\n\n"${truncatedSnippet}"\n\n#BigQuery #GCP #DataEngineering`;
                }
            }
        }

        tweetTextArea.value = text;
        updateCharCount();
    }

    function updateCharCount() {
        const len = tweetTextArea.value.length;
        const remaining = 280 - len;
        charCountEl.textContent = len;

        const percentage = Math.min(100, (len / 280) * 100);
        charProgressFill.style.width = `${percentage}%`;

        if (len > 280) {
            charProgressFill.className = 'char-progress-fill danger';
            charStatusMsg.textContent = `${Math.abs(remaining)} chars over limit`;
            charStatusMsg.style.color = 'var(--google-red)';
            postTweetBtn.disabled = true;
            postTweetBtn.style.opacity = '0.5';
        } else if (len > 240) {
            charProgressFill.className = 'char-progress-fill warning';
            charStatusMsg.textContent = `${remaining} chars remaining`;
            charStatusMsg.style.color = 'var(--google-yellow)';
            postTweetBtn.disabled = false;
            postTweetBtn.style.opacity = '1';
        } else {
            charProgressFill.className = 'char-progress-fill';
            charStatusMsg.textContent = 'Fits Twitter length';
            charStatusMsg.style.color = 'var(--text-muted)';
            postTweetBtn.disabled = false;
            postTweetBtn.style.opacity = '1';
        }
    }

    function closeTweetModal() {
        tweetModalBackdrop.classList.remove('active');
        selectedNote = null;
    }

    // Toast Alert Helper
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = 'toast';
        
        let icon = 'ℹ️';
        if (type === 'success') icon = '✅';
        if (type === 'error') icon = '⚠️';

        toast.innerHTML = `<span>${icon}</span> <span>${escapeHtml(message)}</span>`;
        toastContainer.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(10px)';
            toast.style.transition = 'all 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3200);
    }

    // Utility HTML Escaper
    function escapeHtml(str) {
        if (!str) return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }
});
