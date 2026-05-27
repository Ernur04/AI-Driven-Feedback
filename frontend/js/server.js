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

    /**
     * Загрузить всех пользователей из localStorage
     */
    loadUsers() {
        const saved = localStorage.getItem('mockUsers');
        if (saved) {
            return JSON.parse(saved);
        }
        return this.getDefaultUsers();
    }

    /**
     * Загрузить текущего пользователя
     */
    loadCurrentUser() {
        const saved = localStorage.getItem('userProfile');
        return saved ? JSON.parse(saved) : null;
    }

    /**
     * Получить данные по умолчанию для демонстрации
     */
    getDefaultUsers() {
        return {
            students: [
                {
                    id: 'student_1',
                    name: 'Ernur',
                    email: 'ernur@example.com',
                    password: 'password123',
                    role: 'student',
                    avatar: '../logo/default-user.png',
                    registeredAt: new Date().toISOString()
                },
                {
                    id: 'student_2',
                    name: 'Aida',
                    email: 'aida@example.com',
                    password: 'password123',
                    role: 'student',
                    avatar: '../logo/default-user.png',
                    registeredAt: new Date().toISOString()
                },
                {
                    id: 'student_3',
                    name: 'Damir',
                    email: 'damir@example.com',
                    password: 'password123',
                    role: 'student',
                    avatar: '../logo/default-user.png',
                    registeredAt: new Date().toISOString()
                }
            ],
            teachers: [
                {
                    id: 'teacher_1',
                    name: 'Dr. Oleg',
                    email: 'oleg@example.com',
                    password: 'password123',
                    role: 'teacher',
                    avatar: '../logo/default-user.png',
                    registeredAt: new Date().toISOString(),
                    courses: ['Python', 'Advanced Python'],
                    students: 45,
                    rating: 4.8
                },
                {
                    id: 'teacher_2',
                    name: 'Marina',
                    email: 'marina@example.com',
                    password: 'password123',
                    role: 'teacher',
                    avatar: '../logo/default-user.png',
                    registeredAt: new Date().toISOString(),
                    courses: ['JavaScript', 'Web Development'],
                    students: 32,
                    rating: 4.9
                }
            ],
            admins: [
                {
                    id: 'admin_1',
                    name: 'Admin',
                    email: 'admin@example.com',
                    password: 'admin123',
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

    /**
     * Сохранить пользователей в localStorage
     */
    saveUsers() {
        localStorage.setItem('mockUsers', JSON.stringify(this.users));
    }

    /**
     * Авторизация пользователя
     * @param {string} email - Email пользователя
     * @param {string} password - Пароль
     * @returns {Object|null} - Данные пользователя или null
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
     * Регистрация нового пользователя
     * @param {string} name - Имя
     * @param {string} email - Email
     * @param {string} password - Пароль
     * @param {string} role - Роль (student, teacher, admin)
     * @returns {Object|null} - Новый пользователь или null если ошибка
     */
    register(name, email, password, role) {
        // Проверка на существующий email
        const allUsers = [
            ...this.users.students,
            ...this.users.teachers,
            ...this.users.admins
        ];

        if (allUsers.some(u => u.email === email)) {
            return { error: 'Email уже зарегистрирован' };
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

        // Добавление специфичных полей в зависимости от роли
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

        const userData = { ...newUser };
        delete userData.password;
        this.currentUser = userData;
        localStorage.setItem('userProfile', JSON.stringify(userData));

        return userData;
    }

    /**
     * Выход пользователя
     */
    logout() {
        this.currentUser = null;
        localStorage.removeItem('userProfile');
    }

    /**
     * Получить всех студентов
     */
    getAllStudents() {
        return this.users.students;
    }

    /**
     * Получить всех учителей
     */
    getAllTeachers() {
        return this.users.teachers;
    }

    /**
     * Получить всех администраторов
     */
    getAllAdmins() {
        return this.users.admins;
    }

    /**
     * Получить пользователя по ID
     */
    getUserById(id) {
        const allUsers = [
            ...this.users.students,
            ...this.users.teachers,
            ...this.users.admins
        ];
        return allUsers.find(u => u.id === id);
    }

    /**
     * Получить пользователя по Email
     */
    getUserByEmail(email) {
        const allUsers = [
            ...this.users.students,
            ...this.users.teachers,
            ...this.users.admins
        ];
        return allUsers.find(u => u.email === email);
    }

    /**
     * Обновить профиль пользователя
     */
    updateProfile(userId, updates) {
        const allUsers = [
            ...this.users.students,
            ...this.users.teachers,
            ...this.users.admins
        ];

        const user = allUsers.find(u => u.id === userId);
        if (user) {
            Object.assign(user, updates);
            this.saveUsers();
            return user;
        }
        return null;
    }

    /**
     * Получить статистику
     */
    getStatistics() {
        return {
            totalStudents: this.users.students.length,
            totalTeachers: this.users.teachers.length,
            totalAdmins: this.users.admins.length,
            totalUsers: this.users.students.length + 
                       this.users.teachers.length + 
                       this.users.admins.length,
            studentProgress: this.calculateAverageProgress(),
            topTeacher: this.getTopTeacher()
        };
    }

    /**
     * Рассчитать среднее прогресс студентов
     */
    calculateAverageProgress() {
        if (this.users.students.length === 0) return 0;
        const total = this.users.students.reduce((sum, s) => sum + (s.progress || 0), 0);
        return Math.round(total / this.users.students.length);
    }

    /**
     * Получить учителя с наивысшим рейтингом
     */
    getTopTeacher() {
        if (this.users.teachers.length === 0) return null;
        return this.users.teachers.reduce((top, teacher) => 
            (teacher.rating > (top.rating || 0)) ? teacher : top
        );
    }

    /**
     * Получить текущего пользователя
     */
    getCurrentUser() {
        return this.currentUser;
    }

    /**
     * Проверить, авторизован ли пользователь
     */
    isAuthenticated() {
        return this.currentUser !== null;
    }

    /**
     * Очистить все данные (для тестирования)
     */
    clearAll() {
        localStorage.removeItem('mockUsers');
        localStorage.removeItem('userProfile');
        this.users = this.getDefaultUsers();
        this.currentUser = null;
    }

    /**
     * Сбросить на данные по умолчанию
     */
    resetToDefault() {
        this.users = this.getDefaultUsers();
        this.saveUsers();
    }
}

// Create instance only when explicitly enabled (prevents accidental inclusion)
let authServer = null;
const mockEnabled = (typeof window !== 'undefined' && window.USE_MOCK_AUTH === true) || localStorage.getItem('useMockServer') === 'true';
if (mockEnabled) {
    authServer = new MockAuthServer();
    if (typeof module !== 'undefined' && module.exports) module.exports = authServer;
    console.log('✅ Mock Auth Server initialized');
    console.log('📊 Stats:', authServer.getStatistics());
} else {
    if (typeof module !== 'undefined' && module.exports) module.exports = null;
}
