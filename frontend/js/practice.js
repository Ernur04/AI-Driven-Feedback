// ============================================================
//  КӨМЕКШІ ҚҰРАЛДАР (УТИЛИТАЛАР)
// ============================================================
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ============================================================
//  ҚОЙЫНДЫЛАРДЫ АУЫСТЫРУ (ТАБТАР)
// ============================================================
function switchTab(name, event) {
    document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

    const targetPanel = document.getElementById('tab-' + name);
    if (targetPanel) targetPanel.classList.add('active');

    if (event && event.currentTarget) {
        event.currentTarget.classList.add('active');
    } else {
        const indexMap = { 'checker': 0, 'tasks': 1, 'hints': 2, 'compiler': 3 };
        const btns = document.querySelectorAll('.tab-btn');
        if (indexMap[name] !== undefined && btns[indexMap[name]]) {
            btns[indexMap[name]].classList.add('active');
        }
    }

    if (name === 'tasks' && document.getElementById('tasksGrid').children.length === 0) {
        renderDefaultTasks();
    }
}

function switchTabByName(name) { switchTab(name); }

// ============================================================
//  GEMINI API КӨМЕКШІСІ (Gemini 2.5 & JSON режиміне оңтайландырылған)
// ============================================================
async function callGemini(systemPrompt, userMessage) {
    const apiKey = await window.getApiKey();
    if (!apiKey) throw new Error("API кілті енгізілмеді!");

    // Жаңа жылдам gemini-2.5-flash моделін қолданамыз
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: userMessage }] }],
                generationConfig: {
                    responseMimeType: "application/json"
                }
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 400 || response.status === 401 || response.status === 403) {
                localStorage.removeItem('gemini_api_key');
            }
            throw new Error(data.error?.message || `HTTP қате: ${response.status}`);
        }

        return data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    } catch (error) {
        console.error("Gemini API қатесі:", error);
        throw error;
    }
}

// ============================================================
//  AI КОД ТАЛДАУШЫСЫ
// ============================================================
function clearEditor() {
    document.getElementById('codeInput').value = '';
}

function clearResult() {
    document.getElementById('aiResult').innerHTML = `
        <div class="result-empty">
            <i class="fa-solid fa-robot"></i>
            <p>Кодыңызды жазып, <strong>AI арқылы тексеру</strong> батырмасын басыңыз</p>
        </div>`;
}

async function runAICheck() {
    const code = document.getElementById('codeInput').value.trim();
    if (!code) { showToast('Алдымен кодыңды жаз!', 'warning'); return; }

    const btn = document.querySelector('#tab-checker .btn-primary');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div> Талдау...'; }

    const resultEl = document.getElementById('aiResult');
    resultEl.innerHTML = `<div class="loading-wrap"><div class="spinner"></div> AI кодыңызды талдап жатыр...</div>`;

    const systemPrompt = `Сен Python бағдарламалау тілінің кәсіби талдаушысысың.
Кодты тексеріп, нәтижені міндетті түрде қазақ тілінде, мына JSON форматында қайтар (ешқандай markdown белгілерінсіз, тек таза JSON):
{
  "has_errors": true/false,
  "errors": [{"line": "қатесі бар жол немесе код үзіндісі", "description": "қатенің қазақша түсіндірмесі"}],
  "explanation": "Кодтың логикасы мен кемшіліктеріне қазақ тіліндегі қысқаша шолу",
  "improved_code": "Оңтайландырылған немесе жақсартылған код нұсқасы (немесе бос жол)",
  "style_issues": ["PEP 8 стилі бойынша ескертулер мен кеңестер"],
  "logic_explanation": "Кодтың негізгі қызметін түсіндіретін 1-2 қазақша сөйлем"
}`;

    try {
        const raw = await callGemini(systemPrompt, `Мына Python кодын тексерші:\n\`\`\`python\n${code}\n\`\`\``);
        const result = JSON.parse(raw);
        renderCheckerResult(result, code);
    } catch (e) {
        console.error("AICheck қатесі:", e);
        resultEl.innerHTML = `<div class="ai-result-block">
            <div class="ai-section">
                <div class="ai-section-title"><i class="fa-solid fa-circle-exclamation"></i> Қате орын алды</div>
                <div class="error-tag" style="display:block;"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(e.message)}</div>
                <p style="margin-top:10px; font-size:0.85rem; color:var(--text-secondary);">API кілтін немесе интернет байланысын тексеріп көріңіз.</p>
            </div>
        </div>`;
    } finally {
        if (btn) { btn.disabled = false; btn.innerHTML = origHtml; }
    }
}

