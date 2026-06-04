// =========================================================================
// AI CODE MENTOR — CHAT.JS
// 4 педагогикалық режим: Scaffolding · Pair Programming · Socratic · Bug Hunting
// Қосымша 2 режим: Оқу модулі · Python Анықтамалығы
// Gemini 2.5 API арқылы нақты AI жауаптары
// =========================================================================

// -------------------------------------------------------------------------
// РЕЖИМ КОНФИГУРАЦИЯСЫ (ҚАЗАҚША ПЕДАГОГИКАЛЫҚ ПРОМПТТАРМЕН)
// -------------------------------------------------------------------------
const MODES = {
    scaffolding: {
        label: 'Scaffolding',
        icon: '🏗',
        badgeClass: 'badge-scaffolding',
        hint: 'Деңгейлі кеңестер — дайын код берілмейді',
        welcome: 'Scaffolding режимі қосылды. Тапсырмаңды немесе кодыңды жаз — мен саған 3 деңгейде бағыт-бағдар сілтеймін.',
        systemPrompt: `Сен информатика пәнінің AI мұғалімісің. Scaffolding (деңгейлі қолдау) педагогикалық әдісін қолданасың.

Міндетті ережелер:
- Оқушыға ЕШҚАШАН дайын кодты жазып берме.
- Тек 3 деңгейлі кеңес беруді ұстан:
  1-деңгей: Жалпы түсінік (тапсырманың негізгі мақсатын түсіндір).
  2-деңгей: Алгоритмдік бағыт (орындалу қадамдарын ретімен атап шық).
  3-деңгей: Қандай Python операторы, функциясы немесе синтаксисі керектігін ғана нұсқа.
- Толық шешімді ешқашан жария етпе.
- Оқушыны өзі ойлануға және қатесін өзі табуға итермеле.
- Жауапты толық қазақ тілінде бер.
- Ықшам, нақты, достық қарым-қатынаста және ынталандырушы тонмен сөйлес.`
    },

    pair: {
        label: 'Pair Programming',
        icon: '👥',
        badgeClass: 'badge-pair',
        hint: 'AI құрылым ұсынады, оқушы ішін толтырады',
        welcome: 'Pair Programming режимі қосылды. Мен саған кодтың скелетін беремін — сен оның ішін толтырасың!',
        systemPrompt: `Сен AI Pair Programming серіктессің. Python кодын оқушымен кезектесіп жазасың.

Міндетті ережелер:
- Толық жұмыс істейтін шешімді ЕШҚАШАН ұсынба.
- Тек қана функция/класс/блок ҚҰРЫЛЫМЫН (скелетін) көрсет:
  - Функцияның атауы мен параметрлерін жаз.
  - Ішіне "# Осында өз кодыңды жаз" немесе "pass" орнатып қой.
  - Орындалуы тиіс логиканы қысқаша қазақша түсініктеме (комментарий) ретінде бер.
- Оқушы жазған код үзіндісін тексеріп, оған келесі қадамды ұсын.
- Аяқталған толық кодты бермей, тек келесі логикалық кезеңге бағыттап отыр.
- Жауапты қазақ тілінде бер.
- Код үлгілерін тек \`\`\`python ... \`\`\` блогына жаз.`
    },

    socratic: {
        label: 'Socratic',
        icon: '💬',
        badgeClass: 'badge-socratic',
        hint: 'Жетекші сұрақтармен оқушыны өз бетімен шешімге жеткізеді',
        welcome: 'Socratic режимі қосылды. Кодыңды немесе сұрағыңды жаз — мен дайын жауап бермеймін, бірақ дұрыс бағытқа жетелейтін сұрақтар қоямын.',
        systemPrompt: `Сен Сократ диалогы әдісімен жұмыс істейтін AI мұғалімсің.

Міндетті ережелер:
- Оқушы кодындағы қате немесе жетіспеушілікті ТІКЕЛЕЙ айтып түсіндірме.
- Дайын жауапты немесе дұрыс жазылған кодты берме.
- Студенттің сұрағына немесе кодына жауап ретінде 2-3 жетекші сұрақ қой — оқушы дұрыс шешімге өзі жетсін.
- Сұрақтар өте нақты әрі ойландыратын болсын, мысалы:
  "range(1, 10) функциясы соңғы 10 санын қамтиды ма, қалай ойлайсың?"
  "Егер пайдаланушы теріс сан немесе 0 енгізсе, бағдарламаң қалай әрекет етеді?"
  "= және == операторларының айырмашылығы неде және олар қай кезде қолданылады?"
- Оқушы дұрыс бағытта жауап берсе — оны мақтап, тақырыпты тереңдету үшін келесі сұраққа көш.
- Жауапты қазақ тілінде, сабырлы әрі ынталандырушы тонмен жаз.`
    },

    bug_hunting: {
        label: 'Bug Hunting',
        icon: '🐛',
        badgeClass: 'badge-bug',
        hint: 'AI қатесі бар код береді — оқушы қатені табады',
        welcome: 'Bug Hunting режимі қосылды! Саған қатесі бар Python кодын ұсынамын — қатені тауып, оның неліктен қате екенін түсіндіріп көр!',
        systemPrompt: `Сен Bug Hunting режиміндегі тапқыр AI мұғалімсің.

Ережелер:
- Жаңа сұрақ алсаң немесе оқушы дайындығын білдірсе — оған Python тілінде 1-2 синтаксистік немесе логикалық қатесі бар ҚЫСҚА код бер.
- Кодтағы қатенің не екенін БІРДЕН айтпа — оқушыдан оны өзі тауып, түсіндіруін сұра.
- Оқушы қатені дұрыс тапса — оны мақта, қате туралы толық қазақша түсіндірме бер және жаңа, сәл қиынырақ мысал ұсын.
- Оқушы дұрыс таба алмаса — бағыттаушы кеңестер бер, бірақ жауапты өзің жазып берме.
- Барлық сөйлесу қазақ тілінде болуы тиіс. Кодты тек \`\`\`python ... \`\`\` блогына жаз.`
    },

    theory_module: {
        label: 'Оқу модулі',
        icon: '📚',
        badgeClass: 'badge-theory',
        hint: 'Интерактивті оқу модулі — теориялық түсіндірмелер мен сұрақтар',
        welcome: 'Интерактивті оқу модуліне қош келдіңіз! 📚 Python-ның қай тақырыбын түсіндіріп берейін? Тақырып соңында біліміңді тексеруге шағын квиз де ұйымдастыра аламын.',
        systemPrompt: `Сен Python бағдарламалау тілінің тәжірибелі, қамқор оқу мұғалімісің.

    КУРС БАҒДАРЛАМАСЫ:
    1. Python тілінің негізгі элементтері
    1.1 Экранға шығару және түсініктеме (print, #)
    1.2 Айнымалылар және типтер (str, int, float, bool)
    1.3 input() функциясы

    2. Шарттар мен Тармақталу
    2.1 if, elif, else
    2.2 Салыстыру операторлары (>, <, ==, !=, >=, <=)
    2.3 Логикалық операторлар (and, or, not)
    2.4 Тернарлық оператор

    3. Қайталанулар (Циклдер)
    3.1 while циклі
    3.2 for және range()
    3.3 break және continue

    4. Деректер құрылымы
    4.1 Тізімдер (Lists) — append(), remove()
    4.2 Кортеждер (Tuples)
    4.3 Жиындар (Sets)
    4.4 Сөздіктер (Dictionaries)

    5. Функциялар мен Жоба
    5.1 Функция құрылымы (def, параметрлер, return, lambda)
    5.2 Қорытынды жоба (RPG симуляторы)

    ЖАУАП ФОРМАТЫ — ТІКЕЛЕЙ теориялық түсіндірме мен өмірлік аналогия, ешқандай қажетсіз кіріспе сөздерсіз:

    ТАҚЫРЫП АТЫ
    Бөлім аты - Өмірлік мысалмен түсіндірме
    \`\`\`python
    # түсінікті қысқа код мысалы
    \`\`\`

    Түсінікті болса, келесі шағын тапсырманы орындап көр:
    [тақырыпты бекітетін шағын интерактивті есеп]

    ҚАТАҢ ЕРЕЖЕЛЕР:
    - Дайын жауапты немесе толық дайын кодты БЕРМЕ.
    - Оқушы қате жауап берсе, бірден дұрыс нұсқасын айтпа — бағыттаушы сұрақтар қой.
    - Оқушы "маған дайын код жаз" десе — тек оның қадамдарын немесе жалған кодын (псевдокод) ұсын.
    - Тіл: толықтай қазақша, достық және жігерлендіруші стильде.`
    },
    
    python_ref: {
        label: 'Анықтамалық',
        icon: '📖',
        badgeClass: 'badge-reference',
        hint: 'Python Анықтамалығы — синтаксис, функциялар мен әдістер жинағы',
        welcome: 'Python анықтамалық режимі белсенді! 📖 Кез келген функцияның (мысалы: print(), append(), len(), split()) немесе оператордың қалай жұмыс істейтінін және синтаксисін сұраңыз.',
        systemPrompt: `Сен Python анықтамалығысың. Сенің міндетің — оқушы сұраған тақырып бойынша тек КЕСТЕ түрінде жауап беру.

    Жауап форматы — ТІКЕЛЕЙ кесте, ешқандай кіріспе мәтінсіз:

    ТАҚЫРЫП АТЫ
    команда - сипаттама
    команда - сипаттама
    ...

    Мысал — "Негізгі синтаксис" сұралса:
    Негізгі синтаксис
    print() - Экранға шығару
    input() - Мәлімет енгізу
    # - Түсініктеме
    type() - Типін тексеру

    Анықтамалықтағы бөлімдер:
    - Негізгі синтаксис: print(), input(), #, type()
    - Деректер типтері: int/float, str, bool, None
    - Басқару құрылымдары: if/elif/else, for...in, while, break/continue
    - Коллекциялар: list[], tuple(), dict{}, set{}
    - Функциялар: def name():, return, lambda, args/kwargs
    - ООП: class, _init_, self, inheritance
    - Файл және қателер: open(), with, try/except, raise
    - Модульдер мен әдістер: import, dir(), help(), math/random
    - Жолдар (String): len(), lower(), upper(), replace()
    - Операторлар: +,-,*,/
    - Логикалық операторлар: and, or, not , ==
    - Салыстыру операторлары: >, <, >=, <= 
    - Тізім әдістері: append(), remove(), sort(), reverse()
    - Сөздік әдістері: keys(), values(), items(), get()
    - Цикл функциялары: range(), enumerate(), zip(), pass
    - Математикалық функциялар: abs(), round(), pow(), max()/min()
    - Тип түрлендіру: int(), float(), str(), bool()
    - Comprehension: [x for x in y], {x:x*x}, {x for x in y}, if x &gt; 0
    - Уақыт және дата: datetime.now(), strftime(), timedelta, date.today()
    - Random модулі: random(), randint(), choice(), shuffle()
    - OS модулі: os.getcwd(), os.mkdir(), os.remove(), os.listdir()
    - Қате түрлері: ValueError, TypeError, IndexError, KeyError
    - Қосымша функциялар: map(), filter(), sorted(), sum()
    - Boolean тексерулер: is, in, not in, is not
    - Set әдістері: add(), remove(), union(), intersection()
    - Tuple операциялары: count(), index(), len(), in
    - Файл режимдері: "r", "w", "a", "rb"
    - String тексеру: isdigit(), isalpha(), isalnum(), startswith()
    - String форматтау: f"", format(), %s, join()
    - Жолды өңдеу: split(), strip(), find(), count()
    - Сандар: //, %, , **,divmod()
    - Итерация: next(), iter(), reversed(), all()
    - Логикалық тексерулер: any(), all(), bool(), None
    - Class әдістері: @staticmethod, @classmethod, super(), _str_
    - Advanced OOP: encapsulation, polymorphism, abstraction, inheritance
    - JSON: json.load(), json.dump(), loads(), dumps()
    - CSV: csv.reader(), csv.writer(), DictReader(), writerow()
    - Math модулі: sqrt(), ceil(), floor(), pi
    - Lambda мысалдары: lambda x:x*2, map(lambda), filter(lambda), sorted(key=lambda)
    - Decorator: @decorator, wrapper(), *args, kwargs
    - Generator: yield, next(), generator(), StopIteration
    - Virtual Environment: venv, activate, pip install, pip freeze
    - PIP: pip list, pip uninstall, pip show, requirements.txt
    - Try Except кеңейтілген: finally, else, Exception, assert

    Ережелер:
    - Тек кесте бер, ешқандай түсіндірме мәтін жазба
    - Ұзын мысал код берме
    - Сұралған тақырыпқа сәйкес бөлімнен ғана жауап бер
    - Тілі: қазақ`
    }
};

