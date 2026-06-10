document.addEventListener('DOMContentLoaded', async () => {

    // Показываем индикатор загрузки в карточках пока грузим данные
    ['totalUsersCount','activeUsersCount','newUsersCount','systemUptime'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
    });

    // 1. ПОЛУЧЕНИЕ ПОЛЬЗОВАТЕЛЕЙ — СНАЧАЛА ИЗ GOOGLE SHEETS, потом localStorage
    async function getRealUsers() {
        try {
            if (typeof getAllUsersFromSheets === 'function') {
                const result = await getAllUsersFromSheets();
                if (result && result.success && Array.isArray(result.users) && result.users.length > 0) {
                    console.log('✅ Google Sheets:', result.users.length, 'пользователей');
                    // Синхронизируем в localStorage
                    const grouped = { students: [], teachers: [], admins: [] };
                    result.users.forEach(u => {
                        const role = (u.role || 'student').toLowerCase();
                        if (grouped[role]) grouped[role].push(u);
                        else grouped.students.push(u);
                    });
                    localStorage.setItem('mockUsers', JSON.stringify(grouped));
                    if (window.authServer) window.authServer.users = grouped;
                    return result.users;
                }
            }
        } catch (e) {
            console.warn('⚠️ Google Sheets недоступен, берём из localStorage:', e.message);
        }

        // Fallback — localStorage
        let users = [];
        try {
            const srv = window.authServer || window.AuthServer;
            if (srv) {
                const s = (typeof srv.getAllStudents === 'function') ? srv.getAllStudents() : [];
                const t = (typeof srv.getAllTeachers === 'function') ? srv.getAllTeachers() : [];
                const a = (typeof srv.getAllAdmins   === 'function') ? srv.getAllAdmins()   : [];
                users = [...s, ...t, ...a];
            }
            if (!users.length) {
                const raw = localStorage.getItem('mockUsers');
                if (raw) {
                    const parsed = JSON.parse(raw);
                    users = [
                        ...(Array.isArray(parsed.students) ? parsed.students : []),
                        ...(Array.isArray(parsed.teachers) ? parsed.teachers : []),
                        ...(Array.isArray(parsed.admins)   ? parsed.admins   : [])
                    ];
                }
            }
        } catch (e) {
            console.error('Ошибка localStorage:', e);
        }
        return users;
    }

    // 2. ПОЛУЧЕНИЕ РЕАЛЬНЫХ ЛОГОВ АКТИВНОСТИ
    function getRealLogs() {
        try {
            const rawLogs = localStorage.getItem('userLoginLog');
            return rawLogs ? JSON.parse(rawLogs) : [];
        } catch (e) {
            return [];
        }
    }

    // 3. КАРТОЧКИ СТАТИСТИКИ
    function updateSummaryCards(users, logs) {
        const totalUsers = users.length;
        const ONE_DAY_MS = 24 * 60 * 60 * 1000;
        const now = Date.now();
        const activeTodayUsers = new Set(
            logs.filter(log => (now - log.loginTime) <= ONE_DAY_MS).map(log => log.userId)
        ).size;
        const SEVEN_DAYS_MS = 7 * ONE_DAY_MS;
        const newUsersCount = users.filter(user => {
            if (user.createdAt) return (now - new Date(user.createdAt).getTime()) <= SEVEN_DAYS_MS;
            if (user.registeredAt) return (now - new Date(user.registeredAt).getTime()) <= SEVEN_DAYS_MS;
            return false;
        }).length;

        document.getElementById('totalUsersCount').textContent = totalUsers;
        document.getElementById('totalUsersTrend').textContent = "Всего в базе";
        document.getElementById('totalUsersTrend').style.color = "inherit";
        document.getElementById('activeUsersCount').textContent = activeTodayUsers;
        document.getElementById('activeUsersTrend').textContent = "За последние 24 часа";
        document.getElementById('newUsersCount').textContent = newUsersCount;
        document.getElementById('newUsersTrend').textContent = "За последние 7 дней";
        document.getElementById('systemUptime').textContent = "100%";
        document.getElementById('systemStatus').innerHTML = '<i class="fa-solid fa-check-circle"></i> Локальная БД подключена';
        document.getElementById('systemStatus').style.color = '#22c55e';
    }

    // 4. ЦВЕТА ГРАФИКОВ
    function getChartColors() {
        const isDark = document.body.classList.contains('dark-mode');
        return {
            text: isDark ? '#a1a1aa' : '#475569',
            grid: isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.06)',
            primary: '#3b82f6',
            secondary: '#8b5cf6'
        };
    }

    let charts = {};

    // 5. ГРАФИК РОЛЕЙ
    function renderUserRolesChart(users) {
        const ctx = document.getElementById('deviceChart');
        if (!ctx) return;
        if (charts.device) charts.device.destroy();
        const colors = getChartColors();
        let roles = { admin: 0, teacher: 0, student: 0 };
        users.forEach(u => {
            const role = (u.role || 'student').toLowerCase();
            if (roles[role] !== undefined) roles[role]++;
            else roles.student++;
        });
        const titleEl = ctx.closest('.chart-container').querySelector('h3');
        if (titleEl) titleEl.textContent = "Қолданушылар құрамы (Roles)";
        charts.device = new Chart(ctx.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels: ['Админ', 'Мұғалім', 'Студент'],
                datasets: [{ data: [roles.admin, roles.teacher, roles.student], backgroundColor: [colors.secondary, '#f97316', colors.primary], borderWidth: 0 }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom', labels: { color: colors.text, font: { family: 'Inter', size: 11 } } } }, cutout: '70%' }
        });
    }

    // 6. ГРАФИК ТРАФИКА ПО ЧАСАМ
    function renderTrafficChart(logs) {
        const ctx = document.getElementById('trafficHoursChart');
        if (!ctx) return;
        if (charts.traffic) charts.traffic.destroy();
        const colors = getChartColors();
        const hourlyCounts = new Array(24).fill(0);
        logs.forEach(log => { if (log.loginTime) hourlyCounts[new Date(log.loginTime).getHours()]++; });
        const intervals = ['00-04', '04-08', '08-12', '12-16', '16-20', '20-00'];
        const intervalData = [0,0,0,0,0,0];
        hourlyCounts.forEach((count, hour) => {
            if (hour < 4) intervalData[0] += count;
            else if (hour < 8) intervalData[1] += count;
            else if (hour < 12) intervalData[2] += count;
            else if (hour < 16) intervalData[3] += count;
            else if (hour < 20) intervalData[4] += count;
            else intervalData[5] += count;
        });
        charts.traffic = new Chart(ctx.getContext('2d'), {
            type: 'bar',
            data: { labels: intervals, datasets: [{ label: 'Кірулер саны', data: intervalData, backgroundColor: colors.secondary, borderRadius: 6 }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false }, ticks: { color: colors.text } }, y: { grid: { color: colors.grid }, ticks: { color: colors.text, stepSize: 1 }, beginAtZero: true } } }
        });
    }

    // 7. ГРАФИК АКТИВНОСТИ ЗА 7 ДНЕЙ
    function renderActivityGrowthChart(logs) {
        const ctx = document.getElementById('growthChart');
        if (!ctx) return;
        if (charts.growth) charts.growth.destroy();
        const colors = getChartColors();
        const labels = [];
        const map = {};
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            const dateStr = d.toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
            labels.push(dateStr); map[dateStr] = 0;
        }
        logs.forEach(log => {
            const dateStr = new Date(log.loginTime).toLocaleDateString('ru-RU', { month: 'short', day: 'numeric' });
            if (map[dateStr] !== undefined) map[dateStr]++;
        });
        const headerText = ctx.closest('.chart-container').querySelector('p');
        if (headerText) headerText.textContent = "Соңғы 7 күндегі платформаға кіру белсенділігі";
        charts.growth = new Chart(ctx.getContext('2d'), {
            type: 'line',
            data: { labels, datasets: [{ label: 'Платформа белсенділігі (сессиялар)', data: labels.map(l => map[l]), borderColor: colors.primary, backgroundColor: 'rgba(59,130,246,0.1)', borderWidth: 3, tension: 0.4, fill: true }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: colors.text } } }, scales: { x: { grid: { color: colors.grid }, ticks: { color: colors.text } }, y: { grid: { color: colors.grid }, ticks: { color: colors.text, stepSize: 1 }, beginAtZero: true } } }
        });
    }

    // ИНИЦИАЛИЗАЦИЯ
    async function runAnalyticsPipeline() {
        const users = await getRealUsers();
        const logs = getRealLogs();
        updateSummaryCards(users, logs);
        renderUserRolesChart(users);
        renderTrafficChart(logs);
        renderActivityGrowthChart(logs);
    }

    // Запуск при загрузке
    await runAnalyticsPipeline();

    // Кнопка "Обновить"
    const refreshBtn = document.getElementById('refreshStatsBtn');
    if (refreshBtn) {
        refreshBtn.addEventListener('click', async () => {
            const icon = refreshBtn.querySelector('i');
            if (icon) icon.classList.add('fa-spin');
            await runAnalyticsPipeline();
            if (icon) icon.classList.remove('fa-spin');
        });
    }

    // Смена темы
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', async () => {
            setTimeout(async () => {
                const users = await getRealUsers();
                const logs = getRealLogs();
                renderUserRolesChart(users);
                renderTrafficChart(logs);
                renderActivityGrowthChart(logs);
            }, 150);
        });
    }
});
