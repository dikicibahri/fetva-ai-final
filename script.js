/**
 * Fetva AI - Smart Islamic Q&A with Groq AI
 * Features: Copy, Edit last question, Multiple sources, Chat History, Funny Mode
 */

// Groq API Configuration (via proxy)
const API_CONFIG = {
    apiKey: '', // BURASI BOMBOŞ KALMALI!
    baseUrl: '/api/chat', // Artık bizim kendi sunucumuza soracağız
    model: 'llama-3.3-70b-versatile'
};
// Komik mod için örnek laubali cevaplar
const FUNNY_ENDINGS = [
    "Hem istibra yapmamışsın hem de 'abdestim oldu mu' diye soruyorsun 😄",
    "Allah Teala kadınlara özel günlerinde bir şart koşmamış, sen niye bu kadar dertleniyorsun devam et 🤲",
    "E hocam bunu bile bilmiyorsan gel bi kahve içelim konuşalım ☕",
    "Merak etme, sen sor yeter, biz cevaplarız 😊",
    "Sormadan edemezsin değil mi? İşte bu yüzden burdayız! 📚",
    "Daha kolay bir soru yok muydu? Şaka şaka, buyur cevabın 😁",
    "Güzel soru! Ama bir dahakine biraz daha zorlayıcı olsun 🎯",
    "Bunun cevabını bilmemen normal, öğrenmek için sordun ya işte o önemli 💪",
    "Oooo bizimki yine dertlenmiş, gel bakayım yamacıma çözek şu işi 😉",
    "Ya sen ne takıntılı çıktın be kardeşim, sal gitsin hallederiz 🤙",
    "Bak bak sorulara bak, sanırsın mübarek atomu parçalıyor, rahat ol yaaa 😄",
    "Hocam sen bu kafayla çok yaşamazsın, valla bak gel bir çayımı iç de anlatayım ☕",
    "Yine mi sen? Sormasan hatrım kalırdı zaten, dökül bakalım neymiş derdin 😂",
    "Aman efendim, gözlerimiz yollarda kaldı, nerelerdeydin sen? Söyle bakalım ne oldu 🤝",
    "Bak şimdi, bu işin raconu şudur, dinle de bir şeyler öğren bari boş gitme 🧠",
    "Ya sen sormaktan bıkmadın ben cevaplamaktan bıktım, neyse gel hadi gel 😊",
    "Ohoo sen daha burada mısın? Ben çoktan hallettim o işi, izle şimdi... 😎",
    "Valla bu soruyu sormak için çok düşündün mü? Şaka yapıyorum ya, gel çözüyoruz hemen 🎯",
    "Bak buraya, bu işler öyle her sakallıyı deden sanmakla olmaz, doğrusunu biz söyleriz 💪",
    "Yav arkadaş, senin bu soruların beni bitiriyor ama neyse ki sabırlı adamım, buyur... 📚",
    "Yine mi karıştırdın ortalığı? Neyse, toparlamak yine bize düştü, anlat bakalım 🛠️",
];

