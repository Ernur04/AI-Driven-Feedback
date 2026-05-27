/* -------------------------------------------------------------------------
   ФУНКЦИИ АУТЕНТИФИКАЦИИ
------------------------------------------------------------------------- */

/**
 * Обработка входа в систему
 * @param {Event} event - событие отправки формы
 */
function handleLogin(event) {
    event.preventDefault();

    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.querySelector('input[name="remember"]')?.checked || false;
    // Попытка входа через backend API
    fetch((window.API_BASE || 'http://localhost:4000') + '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    }).then(async res => {
        const data = await res.json().catch(()=>({ error: 'Invalid response' }));
        if (!res.ok) return showNotification(data.error || 'Ошибка входа', 'error');
        // Сохраняем токены и профиль
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('userProfile', JSON.stringify(data.user));
        if (remember) localStorage.setItem('rememberMe', 'true');
        showNotification(`Сәтті кірдіңіз, ${data.user.name}!`, 'success');
        console.log('👤 Вошел пользователь:', data.user);
        setTimeout(() => window.location.href = '../index.html', 500);
    }).catch(err => {
        console.error(err);
        showNotification('Серверға қосылу қатесі', 'error');
    });
}

/**
 * Обработка регистрации
 * @param {Event} event - событие отправки формы
 */
function handleRegister(event) {
    event.preventDefault();

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role = document.querySelector('input[name="role"]:checked')?.value;

    // Валидация
    if (!fullName || !email || !password || !confirmPassword || !role) {
        showNotification('Барлық өрістерін толтырыңыз!', 'error');
        return;
    }

    if (password.length < 6) {
        showNotification('Пароль кемінде 6 таңба болуы керек!', 'error');
        return;
    }

    // Проверка пароля
    if (password !== confirmPassword) {
        showNotification('Пароли сәйкес емес!', 'error');
        return;
    }
    // Регистрация через backend API
    fetch((window.API_BASE || 'http://localhost:4000') + '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, email, password, role })
    }).then(async res => {
        const data = await res.json().catch(()=>({ error: 'Invalid response' }));
        if (!res.ok) return showNotification(data.error || 'Ошибка регистрации', 'error');
        localStorage.setItem('accessToken', data.accessToken);
        localStorage.setItem('refreshToken', data.refreshToken);
        localStorage.setItem('userProfile', JSON.stringify(data.user));
        showNotification(`${fullName}, сәтті тіркелдіңіз!`, 'success');
        console.log('✅ Новый пользователь зарегистрирован:', data.user);
        setTimeout(() => window.location.href = '../index.html', 500);
    }).catch(err => {
        console.error(err);
        showNotification('Серверға қосылу қатесі', 'error');
    });
}

/**
 * Вход через Google (заглушка)
 */
function loginWithGoogle() {
    // Redirect to backend OAuth start
    window.location.href = (window.API_BASE || 'http://localhost:4000') + '/api/auth/oauth/google';
}

/**
 * Вход через GitHub (заглушка)
 */
function loginWithGithub() {
    window.location.href = (window.API_BASE || 'http://localhost:4000') + '/api/auth/oauth/github';
}

/**
 * Показать уведомление пользователю
 * @param {string} message - текст сообщения
 * @param {string} type - тип уведомления (success, error, info)
 */
function showNotification(message, type = 'info') {
    // Lightweight non-blocking toast
    const id = 'app-notification-container';
    let container = document.getElementById(id);
    if (!container) {
        container = document.createElement('div');
        container.id = id;
        container.style.position = 'fixed';
        container.style.top = '16px';
        container.style.right = '16px';
        container.style.zIndex = 99999;
        document.body.appendChild(container);
    }
    const el = document.createElement('div');
    el.textContent = message;
    el.style.marginTop = '8px';
    el.style.padding = '10px 14px';
    el.style.borderRadius = '6px';
    el.style.color = '#fff';
    el.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
    el.style.opacity = '1';
    el.style.transition = 'opacity 0.4s';
    if (type === 'error') el.style.background = '#dc2626';
    else if (type === 'success') el.style.background = '#16a34a';
    else el.style.background = '#0ea5e9';
    container.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; setTimeout(() => el.remove(), 400); }, 3500);
}

/**
 * Обновление профиля пользователя на главной странице
 * @param {Object} userData - данные профиля
 */
/* 
   ВНИМАНИЕ: Функция updateUserProfile теперь находится в profile.js 
   для обеспечения единого интерфейса управления профилем на всех страницах.
*/
/*
function updateUserProfile(userData) {
    ... redundant code ...
}
*/

/**
 * Выход из системы
 */
function handleLogout() {
        if (!confirm('Шығуға сіз сенімдісіз бе?')) return;
        const refreshToken = localStorage.getItem('refreshToken');
        fetch((window.API_BASE || 'http://localhost:4000') + '/api/auth/logout', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ refreshToken })
        }).catch(()=>{}).finally(()=>{
            const currentUser = JSON.parse(localStorage.getItem('userProfile') || 'null');
            localStorage.removeItem('accessToken');
            localStorage.removeItem('refreshToken');
            localStorage.removeItem('userProfile');
            localStorage.removeItem('rememberMe');
            const userProfile = document.getElementById('userProfile');
            const authButtons = document.getElementById('authButtons');
            if (userProfile && authButtons) {
                userProfile.style.display = 'none';
                authButtons.style.display = 'flex';
            }
            showNotification(`${currentUser?.name || ''} сәтті шықты!`, 'info');
            console.log('👋 Пользователь вышел из системы');
        });
}

/**
 * Загрузка профиля при загрузке страницы
 */
function loadUserProfile() {
    const userData = localStorage.getItem('userProfile');
    if (userData) {
        const parsed = JSON.parse(userData);
        updateUserProfile(parsed);
        console.log('📱 Профиль загружен:', parsed.name);
    } else {
      // try to fetch from API using access token
      const token = localStorage.getItem('accessToken');
      if (!token) return;
      fetch((window.API_BASE || 'http://localhost:4000') + '/api/users/me', { headers: { 'Authorization': 'Bearer ' + token } })
        .then(res => res.json())
        .then(data => { if (data.user) { localStorage.setItem('userProfile', JSON.stringify(data.user)); updateUserProfile(data.user); } })
        .catch(err => console.warn('Failed to load profile', err));
    }
}

// Загрузка профиля при загрузке страницы
window.addEventListener('load', loadUserProfile);

// Обработчик кнопки выхода
window.addEventListener('load', function() {
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', handleLogout);
        try { btnLogout.dataset.logoutAttached = '1'; } catch (e) {}
    }
});

// expose for other modules (profile.js, etc.)
window.handleLogout = handleLogout;