// -------------------------------------------------------------------------
// ГЛОБАЛЬДЫҚ ЖАҒДАЙ
// -------------------------------------------------------------------------
let currentMode = 'scaffolding';
let conversationHistory = [];
let isLoading = false;

// -------------------------------------------------------------------------
// SESSIONSSTORAGE — БЕТТЕР АРАСЫНДА ЧАТТЫ САҚТАУ
// -------------------------------------------------------------------------
function saveChatState() {
    try {
        const state = {
            mode: currentMode,
            history: conversationHistory,
            isOpen: chatWindow ? chatWindow.classList.contains('active') : false,
            html: chatBody ? chatBody.innerHTML : ''
        };
        sessionStorage.setItem('chatState', JSON.stringify(state));
    } catch(e) {}
}

function restoreChatState() {
    try {
        const raw = sessionStorage.getItem('chatState');
        if (!raw) return false;
        const state = JSON.parse(raw);

        // Режимді қалпына келтіру
        if (state.mode && MODES[state.mode]) {
            currentMode = state.mode;
            document.querySelectorAll('.mode-tab').forEach(btn => btn.classList.remove('active'));
            const activeTab = document.querySelector(`.mode-tab[data-mode="${currentMode}"]`);
            if (activeTab) activeTab.classList.add('active');
            const cfg = MODES[currentMode];
            if (modeHint) modeHint.textContent = cfg.hint;
            if (activeModeLabel) activeModeLabel.textContent = cfg.icon + ' ' + cfg.label;
        }

        // Диалог тарихын қалпына келтіру
        if (state.history) conversationHistory = state.history;

        // Чат мазмұнын қалпына келтіру
        if (state.html && chatBody) chatBody.innerHTML = state.html;

        // Чат терезесінің ашық/жабық күйін қалпына келтіру
        if (state.isOpen && chatWindow) {
            chatWindow.classList.add('active');
            chatWindow.setAttribute('aria-hidden', 'false');
            if (chatToggleBtn) chatToggleBtn.setAttribute('aria-expanded', 'true');
            setTimeout(() => { if (chatBody) chatBody.scrollTop = chatBody.scrollHeight; }, 100);
        }

        return true;
    } catch(e) {
        return false;
    }
}

