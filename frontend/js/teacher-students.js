// ─── DATA ────────────────────────────────────────────────────────────────────
let allStudents = [];
let currentStudentId = null;

async function loadStudentList() {
    if (typeof getAllUsersFromSheets === 'function') {
        const sheetData = await getAllUsersFromSheets();
        if (sheetData && sheetData.success && sheetData.users) {
            allStudents = sheetData.users.filter(u => u.role === 'student');
        }
    }

    if (!allStudents.length) {
        const authServer = window.authServer || new AuthServer();
        allStudents = authServer.getAllStudents ? authServer.getAllStudents() : [];
    }

    // Fallback: читаем напрямую из localStorage
    if (!allStudents.length) {
        try {
            const raw = localStorage.getItem('mockUsers');
            if (raw) {
                const data = JSON.parse(raw);
                allStudents = data.students || [];
            }
        } catch(e) {}
    }

    // Демо-данные если ничего нет
    if (!allStudents.length) {
        allStudents = [
            { id:'student_1', name:'Ernur Seitkali',  email:'ernur@example.com',  role:'student', registeredAt: new Date(Date.now()-86400000*2).toISOString() },
            { id:'student_2', name:'Aida Bekova',     email:'aida@example.com',   role:'student', registeredAt: new Date(Date.now()-86400000*5).toISOString() },
            { id:'student_3', name:'Damir Akhmetov',  email:'damir@example.com',  role:'student', registeredAt: new Date(Date.now()-86400000*1).toISOString() },
            { id:'student_4', name:'Zarina Nurova',   email:'zarina@example.com', role:'student', registeredAt: new Date(Date.now()-86400000*8).toISOString() },
        ];
    }

    updateStats();
    renderStudentTable(allStudents);
}

// ─── STATS ───────────────────────────────────────────────────────────────────
function updateStats() {
    document.getElementById('totalCount').textContent = allStudents.length;

    const today = new Date(); today.setHours(0,0,0,0);
    const week  = new Date(today); week.setDate(week.getDate()-7);

    const loginLog = JSON.parse(localStorage.getItem('userLoginLog') || '[]');
    const todayLogins = new Set(loginLog.filter(e => new Date(e.loginTime) >= today).map(e => e.userId));
    document.getElementById('todayCount').textContent = todayLogins.size;

    const newThisWeek = allStudents.filter(s => s.registeredAt && new Date(s.registeredAt) >= week).length;
    document.getElementById('weekCount').textContent = newThisWeek;
}

// ─── RENDER TABLE ────────────────────────────────────────────────────────────
function renderStudentTable(students) {
    const tbody = document.getElementById('studentsBody');

    if (!students.length) {
        tbody.innerHTML = `<tr><td colspan="5">
            <div class="empty-state">
                <i class="fa-solid fa-users-slash"></i>
                <p>Студенттер табылмады</p>
            </div></td></tr>`;
        return;
    }

    tbody.innerHTML = students.map(s => {
        const initials = (s.name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase();
        const date = s.registeredAt
            ? new Date(s.registeredAt).toLocaleDateString('kk-KZ', {year:'numeric',month:'short',day:'numeric'})
            : '—';
        return `
        <tr>
            <td>
                <div class="user-cell">
                    <div class="user-avatar">${initials}</div>
                    <div>
                        <div class="user-name">${escHtml(s.name || '—')}</div>
                        <div class="user-id">${s.id}</div>
                    </div>
                </div>
            </td>
            <td>${escHtml(s.email || '—')}</td>
            <td><span class="date-text">${date}</span></td>
            <td><span class="role-badge student"><i class="fa-solid fa-user-graduate"></i> Студент</span></td>
            <td>
                <button class="action-btn key" title="Уақытша пароль" onclick="showTempPasswordModal('${s.id}')">
                    <i class="fa-solid fa-key"></i>
                </button>
            </td>
        </tr>`;
    }).join('');
}

// ─── SEARCH ──────────────────────────────────────────────────────────────────
function searchStudent(query) {
    const q = query.toLowerCase().trim();
    if (!q) { renderStudentTable(allStudents); return; }
    const filtered = allStudents.filter(s =>
        (s.name  || '').toLowerCase().includes(q) ||
        (s.email || '').toLowerCase().includes(q)
    );
    renderStudentTable(filtered);
}

document.getElementById('searchInput').addEventListener('input', e => {
    searchStudent(e.target.value);
});

// ─── TEMP PASSWORD ────────────────────────────────────────────────────────────
function generateTempPassword() {
    const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    const specials = '!@#$%';
    let pass = 'Temp' + specials[Math.floor(Math.random()*specials.length)];
    for (let i = 0; i < 4; i++) pass += Math.floor(Math.random()*10);
    return pass;
}

function setTempPassword(studentId, password) {
    try {
        const raw = localStorage.getItem('mockUsers');
        const data = raw ? JSON.parse(raw) : { students:[], teachers:[], admins:[] };
        const idx = data.students.findIndex(s => s.id === studentId);
        if (idx !== -1) {
            data.students[idx].password = password;
            data.students[idx].tempPassword = password;
            localStorage.setItem('mockUsers', JSON.stringify(data));
        }
        // Обновляем локальный массив
        const local = allStudents.find(s => s.id === studentId);
        if (local) local.password = password;
        return true;
    } catch(e) { return false; }
}

function showTempPasswordModal(studentId) {
    currentStudentId = studentId;
    const student = allStudents.find(s => s.id === studentId);
    if (!student) return;

    document.getElementById('modalStudentName').textContent  = student.name  || '—';
    document.getElementById('modalStudentEmail').textContent = student.email || '—';
    document.getElementById('passValue').textContent = '— — — — — —';
    document.getElementById('passDisplay').classList.remove('generated');
    document.getElementById('copyPassBtn').style.display = 'none';
    document.getElementById('copySuccess').classList.remove('show');

    document.getElementById('tempPassModal').classList.add('open');
}

function copyTempPassword() {
    const pass = document.getElementById('passValue').textContent;
    if (!pass || pass.includes('—')) return;
    navigator.clipboard.writeText(pass).then(() => {
        document.getElementById('copySuccess').classList.add('show');
        setTimeout(() => document.getElementById('copySuccess').classList.remove('show'), 2000);
    });
}

// Modal events
document.getElementById('generateBtn').addEventListener('click', () => {
    const pass = generateTempPassword();
    document.getElementById('passValue').textContent = pass;
    document.getElementById('passDisplay').classList.add('generated');
    document.getElementById('copyPassBtn').style.display = 'flex';

    if (currentStudentId) {
        const ok = setTempPassword(currentStudentId, pass);
        if (ok) showToast('Пароль сақталды және қолданушыға орнатылды');
    }
});

document.getElementById('copyPassBtn').addEventListener('click', copyTempPassword);
document.getElementById('closeModal').addEventListener('click', () => {
    document.getElementById('tempPassModal').classList.remove('open');
});
document.getElementById('cancelModal').addEventListener('click', () => {
    document.getElementById('tempPassModal').classList.remove('open');
});
document.getElementById('tempPassModal').addEventListener('click', e => {
    if (e.target === e.currentTarget) e.currentTarget.classList.remove('open');
});

// ─── TOAST ────────────────────────────────────────────────────────────────────
function showToast(msg) {
    const t = document.getElementById('toast');
    document.getElementById('toastMsg').textContent = msg;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// ─── UTILS ────────────────────────────────────────────────────────────────────
function escHtml(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ─── INIT ─────────────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadStudentList);
