// =========================================================================
// AI CODE MENTOR — CHAT.JS
// 4 педагогикалық режим: Scaffolding · Pair Programming · Socratic · Bug Hunting
// Anthropic Claude API арқылы нақты AI жауаптары
// =========================================================================

// -------------------------------------------------------------------------
// РЕЖИМ КОНФИГУРАЦИЯСЫ
// -------------------------------------------------------------------------
const MODES = {
    scaffolding: {
        label: 'Scaffolding',
        icon: '🏗',
        badgeClass: 'badge-scaffolding',
        hint: 'Деңгейлі кеңестер — дайын код берілмейді',
        welcome: 'Scaffolding режимі қосылды. Тапсырмаңды немесе кодыңды жаз — мен 3 деңгейде бағыт сілтеймін.',
        systemPrompt: `Сен информатика пәнінің AI мұғалімісің. Scaffolding (деңгейлі қолдау) педагогикалық әдісін қолданасың.

Міндетті ережелер:
- Оқушыға ЕШҚАШАН дайын кодты жазып берме
- Тек 3 деңгейлі кеңес бер:
  1-деңгей: жалпы түсінік (тапсырманың мақсатын анықта)
  2-деңгей: алгоритмдік бағыт (қадамдарды атап шық)
  3-деңгей: қандай Python операторы / функция / синтаксис керегін айт
- Толық шешімді ешқашан ашпа
- Оқушыны өзі ойлануға итермеле
- Жауапты қазақ тілінде бер
- Ықшам, нақты және ынталандырушы болғын`
    },

    pair: {
        label: 'Pair Programming',
        icon: '👥',
        badgeClass: 'badge-pair',
        hint: 'AI құрылым ұсынады, оқушы ішін толтырады',
        welcome: 'Pair Programming режимі қосылды. Мен саған кодтың скелетін беремін — сен оның ішін толтырасың!',
        systemPrompt: `Сен AI Pair Programming серіктессің. Python кодын оқушымен кезектесіп жазасың.

Міндетті ережелер:
- Толық жұмыс істейтін шешімді ЕШҚАШАН жазба
- Тек функция/класс/блок ҚҰРЫЛЫМЫН ұсын:
  - Функция сигнатурасын жаз
  - Ішіне # Мұнда өз кодыңды жаз немесе pass қой
  - Қандай логиканы жазу керегін қысқаша комментарий ретінде бер
- Оқушы жазған кодты тексеріп, келесі қадамды ұсын
- Аяқталған кодты бермей, тек жалғасуға бағыттап отыр
- Жауапты қазақ тілінде бер
- Кодты \`\`\`python ... \`\`\` блогына жаз`
    },

    socratic: {
        label: 'Socratic',
        icon: '💬',
        badgeClass: 'badge-socratic',
        hint: 'Жетекші сұрақтармен оқушыны өзіне жеткізеді',
        welcome: 'Socratic режимі қосылды. Кодыңды жаз — мен дайын жауап бермеймін, бірақ дұрыс бағытқа жетекші сұрақтар қоямын.',
        systemPrompt: `Сен Сократ диалогы әдісімен жұмыс істейтін AI мұғалімсің.

Міндетті ережелер:
- Оқушы кодындағы қате немесе жетіспеушілікті ТІКЕЛЕЙ АЙТПА
- Дайын жауап БЕРМЕ
- 2-3 жетекші сұрақ қой — оқушыны өзі жеткізуге итермеле
- Сұрақтар нақты болсын, мысалы:
  "range(1, 10) соңғы 10 санын қосады ма?"
  "Егер пайдаланушы теріс сан енгізсе, не болады?"
  "= және == операторларының айырмашылығы неде?"
- Оқушы жауап берсе — мақта және тереңірек сұрақ қой
- Жауапты қазақ тілінде бер
- Сабырлы, ынталандырушы тон ұста`
    },

    bug_hunting: {
        label: 'Bug Hunting',
        icon: '🐛',
        badgeClass: 'badge-bug',
        hint: 'AI қатесі бар код береді — оқушы тапқызады',
        welcome: 'Bug Hunting режимі қосылды! Саған қатесі бар Python коды беремін — қатені тауып, неліктен қате екенін түсіндір!',
        systemPrompt: `Сен Bug Hunting режиміндегі AI мұғалімсің.

Ережелер:
- Жаңа сұрақ алсаң немесе оқушы дайын болса — оған Python тілінде 1-2 синтаксистік немесе логикалық қатесі бар ҚЫСҚА код бер
- Қатені БІРДЕН АЙТПА — оқушыдан өзі тапқызуды сұра
- Оқушы қатені тапса — мақта, қате туралы толық түсіндіріс бер
- Оқушы дұрыс жерді тапқан жоқ болса — бағыттаушы кеңес бер, бірақ жауапты берме
- Тапқаннан кейін жаңа, қиынырақ мысал бер
- Жауапты қазақ тілінде бер
- Кодты \`\`\`python ... \`\`\` блогына жаз`
    },
    theory_module: {
        label: 'Оқу модулі',
        icon: '📚',
        badgeClass: 'badge-theory',
        hint: 'Интерактивті оқу модулі — теориялық түсіндірмелер мен сұрақтар',
        welcome: 'Интерактивті оқу модуліне қош келдіңіз! 📚 Python-ның қай тақырыбын түсіндіріп берейін? Тақырып соңында білімді тексеруге шағын квиз де ұйымдастыра аламын.',
        systemPrompt: `Сен Python бағдарламалау тілінің тәжірибелі оқу мұғалімісің.

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

    ЖАУАП ФОРМАТЫ — ТІКЕЛЕЙ түсіндірме, ешқандай кіріспе мәтінсіз:

    ТАҚЫРЫП АТЫ
    Бөлім аты - түсіндірме (өмірлік аналогиямен)
    \`\`\`python
    # қысқа код мысалы
    \`\`\`
    Бөлім аты - түсіндірме
    \`\`\`python
    # қысқа код мысалы
    \`\`\`

    Түсінікті болса, келесі шағын тапсырманы орындап көр:
    [тақырыпты бекітетін шағын есеп]

    МЫСАЛ — "1.1 Экранға шығару" сұралса:
    Экранға мәлімет шығару және түсініктемелер
    print() функциясы - Экранға кез келген мәтін немесе сан шығару үшін қолданылады. Мәтінді міндетті түрде тырнақшаға алу керек — жалқы '' немесе қосарланған "".
    \`\`\`python
    print("Hello, World!")
    print("Python тілін үйренуді бастадым!")
    print(2026)
    \`\`\`
    # түсініктеме - Компьютер оқымайды, тек программистке арналған жазба.
    \`\`\`python
    # Бұл — түсініктеме
    print("Сәлем!")  # мұндай да жазуға болады
    \`\`\`

    Түсінікті болса, келесі шағын тапсырманы орындап көр:
    Өз атыңды және жасыңды екі жолда print() арқылы экранға шығар.

    ҚАТАҢ ЕРЕЖЕЛЕР:
    - Дайын жауап немесе толық код БЕРМЕ
    - Қате жауапта бірден айтпа — бағыттаушы сұрақ қой
    - "Дайын код жаз" десе — тек псевдокод немесе қадамдар бер
    - Тіл: тек қазақша, достық және ынталандырушы тонмен`
    },
    
    // ЖАҢА ФУНКЦИЯ 2: Python Анықтамалығы
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
    - ООП: class, __init__, self, inheritance
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
    - Class әдістері: @staticmethod, @classmethod, super(), __str__
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
// SESSIONSSTORAGE — БЕТТЕР АРАСЫНДА ЧАТ САҚТАУ
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

        // Чат терезесін ашық/жабық қалпына келтіру
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
// DOM-ға ОҚУ
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
// ЧАТ АШУ / ЖАБУ
// -------------------------------------------------------------------------
function toggleChat() {
    const isOpen = chatWindow.classList.toggle('active');
    chatWindow.setAttribute('aria-hidden', String(!isOpen));
    chatToggleBtn.setAttribute('aria-expanded', String(isOpen));

    // Жаңа хабарлама нүктесін жою
    chatToggleBtn.classList.remove('has-new');

    if (isOpen) {
        setTimeout(() => chatInput.focus(), 350);
        chatBody.scrollTop = chatBody.scrollHeight;
    }

    // Күйді сақтау
    saveChatState();
}

// -------------------------------------------------------------------------
// РЕЖИМ АУЫСТЫРУ
// -------------------------------------------------------------------------
function setMode(mode) {
    if (mode === currentMode) return;
    currentMode = mode;

    // Барлық табтарды өшіру
    document.querySelectorAll('.mode-tab').forEach(btn => btn.classList.remove('active'));
    document.querySelector(`.mode-tab[data-mode="${mode}"]`).classList.add('active');

    // Сипаттама жаңарту
    const cfg = MODES[mode];
    modeHint.textContent = cfg.hint;
    activeModeLabel.textContent = cfg.icon + ' ' + cfg.label;

    // Тарихты тазалау
    conversationHistory = [];

    // Режим ауысты деген хабар
    appendBotMessage(cfg.welcome, mode, false);

    // Күйді сақтау
    saveChatState();
}

// -------------------------------------------------------------------------
// ХАБАРЛАМА ҚОСУ ФУНКЦИЯЛАРЫ
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
// ХАБАРЛАМА ЖІБЕРУ (GEMINI API ШАҚЫРУ)
// -------------------------------------------------------------------------
async function sendMessage(event) {
    if (event) event.preventDefault();
    if (isLoading) return;

    const text = chatInput.value.trim();
    if (!text) return;

    // UI жаңарту
    chatInput.value = '';
    chatInput.style.height = 'auto';
    setLoading(true);

    appendUserMessage(text);
    
    // Gemini форматына сәйкес тарихты сақтау (role: 'user' немесе 'model')
    conversationHistory.push({ role: 'user', parts: [{ text: text }] });

    // Күйді сақтау
    saveChatState();

    showTypingIndicator();

    try {
        // getApiKey modal арқылы немесе localStorage fallback
        let apiKey;
        if (typeof window.getApiKey === 'function') {
            apiKey = await window.getApiKey();
        } else {
            apiKey = localStorage.getItem('gemini_api_key');
            if (!apiKey) {
                apiKey = prompt('Gemini API кілтін енгіз (aistudio.google.com/apikey):');
                if (apiKey) localStorage.setItem('gemini_api_key', apiKey.trim());
            }
        }
        if (!apiKey) {
            removeTypingIndicator();
            setLoading(false);
            appendBotMessage("API кілті енгізілген жоқ. Жұмыс істеу үшін кілт қажет.", currentMode, false);
            return;
        }

        // Conversation history-ді дұрыс Gemini форматына түрлендіру
        const contentsForApi = conversationHistory.map(m => ({
            role: m.role === 'assistant' ? 'model' : (m.role || 'user'),
            parts: m.parts ? m.parts : [{ text: m.content || '' }]
        })).filter(m => m.parts[0]?.text);
        // ӨЗГЕРТІЛДІ: Модель gemini-2.0-flash орнына тұрақты әрі тегін gemini-1.5-flash қойылды
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: MODES[currentMode].systemPrompt }] },
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
        
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text || "Жауап табылмады";

        removeTypingIndicator();
        
        // Бот жауабын экранға шығару
        appendBotMessage(reply, currentMode, false);

        // Тарихқа бот жауабын Gemini форматында қосу ('model' рөлі қолданылады)
        conversationHistory.push({ role: 'model', parts: [{ text: reply }] });

        // Күйді сақтау (бет ауысқанда жоғалмасын)
        saveChatState();

        // Чат жабық болса — нүкте көрсету
        if (!chatWindow.classList.contains('active')) {
            chatToggleBtn.classList.add('has-new');
        }

    } catch (err) {
        removeTypingIndicator();
        console.error('Chat API error:', err);
        appendBotMessage(
            'Желі қатесі орын алды. Интернет байланысын немесе API кілтін тексер.',
            currentMode,
            false
        );
        // Қате болған жағдайда соңғы жіберілген сұрақты тарихтан алып тастау (қайта жіберуге ыңғайлы болу үшін)
        conversationHistory.pop();
    } finally {
        setLoading(false);
        chatInput.focus();
    }
}

