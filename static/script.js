document.addEventListener('DOMContentLoaded', () => {
    // --- Получаем элементы DOM ---
    const getProductsBtn = document.getElementById('getProductsBtn');
    const loadFromDbBtn = document.getElementById('loadFromDbBtn');
    const emptyDbMessage = document.getElementById('emptyDbMessage');
    console.log('emptyDbMessage element:', emptyDbMessage);
    const productsList = document.getElementById('productsList');
    const loadingMessage = document.getElementById('loadingMessage');
    const errorMessage = document.getElementById('errorMessage');
    const productsContainer = document.getElementById('productsContainer');

    // Авторизация / статус
    const authStatusDiv = document.getElementById('authStatus');
    const welcomeMessageSpan = document.getElementById('welcomeMessage');
    const logoutBtn = document.getElementById('logoutBtn');
    const authFormsDiv = document.getElementById('authForms');

    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const showRegisterLink = document.getElementById('showRegisterLink');
    const showLoginLink = document.getElementById('showLoginLink');

    const loginUsernameInput = document.getElementById('loginUsername');
    const loginPasswordInput = document.getElementById('loginPassword');
    const registerUsernameInput = document.getElementById('registerUsername');
    const registerPasswordInput = document.getElementById('registerPassword');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    const loginErrorDiv = document.getElementById('loginError');
    const registerErrorDiv = document.getElementById('registerError');

    //Модальное окно товара
    const productModal = document.getElementById('productModal');
    const modalClose = document.getElementById('modalClose');
    const modalImage = document.getElementById('modalImage');
    const modalName = document.getElementById('modalName');
    const modalOfferId = document.getElementById('modalOfferId');
    const modalProductId = document.getElementById('modalProductId');
    const modalPrice = document.getElementById('modalPrice');
    const modalLastSynced = document.getElementById('modalLastSynced');

    // Фильтры
    const filtersDiv = document.getElementById('filters');
    const searchInput = document.getElementById('searchInput');
    const minPriceInput = document.getElementById('minPriceInput');
    const maxPriceInput = document.getElementById('maxPriceInput');
    const applyFiltersBtn = document.getElementById('applyFiltersBtn');

    // Пагинация
    const paginationDiv = document.getElementById('pagination');
    const prevPageBtn = document.getElementById('prevPageBtn');
    const nextPageBtn = document.getElementById('nextPageBtn');
    const pageInfoSpan = document.getElementById('pageInfo');

    //Сортировка
    const sortBySelect = document.getElementById('sortBySelect');
    const sortDirSelect = document.getElementById('sortDirSelect');

    //Логи синхнронизации
    const syncLogsContainer = document.getElementById('syncLogsContainer');
    const syncLogsBody = document.getElementById('syncLogsBody');

    const addProductBtn = document.getElementById('addProductBtn');

    const modalTitle = document.getElementById('modalTitle');
    const modalNameInput = document.getElementById('modalNameInput');
    const modalOfferIdInput = document.getElementById('modalOfferIdInput');
    const modalProductIdInput = document.getElementById('modalProductIdInput');
    const modalPriceInput = document.getElementById('modalPriceInput');
    const modalStockInput = document.getElementById('modalStockInput');
    const modalImageUrlInput = document.getElementById('modalImageUrlInput');
    const modalSaveBtn = document.getElementById('modalSaveBtn');
    const modalDeleteBtn = document.getElementById('modalDeleteBtn');
    const toggleLoginPassword = document.getElementById('toggleLoginPassword');
    //вкладки в списке
    const tabActive = document.getElementById('tabActive');
    const tabArchive = document.getElementById('tabArchive');
    const archiveEmpty = document.getElementById('archiveEmpty');

    //модалка параметров синхронизации
    const syncOptionsModal = document.getElementById('syncOptionsModal');
    const syncOptionsClose = document.getElementById('syncOptionsClose');
    const confirmSyncBtn = document.getElementById('confirmSyncBtn');
    const cancelSyncBtn = document.getElementById('cancelSyncBtn');
    const overwriteManualCheckbox = document.getElementById('overwriteManualCheckbox');
    const overwriteHiddenCheckbox = document.getElementById('overwriteHiddenCheckbox');

    //вкладки
    const topActions = document.getElementById('topActions');

    //панель аналитики
    const dashboardPanel = document.getElementById('dashboardPanel');
    const dashboardToggle = document.getElementById('dashboardToggle');

    //модалка истории
    const modalHistoryBtn = document.getElementById('modalHistoryBtn');
    const historyModal = document.getElementById('historyModal');
    const historyBody = document.getElementById('historyBody');
    const historyClose = document.getElementById('historyClose');
    const historyCloseBtn = document.getElementById('historyCloseBtn');
    
    //предупреждение о количестве символов
    const modalFormError = document.getElementById('modalFormError');
    //счётчик подстветка
    const nameCounter = document.getElementById('nameCounter');
    const urlCounter = document.getElementById('urlCounter');

    let modalMode = 'view'; 
    let modalCurrentOfferId = null;
    let currentUserRole = "user";
    let currentListMode = 'active';

    let currentPage = 1;
    let totalPages = 1;
    const PER_PAGE = 10;

    //Вспомогательные функции UI

    function showDashboardUI() {
        if (dashboardToggle) dashboardToggle.classList.remove('hidden');
        if (dashboardPanel) dashboardPanel.classList.remove('hidden'); // панель скрыта transform’ом, но пусть существует
    }

    function hideDashboardUI() {
        if (dashboardPanel) dashboardPanel.classList.remove('open'); // закрыть если открыта
        if (dashboardToggle) dashboardToggle.classList.add('hidden');
        if (dashboardPanel) dashboardPanel.classList.add('hidden');
    }

    function openHistoryModal() {
    historyModal.classList.remove('hidden');
    }

    function closeHistoryModal() {
    historyModal.classList.add('hidden');
    }

    if (historyClose) historyClose.addEventListener('click', closeHistoryModal);
    if (historyCloseBtn) historyCloseBtn.addEventListener('click', closeHistoryModal);

    if (historyModal) {
        historyModal.addEventListener('click', (e) => {
        if (e.target === historyModal) closeHistoryModal();
    });
    }

    function updateCounter(inputEl, counterEl, maxLen) {
        if (!inputEl || !counterEl) return;

        const len = (inputEl.value || '').length;
        counterEl.textContent = `${len} / ${maxLen}`;

        // сбрасываем классы
        counterEl.classList.remove('warn', 'danger');
        inputEl.classList.remove('input-warn', 'input-danger');

        // пороги
        const warnAt = Math.floor(maxLen * 0.85);

        if (len > maxLen) {
        counterEl.classList.add('danger');
        inputEl.classList.add('input-danger');
        } else if (len >= warnAt) {
        counterEl.classList.add('warn');
        inputEl.classList.add('input-warn');
    }
    }

    function validateModalFormLive() {
        // базовые правила
        const nameVal = modalNameInput.value.trim();
        const nameLen = modalNameInput.value.length;
        const nameMax = parseInt(modalNameInput.getAttribute('maxlength') || '120', 10);

        const urlMax = modalImageUrlInput
        ? parseInt(modalImageUrlInput.getAttribute('maxlength') || '400', 10)
        : 0;
        const urlLen = modalImageUrlInput ? modalImageUrlInput.value.length : 0;

        const nameOk = nameVal.length > 0 && nameLen <= nameMax;
        const urlOk = !modalImageUrlInput || urlLen <= urlMax;

        // если форма невалидна — блокируем сохранение
        if (modalSaveBtn) {
            modalSaveBtn.disabled = !(nameOk && urlOk);
    }
    }

    if (modalNameInput) {
        modalNameInput.addEventListener('input', () => {
        updateCounter(modalNameInput, nameCounter, 120);
        validateModalFormLive();
    });
    }

    if (modalImageUrlInput && urlCounter) {
        modalImageUrlInput.addEventListener('input', () => {
        updateCounter(modalImageUrlInput, urlCounter, 400);
        validateModalFormLive();
    });
    }

    function formatAction(action) {
        const map = {
            create_local: 'Создан локально',
            update: 'Изменён',
            delete: 'Удалён (в архив)',
            restore: 'Восстановлен',
        };
        return map[action] || action;
    }

    function showModalError(msg) {
        if (!modalFormError) return;
        modalFormError.textContent = msg;
        modalFormError.classList.remove('hidden');
    }

    function hideModalError() {
        if (!modalFormError) return;
        modalFormError.textContent = '';
        modalFormError.classList.add('hidden');
    }

    function renderHistory(changes) {
        historyBody.innerHTML = '';

        if (!changes || changes.length === 0) {
            historyBody.innerHTML = `<div class="history-empty">История пуста.</div>`;
            return;
    }

    changes.forEach(c => {
        const when = c.changed_at ? new Date(c.changed_at).toLocaleString() : '—';
        const actionText = formatAction(c.action);

    
        const beforeName = c.before?.name;
        const afterName = c.after?.name;

        const beforePrice = c.before?.price;
        const afterPrice = c.after?.price;

        const diffLines = [];
        if (beforeName !== undefined && afterName !== undefined && beforeName !== afterName) {
            diffLines.push(`Название: "${beforeName}" → "${afterName}"`);
        }
        if (beforePrice !== undefined && afterPrice !== undefined && beforePrice !== afterPrice) {
            diffLines.push(`Цена: ${beforePrice} → ${afterPrice}`);
        }

        const beforeStock = c.before?.stock;
        const afterStock = c.after?.stock;

        if (beforeStock !== undefined && afterStock !== undefined && beforeStock !== afterStock) {
            const b = (beforeStock === null) ? "—" : beforeStock;
            const a = (afterStock === null) ? "—" : afterStock;
            diffLines.push(`Остаток: ${b} → ${a}`);
        }

        const beforeHidden = c.before?.is_hidden;
        const afterHidden = c.after?.is_hidden;

        if (beforeHidden !== undefined && afterHidden !== undefined && beforeHidden !== afterHidden) {
            const human = (v) => (v ? "Да" : "Нет");
            diffLines.push(`Скрыт: ${human(beforeHidden)} → ${human(afterHidden)}`);
        }

        const beforeImg = c.before?.image_url;
        const afterImg  = c.after?.image_url;

        if (beforeImg !== undefined && afterImg !== undefined && beforeImg !== afterImg) {
            diffLines.push(`URL изображения изменён`);
        }

        let diffHtml = '';

        if (diffLines.length) {
            diffHtml = diffLines.map(x => `<div>• ${x}</div>`).join('');
        } else {
            
        if (c.action !== 'create_local') {
            diffHtml = `<div>• Детали изменений не отображены</div>`;
        }
    }   
        const el = document.createElement('div');
            el.className = 'history-item';
            el.innerHTML = `
            <div class="history-top">
                <span class="history-action">${actionText}</span>
                <span class="history-time">${when}</span>
            </div>
            <div class="history-diff">${diffHtml}</div>
            `;
            historyBody.appendChild(el);
        });
    }

    if (modalHistoryBtn) {
        modalHistoryBtn.addEventListener('click', async () => {
        if (!modalCurrentOfferId) return;

        try {
            historyBody.innerHTML = 'Загрузка...';

            const resp = await fetch(`/api/products/${encodeURIComponent(modalCurrentOfferId)}/changes?limit=50`, {
                credentials: 'include'
        });

        const data = await resp.json().catch(() => ({}));
            if (!resp.ok) {
                historyBody.innerHTML = `<div class="history-empty">Не удалось загрузить историю.</div>`;
                openHistoryModal();
            return;
        }

            renderHistory(data.changes || []);
            openHistoryModal();
            } catch (e) {
            console.error('History load error', e);
            historyBody.innerHTML = `<div class="history-empty">Ошибка загрузки истории.</div>`;
            openHistoryModal();
        }
        });
    }

    function showAuthForms() {
        authFormsDiv.classList.remove('hidden');
        authStatusDiv.classList.add('hidden');
        productsContainer.classList.add('hidden');
        filtersDiv.classList.add('hidden');
        paginationDiv.classList.add('hidden');
        if (topActions) topActions.classList.add('hidden');

        if (syncLogsContainer) {
        syncLogsContainer.classList.add('hidden');
        }
        if (syncLogsBody) {
        syncLogsBody.innerHTML = '';
        }
        if (loadFromDbBtn) loadFromDbBtn.classList.add('hidden');
        if (emptyDbMessage) emptyDbMessage.classList.add('hidden');
        hideDashboardUI();
    }

    function applyRoleUI() {
    const isAdmin = currentUserRole === "admin";


     const addBtn = document.getElementById("addProductBtn");
     const logsContainer = document.getElementById("syncLogsContainer");

     if (addBtn) addBtn.style.display = isAdmin ? "inline-block" : "none";
     if (logsContainer) logsContainer.style.display = isAdmin ? "block" : "none";

     if (tabArchive) tabArchive.style.display = isAdmin ? "inline-flex" : "none";
     if (archiveEmpty) archiveEmpty.classList.add('hidden');
     const tabsContainer = document.querySelector('.tabs');
     if (tabsContainer) tabsContainer.style.display = isAdmin ? "flex" : "none";

     if (!isAdmin && currentListMode !== 'active') {
     setTab('active');
     }

     
    }

    function applyRoleToModal() {
    const isAdmin = currentUserRole === "admin";

    const saveBtn = document.getElementById("modalSaveBtn");
    const deleteBtn = document.getElementById("modalDeleteBtn");
    const historyBtn = document.getElementById("modalHistoryBtn");

    if (saveBtn) saveBtn.style.display = isAdmin ? "inline-block" : "none";
    if (deleteBtn) deleteBtn.style.display = isAdmin ? "inline-block" : "none";
    if (historyBtn) historyBtn.style.display = isAdmin ? "inline-block" : "none";
    
    
    }

    function showLoggedInState(username) {

        if (topActions) topActions.classList.remove('hidden');

        // обе кнопки всегда видимы
        if (loadFromDbBtn) loadFromDbBtn.classList.remove('hidden');
        getProductsBtn.classList.remove('hidden');

        if (emptyDbMessage) emptyDbMessage.classList.add('hidden');
        authFormsDiv.classList.add('hidden');
        if (loadFromDbBtn) loadFromDbBtn.classList.remove('hidden');
        if (emptyDbMessage) emptyDbMessage.classList.add('hidden');
        authStatusDiv.classList.remove('hidden');
        welcomeMessageSpan.textContent = `Добро пожаловать, ${username}!`;

        errorMessage.classList.add('hidden');
        loginErrorDiv.style.display = 'none';
        registerErrorDiv.style.display = 'none';

    }

    function displayError(element, message) {
        element.textContent = message;
        element.style.display = 'block';
    }

    function hideError(element) {
        element.style.display = 'none';
    }

    function renderProducts(products) {
  productsList.innerHTML = '';

  if (!products || products.length === 0) {
    productsList.innerHTML = '<li>Товары не найдены.</li>';
    return;
  }

  products.forEach(product => {
    const listItem = document.createElement('li');
    const imageUrl = product.image_url;

    const showBadges = (currentUserRole === 'admin');

    const manualBadge = (showBadges && product.is_manual)
        ? `<span class="manual-badge" title="Товар отредактирован вручную">✎</span>`
        : '';

    const isLocal = (product.source === 'local') || String(product.offer_id || '').startsWith('LOCAL-');

    const localBadge = (showBadges && isLocal)
        ? `<span class="local-badge" title="Локальный товар (создан вручную)">LOCAL</span>`
        : '';

    const thumbHtml = imageUrl
      ? `<img src="${imageUrl}" alt="${product.name}" class="product-thumbnail"
            onerror="this.closest('.product-thumb').classList.add('no-image'); this.remove();">`
      : `
        <div class="no-image-icon">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" stroke-width="1.6">
            <rect x="3" y="5" width="18" height="14" rx="2"></rect>
            <circle cx="8" cy="10" r="2"></circle>
            <path d="M21 15l-5-5L5 21"></path>
          </svg>
        </div>
      `;

        listItem.innerHTML = `
            ${manualBadge}
            ${localBadge}

            <div class="product-thumb ${imageUrl ? '' : 'no-image'}">
            ${thumbHtml}
            </div>

            <div class="product-info">
                <span class="product-name">${product.name}</span>
                <span class="product-offer-id">ID: ${product.offer_id}</span>
            </div>

            <span class="product-price">${product.price ?? '—'} RUB</span>
            `;

            listItem.dataset.offerId = product.offer_id;
            listItem.addEventListener('click', () => {
            if (product.offer_id) loadProductDetail(product.offer_id);
            });

            productsList.appendChild(listItem);
        });
    }

    if (dashboardToggle) {
        dashboardToggle.addEventListener('click', async () => {
            dashboardPanel.classList.toggle('open');

            if (dashboardPanel.classList.contains('open')) {
                await loadDashboardStats();
            }
        });
    }

    async function loadDashboardStats() {
    try {
        const response = await fetch('/api/dashboard_stats', {
            credentials: 'include'
        });

        if (!response.ok) return;

        const data = await response.json();

        document.getElementById('statTotal').textContent = data.total;
        document.getElementById('statHidden').textContent = data.hidden;
        document.getElementById('statManual').textContent = data.manual;
        document.getElementById('statOutOfStock').textContent = data.out_of_stock;
        document.getElementById('statAvgPrice').textContent = data.avg_price + ' ₽';

    } catch (err) {
        console.error("Ошибка загрузки аналитики:", err);
    }
}

    function updatePaginationControls(page, total) {
        currentPage = page;
        totalPages = total;

        if (totalPages <= 1) {
            paginationDiv.classList.add('hidden');
            return;
        }

        paginationDiv.classList.remove('hidden');
        pageInfoSpan.textContent = `Страница ${page} из ${total}`;

        prevPageBtn.disabled = page <= 1;
        nextPageBtn.disabled = page >= total;
    }

    async function loadSyncLogs() {
    try {
        const response = await fetch('/api/sync_logs?limit=10', {
            credentials: 'include'
        });

        if (!response.ok) {
            console.warn('Не удалось загрузить логи синхронизации, статус:', response.status);
            return;
        }

        const data = await response.json();
        const logs = data.logs || [];

        syncLogsBody.innerHTML = '';

        if (logs.length === 0) {
            const row = document.createElement('tr');
            const cell = document.createElement('td');
            cell.colSpan = 5;
            cell.textContent = 'История синхронизаций пока пуста.';
            cell.classList.add('sync-empty');
            row.appendChild(cell);
            syncLogsBody.appendChild(row);
        } else {
            logs.forEach(log => {
                const tr = document.createElement('tr');

                const tdStart = document.createElement('td');
                const tdFinish = document.createElement('td');
                const tdStatus = document.createElement('td');
                const tdCount = document.createElement('td');
                const tdError = document.createElement('td');

                tdStart.textContent = log.started_at
                    ? new Date(log.started_at).toLocaleString()
                    : '—';

                tdFinish.textContent = log.finished_at
                    ? new Date(log.finished_at).toLocaleString()
                    : '—';

                const statusText = log.status === 'success'
                    ? 'Успех'
                    : (log.status === 'error' ? 'Ошибка' : log.status);

                tdStatus.textContent = statusText;
                tdStatus.classList.add('sync-status');
                if (log.status === 'success') {
                    tdStatus.classList.add('sync-status-success');
                } else if (log.status === 'error') {
                    tdStatus.classList.add('sync-status-error');
                }

                tdCount.textContent = log.updated_count ?? 0;

                if (log.error_message) {
                    tdError.textContent =
                        log.error_message.length > 120
                            ? log.error_message.slice(0, 117) + '…'
                            : log.error_message;
                } else {
                    tdError.textContent = '—';
                }

                tr.appendChild(tdStart);
                tr.appendChild(tdFinish);
                tr.appendChild(tdStatus);
                tr.appendChild(tdCount);
                tr.appendChild(tdError);

                syncLogsBody.appendChild(tr);
            });
        }

        if (currentUserRole === "admin") {
            syncLogsContainer.classList.remove('hidden');
        } else {
            syncLogsContainer.classList.add('hidden');
        }
    } catch (e) {
        console.error('Ошибка при загрузке логов синхронизации:', e);
    }
}

    function openProductModal() {
        productModal.classList.remove('hidden');
    }

    function closeProductModal() {
        productModal.classList.add('hidden');
    }

    modalClose.addEventListener('click', closeProductModal);

    // Закрытие по клику на фон
    productModal.addEventListener('click', (e) => {
        if (e.target === productModal) {
            closeProductModal();
        }
    });

    // Закрытие по Esc
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && !productModal.classList.contains('hidden')) {
            closeProductModal();
        }
    });

    async function loadProductDetail(offerId) {
    try {
        const response = await fetch(`/api/products/${encodeURIComponent(offerId)}`, {
            credentials: 'include'
        });

        if (!response.ok) {
            const errData = await response.json().catch(() => ({}));
            throw new Error(errData.message || `HTTP error! Status: ${response.status}`);
        }

        const data = await response.json();

        modalMode = (currentListMode === 'archive') ? 'view' : 'edit';
        modalCurrentOfferId = data.offer_id;

        modalTitle.textContent = 'Редактирование товара';

        modalNameInput.value = data.name || '';
        modalOfferIdInput.value = data.offer_id || '';
        modalProductIdInput.value = data.product_id || '';
        modalPriceInput.value = data.price != null ? data.price : '';
        if (modalStockInput) {
            const stockValue = (data.stock !== null && data.stock !== undefined) ? data.stock : '';
            modalStockInput.value = stockValue;

            if (Number(stockValue) === 0) {
                modalStockInput.classList.add('out-of-stock');
            } else {
                modalStockInput.classList.remove('out-of-stock');
            }
        }
        modalImageUrlInput.value = data.image_url || '';

        updateCounter(modalNameInput, nameCounter, 120);
        if (modalImageUrlInput) updateCounter(modalImageUrlInput, urlCounter, 400);
        validateModalFormLive();

        if (data.image_url) {
            modalImage.src = data.image_url;
            modalImage.style.display = 'block';
        } else {
            modalImage.style.display = 'none';
        }

        if (data.last_synced) {
            const d = new Date(data.last_synced);
            modalLastSynced.textContent = d.toLocaleString();
        } else {
            modalLastSynced.textContent = '—';
        }

        const isViewOnly = modalMode === 'view';

        // Заголовок
        modalTitle.textContent = isViewOnly
            ? 'Просмотр товара (архив)'
            : 'Редактирование товара';

        // readonly режим
        modalNameInput.readOnly = isViewOnly;
        modalOfferIdInput.readOnly = true;   // всегда readonly
        modalProductIdInput.readOnly = true; // всегда readonly
        modalPriceInput.readOnly = isViewOnly;
        if (modalStockInput) modalStockInput.readOnly = isViewOnly;
        modalImageUrlInput.readOnly = isViewOnly;

        // Кнопки
        if (isViewOnly) {
            modalSaveBtn.style.display = 'none';
            modalDeleteBtn.style.display = 'none';
            if (modalHistoryBtn) modalHistoryBtn.style.display = (currentUserRole === "admin") ? "inline-block" : "none";
        } else {
            applyRoleToModal();
        }
        if (modalHistoryBtn) modalHistoryBtn.style.display = 'inline-flex';
        if (modalDeleteBtn) modalDeleteBtn.style.display = 'inline-flex';
        openProductModal();
    } catch (error) {
        console.error('Ошибка при загрузке детального товара:', error);
        alert('Не удалось загрузить подробную информацию о товаре.');
    }
}

    function closeSyncOptionsModal() {
        if (syncOptionsModal) syncOptionsModal.classList.add('hidden');
    }

    if (syncOptionsClose) {
        syncOptionsClose.addEventListener('click', closeSyncOptionsModal);
    }

    if (cancelSyncBtn) {
        cancelSyncBtn.addEventListener('click', closeSyncOptionsModal);
    }

    // закрытие по клику на фон
    if (syncOptionsModal) {
        syncOptionsModal.addEventListener('click', (e) => {
            if (e.target === syncOptionsModal) {
                closeSyncOptionsModal();
            }
        });
    }

