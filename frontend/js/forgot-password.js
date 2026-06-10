async function handleForgotPassword(event) {
    event.preventDefault();
    const btn = event.target.querySelector('button');
    const formGroup = event.target.querySelector('.form-group');
    const emailInput = document.getElementById('email');
    const resetMessage = document.getElementById('resetMessage');
    const originalText = btn.innerHTML;
            
    const email = emailInput.value.trim();
    if (!email) return;

    btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Тексерілуде...';
    btn.disabled = true;
    resetMessage.style.display = 'none';
            
    try {
        // 1. Извлекаем пользователя
        let user = authServer.getUserByEmail(email);
                
        // 2. Если локально нет, ищем в Google Sheets
        if (!user && typeof getAllUsersFromSheets === 'function') {
            const result = await getAllUsersFromSheets();
            if (result && result.success && result.users) {
                 user = result.users.find(u => u.email === email);
            }
        }

        if (!user) {
        // Ошибка: Пользователь не найден
        resetMessage.innerHTML = '<i class="fa-solid fa-circle-xmark"></i> Бұл email жүйеде тіркелмеген.';
        resetMessage.style.color = '#ef4444';
        resetMessage.style.borderColor = '#ef4444';
        resetMessage.style.background = 'rgba(239, 68, 68, 0.1)';
        resetMessage.style.display = 'block';
                    
        btn.innerHTML = originalText;
        btn.disabled = false;
        return;
        }

        // 3. Пользователь найден — генерируем временный пароль
        const tempPassword = Math.floor(100000 + Math.random() * 900000).toString(); // 6 цифр
        user.password = tempPassword;

        // 4. Сохраняем локально
        authServer.updateProfile(user.id, { password: tempPassword });

        // 5. Сохраняем в Google Sheets (если нужно)
        if (typeof syncUpdateUser === 'function') {
        // Находим rowIndex для этого пользователя
        let sheetRowIndex = user.rowIndex;
        if (!sheetRowIndex && typeof getAllUsersFromSheets === 'function') {
            const sheetResult = await getAllUsersFromSheets();
                if (sheetResult && sheetResult.success) {
                const u = sheetResult.users.find(u => u.email === email);
                if (u) sheetRowIndex = u.rowIndex;
            }
        }

            if (sheetRowIndex) {
                btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Сақталуда...';
                await syncUpdateUser(sheetRowIndex, { password: tempPassword });
            }
        }

        // 6. Показываем результат (Выводим на экран, т.к. реальной почты нет)
        btn.style.display = 'none';
        formGroup.style.display = 'none';
                
        resetMessage.innerHTML = `
            <i class="fa-solid fa-circle-check"></i> <strong>Сәтті табылды!</strong>
            <br><br>
            Сіздің уақытша пароліңіз:
            <strong style="display: block; margin-top: 12px; font-size: 1.5rem; letter-spacing: 4px; padding: 12px; background: rgba(0,0,0,0.05); border-radius: 8px; color: var(--text-primary);">
                ${tempPassword}
            </strong>
            <p style="margin-top: 14px; font-size: 0.9rem; color: var(--text-secondary);">
                Осы пароль арқылы жүйеге кіріп, профиліңізден жаңа пароль орнатуды ұмытпаңыз.
            </p>
         `;
        resetMessage.style.color = '#10b981';
        resetMessage.style.borderColor = '#10b981';
        resetMessage.style.background = 'rgba(16, 185, 129, 0.05)';
        resetMessage.style.display = 'block';

    } catch (error) {
        console.error("Reset password error:", error);
        resetMessage.innerHTML = '<i class="fa-solid fa-triangle-exclamation"></i> Жүйелік қате орын алды. Қайта көріңіз.';
        resetMessage.style.color = '#ef4444';
        resetMessage.style.borderColor = '#ef4444';
        resetMessage.style.background = 'rgba(239, 68, 68, 0.1)';
        resetMessage.style.display = 'block';
                
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}