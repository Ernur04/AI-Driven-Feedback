// search.js
// Іздеу функционалы (Search logic)
const searchInput = document.getElementById('searchInput');
const cheatSheet = document.getElementById('cheatSheet');
const cards = document.querySelectorAll('.cheat-card');

// Контейнер для сообщения "Нәтиже жоқ"
const noResultsMsg = document.createElement('div');
noResultsMsg.className = 'search-no-results';
noResultsMsg.style.display = 'none';
noResultsMsg.textContent = 'Кешіріңіз, ештеңе табылмады...';
cheatSheet.appendChild(noResultsMsg);

searchInput.addEventListener('input', () => {
    const query = searchInput.value.toLowerCase().trim();
    let visibleCount = 0;

    cards.forEach(card => {
        const text = card.textContent.toLowerCase();
        if (text.includes(query)) {
            card.style.display = 'block';
            visibleCount++;
        } else {
            card.style.display = 'none';
        }
    });

    noResultsMsg.style.display = (visibleCount === 0 && query !== '') ? 'block' : 'none';
});
