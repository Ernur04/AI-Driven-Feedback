/* =========================================================================
   AVATAR GENERATOR — Единая система аватарок с инициалами
   ========================================================================= */

function getInitials(name) {
    if (!name) return '?';
    return name.trim().split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function getAvatarColors(name) {
    const colors = [
        { bg: '#6366f1', text: '#ffffff' },
        { bg: '#8b5cf6', text: '#ffffff' },
        { bg: '#ec4899', text: '#ffffff' },
        { bg: '#06b6d4', text: '#ffffff' },
        { bg: '#10b981', text: '#ffffff' },
        { bg: '#f59e0b', text: '#ffffff' },
        { bg: '#ef4444', text: '#ffffff' },
        { bg: '#3b82f6', text: '#ffffff' }
    ];
    let hash = 0;
    if (name) {
        for (let i = 0; i < name.length; i++) {
            hash = ((hash << 5) - hash) + name.charCodeAt(i);
            hash = hash & hash;
        }
    }
    return colors[Math.abs(hash) % colors.length];
}

/*
 * Размеры по классу:
 *   avatar-small  → 36×36, font 13px   (хедер, кнопка профиля)
 *   avatar        → 42×42, font 15px   (дропдаун профиля)
 *   avatar-large  → 90×90, font 32px   (сайдбар дэшборда)
 *
 * ВАЖНО: функция возвращает готовый <div>.
 * Вставляй его через replaceAvatarElement() — не через innerHTML на <img>.
 */
function createAvatarHTML(name, className = 'avatar-small') {
    const initials = getInitials(name);
    const colors   = getAvatarColors(name);

    const sizeMap = {
        'avatar-small': { size: '36px',  font: '13px' },
        'avatar':       { size: '42px',  font: '15px' },
        'avatar-large': { size: '90px',  font: '32px' },
    };
    const { size, font } = sizeMap[className] || { size: '36px', font: '13px' };

    return `<div class="${className}"
        style="background-color:${colors.bg};color:${colors.text};
               display:inline-flex;align-items:center;justify-content:center;
               border-radius:50%;font-weight:700;font-size:${font};
               flex-shrink:0;width:${size};height:${size};
               box-sizing:border-box;line-height:1;"
        title="${name}">${initials}</div>`;
}

/*
 * Обновляет элемент аватара на месте, без удаления из DOM.
 * Если элемент — <img>, заменяет его на <div> один раз.
 * Если уже <div>, просто обновляет стили и текст (без мерцания).
 */
function replaceAvatarElement(elementId, name, className) {
    let el = document.getElementById(elementId);
    if (!el) return;

    const initials = getInitials(name);
    const colors   = getAvatarColors(name);
    const sizeMap = {
        'avatar-small': { size: '36px',  font: '13px' },
        'avatar':       { size: '42px',  font: '15px' },
        'avatar-large': { size: '90px',  font: '32px' },
    };
    const { size, font } = sizeMap[className] || { size: '36px', font: '13px' };

    // Если элемент ещё <img>, преобразуем в <div> один раз
    if (el.tagName === 'IMG') {
        const newEl = document.createElement('div');
        newEl.id = elementId;
        el.parentNode.replaceChild(newEl, el);
        el = newEl;
    }

    // Обновляем на месте — без удаления из DOM
    el.className = className;
    el.textContent = initials;
    el.title = name;
    el.style.backgroundColor = colors.bg;
    el.style.color = colors.text;
    el.style.display = 'inline-flex';
    el.style.alignItems = 'center';
    el.style.justifyContent = 'center';
    el.style.borderRadius = '50%';
    el.style.fontWeight = '700';
    el.style.fontSize = font;
    el.style.flexShrink = '0';
    el.style.width = size;
    el.style.height = size;
    el.style.boxSizing = 'border-box';
    el.style.lineHeight = '1';
}

function updateAvatarElement(element, name) {
    const el = typeof element === 'string' ? document.querySelector(element) : element;
    if (!el) return;
    const colors = getAvatarColors(name);
    el.textContent = getInitials(name);
    el.style.backgroundColor = colors.bg;
    el.style.color = colors.text;
    el.title = name;
}

console.log('🎨 Avatar Generator загружен');