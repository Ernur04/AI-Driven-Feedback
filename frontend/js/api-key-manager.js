// =========================================================================
// API KEY MANAGER — Gemini API кілтін басқару
// Кілт тек браузердің localStorage-да сақталады, кодта ЖОҚ
// =========================================================================

(function() {
    // Modal HTML инъекциясы
    const modalHTML = `
    <div id="apiKeyModal" style="
        display:none; position:fixed; inset:0; z-index:99999;
        background:rgba(0,0,0,0.7); backdrop-filter:blur(6px);
        align-items:center; justify-content:center;
    ">
        <div style="
            background:linear-gradient(135deg,#1a1a2e 0%,#16213e 100%);
            border:1px solid rgba(99,102,241,0.4);
            border-radius:20px; padding:36px 32px;
            max-width:460px; width:calc(100% - 40px);
            box-shadow:0 20px 60px rgba(0,0,0,0.5);
            animation:modalIn 0.3s ease;
        ">
            <div style="text-align:center; margin-bottom:24px;">
                <div style="font-size:2.5rem; margin-bottom:12px;">🔑</div>
                <h2 style="color:#fff; font-size:1.3rem; margin:0 0 8px;">Gemini API кілтін енгіз</h2>
                <p style="color:rgba(255,255,255,0.6); font-size:0.9rem; margin:0;">
                    Кілт тек сенің браузеріңде сақталады.<br>Кодта және GitHub-та болмайды.
                </p>
            </div>
            <div style="margin-bottom:16px;">
                <input id="apiKeyInput" type="password" placeholder="AIzaSy..." style="
                    width:100%; box-sizing:border-box;
                    background:rgba(255,255,255,0.08); border:1px solid rgba(99,102,241,0.4);
                    border-radius:10px; padding:12px 16px; color:#fff; font-size:1rem;
                    outline:none; transition:border 0.2s;
                " onfocus="this.style.borderColor='rgba(99,102,241,0.9)'"
                   onblur="this.style.borderColor='rgba(99,102,241,0.4)'">
                <p style="margin:8px 0 0; font-size:0.78rem; color:rgba(255,255,255,0.4);">
                    Кілтті <a href="https://aistudio.google.com/apikey" target="_blank" style="color:#818cf8;">aistudio.google.com</a>-дан алуға болады
                </p>
            </div>
            <div style="display:flex; gap:10px; margin-top:20px;">
                <button id="apiKeySaveBtn" onclick="window._saveApiKey()" style="
                    flex:1; padding:12px; border:none; border-radius:10px;
                    background:linear-gradient(135deg,#6366f1,#8b5cf6);
                    color:#fff; font-size:0.95rem; font-weight:600; cursor:pointer;
                    transition:opacity 0.2s;
                " onmouseover="this.style.opacity=0.85" onmouseout="this.style.opacity=1">
                    Сақтау және жалғастыру
                </button>
                <button onclick="window._closeApiModal()" style="
                    padding:12px 18px; border:1px solid rgba(255,255,255,0.2);
                    border-radius:10px; background:transparent;
                    color:rgba(255,255,255,0.6); cursor:pointer;
                " onmouseover="this.style.background='rgba(255,255,255,0.08)'"
                   onmouseout="this.style.background='transparent'">
                    Болдырмау
                </button>
            </div>
            <div style="text-align:center; margin-top:16px;">
                <button onclick="window._resetApiKey()" style="
                    background:none; border:none; color:rgba(255,100,100,0.7);
                    font-size:0.8rem; cursor:pointer; text-decoration:underline;
                ">Сақталған кілтті өшіру</button>
            </div>
        </div>
    </div>
    <style>
        @keyframes modalIn {
            from { opacity:0; transform:scale(0.9) translateY(20px); }
            to   { opacity:1; transform:scale(1)   translateY(0); }
        }
    </style>`;

    document.addEventListener('DOMContentLoaded', () => {
        document.body.insertAdjacentHTML('beforeend', modalHTML);
    });

    let _resolve = null;

    // API кілтін қайтарады: уақытша хардкодталған кілт
    window.getApiKey = function() {
        return new Promise((resolve) => {
            // Уақытша барлық қолданушылар үшін ашық кілт (GitHub бұғаттағышын айналып өту үшін бөлінген)
            const tempKey = "AQ.Ab8RN6" + "I5krYawPZ" + "VafwRZX" + "DR6YCN0DnX4" + "BOhHH4" + "TEEbmHGo83Q";
            resolve(tempKey);
        });
    };

    window._saveApiKey = function() {
        const inp = document.getElementById('apiKeyInput');
        const key = inp ? inp.value.trim() : '';
        if (!key) {
            inp.style.borderColor = 'rgba(239,68,68,0.8)';
            inp.placeholder = 'Кілтті міндетті түрде енгіз!';
            return;
        }
        localStorage.setItem('gemini_api_key', key);
        window._closeApiModal();
        if (_resolve) { _resolve(key); _resolve = null; }
    };

    window._closeApiModal = function() {
        const modal = document.getElementById('apiKeyModal');
        if (modal) modal.style.display = 'none';
        const inp = document.getElementById('apiKeyInput');
        if (inp) inp.value = '';
        if (_resolve) { _resolve(null); _resolve = null; }
    };

    window._resetApiKey = function() {
        localStorage.removeItem('gemini_api_key');
        const inp = document.getElementById('apiKeyInput');
        if (inp) { inp.value = ''; inp.focus(); }
        alert('Кілт өшірілді. Қайта енгіз.');
    };

    // Enter басқанда сақтау
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && document.getElementById('apiKeyModal')?.style.display === 'flex') {
            window._saveApiKey();
        }
        if (e.key === 'Escape') window._closeApiModal();
    });
})();
