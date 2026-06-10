// Обновление профиля пользователя
function updateUserProfile(userData) {
  const nameElement = document.getElementById("userName");
  const roleElement = document.getElementById("userRole");

  if (nameElement) nameElement.textContent = userData.name;
  if (roleElement) {
    roleElement.textContent =
      userData.role === "student" ? "Студент" :
      userData.role === "teacher" ? "Мұғалім" : "Админ";
  }

  // ── Аватарки ──────────────────────────────────────────────────────────────
  if (userData.name) {

    // 1. Маленькая иконка в хедере — обновляем на месте (без мерцания)
    const smallAvatarEl = document.getElementById('userAvatarSmall');
    if (smallAvatarEl) {
      const initials = getInitials(userData.name);
      const colors   = getAvatarColors(userData.name);
      smallAvatarEl.textContent = initials;
      smallAvatarEl.style.backgroundColor = colors.bg;
      smallAvatarEl.style.color = colors.text;
      smallAvatarEl.style.display = 'flex';
      smallAvatarEl.title = userData.name;
    }

    // 2. Аватарка в дропдауне — обновляем на месте через replaceAvatarElement
    replaceAvatarElement('userAvatar', userData.name, 'avatar');

    // 3. Большая аватарка в сайдбаре — тоже обновляем на месте
    replaceAvatarElement('profileAvatarBig', userData.name, 'avatar-large');
  }

  // ── Имя и роль в сайдбаре ─────────────────────────────────────────────────
  const nameBig = document.getElementById('profileNameBig');
  if (nameBig) nameBig.textContent = userData.name;

  const roleBig = document.getElementById('profileRoleBig');
  if (roleBig) {
    roleBig.textContent =
      userData.role === "student" ? "Студент" :
      userData.role === "teacher" ? "Мұғалім" : "Админ";
  }

  // ── Показываем профиль, скрываем кнопки входа ─────────────────────────────
  const authButtons = document.getElementById("authButtons");
  if (authButtons) authButtons.style.display = "none";

  const wrapper = document.getElementById("userProfileWrapper");
  if (wrapper) wrapper.style.display = "flex";

  // ── Динамические ссылки меню по роли ──────────────────────────────────────
  const profileMenu = document.querySelector('.profile-menu');
  if (profileMenu) {
    // Проверяем, нужно ли обновлять ссылки (если роль не изменилась — пропускаем)
    const existingLinks = document.querySelectorAll('.dynamic-role-link');
    const currentRoleAttr = profileMenu.getAttribute('data-current-role');
    if (currentRoleAttr === userData.role && existingLinks.length > 0) {
      // Ссылки уже созданы для этой роли — ничего не делаем
    } else {
      const oldBtnProfile = document.getElementById('btnProfile');
      if (oldBtnProfile) oldBtnProfile.remove();
      existingLinks.forEach(el => el.remove());

      profileMenu.setAttribute('data-current-role', userData.role);

      const isSubPage = window.location.pathname.includes('/pages/');
      const basePath  = isSubPage ? '' : 'pages/';

      let linksHtml = '';
      if (userData.role === 'admin') {
        linksHtml += `<a href="${basePath}admin-panel.html" class="profile-btn dynamic-role-link" style="text-decoration:none;display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-gauge"></i> Профиль</a>`;
        linksHtml += `<a href="${basePath}admin-users.html" class="profile-btn dynamic-role-link" style="text-decoration:none;display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-users"></i> Пайдаланушылар тізімі</a>`;
        linksHtml += `<a href="${basePath}admin-line.html" class="profile-btn dynamic-role-link" style="text-decoration:none;display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-chart-line"></i> Статистика</a>`;
      } else if (userData.role === 'teacher') {
        linksHtml += `<a href="${basePath}teacher-monitor.html" class="profile-btn dynamic-role-link" style="text-decoration:none;display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-user-shield"></i> Профиль</a>`;
        linksHtml += `<a href="${basePath}teacher-students.html" class="profile-btn dynamic-role-link" style="text-decoration:none;display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-users"></i> Студенттер тізімі</a>`;
        linksHtml += `<a href="${basePath}teacher-analytics.html" class="profile-btn dynamic-role-link" style="text-decoration:none;display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-chart-line"></i> Аналитика</a>`;
      } else {
        linksHtml += `<a href="${basePath}student-profile.html" class="profile-btn dynamic-role-link" style="text-decoration:none;display:flex;align-items:center;gap:10px;"><i class="fa-solid fa-user"></i> Профиль</a>`;
      }

      const logoutBtn = document.getElementById('btnLogout');
      if (logoutBtn) logoutBtn.insertAdjacentHTML('beforebegin', linksHtml);
    }
  }
}

