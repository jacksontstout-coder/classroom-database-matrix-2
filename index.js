const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

// 1. DYNAMIC DATA ROUTE: Intercepts, modifies, and streams web traffic securely
app.get('/service', async (req, res) => {
    let targetUrl = req.query.url;
    if (!targetUrl) return res.status(400).send("No target site URL specified.");

    try {
        targetUrl = decodeURIComponent(targetUrl);
        if (!targetUrl.startsWith('http')) {
            targetUrl = 'https://' + targetUrl;
        }

        const urlObj = new URL(targetUrl);
        const options = {
            method: 'GET',
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        };

        const response = await fetch(targetUrl, options);
        let contentType = response.headers.get('content-type') || '';

        // Pass binary streaming assets (videos, scripts, styles, graphics) straight through
        if (!contentType.includes('text/html')) {
            const dataBuffer = await response.buffer();
            res.setHeader('Content-Type', contentType);
            return res.send(dataBuffer);
        }

        let htmlContent = await response.text();

        // REWRITING TRACKS: Intercept paths so links don't break out of the tab frame
        const proxyBase = `${req.protocol}://${req.get('host')}/service?url=`;
        htmlContent = htmlContent.replace(/(href|src|action)="\/([^"]*)"/g, `$1="${proxyBase}${encodeURIComponent(urlObj.origin + '/')}$2"`);

        // INJECTION MASK: Inject anti-redirection code blocks to paralyze frame breakouts
        const antiBreakoutScript = `<head><script>
            (function() {
                try {
                    Object.defineProperty(window, 'top', { value: window, configurable: false, writable: false });
                    Object.defineProperty(window, 'parent', { value: window, configurable: false, writable: false });
                } catch(e) {}
            })();
        <\/script>`;

        htmlContent = htmlContent.replace(/<head>/i, antiBreakoutScript);

        // Remove firewalls and security locks on the server container layer
        htmlContent = htmlContent.replace(/content-security-policy/gi, 'disabled-csp');
        htmlContent = htmlContent.replace(/x-frame-options/gi, 'disabled-xfo');

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
        
        res.send(htmlContent);

    } catch (err) {
        res.status(500).send(`<h3>Proxy Server Connection Fault:</h3><p>${err.message}</p>`);
    }
});

// 2. FRONTEND VIEW CONTROL: Serves your authentic student dashboard interface layout file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Path-Rewriting Gateway operating live on port ${PORT}`));
