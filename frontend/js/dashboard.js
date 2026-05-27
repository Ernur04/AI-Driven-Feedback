/**
 * dashboard.js
 * Common logic for all role-based dashboards (Student, Teacher, Admin).
 * Handles profile data initialization, avatar uploads, and form submissions.
 */

// 1. Initialize data from localStorage on load
function initProfileFields() {
    const savedProfile = localStorage.getItem('userProfile');
    const token = localStorage.getItem('accessToken');
    if (token) {
        // try to get latest profile from API
        fetch((window.API_BASE || 'http://localhost:4000') + '/api/users/me', {
            headers: { 'Authorization': 'Bearer ' + token }
        }).then(res => res.json()).then(data => {
            if (data.user) {
                localStorage.setItem('userProfile', JSON.stringify(data.user));
                populateFields(data.user);
            } else if (savedProfile) {
                populateFields(JSON.parse(savedProfile));
            }
        }).catch(err => {
            // fallback to saved profile
            if (savedProfile) populateFields(JSON.parse(savedProfile));
        });
        return;
    }

    if (!savedProfile) return;

    const userData = JSON.parse(savedProfile);
    
    // Update IDs that might exist on the page
    const elements = {
        'profileNameBig': { type: 'text', value: userData.name },
        'editName': { type: 'value', value: userData.name },
        'editEmail': { type: 'value', value: userData.email || '' },
        'editBirth': { type: 'value', value: userData.birth || '' },
        'editPhone': { type: 'value', value: userData.phone || '' },
        'editAddress': { type: 'value', value: userData.address || '' },
        'profileAvatarBig': { type: 'src', value: userData.photo }
    };

    for (const [id, config] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) {
            if (config.type === 'text') el.textContent = config.value;
            else if (config.type === 'value') el.value = config.value;
            else if (config.type === 'src' && config.value) el.src = config.value;
        }
    }

    // Role display synchronization
    const roleBig = document.getElementById('profileRoleBig');
    if (roleBig) {
        roleBig.textContent = 
            userData.role === 'student' ? 'Студент' :
            userData.role === 'teacher' ? 'Мұғалім' : 'Админ';
    }
}

// Extracted helper to populate fields from user object
function populateFields(userData) {
    const elements = {
        'profileNameBig': { type: 'text', value: userData.name },
        'editName': { type: 'value', value: userData.name },
        'editEmail': { type: 'value', value: userData.email || '' },
        'editBirth': { type: 'value', value: userData.birth || '' },
        'editPhone': { type: 'value', value: userData.phone || '' },
        'editAddress': { type: 'value', value: userData.address || '' },
        'profileAvatarBig': { type: 'src', value: userData.photo }
    };

    for (const [id, config] of Object.entries(elements)) {
        const el = document.getElementById(id);
        if (el) {
            if (config.type === 'text') el.textContent = config.value;
            else if (config.type === 'value') el.value = config.value;
            else if (config.type === 'src' && config.value) el.src = config.value;
        }
    }

    const roleBig = document.getElementById('profileRoleBig');
    if (roleBig) {
        roleBig.textContent =
            userData.role === 'student' ? 'Студент' :
            userData.role === 'teacher' ? 'Мұғалім' : 'Админ';
    }
}

// 2. Avatar Upload Handler
function initAvatarUpload() {
    const uploadInput = document.getElementById('avatarUpload');
    if (!uploadInput) return;

    uploadInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        // show immediate preview using object URL
        const previewUrl = URL.createObjectURL(file);
        const bigAvatar = document.getElementById('profileAvatarBig');
        if (bigAvatar) bigAvatar.src = previewUrl;

        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
            const userData = JSON.parse(savedProfile);
            userData.photo = previewUrl; // temporary preview
            localStorage.setItem('userProfile', JSON.stringify(userData));
            if (typeof updateUserProfile === 'function') updateUserProfile(userData);
        }

        // Upload to backend as multipart/form-data to avoid storing large base64 in DB/localStorage
        const token = localStorage.getItem('accessToken');
        if (token) {
            const fd = new FormData();
            fd.append('avatar', file);
            fetch((window.API_BASE || 'http://localhost:4000') + '/api/users/me/avatar', {
                method: 'POST',
                headers: { 'Authorization': 'Bearer ' + token },
                body: fd
            }).then(async res => {
                const d = await res.json().catch(()=>({ error: 'Invalid response' }));
                if (!res.ok) return console.warn('Failed to upload avatar', d);
                const newUser = d.user;
                localStorage.setItem('userProfile', JSON.stringify(newUser));
                if (typeof updateUserProfile === 'function') updateUserProfile(newUser);
                if (bigAvatar && newUser.photo) bigAvatar.src = newUser.photo;
                URL.revokeObjectURL(previewUrl);
            }).catch(err => console.warn('Failed to upload avatar', err));
        }
    });

    // allow clicking avatar images to open file chooser
    const bigAvatar = document.getElementById('profileAvatarBig');
    const smallAvatar = document.getElementById('userAvatarSmall');
    [bigAvatar, smallAvatar].forEach(el => {
        if (el) el.addEventListener('click', () => uploadInput.click());
    });
}