document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');
    const resultsArea = document.getElementById('results-area');
    const welcomeSection = document.getElementById('welcome-section');
    const themeToggle = document.getElementById('theme-toggle');
    const exampleBtns = document.querySelectorAll('.example-btn');

    // Data from embedded data.js
    let fetvaData = [];

    // Store last query for edit feature
    let lastQuery = '';
    let canEditLastQuery = false;

    // Conversation history for follow-up questions
    let conversationHistory = [];
    let lastSources = [];

    // User state
    let currentUser = null;
    let funnyMode = false;
    let queryCount = parseInt(localStorage.getItem('fetva-query-count') || '0');
    const MAX_FREE_QUERIES = 25;

    // Chat management
    let currentChatId = null;
    let chats = [];

    // Initialize
    init();

    function init() {
        loadData();
        setupTheme();
        setupEventListeners();
        setupAuthListener();
        setupUserDropdown();
        checkQueryLimit();
        showDisclaimerModal(); // İlk girişte yasal uyarı göster

        // Init sidebar toggle state
        const sidebarFunnyToggle = document.getElementById('sidebar-funny-mode');
        if (sidebarFunnyToggle) {
            sidebarFunnyToggle.checked = funnyMode;
        }
    }

    /**
     * Show disclaimer modal on first visit
     */
    function showDisclaimerModal() {
        const hasSeenDisclaimer = localStorage.getItem('fetva-disclaimer-seen');
        if (hasSeenDisclaimer) return;

        // Create modal overlay
        const overlay = document.createElement('div');
        overlay.className = 'disclaimer-overlay';
        overlay.innerHTML = `
            <div class="disclaimer-modal">
                <div class="disclaimer-icon">⚠️</div>
                <h2>Önemli Uyarı</h2>
                <div class="disclaimer-content">
                    <p><strong>Bu uygulama bir yapay zeka sistemidir ve resmi bir fetva makamı değildir.</strong></p>
                    <p>Sunulan bilgiler Diyanet Fetva Kitabı, Ömer Nasuhi Bilmen İlmihali, Hadislerle İslam ve TDV İlmihalleri gibi kaynaklardan derlenmektedir.</p>
                    <p>Kesin dini hükümler için <strong>il/ilçe müftülüklerine</strong> veya <strong>Diyanet ALO 190</strong> hattına danışmanız önerilir.</p>
                </div>
                <button class="disclaimer-accept-btn">Anladım, Devam Et</button>
            </div>
        `;

        document.body.appendChild(overlay);

        // Add close functionality
        overlay.querySelector('.disclaimer-accept-btn').addEventListener('click', () => {
            localStorage.setItem('fetva-disclaimer-seen', 'true');
            overlay.classList.add('fade-out');
            setTimeout(() => overlay.remove(), 300);
        });
    }

    /**
     * Listen for auth state changes and update UI
     */
    function setupAuthListener() {
        if (typeof auth !== 'undefined') {
            auth.onAuthStateChanged(async (user) => {
                currentUser = user;
                updateUserUI(user);

                if (user) {
                    // Reset query count for logged-in users
                    queryCount = 0;
                    localStorage.setItem('fetva-query-count', '0');

                    // Load user preferences
                    try {
                        const userDoc = await db.collection('users').doc(user.uid).get();
                        if (userDoc.exists) {
                            funnyMode = userDoc.data().funnyMode || false;
                            // Update toggle if exists
                            const sidebarFunnyToggle = document.getElementById('sidebar-funny-mode');
                            if (sidebarFunnyToggle) sidebarFunnyToggle.checked = funnyMode;
                        }
                    } catch (e) {
                        console.log('User prefs not loaded:', e);
                    }

                    // Load user's chats
                    await loadChatList();
                } else {
                    // Clear chat list for non-logged users
                    clearChatList();
                }
            });
        }
    }

    /**
     * Clear chat list display
     */
    function clearChatList() {
        const chatListContainer = document.getElementById('chat-list');
        if (!chatListContainer) return;

        const items = chatListContainer.querySelectorAll('.chat-item');
        items.forEach(item => item.remove());
    }

    /**
     * Update sidebar user profile
     */
    /**
     * Update header user profile
     */
    function updateUserUI(user) {
        const headerLoginBtn = document.getElementById('header-login-btn');
        const headerUserProfile = document.getElementById('header-user-profile');
        const headerUserAvatar = document.getElementById('header-user-avatar');
        const dropdownUsername = document.querySelector('.dropdown-username');
        const dropdownEmail = document.querySelector('.dropdown-email');

        // Sidebar elements
        const sidebarUserInfo = document.getElementById('sidebar-user-info-display');
        const sidebarAvatar = document.getElementById('sidebar-user-avatar');
        const sidebarUsername = document.getElementById('sidebar-username-text');
        const sidebarEmail = document.getElementById('sidebar-email-text');

        if (user) {
            // Logged in
            if (headerLoginBtn) headerLoginBtn.style.display = 'none';
            if (headerUserProfile) headerUserProfile.style.display = 'flex';

            const displayName = user.displayName || user.email.split('@')[0];
            const initial = displayName.charAt(0).toUpperCase();

            // Header Avatar
            if (headerUserAvatar) {
                if (user.photoURL) {
                    headerUserAvatar.innerHTML = `<img src="${user.photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                } else {
                    headerUserAvatar.textContent = initial;
                }
            }

            // Dropdown Info
            if (dropdownUsername) dropdownUsername.textContent = displayName;
            if (dropdownEmail) dropdownEmail.textContent = user.email;

            // Sidebar User Info
            if (sidebarUserInfo) {
                sidebarUserInfo.style.display = 'flex';
                if (sidebarUsername) sidebarUsername.textContent = displayName;
                if (sidebarEmail) sidebarEmail.textContent = user.email;

                if (sidebarAvatar) {
                    if (user.photoURL) {
                        sidebarAvatar.innerHTML = `<img src="${user.photoURL}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">`;
                    } else {
                        sidebarAvatar.textContent = initial;
                    }
                }
            }

            // Init sidebar toggle state
            const sidebarFunnyToggle = document.getElementById('sidebar-funny-mode');
            if (sidebarFunnyToggle) {
                sidebarFunnyToggle.checked = funnyMode;
            }

            // Show sidebar logout button
            const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
            if (sidebarLogoutBtn) sidebarLogoutBtn.style.display = 'flex';

            // Load Chat History
            loadChatList();
        } else {
            // Logged out
            if (headerLoginBtn) headerLoginBtn.style.display = 'flex';
            if (headerUserProfile) headerUserProfile.style.display = 'none';

            if (sidebarUserInfo) sidebarUserInfo.style.display = 'none';

            // Hide sidebar logout button
            const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');
            if (sidebarLogoutBtn) sidebarLogoutBtn.style.display = 'none';

            // Clear chat list
            clearChatList();
        }
    }

    /**
     * Setup Dropdown Menu and Logout
     */
    function setupUserDropdown() {
        const profileBtn = document.getElementById('user-profile-btn');
        const dropdownMenu = document.getElementById('user-dropdown-menu');
        const logoutBtn = document.getElementById('logout-btn');

        if (profileBtn && dropdownMenu) {
            profileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                dropdownMenu.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!dropdownMenu.contains(e.target) && !profileBtn.contains(e.target)) {
                    dropdownMenu.classList.remove('show');
                }
            });
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', async () => {
                try {
                    await auth.signOut();
                    window.location.reload();
                } catch (err) {
                    console.error('Çıkış hatası:', err);
                }
            });
        }
    }

    /**
     * Load data from embedded window.FETVA_DATA (new format with source)
     */
    function loadData() {
        if (window.FETVA_DATA && Array.isArray(window.FETVA_DATA)) {
            fetvaData = window.FETVA_DATA;
            console.log('✅ Veri yüklendi:', fetvaData.length, 'kayıt');
        } else {
            console.error('❌ Veri yüklenemedi');
            showError('Veri yüklenemedi. data.js dosyasını kontrol edin.');
        }
    }

    /**
     * Setup theme
     */
    function setupTheme() {
        const savedTheme = localStorage.getItem('fetva-theme');
        if (savedTheme) {
            document.body.setAttribute('data-theme', savedTheme);
        } else {
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            document.body.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
        }

        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            if (!localStorage.getItem('fetva-theme')) {
                document.body.setAttribute('data-theme', e.matches ? 'dark' : 'light');
            }
        });
    }

    function toggleTheme() {
        const current = document.body.getAttribute('data-theme');
        const next = current === 'dark' ? 'light' : 'dark';
        document.body.setAttribute('data-theme', next);
        localStorage.setItem('fetva-theme', next);
    }

    function setupEventListeners() {
        themeToggle.addEventListener('click', toggleTheme);
        searchBtn.addEventListener('click', performSearch);

        // Search on Enter (but allow Shift+Enter for newline in textarea)
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                performSearch();
            }
        });

        // Auto-resize textarea and capitalize first letter
        searchInput.addEventListener('input', (e) => {
            // Auto-resize
            e.target.style.height = 'auto';
            e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';

            // Auto-capitalize first letter
            if (e.target.value.length === 1) {
                e.target.value = e.target.value.charAt(0).toUpperCase();
            }
        });

        // New Chat button (header)
        const newChatBtn = document.getElementById('new-chat-btn');
        if (newChatBtn) {
            newChatBtn.addEventListener('click', startNewConversation);
        }

        // New Chat button (sidebar)
        const newChatSidebarBtn = document.getElementById('new-chat-sidebar-btn');
        if (newChatSidebarBtn) {
            newChatSidebarBtn.addEventListener('click', startNewConversation);
        }

        // Share Conversation button
        const shareConversationBtn = document.getElementById('share-conversation-btn');
        if (shareConversationBtn) {
            shareConversationBtn.addEventListener('click', shareFullConversation);
        }

        // Sidebar toggle with animation and overlay
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebarClose = document.getElementById('sidebar-close');
        const sidebar = document.getElementById('sidebar');
        const sidebarOverlay = document.getElementById('sidebar-overlay');
        const sidebarLogoutBtn = document.getElementById('sidebar-logout-btn');

        // Function to open sidebar
        function openSidebar() {
            if (sidebar) sidebar.classList.remove('collapsed');
            if (sidebarToggle) sidebarToggle.classList.add('active');
            if (sidebarOverlay) sidebarOverlay.classList.add('active');
            document.querySelector('.app-layout')?.classList.add('sidebar-open');
        }

        // Function to close sidebar
        function closeSidebar() {
            if (sidebar) sidebar.classList.add('collapsed');
            if (sidebarToggle) sidebarToggle.classList.remove('active');
            if (sidebarOverlay) sidebarOverlay.classList.remove('active');
            document.querySelector('.app-layout')?.classList.remove('sidebar-open');
        }

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                if (sidebar.classList.contains('collapsed')) {
                    openSidebar();
                } else {
                    closeSidebar();
                }
            });
        }

        if (sidebarClose && sidebar) {
            sidebarClose.addEventListener('click', closeSidebar);
        }

        // Close sidebar when clicking overlay
        if (sidebarOverlay) {
            sidebarOverlay.addEventListener('click', closeSidebar);
        }

        // Sidebar logout button
        if (sidebarLogoutBtn) {
            sidebarLogoutBtn.addEventListener('click', async () => {
                try {
                    await auth.signOut();
                    closeSidebar();
                    currentChatId = null;
                    conversationHistory = [];
                    lastSources = [];
                    funnyMode = false;
                    resultsArea.innerHTML = '';
                    welcomeSection.style.display = 'flex';
                    clearChatList();
                    updateUserUI(null);
                    showToast('Çıkış yapıldı ✓');
                } catch (e) {
                    console.error('Logout error:', e);
                    alert('Çıkış yapılamadı.');
                }
            });
        }

        exampleBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                searchInput.value = btn.getAttribute('data-query');
                performSearch();
            });
        });

        // Delegated event listeners for dynamic buttons
        document.addEventListener('click', handleDynamicClicks);

        // Sidebar Funny Mode Toggle
        const sidebarFunnyToggle = document.getElementById('sidebar-funny-mode');
        if (sidebarFunnyToggle) {
            sidebarFunnyToggle.addEventListener('change', async (e) => {
                funnyMode = e.target.checked;
                console.log('Funny mode switched:', funnyMode);

                // Show toast feedback
                if (funnyMode) {
                    showToast('🎭 Laubali-Komik Mod Açıldı! Cevaplar artık daha eğlenceli olacak 😄');
                } else {
                    showToast('📚 Ciddi Mod Aktif - Cevaplar resmi ve akademik olacak');
                }

                if (currentUser && typeof db !== 'undefined') {
                    try {
                        await db.collection('users').doc(currentUser.uid).set({
                            funnyMode: funnyMode
                        }, { merge: true });
                    } catch (err) {
                        console.error('Failed to save preference:', err);
                    }
                }
            });
        }
    }

    /**
     * Handle clicks on dynamic buttons (copy, edit)
     */
    function handleDynamicClicks(e) {
        // Copy button (AI response)
        if (e.target.closest('.copy-btn')) {
            const btn = e.target.closest('.copy-btn');
            const textToCopy = btn.getAttribute('data-text');
            copyToClipboard(textToCopy, btn);
        }

        // Copy query button (user question)
        if (e.target.closest('.copy-query-btn')) {
            const btn = e.target.closest('.copy-query-btn');
            const textToCopy = btn.getAttribute('data-text');
            copyToClipboard(textToCopy, btn);
        }

        // Edit button (any question)
        if (e.target.closest('.edit-btn')) {
            const btn = e.target.closest('.edit-btn');
            const textToEdit = btn.getAttribute('data-text');

            if (textToEdit) {
                searchInput.value = textToEdit;
                searchInput.focus();

                // Find index in history (reverse search)
                let foundIndex = -1;
                for (let i = conversationHistory.length - 1; i >= 0; i--) {
                    if (conversationHistory[i].role === 'user' && conversationHistory[i].content === textToEdit) {
                        foundIndex = i;
                        break;
                    }
                }

                // If found, preserve history UP TO that message (exclusive)
                if (foundIndex !== -1) {
                    conversationHistory = conversationHistory.slice(0, foundIndex);
                }

                // UI Removal
                const queryDisplay = btn.closest('.query-display');
                if (queryDisplay) {
                    // Remove everything after this element
                    let next = queryDisplay.nextElementSibling;
                    while (next) {
                        const toRemove = next;
                        next = next.nextElementSibling;
                        toRemove.remove();
                    }
                    // Remove the element itself
                    queryDisplay.remove();
                }
            }
        }

        // Chat title edit button
        if (e.target.closest('.chat-edit-btn')) {
            e.stopPropagation();
            const btn = e.target.closest('.chat-edit-btn');
            const chatId = btn.getAttribute('data-chat-id');
            editChatTitle(chatId);
        }

        // Chat delete button
        if (e.target.closest('.chat-delete-btn')) {
            e.stopPropagation();
            const btn = e.target.closest('.chat-delete-btn');
            const chatId = btn.getAttribute('data-chat-id');
            deleteChat(chatId);
        }

        // WhatsApp share button
        if (e.target.closest('.whatsapp-share-btn')) {
            const btn = e.target.closest('.whatsapp-share-btn');
            const query = btn.getAttribute('data-query');
            const response = btn.getAttribute('data-response');
            shareToWhatsApp(query, response);
        }

        // Like button
        if (e.target.closest('.like-btn')) {
            const btn = e.target.closest('.like-btn');
            const query = btn.getAttribute('data-query');
            const response = btn.getAttribute('data-response');
            handleLike(query, response);
            btn.classList.add('active');
        }

        // Dislike button
        if (e.target.closest('.dislike-btn')) {
            const btn = e.target.closest('.dislike-btn');
            const query = btn.getAttribute('data-query');
            const response = btn.getAttribute('data-response');
            handleDislike(query, response);
            btn.classList.add('active');
        }

        // Regenerate button
        if (e.target.closest('.regenerate-btn')) {
            const btn = e.target.closest('.regenerate-btn');
            const query = btn.getAttribute('data-query');
            handleRegenerate(query);
        }

        // Report button
        if (e.target.closest('.report-btn')) {
            const btn = e.target.closest('.report-btn');
            const query = btn.getAttribute('data-query');
            const response = btn.getAttribute('data-response');
            handleReport(query, response);
            btn.classList.add('active');
        }
    }

    /**
     * Share to WhatsApp with formatted message
     */
    function shareToWhatsApp(query, response) {
        const message = `*📿 Fetva AI - Dini Soru*

*Soru:* ${query}

*Cevap:*
${response}

---
_Bu yanıt Fetva AI uygulamasından alınmıştır. Kesin hükümler için müftülüklere danışınız._
🔗 fetva-ai.vercel.app`;

        const encodedMessage = encodeURIComponent(message);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');
    }

    /**
     * Share full conversation to WhatsApp
     */
    function shareFullConversation() {
        // Get all Q&A pairs from the results area
        const queries = document.querySelectorAll('.query-bubble');
        const responses = document.querySelectorAll('.ai-response-card .response-content');

        if (queries.length === 0) {
            showToast('Paylaşılacak sohbet bulunamadı');
            return;
        }

        let conversationText = `*📿 Fetva AI - Sohbet Geçmişi*\n`;
        conversationText += `_${new Date().toLocaleDateString('tr-TR')}_\n\n`;
        conversationText += `═══════════════════\n\n`;

        queries.forEach((query, index) => {
            // Get query text (remove button icons)
            const queryText = query.textContent.trim().replace(/\s+/g, ' ');

            // Get response text
            const responseEl = responses[index];
            const responseText = responseEl ? responseEl.textContent.trim() : '';

            conversationText += `*${index + 1}. Soru:*\n${queryText}\n\n`;
            conversationText += `*Cevap:*\n${responseText}\n\n`;
            conversationText += `───────────────────\n\n`;
        });

        conversationText += `_Bu sohbet Fetva AI uygulamasından paylaşılmıştır._\n`;
        conversationText += `_Kesin hükümler için müftülüklere danışınız._\n`;
        conversationText += `🔗 fetva-ai.vercel.app`;

        const encodedMessage = encodeURIComponent(conversationText);
        const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
        window.open(whatsappUrl, '_blank');

        showToast('Sohbet WhatsApp\'a aktarılıyor...');
    }

    /**
     * Handle like button click
     */
    function handleLike(query, response) {
        showToast('Teşekkürler! Geri bildiriminiz kaydedildi 👍');
        saveFeedback('like', query, response);
    }

    /**
     * Handle dislike button click - saves error report
     */
    function handleDislike(query, response) {
        showToast('Geri bildiriminiz kaydedildi. İyileştirmek için çalışacağız 📝');
        saveFeedback('dislike', query, response);
    }

    /**
     * Handle regenerate button click
     */
    async function handleRegenerate(query) {
        searchInput.value = query;
        await performSearch();
    }

    /**
     * Handle report error button click
     */
    function handleReport(query, response) {
        // Show confirmation dialog
        const confirmed = confirm('Bu cevabı hatalı olarak bildirmek istediğinizden emin misiniz?\n\nHata raporu kaydedilecek ve incelenecektir.');

        if (!confirmed) {
            return; // User cancelled
        }

        const report = {
            type: 'error_report',
            query: query,
            response: response,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
        };

        // Save to localStorage for manual review
        const reports = JSON.parse(localStorage.getItem('fetva-error-reports') || '[]');
        reports.push(report);
        localStorage.setItem('fetva-error-reports', JSON.stringify(reports));

        showToast('Hata raporu kaydedildi. Teşekkürler! ⚠️');
        console.log('Error Report:', report);
    }

    /**
     * Save feedback to localStorage (can be sent to server later)
     */
    function saveFeedback(type, query, response) {
        const feedback = {
            type: type,
            query: query,
            response: response,
            timestamp: new Date().toISOString()
        };

        const feedbacks = JSON.parse(localStorage.getItem('fetva-feedbacks') || '[]');
        feedbacks.push(feedback);
        localStorage.setItem('fetva-feedbacks', JSON.stringify(feedbacks));

        console.log('Feedback saved:', feedback);
    }

    /**
     * Show toast notification
     */
    function showToast(message) {
        const existing = document.querySelector('.toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = 'toast-notification';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 10);
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Copy to clipboard
     */
    async function copyToClipboard(text, btn) {
        try {
            await navigator.clipboard.writeText(text);
            const originalHTML = btn.innerHTML;
            btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
            btn.classList.add('copied');
            setTimeout(() => {
                btn.innerHTML = originalHTML;
                btn.classList.remove('copied');
            }, 2000);
        } catch (err) {
            console.error('Kopyalama hatası:', err);
        }
    }

    /**
     * Main search function
     */
    async function performSearch() {
        const query = searchInput.value.trim();
        if (!query) {
            searchInput.focus();
            return;
        }

        // Gratitude/Thank you detection - respond without searching sources
        const gratitudePatterns = [
            /^(teşekkür|teşekkürler|sağol|sağ ol|eyvallah|eyv)/i,
            /^(allah razı olsun|rabbim razı olsun|hayırlı günler)/i,
            /^(teşekkür ederim|teşekkür ederiz|çok teşekkürler)/i,
            /^(iyi günler|iyi akşamlar|kolay gelsin)/i,
            /^(allah'a emanet|haydi hoşçakal)/i
        ];

        const isGratitude = gratitudePatterns.some(pattern => pattern.test(query));

        if (isGratitude) {
            // Get a friendly response without searching sources
            const gratitudeResponses = [
                "Rica ederim! Başka sorunuz olursa her zaman buradayim 🤗",
                "Ne demek, yardımcı olabildiysem ne mutlu bana! Allah'a emanet olun 🙏",
                "Rica ederim, hayırlı günler dilerim! 🌙",
                "Estafurullah, danışmak istediğiniz başka bir konu olursa beklerim ✌️",
                "Ben teşekkür ederim! Sorularınız için kapım her zaman açık 📚"
            ];
            const randomResponse = gratitudeResponses[Math.floor(Math.random() * gratitudeResponses.length)];

            // Clear input and show response
            searchInput.value = '';
            welcomeSection.style.display = 'none';
            displayAIResponse(query, randomResponse, [], true);

            // Add to conversation history
            conversationHistory.push(
                { role: 'user', content: query },
                { role: 'assistant', content: randomResponse }
            );
            return;
        }

        // Check query limit for non-logged-in users
        if (!currentUser) {
            if (queryCount >= MAX_FREE_QUERIES) {
                if (confirm(`${MAX_FREE_QUERIES} ücretsiz sorgunuzu kullandınız. Devam etmek için giriş yapın.`)) {
                    window.location.href = 'login.html';
                }
                return;
            }
            queryCount++;
            localStorage.setItem('fetva-query-count', queryCount.toString());
            updateUserUI(null); // Update remaining count display
        }

        // Store for edit feature
        lastQuery = query;
        canEditLastQuery = true;

        // Clear input after sending
        searchInput.value = '';

        // Hide welcome, show loading
        welcomeSection.style.display = 'none';
        showLoading();

        try {
            const relevantResults = searchLocal(query);

            if (relevantResults.length === 0) {
                displayNoResults(query);
                return;
            }

            const aiResponse = await getAIResponse(query, relevantResults);
            displayAIResponse(query, aiResponse, relevantResults);

            // Store for follow-up
            lastSources = relevantResults;
            conversationHistory.push(
                { role: 'user', content: query },
                { role: 'assistant', content: aiResponse }
            );
            // Keep only last 4 exchanges (8 messages) for context
            if (conversationHistory.length > 8) {
                conversationHistory = conversationHistory.slice(-8);
            }

            // Save to Firestore if user is logged in
            if (currentUser && typeof db !== 'undefined') {
                await saveMessageToFirestore(query, aiResponse, relevantResults);
            }

        } catch (error) {
            console.error('Hata:', error);
            showError(`Hata: ${error.message}`);
        }
    }

    /**
     * Turkish religious term synonyms for flexible matching
     */
    const SYNONYMS = {
        // Abdest & Temizlik
        'abdest': ['abdest', 'wudu', 'temizlik', 'taharet', 'hadesten'],
        'gusül': ['gusül', 'boy abdesti', 'cünüp', 'cünüplük', 'gusl'],
        'teyemmüm': ['teyemmüm', 'toprakla abdest', 'su yokken'],

        // Namaz
        'namaz': ['namaz', 'salat', 'ibaret', 'kılmak', 'farz', 'sünnet'],
        'kıble': ['kıble', 'kabe yönü', 'yön', 'semt'],
        'secde': ['secde', 'sehiv', 'tilavet', 'şükür secdesi'],
        'rükü': ['rükü', 'rüku', 'eğilmek'],

        // Oruç
        'oruç': ['oruç', 'savm', 'iftar', 'sahur', 'ramazan'],
        'iftar': ['iftar', 'oruç açmak', 'yemek'],

        // Temizlik durumları
        'ıslak': ['ıslak', 'ıslaklık', 'yaş', 'nemli', 'akıntı', 'sızıntı'],
        'idrar': ['idrar', 'bevl', 'sidik', 'istibra', 'istinca'],
        'istibra': ['istibra', 'idrar damlaması', 'damlama', 'temizlik'],
        'kan': ['kan', 'kanama', 'hayız', 'adet', 'nifas', 'lohusa'],
        'necaset': ['necaset', 'pislik', 'kirlilik', 'necis'],

        // Kadın hali
        'adet': ['adet', 'hayız', 'regl', 'ay hali', 'özel gün', 'kadın hali'],
        'lohusa': ['lohusa', 'nifas', 'doğum sonrası'],

        // Diğer
        'haram': ['haram', 'günah', 'yasak', 'caiz değil'],
        'helal': ['helal', 'caiz', 'müstehap', 'mübah', 'uygun'],
        'mekruh': ['mekruh', 'hoş görülmez', 'tercih edilmez'],
        'farz': ['farz', 'vacip', 'zorunlu', 'gerekli'],
        'sünnet': ['sünnet', 'müstehap', 'tavsiye edilen'],

        // Genel sorular
        'bozulur': ['bozulur', 'bozar', 'geçerli', 'sahih', 'kabul'],
        'geçerli': ['geçerli', 'sahih', 'makbul', 'kabul', 'olur'],
        'yapılır': ['yapılır', 'nasıl', 'ne zaman', 'şekli', 'usul'],
        'unutmak': ['unutmak', 'unuttum', 'hatırlamak', 'yanlışlıkla'],

        // İç çamaşır / kıyafet
        'iç çamaşır': ['iç çamaşır', 'don', 'külot', 'elbise', 'kıyafet'],
        'elbise': ['elbise', 'kıyafet', 'giysi', 'örtü']
    };

    /**
     * Expand query with synonyms
     */
    function expandQueryWithSynonyms(query) {
        let expandedWords = new Set();
        const queryLower = query.toLowerCase();
        const words = queryLower.split(/\s+/).filter(w => w.length > 1);

        // Add original words
        words.forEach(word => expandedWords.add(word));

        // Add synonyms
        for (const [key, synonymList] of Object.entries(SYNONYMS)) {
            // Check if any synonym matches
            const hasMatch = synonymList.some(syn =>
                queryLower.includes(syn) || syn.includes(queryLower.split(/\s+/).find(w => w.length > 3) || '')
            );

            if (hasMatch) {
                synonymList.forEach(syn => {
                    syn.split(/\s+/).forEach(s => expandedWords.add(s));
                });
            }

            // Also check individual words
            words.forEach(word => {
                if (synonymList.some(syn => syn.includes(word) || word.includes(syn.substring(0, 3)))) {
                    synonymList.forEach(syn => {
                        syn.split(/\s+/).forEach(s => expandedWords.add(s));
                    });
                }
            });
        }

        return Array.from(expandedWords);
    }

    /**
     * Source Priority Weights - Ağırlıklı Arama için Kaynak Puanları
     */
    const SOURCE_WEIGHTS = {
        'fetva': 25,           // Diyanet Fetva Kitabı - EN GÜVENİLİR (Soru-Cevap)
        'bilmen': 20,          // Ömer Nasuhi Bilmen - Kapsamlı İlmihal
        'büyük islam': 20,     // Büyük İslam İlmihali
        'ilmihal': 10,         // TDV İlmihalleri
        'hadis': 5             // Hadisler (Destekleyici)
    };

    /**
     * Get source priority bonus - Kaynak ağırlığını hesapla
     */
    function getSourceBonus(sourceName) {
        if (!sourceName) return 0;
        const sourceLower = sourceName.toLowerCase();

        for (const [key, bonus] of Object.entries(SOURCE_WEIGHTS)) {
            if (sourceLower.includes(key)) {
                return bonus;
            }
        }
        return 0;
    }

    /**
     * Local search with synonym expansion and source priority
     */
    function searchLocal(query) {
        if (!fetvaData.length) return [];

        const queryLower = query.toLowerCase();
        const expandedWords = expandQueryWithSynonyms(query);
        const originalWords = queryLower.split(/\s+/).filter(w => w.length > 1);

        console.log('🔍 Arama:', query);
        console.log('📚 Genişletilmiş kelimeler:', expandedWords);

        const scoredResults = fetvaData.map((item, index) => {
            const text = typeof item === 'string' ? item : item.text;
            const source = typeof item === 'string' ? 'Diyanet Fetva Kitabı 2018' : item.source;

            const textLower = text.toLowerCase();
            let keywordScore = 0;
            let matchCount = 0;

            // Exact phrase match (highest score)
            if (textLower.includes(queryLower)) keywordScore += 100;

            // Original word matches
            originalWords.forEach(word => {
                if (word.length > 2 && textLower.includes(word)) {
                    keywordScore += 15;
                    matchCount++;
                }
            });

            // Expanded synonym matches
            expandedWords.forEach(word => {
                if (word.length > 2 && textLower.includes(word)) {
                    keywordScore += 8;
                }
            });

            // Bonus for matching all original words
            if (matchCount === originalWords.length && originalWords.length > 1) keywordScore += 30;

            // Prefer medium-length content
            if (text.length > 80 && text.length < 1000 && keywordScore > 0) keywordScore += 5;

            // Penalize very short or TOC entries
            if (text.length < 50) keywordScore -= 20;
            if (text.includes('...') && text.match(/\d{2,3}$/)) keywordScore = 0;

            // Add source priority bonus
            const sourceBonus = getSourceBonus(source);
            const finalScore = keywordScore + (keywordScore > 0 ? sourceBonus : 0);

            return { text, source, score: finalScore, keywordScore, sourceBonus, index };
        });

        const results = scoredResults
            .filter(item => item.score > 10)
            .sort((a, b) => b.score - a.score)
            .slice(0, 8); // En iyi 8 sonuç (AI kafası karışmasın)

        console.log('📊 Bulunan sonuç:', results.length);
        if (results.length > 0) {
            console.log('🏆 En iyi sonuç:', results[0].source, '- Puan:', results[0].score, '(Kaynak bonusu:', results[0].sourceBonus + ')');
        }
        return results;
    }

    /**
     * Get AI response with conversation history
     */
    async function getAIResponse(userQuery, relevantResults) {
        // CRITICAL topics - require VERY detailed answers (istibra, istinca etc.)
        const criticalTopics = ['istibra', 'istinca', 'idrar', 'bevl', 'necaset', 'pislik',
            'abdest bozulma', 'abdest bozulur', 'sızıntı', 'akıntı', 'mezi', 'vedi'];

        // Sensitive topics that require detailed answers
        const sensitiveTopics = ['miras', 'veraset', 'hayız', 'adet', 'lohusa', 'nifas',
            'cenabet', 'gusül', 'cünüp', 'talak', 'boşanma', 'iddet', 'nafaka', 'mehir', 'nikah',
            'zina', 'had', 'kefaret', 'yemin', 'cenaze', 'defin', 'techiz', 'secde', 'rüku'];

        const queryLower = userQuery.toLowerCase();
        const isCriticalTopic = criticalTopics.some(topic => queryLower.includes(topic));
        const isSensitiveTopic = isCriticalTopic || sensitiveTopics.some(topic => queryLower.includes(topic));

        let systemPrompt = `Sen 'Fetva AI' isimli, fıkıh ve İslam hukuku konusunda uzmanlaşmış bir yapay zeka asistanısın.

MUTLAK KURALLAR:

1. ${isCriticalTopic ? `Bu KRİTİK bir konu (istibra/istinca). AŞAĞIDAKİ FORMATTA UZUN ve YAPILANDIRILMIŞ cevap ver:

### İSTİNCA (İstincâ) Nedir?
**Tanımı:** Sözlükte "bir şeyden kurtulmaya çalışmak" demektir. Terim olarak, tuvalet ihtiyacını giderdikten sonra dışkı ve idrar kalıntısını su ile veya taş/kağıt ile temizlemektir.

**Hükmü (Mezheplere göre):**
- Hanefi: Sünnettir (müekked)
- Şafii, Maliki, Hanbeli: Vaciptir (farzdır)

**Nasıl Yapılır:**
1. Su ile yıkamak (en faziletli yol)
2. Sol el kullanılır, sağ el kullanılmaz
3. Su yoksa en az 3 kez temiz madde ile silmek
4. İz kalmayacak şekilde temizlemek

---

### İSTİBRA Nedir?
**Tanımı:** Sözlükte "kurtulmak, uzaklaşmak" demektir. Terim olarak, küçük abdest sonrası idrar yolunda kalan damlaların tamamen kesilmesini beklemektir.

**Hükmü (Mezheplere göre):**
- Hanefi: Vaciptir (yapılmazsa kerahetle namaz olur)
- Şafii, Hanbeli: Müstehaptır

**Nasıl Yapılır (bünyeye göre değişir):**
- Bir süre beklemek
- Hafifçe yürümek veya öksürmek
- Ayakta birkaç adım atmak
- Kişi kendi bünyesini bilir

**Kimler İçin:**
- Erkekler için gereklidir
- Kadınlar için gerekmez, bir süre beklemeleri yeterlidir

---

### ÖNEMLİ UYARILAR:
- Vesvese ve aşırı şüphecilikten kesinlikle kaçının
- Kanaat hasıl olunca yeterlidir
- Şüpheye değil, kanaate itibar edilir` :
                (isSensitiveTopic ? 'Bu HASSAS bir konu. DETAYLI ve KAPSAMLI cevap ver. Madde madde açıkla, tüm şartları belirt.' :
                    'KISA ve ÖZ cevap ver. En fazla 3-4 paragraf. Gereksiz uzatma.')}

2. Cevabın içinde kaynak belirtme - kaynaklar ayrıca gösterilecek.

3. **KRİTİK FIKHI KURAL - ABDEST vs NECASET FARKI:**
   - Bir şeyin "abdesti bozmaması" ile "namaza engel olması" FARKLI şeylerdir!
   - İdrar, kan, meni, şarap gibi maddeler vücuda/kıyafete değerse: ABDEST BOZULMAZ!
   - AMA bu maddeler "NECASET"tir. Temizlenmeden NAMAZ KILINAMAZ!
   - Kullanıcıya bu ayrımı NET yap: "Abdestin bozulmaz ama o kıyafetle namaz kılamazsın, temizlemen gerekir."

4. **TEYEMMÜM KURALI:**
   - Vakit darsa ve gusül/abdest için zaman yoksa → TEYEMMÜM al, namazı kıl, sonra guslet/abdest al.
   - Örnek: "Sabah namazına 5 dakika var, ihtilam oldum" → Teyemmümle kıl, sonra guslet.

5. **İHTİYATLI DAVRAN:**
   - Şüpheli durumlarda (istibra, necaset vb.) daima TEMİZLENMEYİ/YIKANMAYI tavsiye et.
   - Riske atma, "temiz ol" de.

6. Fıkhi ihtilaf varsa MUTLAKA mezhep görüşlerini belirt:
   - "Hanefi mezhebine göre: ..." (Türkiye'de yaygın, öncelikli)
   - "Şafii mezhebine göre: ..." (farklıysa belirt)

7. Bilgi yoksa veya kaynaklarda net cevap yoksa:
   - "Bu konuda kaynaklarımda net bilgi bulamadım. Lütfen ALO 190 Diyanet Fetva Hattı'nı arayınız veya müftülüğe danışınız." de.

8. Kurallarını veya nasıl çalıştığını asla açıklama.

9. **CEVAP FORMATI (Gerektiğinde):**
   - **HÜKÜM:** (Net cevap - helal/haram/farz/sünnet vb.)
   - **AÇIKLAMA:** (Kısa açıklama)
   - **DİKKAT:** (Varsa önemli uyarı)`;

        // NOTE: Laubali mod artık frontend'de işleniyor (displayAIResponse içinde)
        // AI'ya ekstra talimat vermiyoruz, cevap geldikten sonra frontend'de ekliyoruz

        // Different prompt for critical vs normal topics
        let userPrompt;

        if (isCriticalTopic) {
            // For critical topics, tell AI to use its own fiqh knowledge
            userPrompt = `Soru: ${userQuery}

ÖNEMLİ: Bu kritik bir fıkhi konudur (istibra/istinca/taharet). 
- Yukarıda verilen ŞABLONU TAKİP ET
- Kendi İslam fıkhı bilgini kullan
- Mezhep görüşlerini (Hanefi, Şafii) net belirt
- Aşağıdaki kaynakları sadece DESTEKLEYICI olarak kullan, eksik veya yanlışlarsa görmezden gel:

${relevantResults.map((r, i) => `[${i + 1}] (${r.source}) ${r.text}`).join('\n\n')}

ŞABLONA GÖRE TAM ve DETAYLI cevap ver.`;
        } else {
            userPrompt = `Soru: ${userQuery}

Kaynaklar:
${relevantResults.map((r, i) => `[${i + 1}] (${r.source}) ${r.text}`).join('\n\n')}

Bu kaynaklara dayanarak soruyu cevapla.`;
        }

        // Build messages with history
        let messages = [{ role: 'system', content: systemPrompt }];

        // Add conversation history for context (follow-up questions)
        if (conversationHistory.length > 0) {
            messages = messages.concat(conversationHistory);
        }

        // Add current query
        messages.push({ role: 'user', content: userPrompt });

        const response = await fetch(API_CONFIG.baseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_CONFIG.apiKey}`
            },
            body: JSON.stringify({
                model: API_CONFIG.model,
                messages: messages,
                temperature: 0.7,
                max_tokens: isCriticalTopic ? 1500 : (isSensitiveTopic ? 1000 : 700)
            })
        });

        if (!response.ok) throw new Error(`API hatası: ${response.status}`);

        const data = await response.json();
        return data.choices[0].message.content;
    }

    /**
     * Display AI response with copy/edit buttons
     * Appends to existing conversation instead of clearing
     */
    function displayAIResponse(query, aiResponse, sources, isFirstMessage = false) {
        // Show share conversation button
        const resultsHeader = document.getElementById('results-header');
        if (resultsHeader) {
            resultsHeader.style.display = 'flex';
        }

        // Only clear on first message of a new conversation
        if (isFirstMessage || resultsArea.querySelector('.typing-indicator')) {
            // Remove loading indicator if present
            const loadingIndicator = resultsArea.querySelector('.typing-indicator');
            if (loadingIndicator) loadingIndicator.remove();
        }

        // Remove edit buttons from ALL previous queries (only last one should be editable)
        document.querySelectorAll('.query-bubble .edit-btn').forEach(btn => {
            btn.remove();
        });

        // User query with copy button (always) and edit button (only for latest)
        const queryDisplay = document.createElement('div');
        queryDisplay.className = 'query-display';
        queryDisplay.innerHTML = `
            <div class="query-bubble">
                ${escapeHtml(query)}
                <button class="query-action-btn copy-query-btn" title="Kopyala" data-text="${escapeHtml(query)}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                </button>
                <button class="query-action-btn edit-btn" title="Düzenle" data-text="${escapeHtml(query)}">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                </button>
            </div>
        `;
        resultsArea.appendChild(queryDisplay);

        // AI Response with copy button
        const responseCard = document.createElement('div');
        responseCard.className = 'ai-response-card';

        // Group sources by type
        const sourceGroups = {};
        sources.forEach(s => {
            if (!sourceGroups[s.source]) sourceGroups[s.source] = [];
            sourceGroups[s.source].push(s.text);
        });

        responseCard.innerHTML = `
            <div class="ai-response-header">
                <div class="ai-avatar">
                    <img src="Resimler/logo_fetva-ai.png" alt="Fetva AI" class="ai-avatar-img">
                </div>
                <span class="ai-name">Fetva AI</span>
                <button class="copy-btn" data-text="${escapeHtml(aiResponse)}" title="Kopyala">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                </button>
            </div>
            <div class="ai-response-content">${formatResponse(funnyMode ? addLaubaliComment(aiResponse) : aiResponse)}</div>`;

        // Check for Hadith content
        const hadithSource = sources.find(s => s.source.includes('Hadislerle İslam'));
        if (hadithSource) {
            responseCard.innerHTML += `
                <div class="hadith-card">
                    <div class="hadith-header">
                        <span class="hadith-icon">ﷺ</span>
                        <span class="hadith-title">Hadis-i Şerif & Sünnet</span>
                    </div>
                    <div class="hadith-content">
                        "${truncateText(hadithSource.text, 500)}"
                    </div>
                </div>
            `;
        }

        responseCard.innerHTML += `
            <div class="ai-response-sources">
                <div class="sources-header collapsed" onclick="this.classList.toggle('collapsed'); this.nextElementSibling.classList.toggle('collapsed');">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M19 9l-7 7-7-7" />
                    </svg>
                    <span>Kaynaklar</span>
                </div>
                <div class="sources-list collapsed">
                    ${Object.entries(sourceGroups).map(([source, texts]) => `
                        <div class="source-group">
                            <div class="source-group-title">${escapeHtml(source)}</div>
                            ${texts.slice(0, 2).map(t => `
                                <div class="source-item">
                                    <span class="source-text">${truncateText(t, 120)}</span>
                                </div>
                            `).join('')}
                        </div>
                    `).join('')}
                </div>
            </div>
            <div class="response-actions">
                <button class="feedback-btn like-btn" data-query="${escapeHtml(query)}" data-response="${escapeHtml(aiResponse)}" title="Faydalı">
                    <img src="Resimler/begenme_icon.png" alt="Faydalı" class="feedback-icon">
                </button>
                <button class="feedback-btn dislike-btn" data-query="${escapeHtml(query)}" data-response="${escapeHtml(aiResponse)}" title="Hatalı/Yetersiz">
                    <img src="Resimler/begenmeme_icon.png" alt="Hatalı" class="feedback-icon">
                </button>
                <button class="feedback-btn regenerate-btn" data-query="${escapeHtml(query)}" title="Yeniden Oluştur">
                    <img src="Resimler/refresh.png" alt="Yeniden Oluştur" class="feedback-icon">
                </button>
                <button class="feedback-btn report-btn" data-query="${escapeHtml(query)}" data-response="${escapeHtml(aiResponse)}" title="Hata Bildir">
                    <img src="Resimler/hata_icon.png" alt="Hata Bildir" class="feedback-icon">
                </button>
                <button class="feedback-btn whatsapp-share-btn" data-query="${escapeHtml(query)}" data-response="${escapeHtml(aiResponse)}" title="WhatsApp ile Paylaş">
                    <img src="Resimler/whatsapp icon.png" alt="WhatsApp" class="whatsapp-icon">
                </button>
            </div>
        `;
        resultsArea.appendChild(responseCard);

        // Auto-scroll to bottom smoothly
        setTimeout(() => {
            responseCard.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
    }

    /**
     * Start a new conversation - clears results and resets state
     */
    function startNewConversation() {
        // Clear the results area
        resultsArea.innerHTML = '';

        // Hide share conversation button
        const resultsHeader = document.getElementById('results-header');
        if (resultsHeader) {
            resultsHeader.style.display = 'none';
        }

        // Show welcome section
        welcomeSection.style.display = 'flex';

        // Clear conversation history
        conversationHistory = [];
        lastSources = [];
        lastQuery = '';
        canEditLastQuery = false;

        // Clear search input
        searchInput.value = '';

        // Reset current chat ID
        currentChatId = null;

        // Focus search input
        searchInput.focus();

        console.log('✨ Yeni sohbet başlatıldı');
    }

    /**
     * Add Laubali (funny) comment to AI response - Frontend-based
     */
    function addLaubaliComment(text) {
        const randomSoz = FUNNY_ENDINGS[Math.floor(Math.random() * FUNNY_ENDINGS.length)];
        return text + `\n\n---\n*🎭 Goca Oğlan'ın Notu:* ${randomSoz}`;
    }

    /**
     * Format AI response
     */
    function formatResponse(text) {
        let formatted = escapeHtml(text);
        formatted = formatted.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        formatted = formatted.split('\n\n').map(p => `<p>${p}</p>`).join('');
        formatted = formatted.replace(/\n/g, '<br>');
        formatted = formatted.replace(/(\d+)\.\s/g, '<span class="list-number">$1.</span> ');
        return formatted;
    }

    function truncateText(text, maxLength) {
        if (text.length <= maxLength) return escapeHtml(text);
        return escapeHtml(text.substring(0, maxLength)) + '...';
    }

    function showLoading() {
        // Remove any existing loading indicator
        const existingLoader = resultsArea.querySelector('.typing-indicator');
        if (existingLoader) existingLoader.remove();

        // Append loading indicator (don't clear existing messages)
        const loader = document.createElement('div');
        loader.className = 'typing-indicator';
        loader.innerHTML = `
            <div class="dot"></div>
            <div class="dot"></div>
            <div class="dot"></div>
        `;
        resultsArea.appendChild(loader);
    }

    /**
     * Check if user has reached query limit
     */
    function checkQueryLimit() {
        if (!currentUser && queryCount >= MAX_FREE_QUERIES) {
            if (confirm(`${MAX_FREE_QUERIES} ücretsiz sorgunuzu kullandınız. Devam etmek için giriş yapın.`)) {
                window.location.href = 'login.html';
            }
        }
    }

    /**
     * Load chat list from Firestore using dbService
     */
    async function loadChatList() {
        if (!currentUser) return;

        // Check if dbService is available
        if (typeof window.dbService === 'undefined') {
            console.warn('dbService not loaded, skipping chat list');
            return;
        }

        const chatListContainer = document.getElementById('chat-list');
        const emptyState = document.getElementById('chat-list-empty');
        if (!chatListContainer) return;

        // Show loading state
        chatListContainer.innerHTML = '<div class="chat-list-loading"></div>';

        try {
            // Use dbService to get chats
            chats = await window.dbService.getUserChats(currentUser.uid);

            // Clear container
            chatListContainer.innerHTML = '';

            // Show empty state if no chats
            if (chats.length === 0) {
                chatListContainer.innerHTML = `
                    <div class="chat-list-empty">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                        </svg>
                        <span>Henüz sohbet yok</span>
                    </div>
                `;
                return;
            }

            // Group chats by date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const lastWeek = new Date(today);
            lastWeek.setDate(lastWeek.getDate() - 7);

            let currentLabel = '';

            chats.forEach(chat => {
                // Determine date label
                const chatDate = chat.updatedAt?.toDate ? chat.updatedAt.toDate() : new Date(chat.updatedAt || Date.now());
                let label = '';
                if (chatDate >= today) {
                    label = 'BUGÜN';
                } else if (chatDate >= yesterday) {
                    label = 'DÜN';
                } else if (chatDate >= lastWeek) {
                    label = 'BU HAFTA';
                } else {
                    label = 'ESKİ';
                }

                // Add date label if changed
                if (label !== currentLabel) {
                    currentLabel = label;
                    const labelEl = document.createElement('div');
                    labelEl.className = 'chat-list-label';
                    labelEl.textContent = label;
                    chatListContainer.appendChild(labelEl);
                }

                const chatItem = document.createElement('div');
                chatItem.className = 'chat-item';
                chatItem.setAttribute('data-chat-id', chat.id);
                if (chat.id === currentChatId) chatItem.classList.add('active');

                const date = chatDate.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
                const preview = chat.preview || '';

                chatItem.innerHTML = `
                    <div class="chat-item-content">
                        <div class="chat-item-header">
                            <span class="chat-title">${escapeHtml(chat.title || 'Yeni Sohbet')}</span>
                            <span class="chat-date">${date}</span>
                        </div>
                        <div class="chat-summary">${escapeHtml(preview.substring(0, 60))}</div>
                    </div>
                    <div class="chat-actions">
                        <button class="chat-action-btn edit-btn chat-edit-btn" data-chat-id="${chat.id}" title="Düzenle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="chat-action-btn delete-btn chat-delete-btn" data-chat-id="${chat.id}" title="Sil">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                        </button>
                    </div>
                `;
                chatItem.onclick = (e) => {
                    if (!e.target.closest('.chat-actions')) {
                        switchChat(chat.id);
                    }
                };
                chatListContainer.appendChild(chatItem);
            });

        } catch (e) {
            console.error('Chat list load error:', e);
            chatListContainer.innerHTML = `
                <div class="chat-list-empty">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                    </svg>
                    <span>Sohbetler yüklenemedi</span>
                </div>
            `;
        }
    }

    /**
     * Edit chat title using dbService
     */
    async function editChatTitle(chatId) {
        if (!currentUser || typeof window.dbService === 'undefined') return;

        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;

        const newTitle = prompt('Sohbet başlığını düzenle:', chat.title || 'Yeni Sohbet');
        if (newTitle === null || newTitle.trim() === '') return;

        try {
            await window.dbService.updateChatTitle(currentUser.uid, chatId, newTitle.trim());
            showToast('Başlık güncellendi ✓');
            await loadChatList();
        } catch (e) {
            console.error('Edit chat title error:', e);
            alert('Başlık güncellenemedi.');
        }
    }

    /**
     * Delete chat using dbService
     */
    async function deleteChat(chatId) {
        if (!currentUser || typeof window.dbService === 'undefined') return;
        if (!confirm('Bu sohbeti silmek istediğinize emin misiniz?')) return;

        try {
            await window.dbService.deleteChat(currentUser.uid, chatId);
            showToast('Sohbet silindi ✓');

            // If deleted chat was current, start new conversation
            if (chatId === currentChatId) {
                startNewConversation();
            } else {
                await loadChatList();
            }
        } catch (e) {
            console.error('Delete chat error:', e);
            alert('Sohbet silinemedi.');
        }
    }

    /**
     * Create a new chat is now handled by dbService.startNewChat
     * This function is kept for backwards compatibility
     */
    async function createNewChat(firstMessage = '') {
        if (!currentUser || typeof window.dbService === 'undefined') return null;

        try {
            const chatId = await window.dbService.startNewChat(currentUser.uid, firstMessage || 'Yeni Sohbet');
            currentChatId = chatId;
            await loadChatList();
            return chatId;
        } catch (e) {
            console.error('Create chat error:', e);
            return null;
        }
    }

    /**
     * Switch to a different chat
     */
    async function switchChat(chatId) {
        currentChatId = chatId;
        conversationHistory = [];
        lastSources = [];
        resultsArea.innerHTML = '';
        welcomeSection.style.display = 'none';

        // Load messages for this chat
        await loadChatMessages(chatId);

        // Update active state in sidebar
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
            if (item.getAttribute('data-chat-id') === chatId) {
                item.classList.add('active');
            }
        });

        // Close sidebar on mobile
        const sidebar = document.getElementById('sidebar');
        const sidebarToggle = document.getElementById('sidebar-toggle');
        if (sidebar && window.innerWidth < 768) {
            sidebar.classList.add('collapsed');
            if (sidebarToggle) sidebarToggle.classList.remove('active');
        }
    }

    /**
     * Load messages for a chat using dbService
     */
    async function loadChatMessages(chatId) {
        if (!currentUser || typeof window.dbService === 'undefined') return;

        try {
            const messages = await window.dbService.getChatMessages(currentUser.uid, chatId);

            messages.forEach(msg => {
                if (msg.role === 'user') {
                    // Display user query with edit button
                    const queryDisplay = document.createElement('div');
                    queryDisplay.className = 'query-display';
                    queryDisplay.innerHTML = `
                        <div class="query-bubble">
                            ${escapeHtml(msg.content)}
                            <button class="edit-btn" data-text="${escapeHtml(msg.content)}" title="Düzenle">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                                </svg>
                            </button>
                        </div>
                    `;
                    resultsArea.appendChild(queryDisplay);

                    // Add to conversation history
                    conversationHistory.push({ role: 'user', content: msg.content });

                } else if (msg.role === 'assistant') {
                    // Display AI response
                    const responseCard = document.createElement('div');
                    responseCard.className = 'ai-response-card';
                    responseCard.innerHTML = `
                        <div class="ai-response-header">
                            <div class="ai-avatar">
                                <img src="Resimler/logo_fetva-ai.png" alt="Fetva AI" class="ai-avatar-img">
                            </div>
                            <span class="ai-name">Fetva AI</span>
                            <button class="copy-btn" data-text="${escapeHtml(msg.content)}" title="Kopyala">
                                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                                </svg>
                            </button>
                        </div>
                        <div class="ai-response-content">${formatResponse(msg.content)}</div>
                    `;
                    resultsArea.appendChild(responseCard);

                    // Add to conversation history
                    conversationHistory.push({ role: 'assistant', content: msg.content });
                }
            });

            // Keep only last 8 messages for context
            if (conversationHistory.length > 8) {
                conversationHistory = conversationHistory.slice(-8);
            }
        } catch (e) {
            console.error('Load messages error:', e);
            showToast('Mesajlar yüklenemedi');
        }
    }

    /**
     * Save message to Firestore using dbService
     */
    async function saveMessageToFirestore(userQuery, aiResponse, sources) {
        if (!currentUser || typeof window.dbService === 'undefined') return;

        try {
            // Create new chat if none exists
            if (!currentChatId) {
                currentChatId = await window.dbService.startNewChat(currentUser.uid, userQuery);
            }

            // Save user message
            await window.dbService.saveMessage(
                currentUser.uid,
                currentChatId,
                'user',
                userQuery
            );

            // Save assistant message with sources
            const sourcesData = sources.map(s => ({ text: s.text?.substring(0, 200), source: s.source }));
            await window.dbService.saveMessage(
                currentUser.uid,
                currentChatId,
                'assistant',
                aiResponse,
                sourcesData
            );

            // Reload chat list to update UI
            await loadChatList();

        } catch (e) {
            console.error('Save message error:', e);
            // Don't show error to user - chat history is a nice-to-have
        }
    }

    /**
 * Generate chat title from messages - creates a meaningful title from the conversation
 */
    async function generateChatTitle(userQuery, aiResponse) {
        // Extract key words from query
        const stopWords = ['mi', 'mu', 'mı', 'mü', 'ne', 'nasıl', 'neden', 'niçin', 'kim', 'hangi', 'kaç', 'bir', 'bu', 'şu', 'o', 've', 'veya', 'ama', 'fakat', 'de', 'da', 'ile', 'için', 'gibi', 'daha', 'en', 'çok', 'az', 'soru', 'cevap'];

        const words = userQuery.toLowerCase()
            .replace(/[?.,!]/g, '')
            .split(/\s+/)
            .filter(w => w.length > 2 && !stopWords.includes(w));

        // Take first 4-5 meaningful words as summary
        const titleWords = words.slice(0, 5);

        if (titleWords.length > 0) {
            let title = titleWords.join(' ');
            // Capitalize first letter
            title = title.charAt(0).toUpperCase() + title.slice(1);
            // Limit length
            if (title.length > 40) {
                title = title.substring(0, 37) + '...';
            }
            return title;
        }

        // Fallback: Use date if no meaningful words found
        const date = new Date();
        const options = { year: 'numeric', month: 'long', day: 'numeric' };
        return `Sohbet - ${date.toLocaleDateString('tr-TR', options)}`;
    }

    /**
     * Show user settings menu
     */
    function showUserMenu() {
        // Remove existing menu if any
        const existingMenu = document.querySelector('.user-menu-overlay');
        if (existingMenu) existingMenu.remove();

        const menu = document.createElement('div');
        menu.className = 'user-menu-overlay';
        menu.innerHTML = `
            <div class="user-menu">
                <div class="user-menu-header">
                    <h3>Ayarlar</h3>
                    <button class="close-menu">×</button>
                </div>
                <div class="user-menu-content">
                    <div class="menu-item">
                        <label class="menu-label">
                            <span>Komik & Laubali Mod</span>
                            <label class="slider-checkbox">
                                <input type="checkbox" id="funny-mode-toggle" ${funnyMode ? 'checked' : ''}>
                                <span class="slider"></span>
                            </label>
                        </label>
                        <p class="menu-description">Cevaplar biraz esprili olsun mu? 😄</p>
                    </div>
                    <div class="menu-item">
                        <button class="logout-btn" id="logout-btn">Çıkış Yap</button>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(menu);

        // Close on overlay click
        menu.addEventListener('click', (e) => {
            if (e.target === menu) {
                menu.remove();
            }
        });

        // Close button
        menu.querySelector('.close-menu').addEventListener('click', () => {
            menu.remove();
        });

        // Funny mode toggle
        const funnyToggle = menu.querySelector('#funny-mode-toggle');
        funnyToggle.addEventListener('change', async () => {
            funnyMode = funnyToggle.checked;
            if (currentUser && typeof db !== 'undefined') {
                try {
                    await db.collection('users').doc(currentUser.uid).set({
                        funnyMode: funnyMode
                    }, { merge: true });
                } catch (e) {
                    console.error('Update funny mode error:', e);
                }
            }
        });

        // Logout button
        menu.querySelector('#logout-btn').addEventListener('click', async () => {
            if (confirm('Çıkış yapmak istiyor musunuz?')) {
                try {
                    await auth.signOut();
                    menu.remove();
                    // Reset state
                    currentChatId = null;
                    conversationHistory = [];
                    lastSources = [];
                    funnyMode = false;
                    resultsArea.innerHTML = '';
                    welcomeSection.style.display = 'flex';
                    clearChatList();
                    updateUserUI(null);
                } catch (e) {
                    console.error('Logout error:', e);
                    alert('Çıkış yapılamadı. Lütfen tekrar deneyin.');
                }
            }
        });
    }

    /**
     * Start a new conversation
     */
    async function startNewConversation() {
        currentChatId = null;
        conversationHistory = [];
        lastSources = [];
        lastQuery = '';
        canEditLastQuery = false;
        resultsArea.innerHTML = '';
        welcomeSection.style.display = 'flex';

        // Update active state in sidebar
        document.querySelectorAll('.chat-item').forEach(item => {
            item.classList.remove('active');
        });
    }

    function displayNoResults(query) {
        // Remove loading indicator
        const loadingIndicator = resultsArea.querySelector('.typing-indicator');
        if (loadingIndicator) loadingIndicator.remove();

        const queryDisplay = document.createElement('div');
        queryDisplay.className = 'query-display';
        queryDisplay.innerHTML = `
            <div class="query-bubble">${escapeHtml(query)}</div>
        `;
        resultsArea.appendChild(queryDisplay);

        const responseCard = document.createElement('div');
        responseCard.className = 'ai-response-card';
        responseCard.innerHTML = `
            <div class="ai-response-header">
                <div class="ai-avatar">
                    <img src="Resimler/logo_fetva-ai.png" alt="Fetva AI" class="ai-avatar-img">
                </div>
                <span class="ai-name">Fetva AI</span>
            </div>
            <div class="ai-response-content">
                <p>Maalesef "<strong>${escapeHtml(query)}</strong>" ile ilgili sonuç bulamadım.</p>
                <p>Farklı kelimelerle tekrar deneyin.</p>
            </div>
        `;
        resultsArea.appendChild(responseCard);
    }

    function showError(message) {
        const loadingIndicator = resultsArea.querySelector('.typing-indicator');
        if (loadingIndicator) loadingIndicator.remove();

        const errorCard = document.createElement('div');
        errorCard.className = 'ai-response-card error-card';
        errorCard.innerHTML = `
            <div class="ai-response-content">
                <p>⚠️ ${escapeHtml(message)}</p>
            </div>
        `;
        resultsArea.appendChild(errorCard);
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
});
