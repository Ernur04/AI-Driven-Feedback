/* =========================================================================
   ADMIN USERS PAGE — JavaScript Logic
   Управление пользователями через Google Sheets
   ========================================================================= */

let allUsers = [];  // Кэш всех пользователей

/* =========================================================================
   ИНИЦИАЛИЗАЦИЯ
   ========================================================================= */
document.addEventListener('DOMContentLoaded', () => {
    checkAdminAccess();
    loadUsersFromSheets();
    bindEventListeners();
});

function checkAdminAccess() {
    const user = JSON.parse(localStorage.getItem('userProfile') || '{}');
    if (user && (user.name || user.email)) {
        document.getElementById('profileNameBig').textContent = user.name || 'Админ';
        document.getElementById('profileRoleBig').textContent = 'Администратор';
    }
}

/* =========================================================================
   ЗАГРУЗКА ПОЛЬЗОВАТЕЛЕЙ ИЗ GOOGLE SHEETS
   ========================================================================= */
async function loadUsersFromSheets() {
    showLoadingState();

    const result = await getAllUsersFromSheets();

    if (result.success && result.users && result.users.length > 0) {
        allUsers = result.users;
        renderUsersTable(allUsers);
        updateStats(allUsers);
        enableControls();
    } else {
        // Если таблица пустая, больше не грузим фейковых юзеров из localStorage
        allUsers = [];
        renderUsersTable(allUsers);
        showEmptyState(); // <-- resets text to "Empty database"
        updateStats(allUsers);
        enableControls();
    }
}

/* =========================================================================
   РЕНДЕР ТАБЛИЦЫ
   ========================================================================= */
function renderUsersTable(users) {
    const tbody = document.querySelector('#usersTable tbody');
    const emptyRow = document.getElementById('emptyRowState');

    if (!users || users.length === 0) {
        emptyRow.style.display = '';
        return;
    }

    emptyRow.style.display = 'none';

    // Удаляем старые строки (кроме emptyRow)
    const existing = tbody.querySelectorAll('tr:not(#emptyRowState)');
    existing.forEach(r => r.remove());

    users.forEach(user => {
        const tr = document.createElement('tr');
        tr.dataset.rowIndex = user.rowIndex;
        const passwordId = `pass_${user.rowIndex}`;
        const avatarHTML = createAvatarHTML(user.name, 'user-avatar-small');
        tr.innerHTML = `
            <td class="user-id-cell">${shortId(user.id)}</td>
            <td>
                <div class="user-cell">
                    ${avatarHTML}
                    <span class="user-name-text">${escHtml(user.name)}</span>
                </div>
            </td>
            <td>${escHtml(user.email)}</td>
            <td>${formatDate(user.registeredAt)}</td>
            <td>
                <div class="password-cell">
                    <input type="password" id="${passwordId}" value="${escHtml(user.password || '')}" readonly style="border:none;background:transparent;font-size:13px;font-family:monospace;">
                    <button type="button" class="btn-show-password" onclick="togglePasswordVisibility('${passwordId}')" style="background:none;border:none;cursor:pointer;padding:4px 8px;color:#3b82f6;">
                        <i class="fa-solid fa-eye"></i>
                    </button>
                </div>
            </td>
            <td><span class="role-badge role-${user.role}">${roleLabel(user.role)}</span></td>
            <td>
                <div class="action-btns">
                    <button class="btn-action-edit"   onclick="openEditModal(${user.rowIndex}, '${escAttr(user.name)}', '${escAttr(user.role)}')">                
                        <i class="fa-solid fa-pen"></i>
                    </button>
                    <button class="btn-action-delete" onclick="confirmDelete(${user.rowIndex}, '${escAttr(user.name)}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </div>
            </td>`;
        tbody.appendChild(tr);
    });
}

/* =========================================================================
   СТАТИСТИКА
   ========================================================================= */
