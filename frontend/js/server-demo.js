/* -------------------------------------------------------------------------
   ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ MOCK AUTH SERVER
------------------------------------------------------------------------- */

/**
 * ПРИМЕРЫ ТЕСТОВЫХ АККАУНТОВ
 * 
 * Студенты:
 * Email: ernur@example.com, Пароль: password123
 * Email: aida@example.com, Пароль: password123
 * Email: damir@example.com, Пароль: password123
 * 
 * Учителя:
 * Email: oleg@example.com, Пароль: password123
 * Email: marina@example.com, Пароль: password123
 * 
 * Администраторы:
 * Email: admin@example.com, Пароль: admin123
 */

// ===== ФУНКЦИИ ДЛЯ ТЕСТИРОВАНИЯ =====

/**
 * Получить всех студентов
 */
function getStudents() {
    const students = authServer.getAllStudents();
    console.table(students);
    return students;
}

/**
 * Получить всех учителей
 */
function getTeachers() {
    const teachers = authServer.getAllTeachers();
    console.table(teachers);
    return teachers;
}

/**
 * Получить всех администраторов
 */
function getAdmins() {
    const admins = authServer.getAllAdmins();
    console.table(admins);
    return admins;
}

/**
 * Получить статистику
 */
function getStats() {
    const stats = authServer.getStatistics();
    console.log('📊 СТАТИСТИКА:');
    console.table(stats);
    return stats;
}

/**
 * Получить текущего пользователя
 */
function getCurrentUser() {
    const user = authServer.getCurrentUser();
    console.log('👤 Текущий пользователь:', user);
    return user;
}

/**
 * Выполнить тестовый вход (для консоли)
 */
function testLogin(email, password) {
    console.log(`🔐 Попытка входа с ${email}...`);
    const result = authServer.login(email, password);
    if (result) {
        console.log('✅ Вход успешен! Данные пользователя:');
        console.table(result);
    } else {
        console.log('❌ Вход не удался! Неверные учетные данные.');
    }
    return result;
}

/**
 * Выполнить тестовую регистрацию
 */
function testRegister(name, email, password, role) {
    console.log(`📝 Попытка регистрации ${name}...`);
    const result = authServer.register(name, email, password, role);
    if (result.error) {
        console.log('❌ Ошибка регистрации:', result.error);
    } else {
        console.log('✅ Регистрация успешна! Новый пользователь:');
        console.table(result);
    }
    return result;
}

/**
 * Сбросить всех пользователей на значения по умолчанию
 */
function resetServer() {
    console.warn('⚠️ Сброс сервера на значения по умолчанию...');
    authServer.resetToDefault();
    console.log('✅ Сервер сброшен! Текущая статистика:');
    getStats();
}

/**
 * Очистить все данные
 */
function clearServer() {
    console.warn('⚠️ ОЧИСТКА ВСЕх ДАННЫХ!');
    authServer.clearAll();
    console.log('✅ Все данные удалены!');
}

// ===== ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ =====

/**
 * Просмотреть профиль пользователя по ID
 */
function viewUserProfile(userId) {
    const user = authServer.getUserById(userId);
    if (user) {
        console.log(`📋 Профиль пользователя ${userId}:`);
        console.table(user);
    } else {
        console.log('❌ Пользователь не найден!');
    }
    return user;
}

/**
 * Обновить информацию пользователя
 */
function updateUser(userId, updates) {
    console.log(`📝 Обновление профиля ${userId}...`);
    const updated = authServer.updateProfile(userId, updates);
    if (updated) {
        console.log('✅ Профиль обновлен!');
        console.table(updated);
    } else {
        console.log('❌ Не удалось обновить профиль!');
    }
    return updated;
}

// ===== ПРИМЕРЫ ИСПОЛЬЗОВАНИЯ =====

/**
 * Запустить демонстрацию
 */
function runDemo() {
    console.clear();
    console.log('🚀 === ДЕМОНСТРАЦИЯ MOCK AUTH SERVER ===\n');

    console.log('1️⃣ ТЕКУЩАЯ СТАТИСТИКА:');
    getStats();
    console.log('\n');

    console.log('2️⃣ СПИСОК СТУДЕНТОВ:');
    getStudents();
    console.log('\n');

    console.log('3️⃣ СПИСОК УЧИТЕЛЕЙ:');
    getTeachers();
    console.log('\n');

    console.log('4️⃣ СПИСОК АДМИНИСТРАТОРОВ:');
    getAdmins();
    console.log('\n');

    console.log('5️⃣ ТЕСТОВЫЙ ВХОД (студент):');
    testLogin('ernur@example.com', 'password123');
    console.log('\n');

    console.log('6️⃣ ТЕКУЩИЙ ПОЛЬЗОВАТЕЛЬ:');
    getCurrentUser();
    console.log('\n');

    console.log('✅ Демонстрация завершена!');
}

// ===== КОМАНДЫ ДЛЯ КОНСОЛИ =====

console.log(`
╔═══════════════════════════════════════════════════════════╗
║       MOCK AUTH SERVER - ДОСТУПНЫЕ КОМАНДЫ               ║
╚═══════════════════════════════════════════════════════════╝

📊 Статистика и просмотр:
  • getStudents()          - Показать всех студентов
  • getTeachers()          - Показать всех учителей
  • getAdmins()            - Показать всех администраторов
  • getStats()             - Показать общую статистику
  • getCurrentUser()       - Показать текущего пользователя
  • viewUserProfile(id)    - Просмотреть профиль пользователя

🔐 Аутентификация:
  • testLogin(email, password)           - Тестовый вход
  • testRegister(name, email, pwd, role) - Тестовая регистрация

🔧 Управление:
  • resetServer()          - Сбросить на значения по умолчанию
  • clearServer()          - Очистить все данные
  • updateUser(id, obj)    - Обновить профиль пользователя

🎮 Демонстрация:
  • runDemo()              - Запустить демонстрацию

🧪 ТЕСТОВЫЕ АККАУНТЫ:

📚 Студенты:
   Email: ernur@example.com    | Пароль: password123
   Email: aida@example.com     | Пароль: password123
   Email: damir@example.com    | Пароль: password123

👨‍🏫 Учителя:
   Email: oleg@example.com     | Пароль: password123
   Email: marina@example.com   | Пароль: password123

🔐 Администраторы:
   Email: admin@example.com    | Пароль: admin123

═══════════════════════════════════════════════════════════
`);
