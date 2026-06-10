/* -------------------------------------------------------------------------
   ВРЕМЕННЫЙ СЕРВЕР ДЛЯ ДАННЫХ АККАУНТОВ
------------------------------------------------------------------------- */

/**
 * Mock-сервер для управления данными пользователей
 * Использует localStorage для хранения данных
 */
class MockAuthServer {
    constructor() {
        this.users = this.loadUsers();
        this.currentUser = this.loadCurrentUser();
    }

    loadUsers() {
        const saved = localStorage.getItem('mockUsers');
        if (saved) return JSON.parse(saved);
        return this.getDefaultUsers();
    }

    loadCurrentUser() {
        const saved = localStorage.getItem('userProfile');
        return saved ? JSON.parse(saved) : null;
    }

    getDefaultUsers() {
        return {
            students: [],
            teachers: [],
            admins: [
                {
                    id: 'admin_1',
                    name: 'Admin',
                    email: 'admin@example.com',
                    password: 'admin2004',
                    role: 'admin',
                    avatar: '../logo/default-user.png',
                    registeredAt: new Date().toISOString(),
                    permissions: ['manage_users', 'manage_courses', 'manage_reports'],
                    totalUsers: 150,
                    activeUsers: 87
                }
            ]
        };
    }

    saveUsers() {
        localStorage.setItem('mockUsers', JSON.stringify(this.users));
    }

    /**
     * Обычный вход — проверяет только localStorage
     */
    login(email, password) {
        const allUsers = [
            ...this.users.students,
            ...this.users.teachers,
            ...this.users.admins
        ];

        const user = allUsers.find(u => u.email === email && u.password === password);

        if (user) {
            const userData = { ...user };
            delete userData.password;
            this.currentUser = userData;
            localStorage.setItem('userProfile', JSON.stringify(userData));
            return userData;
        }
        return null;
    }

    /**
     * Вход через Google Sheets — загружает пользователей из таблицы,
     * синхронизирует с localStorage, затем выполняет вход.
     * @returns {Promise<Object|null>}
     */
    async loginFromSheets(email, password) {
        // Сначала попробуем войти из локального хранилища
        const localUser = this.login(email, password);
        if (localUser) return localUser;

        // Если не нашли — пробуем загрузить из Google Sheets
        if (typeof getAllUsersFromSheets !== 'function') {
            console.warn('⚠️ Google Sheets модуль не загружен');
            return null;
        }

        try {
            console.log('🔄 Загружаем пользователей из Google Sheets...');
            const result = await getAllUsersFromSheets();

            if (!result.success || !result.users || result.users.length === 0) {
                console.warn('⚠️ Google Sheets вернул пустой список или ошибку');
                return null;
            }

            // Импортируем пользователей из Sheets в localStorage
            result.users.forEach(sheetUser => {
                if (!sheetUser.email || !sheetUser.role) return;

                const allLocal = [
                    ...this.users.students,
                    ...this.users.teachers,
                    ...this.users.admins
                ];

                // Добавляем только если ещё нет в localStorage
                const exists = allLocal.some(u => u.email === sheetUser.email);
                if (!exists) {
                    const userObj = {
                        id:           sheetUser.id || `${sheetUser.role}_${Date.now()}`,
                        name:         sheetUser.name || '',
                        email:        sheetUser.email,
                        password:     sheetUser.password || '',
                        role:         sheetUser.role,
                        avatar:       '../logo/default-user.png',
                        registeredAt: sheetUser.registeredAt || new Date().toISOString()
                    };

                    if (sheetUser.role === 'student')       this.users.students.push(userObj);
                    else if (sheetUser.role === 'teacher')  this.users.teachers.push(userObj);
                    else if (sheetUser.role === 'admin')    this.users.admins.push(userObj);
                }
            });

            this.saveUsers();
            console.log(`✅ Синхронизировано ${result.users.length} пользователей из Google Sheets`);

            // Теперь пробуем войти снова
            return this.login(email, password);

        } catch (err) {
            console.error('❌ Ошибка входа через Google Sheets:', err);
            return null;
        }
    }

    /**
     * Регистрация нового пользователя
     */
    register(name, email, password, role) {
        const allUsers = [
            ...this.users.students,
            ...this.users.teachers,
            ...this.users.admins
        ];

        if (allUsers.some(u => u.email === email)) {
            return { error: 'Бұл email жүйеде тіркелген (бұрын тіркелген)' };
        }

        const newUser = {
            id: `${role}_${Date.now()}`,
            name,
            email,
            password,
            role,
            avatar: '../logo/default-user.png',
            registeredAt: new Date().toISOString()
        };

        if (role === 'student') {
            this.users.students.push(newUser);
        } else if (role === 'teacher') {
            newUser.courses = [];
            newUser.students = 0;
            newUser.rating = 5.0;
            this.users.teachers.push(newUser);
        } else if (role === 'admin') {
            newUser.permissions = ['manage_users', 'manage_courses'];
            newUser.totalUsers = 0;
            newUser.activeUsers = 0;
            this.users.admins.push(newUser);
        }

        this.saveUsers();

        // Синхронизация с Google Sheets
        if (typeof syncAddUser === 'function') {
            syncAddUser(newUser).catch(err => console.warn('Sheets sync failed:', err));
        }

        const userData = { ...newUser };
        delete userData.password;
        this.currentUser = userData;
        localStorage.setItem('userProfile', JSON.stringify(userData));

        return userData;
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('userProfile');
    }

    getAllStudents()  { return this.users.students; }
    getAllTeachers()  { return this.users.teachers; }
    getAllAdmins()    { return this.users.admins; }

    getUserById(id) {
        const allUsers = [...this.users.students, ...this.users.teachers, ...this.users.admins];
        return allUsers.find(u => u.id === id);
    }

    getUserByEmail(email) {
        const allUsers = [...this.users.students, ...this.users.teachers, ...this.users.admins];
        return allUsers.find(u => u.email === email);
    }

    updateProfile(userId, updates) {
        const allUsers = [...this.users.students, ...this.users.teachers, ...this.users.admins];
        const user = allUsers.find(u => u.id === userId);
        if (user) {
            Object.assign(user, updates);
            this.saveUsers();
            return user;
        }
        return null;
    }

    getStatistics() {
        return {
            totalStudents: this.users.students.length,
            totalTeachers: this.users.teachers.length,
            totalAdmins:   this.users.admins.length,
            totalUsers:    this.users.students.length + this.users.teachers.length + this.users.admins.length,
            studentProgress: this.calculateAverageProgress(),
            topTeacher: this.getTopTeacher()
        };
    }

    calculateAverageProgress() {
        if (this.users.students.length === 0) return 0;
        const total = this.users.students.reduce((sum, s) => sum + (s.progress || 0), 0);
        return Math.round(total / this.users.students.length);
    }

    getTopTeacher() {
        if (this.users.teachers.length === 0) return null;
        return this.users.teachers.reduce((top, t) => (t.rating > (top.rating || 0)) ? t : top);
    }

    getCurrentUser()    { return this.currentUser; }
    isAuthenticated()   { return this.currentUser !== null; }

    clearAll() {
        localStorage.removeItem('mockUsers');
        localStorage.removeItem('userProfile');
        this.users = this.getDefaultUsers();
        this.currentUser = null;
    }

    resetToDefault() {
        this.users = this.getDefaultUsers();
        this.saveUsers();
    }
}

const authServer = new MockAuthServer();

if (typeof module !== 'undefined' && module.exports) {
    module.exports = authServer;
}

console.log('✅ Mock Auth Server инициализирован');
console.log('📊 Статистика:', authServer.getStatistics());