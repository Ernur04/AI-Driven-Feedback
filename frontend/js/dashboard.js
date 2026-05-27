/**
 * dashboard.js
 * Common logic for all role-based dashboards (Student, Teacher, Admin).
 * Handles profile data initialization, avatar uploads, and form submissions.
 */

// 1. Initialize data from localStorage on load
function initProfileFields() {
    const savedProfile = localStorage.getItem('userProfile');
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

// 2. Avatar Upload Handler
function initAvatarUpload() {
    const uploadInput = document.getElementById('avatarUpload');
    if (!uploadInput) return;

    uploadInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(event) {
            const base64Image = event.target.result;
            
            // Local UI Update
            const bigAvatar = document.getElementById('profileAvatarBig');
            if (bigAvatar) bigAvatar.src = base64Image;

            // Persistence
            const savedProfile = localStorage.getItem('userProfile');
            if (savedProfile) {
                const userData = JSON.parse(savedProfile);
                userData.photo = base64Image;
                localStorage.setItem('userProfile', JSON.stringify(userData));

                // Master Database Update
                if (typeof authServer !== 'undefined') {
                    authServer.updateProfile(userData.id, { photo: base64Image });
                }

                // Global UI sync (Top right header/dropdown)
                if (typeof updateUserProfile === 'function') {
                    updateUserProfile(userData);
                }
            }
        };
        reader.readAsDataURL(file);
    });
}

// 3. Profile Form Submission Handler
function initProfileForm() {
    const form = document.getElementById('profileForm');
    if (!form) return;

    form.onsubmit = function(e) {
        e.preventDefault();
        
        const updates = {
            name: document.getElementById('editName')?.value,
            email: document.getElementById('editEmail')?.value,
            birth: document.getElementById('editBirth')?.value,
            phone: document.getElementById('editPhone')?.value,
            address: document.getElementById('editAddress')?.value
        };

        const savedProfile = localStorage.getItem('userProfile');
        if (savedProfile) {
            const userData = JSON.parse(savedProfile);

            // Master Database Update
            if (typeof authServer !== 'undefined') {
                authServer.updateProfile(userData.id, updates);
            }

            // Session Update
            Object.assign(userData, updates);
            localStorage.setItem('userProfile', JSON.stringify(userData));

            // UI Refresh for sidebar name
            const nameBig = document.getElementById('profileNameBig');
            if (nameBig) nameBig.textContent = updates.name;

            // Global UI sync (Top right header/dropdown)
            if (typeof updateUserProfile === 'function') {
                updateUserProfile(userData);
            }
        }
        
        alert('Мәліметтер сәтті сақталды!');
    };
}

// Boot up
document.addEventListener('DOMContentLoaded', () => {
    initProfileFields();
    initAvatarUpload();
    initProfileForm();
});