// -------------------------------------------------------------------------
// DOM ЭЛЕМЕНТТЕРІН АЛУ
// -------------------------------------------------------------------------
const chatWindow   = document.getElementById('chatWindow');
const chatToggleBtn = document.getElementById('chatToggleBtn');
const chatBody     = document.getElementById('chatBody');
const chatInput    = document.getElementById('chatInput');
const chatForm     = document.getElementById('chatForm');
const sendBtn      = document.getElementById('chatSendBtn');
const modeHint     = document.getElementById('modeHint');
const activeModeLabel = document.getElementById('activeModeLabel');

// -------------------------------------------------------------------------
// ЧАТТЫ АШУ / ЖАБУ
// -------------------------------------------------------------------------
function toggleChat() {
    const isOpen = chatWindow.classList.toggle('active');
    chatWindow.setAttribute('aria-hidden', String(!isOpen));
    chatToggleBtn.setAttribute('aria-expanded', String(isOpen));

    // Жаңа хабарлама индикаторын өшіру
    chatToggleBtn.classList.remove('has-new');

    if (isOpen) {
        setTimeout(() => chatInput.focus(), 350);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // Чат күйін сақтау
    saveChatState();
}

// -------------------------------------------------------------------------
// РЕЖИМДІ АУЫСТЫРУ
// -------------------------------------------------------------------------
function setMode(mode) {
    if (mode === currentMode) return;
    currentMode = mode;

    // Барлық белсенді таб белгілерін өшіру
    document.querySelectorAll('.mode-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.mode-tab[data-mode="${mode}"]`).classList.add('active');

    // Сипаттамаларды жаңарту
    const cfg = MODES[mode];
    modeHint.textContent = cfg.hint;
    activeModeLabel.textContent = cfg.icon + ' ' + cfg.label;

    // Сөйлесу тарихын тазарту
    conversationHistory = [];

    // Режим ауысты деген хабарды чатқа шығару
    appendBotMessage(cfg.welcome, mode, false);

    // Күйді сақтау
    saveChatState();
}

// -------------------------------------------------------------------------
// ХАБАРЛАМАЛАРДЫ РЕНДЕРЛЕУ ФУНКЦИЯЛАРЫ
// -------------------------------------------------------------------------
function appendBotMessage(text, mode, addToHistory = true) {
    const cfg = MODES[mode || currentMode];
    const row = document.createElement('div');
    row.className = 'msg-row';
    row.innerHTML = `
        <div class="msg-avatar bot-avatar" aria-hidden="true">
            <i class="fa-solid fa-robot"></i>
        </div>
        <div class="msg-content">
            <span class="msg-badge ${cfg.badgeClass}">${cfg.icon} ${cfg.label}</span>
            <div class="bubble bot-bubble">${renderText(text)}</div>
        </div>`;
    chatBody.appendChild(row);
    scrollToBottom();

    if (addToHistory) {
        conversationHistory.push({ role: 'assistant', content: text });
    }
}

function appendUserMessage(text) {
    const row = document.createElement('div');
    row.className = 'msg-row user-row';
    row.innerHTML = `
        <div class="msg-avatar user-avatar" aria-hidden="true">
            <i class="fa-solid fa-user"></i>
        </div>
        <div class="bubble user-bubble">${escapeHtml(text)}</div>`;
    chatBody.appendChild(row);
    scrollToBottom();
}

function showTypingIndicator() {
    const row = document.createElement('div');
    row.className = 'msg-row';
    row.id = 'typingRow';
    const cfg = MODES[currentMode];
    row.innerHTML = `
        <div class="msg-avatar bot-avatar" aria-hidden="true">
            <i class="fa-solid fa-robot"></i>
        </div>
        <div class="msg-content">
            <span class="msg-badge ${cfg.badgeClass}">${cfg.icon} ${cfg.label}</span>
            <div class="bubble bot-bubble">
                <div class="typing-indicator" aria-label="AI жауап беруде">
                    <span></span><span></span><span></span>
                </div>
            </div>
        </div>`;
    chatBody.appendChild(row);
    scrollToBottom();
}

function removeTypingIndicator() {
    const row = document.getElementById('typingRow');
    if (row) row.remove();
}

// -------------------------------------------------------------------------
// ХАБАРЛАМА ЖІБЕРУ ЖӘНЕ GEMINI API КІРІСТІРУ
// -------------------------------------------------------------------------
async function sendMessage(event) {
    if (event) event.preventDefault();
    if (isLoading) return;

    const text = chatInput.value.trim();
    if (!text) return;

    // Интерфейсті жүктеу режиміне ауыстыру
    chatInput.value = '';
    chatInput.style.height = 'auto';
    setLoading(true);

    appendUserMessage(text);
    
    // Сұранысты Gemini форматына сай тарихқа қосу
    conversationHistory.push({ role: 'user', parts: [{ text: text }] });

    // Күйді сақтау
    saveChatState();

    showTypingIndicator();

    try {
        const apiKey = await window.getApiKey();
        if (!apiKey) {
            removeTypingIndicator();
            setLoading(false);
            appendBotMessage("API кілті табылмады немесе енгізілмеді. Жұмыс істеу үшін кілт қажет.", currentMode, false);
            return;
        }

        // Gemini форматына тарихты сәйкестендіру
        const contentsForApi = conversationHistory.map(m => ({
            role: m.role === 'assistant' ? 'model' : (m.role || 'user'),
            parts: m.parts ? m.parts : [{ text: m.content || '' }]
        })).filter(m => m.parts[0]?.text);

        // Жаңа gemini-2.5-flash моделін пайдаланамыз
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: MODES[currentMode].systemPrompt }] },
                contents: contentsForApi.length > 0 ? contentsForApi : [{
                    role: 'user',
                    parts: [{ text: text }]
                }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 400 || response.status === 403) {
                localStorage.removeItem('gemini_api_key');
            }
            throw new Error(`API қатесі: ${response.status} - ${data.error?.message || 'Белгісіз қате'}`);
        }
        
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Жауап алу мүмкін болмады.";

        removeTypingIndicator();
        
        // Боттың қазақша жауабын экранға шығару
        appendBotMessage(reply, currentMode, false);

        // Тарихқа жауапты сақтау
        conversationHistory.push({ role: 'model', parts: [{ text: reply }] });

        // Жаңа күйді сақтау
        saveChatState();

        // Егер чат жабық болса, жаңа хабарлама белгісін жыпылықтату
        if (!chatWindow.classList.contains('active')) {
            chatToggleBtn.classList.add('has-new');
        }

    } catch (err) {
        removeTypingIndicator();
        console.error('Chat API Error:', err);
        appendBotMessage(
            'Байланыс қатесі орын алды. Интернет байланысын немесе API кілтінің дұрыстығын тексеріп көріңіз.',
            currentMode,
            false
        );
        conversationHistory.pop(); // Сәтсіз сұранысты тарихтан өшіру
    } finally {
        setLoading(false);
        chatInput.focus();
    }
}

