// chat.js
// Функция открытия/закрытия чата с обновлением ARIA-атрибутов
function toggleChat() {
    const chatWindow = document.getElementById('chatWindow');
    const chatToggleBtn = document.getElementById('chatToggleBtn');
    const isActive = chatWindow.classList.toggle('active');
    chatWindow.setAttribute('aria-hidden', !isActive);
    chatToggleBtn.setAttribute('aria-expanded', isActive);
}

// Логика отправки сообщений в чат (для демонстрации)
function sendMessage(event) {
    event.preventDefault();
    const input = document.getElementById('chatInput');
    const chatBody = document.getElementById('chatBody');
    if (input.value.trim() === '') return;
    // Сообщение пользователя
    const userWrapper = document.createElement('div');
    userWrapper.className = 'msg-wrapper user-wrapper';
    userWrapper.innerHTML = `<p class="chat-msg user-msg">${input.value}</p>`;
    chatBody.appendChild(userWrapper);
    const userText = input.value;
    input.value = '';
    chatBody.scrollTop = chatBody.scrollHeight;
    // Имитация ответа AI через 1 секунду
    setTimeout(() => {
        const botWrapper = document.createElement('div');
        botWrapper.className = 'msg-wrapper bot-wrapper';
        botWrapper.innerHTML = `<p class="chat-msg bot-msg">Керемет сұрақ! Талқылайық: "${userText}" 🚀</p>`;
        chatBody.appendChild(botWrapper);
        chatBody.scrollTop = chatBody.scrollHeight;
    }, 1000);
}

document.getElementById('chatForm')?.addEventListener('submit', sendMessage);
