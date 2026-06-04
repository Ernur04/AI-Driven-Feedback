const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// ============================================================
//  ╨Ъ╨Ю╨Э╨д╨Ш╨У╨г╨а╨Р╨ж╨Ш╨п тАФ Google Gemini API ╨║╤Ц╨╗╤В╤Ц╨╜ ╨Ю╨б╨л╨Э╨Ф╨Р ╥Ы╨╛╨╣
// ============================================================
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../'))); // ╨д╤А╨╛╨╜╤В╨╡╨╜╨┤ ╨╢╨╛╨╗╤Л

// Gemini-╥У╨░ ╨░╤А╨╜╨░╨╗╥У╨░╨╜ PROXY
app.post('/api/claude', async (req, res) => {
    try {
        const { systemPrompt, userMessage } = req.body;

        // Google Gemini API ╤Д╨╛╤А╨╝╨░╤В╤Л (gemini-flash-lite-latest)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: `╨Э╥░╨б╥Ъ╨Р╨г: ${systemPrompt}\n\n╨в╨Р╨Я╨б╨л╨а╨Ь╨Р: ${userMessage}` }]
                }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'Gemini API ╥Ы╨░╤В╨╡' });
        }

        // ╨Ц╨░╤Г╨░╨┐╤В╤Л ╥Ы╨░╨╣╤В╨░╤А╤Г (╤Д╤А╨╛╨╜╤В╨╡╨╜╨┤ ╙й╨╖╨│╨╡╤А╨╝╨╡╤Г╤Ц ╥п╤И╤Ц╨╜ ╨Ъ╨╗╨╛╨┤╤В╤Л╥г ╤Д╨╛╤А╨╝╨░╤В╤Л╨╜╨░ ╥▒╥Ы╤Б╨░╤Б╤В╤Л╤А╨░╨╝╤Л╨╖)
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "╨Ц╨░╤Г╨░╨┐ ╤В╨░╨▒╤Л╨╗╨╝╨░╨┤╤Л";
        res.json({ text: text });

    } catch (error) {
        console.error('Gemini error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`тЬЕ ╨б╨╡╤А╨▓╨╡╤А (Gemini ╥Ы╨╛╨╗╨┤╨░╨╜╤Л╨╗╤Г╨┤╨░) ╥Ы╨╛╤Б╤Л╨╗╨┤╤Л: http://localhost:${PORT}`);
});