// -------------------------------------------------------------------------
// КӨМЕКШІ ҚҰРАЛДАР ЖӘНЕ МӘТІН РЕНДЕРІ
// -------------------------------------------------------------------------
function setLoading(loading) {
    isLoading = loading;
    sendBtn.disabled = loading;
    chatInput.disabled = loading;
}

function scrollToBottom() {
    requestAnimationFrame(() => {
        chatBody.scrollTop = chatBody.scrollHeight;
    });
}

function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function renderText(text) {
    // Код блогтарын рендерлеу (```...```)
    let result = escapeHtml(text);
    result = result.replace(
        /```(?:\w+)?\n?([\s\S]*?)```/g,
        (_, code) => `<div class="code-block">${code.trim()}</div>`
    );
    // Инлайн код (`...`)
    result = result.replace(
        /`([^`\n]+)`/g,
        '<code>$1</code>'
    );
    // Жол үзілімдері
    result = result.replace(/\n/g, '<br>');
    return result;
}

// -------------------------------------------------------------------------
// DOM ОҚИҒАЛАРЫН БАҚЫЛАУ
// -------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Алдыңғы чат күйін қалпына келтіру
    restoreChatState();

    // Форманы бақылау
    if (chatForm) {
        chatForm.addEventListener('submit', sendMessage);
    }

    // Enter — жіберу, Shift+Enter — жаңа жол
    if (chatInput) {
        chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Енгізу жолының биіктігін автоматты реттеу
        chatInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 96) + 'px';
        });
    }

    // Режим ауыстыру батырмаларын бақылау
    document.querySelectorAll('.mode-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            if (mode) setMode(mode);
        });
    });
});

// -------------------------------------------------------------------------
// ЧАТ ТАРИХЫН ЖӘНЕ ЭКРАНДЫ ТОЛЫҚ ТАЗАРТУ ФУНКЦИЯСЫ
// -------------------------------------------------------------------------
function clearChat() {
    if (!confirm("Диалог тарихын өшіріп, чатты толық тазалағыңыз келе ме?")) {
        return;
    }

    // Экрандағы барлық хабарламаларды өшіру
    if (chatBody) {
        chatBody.innerHTML = '';
    }

    // Контекст тарихын нөлдеу
    conversationHistory = [];

    // Ағымдағы режимнің бастапқы сәлемдесу мәтінін қайта жүктеу
    const cfg = MODES[currentMode];
    if (cfg) {
        appendBotMessage(cfg.welcome, currentMode, false);
    }

    if (chatInput) {
        chatInput.value = '';
        chatInput.style.height = 'auto';
        chatInput.focus();
    }
    
    saveChatState();
}