function renderCheckerResult(r, originalCode) {
    const el = document.getElementById('aiResult');
    let html = '<div class="ai-result-block">';

    // Статус
    html += `<div class="ai-section">
        <div class="ai-section-title"><i class="fa-solid fa-${r.has_errors ? 'bug' : 'circle-check'}"></i> Статус</div>
        <div class="${r.has_errors ? 'error-tag' : 'success-tag'}">
            <i class="fa-solid fa-${r.has_errors ? 'circle-xmark' : 'circle-check'}"></i>
            ${r.has_errors ? 'Қателер немесе кемшіліктер табылды' : 'Код керемет жазылған! Қате жоқ.'}
        </div>
    </div>`;

    // Қателер
    if (r.errors && r.errors.length > 0) {
        html += `<div class="ai-section">
            <div class="ai-section-title"><i class="fa-solid fa-triangle-exclamation"></i> Қателер</div>
            ${r.errors.map(e => `<div class="error-tag" style="display:block; margin-bottom:6px;">
                <strong>${escapeHtml(String(e.line))}</strong> — ${escapeHtml(e.description)}
            </div>`).join('')}
        </div>`;
    }

    // Түсіндіру
    if (r.explanation) {
        html += `<div class="ai-section">
            <div class="ai-section-title"><i class="fa-solid fa-book-open-reader"></i> Толық түсіндірме</div>
            <div class="explanation-box">${escapeHtml(r.explanation).replace(/`([^`]+)`/g, '<code>$1</code>')}</div>
        </div>`;
    }

    // Логика
    if (r.logic_explanation) {
        html += `<div class="ai-section">
            <div class="ai-section-title"><i class="fa-solid fa-diagram-project"></i> Бағдарлама логикасы</div>
            <div class="explanation-box">${escapeHtml(r.logic_explanation)}</div>
        </div>`;
    }

    // Стиль
    if (r.style_issues && r.style_issues.length > 0) {
        html += `<div class="ai-section">
            <div class="ai-section-title"><i class="fa-solid fa-palette"></i> PEP 8 стиль ескертулері</div>
            ${r.style_issues.map(s => `<div class="warning-tag" style="display:block; margin-bottom:6px;">${escapeHtml(s)}</div>`).join('')}
        </div>`;
    }

    // Жақсартылған код
    if (r.improved_code && r.improved_code.trim() && r.improved_code.trim() !== originalCode.trim()) {
        html += `<div class="ai-section">
            <div class="ai-section-title" style="justify-content:space-between;">
                <span><i class="fa-solid fa-wand-magic-sparkles"></i> Оңтайландырылған код</span>
                <button class="btn-sm btn-ghost" onclick="copyImprovedCode(this)" style="font-size:0.75rem; padding:4px 10px;">
                    <i class="fa-solid fa-copy"></i> Көшіру
                </button>
            </div>
            <pre class="improved-code-box" data-code="${escapeHtml(r.improved_code)}">${escapeHtml(r.improved_code)}</pre>
        </div>`;
    }

    html += '</div>';
    el.innerHTML = html;
}

function copyImprovedCode(btn) {
    const pre = btn.closest('.ai-section').querySelector('pre');
    const code = pre ? pre.dataset.code || pre.textContent : '';
    navigator.clipboard.writeText(code).then(() => {
        btn.innerHTML = '<i class="fa-solid fa-check"></i> Көшірілді';
        setTimeout(() => { btn.innerHTML = '<i class="fa-solid fa-copy"></i> Көшіру'; }, 2000);
    });
}

// ============================================================
//  ТАПСЫРМАЛАР БАЗАСЫ (ҚАЗАҚ ТІЛІНДЕ)
// ============================================================
const defaultTasks = [
    // --- EASY (1-50) ---
    { id:1, level:'easy', title:'Сан қосындысы', desc:'1-ден N-ге дейінгі сандардың қосындысын есепте.', hint:'range() және sum() функцияларын қолдан' },
    { id:2, level:'easy', title:'Жұп/тақ тексеру', desc:'Санның жұп немесе тақ екенін анықта.', hint:'% операторын пайдалан' },
    { id:3, level:'easy', title:'Максимум табу', desc:'Тізімдегі ең үлкен санды табатын функция жаз.', hint:'max() немесе цикл қолдан' },
    { id:4, level:'easy', title:'Сәлемдесу', desc:'Пайдаланушы атын алып, "Сәлем, [аты]!" деп шығар.', hint:'input() немесе f-string қолдан' },
    { id:5, level:'easy', title:'Минутты секундқа', desc:'Берілген минутты секундқа айналдыратын функция жаз.', hint:'Минутты 60-қа көбейт' },
    { id:6, level:'easy', title:'Үшбұрыш ауданы', desc:'Табаны мен биіктігі бойынша үшбұрыш ауданын есепте.', hint:'(a * h) / 2 формуласын қолдан' },
    { id:7, level:'easy', title:'Тізім ұзындығы', desc:'len() қолданбай тізімдегі элементтер санын есепте.', hint:'for циклін және есептегішті қолдан' },
    { id:8, level:'easy', title:'Тізімді кері айналдыру', desc:'Тізімдегі элементтерді кері ретпен орналастыр.', hint:'[::-1] немесе reverse() қолдан' },
    { id:9, level:'easy', title:'Бірінші элемент', desc:'Тізімдегі бірінші элементті қайтаратын функция жаз.', hint:'Индекстеуді қолдан [0]' },
    { id:10, level:'easy', title:'Квадрат есептеу', desc:'Берілген санның квадратын есептейтін функция жаз.', hint:'**2 немесе x * x қолдан' },
    { id:11, level:'easy', title:'Сөздегі әріптер', desc:'Сөзде берілген әріптің неше рет кездесетінін сана.', hint:'count() әдісін қолдан' },
    { id:12, level:'easy', title:'Екі санның үлкені', desc:'Екі санның қайсысы үлкен екенін анықта.', hint:'if-else шартын қолдан' },
    { id:13, level:'easy', title:'Теріс санды тексеру', desc:'Сан 0-ден кіші болса True қайтар.', hint:'x < 0 шартын қолдан' },
    { id:14, level:'easy', title:'Сандарды біріктіру', desc:'Екі тізімді біріктіріп, жаңа тізім жаса.', hint:'+ операторын қолдан' },
    { id:15, level:'easy', title:'Орташа мән', desc:'Тізімдегі сандардың орташа мәнін тап.', hint:'sum() / len() формуласын қолдан' },
    { id:16, level:'easy', title:'Тек сандар', desc:'Тізімнен тек сандарды сүзгіден өткіз.', hint:'isinstance(x, int) қолдан' },
    { id:17, level:'easy', title:'Температура C -> F', desc:'Цельсийді Фаренгейтке айналдыр.', hint:'(C * 9/5) + 32' },
    { id:18, level:'easy', title:'Бос тізімді тексеру', desc:'Тізім бос болса True қайтар.', hint:'not list немесе len() == 0' },
    { id:19, level:'easy', title:'Көбейту кестесі', desc:'Берілген санға арналған 1-10 кестесін шығар.', hint:'for i in range(1, 11)' },
    { id:20, level:'easy', title:'Ең кіші сан', desc:'Тізімдегі ең кіші санды тап.', hint:'min() қолдан' },
    { id:21, level:'easy', title:'Қалдықсыз бөліну', desc:'Сан 5-ке және 3-ке қалдықсыз бөліне ме?', hint:'% 15 == 0' },
    { id:22, level:'easy', title:'Сөзді үлкен әріппен', desc:'Мәтінді толығымен бас әріптермен жаз.', hint:'upper() әдісін қолдан' },
    { id:23, level:'easy', title:'Ең соңғы элемент', desc:'Тізімдегі соңғы элементті ал.', hint:'[-1] индексін қолдан' },
    { id:24, level:'easy', title:'Кіші әріптер', desc:'Мәтінді толығымен кіші әріптерге айналдыр.', hint:'lower() қолдан' },
    { id:25, level:'easy', title:'Бос орындарды жою', desc:'Мәтіннің басы мен соңындағы бос орындарды жой.', hint:'strip() қолдан' },
    { id:26, level:'easy', title:'Тізімді сұрыптау', desc:'Тізімді өсу ретімен сұрыпта.', hint:'sort() немесе sorted() қолдан' },
    { id:27, level:'easy', title:'Жолдың ұзындығы', desc:'Мәтіннің неше таңбадан тұратынын тап.', hint:'len() қолдан' },
    { id:28, level:'easy', title:'Типті тексеру', desc:'Берілген айнымалының типін қайтар.', hint:'type() функциясын қолдан' },
    { id:29, level:'easy', title:'Жолдарды қосу', desc:'Екі сөйлемді бір-біріне жалға.', hint:'+ операторын қолдан' },
    { id:30, level:'easy', title:'Элементті өшіру', desc:'Тізімнен соңғы элементті өшір.', hint:'pop() әдісін қолдан' },
    { id:31, level:'easy', title:'Жаңа элемент қосу', desc:'Тізімнің соңына жаңа сан қосу.', hint:'append() қолдан' },
    { id:32, level:'easy', title:'Дөңгелектеу', desc:'Бөлшек санды ең жақын бүтінге дөңгелету.', hint:'round() қолдан' },
    { id:33, level:'easy', title:'Абсолют мән', desc:'Теріс санды оң санға (модуль) айналдыр.', hint:'abs() қолдан' },
    { id:34, level:'easy', title:'Дәрежеге шығару', desc:'A санын B дәрежесіне шығар.', hint:'pow(a, b) немесе a ** b' },
    { id:35, level:'easy', title:'Бірінші әріпі', desc:'Сөздің бірінші әріпін қайтар.', hint:'word[0]' },
    { id:36, level:'easy', title:'Кеңістікпен бөлу', desc:'Сөйлемді сөздер тізіміне бөл.', hint:'split() қолдан' },
    { id:37, level:'easy', title:'Мәтінді қайталау', desc:'Берілген сөзді N рет қайталап жаз.', hint:'word * N' },
    { id:38, level:'easy', title:'Бульдік инверсия', desc:'True болса False, False болса True қайтар.', hint:'not операторын қолдан' },
    { id:39, level:'easy', title:'Нөлге бөлу', desc:'Егер бөлгіш 0 болса, "Қате" деп қайтар.', hint:'if b == 0:' },
    { id:40, level:'easy', title:'Тізімде бар ма?', desc:'Элемент тізімнің ішінде бар екенін тексер.', hint:'in операторы' },
    { id:41, level:'easy', title:'Санның тамыры', desc:'Берілген санның квадрат түбірін тап.', hint:'x ** 0.5 немесе math.sqrt()' },
    { id:42, level:'easy', title:'Жұп сандар тізімі', desc:'1-ден 20-ға дейінгі жұп сандарды шығар.', hint:'range(2, 21, 2)' },
    { id:43, level:'easy', title:'Дауысты дыбыс', desc:'Әріптің дауысты екенін тексер.', hint:'char in "aeiouәеёиоуыэюя"' },
    { id:44, level:'easy', title:'Тізімді тазарту', desc:'Тізім ішіндегі барлық элементтерді өшіру.', hint:'clear() әдісін қолдан' },
    { id:45, level:'easy', title:'Элемент индексі', desc:'Тізімдегі белгілі бір санның индексін тап.', hint:'index() әдісін қолдан' },
    { id:46, level:'easy', title:'Соңғы әріп', desc:'Сөздің ең соңғы әріпін қайтар.', hint:'word[-1]' },
    { id:47, level:'easy', title:'Сөздік жасау', desc:'Кілт пен мәні бар қарапайым сөздік жаса.', hint:'{"кілт": "мән"}' },
    { id:48, level:'easy', title:'Тізбекті қосу', desc:'Барлық 1-ден 10-ға дейінгі сандарды қос.', hint:'sum(range(1, 11))' },
    { id:49, level:'easy', title:'Қатардан санды алу', desc:'Мәтіндегі "10" саную Integer-ге айналдыр.', hint:'int() функциясын қолдан' },
    { id:50, level:'easy', title:'Барлығы дұрыс па?', desc:'Тізімдегі барлық мәндер True екенін тексер.', hint:'all() функциясын қолдан' },

    // --- MEDIUM (51-100) ---
    { id:51, level:'medium', title:'Palindrome тексеру', desc:'Берілген сөздің палиндром екенін тексер.', hint:'s == s[::-1]' },
    { id:52, level:'medium', title:'Жай сан (Prime)', desc:'Берілген санның жай сан екенін тексер.', hint:'2-ден sqrt(n)-ге дейін тексер' },
    { id:53, level:'medium', title:'Fibonacci қатары', desc:'Fibonacci қатарының N-ші мүшесін қайтар.', hint:'Рекурсия немесе цикл қолдан' },
    { id:54, level:'medium', title:'Факториал есептеу', desc:'Берілген санның факториалын тап.', hint:'math.factorial немесе цикл' },
    { id:55, level:'medium', title:'Дубликаттарды жою', desc:'Тізімдегі қайталанатын сандарды жой.', hint:'set() қолдан' },
    { id:56, level:'medium', title:'Сөздерді санау', desc:'Мәтінде неше сөз бар екенін анықта.', hint:'split() ұзындығын ал' },
    { id:57, level:'medium', title:'Ең ұзын сөз', desc:'Тізімдегі ең ұзын сөзді тап.', hint:'max(list, key=len)' },
    { id:58, level:'medium', title:'Анаграмма тексеру', desc:'Екі сөздің бір-біріне анаграмма екенін тексер.', hint:'sorted() қолданып салыстыр' },
    { id:59, level:'medium', title:'Сөзді кері айналдыру', desc:'Сөйлемдегі әр сөзді орнында кері жаз.', hint:'split() және [::-1]' },
    { id:60, level:'medium', title:'Екінші максимал', desc:'Тізімдегі екінші ең үлкен санды тап.', hint:'sorted() қолданып [-2] ал' },
    { id:61, level:'medium', title:'Жиілікті санау', desc:'Әр элемент тізімде неше рет кездесетіны тауып бер.', hint:'collections.Counter қолдан' },
    { id:62, level:'medium', title:'Тек жұп индекстер', desc:'Тізімдегі тек жұп индекстегі элементтерді ал.', hint:'list[::2]' },
    { id:63, level:'medium', title:'Екі тізім қиылысуы', desc:'Екі тізімге ортақ элементтерді тап.', hint:'set(a) & set(b)' },
    { id:64, level:'medium', title:'Матрицаны транпозициялау', desc:'2D тізімді (матрицаны) аударыңыз.', hint:'zip(*matrix)' },
    { id:65, level:'medium', title:'Тіркеме сөздер (Capitalize)', desc:'Сөйлемдегі әр сөзді бас әріптен баста.', hint:'title() әдісі' },
    { id:66, level:'medium', title:'URL басталуы', desc:'Мәтін http://-мен басталатынын тексер.', hint:'startswith()' },
    { id:67, level:'medium', title:'Кездейсоқ сан', desc:'1 мен 100 арасындағы кездейсоқ санды шығар.', hint:'random.randint(1, 100)' },
    { id:68, level:'medium', title:'Екі тізімді сөздікке', desc:'Бірінші тізімді кілт, екіншісін мән ретінде сөздік жаса.', hint:'dict(zip(keys, values))' },
    { id:69, level:'medium', title:'Бос орындарды санау', desc:'Мәтіндегі бос орындардың санын есепте.', hint:'count(" ")' },
    { id:70, level:'medium', title:'Қауіпсіз құпия сөз', desc:'Парольде сан, бас әріп, кіші әріп бар жоғын тексер.', hint:'any(c.isupper()) және any(c.isdigit())' },
    { id:71, level:'medium', title:'Жалпақ тізім (Flatten)', desc:'Іштей салынған тізімдерді бір тізімге біріктір.', hint:'[item for sublist in l for item in sublist]' },
    { id:72, level:'medium', title:'Рим сандары -> Араб', desc:'Рим сандарын араб сандарына айналдыр.', hint:'Сөздік қолданып алдыңғы мәнді тексер' },
    { id:73, level:'medium', title:'Бөліктерге бөлу', desc:'Тізімді N элементтен тұратын бөліктерге бөл.', hint:'Бөлу үшін yield немесе кесу (slice)' },
    { id:74, level:'medium', title:'Мәтіндегі сандар қосындысы', desc:'Сөйлемдегі барлық сандарды тауып, қос.', hint:'isdigit() қолдан' },
    { id:75, level:'medium', title:'Екілікке аудару', desc:'Оналтылық немесе ондық жүйеден екілікке аудар.', hint:'bin() функциясын қолдан' },
    { id:76, level:'medium', title:'Файл кеңейтімі', desc:'Файл атауынан оның кеңейтімін ал.', hint:'split(".")[-1]' },
    { id:77, level:'medium', title:'Медиана табу', desc:'Сұрыпталған тізімнің медианасын тап.', hint:'Ортасындағы индексті ал' },
    { id:78, level:'medium', title:'Элементтер көбейтіндісі', desc:'Тізімдегі барлық сандардың көбейтіндісін есепте.', hint:'math.prod немесе цикл' },
    { id:79, level:'medium', title:'Сөздерді сұрыптау', desc:'Мәтіндеге сөздерді алфавит бойынша сұрыпта.', hint:'split() және sort()' },
    { id:80, level:'medium', title:'Циклмен жылжыту', desc:'Тізім элементтерін K қадам оңға жылжыт (Rotate).', hint:'list[-k:] + list[:-k]' },
    { id:81, level:'medium', title:'Сөздіктегі мәндер қосындысы', desc:'Сөздіктегі барлық сандық мәндерді қос.', hint:'sum(dict.values())' },
    { id:82, level:'medium', title:'Біріктірілген сөздік', desc:'Екі сөздікті ортақ кілттермен біріктір.', hint:'{**d1, **d2}' },
    { id:83, level:'medium', title:'Ең ұзын ортақ префикс', desc:'Жолдар тізбегіндегі ең ұзын префиксті тап.', hint:'Әріптерді салыстыра отырып тексер' },
    { id:84, level:'medium', title:'Сөздерді тамырымен топтау', desc:'Ұқсас анаграмма сөздерді бір топқа жина.', hint:'Сұрыпталған сөзді кілт ретінде қолдан' },
    { id:85, level:'medium', title:'Паскаль үшбұрышы', desc:'Паскаль үшбұрышының N-қатарын шығар.', hint:'Алдыңғы қатардың элементтерін қос' },
    { id:86, level:'medium', title:'Арнайы символдар', desc:'Жолдан барлық пунктуация белгілерін өшір.', hint:'isalnum() немесе regex' },
    { id:87, level:'medium', title:'Изоморфты сөздер', desc:'Екі сөз изоморфты ма (белгілерді ауыстыруға бола ма).', hint:'Екі жақты сөздік тексеру' },
    { id:88, level:'medium', title:'Жолды қысу', desc:'"aabb" дегенді "a2b2" деп өзгерт.', hint:'Алдыңғы таңбаны есте сақтап, сана' },
    { id:89, level:'medium', title:'Нөлдерді соңына жылжыту', desc:'Bareliq basqa sandardın retin saqtap nolderdi sonyna apar.', hint:'Нөл еместерді тіркеп, қалғанын нөлмен толтыр' },
    { id:90, level:'medium', title:'Көпретті ауыстыру', desc:'Сөйлемдегі бірнеше сөзді бірден алмастыр.', hint:'replace() немесе regex қолдан' },
    { id:91, level:'medium', title:'Базалық конвертация', desc:'Кез келген N базадан 10 базаға өт.', hint:'int("str", base)' },
    { id:92, level:'medium', title:'Массив ішіндегі жұптар', desc:'Қосындысы K болатын сандар жұбын тап.', hint:'Сөздік (Hash map) қолдан' },
    { id:93, level:'medium', title:'IP мекенжай конфигурациясы', desc:'IPv4 дұрыстығын тексер.', hint:'split(".") және диапазонын (0-255) тексер' },
    { id:94, level:'medium', title:'Телефон нөмірі форматы', desc:'Енгізілген сандарды (123) 456-7890 форматына ауыстыр.', hint:'String форматтау немесе regex' },
    { id:95, level:'medium', title:'Жетіспейтін сан', desc:'1-ден N-ге дейінгі тізімде қай сан жоқ екенін тап.', hint:'N қосындысынан тізім қосындысын ал' },
    { id:96, level:'medium', title:'Екі массивтің айырмасы', desc:'AinB және BinA элементтерін тап.', hint:'set(A) ^ set(B)' },
    { id:97, level:'medium', title:'Аралас типті сорттау', desc:'Сандар мен сөздерді бөлек сұрыптап, қайта біріктір.', hint:'filter() және sort()' },
    { id:98, level:'medium', title:'HTML тегтерін жою', desc:'Мәтін ішінен барлық HTML тегтерін алып таста.', hint:'Regex: <[^>]*>' },
    { id:99, level:'medium', title:'Боулинг ұпайы', desc:'Қатардағы ұпайлардың қосындысын есепте.', hint:'Тіжебк бойынша логикалық шарттар жаз' },
    { id:100, level:'medium', title:'Күнтізбе күні', desc:'Күн, ай, жыл берілгенде оның апта күнін тап.', hint:'datetime модулін қолдан' },
    
    // --- HARD (101-150) ---
    { id:101, level:'hard', title:'Дейкстра алгоритмі (Dijkstra)', desc:'Графтағы ең қысқа жолды есепте.', hint:'Priority Queue немесе heapq қолдан' },
    { id:102, level:'hard', title:'BFS граф іздеу', desc:'Кеңдік бойынша графты аралау.', hint:'collections.deque кезек құрылымын қолдан' },
    { id:103, level:'hard', title:'DFS граф іздеу', desc:'Тереңдік бойынша графты аралау.', hint:'Рекурсия немесе Stack қолдан' },
    { id:104, level:'hard', title:'Бинарлық іздеу (Binary Search)', desc:'Сұрыпталған тізімнен O(log n) уақытта ізде.', hint:'Ортаны (mid) тауып, екі жаққа бөл' },
    { id:105, level:'hard', title:'JSON Parser', desc:'JSON форматындағы жолды Python сөздігіне айналдыр.', hint:'json модулінсіз талдау жаса' },
    { id:106, level:'hard', title:'Валидті жақшалар', desc:'()[]{} жақшаларының дұрыс жабылғанын тексер.', hint:'Stack (Тізім) құрылымын пайдалан' },
    { id:107, level:'hard', title:'Ең үлкен ішкі қосынды', desc:'Kadane алгоритмін пайдаланып ең үлкен қосындыны тап.', hint:'Ағымдағы және жалпы максимумды сақта' },
    { id:108, level:'hard', title:'Судоку валидатор', desc:'9x9 Судоку кестесінің шарттарын (жол, баған, 3x3) тексер.', hint:'set() қолданып қайталануды болдырма' },
    { id:109, level:'hard', title:'Рюкзак есебі (Knapsack 0/1)', desc:'Максимал салмақпен ең көп құндылықты жина.', hint:'Динамикалық программалау (DP) массиві' },
    { id:110, level:'hard', title:'N-Ханым есебі (N-Queens)', desc:'N өлшемді тақтаға N ханымды қауіпсіз орналастыр.', hint:'Backtracking (шегіну) алгоритмін жаз' },
    { id:111, level:'hard', title:'LIS (Longest Increasing Subsequence)', desc:'Ең ұзын өспелі ішкі тізбектің ұзындығын тап.', hint:'Динамикалық программалау (O(n^2) не O(n log n))' },
    { id:112, level:'hard', title:'LRU кэш құру', desc:'Least Recently Used (LRU) кэш сыныбын жаз.', hint:'OrderedDict немесе Hash Map + Doubly Linked List' },
    { id:113, level:'hard', title:'Циклды тізім', desc:'Байланысқан тізімде (Linked List) цикл бар жоғын анықта.', hint:'Floyd\'s Cycle Finding (қоян мен тасбақа)' },
    { id:114, level:'hard', title:'BST тексеру', desc:'Бинарлы ағаштың дұрыс іздеу ағашы екенін тексер.', hint:'Мәндердің min және max ауқымын бақыла' },
    { id:115, level:'hard', title:'Сөз баспалдағы (Word Ladder)', desc:'Бір сөзден екінші сөзге өту үшін қысқа жол тап.', hint:'Граф пен Кеңдікке іздеу (BFS)' },
    { id:116, level:'hard', title:'Топологиялық сұрыптау', desc:'Бағытталған графты (DAG) топологиялық түрде сұрыпта.', hint:'Kahn алгоритмі немесе DFS' },
    { id:117, level:'hard', title:'Ең төменгі ортақ ата-баба', desc:'Бинарлы ағашта екі түйіннің ең жақын ата-бабасын тап.', hint:'LCA (Lowest Common Ancestor) рекурсиясы' },
    { id:118, level:'hard', title:'Trie (Префикстік ағаш)', desc:'Сөз іздеу және енгізу үшін Trie құрылымын жаса.', hint:'Түйіндердегі әріптер сөздігі (dict)' },
    { id:119, level:'hard', title:'Мәтінді туралау', desc:'Жолдарды ұзындығы L болатындай етіп бос орынмен толтыр.', hint:'Greedy тәсіл (Text Justification)' },
    { id:120, level:'hard', title:'Магнит және темір', desc:'Графтағы циклдарды тауып, жоя алатын алгоритм жаз.', hint:'DFS кезінде түстермен (ақ, сұр, қара) бояу' },
    { id:121, level:'hard', title:'Медиана (Екі сұрыпталған)', desc:'Екі сұрыпталған массивтің медианасын O(log(m+n)) тап.', hint:'Екі массивте де бинарлық іздеу жасау' },
    { id:122, level:'hard', title:'Sudoku шешуші', desc:'Бос 9x9 судоку кестесін толтыратын бағдарлама жаз.', hint:'Backtracking арқылы бос ұяшықтарды сынап көру' },
    { id:123, level:'hard', title:'Форд-Фалкерсон', desc:'Графтағы maximaldy agyndy есепте (Max Flow).', hint:'Қалдық граф және BFS (Edmonds-Karp)' },
    { id:124, level:'hard', title:'Эдит қашықтығы', desc:'Бір сөзді екіншіге ауыстырудың ең аз қадамын тап.', hint:'Levenshtein distance (DP)' },
    { id:125, level:'hard', title:'Регулярлы өрнек парсері', desc:'"." және "*" таңбаларын қолдайтын қарапайым regex жаз.', hint:'Рекурсия немесе 2D DP кестесі' },
    { id:126, level:'hard', title:'Аралдар саны', desc:'2D тордағы 1-лер (жер) тобының (аралдар) санын сана.', hint:'DFS немесе BFS арқылы аралап өту' },
    { id:127, level:'hard', title:'Ең үлкен төртбұрыш', desc:'Тек 1-лерден құралған ең үлкен төртбұрыш ауданын тап.', hint:'Maximum Maximal Rectangles (DP)' },
    { id:128, level:'hard', title:'Жаңбыр суы (Trapping Water)', desc:'Блоктар арасында жиналатын барлық су көлемін есепте.', hint:'Екі көрсеткіш (Two Pointers) немесе Prefix Max' },
    { id:129, level:'hard', title:'K Сұрыпталған тізім біріктіру', desc:'K дана сұрыпталған тізімді бір тізімге біріктір.', hint:'Priority Queue (Min-Heap) қолдан' },
    { id:130, level:'hard', title:'Сырғанамалы терезе', desc:'Өлшемі K болатын әр терезедегі ең үлкен санды тап.', hint:'Deque (екі жақты кезек) қолдан' },
    { id:131, level:'hard', title:'Тау элементін табу', desc:'O(log N) уақытында көршілерінен үлкен шыңды тап.', hint:'Бинарлы іздеу' },
    { id:132, level:'hard', title:'Матрицаны 90° бұру', desc:'NxN матрицаны қосымша жадсыз сағат тілімен бұр.', hint:'Транспозициялау және әр жолды кері айналдыру' },
    { id:133, level:'hard', title:'Тапсырмаларды жоспарлау', desc:'Процессор тапсырмаларын орындауға кететін ең аз уақыт.', hint:'Жиіліктер мен басымдық кезегі' },
    { id:134, level:'hard', title:'А* (А жұлдызша) алгоритмі', desc:'Лабиринтте ең қысқа жолды табу.', hint:'Эвристикалық функцияны қолдан' },
    { id:135, level:'hard', title:'Беллман-Форд', desc:'Теріс салмағы бар графтағы ең қысқа жолды тап.', hint:'V-1 рет релаксация жасау' },
    { id:136, level:'hard', title:'Минимакс (Minimax)', desc:'Tic-Tac-Toe ойынында ең оңтайлы жүрісті есепте.', hint:'Рекурсивті ағаш іздеу' },
    { id:137, level:'hard', title:'Қабықша (Convex Hull)', desc:'Нүктелер жиыны үшін ең кіші дөңес көпбұрышты тап.', hint:'Graham Scan алгоритмі' },
    { id:138, level:'hard', title:'Бөлшектік рюкзак', desc:'Заттарды бөлшектеп алуға болатын рюкзак есебі.', hint:'Құндылық / салмақ қатынасын сұрыптау (Greedy)' },
    { id:139, level:'hard', title:'Жалпы ішкі жол (LCS)', desc:'Екі сөздегі ең ұзын ортақ ішкі тізбекті тап.', hint:'Longest Common Subsequence (DP 2D массив)' },
    { id:140, level:'hard', title:'Комбинациялар генераторы', desc:'1-ден N-ге дейін K ұзындықты барлық комбинацияны тап.', hint:'Backtracking (рекурсия)' },
    { id:141, level:'hard', title:'Инверсия санау', desc:'Мәсивте қанша санның реті бұзылғанын есепте.', hint:'Merge Sort алгоритмін түрлендір' },
    { id:142, level:'hard', title:'Құпия сөзді бұзу', desc:'Хэш (MD5/SHA1) арқылы мәтінді құпия сөзді табу (Brute Force).', hint:'itertools.permutations немесе hashlib' },
    { id:143, level:'hard', title:'Түс беру (Graph Coloring)', desc:'Графта көрші төбелердің түсі бірдей болмауын қамтамасыз ет.', hint:'Backtracking арқылы бояулар сынау' },
    { id:144, level:'hard', title:'Ағашты сериализациялау', desc:'Бинарлы ағашты жолға түрлендір және керісінше.', hint:'Pre-order немесе Level-order аралау' },
    { id:145, level:'hard', title:'Ең үлкен палиндром', desc:'Сөздегі ең ұзын палиндромдық ішкі тізбекті тап.', hint:'Барлық орталықтарды кеңейтіп тексеру' },
    { id:146, level:'hard', title:'Деректер қысу ағашы', desc:'Huffman Coding (Хаффман) ағашын жаса.', hint:'Priority Queue арқылы төменгі жиіліктерді біріктіру' },
    { id:147, level:'hard', title:'Математикалық өрнек Parser', desc:'"3 + 5 * (2 - 8)" сияқты жолды есептейтін бағдарлама.', hint:'Shunting Yard алгоритмі және Stack' },
    { id:148, level:'hard', title:'Эйлер циклі', desc:'Графта барлық қабырғаларды дәл бір рет өтетін жолды тап.', hint:'Hierholzer алгоритмі' },
    { id:149, level:'hard', title:'Жалған монета табу', desc:'N монета ішінен жалған монетаны таразы көмегімен O(log N).', hint:'Үшке бөліп тексеру (Ternary Search)' },
    { id:150, level:'hard', title:'Көкжиек (Skyline problem)', desc:'Биік ғимараттардың көрінісінде контур сызығын есепте.', hint:'Оқиғалар тізімі (Sweep Line) ...' },
];

let currentFilter = 'all';
let allTasks = [...defaultTasks];

function renderDefaultTasks() { renderTasks(allTasks); }

function filterTasks(level, btn) {
    currentFilter = level;
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    renderTasks(allTasks);
}

function renderTasks(tasks) {
    const grid = document.getElementById('tasksGrid');
    const filtered = currentFilter === 'all' ? tasks : tasks.filter(t => t.level === currentFilter);
    const labelMap = { easy: '🟢 Оңай', medium: '🟡 Орта', hard: '🔴 Қиын' };
    const badgeMap = { easy: 'badge-easy', medium: 'badge-medium', hard: 'badge-hard' };

    if (filtered.length === 0) {
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-secondary); padding:40px;">Тапсырмалар табылмады</div>`;
        return;
    }

    grid.innerHTML = filtered.map(task => `
        <div class="task-card ${task.level}">
            <div class="task-badge ${badgeMap[task.level]}">${labelMap[task.level]}</div>
            <div class="task-title">${escapeHtml(task.title)}</div>
            <div class="task-desc">${escapeHtml(task.desc)}</div>
            <div class="task-actions">
                <button class="btn-sm btn-primary" onclick="openTaskInEditor(${task.id})">
                    <i class="fa-solid fa-code"></i> Шешу
                </button>
                <button class="btn-sm btn-ghost" onclick="showTaskHint(${task.id})">
                    <i class="fa-solid fa-lightbulb"></i> Кеңес
                </button>
            </div>
        </div>
    `).join('');
}

