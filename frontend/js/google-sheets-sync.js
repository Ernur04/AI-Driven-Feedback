/* =========================================================================
   GOOGLE SHEETS SYNC MODULE
   Синхронизация аккаунтов с Google Таблицей через Google Apps Script
   ========================================================================= */

/**
 * ⚠️ ВАЖНО: Вставьте URL вашего Google Apps Script сюда после деплоя
 *
 * Шаги:
 * 1. Откройте Google Таблицу → Расширения → Apps Script
 * 2. Вставьте код из файла apps-script-code.txt
 * 3. Нажмите Развернуть → Новое развертывание → Веб-приложение
 * 4. Доступ: "Все, в том числе анонимные"
 * 5. Скопируйте URL и вставьте ниже
 */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwTc2ele6vF3-FYwJLBxTKv57Jr3rn9eqkpBUZbfSedyqWt4nyZASDG89HZOUA_35-wfQ/exec";

/* =========================================================================
   ПРОВЕРКА КОНФИГУРАЦИИ
   ========================================================================= */
function isConfigured() {
  return APPS_SCRIPT_URL && APPS_SCRIPT_URL !== 'YOUR_APPS_SCRIPT_URL_HERE';
}

/* =========================================================================
   ДОБАВИТЬ ПОЛЬЗОВАТЕЛЯ В GOOGLE SHEETS
   Вызывается при регистрации и при добавлении через admin-users
   ========================================================================= */
async function syncAddUser(userData) {
  if (!isConfigured()) {
    console.warn(
      "⚠️ Google Sheets не настроен. Укажите APPS_SCRIPT_URL в google-sheets-sync.js",
    );
    return { success: false, error: "Not configured" };
  }

  try {
    const payload = {
      action: "add",
      id: userData.id || `user_${Date.now()}`,
      name: userData.name || "",
      email: userData.email || "",
      password: userData.password || "",
      role: userData.role || "student",
      registeredAt: userData.registeredAt || new Date().toISOString(),
      phone: userData.phone || "",
    };

    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });

    console.log("✅ Запрос на добавление отправлен:", userData.name);
    return { success: true };
  } catch (err) {
    console.error("❌ Ошибка добавления в Google Sheets:", err);
    return { success: false, error: err.message };
  }
}

/* =========================================================================
   ОБНОВИТЬ ДАННЫЕ ПОЛЬЗОВАТЕЛЯ В GOOGLE SHEETS
   ========================================================================= */
async function syncUpdateUser(rowIndex, updates) {
  if (!isConfigured()) {
    console.warn("⚠️ Google Sheets не настроен.");
    return { success: false, error: "Not configured" };
  }

  try {
    const payload = {
      action: "update",
      rowIndex: rowIndex,
      name: updates.name || "",
      password: updates.password || "",
      role: updates.role || "",
      phone: updates.phone !== undefined ? updates.phone : "",
    };

    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });

    console.log("✅ Запрос на обновление отправлен, строка:", rowIndex);
    return { success: true };
  } catch (err) {
    console.error("❌ Ошибка обновления в Google Sheets:", err);
    return { success: false, error: err.message };
  }
}

/* =========================================================================
   УДАЛИТЬ ПОЛЬЗОВАТЕЛЯ ИЗ GOOGLE SHEETS
   ========================================================================= */
async function syncDeleteUser(rowIndex) {
  if (!isConfigured()) {
    console.warn("⚠️ Google Sheets не настроен.");
    return { success: false, error: "Not configured" };
  }

  try {
    const payload = {
      action: "delete",
      rowIndex: rowIndex,
    };

    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify(payload),
    });

    console.log("✅ Запрос на удаление отправлен, строка:", rowIndex);
    return { success: true };
  } catch (err) {
    console.error("❌ Ошибка удаления из Google Sheets:", err);
    return { success: false, error: err.message };
  }
}

/* =========================================================================
   ПОЛУЧИТЬ ВСЕХ ПОЛЬЗОВАТЕЛЕЙ ИЗ GOOGLE SHEETS
   ========================================================================= */
async function getAllUsersFromSheets() {
  if (!isConfigured()) {
    console.warn(
      "⚠️ Google Sheets не настроен. Возвращаем данные из localStorage.",
    );
    return { success: false, users: [], error: "Not configured" };
  }

  try {
    const response = await fetch(APPS_SCRIPT_URL, {
      method: "GET",
    });

    const result = await response.json();
    if (result.success) {
      console.log(
        `✅ Получено ${result.users.length} пользователей из Google Sheets`,
      );
    }
    return result;
  } catch (err) {
    console.error("❌ Ошибка получения данных из Google Sheets:", err);
    return { success: false, users: [], error: err.message };
  }
}

console.log("📊 Google Sheets Sync модуль загружен");
console.log(
  "🔗 URL настроен:",
  isConfigured() ? "ДА ✅" : "НЕТ ❌ — укажите APPS_SCRIPT_URL",
);
