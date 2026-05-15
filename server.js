const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const CONFIG_PATH = path.join(__dirname, 'config.json');

// Helper to get config
function getConfig() {
    try {
        const data = fs.readFileSync(CONFIG_PATH, 'utf8');
        return JSON.parse(data);
    } catch (err) {
        return { redirectUrl: 'https://google.com' };
    }
}

// Helper to save config
function saveConfig(config) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

// Root redirect
app.get('/', (req, res) => {
    const config = getConfig();
    res.redirect(config.redirectUrl);
});

const ADMIN_PASSWORD = 'noyon8181';

// Admin page API
app.get('/api/config', (req, res) => {
    res.json(getConfig());
});

app.post('/api/config', (req, res) => {
    const { redirectUrl, password } = req.body;
    
    if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: 'Incorrect password' });
    }

    if (!redirectUrl) {
        return res.status(400).json({ error: 'Redirect URL is required' });
    }
    saveConfig({ redirectUrl });
    res.json({ message: 'Configuration updated successfully' });
});

// Serve admin page
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