function updateStats(users) {
    document.getElementById('totalUsersCount').textContent = users.length;

    const now = Date.now();
    const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const newCount = users.filter(u => new Date(u.registeredAt).getTime() > weekAgo).length;
    document.getElementById('newUsersCount').textContent = newCount;

    // Active = случайное число для демонстрации
    const active = Math.min(users.length, Math.floor(users.length * 0.6) + 1);
    document.getElementById('activeUsersCount').textContent = active;
}

/* =========================================================================
   СОСТОЯНИЯ ЗАГРУЗКИ
   ========================================================================= */
function showLoadingState() {
    const tbody = document.querySelector('#usersTable tbody');
    const emptyRow = document.getElementById('emptyRowState');
    emptyRow.querySelector('p').textContent = 'Google Sheets-тен деректер жүктелуде...';
    emptyRow.querySelector('span').textContent = 'Бірнеше секунд күте тұрыңыз';
    emptyRow.style.display = '';
}

function showEmptyState() {
    const emptyRow = document.getElementById('emptyRowState');
    emptyRow.querySelector('p').textContent = 'Деректер қоры бос';
    emptyRow.querySelector('span').textContent = 'Жаңа қолданушыларды қосқан кезде олардың мәліметтері автоматты түрде осы жерге жинақталады.';
    emptyRow.style.display = '';
}

function enableControls() {
    document.getElementById('userSearchInput').disabled = false;
    document.getElementById('roleFilter').disabled = false;
    document.getElementById('exportExcelBtn').disabled = false;
}

/* =========================================================================
   ПОИСК И ФИЛЬТРАЦИЯ
   ========================================================================= */
function filterUsers() {
    const search = document.getElementById('userSearchInput').value.toLowerCase().trim();
    const role   = document.getElementById('roleFilter').value;

    const filtered = allUsers.filter(u => {
        const matchSearch = !search ||
            (u.name  || '').toLowerCase().includes(search) ||
            (u.email || '').toLowerCase().includes(search);
        const matchRole = role === 'all' || u.role === role;
        return matchSearch && matchRole;
    });

    renderUsersTable(filtered);
}

/* =========================================================================
   ДОБАВЛЕНИЕ НОВОГО ПОЛЬЗОВАТЕЛЯ (через модальное окно)
   ========================================================================= */
async function handleAddUser(event) {
    event.preventDefault();

    const name     = document.getElementById('newUserName').value.trim();
    const email    = document.getElementById('newUserEmail').value.trim();
    const role     = document.getElementById('newUserRole').value;
    const password = document.getElementById('newUserPassword').value;

    if (!name || !email || !role || !password) {
        showToast('Барлық өрістерді толтырыңыз!', 'error');
        return;
    }

    const newUser = {
        id:           `${role}_${Date.now()}`,
        name,
        email,
        role,
        password,
        registeredAt: new Date().toISOString()
    };

    // Сохраняем в localStorage
    const stored = JSON.parse(localStorage.getItem('mockUsers') || '{"students":[],"teachers":[],"admins":[]}');
    if (role === 'student')  stored.students.push(newUser);
    else if (role === 'teacher') stored.teachers.push(newUser);
    else if (role === 'admin')   stored.admins.push(newUser);
    localStorage.setItem('mockUsers', JSON.stringify(stored));

    // Синхронизируем с Google Sheets
    const result = await syncAddUser(newUser);

    closeModal('addUserModal');
    document.getElementById('addUserForm').reset();

    if (result.success) {
        showToast(`${name} сәтті қосылды ✅`, 'success');
    } else {
        showToast(`${name} қосылды (Sheets синхронизациясында қате)`, 'warning');
    }

    await loadUsersFromSheets();
}

/* =========================================================================
   РЕДАКТИРОВАНИЕ ПОЛЬЗОВАТЕЛЯ
   ========================================================================= */