// -------------------------------------------------------------------------
// КӨМЕКШІ ФУНКЦИЯЛАР
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
// ОҚИҒАЛАРДЫ ТІРКЕУ
// -------------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', () => {
    // Бет жүктелгенде алдыңғы чат күйін қалпына келтіру
    const restored = restoreChatState();

    // Форма жіберу
    if (chatForm) {
        chatForm.addEventListener('submit', sendMessage);
    }

    // Enter — жіберу, Shift+Enter — жол үзілімі
    if (chatInput) {
        chatInput.addEventListener('keydown', e => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Автоматты биіктік
        chatInput.addEventListener('input', function () {
            this.style.height = 'auto';
            this.style.height = Math.min(this.scrollHeight, 96) + 'px';
        });
    }

    // Режим табтарын іздеу және тіркеу
    document.querySelectorAll('.mode-tab').forEach(btn => {
        btn.addEventListener('click', () => {
            const mode = btn.getAttribute('data-mode');
            if (mode) setMode(mode);
        });
    });
});

// -------------------------------------------------------------------------
// ЧАТ ТАРИХЫН ЖӘНЕ ЭКРАНДЫ ТАЗАЛАУ ФУНКЦИЯСЫ
// -------------------------------------------------------------------------
function clearChat() {
    // Пайдаланушы байқаусызда басып кетпеуі үшін сұрау терезесі
    if (!confirm("Диалог тарихын өшіріп, чатты толық тазалағыңыз келе ме?")) {
        return;
    }

    // 1. Экрандағы барлық хабарламаларды тазарту
    if (chatBody) {
        chatBody.innerHTML = '';
    }

    // 2. Ішкі Gemini диалог тарихын (контекстін) нөлге түсіру
    conversationHistory = [];

    // 3. Ағымдағы белсенді режимнің сәлемдесу хабарламасын қайта шығару
    const cfg = MODES[currentMode];
    if (cfg) {
        // addToHistory = false етіп жібереміз, жүйелік хабарлама тарихқа кірмеуі керек
        appendBotMessage(cfg.welcome, currentMode, false);
    }

    // 4. Енгізу өрісін бастапқы қалпына келтіріп, фокус қою
    if (chatInput) {
        chatInput.value = '';
        chatInput.style.height = 'auto';
        chatInput.focus();
    }
}