/**
 * HackSync SpendGuard - Express Backend Server
 * Loads .env environment variables & provides API config to frontend
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname)));

// Public Config Endpoint (serves Supabase public URL and anon key safely from .env)
app.get('/api/config', (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL || '';
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || '';
    
    // Check if real keys are configured
    const isConfigured = Boolean(
        supabaseUrl && 
        supabaseAnonKey && 
        !supabaseUrl.includes('your-project-ref') && 
        !supabaseAnonKey.includes('...')
    );

    res.json({
        success: true,
        supabase: {
            url: isConfigured ? supabaseUrl : '',
            anonKey: isConfigured ? supabaseAnonKey : '',
            isConfigured
        },
        environment: process.env.NODE_ENV || 'development'
    });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'HackSync SpendGuard (Supabase Edition)',
        supabaseUrlConfigured: Boolean(process.env.SUPABASE_URL),
        timestamp: new Date().toISOString()
    });
});

// SPA fallback to index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
if (require.main === module) {
    const server = app.listen(PORT, () => {
        console.log(`\n⚡ HackSync SpendGuard Server running at http://localhost:${PORT}`);
        console.log(`📁 Environment variables loaded from .env`);
        console.log(`🔌 Supabase URL: ${process.env.SUPABASE_URL ? 'Configured' : 'Not Set'}\n`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            const fallbackPort = Number(PORT) + 1;
            console.log(`⚠️ Port ${PORT} is busy, switching to http://localhost:${fallbackPort}...`);
            app.listen(fallbackPort, () => {
                console.log(`\n⚡ Server running at http://localhost:${fallbackPort}\n`);
            });
        } else {
            console.error('Server error:', err);
        }
    });
}

module.exports = app;
