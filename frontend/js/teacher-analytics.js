// ─── 1. ТОЛЬКО СТУДЕНТЫ ИЗ GOOGLE SHEETS ─────────────────────────────────────
    async function getStudents() {
        try {
            if (typeof getAllUsersFromSheets === 'function') {
                const result = await getAllUsersFromSheets();
                if (result && result.success && Array.isArray(result.users) && result.users.length > 0) {
                    // Синхронизируем в localStorage
                    const grouped = { students: [], teachers: [], admins: [] };
                    result.users.forEach(u => {
                        const role = (u.role || 'student').toLowerCase().trim();
                        if (grouped[role]) grouped[role].push(u);
                        else if (role === 'teacher') grouped.teachers.push(u);
                        else if (role === 'admin') grouped.admins.push(u);
                        else grouped.students.push(u); // Әдепкі бойынша студент
                    });
                    localStorage.setItem('mockUsers', JSON.stringify(grouped));
                    if (window.authServer) window.authServer.users = grouped;
                    
                    updateSyncStatus(true);
                    return grouped.students; // ТОЛЬКО студенты
                }
            }
        } catch (e) {
            console.warn('Google Sheets недоступен:', e.message);
        }

        // Fallback — localStorage, только студенты
        try {
            const srv = window.authServer || window.AuthServer;
            if (srv && typeof srv.getAllStudents === 'function') {
                const s = srv.getAllStudents();
                if (s && s.length) { 
                    updateSyncStatus(false, 'Локальді деректер қолданылуда'); 
                    return s.filter(u => (u.role || 'student').toLowerCase().trim() === 'student'); 
                }
            }
            const raw = localStorage.getItem('mockUsers');
            if (raw) {
                const parsed = JSON.parse(raw);
                updateSyncStatus(false, 'Локальді деректер қолданылуда');
                return Array.isArray(parsed.students) ? parsed.students : [];
            }
        } catch (e) {}
        updateSyncStatus(false, 'Деректер табылмады');
        return [];
    }

    // Синхронизация статусын жаңарту функциясы
    function updateSyncStatus(success, text = 'Google Sheets-пен синхрондалды') {
        const dot = document.getElementById('syncDot');
        const txt = document.getElementById('syncText');
        if (!dot || !txt) return;
        
        dot.classList.remove('loading');
        if (success) {
            dot.style.background = '#22c55e'; // жасыл нүкте
            txt.textContent = text;
        } else {
            dot.style.background = '#f97316'; // қызғылт сары нүкте
            txt.textContent = text;
        }
    }

    // ─── 2. РЕАЛЬНЫЕ ЛОГИ — БЕЗ ГЕНЕРАЦИИ ФАЛЬШИВЫХ ─────────────────────────────
    function loadLoginHistory() {
        try {
            const raw = localStorage.getItem('userLoginLog');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (Array.isArray(parsed)) return parsed;
            }
        } catch(e) {}
        return [];
    }

    // ─── 3. РАСЧЁТЫ ──────────────────────────────────────────────────────────────
    function calcHoursSpent(userId, log) {
        return log
            .filter(e => e.userId === userId && e.loginTime && e.logoutTime)
            .reduce((sum, e) => sum + (e.logoutTime - e.loginTime), 0) / 3600000;
    }

    function getActivityByDay(log) {
        const map = {};
        log.forEach(e => {
            const day = new Date(e.loginTime).toLocaleDateString('ru-RU', {month:'short', day:'numeric'});
            map[day] = (map[day] || 0) + 1;
        });
        const days = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(); d.setDate(d.getDate() - i);
            days.push(d.toLocaleDateString('ru-RU', {month:'short', day:'numeric'}));
        }
        return { labels: days, data: days.map(d => map[d] || 0) };
    }

    // ─── 4. КАРТОЧКИ — тек студенттердің ID-лері бойынша ───────────────────────────
    function updateSummaryStats(log, students) {
        // Рөлі тек студенттерді ғана сүзіп алу
        const onlyStudents = students.filter(s => (s.role || 'student').toLowerCase().trim() === 'student');
        const studentIds = new Set(onlyStudents.map(s => s.id));
        const sLog = log.filter(e => studentIds.has(e.userId));

        document.getElementById('statLogins').textContent = sLog.length;
        document.getElementById('statCount').textContent = onlyStudents.length;
        if(document.getElementById('studentCountBadge')) {
            document.getElementById('studentCountBadge').textContent = onlyStudents.length + ' студент';
        }

        const totalMs = sLog.reduce((s,e) => s + ((e.logoutTime||0)-(e.loginTime||0)), 0);
        document.getElementById('statHours').textContent = (totalMs/3600000).toFixed(1);

        const today = new Date(); today.setHours(0,0,0,0);
        document.getElementById('statToday').textContent =
            sLog.filter(e => new Date(e.loginTime) >= today).length;
    }

    // ─── 5. ЦВЕТА ────────────────────────────────────────────────────────────────
    function getChartColors() {
        const isDark = document.body.classList.contains('dark-mode');
        return {
            text: isDark ? '#a1a1aa' : '#475569',
            grid: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)',
            accent: '#3b82f6', accent2: '#8b5cf6'
        };
    }

    // ─── 6. ГРАФИК ВХОДОВ ────────────────────────────────────────────────────────
    function renderLoginChart(log, students) {
        const onlyStudents = students.filter(s => (s.role || 'student').toLowerCase().trim() === 'student');
        const studentIds = new Set(onlyStudents.map(s => s.id));
        const { labels, data } = getActivityByDay(log.filter(e => studentIds.has(e.userId)));
        const c = getChartColors();
        const canvas = document.getElementById('activityChart');
        if (!canvas) return;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0,0,0,240);
        gradient.addColorStop(0, 'rgba(59,130,246,0.3)');
        gradient.addColorStop(1, 'rgba(59,130,246,0)');
        new Chart(ctx, {
            type: 'line',
            data: { labels, datasets: [{ label: 'Кіру саны', data, borderColor: c.accent, backgroundColor: gradient, borderWidth: 2.5, pointBackgroundColor: c.accent, pointRadius: 4, pointHoverRadius: 6, tension: 0.4, fill: true }] },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { color: c.grid }, ticks: { color: c.text, font: { size: 11 } } }, y: { grid: { color: c.grid }, ticks: { color: c.text, font: { size: 11 }, stepSize: 1 }, beginAtZero: true } } }
        });
    }

    // ─── 7. ТАБЛИЦА СТУДЕНТОВ — КЕСТЕДЕ ТЕК СТУДЕНТТЕРДІ КӨРСЕТУ ───────────────────
    function escHtml(str) {
        return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
    }

    function renderStudentStats(log, students) {
        const tbody = document.getElementById('tbody');
        if (!tbody) return;

        // Қатаң түрде тек 'student' рөлі бар пайдаланушыларды сүземіз (Админ, Мұғалім өтпейді)
        const onlyStudents = students.filter(s => {
            const role = (s.role || 'student').toLowerCase().trim();
            return role === 'student';
        });

        if (!onlyStudents.length) {
            tbody.innerHTML = `<tr><td colspan="4"><div class="empty" style="text-align:center;padding:20px;">
                <i class="fa-solid fa-users-slash"></i>
                <span>Тіркелген студенттер жоқ</span>
            </div></td></tr>`;
            
            if(document.getElementById('studentCountBadge')) {
                document.getElementById('studentCountBadge').textContent = '0 студент';
            }
            return;
        }

        // Санауышты нақты студенттер санына қайта жаңарту
        if(document.getElementById('studentCountBadge')) {
            document.getElementById('studentCountBadge').textContent = onlyStudents.length + ' студент';
        }

        const hoursMapped = onlyStudents.map(s => calcHoursSpent(s.id, log) || 0);
        const maxHours = Math.max(...hoursMapped, 0.1);

        tbody.innerHTML = onlyStudents.map((s, i) => {
            const sLog    = log.filter(e => e.userId === s.id);
            const hours   = hoursMapped[i];
            const pct     = ((hours / maxHours) * 100).toFixed(0);
            const last    = [...sLog].sort((a,b) => b.loginTime - a.loginTime)[0];
            const lastDate = last
                ? new Date(last.loginTime).toLocaleDateString('kk-KZ', {year:'numeric', month:'short', day:'numeric', hour:'2-digit', minute:'2-digit'})
                : null;
            const initials = (s.name||'?').split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
            return `<tr>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div style="background:#3b82f6;color:#fff;display:flex;align-items:center;justify-content:center;width:32px;height:32px;border-radius:50%;font-size:12px;font-weight:600;">${initials}</div>
                        <span style="font-weight:500;">${escHtml(s.name||s.id)}</span>
                    </div>
                </td>
                <td>${lastDate
                    ? `<span class="date-text">${lastDate}</span>`
                    : `<span style="color:#9ca3af;font-style:italic;">Ешқашан кірмеген</span>`}
                </td>
                <td>
                    <div style="display:flex;align-items:center;gap:8px;">
                        <div style="flex-grow:1;width:70px;height:6px;background:rgba(0,0,0,0.06);border-radius:4px;overflow:hidden;">
                            <div style="width:${pct}%;height:100%;background:#3b82f6;border-radius:4px;"></div>
                        </div>
                        <span style="min-width:50px;text-align:right;font-weight:600;">${hours.toFixed(1)} сағ</span>
                    </div>
                </td>
                <td><span class="sessions-badge" style="background:rgba(59,130,246,0.1);color:#3b82f6;padding:4px 8px;border-radius:12px;font-size:12px;font-weight:600;"><i class="fa-solid fa-arrow-right-to-bracket"></i> ${sLog.length}</span></td>
            </tr>`;
        }).join('');
    }

    // ─── 8. ИНИЦИАЛИЗАЦИЯ ───────────────────────────────────────────────────────
    document.addEventListener('DOMContentLoaded', async () => {
        const students = await getStudents();
        const log      = loadLoginHistory();

        updateSummaryStats(log, students);
        renderLoginChart(log, students);
        renderStudentStats(log, students);
    });
