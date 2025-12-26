const https = require('https');

export default function handler(req, res) {
    // CORS configuration
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Handle OPTIONS request for CORS preflight
    if (req.method === 'OPTIONS') {
        res.status(204).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method Not Allowed' });
        return;
    }

    const GROQ_API = 'api.groq.com';
    const apiKey = process.env.GROQ_API_KEY;

    if (!apiKey) {
        console.error('Error: GROQ_API_KEY is not set in environment variables.');
        res.status(500).json({ error: 'Server configuration error: Missing API Key' });
        return;
    }

    // In Vercel, req.body is automatically parsed if the content-type is json
    const requestBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);

    const options = {
        hostname: GROQ_API,
        path: '/openai/v1/chat/completions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        }
    };

    const proxyReq = https.request(options, proxyRes => {
        // Forward the status code and headers from Groq
        res.writeHead(proxyRes.statusCode, proxyRes.headers);
        
        // Pipe the response back to client
        proxyRes.pipe(res);
    });

    proxyReq.on('error', err => {
        console.error('Proxy Request Error:', err);
        if (!res.headersSent) {
            res.status(500).json({ error: 'Proxy hatası: ' + err.message });
        }
    });

    // Send the body to Groq
    proxyReq.write(requestBody);
    proxyReq.end();
}
