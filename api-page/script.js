// Pastikan DOM sudah dimuat sepenuhnya sebelum menjalankan skrip

document.addEventListener('DOMContentLoaded', async () => {

    // Selektor Elemen DOM Utama

    const DOM = {

        loadingScreen: document.getElementById("loadingScreen"),

        body: document.body,

        sideNav: document.querySelector('.side-nav'),

        mainWrapper: document.querySelector('.main-wrapper'),

        navCollapseBtn: document.querySelector('.nav-collapse-btn'),

        menuToggle: document.querySelector('.menu-toggle'),

        themeToggle: document.getElementById('themeToggle'),

        searchInput: document.getElementById('searchInput'),

        clearSearchBtn: document.getElementById('clearSearch'),

        apiContent: document.getElementById('apiContent'),

        notificationToast: document.getElementById('notificationToast'), // Toast untuk notifikasi umum

        notificationBell: document.getElementById('notificationBell'), // Tombol lonceng

        notificationBadge: document.getElementById('notificationBadge'), // Badge merah

        modal: {

            instance: null, // Akan diinisialisasi nanti

            element: document.getElementById('apiResponseModal'),

            label: document.getElementById('apiResponseModalLabel'),

            desc: document.getElementById('apiResponseModalDesc'),

            content: document.getElementById('apiResponseContent'),

            container: document.getElementById('responseContainer'),

            endpoint: document.getElementById('apiEndpoint'),

            spinner: document.getElementById('apiResponseLoading'),

            queryInputContainer: document.getElementById('apiQueryInputContainer'),

            submitBtn: document.getElementById('submitQueryBtn'),

            copyEndpointBtn: document.getElementById('copyEndpoint'),

            copyResponseBtn: document.getElementById('copyResponse')

        },

        // Elemen yang diisi dari settings.json

        pageTitle: document.getElementById('page'),

        wm: document.getElementById('wm'),

        appName: document.getElementById('name'),

        sideNavName: document.getElementById('sideNavName'),

        versionBadge: document.getElementById('version'),

        versionHeaderBadge: document.getElementById('versionHeader'),

        appDescription: document.getElementById('description'),

        dynamicImage: document.getElementById('dynamicImage'), // ID untuk gambar banner di hero section

        apiLinksContainer: document.getElementById('apiLinks')

    };



    let settings = {}; // Untuk menyimpan data dari settings.json

    let currentApiData = null; // Untuk menyimpan data API yang sedang ditampilkan di modal

    let allNotifications = []; // Untuk menyimpan semua notifikasi dari JSON



    // --- Fungsi Utilitas ---

    const showToast = (message, type = 'info', title = 'Notifikasi') => {

        if (!DOM.notificationToast) return;

        const toastBody = DOM.notificationToast.querySelector('.toast-body');

        const toastTitleEl = DOM.notificationToast.querySelector('.toast-title');

        const toastIcon = DOM.notificationToast.querySelector('.toast-icon');

        

        toastBody.textContent = message;

        toastTitleEl.textContent = title;

        

        const typeConfig = {

            success: { color: 'var(--success-color)', icon: 'fa-check-circle' },

            error: { color: 'var(--error-color)', icon: 'fa-exclamation-circle' },

            info: { color: 'var(--primary-color)', icon: 'fa-info-circle' },

            notification: { color: 'var(--accent-color)', icon: 'fa-bell' }

        };

        

        const config = typeConfig[type] || typeConfig.info;

        

        DOM.notificationToast.style.borderLeftColor = config.color;

        toastIcon.className = `toast-icon fas ${config.icon} me-2`;

        toastIcon.style.color = config.color;



        let bsToast = bootstrap.Toast.getInstance(DOM.notificationToast);

        if (!bsToast) {

            bsToast = new bootstrap.Toast(DOM.notificationToast);

        }

        bsToast.show();

    };



    const copyToClipboard = async (text, btnElement) => {

        if (!navigator.clipboard) {

            showToast('Browser tidak mendukung penyalinan ke clipboard.', 'error');

            return;

        }

        try {

            await navigator.clipboard.writeText(text);

            const originalIcon = btnElement.innerHTML;

            btnElement.innerHTML = '<i class="fas fa-check"></i>';

            btnElement.classList.add('copy-success');

            showToast('Berhasil disalin ke clipboard!', 'success');

            

            setTimeout(() => {

                btnElement.innerHTML = originalIcon;

                btnElement.classList.remove('copy-success');

            }, 1500);

        } catch (err) {

            showToast('Gagal menyalin teks: ' + err.message, 'error');

        }

    };



    const debounce = (func, delay) => {

        let timeout;

        return (...args) => {

            clearTimeout(timeout);

            timeout = setTimeout(() => func.apply(this, args), delay);

        };

    };



    // --- Fungsi Notifikasi ---

    const loadNotifications = async () => {

        try {

            const response = await fetch('/notifications.json'); 

            if (!response.ok) throw new Error(`Gagal memuat notifikasi: ${response.status}`);

            allNotifications = await response.json();

            updateNotificationBadge();

        } catch (error) {

            console.error('Error loading notifications:', error);

        }

    };



    const getSessionReadNotificationIds = () => {

        const ids = sessionStorage.getItem('sessionReadNotificationIds');

        return ids ? JSON.parse(ids) : [];

    };



    const addSessionReadNotificationId = (id) => {

        let ids = getSessionReadNotificationIds();

        if (!ids.includes(id)) {

            ids.push(id);

            sessionStorage.setItem('sessionReadNotificationIds', JSON.stringify(ids));

        }

    };

    

    const updateNotificationBadge = () => {

        if (!DOM.notificationBadge || !allNotifications.length) {

             if(DOM.notificationBadge) DOM.notificationBadge.classList.remove('active');

            return;

        }



        const today = new Date();

        today.setHours(0, 0, 0, 0); 



        const sessionReadIds = getSessionReadNotificationIds();



        const unreadNotifications = allNotifications.filter(notif => {

            const notificationDate = new Date(notif.date);

            notificationDate.setHours(0, 0, 0, 0); 

            return !notif.read && notificationDate <= today && !sessionReadIds.includes(notif.id);

        });



        if (unreadNotifications.length > 0) {

            DOM.notificationBadge.classList.add('active');

            DOM.notificationBell.setAttribute('aria-label', `Notifikasi (${unreadNotifications.length} belum dibaca)`);

        } else {

            DOM.notificationBadge.classList.remove('active');

            DOM.notificationBell.setAttribute('aria-label', 'Tidak ada notifikasi baru');

        }

    };



    const handleNotificationBellClick = () => {

        const today = new Date();

        today.setHours(0, 0, 0, 0);

        const sessionReadIds = getSessionReadNotificationIds();



        const notificationsToShow = allNotifications.filter(notif => {

            const notificationDate = new Date(notif.date);

            notificationDate.setHours(0, 0, 0, 0);

            return !notif.read && notificationDate <= today && !sessionReadIds.includes(notif.id);

        });



        if (notificationsToShow.length > 0) {

            notificationsToShow.forEach(notif => {

                showToast(notif.message, 'notification', `Notifikasi (${new Date(notif.date).toLocaleDateString('id-ID')})`);

                addSessionReadNotificationId(notif.id); 

            });

        } else {

            showToast('Tidak ada notifikasi baru saat ini.', 'info');

        }

        

        updateNotificationBadge(); 

    };



    // --- Inisialisasi dan Event Listener Utama ---

    const init = async () => {

        setupEventListeners();

        initTheme();

        initSideNav();

        initModal();

        await loadNotifications(); 

        

        try {

            const response = await fetch('/src/settings.json');

            if (!response.ok) throw new Error(`Gagal memuat pengaturan: ${response.status}`);

            settings = await response.json();

            populatePageContent();

            renderApiCategories();

            observeApiItems();

        } catch (error) {

            console.error('Error loading settings:', error);

            showToast(`Gagal memuat pengaturan: ${error.message}`, 'error');

            displayErrorState("Tidak dapat memuat konfigurasi API.");

        } finally {

            hideLoadingScreen();

        }

    };



    const setupEventListeners = () => {

        if (DOM.navCollapseBtn) DOM.navCollapseBtn.addEventListener('click', toggleSideNavCollapse);

        if (DOM.menuToggle) DOM.menuToggle.addEventListener('click', toggleSideNavMobile);

        if (DOM.themeToggle) DOM.themeToggle.addEventListener('change', handleThemeToggle);

        if (DOM.searchInput) DOM.searchInput.addEventListener('input', debounce(handleSearch, 300));

        if (DOM.clearSearchBtn) DOM.clearSearchBtn.addEventListener('click', clearSearch);

        

        if (DOM.notificationBell) DOM.notificationBell.addEventListener('click', handleNotificationBellClick);



        if (DOM.apiContent) DOM.apiContent.addEventListener('click', handleApiGetButtonClick);



        if (DOM.modal.copyEndpointBtn) DOM.modal.copyEndpointBtn.addEventListener('click', () => copyToClipboard(DOM.modal.endpoint.textContent, DOM.modal.copyEndpointBtn));

        if (DOM.modal.copyResponseBtn) DOM.modal.copyResponseBtn.addEventListener('click', () => copyToClipboard(DOM.modal.content.textContent, DOM.modal.copyResponseBtn));

        if (DOM.modal.submitBtn) DOM.modal.submitBtn.addEventListener('click', handleSubmitQuery);



        window.addEventListener('scroll', handleScroll);

        document.addEventListener('click', closeSideNavOnClickOutside);

    };



    // --- Manajemen Loading Screen ---

    const hideLoadingScreen = () => {

        if (!DOM.loadingScreen) return;

        const loadingDots = DOM.loadingScreen.querySelector(".loading-dots");

        if (loadingDots && loadingDots.intervalId) clearInterval(loadingDots.intervalId);



        DOM.loadingScreen.classList.add('fade-out');

        setTimeout(() => {

            DOM.loadingScreen.style.display = "none";

            DOM.body.classList.remove("no-scroll");

        }, 500);

    };

    

    const animateLoadingDots = () => {

        const loadingDots = DOM.loadingScreen.querySelector(".loading-dots");

        if (loadingDots) {

            loadingDots.intervalId = setInterval(() => {

                if (loadingDots.textContent.length >= 3) {

                    loadingDots.textContent = '.';

                } else {

                    loadingDots.textContent += '.';

                }

            }, 500);

        }

    };

    animateLoadingDots(); 



    // --- Manajemen Tema ---

    const initTheme = () => {

        const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;

        const savedTheme = localStorage.getItem('darkMode');

        if (savedTheme === 'true' || (savedTheme === null && prefersDark)) {

            DOM.body.classList.add('dark-mode');

            if (DOM.themeToggle) DOM.themeToggle.checked = true;

        }

    };



    const handleThemeToggle = () => {

        DOM.body.classList.toggle('dark-mode');

        const isDarkMode = DOM.body.classList.contains('dark-mode');

        localStorage.setItem('darkMode', isDarkMode);

        showToast(`Beralih ke mode ${isDarkMode ? 'gelap' : 'terang'}`, 'success');

    };



    // --- Manajemen Navigasi Samping ---

    const initSideNav = () => {

        if (DOM.sideNav && DOM.navCollapseBtn) {

             const isCollapsed = DOM.sideNav.classList.contains('collapsed');

             DOM.navCollapseBtn.setAttribute('aria-expanded', !isCollapsed);

        }

    };

    

    const toggleSideNavCollapse = () => {

        if (!DOM.sideNav || !DOM.mainWrapper || !DOM.navCollapseBtn) return;

        DOM.sideNav.classList.toggle('collapsed');

        DOM.mainWrapper.classList.toggle('nav-collapsed');

        const isExpanded = !DOM.sideNav.classList.contains('collapsed');

        DOM.navCollapseBtn.setAttribute('aria-expanded', isExpanded);

    };



    const toggleSideNavMobile = () => {

        if (!DOM.sideNav || !DOM.menuToggle) return;

        DOM.sideNav.classList.toggle('active');

        const isActive = DOM.sideNav.classList.contains('active');

        DOM.menuToggle.setAttribute('aria-expanded', isActive);

    };



    const closeSideNavOnClickOutside = (e) => {

        if (!DOM.sideNav || !DOM.menuToggle) return;

        if (window.innerWidth < 992 &&

            !DOM.sideNav.contains(e.target) &&

            !DOM.menuToggle.contains(e.target) &&

            DOM.sideNav.classList.contains('active')) {

            DOM.sideNav.classList.remove('active');

            DOM.menuToggle.setAttribute('aria-expanded', 'false');

        }

    };

    

    const handleScroll = () => {

        const scrollPosition = window.scrollY;

        const headerElement = document.querySelector('.main-header'); 

        const headerHeight = headerElement ? parseInt(getComputedStyle(headerElement).height) : 70; 

        

        document.querySelectorAll('section[id]').forEach(section => {

            const sectionTop = section.offsetTop - headerHeight - 20; 

            const sectionHeight = section.offsetHeight;

            const sectionId = section.getAttribute('id');

            

            const navLink = document.querySelector(`.side-nav-link[href="#${sectionId}"]`);

            if (navLink) {

                if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {

                    document.querySelectorAll('.side-nav-link.active').forEach(l => {

                        l.classList.remove('active');

                        l.removeAttribute('aria-current');

                    });

                    navLink.classList.add('active');

                    navLink.setAttribute('aria-current', 'page');

                }

            }

        });

    };



    // --- Inisialisasi Modal ---

    const initModal = () => {

        if (DOM.modal.element) {

            DOM.modal.instance = new bootstrap.Modal(DOM.modal.element);

        }

    };



    // --- Pengisian Konten Halaman ---

    const setPageContent = (element, value, fallback = '') => {

        if (element) element.textContent = value || fallback;

    };

    

    const setPageAttribute = (element, attribute, value, fallback = '') => {

        if (element) element.setAttribute(attribute, value || fallback);

    };



    const populatePageContent = () => {

        if (!settings || Object.keys(settings).length === 0) return;



        const currentYear = new Date().getFullYear();

        const creator = settings.apiSettings?.creator || 'FlowFalcon';



        setPageContent(DOM.pageTitle, settings.name, "Falcon API");

        setPageContent(DOM.wm, `© ${currentYear} ${creator}. Semua hak dilindungi.`);

        setPageContent(DOM.appName, settings.name, "Falcon API");

        setPageContent(DOM.sideNavName, settings.name || "API");

        setPageContent(DOM.versionBadge, settings.version, "v1.0");

        setPageContent(DOM.versionHeaderBadge, settings.header?.status, "Aktif!");

        setPageContent(DOM.appDescription, settings.description, "Dokumentasi API simpel dan mudah digunakan.");



        // Mengatur gambar banner

        if (DOM.dynamicImage) {

            if (settings.bannerImage) {

                DOM.dynamicImage.src = settings.bannerImage;

                DOM.dynamicImage.alt = settings.name ? `${settings.name} Banner` : "API Banner";

                DOM.dynamicImage.style.display = ''; // Pastikan gambar ditampilkan jika ada path

            } else {

                // Jika tidak ada bannerImage di settings, gunakan fallback default dan tampilkan

                DOM.dynamicImage.src = '/src/banner.jpg'; 

                DOM.dynamicImage.alt = "API Banner Default";

                DOM.dynamicImage.style.display = '';

            }

            DOM.dynamicImage.onerror = () => {

                DOM.dynamicImage.src = '/src/banner.jpg'; // Fallback jika error loading

                DOM.dynamicImage.alt = "API Banner Fallback";

                DOM.dynamicImage.style.display = ''; // Pastikan tetap tampil

                showToast('Gagal memuat gambar banner, menggunakan gambar default.', 'warning');

            };

        }

        

        if (DOM.apiLinksContainer) {

            DOM.apiLinksContainer.innerHTML = ''; 

            const defaultLinks = [{ url: "https://github.com/FlowFalcon/Falcon-Api-UI", name: "Lihat di GitHub", icon: "fab fa-github" }];

            const linksToRender = settings.links?.length ? settings.links : defaultLinks;



            linksToRender.forEach(({ url, name, icon }, index) => {

                const link = document.createElement('a');

                link.href = url;

                link.target = '_blank';

                link.rel = 'noopener noreferrer';

                link.className = 'api-link btn btn-primary'; 

                link.style.animationDelay = `${index * 0.1}s`;

                link.setAttribute('aria-label', name);

                

                const iconElement = document.createElement('i');

                iconElement.className = icon || 'fas fa-external-link-alt'; 

                iconElement.setAttribute('aria-hidden', 'true');

                

                link.appendChild(iconElement);

                link.appendChild(document.createTextNode(` ${name}`));

                DOM.apiLinksContainer.appendChild(link);

            });

        }

    };



    // --- Render Kategori dan Item API ---

    const renderApiCategories = () => {

        if (!DOM.apiContent || !settings.categories || !settings.categories.length) {

            displayErrorState("Tidak ada kategori API yang ditemukan.");

            return;

        }

        DOM.apiContent.innerHTML = ''; 



        settings.categories.forEach((category, categoryIndex) => {

            const sortedItems = category.items.sort((a, b) => a.name.localeCompare(b.name));

            

            const categorySection = document.createElement('section'); 

            categorySection.id = `category-${category.name.toLowerCase().replace(/\s+/g, '-')}`;

            categorySection.className = 'category-section';

            categorySection.style.animationDelay = `${categoryIndex * 0.15}s`;

            categorySection.setAttribute('aria-labelledby', `category-title-${categoryIndex}`);

            

            const categoryHeader = document.createElement('h3');

            categoryHeader.id = `category-title-${categoryIndex}`;

            categoryHeader.className = 'category-header';

            

            if (category.icon) { 

                const iconEl = document.createElement('i');

                iconEl.className = `${category.icon} me-2`;

                iconEl.setAttribute('aria-hidden', 'true');

                categoryHeader.appendChild(iconEl);

            }

            categoryHeader.appendChild(document.createTextNode(category.name));

            categorySection.appendChild(categoryHeader);

            

            if (category.image) {

                const img = document.createElement('img');

                img.src = category.image;

                img.alt = `${category.name} banner`;

                img.className = 'category-image img-fluid rounded mb-3 shadow-sm'; 

                img.loading = 'lazy'; 

                categorySection.appendChild(img);

            }



            const itemsRow = document.createElement('div');

            itemsRow.className = 'row'; 

            

            sortedItems.forEach((item, itemIndex) => {

                const itemCol = document.createElement('div');

                itemCol.className = 'col-12 col-md-6 col-lg-4 api-item'; 

                itemCol.dataset.name = item.name;

                itemCol.dataset.desc = item.desc;

                itemCol.dataset.category = category.name;

                itemCol.style.animationDelay = `${itemIndex * 0.05 + 0.2}s`;



                const apiCard = document.createElement('article'); 

                apiCard.className = 'api-card h-100'; 

                apiCard.setAttribute('aria-labelledby', `api-title-${categoryIndex}-${itemIndex}`);



                const cardInfo = document.createElement('div');

                cardInfo.className = 'api-card-info';



                const itemTitle = document.createElement('h5');

                itemTitle.id = `api-title-${categoryIndex}-${itemIndex}`;

                itemTitle.className = 'mb-1'; 

                itemTitle.textContent = item.name;

                

                const itemDesc = document.createElement('p');

                itemDesc.className = 'text-muted mb-0';

                itemDesc.textContent = item.desc;

                

                cardInfo.appendChild(itemTitle);

                cardInfo.appendChild(itemDesc);

                

                const actionsDiv = document.createElement('div');

                actionsDiv.className = 'api-actions mt-auto'; 

                

                const getBtn = document.createElement('button');

                getBtn.type = 'button';

                getBtn.className = 'btn get-api-btn btn-sm'; 

                getBtn.innerHTML = '<i class="fas fa-code me-1" aria-hidden="true"></i> GET';

                getBtn.dataset.apiPath = item.path;

                getBtn.dataset.apiName = item.name;

                getBtn.dataset.apiDesc = item.desc;

                if (item.params) getBtn.dataset.apiParams = JSON.stringify(item.params);

                if (item.innerDesc) getBtn.dataset.apiInnerDesc = item.innerDesc;

                getBtn.setAttribute('aria-label', `Dapatkan detail untuk ${item.name}`);

                

                const status = item.status || "ready";

                const statusConfig = {

                    ready: { class: "status-ready", icon: "fa-circle", text: "Ready" },

                    error: { class: "status-error", icon: "fa-exclamation-triangle", text: "Error" },

                    update: { class: "status-update", icon: "fa-arrow-up", text: "Update" }

                };

                const currentStatus = statusConfig[status] || statusConfig.ready;



                if (status === 'error' || status === 'update') {

                    getBtn.disabled = true;

                    apiCard.classList.add('api-card-unavailable');

                    getBtn.title = `API ini sedang dalam status '${status}', sementara tidak dapat digunakan.`;

                }



                const statusIndicator = document.createElement('div');

                statusIndicator.className = `api-status ${currentStatus.class}`;

                statusIndicator.title = `Status: ${currentStatus.text}`;

                statusIndicator.innerHTML = `<i class="fas ${currentStatus.icon} me-1" aria-hidden="true"></i><span>${currentStatus.text}</span>`;

                

                actionsDiv.appendChild(getBtn);

                actionsDiv.appendChild(statusIndicator);

                

                apiCard.appendChild(cardInfo);

                apiCard.appendChild(actionsDiv);

                itemCol.appendChild(apiCard);

                itemsRow.appendChild(itemCol); 

            });

            

            categorySection.appendChild(itemsRow); 

            DOM.apiContent.appendChild(categorySection);

        });

        initializeTooltips(); 

    };



    const displayErrorState = (message) => {

        if (!DOM.apiContent) return;

        DOM.apiContent.innerHTML = `

            <div class="no-results-message text-center p-5">

                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>

                <p class="h5">${message}</p>

                <p class="text-muted">Silakan coba muat ulang halaman atau hubungi administrator.</p>

                <button class="btn btn-primary mt-3" onclick="location.reload()">

                    <i class="fas fa-sync-alt me-2"></i> Muat Ulang

                </button>

            </div>

        `;

    };

    

    // --- Fungsi Pencarian ---

    const handleSearch = () => {

        if (!DOM.searchInput || !DOM.apiContent) return;

        const searchTerm = DOM.searchInput.value.toLowerCase().trim();

        DOM.clearSearchBtn.classList.toggle('visible', searchTerm.length > 0);



        const apiItems = DOM.apiContent.querySelectorAll('.api-item');

        let visibleCategories = new Set();



        apiItems.forEach(item => {

            const name = (item.dataset.name || '').toLowerCase();

            const desc = (item.dataset.desc || '').toLowerCase();

            const category = (item.dataset.category || '').toLowerCase();

            const matches = name.includes(searchTerm) || desc.includes(searchTerm) || category.includes(searchTerm);

            

            item.style.display = matches ? '' : 'none';

            if (matches) {

                visibleCategories.add(item.closest('.category-section'));

            }

        });



        DOM.apiContent.querySelectorAll('.category-section').forEach(section => {

            section.style.display = visibleCategories.has(section) ? '' : 'none';

        });



        const noResultsMsg = DOM.apiContent.querySelector('#noResultsMessage') || createNoResultsMessage();

        const allHidden = Array.from(visibleCategories).length === 0 && searchTerm.length > 0;

        

        if (allHidden) {

            noResultsMsg.querySelector('span').textContent = `"${searchTerm}"`;

            noResultsMsg.style.display = 'flex';

        } else {

            noResultsMsg.style.display = 'none';

        }

    };



    const clearSearch = () => {

        if (!DOM.searchInput) return;

        DOM.searchInput.value = '';

        DOM.searchInput.focus();

        handleSearch(); 

        DOM.searchInput.classList.add('shake-animation');

        setTimeout(() => DOM.searchInput.classList.remove('shake-animation'), 400);

    };



    const createNoResultsMessage = () => {

        let noResultsMsg = document.getElementById('noResultsMessage');

        if (!noResultsMsg) {

            noResultsMsg = document.createElement('div');

            noResultsMsg.id = 'noResultsMessage';

            noResultsMsg.className = 'no-results-message flex-column align-items-center justify-content-center p-5 text-center';

            noResultsMsg.style.display = 'none'; 

            noResultsMsg.innerHTML = `

                <i class="fas fa-search fa-3x text-muted mb-3"></i>

                <p class="h5">Tidak ada hasil untuk <span></span></p>

                <button id="clearSearchFromMsg" class="btn btn-primary mt-3">

                    <i class="fas fa-times me-2"></i> Hapus Pencarian

                </button>

            `;

            DOM.apiContent.appendChild(noResultsMsg);

            document.getElementById('clearSearchFromMsg').addEventListener('click', clearSearch);

        }

        return noResultsMsg;

    };



    // --- Penanganan Klik Tombol API ---

    const handleApiGetButtonClick = (event) => {

        const getApiBtn = event.target.closest('.get-api-btn');

        if (!getApiBtn || getApiBtn.disabled) return; 



        getApiBtn.classList.add('pulse-animation');

        setTimeout(() => getApiBtn.classList.remove('pulse-animation'), 300);



        currentApiData = {

            path: getApiBtn.dataset.apiPath,

            name: getApiBtn.dataset.apiName,

            desc: getApiBtn.dataset.apiDesc,

            params: getApiBtn.dataset.apiParams ? JSON.parse(getApiBtn.dataset.apiParams) : null,

            innerDesc: getApiBtn.dataset.apiInnerDesc

        };

        

        setupModalForApi(currentApiData);

        DOM.modal.instance.show();

    };



    const setupModalForApi = (apiData) => {

        DOM.modal.label.textContent = apiData.name;

        DOM.modal.desc.textContent = apiData.desc;

        DOM.modal.content.innerHTML = ''; 

        DOM.modal.endpoint.textContent = `${window.location.origin}${apiData.path.split('?')[0]}`; 

        

        DOM.modal.spinner.classList.add('d-none');

        DOM.modal.content.classList.add('d-none');

        DOM.modal.container.classList.add('d-none');

        DOM.modal.endpoint.classList.remove('d-none'); 



        DOM.modal.queryInputContainer.innerHTML = '';

        DOM.modal.submitBtn.classList.add('d-none');

        DOM.modal.submitBtn.disabled = true;

        DOM.modal.submitBtn.innerHTML = '<span>Kirim</span><i class="fas fa-paper-plane ms-2" aria-hidden="true"></i>';



        const paramsFromPath = new URLSearchParams(apiData.path.split('?')[1]);

        const paramKeys = Array.from(paramsFromPath.keys());



        if (paramKeys.length > 0) {

            const paramContainer = document.createElement('div');

            paramContainer.className = 'param-container';



            const formTitle = document.createElement('h6');

            formTitle.className = 'param-form-title';

            formTitle.innerHTML = '<i class="fas fa-sliders-h me-2" aria-hidden="true"></i> Parameter';

            paramContainer.appendChild(formTitle);



            paramKeys.forEach(paramKey => {

                const paramGroup = document.createElement('div');

                paramGroup.className = 'param-group mb-3';



                const labelContainer = document.createElement('div');

                labelContainer.className = 'param-label-container';

                

                const label = document.createElement('label');

                label.className = 'form-label';

                label.textContent = paramKey;

                label.htmlFor = `param-${paramKey}`;

                

                const requiredSpan = document.createElement('span');

                requiredSpan.className = 'required-indicator ms-1';

                requiredSpan.textContent = '*';

                label.appendChild(requiredSpan);

                labelContainer.appendChild(label);



                if (apiData.params && apiData.params[paramKey]) {

                    const tooltipIcon = document.createElement('i');

                    tooltipIcon.className = 'fas fa-info-circle param-info ms-1';

                    tooltipIcon.setAttribute('data-bs-toggle', 'tooltip');

                    tooltipIcon.setAttribute('data-bs-placement', 'top');

                    tooltipIcon.title = apiData.params[paramKey];

                    labelContainer.appendChild(tooltipIcon);

                }

                paramGroup.appendChild(labelContainer);

                

                const inputContainer = document.createElement('div');

                inputContainer.className = 'input-container';

                const inputField = document.createElement('input');

                inputField.type = 'text';

                inputField.className = 'form-control custom-input';

                inputField.id = `param-${paramKey}`;

                inputField.placeholder = `Masukkan ${paramKey}...`;

                inputField.dataset.param = paramKey;

                inputField.required = true;

                inputField.autocomplete = "off";

                inputField.addEventListener('input', validateModalInputs);

                inputContainer.appendChild(inputField);

                paramGroup.appendChild(inputContainer);

                paramContainer.appendChild(paramGroup);

            });



            if (apiData.innerDesc) {

                const innerDescDiv = document.createElement('div');

                innerDescDiv.className = 'inner-desc mt-3';

                innerDescDiv.innerHTML = `<i class="fas fa-info-circle me-2" aria-hidden="true"></i> ${apiData.innerDesc.replace(/\n/g, '<br>')}`;

                paramContainer.appendChild(innerDescDiv);

            }



            DOM.modal.queryInputContainer.appendChild(paramContainer);

            DOM.modal.submitBtn.classList.remove('d-none');

            initializeTooltips(DOM.modal.queryInputContainer); 

        } else {

            handleApiRequest(`${window.location.origin}${apiData.path}`, apiData.name);

        }

    };

    

    const validateModalInputs = () => {

        const inputs = DOM.modal.queryInputContainer.querySelectorAll('input[required]');

        const allFilled = Array.from(inputs).every(input => input.value.trim() !== '');

        DOM.modal.submitBtn.disabled = !allFilled;

        DOM.modal.submitBtn.classList.toggle('btn-active', allFilled);



        inputs.forEach(input => {

            if (input.value.trim()) input.classList.remove('is-invalid');

        });

        const errorMsg = DOM.modal.queryInputContainer.querySelector('.alert.alert-danger.fade-in');

        if (errorMsg && allFilled) {

             errorMsg.classList.replace('fade-in', 'fade-out');

             setTimeout(() => errorMsg.remove(), 300);

        }

    };



    const handleSubmitQuery = async () => {

        if (!currentApiData) return;



        const inputs = DOM.modal.queryInputContainer.querySelectorAll('input');

        const newParams = new URLSearchParams();

        let isValid = true;



        inputs.forEach(input => {

            if (input.required && !input.value.trim()) {

                isValid = false;

                input.classList.add('is-invalid');

                input.parentElement.classList.add('shake-animation');

                setTimeout(() => input.parentElement.classList.remove('shake-animation'), 500);

            } else {

                input.classList.remove('is-invalid');

                if (input.value.trim()) newParams.append(input.dataset.param, input.value.trim());

            }

        });



        if (!isValid) {

            let errorMsg = DOM.modal.queryInputContainer.querySelector('.alert.alert-danger');

            if (!errorMsg) {

                errorMsg = document.createElement('div');

                errorMsg.className = 'alert alert-danger mt-3';

                errorMsg.setAttribute('role', 'alert');

                DOM.modal.queryInputContainer.appendChild(errorMsg);

            }

            errorMsg.innerHTML = '<i class="fas fa-exclamation-circle me-2"></i> Harap isi semua kolom yang wajib diisi.';

            errorMsg.classList.remove('fade-out');

            errorMsg.classList.add('fade-in');



            DOM.modal.submitBtn.classList.add('shake-animation');

            setTimeout(() => DOM.modal.submitBtn.classList.remove('shake-animation'), 500);

            return;

        }

        

        DOM.modal.submitBtn.disabled = true;

        DOM.modal.submitBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> Memproses...';



        const apiUrlWithParams = `${window.location.origin}${currentApiData.path.split('?')[0]}?${newParams.toString()}`;

        DOM.modal.endpoint.textContent = apiUrlWithParams; 



        if (DOM.modal.queryInputContainer.firstChild) {

            DOM.modal.queryInputContainer.firstChild.classList.add('fade-out');

            setTimeout(() => {

                 if (DOM.modal.queryInputContainer.firstChild) DOM.modal.queryInputContainer.firstChild.style.display = 'none';

            }, 300);

        }

        

        await handleApiRequest(apiUrlWithParams, currentApiData.name);

    };



    const handleApiRequest = async (apiUrl, apiName) => {

        DOM.modal.spinner.classList.remove('d-none');

        DOM.modal.container.classList.add('d-none');

        DOM.modal.content.innerHTML = ''; 



        try {

            const controller = new AbortController();

            const timeoutId = setTimeout(() => controller.abort(), 20000); 



            const response = await fetch(apiUrl, { signal: controller.signal });

            clearTimeout(timeoutId);



            if (!response.ok) {

                 const errorData = await response.json().catch(() => ({ message: response.statusText }));

                 throw new Error(`HTTP error! Status: ${response.status} - ${errorData.message || response.statusText}`);

            }



            const contentType = response.headers.get('Content-Type');

            if (contentType && contentType.includes('image/')) {

                const blob = await response.blob();

                const imageUrl = URL.createObjectURL(blob);

                const img = document.createElement('img');

                img.src = imageUrl;

                img.alt = apiName;

                img.className = 'response-image img-fluid rounded shadow-sm fade-in';

                

                const downloadBtn = document.createElement('a'); 

                downloadBtn.href = imageUrl;

                downloadBtn.download = `${apiName.toLowerCase().replace(/\s+/g, '-')}.${blob.type.split('/')[1] || 'png'}`;

                downloadBtn.className = 'btn btn-primary mt-3 w-100';

                downloadBtn.innerHTML = '<i class="fas fa-download me-2"></i> Unduh Gambar';

                

                DOM.modal.content.appendChild(img);

                DOM.modal.content.appendChild(downloadBtn);



            } else if (contentType && contentType.includes('application/json')) {

                const data = await response.json();

                const formattedJson = syntaxHighlightJson(JSON.stringify(data, null, 2));

                DOM.modal.content.innerHTML = formattedJson;

                if (JSON.stringify(data, null, 2).split('\n').length > 20) { 

                    addCodeFolding(DOM.modal.content);

                }

            } else {

                const textData = await response.text();

                DOM.modal.content.textContent = textData || "Respons tidak memiliki konten atau format tidak dikenal.";

            }



            DOM.modal.container.classList.remove('d-none');

            DOM.modal.content.classList.remove('d-none');

            DOM.modal.container.classList.add('slide-in-bottom');

            showToast(`Berhasil mengambil data untuk ${apiName}`, 'success');



        } catch (error) {

            console.error("API Request Error:", error);

            const errorHtml = `

                <div class="error-container text-center p-3">

                    <i class="fas fa-exclamation-triangle fa-2x text-danger mb-2"></i>

                    <h6 class="text-danger">Terjadi Kesalahan</h6>

                    <p class="text-muted small">${error.message || 'Tidak dapat mengambil data dari server.'}</p>

                    ${currentApiData && currentApiData.path.split('?')[1] ? 

                    `<button class="btn btn-sm btn-outline-primary mt-2 retry-query-btn">

                        <i class="fas fa-sync-alt me-1"></i> Coba Lagi

                    </button>` : ''}

                </div>`;

            DOM.modal.content.innerHTML = errorHtml;

            DOM.modal.container.classList.remove('d-none');

            DOM.modal.content.classList.remove('d-none');

            showToast('Gagal mengambil data. Periksa detail di modal.', 'error');



            const retryBtn = DOM.modal.content.querySelector('.retry-query-btn');

            if (retryBtn) {

                retryBtn.onclick = () => {

                    if (DOM.modal.queryInputContainer.firstChild) {

                         DOM.modal.queryInputContainer.firstChild.style.display = '';

                         DOM.modal.queryInputContainer.firstChild.classList.remove('fade-out');

                    }

                    DOM.modal.submitBtn.disabled = false; 

                    DOM.modal.submitBtn.innerHTML = '<span>Kirim</span><i class="fas fa-paper-plane ms-2" aria-hidden="true"></i>';

                    DOM.modal.container.classList.add('d-none'); 

                };

            }



        } finally {

            DOM.modal.spinner.classList.add('d-none');

            if (DOM.modal.submitBtn) { 

                const hasParams = currentApiData && currentApiData.path && currentApiData.path.includes('?');

                const hasError = DOM.modal.content.querySelector('.error-container');

                const hasRetryButton = DOM.modal.content.querySelector('.retry-query-btn');



                if (!hasParams || (hasError && !hasRetryButton)) {

                    DOM.modal.submitBtn.disabled = !hasParams; 

                    DOM.modal.submitBtn.innerHTML = '<span>Kirim</span><i class="fas fa-paper-plane ms-2" aria-hidden="true"></i>';

                }

             }

        }

    };

    

    // --- Fungsi Pembantu untuk Tampilan Kode ---

    const syntaxHighlightJson = (json) => {

        json = json.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

        return json.replace(/("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g, (match) => {

            let cls = 'json-number';

            if (/^"/.test(match)) {

                cls = /:$/.test(match) ? 'json-key' : 'json-string';

            } else if (/true|false/.test(match)) {

                cls = 'json-boolean';

            } else if (/null/.test(match)) {

                cls = 'json-null';

            }

            return `<span class="${cls}">${match}</span>`;

        });

    };



    const addCodeFolding = (container) => {

        const lines = container.innerHTML.split('\n');

        let currentLevel = 0;

        let foldableHtml = '';

        let inFoldableBlock = false;



        lines.forEach((line, index) => {

            const trimmedLine = line.trim();

            if (trimmedLine.endsWith('{') || trimmedLine.endsWith('[')) {

                if (currentLevel === 0) { 

                    foldableHtml += `<div class="code-fold-trigger" data-folded="false" role="button" tabindex="0" aria-expanded="true">${line}<span class="fold-indicator ms-2 small text-muted">(<i class="fas fa-chevron-down"></i> Lipat)</span></div><div class="code-fold-content">`;

                    inFoldableBlock = true;

                } else {

                    foldableHtml += line + '\n';

                }

                currentLevel++;

            } else if (trimmedLine.startsWith('}') || trimmedLine.startsWith(']')) {

                currentLevel--;

                foldableHtml += line + '\n';

                if (currentLevel === 0 && inFoldableBlock) {

                    foldableHtml += '</div>';

                    inFoldableBlock = false;

                }

            } else {

                foldableHtml += line + (index === lines.length - 1 ? '' : '\n');

            }

        });

        container.innerHTML = foldableHtml;



        container.querySelectorAll('.code-fold-trigger').forEach(trigger => {

            trigger.addEventListener('click', () => toggleFold(trigger));

            trigger.addEventListener('keydown', (e) => { 

                if (e.key === 'Enter' || e.key === ' ') {

                    e.preventDefault();

                    toggleFold(trigger);

                }

            });

        });

    };



    const toggleFold = (trigger) => {

        const content = trigger.nextElementSibling;

        const isFolded = trigger.dataset.folded === 'true';

        const indicator = trigger.querySelector('.fold-indicator');



        if (isFolded) { 

            content.style.maxHeight = content.scrollHeight + "px";

            trigger.dataset.folded = "false";

            trigger.setAttribute('aria-expanded', 'true');

            indicator.innerHTML = '(<i class="fas fa-chevron-up"></i> Tutup)';

        } else { 

            content.style.maxHeight = "0px";

            trigger.dataset.folded = "true";

            trigger.setAttribute('aria-expanded', 'false');

            indicator.innerHTML = '(<i class="fas fa-chevron-down"></i> Buka)';

        }

    };

    

    // --- Observasi Item API untuk Animasi ---

    const observeApiItems = () => {

        const observer = new IntersectionObserver((entries) => {

            entries.forEach(entry => {

                if (entry.isIntersecting) {

                    entry.target.classList.add('in-view', 'slideInUp'); 

                    observer.unobserve(entry.target);

                }

            });

        }, { threshold: 0.1 });



        document.querySelectorAll('.api-item:not(.in-view)').forEach(item => {

            observer.observe(item);

        });

    };



    // --- Inisialisasi Tooltip ---

    const initializeTooltips = (parentElement = document) => {

        const tooltipTriggerList = [].slice.call(parentElement.querySelectorAll('[data-bs-toggle="tooltip"]'));

        tooltipTriggerList.map(tooltipTriggerEl => {

            const existingTooltip = bootstrap.Tooltip.getInstance(tooltipTriggerEl);

            if (existingTooltip) {

                existingTooltip.dispose();

            }

            return new bootstrap.Tooltip(tooltipTriggerEl);

        });

    };



    // Jalankan inisialisasi utama

    init();

});
