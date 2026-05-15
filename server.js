const express = require('express');
const fs = require('fs');
const path = require('path');
const { Redis } = require('@upstash/redis');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

// Default fallback config
const DEFAULT_CONFIG = {
    redirectUrl: 'https://faaty.70417122.com/register.html',
    adminPassword: 'noyon8181'
};

// Use Upstash Redis if env vars available, else use local config.json
const useRedis = !!(process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN);

let redis;
if (useRedis) {
    redis = new Redis({
        url: process.env.KV_REST_API_URL,
        token: process.env.KV_REST_API_TOKEN,
    });
}

// --- Config helpers ---
async function getConfig() {
    if (useRedis) {
        try {
            const data = await redis.get('siam_config');
            if (data) return data;
            // First time: seed Redis with default config
            await redis.set('siam_config', DEFAULT_CONFIG);
            return DEFAULT_CONFIG;
        } catch (err) {
            console.error('Redis read error:', err);
            return DEFAULT_CONFIG;
        }
    } else {
        // Local dev: use config.json
        try {
            const data = fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8');
            return JSON.parse(data);
        } catch {
            return DEFAULT_CONFIG;
        }
    }
}

async function saveConfig(config) {
    if (useRedis) {
        await redis.set('siam_config', config);
    } else {
        fs.writeFileSync(path.join(__dirname, 'config.json'), JSON.stringify(config, null, 2));
    }
}

// --- Routes ---

// Root redirect
app.get('/', async (req, res) => {
    const config = await getConfig();
    res.redirect(config.redirectUrl);
});

// GET config (for admin panel)
app.get('/api/config', async (req, res) => {
    const config = await getConfig();
    res.json(config);
});

// POST config (update settings)
app.post('/api/config', async (req, res) => {
    const { redirectUrl, newPassword, password } = req.body;
    const config = await getConfig();

    if (password !== config.adminPassword) {
        return res.status(401).json({ error: 'Incorrect password' });
    }

    if (redirectUrl) config.redirectUrl = redirectUrl;
    if (newPassword) config.adminPassword = newPassword;

    await saveConfig(config);
    res.json({ message: 'Configuration updated successfully' });
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
        console.log(`Storage: ${useRedis ? 'Upstash Redis' : 'Local config.json'}`);
    });
}

module.exports = app;
