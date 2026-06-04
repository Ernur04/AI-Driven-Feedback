// ============================================================
//  UTILITIES
// ============================================================
function escapeHtml(str) {
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ============================================================
//  TAB SWITCHER
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
//  ANTHROPIC API HELPER
// ============================================================
async function callClaude(systemPrompt, userMessage) {
    const apiKey = await window.getApiKey();
    if (!apiKey) throw new Error("API кілті енгізілмеді!");

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: userMessage }] }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            if (response.status === 400 || response.status === 403) {
                localStorage.removeItem('gemini_api_key');
            }
            throw new Error(data.error?.message || `HTTP қате: ${response.status}`);
        }

        return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    } catch (error) {
        console.error("Gemini API Error:", error);
        throw error;
    }
}


// ============================================================
//  AI CODE CHECKER
// ============================================================
function clearEditor() {
    document.getElementById('codeInput').value = '';
}

function clearResult() {
    document.getElementById('aiResult').innerHTML = `
        <div class="result-empty">
            <i class="fa-solid fa-robot"></i>
            <p>Кодыңды жазып, <strong>AI Тексеру</strong> батырмасын басыңыз</p>
        </div>`;
}

async function runAICheck() {
    const code = document.getElementById('codeInput').value.trim();
    if (!code) { showToast('Алдымен кодыңды жаз!', 'warning'); return; }

    const btn = document.querySelector('#tab-checker .btn-primary');
    const origHtml = btn ? btn.innerHTML : '';
    if (btn) { btn.disabled = true; btn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div> Тексерілуде...'; }

    const resultEl = document.getElementById('aiResult');
    resultEl.innerHTML = `<div class="loading-wrap"><div class="spinner"></div> AI кодты талдап жатыр...</div>`;

    const systemPrompt = `Сен Python коды талдаушысысың. 
Кодты тексеріп, JSON форматта қайтар (тек JSON, markdown жоқ):
{
  "has_errors": true/false,
  "errors": [{"line": "...", "description": "..."}],
  "explanation": "Қысқаша түсіндіру (қазақша)",
  "improved_code": "Жақсартылған код немесе бос жол",
  "style_issues": ["стиль ескертпелері"],
  "logic_explanation": "Кодтың логикасы 1-2 сөйлемде"
}`;

    try {
        const raw = await callClaude(systemPrompt, `Мына Python кодын тексер:\n\`\`\`python\n${code}\n\`\`\``);
        const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim();
        const result = JSON.parse(cleaned);
        renderCheckerResult(result, code);
    } catch (e) {
        console.error("AICheck Error:", e);
        resultEl.innerHTML = `<div class="ai-result-block">
            <div class="ai-section">
                <div class="ai-section-title"><i class="fa-solid fa-circle-exclamation"></i> Қате</div>
                <div class="error-tag" style="display:block;"><i class="fa-solid fa-triangle-exclamation"></i> ${escapeHtml(e.message)}</div>
                <p style="margin-top:10px; font-size:0.85rem; color:var(--text-secondary);">API кілтін немесе интернет байланысын тексеріңіз.</p>
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
            ${r.has_errors ? 'Қателер табылды' : 'Код дұрыс жазылған!'}
        </div>
    </div>`;

    // Ошибки
    if (r.errors && r.errors.length > 0) {
        html += `<div class="ai-section">
            <div class="ai-section-title"><i class="fa-solid fa-triangle-exclamation"></i> Қателер</div>
            ${r.errors.map(e => `<div class="error-tag" style="display:block; margin-bottom:6px;">
                <strong>${escapeHtml(String(e.line))}</strong> — ${escapeHtml(e.description)}
            </div>`).join('')}
        </div>`;
    }

    // Объяснение
    if (r.explanation) {
        html += `<div class="ai-section">
            <div class="ai-section-title"><i class="fa-solid fa-book-open-reader"></i> Түсіндіру</div>
            <div class="explanation-box">${escapeHtml(r.explanation).replace(/`([^`]+)`/g, '<code>$1</code>')}</div>
        </div>`;
    }

    // Логика
    if (r.logic_explanation) {
        html += `<div class="ai-section">
            <div class="ai-section-title"><i class="fa-solid fa-diagram-project"></i> Логика</div>
            <div class="explanation-box">${escapeHtml(r.logic_explanation)}</div>
        </div>`;
    }

    // Стиль
    if (r.style_issues && r.style_issues.length > 0) {
        html += `<div class="ai-section">
            <div class="ai-section-title"><i class="fa-solid fa-palette"></i> Стиль ескертпелері</div>
            ${r.style_issues.map(s => `<div class="warning-tag" style="display:block; margin-bottom:6px;">${escapeHtml(s)}</div>`).join('')}
        </div>`;
    }

    // Улучшенный код
    if (r.improved_code && r.improved_code.trim() && r.improved_code.trim() !== originalCode.trim()) {
        html += `<div class="ai-section">
            <div class="ai-section-title" style="justify-content:space-between;">
                <span><i class="fa-solid fa-wand-magic-sparkles"></i> Жақсартылған код</span>
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
//  TASKS
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
    { id:43, level:'easy', title:'Дауысты дыбыс', desc:'Әріптің дауысты екенін тексер.', hint:'char in "aeiou"' },
    { id:44, level:'easy', title:'Тізімді тазарту', desc:'Тізім ішіндегі барлық элементтерді өшіру.', hint:'clear() әдісін қолдан' },
    { id:45, level:'easy', title:'Элемент индексі', desc:'Тізімдегі белгілі бір санның индексін тап.', hint:'index() әдісін қолдан' },
    { id:46, level:'easy', title:'Соңғы әріп', desc:'Сөздің ең соңғы әріпін қайтар.', hint:'word[-1]' },
    { id:47, level:'easy', title:'Сөздік жасау', desc:'Кілт пен мәні бар қарапайым сөздік жаса.', hint:'{"кілт": "мән"}' },
    { id:48, level:'easy', title:'Тізбекті қосу', desc:'Барлық 1-ден 10-ға дейінгі сандарды қос.', hint:'sum(range(1, 11))' },
    { id:49, level:'easy', title:'Қатардан санды алу', desc:'Мәтіндегі "10" санын Integer-ге айналдыр.', hint:'int() функциясын қолдан' },
    { id:50, level:'easy', title:'Барлығы дұрыс па?', desc:'Тізімдегі барлық мәндер True екенін тексер.', hint:'all() функциясын қолдан' },

    // --- MEDIUM (51-100) ---
    { id:51, level:'medium', title:'Palindrome тексеру', desc:'Берілген сөздің палиндром екенін тексер.', hint:'s == s[::-1]' },
    { id:52, level:'medium', title:'Жай сан (Prime)', desc:'Берілген санның жай сан екенін тексер.', hint:'2-ден sqrt(n)-ге дейін тексер' },
    { id:53, level:'medium', title:'Fibonacci қатары', desc:'Fibonacci қатарының N-ші мүшесін қайтар.', hint:'Рекурсия немесе циклқолдан' },
    { id:54, level:'medium', title:'Факториал есептеу', desc:'Берілген санның факториалын тап.', hint:'math.factorial немесе цикл' },
    { id:55, level:'medium', title:'Дубликаттарды жою', desc:'Тізімдегі қайталанатын сандарды жой.', hint:'set() қолдан' },
    { id:56, level:'medium', title:'Сөздерді санау', desc:'Мәтінде неше сөз бар екенін анықта.', hint:'split() ұзындығын ал' },
    { id:57, level:'medium', title:'Ең ұзын сөз', desc:'Тізімдегі ең ұзын сөзді тап.', hint:'max(list, key=len)' },
    { id:58, level:'medium', title:'Анаграмма тексеру', desc:'Екі сөздің бір-біріне анаграмма екенін тексер.', hint:'sorted() қолданып салыстыр' },
    { id:59, level:'medium', title:'Сөзді кері айналдыру', desc:'Сөйлемдегі әр сөзді орнында кері жаз.', hint:'split() және [::-1]' },
    { id:60, level:'medium', title:'Екінші максимал', desc:'Тізімдегі екінші ең үлкен санды тап.', hint:'sorted() қолданып [-2] ал' },
    { id:61, level:'medium', title:'Жиілікті санау', desc:'Әр элемент тізімде неше рет кездесетінін тап.', hint:'collections.Counter қолдан' },
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
    { id:79, level:'medium', title:'Сөздерді сұрыптау', desc:'Мәтіндегі сөздерді алфавит бойынша сұрыпта.', hint:'split() және sort()' },
    { id:80, level:'medium', title:'Циклмен жылжыту', desc:'Тізім элементтерін K қадам оңға жылжыт (Rotate).', hint:'list[-k:] + list[:-k]' },
    { id:81, level:'medium', title:'Сөздіктегі мәндер қосындысы', desc:'Сөздіктегі барлық сандық мәндерді қос.', hint:'sum(dict.values())' },
    { id:82, level:'medium', title:'Біріктірілген сөздік', desc:'Екі сөздікті ортақ кілттермен біріктір.', hint:'{**d1, **d2}' },
    { id:83, level:'medium', title:'Ең ұзын ортақ префикс', desc:'Жолдар тізбегіндегі ең ұзын префиксті тап.', hint:'Әріптерді салыстыра отырып тексер' },
    { id:84, level:'medium', title:'Сөздерді тамырымен топтау', desc:'Ұқсас анаграмма сөздерді бір топқа жина.', hint:'Сұрыпталған сөзді кілт ретінде қолдан' },
    { id:85, level:'medium', title:'Паскаль үшбұрышы', desc:'Паскаль үшбұрышының N-қатарын шығар.', hint:'Алдыңғы қатардың элементтерін қос' },
    { id:86, level:'medium', title:'Арнайы символдар', desc:'Жолдан барлық пунктуация белгілерін өшір.', hint:'isalnum() немесе regex' },
    { id:87, level:'medium', title:'Изоморфты сөздер', desc:'Екі сөз изоморфты ма (белгілерді ауыстыруға бола ма).', hint:'Екі жақты сөздік тексеру' },
    { id:88, level:'medium', title:'Жолды қысу', desc:'"aabb" дегенді "a2b2" деп өзгерт.', hint:'Алдыңғы таңбаны есте сақтап, сана' },
    { id:89, level:'medium', title:'Нөлдерді соңына жылжыту', desc:'Барлық басқа сандардың ретін сақтап нөлдерді соңына апар.', hint:'Нөл еместерді тіркеп, қалғанын нөлмен толтыр' },
    { id:90, level:'medium', title:'Көпретті ауыстыру', desc:'Сөйлемдегі бірнеше сөзді бірден алмастыр.', hint:'replace() немесе regex қолдан' },
    { id:91, level:'medium', title:'Базалық конвертация', desc:'Кез келген N базадан 10 базаға өт.', hint:'int("str", base)' },
    { id:92, level:'medium', title:'Массив ішіндегі жұптар', desc:'Қосындысы K болатын сандар жұбын тап.', hint:'Сөздік (Hash map) қолдан' },
    { id:93, level:'medium', title:'IP мекенжай конфигурациясы', desc:'IPv4 дұрыстығын тексер.', hint:'split(".") және диапазонын (0-255) тексер' },
    { id:94, level:'medium', title:'Телефон нөмірі форматы', desc:'Енгізілген сандарды (123) 456-7890 форматына ауыстыр.', hint:'String форматтау немесе regex' },
    { id:95, level:'medium', title:'Жетіспейтін сан', desc:'1-ден N-ге дейінгі тізімде қай сан жоқ екенін тап.', hint:'N қосындысынан тізім қосындысын ал' },
    { id:96, level:'medium', title:'Екі массивтің айырмасы', desc:'AinB және BinA элементтерін тап.', hint:'set(A) ^ set(B)' },
    { id:97, level:'medium', title:'Аралас типті сорттау', desc:'Сандар мен сөздерді бөлек сұрыптап, қайта біріктір.', hint:'filter() және sort()' },
    { id:98, level:'medium', title:'HTML тегтерін жою', desc:'Мәтін ішінен барлық HTML тегтерін алып таста.', hint:'Regex: <[^>]*>' },
    { id:99, level:'medium', title:'Боулинг ұпайы', desc:'Қатардағы ұпайлардың қосындысын есепте.', hint:'Тізбек бойынша логикалық шарттар жаз' },
    { id:100, level:'medium', title:'Күнтізбе күні', desc:'Күн, ай, жыл берілгенде оның апта күнін тап.', hint:'datetime модулін қолдан' },
    
    // --- HARD (101-150) ---
    { id:101, level:'hard', title:'Дейкстра алгоритмі (Dijkstra)', desc:'Графтағы ең қысқа жолды есепте.', hint:'Priority Queue немесе heapq қолдан' },
    { id:102, level:'hard', title:'BFS граф іздеу', desc:'Кеңдік бойынша графты аралау.', hint:'collections.deque кезек құрылымын қолдан' },
    { id:103, level:'hard', title:'DFS граф іздеу', desc:'Тереңдік бойынша графты аралау.', hint:'Рекурсия немесе Stack қолдан' },
    { id:104, level:'hard', title:'Бинарлық іздеу (Binary Search)', desc:'Сұрыпталған тізімнен O(log n) уақытта ізде.', hint:'Ортаны (mid) тауып, екі жаққа бөл' },
    { id:105, level:'hard', title:'JSON Parser', desc:'JSON форматындағы жолды Python сөздігіне айналдыр.', hint:'json модулінсіз 문자열 분석를 жаса' },
    { id:106, level:'hard', title:'Валидті жақшалар', desc:'()[]{} жақшаларының дұрыс жабылғанын тексер.', hint:'Stack (Тізім) құрылымын пайдалан' },
    { id:107, level:'hard', title:'Ең үлкен ішкі қосынды', desc:'Kadane алгоритмін пайдаланып ең үлкен қосындыны тап.', hint:'Ағымдағы және жалпы максимумды сақта' },
    { id:108, level:'hard', title:'Судоку валидатор', desc:'9x9 Судоку кестесінің шарттарын (жол, баған, 3x3) тексер.', hint:'set() қолданып қайталануды болдырма' },
    { id:109, level:'hard', title:'Рюкзак есебі (Knapsack 0/1)', desc:'Максимал салмақпен ең көп құндылықты жина.', hint:'Динамикалық программалау (DP) массиві' },
    { id:110, level:'hard', title:'N-Ханым есебі (N-Queens)', desc:'N өлшемді тақтаға N ханымды қауіпсіз орналастыр.', hint:'Backtracking (шегіну) алгоритмін жаз' },
    { id:111, level:'hard', title:'LIS (Longest Increasing Subsequence)', desc:'Ең ұзын өспелі ішкі тізбектің ұзындығын тап.', hint:'Динамикалық программалау (O(n^2) не O(n log n))' },
    { id:112, level:'hard', title:'LRU кэш құру', desc:'Least Recently Used (LRU) кэш сыныбын жаз.', hint:'OrderedDict немесе Hash Map + Doubly Linked List' },
    { id:113, level:'hard', title:'Циклды тізім', desc:'Байланысқан тізімде (Linked List) цикл бар жоғын анықта.', hint:'Floyd\'s Cycle Finding (қанден мен тасбақа)' },
    { id:114, level:'hard', title:'BST тексеру', desc:'Бинарлы ағаштың дұрыс іздеу ағашы екенін тексер.', hint:'Мәндердің min және max ауқымын бақыла' },
    { id:115, level:'hard', title:'Сөз баспалдағы (Word Ladder)', desc:'Бір сөзден екінші сөзге өту үшін қысқа жол тап.', hint:'Граф пен Кеңдікке іздеу (BFS)' },
    { id:116, level:'hard', title:'Топологиялық сұрыптау', desc:'Бағытталған графты (DAG) топологиялық түрде сұрыпта.', hint:'Kahn алгоритмі немесе DFS' },
    { id:117, level:'hard', title:'Ең төменгі ортақ ата-баба', desc:'Бинарлы ағашта екі түйіннің ең жақын ата-бабасын тап.', hint:'LCA (Lowest Common Ancestor) рекурсиясы' },
    { id:118, level:'hard', title:'Trie (Префикстік ағаш)', desc:'Сөз іздеу және енгізу үшін Trie құрылымын жаса.', hint:'Түйіндердегі әріптер сөздігі (dict)' },
    { id:119, level:'hard', title:'Мәтінді туралау', desc:'Жолдарды ұзындығы L болатындай етіп бос орынмен толтыр.', hint:'Greedy тәсіл (Text Justification)' },
    { id:120, level:'hard', title:'Магнит және темір', desc:'Графтағы циклдарды тауып, жоя алатын алгоритм жаз.', hint:'DFS кезінде түстермен (ақ, сұр, қара) бояу' },
    { id:121, level:'hard', title:'Медиана (Екі сұрыпталған)', desc:'Екі сұрыпталған массивтің медианасын O(log(m+n)) тап.', hint:'Екі массивте де бинарлық іздеу жасау' },
    { id:122, level:'hard', title:'Sudoku шешуші', desc:'Бос 9x9 судоку кестесін толтыратын бағдарлама жаз.', hint:'Backtracking арқылы бос ұяшықтарды сынап көру' },
    { id:123, level:'hard', title:'Форд-Фалкерсон', desc:'Графтағы максималды ағынды есепте (Max Flow).', hint:'Қалдық граф және BFS (Edmonds-Karp)' },
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
    { id:150, level:'hard', title:'Көкжиек (Skyline problem)', desc:'Биік ғимараттардың көрінісінде контур сызығын есепте.', hint:'Оқиғалар тізімі (Sweep Line) және Max Heap' },
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
        grid.innerHTML = `<div style="grid-column:1/-1; text-align:center; color:var(--text-secondary); padding:40px;">Тапсырмалар жоқ</div>`;
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

    const systemPrompt = `Сен Python тапсырмалар генераторысысың.
JSON форматта 6 жаңа тапсырма қайтар (тек JSON, markdown жоқ):
[{"id":100,"level":"easy/medium/hard","title":"...","desc":"...","hint":"..."}]
4 easy, 4 medium, 4 hard. Қазақша. Тек Python бойынша.`;

    try {
        const raw = await callClaude(systemPrompt, 'Python бойынша 12 жаңа тапсырма жасашы');
        const cleaned = raw.replace(/```json\n?|```\n?/g, '').trim();
        const newTasks = JSON.parse(cleaned);
        allTasks = newTasks.map((t, i) => ({ ...t, id: 100 + i }));
        currentFilter = 'all';
        document.querySelectorAll('.filter-btn').forEach((b, i) => b.classList.toggle('active', i === 0));
        renderTasks(allTasks);
        showToast('Жаңа тапсырмалар жүктелді!', 'success');
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
//  HINTS
// ============================================================
async function getHint() {
    const question = document.getElementById('hintInput').value.trim();
    if (!question) { showToast('Сұрағыңды жаз!', 'warning'); return; }

    const resultEl = document.getElementById('hintResult');
    resultEl.innerHTML = `<div class="loading-wrap"><div class="spinner"></div> AI кеңес дайындап жатыр...</div>`;

    const systemPrompt = `Сен Python оқытушысысың. Толық жауап БЕРМЕ.
Тек бағыт-бағдар бер. Бір нақты кеңес немесе сілтеме бер.
Мысалы: "len() функциясын қарастыр", "цикл ішіндегі шарт туралы ойлан".
Жауабың 2-4 сөйлемнен аспасын. Қазақша жаз.`;

    try {
        const hint = await callClaude(systemPrompt, question);
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
//  PYTHON COMPILER (Piston API)
// ============================================================
// compilerExamples.js
const compilerExamples = [
    // ==========================================
    // БАЗАЛЫҚ ЖӘНЕ НЕГІЗГІ МЫСАЛДАР (1-50)
    // ==========================================
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

    `# 6. Тізім (List) құру
fruits = ["Алма", "Алмұрт", "Банан"]
fruits.append("Шие")
for f in fruits:
    print(f)`,

    `# 7. List Comprehension (Қысқаша тізім)
squares = [x*x for x in range(1, 11)]
print("1-ден 10-ға дейінгі квадраттар:", squares)`,

    `# 8. Фильтрация (Жұп сандар)
nums = [1, 2, 3, 4, 5, 6, 7, 8, 9]
evens = [x for x in nums if x % 2 == 0]
print("Жұп сандар:", evens)`,

    `# 9. Сөздік (Dictionary) қолдану
student = {"аты": "Арман", "жасы": 16, "пәні": "Информатика"}
for key, value in student.items():
    print(key, "->", value)`,

    `# 10. Жиын (Set) - қайталанбайтын элементтер
numbers = [1, 1, 2, 2, 3, 4, 4, 5]
unique_nums = set(numbers)
print("Бірегей сандар:", unique_nums)`,

    `# 11. Сөздің ұзындығы
message = "Python бағдарламалау тілі"
print("Ұзындығы:", len(message), "әріп")`,

    `# 12. Тізімді кері айналдыру
my_list = [10, 20, 30, 40]
my_list.reverse()
print("Кері тізім:", my_list)`,

    `# 13. Жолды кесу (Slicing)
text = "Жасанды Интеллект"
print("Алғашқы сөз:", text[:7])`,

    `# 14. Функция құру
def greet(name="Дос"):
    print("Сәлем,", name)

greet("Арман")
greet()`,

    `# 15. Lambda (Анонимді) функция
add = lambda x, y: x + y
print("3 + 7 =", add(3, 7))`,

    `# 16. Map функциясы
nums = [1, 2, 3, 4]
doubled = list(map(lambda x: x*2, nums))
print("Екі еселенген:", doubled)`,

    `# 17. Filter функциясы
vowels = "аәеёиоөұүыі"
def is_vowel(c):
    return c.lower() in vowels
text = "бағдарламалау"
print("Дауыстылар:", list(filter(is_vowel, text)))`,

    `# 18. Көпіршік сұрыптау (Bubble Sort)
arr = [64, 34, 25, 12, 22, 11, 90]
for i in range(len(arr)):
    for j in range(0, len(arr)-i-1):
        if arr[j] > arr[j+1]:
            arr[j], arr[j+1] = arr[j+1], arr[j]
print("Сұрыпталған:", arr)`,

    `# 19. Бинарлық іздеу
def binary_search(arr, val):
    l, r = 0, len(arr)-1
    while l <= r:
        mid = (l + r) // 2
        if arr[mid] == val: return mid
        elif arr[mid] < val: l = mid + 1
        else: r = mid - 1
    return -1
print("Индекс:", binary_search([1, 3, 5, 7, 9], 7))`,

    `# 20. Максимум мен минимум
scores = [45, 90, 88, 12, 59]
print("Ең үлкен:", max(scores))
print("Ең кіші:", min(scores))`,

    `# 21. Класс (OOP)
class Animal:
    def __init__(self, name):
        self.name = name
    def speak(self):
        print(self.name, "дыбыс шығарады")

cat = Animal("Мысық")
cat.speak()`,

    `# 22. Мұрагерлік (Inheritance)
class Dog(Animal):
    def speak(self):
        print(self.name, "үреді: 'Ау-ау!'")

dog = Dog("Ақтөс")
dog.speak()`,

    `# 23. math модулі
import math
print("Пи мәні:", math.pi)
print("16-ның квадрат түбірі:", math.sqrt(16))`,

    `# 24. random модулі
import random
print("Кездейсоқ сан:", random.randint(1, 10))
print("Таңдау:", random.choice(["Тас", "Қайшы", "Қағаз"]))`,

    `# 25. datetime модулі
from datetime import datetime
now = datetime.now()
print("Қазіргі уақыт:", now.strftime("%H:%M:%S"))`,

    `# 26. Текше (Tuple) қолдану
coordinates = (10, 20)
print("X координат:", coordinates[0])
print("Y координат:", coordinates[1])`,

    `# 27. Сандарды айырбастау (Swap)
a, b = 5, 10
a, b = b, a
print("a =", a, "b =", b)`,

    `# 28. Файл жазу/оқу (Симуляция)
file_content = "Бірінші жол\\nЕкінші жол"
lines = file_content.split("\\n")
for line in lines:
    print("Оқылды:", line)`,

    `# 29. Try-Except (Қатені ұстау)
try:
    x = 10 / 0
except ZeroDivisionError:
    print("Нөлге бөлуге болмайды!")`,

    `# 30. Жолдарды пішімдеу (Format)
name = "Ернұр"
age = 18
print("Менің атым {}, жасым {}".format(name, age))`,

    `# 31. Yield (Генератор)
def count_up_to(n):
    for i in range(1, n+1):
        yield i

for num in count_up_to(5):
    print("Генератор:", num)`,

    `# 32. Жай сан тексеру (Prime)
def is_prime(n):
    if n < 2: return False
    for i in range(2, int(n**0.5)+1):
        if n % i == 0: return False
    return True
print("17 жай сан ба?", is_prime(17))`,

    `# 33. Көпөлшемді тізім (Matrix)
matrix = [[1, 2, 3], [4, 5, 6], [7, 8, 9]]
for row in matrix:
    for val in row:
        print(val, end=" ")
    print()`,

    `# 34. Жол ішінде іздеу
text = "Жақсы код шағын әрі анық болады"
if "код" in text:
    print("Сөз табылды!")`,

    `# 35. zip функциясы
names = ["Али", "Диас", "Марлен"]
scores = [95, 87, 80]
for n, s in zip(names, scores):
    print(n, "->", s)`,

    `# 36. Санды сұрыптау (Custom sort)
words = ["банан", "алма", "шие", "апельсин"]
words.sort(key=len)
print("Ұзындығы бойынша:", words)`,

    `# 37. join әдісі
parts = ["Python", "өте", "керемет"]
sentence = " ".join(parts)
print("Толық сөйлем:", sentence)`,

    `# 38. eval қолдану
expression = "3 * 4 + 5"
result = eval(expression)
print(expression, "=", result)`,

    `# 39. args және kwargs
def magic(*args, **kwargs):
    print("Аргументтер:", args)
    print("Кілтті аргументтер:", kwargs)
magic(1, 2, 3, a="A", b="B")`,

    `# 40. Жиілікті санау
text = "алма банан алма шие"
words = text.split()
counts = {w: words.count(w) for w in set(words)}
print("Жиілік:", counts)`,

    `# 41. Матрицаны транспозициялау
matrix = [[1, 2], [3, 4]]
transposed = list(zip(*matrix))
print("Аударылған:", transposed)`,

    `# 42. Анонимді айнымалы (_)
for _ in range(3):
    print("Бұл 3 рет шығады")`,

    `# 43. Any және All
bool_list = [True, False, True]
print("Кем дегенде біреуі True?", any(bool_list))
print("Барлығы True ма?", all(bool_list))`,

    `# 44. Жолдағы әріптерді санау
import collections
message = "бағдарламалау"
counter = collections.Counter(message)
print("Әріптер санағы:", dict(counter))`,

    `# 45. Бір жолдық шарт (Ternary)
age = 20
status = "Ересек" if age >= 18 else "Адам"
print("Статус:", status)`,

    `# 46. Хэш (Hash) мәні
print("Сөзінің хэші:", hash("Python"))`,

    `# 47. Type hint (Типті көрсету)
def add_nums(a: int, b: int) -> int:
    return a + b
print(add_nums(5, 10))`,

    `# 48. Enumerate қолдану
fruits = ["Алма", "Алмұрт", "Манго"]
for index, fruit in enumerate(fruits):
    print(index, "-", fruit)`,

    `# 49. Тізбектелген шарттар
x = 5
if 1 < x < 10:
    print("x 1 мен 10 аралығында")`,

    `# 50. Сөздікті әдепкі мәнмен (get)
data = {"a": 1}
print("b мәні:", data.get("b", 0))`,

    // ==========================================
    // СТАНДАРТТЫ АМАЛДАР ЖӘНЕ МӘТІНДЕР (51-90)
    // ==========================================
    `# 51. Жолдың регистрін өзгерту
text = "Python Тілі"
print("Үлкен әріп:", text.upper())
print("Кіші әріп:", text.lower())
print("Ауыстыру:", text.swapcase())`,

    `# 52. Бас әріптерді түзету
title = "жасанды интеллект және робототехника"
print("Бас әріппен:", title.title())
print("Сөйлем басы:", title.capitalize())`,

    `# 53. Жолдың басы мен соңын тексеру
filename = "main.py"
print(".py-мен аяқтала ма?", filename.endswith(".py"))
print("main-нен бастала ма?", filename.startswith("main"))`,

    `# 54. Мәтін ішіндегі сөзді алмастыру
text = "Мен Java тілін үйреніп жүрмін"
new_text = text.replace("Java", "Python")
print(new_text)`,

    `# 55. Жолдағы бос орындарды тазалау
text = "   артық бос орындар   "
print("Тазаланған:", text.strip())`,

    `# 56. Сан ба әлде әріп пе тексеру
num_str = "12345"
alpha_str = "Python"
print("Тек сан ба?", num_str.isdigit())
print("Тек әріп пе?", alpha_str.isalpha())`,

    `# 57. Мәтінді тізімге бөлу (Split)
text = "арман,марат,әлия"
names_list = text.split(",")
print("Тізім:", names_list)`,

    `# 58. Мәтінді оңға/солға теңестіру
word = "Сәлем"
print(word.center(20, "*"))`,

    `# 59. Көп жолды мәтін құру
multiline = """Бұл
көп жолдан тұратын
мәтін мысалы"""
print(multiline)`,

    `# 60. Мәтін ішіндегі сөздің индексі
text = "Бағдарламалау өте қызық"
print("қызық сөзінің индексі:", text.find("қызық"))`,

    `# 61. f-string арқылы пішімдеу
language = "Python"
version = 3.11
print(f"Мен {language} {version} нұсқасын қолданамын")`,

    `# 62. Тізімнің көшірмесін жасау
original = [1, 2, 3]
copy_list = original.copy()
copy_list.append(4)
print("Түпнұсқа:", original)
print("Көшірме:", copy_list)`,

    `# 63. Екі тізімді біріктіру (extend)
list1 = [1, 2]
list2 = [3, 4]
list1.extend(list2)
print("Біріккен тізім:", list1)`,

    `# 64. Элементтің тізімдегі жиілігі
nums = [1, 2, 2, 3, 3, 3, 4]
print("3 санының саны:", nums.count(3))`,

    `# 65. Тізім ішінен элементті өшіру
cars = ["Toyota", "BMW", "Audi"]
cars.remove("BMW")
print(cars)`,

    `# 66. Индекс бойынша өшіру (pop)
items = ["алма", "алмұрт", "банан"]
removed = items.pop(1)
print("Өшірілді:", removed)
print("Қалғаны:", items)`,

    `# 67. Тізімді тазалау (clear)
data = [10, 20, 30]
data.clear()
print("Тазаланған тізім:", data)`,

    `# 68. Элементті нақты индекске қосу
nums = [1, 2, 4, 5]
nums.insert(2, 3)
print(nums)`,

    `# 69. Тізімнің ең кіші элементінің индексі
nums = [40, 10, 30, 20]
min_index = nums.index(min(nums))
print("Ең кіші санның индексі:", min_index)`,

    `# 70. Сөздіктің тек кілттерін алу
user = {"id": 1, "name": "Erlan", "role": "admin"}
print("Кілттер:", list(user.keys()))
print("Мәндер:", list(user.values()))`,

    // ==========================================
    // МАТЕМАТИКА ЖӘНЕ САНДАР (71-90)
    // ==========================================
    `# 71. Санның абсолютті мәні (Модуль)
print("|-5| =", abs(-5))`,

    `# 72. Дәрежелеу (pow)
print("2-нің 5 дәрежесі:", pow(2, 5))`,

    `# 73. Санды дөңгелектеу
print("3.14159 ->", round(3.14159, 2))
print("2.7 ->", round(2.7))`,

    `# 74. Тізімдегі сандардың қосындысы
scores = [10, 20, 30, 40]
print("Қосынды:", sum(scores))`,

    `# 75. Көбейтіндіні табу (math.prod)
import math
nums = [2, 3, 4]
print("Көбейтінді:", math.prod(nums))`,

    `# 76. Ең үлкен ортақ бөлгіш (ЕҮОБ / НОД)
import math
print("ЕҮОБ(24, 36) =", math.gcd(24, 36))`,

    `# 77. Ең кіші ортақ еселік (ЕКОЕ / НОК)
import math
print("ЕКОЕ(12, 18) =", math.lcm(12, 18))`,

    `# 78. Төмен және жоғары дөңгелектеу
import math
print("Жоғары:", math.ceil(4.1))
print("Төмен:", math.floor(4.9))`,

    `# 79. Логарифм есептеу
import math
print("log2(8) =", math.log2(8))`,

    `# 80. Санның бөлшек бөлігін алып тастау
import math
num = 12.34
print("Бүтін бөлігі:", math.trunc(num))`,

    `# 81. Радианды градусқа айналдыру
import math
print("pi/2 градуста:", math.degrees(math.pi / 2))`,

    `# 82. Кездейсоқ нақты сан (float)
import random
print("0 мен 1 арасы:", random.random())
print("1.5 пен 5.5 арасы:", random.uniform(1.5, 5.5))`,

    `# 83. Тізімді кездейсоқ араластыру (shuffle)
import random
cards = ["Тұз", "Король", "Дама", "Валет"]
random.shuffle(cards)
print("Араластырылған:", cards)`,

    `# 84. Тізімнен бірнеше кездейсоқ элемент алу
import random
prizes = ["Телефон", "Ноутбук", "Сағат", "Құлаққап"]
winners = random.sample(prizes, k=2)
print("Ұтыстар:", winners)`,

    `# 85. Екілік жүйеге айналдыру (Binary)
num = 45
print("Екілік код:", bin(num))`,

    `# 86. Сегіздік және он алтылық жүйе
num = 255
print("Сегіздік:", oct(num))
print("Он алтылық:", hex(num))`,

    `# 87. Комплексті сандар
z = 3 + 4j
print("Нақты бөлігі:", z.real)
print("Жорамал бөлігі:", z.imag)`,

    `# 88. Санның таңбасын анықтау (copysign)
import math
print(math.copysign(1, -15))`,

    `# 89. Дивизия және қалдық бір уақытта (divmod)
quotient, remainder = divmod(23, 5)
print("Бөлінді:", quotient, "Қалдық:", remainder)`,

    `# 90. Сандар тізбегінің орташа мәні
nums = [10, 20, 30, 40, 50]
mean = sum(nums) / len(nums)
print("Орташа мән:", mean)`,

    // ==========================================
    // СЕНІМДІ ТҮСІНІКТЕР ЖӘНЕ ЖИНАҚТАР (91-120)
    // ==========================================
    `# 91. Сөздікті біріктіру (Python 3.9+)
dict1 = {'a': 1, 'b': 2}
dict2 = {'b': 3, 'c': 4}
merged = dict1 | dict2
print("Біріккен сөздік:", merged)`,

    `# 92. Жиындардың қиылысуы (Intersection)
setA = {1, 2, 3, 4}
setB = {3, 4, 5, 6}
print("Қиылысуы:", setA.intersection(setB))`,

    `# 93. Жиындардың бірігуі (Union)
setA = {1, 2}
setB = {3, 4}
print("Бірігуі:", setA.union(setB))`,

    `# 94. Жиындардың айырмашылығы (Difference)
setA = {1, 2, 3}
setB = {3, 4, 5}
print("Тек A-да бар:", setA.difference(setB))`,

    `# 95. Симметриялық айырмашылық
setA = {1, 2, 3}
setB = {3, 4, 5}
print("Ортақ еместері:", setA.symmetric_difference(setB))`,

    `# 96. Ішкі жиынды тексеру (issubset)
setA = {1, 2}
setB = {1, 2, 3, 4}
print("A жиыны B-ның ішінде ме?", setA.issubset(setB))`,

    `# 97. Өзгермейтін жиын (Frozenset)
fs = frozenset([1, 2, 3, 3])
print("Өзгермейтін жиын:", fs)`,

    `# 98. Тізімдегі элементтерді топтау (Defaultdict)
from collections import defaultdict
grouped = defaultdict(list)
grouped['жұп'].append(2)
grouped['тақ'].append(1)
print(dict(grouped))`,

    `# 99. Тұрақты кезек (Deque)
from collections import deque
queue = deque([1, 2, 3])
queue.append(4)
queue.appendleft(0)
print("Кезек:", queue)`,

    `# 100. Идентификаторды тексеру (is операторы)
a = [1, 2, 3]
b = a
c = [1, 2, 3]
print("a-мен b бір объект пе?", a is b)
print("a-мен c бір объект пе?", a is c)`,

    `# 101. Сөздікті мәндері бойынша сорттау
scores = {"Әли": 85, "Дана": 95, "Bauryzhan": 90}
sorted_scores = dict(sorted(scores.items(), key=lambda item: item[1]))
print("Сұрыпталған ұпайлар:", sorted_scores)`,

    `# 102. Тізімді қадаммен кесу (Slicing step)
nums = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
print("Әрбір екінші сан:", nums[::2])`,

    `# 103. Нағыз терең көшірме (deepcopy)
import copy
matrix = [[1, 2], [3, 4]]
deep_matrix = copy.deepcopy(matrix)
deep_matrix[0][0] = 99
print("Түпнұсқа өзгерген жоқ:", matrix)`,

    `# 104. Тізімнен элементті мәні бойынша іздеп өшіру
words = ["хобби", "код", "хобби"]
while "хобби" in words:
    words.remove("хобби")
print(words)`,

    `# 105. Кортеж ішіндегі элементті санау
tpl = (1, 2, 3, 1, 1)
print("1 саны неше рет кездесті:", tpl.count(1))`,

    `# 106. Namedtuple қолдану (Атаулы кортеж)
from collections import namedtuple
Point = namedtuple('Point', ['x', 'y'])
p = Point(10, 20)
print(f"Нүкте: X={p.x}, Y={p.y}")`,

    `# 107. Сөздіктен элементті өшіріп, мәнін алу
data = {"A": 100, "B": 200}
val = data.pop("A")
print("Өшірілген мән:", val)
print("Қалған сөздік:", data)`,

    `# 108. Сөздіктің ішін тазарту
data = {"а": 1, "б": 2}
data.clear()
print("Бос сөздік:", data)`,

    `# 109. Екі жиынның ортақ элементі жоқ екенін тексеру
setA = {1, 2}
setB = {3, 4}
print("Ортақ элементтері жоқ па?", setA.isdisjoint(setB))`,

    `# 110. Сөздікті жаңарту (update)
info = {"аты": "Сәкен"}
info.update({"жасы": 25, "қала": "Алматы"})
print(info)`,

    `# 111. Тізімнен None мәндерін тазалау
data = [1, None, 2, None, 3]
clean_data = [x for x in data if x is not None]
print(clean_data)`,

    `# 112. Бірнеше сөздікті бір циклде оқу (ChainMap)
from collections import ChainMap
dict1 = {'жаңалықтар': 1}
dict2 = {'спорт': 2}
combined = ChainMap(dict1, dict2)
print(combined['спорт'])`,

    `# 113. Тізімді белгілі бір өлшемге бөлу
nums = [1, 2, 3, 4, 5, 6]
size = 2
chunks = [nums[i:i + size] for i in range(0, len(nums), size)]
print("Бөліктер:", chunks)`,

    `# 114. Сөздіктен максималды мәні бар кілтті табу
stats = {'Атырау': 32, 'Астана': 15, 'Шымкент': 40}
max_key = max(stats, key=stats.get)
print("Ең үлкен мәні бар қала:", max_key)`,

    `# 115. Тізім элементтерін индекспен біріктіріп мәтін жасау
items = ['Кабель', 'Тышқан', 'Пернетақта']
result = ", ".join([f"{i+1}. {item}" for i, item in enumerate(items)])
print(result)`,

    `# 116. Сөздік ішіндегі сөздікті оқу
users = {"id1": {"name": "Asel", "age": 20}}
print(users["id1"]["name"])`,

    `# 117. Тізімдегі элементтердің орындарын ауыстыру
arr = [10, 20, 30]
arr[0], arr[2] = arr[2], arr[0]
print("Ауысқан соң:", arr)`,

    `# 118. Бос мәндерді тексеру
empty_list = []
if not empty_list:
    print("Тізім бос!")`,

    `# 119. Мәтінді таңбалар тізіміне айналдыру
word = "Код"
chars = list(word)
print(chars)`,

    `# 120. Тізімнің соңғы N элементін алу
nums = [1, 2, 3, 4, 5, 6, 7]
print("Соңғы 3 элемент:", nums[-3:])`,

    // ==========================================
    // ФУНКЦИЯЛАР ЖӘНЕ АЛГОРИТМДЕР (121-160)
    // ==========================================
    `# 121. Қарапайым калькулятор функциясы
def calc(a, b, op):
    if op == '+': return a + b
    elif op == '-': return a - b
    elif op == '*': return a * b
    elif op == '/': return a / b if b != 0 else "Қате!"
print("Нәтиже:", calc(10, 2, '*'))`,

    `# 122. Санның цифрларының қосындысы
def sum_digits(n):
    return sum(int(d) for d in str(n))
print("1234-тің цифрлар қосындысы:", sum_digits(1234))`,

    `# 123. Екі тізімнің ортақ элементтерін табу
list1 = [1, 2, 3, 4]
list2 = [3, 4, 5, 6]
common = [x for x in list1 if x in list2]
print("Ортақ элементтер:", common)`,

    `# 124. Палиндром сандарды тексеру
def is_palindrome_num(n):
    return str(n) == str(n)[::-1]
print("121 палиндром ба?", is_palindrome_num(121))`,

    `# 125. Тізімдегі элементтердің көбейтіндісі (Итерация)
def multiply_list(nums):
    res = 1
    for x in nums: res *= x
    return res
print("Көбейтінді:", multiply_list([2, 3, 5]))`,

    `# 126. Температураны Цельсийден Фаренгейтке айналдыру
def c_to_f(celsius):
    return (celsius * 9/5) + 32
print("25°C Фаренгейтте:", c_to_f(25))`,

    `# 127. Үш санның максимумум табу
def max_of_three(a, b, c):
    return max(a, b, c)
print("Максимум:", max_of_three(12, 45, 7))`,

    `# 128. Жолдағы бос орындар санын есептеу
text = "Бұл сөйлемде қанша бос орын бар?"
print("Бос орындар саны:", text.count(" "))`,

    `# 129. Сызықтық іздеу (Linear Search)
def linear_search(arr, target):
    for i in range(len(arr)):
        if arr[i] == target: return i
    return -1
print("Индекс:", linear_search([5, 3, 8, 2], 8))`,

    `# 130. Тізімнің медианасын табу
def find_median(nums):
    s = sorted(nums)
    n = len(s)
    mid = n // 2
    return (s[mid] if n % 2 != 0 else (s[mid-1] + s[mid]) / 2)
print("Медиана:", find_median([4, 1, 3, 2, 5]))`,

    `# 131. Көбейту кестесін шығару (Бір санға)
num = 5
for i in range(1, 11):
    print(f"{num} x {i} = {num*i}")`,

    `# 132. Жылдың кібісе жыл екенін тексеру (Leap year)
def is_leap_year(year):
    return year % 4 == 0 and (year % 100 != 0 or year % 400 == 0)
print("2024 кібісе жыл ма?", is_leap_year(2024))`,

    `# 133. Мәтіндегі дауыссыз дыбыстарды санау
text = "Сәлем"
vowels = "аәеёиоөұүыіАӘЕЁИОӨҰҮЫІ"
consonants_count = sum(1 for c in text if c.isalpha() and c not in vowels)
print("Дауыссыз әріптер саны:", consonants_count)`,

    `# 134. Санның дәрежесін рекурсиямен табу
def power_rec(base, exp):
    return 1 if exp == 0 else base * power_rec(base, exp - 1)
print("2^4 =", power_rec(2, 4))`,

    `# 135. Тізімді оңға жылжыту (Rotate list)
nums = [1, 2, 3, 4, 5]
shift = 1
rotated = nums[-shift:] + nums[:-shift]
print("Жылжытылған тізім:", rotated)`,

    `# 136. Екі сөздің изоморфты екенін тексеру
def is_isomorphic(s, t):
    return len(set(s)) == len(set(t)) == len(set(zip(s, t)))
print("egg мен add изоморфты ма?", is_isomorphic("egg", "add"))`,

    `# 137. Санның толық квадрат екенін тексеру
import math
def is_perfect_square(n):
    return math.isqrt(n) ** 2 == n
print("25 толық квадрат па?", is_perfect_square(25))`,

    `# 138. Кездейсоқ құпия сөз генераторы
import random
import string
def gen_password(length):
    chars = string.ascii_letters + string.digits
    return "".join(random.choice(chars) for _ in range(length))
print("Құпия сөз:", gen_password(8))`,

    `# 139. Армстронг санын тексеру
def is_armstrong(n):
    digits = [int(d) for d in str(n)]
    return sum(d**len(digits) for d in digits) == n
print("153 Армстронг саны ма?", is_armstrong(153))`,

    `# 140. Тізімдегі екінші ең үлкен санды табу
nums = [10, 45, 45, 20, 30]
unique_nums = list(set(nums))
unique_nums.sort()
print("Екінші ең үлкен сан:", unique_nums[-2])`,

    `# 141. Жолдан барлық сандарды өшіру
text = "Python3.11 және AI2026"
clean_text = "".join([c for c in text if not c.isdigit()])
print("Таза мәтін:", clean_text)`,

    `# 142. Санның келесі жай санын табу
def next_prime(n):
    def is_p(x):
        return x > 1 and all(x % i != 0 for i in range(2, int(x**0.5)+1))
    num = n + 1
    while not is_p(num): num += 1
    return num
print("20-дан кейінгі жай сан:", next_prime(20))`,

    `# 143. Екі сөздікті біріктіру (Ескі әдіс)
d1 = {'x': 10}
d2 = {'y': 20}
res = {**d1, **d2}
print(res)`,

    `# 144. Тізімді флаттендеу (Бір өлшемге келтіру)
nested = [[1, 2], [3, 4], [5]]
flat = [item for sublist in nested for item in sublist]
print("Жалпақ тізім:", flat)`,

    `# 145. Мәтіндегі ең ұзын сөзді табу
sentence = "Бағдарламалау тілін үйрену болашаққа жол ашады"
words = sentence.split()
longest = max(words, key=len)
print("Ең ұзын сөз:", longest)`,

    `# 146. Кезектес қайталануларды жою
nums = [1, 1, 2, 2, 3, 1, 1]
import itertools
res = [k for k, g in itertools.groupby(nums)]
print("Қайталанбас тізбек:", res)`,

    `# 147. Байттарға кодтау және декодтау
text = "Привет, дүние!"
encoded = text.encode('utf-8')
print("Байттар:", encoded)
print("Декодталған:", encoded.decode('utf-8'))`,

    `# 148. Текшелерді (tuples) сөздікке айналдыру
pairs = [("алма", 5), ("банан", 3)]
d = dict(pairs)
print("Сөздік:", d)`,

    `# 149. Тізімнің барлық комбинацияларын алу
import itertools
nums = [1, 2, 3]
perms = list(itertools.permutations(nums))
print("Ауыстырулар саны:", len(perms))`,

    `# 150. Санның кемел сан (Perfect number) екенін тексеру
def is_perfect(n):
    return sum(i for i in range(1, n) if n % i == 0) == n
print("6 кемел сан ба?", is_perfect(6))`,

    // ==========================================
    // ОБЪЕКТІГЕ БАҒЫТТАЛҒАН БАҒДАРЛАМАЛАУ (ООП) (151-170)
    // ==========================================
    `# 151. Класс әдісі және статикалық әдіс
class MathUtils:
    @staticmethod
    def add(a, b): return a + b
print("Статикалық қосу:", MathUtils.add(5, 7))`,

    `# 152. Объектіні мәтін ретінде көрсету (__str__)
class Person:
    def __init__(self, name): self.name = name
    def __str__(self): return f"Адамның аты: {self.name}"
p = Person("Данияр")
print(p)`,

    `# 153. Класс ішіндегі инкапсуляция (Жасырын айнымалы)
class Account:
    def __init__(self, money):
        self.__balance = money
    def get_balance(self): return self.__balance
acc = Account(5000)
print("Баланс:", acc.get_balance())`,

    `# 154. Полиморфизм мысалы
class Cat:
    def sound(self): return "Мияу"
class Dog:
    def sound(self): return "Ау-ау"
def make_sound(animal_obj):
    print(animal_obj.sound())
make_sound(Cat())
make_sound(Dog())`,

    `# 155. Класс қасиеті (Property getter/setter)
class Celsius:
    def __init__(self, temp=0): self._temp = temp
    @property
    def temp(self): return self._temp
    @temp.setter
    def temp(self, val): self._temp = val
t = Celsius(25)
t.temp = 30
print("Температура:", t.temp)`,

    `# 156. Класс мұрагерлігінде super() қолдану
class Parent:
    def __init__(self): print("Әкесі класы")
class Child(Parent):
    def __init__(self):
        super().__init__()
        print("Баласы класы")
ch = Child()`,

    `# 157. Класс даналарының санын санау
class Item:
    count = 0
    def __init__(self): Item.count += 1
a, b, c = Item(), Item(), Item()
print("Жалпы объект саны:", Item.count)`,

    `# 158. Абстрактілі класс (abc модулі)
from abc import ABC, abstractmethod
class Vehicle(ABC):
    @abstractmethod
    def start(self): pass
class Car(Vehicle):
    def start(self): print("Мәшіні от алды")
Car().start()`,

    `# 159. __len__ сиқырлы әдісін теңшеу
class CustomGroup:
    def __init__(self, items): self.items = items
    def __len__(self): return len(self.items)
group = CustomGroup(['A', 'B', 'C'])
print("Топ ұзындығы:", len(group))`,

    `# 160. Объектілерді салыстыру (__eq__)
class Box:
    def __init__(self, size): self.size = size
    def __eq__(self, other): return self.size == other.size
print(Box(10) == Box(10))`,

    `# 161. Массив сияқты индекспен оқу (__getitem__)
class Playlist:
    def __init__(self): self.songs = ["Өлең 1", "Өлең 2"]
    def __getitem__(self, index): return self.songs[index]
p = Playlist()
print("Бірінші өлең:", p[0])`,

    `# 162. Класс ішіндегі өзгермейтін айнымалылар (Slots)
class LightPoint:
    __slots__ = ['x', 'y']
    def __init__(self, x, y):
        self.x = x
        self.y = y
lp = LightPoint(1, 2)
print("Нүкте:", lp.x, lp.y)`,

    `# 163. Дата кластар (dataclass)
from dataclasses import dataclass
@dataclass
class Book:
    title: str
    price: float
b = Book("Python негіздері", 4500.0)
print(b)`,

    `# 164. Singleton паттернінің қарапайым мысалы
class Singleton:
    _instance = None
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
s1 = Singleton()
s2 = Singleton()
print("Екеуі бір объект пе?", s1 is s2)`,

    `# 165. Класс нұсқасын тексеру (isinstance)
class Alpha: pass
obj = Alpha()
print("obj Альфа класына жата ма?", isinstance(obj, Alpha))`,

    `# 166. Ішкі класс (Inner class)
class Outer:
    def __init__(self): self.inner = self.Inner()
    class Inner:
        def show(self): return "Ішкі класс"
print(Outer().inner.show())`,

    `# 167. Объект атрибуты бар ма екенін тексеру (hasattr)
class User:
    def __init__(self): self.name = "Марат"
u = User()
print("name атрибуты бар ма?", hasattr(u, "name"))
print("age атрибуты бар ма?", hasattr(u, "age"))`,

    `# 168. Атрибут мәнін динамикалық алу (getattr)
class Bot:
    def __init__(self): self.status = "Активті"
b = Bot()
print(getattr(b, "status"))`,

    `# 169. Атрибут мәнін өзгерту (setattr)
class Configuration: pass
cfg = Configuration()
setattr(cfg, "theme", "dark")
print(cfg.theme)`,

    `# 170. Кластың барлық қасиеттерін сөздік ретінде көру
class Test:
    def __init__(self):
        self.a = 1
        self.b = 2
t = Test()
print(t.__dict__)`,

    // ==========================================
    // КҮРДЕЛІ ЖӘНЕ ІШКІ МҮМКІНДІКТЕР (171-200)
    // ==========================================
    `# 171. Декоратор функция құру
def my_decorator(func):
    def wrapper():
        print("[Басталды]")
        func()
        print("[Аяқталды]")
    return wrapper
@my_decorator
def say_hello(): print("Сәлем!")
say_hello()`,

    `# 172. Жұмыс істеу уақытын өлшейтін декоратор
import time
def timer_dec(func):
    def wrapper(*args, **kwargs):
        t1 = time.time()
        res = func(*args, **kwargs)
        print(f"Уақыт: {time.time()-t1:.4f} сек")
        return res
    return wrapper
@timer_dec
def waste_time(): sum(range(1000000))
waste_time()`,

    `# 173. Функция нәтижесін кэштеу (lru_cache)
from functools import lru_cache
@lru_cache(maxsize=None)
def slow_fib(n):
    return n if n < 2 else slow_fib(n-1) + slow_fib(n-2)
print("Фибоначчи(30):", slow_fib(30))`,

    `# 174. Контекст менеджер (with операторы мысалы)
class ManagedFile:
    def __enter__(self):
        print("Ресурстар ашылды")
        return self
    def __exit__(self, exc_type, exc_val, exc_tb):
        print("Ресурстар жабылды")
f = ManagedFile()
with f: print("Жұмыс ітеп жатыр")`,

    `# 175. Итератор құру (__iter__, __next__)
class MyNumbers:
    def __iter__(self):
        self.a = 1
        return self
    def __next__(self):
        if self.a <= 3:
            x = self.a
            self.a += 1
            return x
        else: raise StopIteration
for x in MyNumbers(): print("Итерация:", x)`,

    `# 176. f-string ішінде есептеулер жүргізу
x = 10
print(f"{x} санының квадраты {x**2}-қа тең")`,

    `# 177. itertools.cycle қолданып шексіз цикл жасау
import itertools
count = 0
for item in itertools.cycle(['А', 'Б']):
    if count > 3: break
    print("Цикл элементі:", item)
    count += 1`,

    `# 178. itertools.product арқылы декарттық көбейтінді
import itertools
A = [1, 2]
B = ['X', 'Y']
print("Декарттық көбейтінді:", list(itertools.product(A, B)))`,

    `# 179. Екі тізімді айырмашылығы бойынша теңестіру
def diff(li1, li2):
    return list(set(li1) - set(li2))
print("Айырмашылық:", diff([1, 2, 3], [2, 4]))`,

    `# 180. Мәтінді жасырын ASCII кодтарға ауыстыру
text = "ABC"
codes = [ord(c) for c in text]
print("Кодтар:", codes)
back_text = "".join(chr(c) for c in codes)
print("Қайтадан мәтін:", back_text)`,

    `# 181. Тұрақты сөздік (MappingProxyType)
from types import MappingProxyType
writable = {"база": "активті"}
read_only = MappingProxyType(writable)
print("Оқу:", read_only["база"])`,

    `# 182. Ондаған мәндерді бірден тексеру (any)
urls = ["image.png", "script.js", "style.css"]
has_images = any(u.endswith(".png") for u in urls)
print("Тізімде сурет бар ма?", has_images)`,

    `# 183. Декораторға аргумент жіберу
def repeat(n):
    def decorator(func):
        def wrapper(*args, **kwargs):
            for _ in range(n): func(*args, **kwargs)
        return wrapper
    return decorator
@repeat(3)
def greet(): print("Сәлем!")
greet()`,

    `# 184. Пайыздық көрсеткіш пішімі
ratio = 0.756
print(f"Прогресс: {ratio:.1%}")`,

    `# 185. sys.getsizeof арқылы жад көлемін тексеру
import sys
empty_list = []
print("Бос тізім жадта алатын орны (байт):", sys.getsizeof(empty_list))`,

    `# 186. inspect модулімен функция параметрлерін көру
import inspect
def simple_func(a, b=10): pass
print("Параметрлері:", inspect.signature(simple_func))`,

    `# 187. Жолды сөздерге бөліп, кері ретпен жинау
sentence = "Код жазу өнер"
reversed_sentence = " ".join(sentence.split()[::-1])
print(reversed_sentence)`,

    `# 188. Логикалық мәндерді бүтін сан ретінде қосу
bools = [True, False, True, True]
print("True мәндерінің саны:", sum(bools))`,

    `# 189. Тізімнен ең жиі кездесетін элементті табу
nums = [1, 3, 3, 3, 2, 1, 1, 3]
most_frequent = max(set(nums), key=nums.count)
print("Ең жиі сан:", most_frequent)`,

    `# 190. Мәтін ішіндегі тек сандарды қосу
import re
text = "Алма бағасы 500 теңге, алмұрт 700 теңге"
prices = [int(s) for s in re.findall(r'\\d+', text)]
print("Жалпы сомма:", sum(prices))`,

    `# 191. Мәтінді Base64 кодына кодтау
import base64
message = "Сәлем"
encoded = base64.b64encode(message.encode('utf-8'))
print("Base64 код:", encoded)`,

    `# 192. Жолдардың ұқсастығын тексеру (difflib)
import difflib
s1 = "Python тілі"
s2 = "Pyton тілі"
ratio = difflib.SequenceMatcher(None, s1, s2).ratio()
print(f"Ұқсастық пайызы: {ratio:.1%}")`,

    `# 193. uuid модулі арқылы бірегей ID жасау
import uuid
print("Генерацияланған ID:", uuid.uuid4())`,

    `# 194. JSON мәтінді Python сөздігіне айналдыру
import json
json_data = '{"name": "Eldar", "age": 22}'
data = json.loads(json_data)
print("Аты:", data["name"])`,

    `# 195. Сөздікті әдеми форматта шығару (pprint)
import pprint
complex_data = {"сыныптар": [{"A": [1, 2, 3]}, {"B": [4, 5, 6]}]}
pprint.pprint(complex_data, width=20)`,

    `# 196. Тек қана позициялық аргументтер кілті (/)
def only_positional(a, b, /):
    print(a, b)
only_positional(1, 2)`,

    `# 197. Тек кілтті аргументтер қабылдау (*)
def only_kwargs(*, name):
    print("Аты:", name)
only_kwargs(name="Әнуар")`,

    `# 198. partial функциясын қолдану
from functools import partial
def multiply(x, y): return x * y
double = partial(multiply, 2)
print("Екі еселеу:", double(5))`,

    `# 199. Тізімнен кездейсоқ элементті салмағына қарай таңдау
import random
elements = ['Алма', 'Банан']
result = random.choices(elements, weights=[90, 10], k=5)
print("Таңдалғандар:", result)`,

    `# 200. Фибоначчи қатарын генератормен құру (Жад үнемдеу)
def fib_gen(n):
    a, b = 0, 1
    for _ in range(n):
        yield a
        a, b = b, a + b
print("Алғашқы 5 Фибоначчи саны:", list(fib_gen(5)))`
];

function loadExample() {
    const randomIdx = Math.floor(Math.random() * compilerExamples.length);
    document.getElementById('compilerCode').value = compilerExamples[randomIdx];
}

function clearOutput() {
    document.getElementById('compilerOutput').innerHTML = `
        <div class="result-empty" style="min-height:320px;">
            <i class="fa-solid fa-terminal"></i>
            <p>Кодты іске қосу үшін ▶ батырманы басыңыз</p>
        </div>`;
    document.getElementById('runStats').style.display = 'none';
}

async function runCode() {
    const code = document.getElementById('compilerCode').value.trim();
    const stdin = document.getElementById('compilerInput').value;
    if (!code) { showToast('Кодыңды жаз!', 'warning'); return; }

    const runBtn = document.querySelector('#tab-compiler .btn-primary');
    const origHtml = runBtn ? runBtn.innerHTML : '';
    if (runBtn) { runBtn.disabled = true; runBtn.innerHTML = '<div class="spinner" style="width:14px;height:14px;border-width:2px;"></div> Орындалуда...'; }

    const outputEl = document.getElementById('compilerOutput');
    outputEl.innerHTML = `<div class="loading-wrap" style="padding:20px;"><div class="spinner"></div> Орындалуда...</div>`;
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
        if (!res.ok) throw new Error('Piston API v2 қате: ' + res.status);
        const data = await res.json();
        const run = data.run || data;
        renderOutput(run.stdout || '', run.stderr || '', typeof run.code === 'number' ? run.code : 0, run.memory);
    } catch (e) {
        // Fallback v1
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
                <span class="out-error">❌ Қате: ${escapeHtml(e.message)}\n\n💡 Интернет байланысын тексер немесе VPN қолдан.</span>
            </div>`;
            document.getElementById('runStats').style.display = 'none';
        }
    } finally {
        if (runBtn) { runBtn.disabled = false; runBtn.innerHTML = origHtml; }
    }
}

// ============================================================
//  TOAST NOTIFICATIONS
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
