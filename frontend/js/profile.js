// Обновление профиля пользователя
function updateUserProfile(userData) {
  const nameElement = document.getElementById("userName");
  const roleElement = document.getElementById("userRole");
  
  if (nameElement) nameElement.textContent = userData.name;
  if (roleElement) {
    roleElement.textContent =
      userData.role === "student"
        ? "Студент"
        : userData.role === "teacher"
          ? "Мұғалім"
          : "Админ";
  }

  // Обновление аватаров (если они есть на странице)
  if (userData.photo) {
    const smallAvatar = document.getElementById('userAvatarSmall');
    if (smallAvatar) smallAvatar.src = userData.photo;
    const headerAvatar = document.getElementById('userAvatar');
    if (headerAvatar) headerAvatar.src = userData.photo;
    const bigAvatar = document.getElementById('profileAvatarBig');
    if (bigAvatar) bigAvatar.src = userData.photo;
  }

  // Обновление имен и ролей в статус-баре/сайдбаре
  const nameBig = document.getElementById('profileNameBig');
  if (nameBig) nameBig.textContent = userData.name;
  
  const roleBig = document.getElementById('profileRoleBig');
  if (roleBig) {
    roleBig.textContent =
      userData.role === "student" ? "Студент" :
      userData.role === "teacher" ? "Мұғалім" : "Админ";
  }

  // Скрыть кнопки аутентификации, показать обертку профиля
  const authButtons = document.getElementById("authButtons");
  if (authButtons) authButtons.style.display = "none";
  
  const wrapper = document.getElementById("userProfileWrapper");
  if (wrapper) wrapper.style.display = "flex";
}

// Переключение выпадающего меню
document.getElementById('profileTrigger')?.addEventListener('click', function(e) {
    e.stopPropagation();
    const dropdown = document.getElementById('userProfile');
    if (dropdown) {
        const isHidden = dropdown.style.display === 'none';
        dropdown.style.display = isHidden ? 'flex' : 'none';
    }
});

// Обработчик кнопки "Профиль" (Перенаправление по ролям)
document.getElementById('btnProfile')?.addEventListener('click', function() {
    const savedProfile = localStorage.getItem('userProfile');
    if (!savedProfile) return;
    
    const userData = JSON.parse(savedProfile);
    const role = userData.role;
    
    // Определяем путь к страницам профиля
    const isSubPage = window.location.pathname.includes('/pages/');
    const basePath = isSubPage ? '' : 'pages/';
    
    if (role === 'student') {
        window.location.href = basePath + 'student-profile.html';
    } else if (role === 'teacher') {
        window.location.href = basePath + 'teacher-monitor.html';
    } else if (role === 'admin') {
        window.location.href = basePath + 'admin-panel.html';
    }
});

// Закрытие меню при клике вне его
document.addEventListener("click", function (e) {
  const dropdown = document.getElementById("userProfile");
  const trigger = document.getElementById("profileTrigger");

  if (dropdown && dropdown.style.display === "flex") {
    if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
      dropdown.style.display = "none";
    }
  }
});

// Загрузка профиля при загрузке страницы
window.addEventListener("load", function () {
  const savedProfile = localStorage.getItem("userProfile");
  if (savedProfile) {
    const userData = JSON.parse(savedProfile);
    updateUserProfile(userData);
  } else {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    fetch((window.API_BASE || 'http://localhost:4000') + '/api/users/me', { headers: { 'Authorization': 'Bearer ' + token } })
      .then(res => res.json())
      .then(data => { if (data.user) { localStorage.setItem('userProfile', JSON.stringify(data.user)); updateUserProfile(data.user); } })
      .catch(err => console.warn('Failed to fetch profile', err));
  }
});

// Обработчик кнопки выхода — делегируем на общий обработчик из auth.js
const btnLogoutEl = document.getElementById("btnLogout");
if (btnLogoutEl && !btnLogoutEl.dataset.logoutAttached) {
  btnLogoutEl.addEventListener("click", function () {
    if (typeof window.handleLogout === 'function') return window.handleLogout();
  // fallback: clear tokens and UI
  localStorage.removeItem('accessToken');
  localStorage.removeItem('refreshToken');
  localStorage.removeItem('userProfile');
  const wrapper = document.getElementById("userProfileWrapper");
  if (wrapper) wrapper.style.display = "none";
  const authButtons = document.getElementById("authButtons");
  if (authButtons) authButtons.style.display = "flex";
  const userProfileDropdown = document.getElementById("userProfile");
  if (userProfileDropdown) userProfileDropdown.style.display = "none";
  });
  try { btnLogoutEl.dataset.logoutAttached = '1'; } catch (e) {}
}