// Переключение дропдауна
document.getElementById('profileTrigger')?.addEventListener('click', function(e) {
  e.stopPropagation();
  const dropdown = document.getElementById('userProfile');
  if (dropdown) {
    dropdown.style.display = dropdown.style.display === 'none' ? 'flex' : 'none';
  }
});

// Закрытие при клике вне
document.addEventListener("click", function(e) {
  const dropdown = document.getElementById("userProfile");
  const trigger  = document.getElementById("profileTrigger");
  if (dropdown && dropdown.style.display === "flex") {
    if (!dropdown.contains(e.target) && !trigger.contains(e.target)) {
      dropdown.style.display = "none";
    }
  }
});

// Заполнение формы данными из Google Sheets или LocalStorage
async function fillProfileForm() {
  const savedProfileStr = localStorage.getItem("userProfile");
  if (!savedProfileStr) return;
  
  let currentProfile = JSON.parse(savedProfileStr);
  let profileData = currentProfile;

  // Попытка получить свежие данные из Google Sheets
  if (typeof getAllUsersFromSheets === 'function') {
    // Отображаем состояние загрузки в полях (по желанию)
    const inputName = document.getElementById("inputName");
    if (inputName) inputName.placeholder = "Загрузка...";

    const sheetData = await getAllUsersFromSheets();
    if (sheetData && sheetData.success && sheetData.users) {
      const userInSheet = sheetData.users.find(u => u.email === currentProfile.email || u.id === currentProfile.id);
      if (userInSheet) {
        profileData = userInSheet;
        // Обновляем локальные данные для консистентности
        localStorage.setItem("userProfile", JSON.stringify(profileData));
        updateUserProfile(profileData);
      }
    }
  }

  // Заполняем форму
  const inputName = document.getElementById("inputName");
  const inputEmail = document.getElementById("inputEmail");
  const inputRole = document.getElementById("inputRole");
  const inputPhone = document.getElementById("inputPhone");
  const currentPasswordEl = document.getElementById("currentPassword");
  
  if (inputName) inputName.value = profileData.name || '';
  if (inputEmail) inputEmail.value = profileData.email || '';
  if (inputPhone) inputPhone.value = profileData.phone || '';
  if (currentPasswordEl) currentPasswordEl.value = profileData.password || '';
  if (inputRole) {
    inputRole.value = 
      profileData.role === "student" ? "Student" :
      profileData.role === "teacher" ? "Teacher" : 
      profileData.role === "admin" ? "Administrator" : profileData.role || '';
  }
}

// Функция для красивых уведомлений
function showProfileToast(message, type = 'success') {
    let toast = document.getElementById('profileToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'profileToast';
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
    };

    toast.setAttribute('style', toast.style.cssText + colors[type]);
    toast.textContent = message;
    setTimeout(() => { toast.style.opacity = '1'; toast.style.transform = 'translateY(0)'; }, 10);
    setTimeout(() => { toast.style.opacity = '0'; toast.style.transform = 'translateY(20px)'; }, 3000);
}