function openEditModal(rowIndex, currentName, currentRole) {
    // Найдём текущего пользователя в allUsers
    const currentUser = allUsers.find(u => u.rowIndex === rowIndex);
    const currentPassword = currentUser?.password || '';

    // Создаём модальное окно редактирования динамически
    const existing = document.getElementById('editUserModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'editUserModal';
    modal.className = 'modal-overlay';
    modal.style.display = 'flex';
    modal.innerHTML = `
        <div class="modal-window glass-premium">
            <div class="modal-header">
                <h3><i class="fa-solid fa-user-pen"></i> Пайдаланушыны өзгерту</h3>
                <button class="modal-close-btn" onclick="closeModal('editUserModal')">&times;</button>
            </div>
            <form class="modal-form" onsubmit="saveUserEdit(event, ${rowIndex})">
                <div class="modal-form-group">
                    <label>Аты-жөні</label>
                    <div class="modal-input-wrapper">
                        <i class="fa-solid fa-user"></i>
                        <input type="text" id="editUserName" value="${escHtml(currentName)}" required>
                    </div>
                </div>
                <div class="modal-form-group">
                    <label>Рөлі</label>
                    <div class="modal-input-wrapper">
                        <i class="fa-solid fa-user-tag"></i>
                        <select id="editUserRole">
                            <option value="student"  ${currentRole === 'student'  ? 'selected' : ''}>Студент</option>
                            <option value="teacher"  ${currentRole === 'teacher'  ? 'selected' : ''}>Мұғалім</option>
                            <option value="admin"    ${currentRole === 'admin'    ? 'selected' : ''}>Администратор</option>
                        </select>
                    </div>
                </div>
                <div class="modal-form-group">
                    <label>Құпия сөз</label>
                    <div class="modal-input-wrapper">
                        <i class="fa-solid fa-lock"></i>
                        <input type="text" id="editUserPassword" value="${escHtml(currentPassword)}" placeholder="Құпия сөзді енгізіңіз">
                    </div>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn-modal-cancel" onclick="closeModal('editUserModal')">Бас тарту</button>
                    <button type="submit" class="btn-modal-submit"><i class="fa-solid fa-check"></i> Сақтау</button>
                </div>
            </form>
        </div>`;
    document.body.appendChild(modal);
}

async function saveUserEdit(event, rowIndex) {
    event.preventDefault();
    const name = document.getElementById('editUserName').value.trim();
    const role = document.getElementById('editUserRole').value;
    const password = document.getElementById('editUserPassword').value.trim();

    const result = await syncUpdateUser(rowIndex, { name, role, password });
    closeModal('editUserModal');

    if (result.success) {
        showToast('Өзгерістер сақталды ✅', 'success');
    } else {
        showToast('Сақтауда қате болды ❌', 'error');
    }
    await loadUsersFromSheets();
}

/* =========================================================================
   УДАЛЕНИЕ ПОЛЬЗОВАТЕЛЯ
   ========================================================================= */
async function confirmDelete(rowIndex, userName) {
    if (!confirm(`"${userName}" пайдаланушысын жою керек пе?`)) return;

    const result = await syncDeleteUser(rowIndex);

    if (result.success) {
        showToast(`${userName} жойылды ✅`, 'success');
        await loadUsersFromSheets();
    } else {
        showToast('Жоюда қате болды ❌', 'error');
    }
}

/* =========================================================================
   МОДАЛЬНОЕ ОКНО
   ========================================================================= */
function openModal(id) {
    document.getElementById(id).style.display = 'flex';
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.style.display = 'none';
}

/* =========================================================================
   TOAST УВЕДОМЛЕНИЯ
   ========================================================================= */
function showToast(message, type = 'info') {
    let toast = document.getElementById('adminToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'adminToast';
        toast.style.cssText = `
            position:fixed; bottom:24px; right:24px; z-index:9999;
            padding:14px 22px; border-radius:12px; font-weight:600;
            font-family:Inter,sans-serif; font-size:14px;
            box-shadow:0 8px 32px rgba(0,0,0,0.3);
            transition:all 0.3s ease; opacity:0; transform:translateY(20px);`;
        document.body.appendChild(toast);
    }

    const colors = {
        success: 'background:#10b98133;border:1px solid #10b981;color:#10b981',
        error:   'background:#ef444433;border:1px solid #ef4444;color:#ef4444',
        warning: 'background:#f5973233;border:1px solid #f59732;color:#f59732',
        info:    'background:#3b82f633;border:1px solid #3b82f6;color:#3b82f6'
    };

    toast.setAttribute('style', toast.style.cssText + colors[type] || colors.info);
    toast.textContent = message;
    setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 10);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(20px)'; }, 3000);
}

