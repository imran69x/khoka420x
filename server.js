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

// Admin page API
app.get('/api/config', (req, res) => {
    const config = getConfig();
    // Don't send the password to the frontend for security, 
    // but the user wanted the frontend to reveal based on it.
    // For now, I'll send it so the UI reveal works as requested.
    res.json(config);
});

app.post('/api/config', (req, res) => {
    const { redirectUrl, newPassword, password } = req.body;
    const config = getConfig();
    
    if (password !== config.adminPassword) {
        return res.status(401).json({ error: 'Incorrect password' });
    }

    if (redirectUrl) config.redirectUrl = redirectUrl;
    if (newPassword) config.adminPassword = newPassword;

    saveConfig(config);
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
