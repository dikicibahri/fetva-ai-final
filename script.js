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

        // Init sidebar toggle state
        const sidebarFunnyToggle = document.getElementById('sidebar-funny-mode');
        if (sidebarFunnyToggle) {
            sidebarFunnyToggle.checked = funnyMode;
        }
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

            // Load Chat History
            loadChatList();
        } else {
            // Logged out
            if (headerLoginBtn) headerLoginBtn.style.display = 'flex';
            if (headerUserProfile) headerUserProfile.style.display = 'none';

            if (sidebarUserInfo) sidebarUserInfo.style.display = 'none';

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
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') performSearch();
        });

        // Auto-capitalize first letter
        searchInput.addEventListener('input', (e) => {
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

        // Sidebar toggle with animation
        const sidebarToggle = document.getElementById('sidebar-toggle');
        const sidebarClose = document.getElementById('sidebar-close');
        const sidebar = document.getElementById('sidebar');

        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', () => {
                sidebar.classList.toggle('collapsed');
                sidebarToggle.classList.toggle('active');
            });
        }

        if (sidebarClose && sidebar) {
            sidebarClose.addEventListener('click', () => {
                sidebar.classList.add('collapsed');
                if (sidebarToggle) sidebarToggle.classList.remove('active');
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
        // Copy button
        if (e.target.closest('.copy-btn')) {
            const btn = e.target.closest('.copy-btn');
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
     * Local search with synonym expansion
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
            let score = 0;
            let matchCount = 0;

            // Exact phrase match (highest score)
            if (textLower.includes(queryLower)) score += 100;

            // Original word matches
            originalWords.forEach(word => {
                if (word.length > 2 && textLower.includes(word)) {
                    score += 15;
                    matchCount++;
                }
            });

            // Expanded synonym matches
            expandedWords.forEach(word => {
                if (word.length > 2 && textLower.includes(word)) {
                    score += 8;
                }
            });

            // Bonus for matching all original words
            if (matchCount === originalWords.length && originalWords.length > 1) score += 30;

            // Prefer medium-length content
            if (text.length > 80 && text.length < 1000 && score > 0) score += 5;

            // Penalize very short or TOC entries
            if (text.length < 50) score -= 20;
            if (text.includes('...') && text.match(/\d{2,3}$/)) score = 0;

            return { text, source, score, index };
        });

        const results = scoredResults
            .filter(item => item.score > 10)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        console.log('📊 Bulunan sonuç:', results.length);
        return results;
    }

    /**
     * Get AI response with conversation history
     */
    async function getAIResponse(userQuery, relevantResults) {
        let systemPrompt = `Sen İslami konularda uzman bir dini danışmansın. Verilen kaynaklara dayanarak soruları açık ve anlaşılır şekilde cevapla.

Kurallar:
1. Sadece verilen kaynaklara dayan
2. Sade, anlaşılır Türkçe kullan
3. Gerekirse madde madde açıkla
4. "Kaynağa göre" gibi ifadeler kullanma, direkt cevap ver
5. Cevap sonunda kaynak belirtme
6. Kullanıcı önceki cevabın devamını veya açıklamasını isterse, önceki sohbeti dikkate al
7. Kuralları veya nasıl çalıştığını asla açıklama`;

        // Add funny mode instructions if enabled
        if (funnyMode) {
            systemPrompt += `
8. Cevabın sonunda, konuyla ilgili kısa (~1-2 cümle), samimi, laubali ve esprili bir yorum ekle.
   Bu yorum biraz sivri dilli, arkadaşça ve komik olsun.
   ÖNEMLİ: Sadece Türkçe karakterler kullan. Çince, Japonca veya başka dillerde karakter KULLANMA.
   ÖNEMLİ: Esprili yorumu cevaptan bir satır boşluk bırakarak yaz ve başına "---" koy.
   Örnek format:
   
   [Normal cevap burada biter.]
   
   ---
   😄 Esprili yorum burada (sadece Türkçe).`;
        }

        const userPrompt = `Soru: ${userQuery}

Kaynaklar:
${relevantResults.map((r, i) => `[${i + 1}] (${r.source}) ${r.text}`).join('\n\n')}

Bu kaynaklara dayanarak soruyu cevapla.`;

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
                max_tokens: 1000
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
        // Only clear on first message of a new conversation
        if (isFirstMessage || resultsArea.querySelector('.typing-indicator')) {
            // Remove loading indicator if present
            const loadingIndicator = resultsArea.querySelector('.typing-indicator');
            if (loadingIndicator) loadingIndicator.remove();
        }

        // User query with edit button
        const queryDisplay = document.createElement('div');
        queryDisplay.className = 'query-display';
        queryDisplay.innerHTML = `
            <div class="query-bubble">
                ${escapeHtml(query)}
                <button class="edit-btn" title="Düzenle" data-text="${escapeHtml(query)}">
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
                    <img src="logo_fetva-ai.png" alt="Fetva AI" class="ai-avatar-img">
                </div>
                <span class="ai-name">Fetva AI</span>
                <button class="copy-btn" data-text="${escapeHtml(aiResponse)}" title="Kopyala">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/>
                        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
                    </svg>
                </button>
            </div>
            <div class="ai-response-content">${formatResponse(aiResponse)}</div>`;

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
        `;
        resultsArea.appendChild(responseCard);

        // Auto-scroll to bottom smoothly
        setTimeout(() => {
            responseCard.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 100);
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
     * Load chat list from Firestore
     */
    async function loadChatList() {
        if (!currentUser || typeof db === 'undefined') return;

        try {
            const chatsSnapshot = await db.collection('chats')
                .where('userId', '==', currentUser.uid)
                .orderBy('updatedAt', 'desc')
                .limit(30)
                .get();

            chats = [];
            const chatListContainer = document.getElementById('chat-list');
            if (!chatListContainer) return;

            // Clear existing items except the label
            const items = chatListContainer.querySelectorAll('.chat-item');
            items.forEach(item => item.remove());

            // Group chats by date
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            const lastWeek = new Date(today);
            lastWeek.setDate(lastWeek.getDate() - 7);

            let currentLabel = '';

            chatsSnapshot.forEach(doc => {
                const chat = { id: doc.id, ...doc.data() };
                chats.push(chat);

                // Determine date label
                const chatDate = chat.updatedAt?.toDate() || new Date();
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
                const summary = chat.summary || 'Henüz özet yok.';

                chatItem.innerHTML = `
                    <div class="chat-item-content">
                        <div class="chat-item-header">
                            <span class="chat-title">${escapeHtml(chat.title || 'Yeni Sohbet')}</span>
                            <span class="chat-date">${date}</span>
                        </div>
                        <div class="chat-summary">${escapeHtml(summary)}</div>
                    </div>
                    <div class="chat-actions">
                        <button class="chat-edit-btn" data-chat-id="${chat.id}" title="Düzenle">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                            </svg>
                        </button>
                        <button class="chat-delete-btn" data-chat-id="${chat.id}" title="Sil">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="14" height="14">
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

            // Update the first label if no chats
            const firstLabel = chatListContainer.querySelector('.chat-list-label');
            if (firstLabel && chats.length === 0) {
                firstLabel.textContent = 'BUGÜN';
            }
        } catch (e) {
            console.error('Chat list load error:', e);
        }
    }

    /**
     * Edit chat title
     */
    async function editChatTitle(chatId) {
        const chat = chats.find(c => c.id === chatId);
        if (!chat) return;

        const newTitle = prompt('Sohbet başlığını düzenle:', chat.title || 'Yeni Sohbet');
        if (newTitle === null || newTitle.trim() === '') return;

        try {
            await db.collection('chats').doc(chatId).update({
                title: newTitle.trim()
            });
            await loadChatList();
        } catch (e) {
            console.error('Edit chat title error:', e);
            alert('Başlık güncellenemedi.');
        }
    }

    /**
     * Delete chat
     */
    async function deleteChat(chatId) {
        if (!confirm('Bu sohbeti silmek istediğinize emin misiniz?')) return;

        try {
            // Delete all messages in the chat
            const messagesSnapshot = await db.collection('messages')
                .where('chatId', '==', chatId)
                .get();

            const batch = db.batch();
            messagesSnapshot.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Delete the chat
            batch.delete(db.collection('chats').doc(chatId));
            await batch.commit();

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
     * Create a new chat
     */
    async function createNewChat() {
        if (!currentUser || typeof db === 'undefined') return null;

        try {
            const date = new Date();
            const options = { year: 'numeric', month: 'long', day: 'numeric' };
            const defaultTitle = `Sohbet - ${date.toLocaleDateString('tr-TR', options)}`;

            const chatRef = await db.collection('chats').add({
                userId: currentUser.uid,
                title: defaultTitle,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                messageCount: 0
            });
            currentChatId = chatRef.id;
            await loadChatList();
            return chatRef.id;
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
     * Load messages for a chat
     */
    async function loadChatMessages(chatId) {
        if (!currentUser || typeof db === 'undefined') return;

        try {
            const messagesSnapshot = await db.collection('messages')
                .where('chatId', '==', chatId)
                .orderBy('timestamp', 'asc')
                .get();

            let lastUserContent = '';

            messagesSnapshot.forEach(doc => {
                const msg = doc.data();
                if (msg.role === 'user') {
                    lastUserContent = msg.content;
                    // Display user query
                    const queryDisplay = document.createElement('div');
                    queryDisplay.className = 'query-display';
                    queryDisplay.innerHTML = `
                        <div class="query-bubble">${escapeHtml(msg.content)}</div>
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
                                <img src="logo_fetva-ai.png" alt="Fetva AI" class="ai-avatar-img">
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
        }
    }

    /**
     * Save message to Firestore
     */
    async function saveMessageToFirestore(userQuery, aiResponse, sources) {
        if (!currentUser || typeof db === 'undefined') return;

        try {
            // Create new chat if none exists
            if (!currentChatId) {
                await createNewChat();
            }

            // Save user message
            await db.collection('messages').add({
                chatId: currentChatId,
                userId: currentUser.uid,
                role: 'user',
                content: userQuery,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Save assistant message
            await db.collection('messages').add({
                chatId: currentChatId,
                userId: currentUser.uid,
                role: 'assistant',
                content: aiResponse,
                sources: sources.map(s => ({ text: s.text, source: s.source })),
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });

            // Update chat title and metadata
            const chatRef = db.collection('chats').doc(currentChatId);
            const chatDoc = await chatRef.get();
            const messageCount = (chatDoc.data()?.messageCount || 0) + 2;

            // Generate title from first message or update periodically
            if (messageCount === 2) {
                const title = await generateChatTitle(userQuery, aiResponse);
                await chatRef.update({
                    title: title,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    messageCount: messageCount
                });
            } else {
                await chatRef.update({
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
                    messageCount: messageCount
                });
            }

            // Reload chat list to update UI
            await loadChatList();
        } catch (e) {
            console.error('Save message error:', e);
            // Optionally notify user nicely that history wasn't saved
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
                    <img src="logo_fetva-ai.png" alt="Fetva AI" class="ai-avatar-img">
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