function openTaskInEditor(id) {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;
    document.getElementById('codeInput').value =
        `# Тапсырма: ${task.title}\n# ${task.desc}\n\ndef solution():\n    pass  # Кодыңды осында жаз\n\nprint(solution())`;
    switchTab('checker');
    showToast(`"${task.title}" тапсырмасы редакторға жүктелді`, 'info');
}

function showTaskHint(id) {
    const task = allTasks.find(t => t.id === id);
    if (!task) return;
    document.getElementById('hintInput').value = task.desc;
    switchTab('hints');
    getHint();
}

async function generateMoreTasks(event) {
    const btn = event ? event.currentTarget : document.querySelector('.btn-outline');
    if(btn) {
        btn.disabled = true;
        btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div> Жасалуда...';
    }

    const systemPrompt = `Сен Python тапсырмалар генераторысың.
Нәтижені міндетті түрде қазақ тілінде, мына JSON форматында қайтар (ешқандай markdown белгілерінсіз, тек таза JSON):
[{"id":100,"level":"easy/medium/hard","title":"Тапсырма атауы","desc":"Сипаттамасы қазақша","hint":"Кеңес қазақша"}]
Тізімде 12 жаңа бірегей тапсырма болуы тиіс (4 easy, 4 medium, 4 hard). Тек Python тақырыбына арналған.`;

    try {
        // callClaude орнына callGemini қолданамыз!
        const raw = await callGemini(systemPrompt, 'Python бағдарламалау бойынша 12 жаңа тапсырма жасап берші.');
        const newTasks = JSON.parse(raw);
        allTasks = newTasks.map((t, i) => ({ ...t, id: 100 + i }));
        currentFilter = 'all';
        document.querySelectorAll('.filter-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
        renderTasks(allTasks);
        showToast('Жаңа тапсырмалар сәтті жүктелді!', 'success');
    } catch (e) {
        showToast('Тапсырма жасау қатесі: ' + e.message, 'error');
    } finally {
        if(btn) {
            btn.disabled = false;
            btn.innerHTML = '<i class="fa-solid fa-rotate"></i> AI-мен жаңарту';
        }
    }
}

// ============================================================
//  КЕҢЕСТЕР МЕН СҰРАҚТАР (HINTS)
// ============================================================
async function getHint() {
    const question = document.getElementById('hintInput').value.trim();
    if (!question) { showToast('Сұрағыңды жаз!', 'warning'); return; }

    const resultEl = document.getElementById('hintResult');
    resultEl.innerHTML = `<div class="loading-wrap"><div class="spinner"></div> AI кеңес дайындап жатыр...</div>`;

    const systemPrompt = `Сен Python бағдарламалау пәнінің тәжірибелі оқытушысысың. Студентке ешқашан дайын шешімді немесе кодты КӨРСЕТПЕ.
Тек бағыт-бағдар бер. Оны дұрыс алгоритмге немесе пайдалы функция/әдіске итермеле.
Мысалы: "len() функциясын қарап көр", "цикл ішіндегі тоқтау шарты туралы ойлан".
Жауабыңды қазақ тілінде сыпайы, қысқа және нұсқа етіп (2-4 сөйлемнен асырмай) жаз.`;

    try {
        // callClaude орнына callGemini қолданамыз!
        const hint = await callGemini(systemPrompt, question);
        resultEl.innerHTML = `
            <div class="hint-bubble ai-result-block">
                <div class="hint-avatar"><i class="fa-solid fa-robot"></i></div>
                <div class="hint-text">${escapeHtml(hint).replace(/`([^`]+)`/g, '<code>$1</code>')}</div>
            </div>`;
    } catch (e) {
        resultEl.innerHTML = `<div class="error-tag" style="display:block;">Қате: ${escapeHtml(e.message)}</div>`;
    }
}

// ============================================================
//  ОНЛАЙН-КОМПИЛЯТОР PYTHON (Piston API мысалдары)
// ============================================================
const compilerExamples = [
    `# 1. Сәлем әлем
print("Сәлем, Әлем!")`,

    `# 2. Математикалық амалдар
a, b = 15, 4
print("Қосу:", a + b)
print("Бөлу:", a / b)
print("Қалдық:", a % b)`,

    `# 3. Fibonacci қатары
def fibonacci(n):
    a, b = 0, 1
    for i in range(n):
        print(a, end=" ")
        a, b = b, a+b
fibonacci(10)`,

    `# 4. Palindrome тексеру
word = "қазақ"
print(word, "палиндром ба?", word == word[::-1])`,

    `# 5. Факториал есептеу (Рекурсия)
def fact(n):
    return 1 if n <= 1 else n * fact(n-1)
print("5! =", fact(5))`,

    `# 6. Тізіммен (List) жұмыс
fruits = ["Алма", "Алмұрт", "Банан"]
fruits.append("Шие")
for f in fruits:
    print(f)`,

    `# 7. List Comprehension (Қысқаша тізімдер)
squares = [x*x for x in range(1, 11)]
print("1-ден 10-ға дейінгі квадраттар:", squares)`,

    `# 8. Жұп сандарды сүзу
nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]
evens = [x for x in nums if x % 2 == 0]
print("Жұп сандар:", evens)`,

    `# 9. Сөздіктермен жұмыс (Dictionary)
student = {"аты": "Арман", "жасы": 16, "пәні": "Информатика"}
for key, value in student.items():
    print(key, "->", value)`,

    `# 10. Жиындар (Set) - бірегей мәндер
numbers = [1, 1, 2, 2, 3, 4, 4, 5]
unique_nums = set(numbers)
print("Бірегей сандар:", unique_nums)`,

    `# 11. Мәтін ұзындығы мен әдістері
text = "python бағдарламалау тілі"
print("Ұзындығы:", len(text))
print("Бас әріппен:", text.capitalize())
print("Ауыстыру:", text.replace("python", "Python"))`,

    `# 12. Екі айнымалының мәнін алмастыру
x, y = 5, 10
x, y = y, x
print(f"x = {x}, y = {y}")`,

    `# 13. Жолдарды форматтау (f-string)
name = "Әлия"
age = 20
print(f"Сәлем, менің атым {name}, жасым {age}-да.")`,

    `# 14. Тізімді кесу (Slicing)
numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
print("Алғашқы үш:", numbers[:3])
print("Соңғы екі:", numbers[-2:])
print("Қадаммен (2):", numbers[::2])`,

    `# 15. Текшелермен (Tuple) жұмыс
point = (10, 20)
print("X координат:", point[0])
print("Y координат:", point[1])`,

    `# 16. Жай санды анықтау алгоритмі
def is_prime(num):
    if num < 2: return False
    for i in range(2, int(num**0.5) + 1):
        if num % i == 0: return False
    return True
print("17 жай сан ба?", is_prime(17))`,

    `# 17. Кездейсоқ сандар генерациясы
import random
print("1 мен 100 арасындағы сан:", random.randint(1, 100))
items = ["Алма", "Алмұрт", "Банан"]
print("Кездейсоқ таңдау:", random.choice(items))`,

    `# 18. Уақыт пен дата (datetime)
from datetime import datetime
now = datetime.now()
print("Қазіргі толық уақыт:", now)
print("Форматталған күн:", now.strftime("%d-%m-%Y %H:%M:%S"))`,

    `# 19. Қателіктерді өңдеу (try-except)
try:
    result = 10 / 0
except ZeroDivisionError:
    result = "Нөлге бөлуге болмайды!"
print("Нәтиже:", result)`,

    `# 20. Lambda (Анонимді функция)
square = lambda x: x ** 2
print("5-тің квадраты:", square(5))
multiply = lambda a, b: a * b
print("3 * 4 =", multiply(3, 4))`,

    `# 21. Map функциясымен тізімді түрлендіру
nums = [1, 2, 3, 4, 5]
squared_nums = list(map(lambda x: x**2, nums))
print("Квадратталған тізім:", squared_nums)`,

    `# 22. Filter функциясымен жұмыс
ages = [12, 18, 15, 22, 30, 17]
adults = list(filter(lambda x: x >= 18, ages))
print("Кәмелетке толғандар:", adults)`,

    `# 23. Enumerate қолдану (Индекс пен мән алу)
languages = ["Python", "Java", "C++"]
for index, lang in enumerate(languages, start=1):
    print(f"{index}. {lang}")`,

    `# 24. Zip функциясымен параллельді цикл
names = ["Али", "Дана", "Серік"]
scores = [85, 92, 78]
for name, score in zip(names, scores):
    print(f"{name} -> {score} ұпай")`,

    `# 25. Тізімнің көшірмесін жасау (Deep vs Shallow)
import copy
original = [[1, 2], [3, 4]]
shallow = original.copy()
deep = copy.deepcopy(original)
original[0][0] = 99
print("Таяз көшірме (shallow):", shallow)
print("Терең көшірме (deep):", deep)`,

    `# 26. Класс және Объект (OOP негіздері)
class Car:
    def __init__(self, brand, model):
        self.brand = brand
        self.model = model
    def get_info(self):
        return f"{self.brand} {self.model}"

my_car = Car("Toyota", "Camry")
print("Көлік туралы ақпарат:", my_car.get_info())`,

    `# 27. Класс мұрагерлігі (Inheritance)
class Animal:
    def speak(self): pass

class Dog(Animal):
    def speak(self): return "Ау-ау!"

class Cat(Animal):
    def speak(self): return "Мияу!"

dog, cat = Dog(), Cat()
print("Ит дыбысы:", dog.speak())
print("Мысық дыбысы:", cat.speak())`,

    `# 28. Файл жазу және оқу (Симуляция)
# with операторы арқылы жұмыс істеу мысалы
file_content = "Python үйрену өте қызықты!\\nБұл екінші жол."
print("Файлға жазылатын мәтін:")
print(file_content)`,

    ` ============================================================
#  ЖЕТІЛДІРІЛГЕН PYTHON МҮМКІНДІКТЕРІ (29-50)
# ============================================================`,

    `# 29. Көпіршікті сұрыптау (Bubble Sort)
def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr
print("Bubble Sort нәтижесі:", bubble_sort([64, 34, 25, 12, 22, 11, 90]))`,

    `# 30. Бинарлық іздеу алгоритмі (Binary Search)
def binary_search(arr, target):
    low, high = 0, len(arr) - 1
    while low <= high:
        mid = (low + high) // 2
        if arr[mid] == target: return mid
        elif arr[mid] < target: low = mid + 1
        else: high = mid - 1
    return -1
nums = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91]
print("Индексі:", binary_search(nums, 23))`,

    `# 31. Декоратор құру және қолдану
def my_decorator(func):
    def wrapper():
        print("[Декоратор]: Функция басталды")
        func()
        print("[Декоратор]: Функция аяқталды")
    return wrapper

@my_decorator
def say_hello():
    print("Сәлем, Әлем!")

say_hello()`,

    `# 32. Жалпақ тізім жасау (Flatten Nested List)
nested_list = [[1, 2, 3], [4, 5], [6, 7, 8]]
flat_list = [item for sublist in nested_list for item in sublist]
print("Жалпақ тізім:", flat_list)`,

    `# 33. Сөз жиілігін есептеу (Counter)
from collections import Counter
text = "алма банан алма шие банан алма"
word_counts = Counter(text.split())
print("Сөздер жиілігі:", dict(word_counts))`,

    `# 34. Генераторлар (Yield операторы)
def count_up_to(n):
    count = 1
    while count <= n:
        yield count
        count += 1
counter = count_up_to(5)
for num in counter:
    print("Генератор саны:", num)`,

    `# 35. any() және all() функциялары
nums1 = [0, False, 5, 0]
nums2 = [1, 3, 5, 7]
print("Кем дегенде біреуі шындық па?", any(nums1))
print("Барлығы шындық па?", all(nums2))`,

    `# 36. Матрицаны транспозициялау (Transposing a Matrix)
matrix = [[1, 2, 3], [4, 5, 6]]
transposed = [list(row) for row in zip(*matrix)]
print("Транспозицияланған матрица:", transposed)`,

    `# 37. Сөздікті мәндері бойынша сұрыптау
scores = {"Әлішер": 88, "Марат": 95, "Гүлім": 78, "Айша": 92}
sorted_scores = sorted(scores.items(), key=lambda item: item[1], reverse=True)
print("Сұрыпталған рейтинг:", sorted_scores)`,

    `# 38. Жиындар арасындағы айырмашылық пен бірігу (Set operations)
set_a = {1, 2, 3, 4}
set_b = {3, 4, 5, 6}
print("Бірігуі (Union):", set_a | set_b)
print("Қиылысуы (Intersection):", set_a & set_b)
print("Айырмашылығы (Difference):", set_a - set_b)`,

    `# 39. Тұрақты немесе өзгермейтін жиын (Frozenset)
frozen = frozenset([1, 2, 3, 4])
try:
    frozen.add(5)
except AttributeError:
    print("Қате: frozenset жиынын өзгерту мүмкін емес!")`,

    `# 40. Namedtuple (Атаулы кортеждермен жұмыс)
from collections import namedtuple
Point = namedtuple('Point', ['x', 'y'])
p = Point(15, 25)
print(f"Нүкте координаталары: X={p.x}, Y={p.y}")`,

    `# 41. Орташа жұмыс істеу уақытын өлшеу (time)
import time
start_time = time.time()
# Уақыт алатын операция
sum(range(1000000))
end_time = time.time()
print(f"Орындау уақыты: {end_time - start_time:.6f} секунд")`,

    `# 42. defaultdict қолдану (collections)
from collections import defaultdict
grouped = defaultdict(list)
grouped['жұп'].append(2)
grouped['жұп'].append(4)
grouped['тақ'].append(1)
print("Топтастырылған сөздік:", dict(grouped))`,

    `# 43. args және kwargs (Функцияға шексіз аргументтер жіберу)
def print_args(*args, **kwargs):
    print("Позициялық аргументтер:", args)
    print("Кілттік аргументтер:", kwargs)
print_args(1, 2, 3, аты="Серік", жасы=22)`,

    `# 44. Жолдардағы ASCII кодтары мен символдар
print("A-ның коды:", ord('A'))
print("65-кодтағы символ:", chr(65))`,

    `# 45. eval() функциясымен математикалық өрнектерді есептеу
expression = "3 * (5 + 2) - 10"
print(f"Математикалық есептеу: {expression} =", eval(expression))`,

    `# 46. Массивтен екінші ең үлкен санды табу (Second Largest)
def find_second_largest(arr):
    unique_nums = list(set(arr))
    if len(unique_nums) < 2: return "Тізімде жеткілікті элемент жоқ"
    unique_nums.sort()
    return unique_nums[-2]
print("Екінші ең үлкен сан:", find_second_largest([10, 20, 20, 4, 15, 3]))`,

    `# 47. Күрделі сөздіктен деректерді қауіпсіз оқу (.get)
user_profile = {"name": "Ернұр", "settings": {"theme": "dark"}}
theme = user_profile.get("settings", {}).get("theme", "light")
print("Баптау тақырыбы (Theme):", theme)`,

    `# 48. Тізім элементтерін қосып мәтін жасау (.join)
words_list = ["Python", "бағдарламалау", "тілі"]
sentence = " ".join(words_list)
print("Жинақталған сөйлем:", sentence)`,

    `# 49. Қарапайым рекурсиямен Fibonacci санын табу
def recursive_fib(n):
    if n <= 1: return n
    return recursive_fib(n-1) + recursive_fib(n-2)
print("Рекурсиялық Fibonacci (6-мүшесі):", recursive_fib(6))`,

    `# 50. Тізімдегі None мәндерін сүзу (None Removal)
raw_data = [1, None, 2, 3, None, 4]
clean_data = [x for x in raw_data if x is not None]
print("Тазартылған деректер:", clean_data)`
];

function loadExample() {
    const randomIdx = Math.floor(Math.random() * compilerExamples.length);
    document.getElementById('compilerCode').value = compilerExamples[randomIdx];
}

function clearOutput() {
    document.getElementById('compilerOutput').innerHTML = `
        <div class="result-empty" style="min-height:320px;">
            <i class="fa-solid fa-terminal"></i>
            <p>Кодты іске қосу үшін ▶ батырмасын басыңыз</p>
        </div>`;
    document.getElementById('runStats').style.display = 'none';
}

async function runCode() {
    const code = document.getElementById('compilerCode').value.trim();
    const stdin = document.getElementById('compilerInput').value;
    if (!code) { showToast('Кодыңызды жазыңыз!', 'warning'); return; }

    const runBtn = document.querySelector('#tab-compiler .btn-primary');
    const origHtml = runBtn ? runBtn.innerHTML : '';
    if (runBtn) { runBtn.disabled = true; runBtn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div> Орындалуда...'; }

    const outputEl = document.getElementById('compilerOutput');
    outputEl.innerHTML = `<div class="loading-wrap" style="padding:20px;"><div class="spinner"></div> Код орындалып жатыр...</div>`;
    document.getElementById('runStats').style.display = 'none';

    const startTime = Date.now();

    const renderOutput = (stdout, stderr, exitCode, memory) => {
        const elapsed = Date.now() - startTime;
        let html = '<div class="output-terminal" style="min-height:280px; margin:0; border-radius:0;">';
        if (stdout) html += `<span class="out-success">${escapeHtml(stdout)}</span>`;
        if (stderr) html += `<span class="out-error">${escapeHtml(stderr)}</span>`;
        if (!stdout && !stderr) html += `<span style="color:#8b949e;"># Нәтиже жоқ (бос output)</span>`;
        html += '</div>';
        outputEl.innerHTML = html;

        const stats = document.getElementById('runStats');
        stats.style.display = 'flex';
        document.getElementById('execTime').textContent = elapsed + ' ms';
        document.getElementById('execMemory').textContent = memory ? Math.round(memory / 1024) + ' KB' : '—';
        document.getElementById('execStatus').textContent = exitCode === 0 ? 'Сәтті ✓' : `Қате (код ${exitCode})`;
        document.getElementById('execStatus').style.color = exitCode === 0 ? '#22c55e' : '#ef4444';
    };

    try {
        const res = await fetch('https://emkc.org/api/v2/piston/execute', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                language: 'python',
                version: '3.10.0',
                files: [{ name: 'main.py', content: code }],
                stdin: stdin || ''
            })
        });
        if (!res.ok) throw new Error('Piston API v2 қатесі: ' + res.status);
        const data = await res.json();
        const run = data.run || data;
        renderOutput(run.stdout || '', run.stderr || '', typeof run.code === 'number' ? run.code : 0, run.memory);
    } catch (e) {
        // Резервтік API v1 шақыруы
        try {
            const res2 = await fetch('https://emkc.org/api/v1/piston/execute', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: 'python3', source: code, stdin: stdin || '' })
            });
            const data2 = await res2.json();
            renderOutput(data2.output || data2.stdout || '', data2.stderr || '', 0, null);
        } catch (e2) {
            outputEl.innerHTML = `<div class="output-terminal" style="min-height:280px; margin:0; border-radius:0;">
                <span class="out-error">❌ Орындау қатесі: ${escapeHtml(e.message)}\n\n💡 Интернетті тексеріп, қайта байқап көріңіз.</span>
            </div>`;
            document.getElementById('runStats').style.display = 'none';
        }
    } finally {
        if (runBtn) { runBtn.disabled = false; runBtn.innerHTML = origHtml; }
    }
}

