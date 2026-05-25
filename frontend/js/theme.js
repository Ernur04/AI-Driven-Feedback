// theme.js
// Переключение темы
const themeToggle = document.getElementById('themeToggle');
const themeIcon = themeToggle?.querySelector('i');
const body = document.body;

if (localStorage.getItem('theme') === 'dark') {
    body.classList.add('dark-mode');
    if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
}

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        body.classList.toggle('dark-mode');
        if (body.classList.contains('dark-mode')) {
            localStorage.setItem('theme', 'dark');
            if (themeIcon) themeIcon.className = 'fa-solid fa-sun';
        } else {
            localStorage.setItem('theme', 'light');
            if (themeIcon) themeIcon.className = 'fa-solid fa-moon';
        }
    });
}
