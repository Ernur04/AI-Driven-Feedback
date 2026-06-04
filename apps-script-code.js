// =============================================================================
// GOOGLE APPS SCRIPT — AI-Driven Feedback Platform
// =============================================================================
// КАК ИСПОЛЬЗОВАТЬ:
// 1. Откройте Google Таблицу → Расширения → Apps Script
// 2. Удалите весь существующий код
// 3. Скопируйте и вставьте весь этот код
// 4. Нажмите Ctrl+S, чтобы сохранить
// 5. Нажмите "Развернуть" → "Новое развертывание"
// 6. Тип: "Веб-приложение"
//    Выполнять как: "Я (ваш аккаунт)"
//    Кто имеет доступ: "Все пользователи" (Все, в том числе анонимные)
// 7. Нажмите "Развернуть" → скопируйте URL
// =============================================================================

const SHEET_NAME = 'Sheet1'; // Имя листа в вашей таблице

// -----------------------------------------------------------------------------
// doPost — обрабатывает POST запросы (добавить, обновить, удалить)
// -----------------------------------------------------------------------------
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];

    // --- ДОБАВИТЬ пользователя ---
    if (data.action === 'add') {
      sheet.appendRow([
        data.id           || '',
        data.name         || '',
        data.email        || '',
        data.password     || '',
        data.role         || 'student',
        data.registeredAt || new Date().toISOString(),
        data.phone ? ("'" + data.phone) : ''
      ]);
      return respond({ success: true, message: 'User added' });
    }

    // --- ОБНОВИТЬ пользователя ---
    if (data.action === 'update') {
      const rowIndex = parseInt(data.rowIndex);
      if (data.name) sheet.getRange(rowIndex, 2).setValue(data.name);
      if (data.password) sheet.getRange(rowIndex, 4).setValue(data.password);
      if (data.role) sheet.getRange(rowIndex, 5).setValue(data.role);
      if (data.phone !== undefined) {
         const phoneVal = data.phone ? ("'" + data.phone) : '';
         sheet.getRange(rowIndex, 7).setValue(phoneVal);
      }
      return respond({ success: true, message: 'User updated' });
    }

    // --- УДАЛИТЬ пользователя ---
    if (data.action === 'delete') {
      const rowIndex = parseInt(data.rowIndex);
      sheet.deleteRow(rowIndex);
      return respond({ success: true, message: 'User deleted' });
    }

    return respond({ success: false, error: 'Unknown action: ' + data.action });

  } catch (err) {
    return respond({ success: false, error: err.toString() });
  }
}

// -----------------------------------------------------------------------------
// doGet — обрабатывает GET запросы (получить всех пользователей)
// -----------------------------------------------------------------------------
function doGet(e) {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(SHEET_NAME) || ss.getSheets()[0];
    const rows = sheet.getDataRange().getValues();

    // Пропускаем строку с заголовками (строка 1)
    const users = rows.slice(1)
      .map((row, index) => {
        return {
          rowIndex:     index + 2,
          id:           String(row[0] || '').trim(),
          name:         String(row[1] || '').trim(),
          email:        String(row[2] || '').trim(),
          password:     String(row[3] || '').trim(),
          role:         String(row[4] || '').trim(),
          registeredAt: String(row[5] || '').trim(),
          phone:        String(row[6] || '').trim()
        };
      })
      .filter(u => (u.id && u.id !== '') || (u.email && u.email !== '')); // убираем пустые строки

    return respond({ success: true, users: users, total: users.length });

  } catch (err) {
    return respond({ success: false, users: [], error: err.toString() });
  }
}

// -----------------------------------------------------------------------------
// Вспомогательная функция для ответа
// -----------------------------------------------------------------------------
function respond(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