// ============================================================
//  ХАБАРЛАМАЛАР ЖҮЙЕСІ (TOASTS)
// ============================================================
function showToast(msg, type = 'info') {
    let container = document.getElementById('toastContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toastContainer';
        container.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;display:flex;flex-direction:column;gap:10px;pointer-events:none;';
        document.body.appendChild(container);
    }

    const colors = {
        success: '#22c55e', error: '#ef4444',
        warning: '#f59e0b', info: 'var(--accent)'
    };
    const icons = {
        success: 'circle-check', error: 'circle-xmark',
        warning: 'triangle-exclamation', info: 'circle-info'
    };

    const toast = document.createElement('div');
    toast.style.cssText = `
        display:flex; align-items:center; gap:10px;
        padding:12px 18px; border-radius:12px;
        background:var(--bg-secondary); border:1px solid var(--border-color);
        box-shadow:0 8px 24px rgba(0,0,0,0.15);
        font-size:0.875rem; font-weight:500; color:var(--text-primary);
        pointer-events:auto; max-width:320px;
        animation: toastIn 0.25s ease;
        border-left:3px solid ${colors[type]};
    `;
    toast.innerHTML = `<i class="fa-solid fa-${icons[type]}" style="color:${colors[type]};flex-shrink:0;"></i><span>${escapeHtml(msg)}</span>`;

    if (!document.querySelector('#toastStyle')) {
        const style = document.createElement('style');
        style.id = 'toastStyle';
        style.textContent = `@keyframes toastIn{from{opacity:0;transform:translateX(20px)}to{opacity:1;transform:translateX(0)}}`;
        document.head.appendChild(style);
    }

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateX(20px)';
        toast.style.transition = 'all 0.25s ease';
        setTimeout(() => toast.remove(), 250);
    }, 3500);
}