// закрытие по Esc
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && syncOptionsModal && !syncOptionsModal.classList.contains('hidden')) {
        closeSyncOptionsModal();
    }
});

    async function isDbEmpty() {
        const params = new URLSearchParams();
        params.append('page', 1);
        params.append('per_page', 1);

        // сортировка любая, пусть будет как по умолчанию
        try {
            const response = await fetch(`/api/products_local?${params.toString()}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                return null; // не смогли проверить
            }

            const data = await response.json().catch(() => ({}));
            const totalItems = typeof data.total_items === 'number' ? data.total_items : null;
            return totalItems === 0;
        } catch (e) {
            console.error('Ошибка проверки пустоты БД:', e);
            return null;
        }
    }

    //Загрузка товаров из БД с фильтрами и пагинацией
    async function loadProductsWithFilters(page = 1) {
        hideError(errorMessage);
        loadingMessage.classList.remove('hidden');
        productsList.innerHTML = '';

        const params = new URLSearchParams();

        if (searchInput.value.trim() !== '') {
            params.append('q', searchInput.value.trim());
        }
        if (minPriceInput.value !== '') {
            params.append('min_price', minPriceInput.value);
        }
        if (maxPriceInput.value !== '') {
            params.append('max_price', maxPriceInput.value);
        }

        params.append('include_hidden', currentListMode === 'archive' ? 1 : 0);
        params.append('sort_by', sortBySelect.value);
        params.append('sort_dir', sortDirSelect.value);

        params.append('page', page);
        params.append('per_page', PER_PAGE);

        params.append('page', page);
        params.append('per_page', PER_PAGE);

        try {
            const response = await fetch(`/api/products_local?${params.toString()}`, {
                credentials: 'include'
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
            }

            const data = await response.json();
            loadingMessage.classList.add('hidden');
            productsContainer.classList.remove('hidden');
            filtersDiv.classList.remove('hidden');
            showDashboardUI();

            if (archiveEmpty) {
                if (currentListMode === 'archive' && (!data.products || data.products.length === 0)) {
                    archiveEmpty.classList.remove('hidden');
                } else {
                    archiveEmpty.classList.add('hidden');
                }
            }

            renderProducts(data.products);
            updatePaginationControls(data.page, data.total_pages);
        } catch (error) {
            console.error('Ошибка при получении товаров:', error);
            loadingMessage.classList.add('hidden');
            displayError(errorMessage, 'Произошла ошибка при загрузке товаров: ' + error.message);
            paginationDiv.classList.add('hidden');
        }
    }

    if (toggleLoginPassword) {
    toggleLoginPassword.addEventListener('change', () => {
        loginPasswordInput.type = toggleLoginPassword.checked ? 'text' : 'password';
    });
    }

    function setTab(mode) {
        currentListMode = mode; // 'active' or 'archive'
        currentPage = 1;

    // кнопки вкладок
        if (tabActive && tabArchive) {
            tabActive.classList.toggle('tab-active', mode === 'active');
            tabArchive.classList.toggle('tab-active', mode === 'archive');
        }

    // кнопка "Добавить товар" только в обычном списке и только админу
        const isAdmin = currentUserRole === "admin";
        if (addProductBtn) {
            addProductBtn.style.display = (mode === 'active' && isAdmin) ? "inline-block" : "none";
        }

    // грузим список
        loadProductsWithFilters(1);
    }

    if (tabActive) tabActive.addEventListener('click', () => setTab('active'));
    if (tabArchive) tabArchive.addEventListener('click', () => setTab('archive'));

    // Проверка статуса авторизации при загрузке страницы 
    async function checkAuthStatus() {
        try {
            const response = await fetch('/api/auth_status', {
                credentials: 'include'
            });

            if (!response.ok) {
                showAuthForms();
                return;
            }

            const data = await response.json();

            if (data.is_authenticated) {
                currentUserRole = data.role || "user";
                showLoggedInState(data.username);
                applyRoleUI();
            } else {
                currentUserRole = "user";
                showAuthForms();
            }
        } catch (error) {
            console.error('Ошибка проверки статуса авторизации:', error);
            currentUserRole = "user";
            showAuthForms();
        }
    }

    //Обработчики событий авторизации / регистрации 

    showRegisterLink.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        hideError(loginErrorDiv);
        hideError(registerErrorDiv);
    });

    showLoginLink.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.classList.add('hidden');
        loginForm.classList.remove('hidden');
        hideError(loginErrorDiv);
        hideError(registerErrorDiv);
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError(loginErrorDiv);

        const username = loginUsernameInput.value;
        const password = loginPasswordInput.value;

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include',
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                await checkAuthStatus();
            } else {
                displayError(loginErrorDiv, data.message || 'Ошибка входа.');
            }
        } catch (error) {
            console.error('Login error:', error);
            displayError(loginErrorDiv, 'Произошла ошибка при попытке входа.');
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        hideError(registerErrorDiv);

        const username = registerUsernameInput.value;
        const password = registerPasswordInput.value;
        const confirmPassword = confirmPasswordInput.value;

        if (password !== confirmPassword) {
            displayError(registerErrorDiv, 'Пароли не совпадают.');
            return;
        }

        try {
            const response = await fetch('/api/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
                credentials: 'include',
            });

            const data = await response.json().catch(() => ({}));

            if (response.ok) {
                alert('Регистрация прошла успешно! Теперь вы можете войти.');
                showLoginLink.click(); 
                registerUsernameInput.value = '';
                registerPasswordInput.value = '';
                confirmPasswordInput.value = '';
            } else {
                displayError(registerErrorDiv, data.message || 'Ошибка регистрации.');
            }
        } catch (error) {
            console.error('Register error:', error);
            displayError(registerErrorDiv, 'Произошла ошибка при попытке регистрации.');
        }
    });

    logoutBtn.addEventListener('click', async () => {
        try {
            const response = await fetch('/api/logout', {
                credentials: 'include'
            });

            if (response.ok) {
                showAuthForms();
                productsList.innerHTML = '';
                alert('Вы вышли из аккаунта.');
            } else {
                alert('Не удалось выйти из аккаунта.');
            }
        } catch (error) {
            console.error('Logout error:', error);
            alert('Произошла ошибка при выходе.');
        }
    });

    if (confirmSyncBtn) {
        confirmSyncBtn.addEventListener('click', async () => {
            const overwriteManual = (overwriteManualCheckbox && overwriteManualCheckbox.checked) ? 1 : 0;
            const overwriteHidden = (overwriteHiddenCheckbox && overwriteHiddenCheckbox.checked) ? 1 : 0;

            closeSyncOptionsModal();

            // прячем сообщение "БД пустая", если было
            if (emptyDbMessage) emptyDbMessage.classList.add('hidden');

            hideError(errorMessage);
            loadingMessage.classList.remove('hidden');
            productsList.innerHTML = '';

            try {
                const url = `/api/products?overwrite_manual=${overwriteManual}&overwrite_hidden=${overwriteHidden}`;

                const response = await fetch(url, {
                    credentials: 'include'
                });

                if (response.status === 401) {
                    const errorData = await response.json().catch(() => ({}));
                    displayError(errorMessage, errorData.message || 'Вы не авторизованы. Пожалуйста, войдите.');
                    showAuthForms();
                    return;
                }

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}));
                    throw new Error(errorData.message || `HTTP error! Status: ${response.status}`);
                }

                await response.json().catch(() => ({}));

                // после синхры — показываем актуальные (не архив)
                currentListMode = 'active';
                if (tabActive && tabArchive) {
                    tabActive.classList.add('tab-active');
                    tabArchive.classList.remove('tab-active');
                }

                await loadProductsWithFilters(1);
                await loadSyncLogs();
                filtersDiv.classList.remove('hidden');

            } catch (error) {
                console.error('Ошибка при синхронизации товаров:', error);
                displayError(errorMessage, 'Произошла ошибка при синхронизации: ' + error.message);
            } finally {
                loadingMessage.classList.add('hidden');

                // оставляем обе кнопки видимыми
                if (loadFromDbBtn) loadFromDbBtn.classList.remove('hidden');
                getProductsBtn.classList.remove('hidden');
            }
        });
    }

    // --- Синхронизация товаров с Ozon ---
    getProductsBtn.addEventListener('click', () => {
    if (overwriteManualCheckbox) overwriteManualCheckbox.checked = false;
    if (overwriteHiddenCheckbox) overwriteHiddenCheckbox.checked = false;

    if (syncOptionsModal) syncOptionsModal.classList.remove('hidden');
    });

    // Обработчики фильтров и пагинации
    applyFiltersBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loadProductsWithFilters(1);
    });

    prevPageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage > 1) {
            loadProductsWithFilters(currentPage - 1);
        }
    });

    nextPageBtn.addEventListener('click', (e) => {
        e.preventDefault();
        if (currentPage < totalPages) {
            loadProductsWithFilters(currentPage + 1);
        }
    });

    addProductBtn.addEventListener('click', () => {
        modalMode = 'create';
        modalCurrentOfferId = null;

        modalTitle.textContent = 'Новый товар';
        modalNameInput.value = '';
        modalOfferIdInput.value = '';
        modalProductIdInput.value = '';
        modalPriceInput.value = '';

        if (modalStockInput) {
            modalStockInput.value = '';
            modalStockInput.classList.remove('out-of-stock'); 
        }

        modalImageUrlInput.value = '';
        modalLastSynced.textContent = '—';
        modalImage.style.display = 'none';
        updateCounter(modalNameInput, nameCounter, 120);
        if (modalImageUrlInput) updateCounter(modalImageUrlInput, urlCounter, 400);
        validateModalFormLive();
        applyRoleToModal();

        if (modalHistoryBtn) modalHistoryBtn.style.display = 'none';
        if (modalDeleteBtn) modalDeleteBtn.style.display = 'none';

        openProductModal();
    });

    modalSaveBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    hideModalError();

    const nameVal = modalNameInput.value.trim();
    const offerVal = modalOfferIdInput.value.trim();
    const productIdVal = modalProductIdInput.value.trim();
    const imageUrlVal = modalImageUrlInput.value.trim();
    const stockValRaw = modalStockInput ? modalStockInput.value.trim() : "";

    if (nameVal.length === 0) {
        showModalError('Название товара обязательно.');
        return;
    }
    if (nameVal.length > 120) {
        showModalError('Название слишком длинное. Максимум 120 символов.');
        return;
    }
    if (offerVal.length > 80) {
        showModalError('Offer ID слишком длинный. Максимум 80 символов.');
        return;
    }
    if (productIdVal.length > 20) {
        showModalError('Product ID слишком длинный. Максимум 20 символов.');
        return;
    }
    if (imageUrlVal.length > 400) {
        showModalError('URL изображения слишком длинный. Максимум 400 символов.');
        return;
    }
    if (stockValRaw.length > 0) {
        const n = Number(stockValRaw);
    if (!Number.isInteger(n) || n < 0) {
        showModalError('Остаток должен быть целым числом (0 или больше).');
        return;
    }
    }

    const payload = {
        name: modalNameInput.value.trim(),
        offer_id: modalOfferIdInput.value.trim() || null,
        product_id: modalProductIdInput.value.trim() || null,
        price: modalPriceInput.value !== '' ? parseFloat(modalPriceInput.value) : null,
        stock: (modalStockInput && modalStockInput.value !== '')
            ? parseInt(modalStockInput.value, 10)
            : null,
        image_url: modalImageUrlInput.value.trim() || null,
    };

    if (!payload.name) {
        showModalError('Название товара обязательно.');
        return;
    }

    try {
        let url;
        let method;

        if (modalMode === 'create') {
            url = '/api/products_local';
            method = 'POST';
        } else {
            url = `/api/products_local/${encodeURIComponent(modalCurrentOfferId)}`;
            method = 'PUT';
        }

        const response = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload),
            credentials: 'include'
        });

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            alert(data.message || 'Ошибка при сохранении товара.');
            return;
        }

        closeProductModal();
        await loadProductsWithFilters(currentPage);
    } catch (err) {
        console.error('Ошибка при сохранении товара:', err);
        alert('Произошла ошибка при сохранении товара.');
    }
    });

    modalDeleteBtn.addEventListener('click', async (e) => {
    e.preventDefault();

    if (!modalCurrentOfferId) {
        return;
    }

    if (!confirm('Вы действительно хотите удалить этот товар?')) {
        return;
    }

    try {
        const response = await fetch(
            `/api/products_local/${encodeURIComponent(modalCurrentOfferId)}`,
            {
                method: 'DELETE',
                credentials: 'include'
            }
        );

        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
            alert(data.message || 'Ошибка при удалении товара.');
            return;
        }

        closeProductModal();
        await loadProductsWithFilters(currentPage);
    } catch (err) {
        console.error('Ошибка при удалении товара:', err);
        alert('Произошла ошибка при удалении товара.');
    }
    });

    if (loadFromDbBtn) {
    loadFromDbBtn.addEventListener('click', async () => {
        hideError(errorMessage);
        if (emptyDbMessage) emptyDbMessage.classList.add('hidden');

        loadingMessage.classList.remove('hidden');

        const empty = await isDbEmpty();

        loadingMessage.classList.add('hidden');

        if (empty === true) {
            // База пустая — предлагаем синхронизацию
            if (emptyDbMessage) emptyDbMessage.classList.remove('hidden');
            getProductsBtn.classList.remove('hidden');
            productsContainer.classList.add('hidden');
            filtersDiv.classList.add('hidden');
            paginationDiv.classList.add('hidden');
            return;
        }

        if (empty === null) {
            displayError(errorMessage, 'Не удалось проверить базу данных. Попробуйте ещё раз.');
            return;
        }

        // В базе есть данные — показываем список
        await loadProductsWithFilters(1);
        await loadSyncLogs();
    });
    }


    checkAuthStatus();
});
