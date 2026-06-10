/* -------------------------------------------------------------------------
   ФУНКЦИИ АУТЕНТИФИКАЦИИ
------------------------------------------------------------------------- */

function redirectByRole(userData) {
    const role = userData.role;
    if (role === 'student')       window.location.href = '../pages/student-profile.html';
    else if (role === 'teacher')  window.location.href = '../pages/teacher-monitor.html';
    else if (role === 'admin')    window.location.href = '../pages/admin-panel.html';
    else                          window.location.href = '../index.html';
}

/**
 * Обработка входа — сначала проверяет localStorage,
 * затем автоматически подгружает аккаунты из Google Sheets
 */
async function handleLogin(event) {
    event.preventDefault();

    const email    = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const remember = document.querySelector('input[name="remember"]')?.checked || false;

    // Показываем индикатор загрузки
    const submitBtn = event.target.querySelector('button[type="submit"]');
    const originalText = submitBtn ? submitBtn.textContent : '';
    if (submitBtn) {
        submitBtn.textContent = '⏳ Жүктелуде...';
        submitBtn.disabled = true;
    }

    try {
        // loginFromSheets: сначала проверяет localStorage,
        // если не нашёл — загружает из Google Sheets и пробует снова
        const userData = await authServer.loginFromSheets(email, password);

        if (userData) {
            if (remember) localStorage.setItem('rememberMe', 'true');

            showNotification(`Сәтті кірдіңіз, ${userData.name}!`, 'success');
            console.log('👤 Вошел пользователь:', userData.name, '| Роль:', userData.role);

            setTimeout(() => { window.location.href = '../index.html'; }, 500);
        } else {
            showNotification('Email немесе пароль қате!', 'error');
            console.warn('❌ Неверные учетные данные');
        }
    } finally {
        if (submitBtn) {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }
}

/**
 * Обработка регистрации
 */
function handleRegister(event) {
    event.preventDefault();

    const fullName        = document.getElementById('fullName').value.trim();
    const email           = document.getElementById('email').value.trim();
    const password        = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const role            = document.querySelector('input[name="role"]:checked')?.value;

    if (!fullName || !email || !password || !confirmPassword || !role) {
        showNotification('Барлық өрістерін толтырыңыз!', 'error');
        return;
    }
    if (password.length < 6) {
        showNotification('Пароль кемінде 6 таңба болуы керек!', 'error');
        return;
    }
    if (password !== confirmPassword) {
        showNotification('Пароли сәйкес емес!', 'error');
        return;
    }

    const result = authServer.register(fullName, email, password, role);

    if (result.error) {
        showNotification(result.error, 'error');
        return;
    }

    showNotification(`${fullName}, сәтті тіркелдіңіз!`, 'success');
    console.log('✅ Новый пользователь зарегистрирован:', result);

    authServer.login(email, password);
    setTimeout(() => { window.location.href = '../index.html'; }, 500);
}

function loginWithGoogle() {
    showNotification('Google арқылы кіру әзірге іске асырылмаған', 'info');
}

function loginWithGithub() {
    showNotification('GitHub арқылы кіру әзірге іске асырылмаған', 'info');
}

function showNotification(message, type = 'info') {
    if (type === 'error')        alert('❌ ' + message);
    else if (type === 'success') alert('✅ ' + message);
    else                         alert('ℹ️ ' + message);
}

function handleLogout() {
    if (confirm('Шығуға сіз сенімдісіз бе?')) {
        const currentUser = authServer.getCurrentUser();
        authServer.logout();

        const userProfile = document.getElementById('userProfile');
        const authButtons = document.getElementById('authButtons');
        if (userProfile && authButtons) {
            userProfile.style.display = 'none';
            authButtons.style.display = 'flex';
        }

        showNotification(`${currentUser?.name} сәтті шықты!`, 'info');
        console.log('👋 Пользователь вышел из системы');

        const isSubPage = window.location.pathname.includes('/pages/');
        if (isSubPage) {
            setTimeout(() => window.location.href = '../index.html', 500);
        }
    }
}

function loadUserProfile() {
    // Если profile.js уже загрузил профиль — не дублируем
    if (window._profileAlreadyLoaded) return;
    const userData = authServer.getCurrentUser();
    if (userData && typeof updateUserProfile === 'function') {
        updateUserProfile(userData);
        console.log('📱 Профиль загружен:', userData.name, '| Роль:', userData.role);
    }
}

window.addEventListener('load', loadUserProfile);

window.addEventListener('load', function () {
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) btnLogout.addEventListener('click', handleLogout);
});