// Обработка отправки формы
function setupProfileFormSubmit() {
  const form = document.getElementById("profileEditForm");
  if (!form) return;

  form.addEventListener("submit", async function(e) {
      e.preventDefault();
      const saveBtn = form.querySelector(".save-btn");
      let originalHTML = "";
      if (saveBtn) {
          originalHTML = saveBtn.innerHTML;
          saveBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Сақталуда...';
          saveBtn.disabled = true;
      }

      const savedProfileStr = localStorage.getItem("userProfile");
      if (!savedProfileStr) return;
      let currentProfile = JSON.parse(savedProfileStr);

      const inputName = document.getElementById("inputName");
      const newPassword = document.getElementById("newPassword");
      const currentPasswordEl = document.getElementById("currentPassword");
      const inputPhone = document.getElementById("inputPhone");
          
      const newName = inputName ? inputName.value.trim() : currentProfile.name;
      const newPass = newPassword ? newPassword.value.trim() : "";
      const newPhone = inputPhone ? inputPhone.value.trim() : currentProfile.phone;

      currentProfile.name = newName;
      currentProfile.phone = newPhone;
      if (newPass) currentProfile.password = newPass;

      // Updating Google Sheets!
      let success = true;
      if (typeof syncUpdateUser === 'function') {
          let sheetRowIndex = currentProfile.rowIndex;
             
          // Если rowIndex нет, находим его
          if (!sheetRowIndex && typeof getAllUsersFromSheets === 'function') {
              const sheetData = await getAllUsersFromSheets();
              if (sheetData && sheetData.success && sheetData.users) {
                  const u = sheetData.users.find(u => u.email === currentProfile.email || u.id === currentProfile.id);
                  if (u) sheetRowIndex = u.rowIndex;
              }
          }

          if (sheetRowIndex) {
              const result = await syncUpdateUser(sheetRowIndex, { name: newName, password: newPass, role: currentProfile.role, phone: newPhone });
              if (!result.success) success = false;
              else currentProfile.rowIndex = sheetRowIndex;
          } else {
              // Если пользователя вообще нет в таблице, добавим его как нового
              const result = await syncAddUser({
                  id: currentProfile.id,
                  name: newName,
                  email: currentProfile.email,
                  password: newPass || currentProfile.password,
                  role: currentProfile.role,
                  registeredAt: currentProfile.registeredAt,
                  phone: newPhone
              });
              if (!result.success) success = false;
          }
      }

      // Сохраняем локально, если успешно
      if (success) {
          localStorage.setItem("userProfile", JSON.stringify(currentProfile));
          updateUserProfile(currentProfile);
          showProfileToast("Өзгерістер сәтті сақталды!", "success");
          if (newPassword) newPassword.value = '';
          if (currentPasswordEl) currentPasswordEl.value = currentProfile.password || '';
      } else {
          showProfileToast("Сақтауда қате болды ❌", "error");
      }

      if (saveBtn) {
          saveBtn.innerHTML = originalHTML;
          saveBtn.disabled = false;
      }
  });
}

// Загрузка профиля
// Загрузка профиля (Сразу при чтении скрипта, чтобы избежать мигания/FOUC)
// Выполняем проверку localStorage немедленно
(function() {
    try {
        const savedProfileStr = localStorage.getItem("userProfile");
        if (savedProfileStr) {
            // Если есть в localStorage, прячем кнопки входа до полной загрузки,
            // чтобы не было мигания (FOUC)
            const style = document.createElement('style');
            style.innerHTML = '#authButtons { display: none !important; } #userProfileWrapper { display: flex !important; }';
            document.head.appendChild(style);
        }
    } catch (e) {}
})();

// Когда DOM готов
document.addEventListener("DOMContentLoaded", function() {
    const savedProfileStr = localStorage.getItem("userProfile");
    if (savedProfileStr) {
        const savedProfile = JSON.parse(savedProfileStr);
        updateUserProfile(savedProfile);
    }
});

// Дополнительная загрузка по window.load (Формы, Sheets и т.д.)
window.addEventListener("load", function() {
  window._profileAlreadyLoaded = true; // Флаг чтобы auth.js не дублировал
  fillProfileForm();
  setupProfileFormSubmit();
});

// Показать/скрыть пароль в профиле
window.toggleProfilePassword = function(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    
    if (input.type === 'password') {
        input.type = 'text';
        btn.innerHTML = '<i class="fa-solid fa-eye-slash"></i>';
    } else {
        input.type = 'password';
        btn.innerHTML = '<i class="fa-solid fa-eye"></i>';
    }
};

// Выход
document.getElementById("btnLogout")?.addEventListener("click", function() {
  localStorage.removeItem("userProfile");
  const wrapper = document.getElementById("userProfileWrapper");
  if (wrapper) wrapper.style.display = "none";
  document.getElementById("authButtons").style.display = "flex";
  document.getElementById("userProfile").style.display = "none";
  document.querySelectorAll('.dynamic-role-link').forEach(el => el.remove());

  const smallAvatar = document.getElementById('userAvatarSmall');
  if (smallAvatar) {
    smallAvatar.innerHTML = '<i class="fa-solid fa-user"></i>';
    smallAvatar.style.display = 'flex';
  }
});