/* =========================================================================
   ПРИВЯЗКА СОБЫТИЙ
   ========================================================================= */
function bindEventListeners() {
    // Открыть/закрыть модальное окно добавления
    document.getElementById('openModalBtn')?.addEventListener('click', () => openModal('addUserModal'));
    document.getElementById('closeModalBtn')?.addEventListener('click', () => closeModal('addUserModal'));
    document.getElementById('cancelModalBtn')?.addEventListener('click', () => closeModal('addUserModal'));

    // Форма добавления
    document.getElementById('addUserForm')?.addEventListener('submit', handleAddUser);

    // Экспорт в Excel
    document.getElementById('exportExcelBtn')?.addEventListener('click', exportUsersToExcel);

    // Поиск и фильтр
    document.getElementById('userSearchInput')?.addEventListener('input', filterUsers);
    document.getElementById('roleFilter')?.addEventListener('change', filterUsers);

    // Фильтр в select — исправляем значения
    const roleFilter = document.getElementById('roleFilter');
    if (roleFilter) {
        roleFilter.innerHTML = `
            <option value="all">Барлық рөлдер</option>
            <option value="student">Студент</option>
            <option value="teacher">Мұғалім</option>
            <option value="admin">Администратор</option>`;
    }

    // Закрытие модалки по клику вне
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', e => {
            if (e.target === overlay) overlay.style.display = 'none';
        });
    });
}

/* =========================================================================
   ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
   ========================================================================= */
function shortId(id) {
    if (!id) return '—';
    return String(id).slice(0, 8) + '...';
}

function roleLabel(role) {
    return { student: 'Студент', teacher: 'Мұғалім', admin: 'Админ' }[role] || role;
}

function formatDate(iso) {
    if (!iso) return '—';
    try {
        // Если это уже дата или число, просто форматируем
        const date = new Date(iso);
        if (isNaN(date.getTime())) {
            // Если парсинг не сработал, возвращаем исходное значение
            return String(iso).slice(0, 10);
        }
        return date.toLocaleDateString('ru-RU', { day:'2-digit', month:'2-digit', year:'numeric' });
    } catch { 
        return String(iso || '—').slice(0, 10);
    }
}

function escHtml(str) {
    return String(str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function escAttr(str) {
    return String(str || '').replace(/'/g, "\\'");
}

/* =========================================================================
   ПОКАЗ/СКРЫТИЕ ПАРОЛЯ
   ========================================================================= */
function togglePasswordVisibility(inputId) {
    const input = document.getElementById(inputId);
    const btn = event.target.closest('.btn-show-password');
    
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
    } else {
        input.type = 'password';
        btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }
}

/* =========================================================================
   ЭКСПОРТ В EXCEL
   ========================================================================= */
function exportUsersToExcel() {
    if (!allUsers || allUsers.length === 0) {
        showToast('Экспортқалық деректер жоқ!', 'warning');
        return;
    }

    // Заголовки таблицы
    const headers = ['ID', 'Аты-жөні', 'Email', 'Тіркелген күні', 'Құпия сөз', 'Рөлі'];
    
    // Подготовка данных
    const rows = allUsers.map(user => [
        user.id,
        user.name,
        user.email,
        formatDate(user.registeredAt),
        user.password || '',
        roleLabel(user.role)
    ]);

    // Создание CSV
    let csv = headers.map(h => `"${h}"`).join(',') + '\n';
    rows.forEach(row => {
        csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',') + '\n';
    });

    // Создание BLOB и скачивание
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
    link.setAttribute('download', `users_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showToast('Пайдаланушылар экспортталды ✅', 'success');
}

console.log('👥 Admin Users JS загружен');
