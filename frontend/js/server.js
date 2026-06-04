const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// ============================================================
//  КОНФИГУРАЦИЯ — Google Gemini API кілтін .env файлынан аламыз
// ============================================================
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error('❌ GEMINI_API_KEY табылмады! .env файлын тексер.');
    process.exit(1);
}

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../../'))); // Фронтенд жолы

// Gemini-ға арналған PROXY
app.post('/api/claude', async (req, res) => {
    try {
        const { systemPrompt, userMessage } = req.body;

        // Google Gemini API форматы (gemini-flash-lite-latest)
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-lite-latest:generateContent?key=${GEMINI_API_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{
                    role: 'user',
                    parts: [{ text: `НҰСҚАУ: ${systemPrompt}\n\nТАПСЫРМА: ${userMessage}` }]
                }]
            })
        });

        const data = await response.json();
        
        if (!response.ok) {
            return res.status(response.status).json({ error: data.error?.message || 'Gemini API қате' });
        }

        // Жауапты қайтару (фронтенд өзгермеуі үшін Клодтың форматына ұқсастырамыз)
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "Жауап табылмады";
        res.json({ text: text });

    } catch (error) {
        console.error('Gemini error:', error);
        res.status(500).json({ error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`✅ Сервер (Gemini қолданылуда) қосылды: http://localhost:${PORT}`);
});