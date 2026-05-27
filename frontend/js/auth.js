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

    // Попытка входа через сервер
    const userData = authServer.login(email, password);
    
    if (userData) {
        // Сохранение профиля если отмечена опция "Помнить"
        if (remember) {
            localStorage.setItem('rememberMe', 'true');
        }
        
        // Уведомление об успешном входе
        showNotification(`Сәтті кірдіңіз, ${userData.name}!`, 'success');
        
        console.log('👤 Вошел пользователь:', userData);
        
        // Перенаправление на главную страницу
        setTimeout(() => {
            window.location.href = '../index.html';
        }, 500);
    } else {
        showNotification('Email немесе пароль қате!', 'error');
        console.warn('❌ Неверные учетные данные');
    }
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

    // Регистрация через сервер
    const result = authServer.register(fullName, email, password, role);

    if (result.error) {
        showNotification(result.error, 'error');
        return;
    }

    // Уведомление об успешной регистрации
    showNotification(`${fullName}, сәтті тіркелдіңіз!`, 'success');
    
    console.log('✅ Новый пользователь зарегистрирован:', result);
    
    // Перенаправление на главную страницу
    setTimeout(() => {
        window.location.href = '../index.html';
    }, 500);
}

/**
 * Вход через Google (заглушка)
 */
function loginWithGoogle() {
    showNotification('Google арқылы кіру әзірге іске асырылмаған', 'info');
    // TODO: Интеграция с Google OAuth
}

/**
 * Вход через GitHub (заглушка)
 */
function loginWithGithub() {
    showNotification('GitHub арқылы кіру әзірге іске асырылмаған', 'info');
    // TODO: Интеграция с GitHub OAuth
}

/**
 * Показать уведомление пользователю
 * @param {string} message - текст сообщения
 * @param {string} type - тип уведомления (success, error, info)
 */
function showNotification(message, type = 'info') {
    // Простой способ с alert (можно заменить на красивый toast)
    if (type === 'error') {
        alert('❌ ' + message);
    } else if (type === 'success') {
        alert('✅ ' + message);
    } else {
        alert('ℹ️ ' + message);
    }
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
    }
}

/**
 * Загрузка профиля при загрузке страницы
 */
function loadUserProfile() {
    const userData = authServer.getCurrentUser();
    if (userData) {
        updateUserProfile(userData);
        console.log('📱 Профиль загружен:', userData.name);
    }
}

// Загрузка профиля при загрузке страницы
window.addEventListener('load', loadUserProfile);

// Обработчик кнопки выхода
window.addEventListener('load', function() {
    const btnLogout = document.getElementById('btnLogout');
    if (btnLogout) {
        btnLogout.addEventListener('click', handleLogout);
    }
});