// Main avatar change button in main content
function initMainAvatarButton() {
    const btn = document.getElementById('btnChangeAvatarMain');
    const uploadInput = document.getElementById('avatarUpload');
    if (btn && uploadInput) {
        btn.addEventListener('click', () => uploadInput.click());
    }

    // cover upload
    const coverInput = document.getElementById('coverUpload');
    if (coverInput) {
        coverInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = function(ev) {
                const base64 = ev.target.result;
                const saved = localStorage.getItem('userProfile');
                if (saved) {
                    const user = JSON.parse(saved);
                    // Persist to server if token present
                    const token = localStorage.getItem('accessToken');
                    if (token) {
                        const btn = document.querySelector('#profileCombinedForm .save-btn') || document.querySelector('.save-btn');
                        showButtonLoading(btn, true);
                        fetch((window.API_BASE || 'http://localhost:4000') + '/api/users/me', {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                            body: JSON.stringify({ cover: base64 })
                        }).then(async res => {
                            const d = await res.json().catch(()=>({ error: 'Invalid response' }));
                            showButtonLoading(btn, false);
                            if (!res.ok) return console.warn('Failed to save cover', d);
                            const newUser = d.user || user;
                            localStorage.setItem('userProfile', JSON.stringify(newUser));
                            const coverEl = document.getElementById('profileCoverBig');
                            if (coverEl && newUser.cover) coverEl.src = newUser.cover;
                            if (typeof updateUserProfile === 'function') updateUserProfile(newUser);
                        }).catch(err => { showButtonLoading(btn,false); console.warn('Failed to save cover', err); });
                    } else {
                        user.cover = base64;
                        localStorage.setItem('userProfile', JSON.stringify(user));
                        const coverEl = document.getElementById('profileCoverBig');
                        if (coverEl) coverEl.src = base64;
                    }
                }
            };
            reader.readAsDataURL(file);
        });
    }
}

// 3. Combined Profile + Password Form Submission Handler
function initCombinedForm() {
    const form = document.getElementById('profileCombinedForm');
    if (!form) return;

    form.onsubmit = function(e) {
        e.preventDefault();
        
        // Collect profile fields
        const profileUpdates = {
            name: document.getElementById('editName')?.value,
            email: document.getElementById('editEmail')?.value,
            birth: document.getElementById('editBirth')?.value,
            phone: document.getElementById('editPhone')?.value,
            address: document.getElementById('editAddress')?.value
        };

        // Collect password fields
        const currentPassword = document.getElementById('currentPassword')?.value || '';
        const newPassword = document.getElementById('newPassword')?.value || '';
        const confirmPassword = document.getElementById('confirmPassword')?.value || '';

        // Validate password if any field filled
        if (newPassword || currentPassword || confirmPassword) {
            if (newPassword.length < 6) {
                showNotification('Пароль кемінде 6 таңба болуы керек', 'error');
                return;
            }
            if (newPassword !== confirmPassword) {
                showNotification('Пароли сәйкес емес', 'error');
                return;
            }
        }

        // Prepare final update payload
        const updates = { ...profileUpdates };
        if (newPassword) updates.password = newPassword;

        const savedProfile = localStorage.getItem('userProfile');
        if (!savedProfile) {
            showNotification('Профиль жүктелмеген', 'error');
            return;
        }

        const userData = JSON.parse(savedProfile);
        const token = localStorage.getItem('accessToken');
        const saveBtn = form.querySelector('.save-btn');

        if (token) {
            showButtonLoading(saveBtn, true);
            fetch((window.API_BASE || 'http://localhost:4000') + '/api/users/me', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token },
                body: JSON.stringify(updates)
            }).then(async res => {
                const d = await res.json().catch(() => ({ error: 'Invalid response' }));
                showButtonLoading(saveBtn, false);
                if (!res.ok) {
                    console.warn('Failed server update', d);
                    showNotification(d.error || 'Сервердегі сақтау қатесі', 'error');
                    return;
                }
                const newUser = d.user || Object.assign(userData, updates);
                localStorage.setItem('userProfile', JSON.stringify(newUser));
                populateFields(newUser);
                form.reset();
                if (typeof updateUserProfile === 'function') updateUserProfile(newUser);
                showNotification('Өзгерістер сәтті сақталды!', 'success');
            }).catch(err => {
                showButtonLoading(saveBtn, false);
                console.warn('Failed server update', err);
                // fallback to local save
                Object.assign(userData, updates);
                localStorage.setItem('userProfile', JSON.stringify(userData));
                populateFields(userData);
                if (typeof updateUserProfile === 'function') updateUserProfile(userData);
                showNotification('Жергілікті түрде сақталды (серверге қосылмады)', 'info');
            });
        } else {
            // No token: save locally only
            Object.assign(userData, updates);
            localStorage.setItem('userProfile', JSON.stringify(userData));
            populateFields(userData);
            if (typeof updateUserProfile === 'function') updateUserProfile(userData);
            showNotification('Мәліметтер жергілікті түрде сақталды', 'success');
        }
    };
}

// Boot up
document.addEventListener('DOMContentLoaded', () => {
    initProfileFields();
    initAvatarUpload();
    initCombinedForm();
    initMainAvatarButton();
});

// Button loading helpers
function showButtonLoading(btn, enabled) {
    if (!btn) return;
    if (enabled) {
        btn.disabled = true;
        btn.classList.add('loading');
        // add spinner element
        if (!btn.querySelector('.spinner')) {
            const sp = document.createElement('span');
            sp.className = 'spinner';
            btn.prepend(sp);
        }
    } else {
        btn.disabled = false;
        btn.classList.remove('loading');
        const sp = btn.querySelector('.spinner');
        if (sp) sp.remove();
    }
}
