require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const fetch = require('node-fetch'); // npm install node-fetch@2

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// API YOLU (İstek buraya gelecek)
app.post('/api/chat', async (req, res) => {
    // Vercel'de ve .env dosyasında tanımlanacak anahtar ismi: OPENROUTER_API_KEY
    const apiKey = process.env.OPENROUTER_API_KEY;

    try {
        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${apiKey}`,
                'HTTP-Referer': 'https://fetva-ai.vercel.app', // OpenRouter için gerekli
                'X-Title': 'Fetva AI'
            },
            body: JSON.stringify(req.body)
        });

        const data = await response.json();
        res.status(response.status).json(data);
    } catch (error) {
        res.status(500).json({ error: "Sunucu hatası: " + error.message });
    }
});

// Diğer tüm istekleri index.html'e yönlendir
app.get('/{*path}', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Sistem aktif: http://localhost:${PORT}`);
});
