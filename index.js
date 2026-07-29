const express = require('express');
const cors = require('cors');
const path = require('path');
const fetch = require('node-fetch');

const app = express();
app.use(cors());

// 1. ADVANCED INTERCEPTION TUNNEL: Processes pages, scripts, forms, and background requests
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
                'Accept': '*/*',
                'Accept-Language': 'en-US,en;q=0.5'
            }
        };

        const response = await fetch(targetUrl, options);
        let contentType = response.headers.get('content-type') || '';

        // Pass binary streaming assets (videos for dulo.tv, live scripts, styling fonts, images) straight through
        if (!contentType.includes('text/html')) {
            const dataBuffer = await response.buffer();
            res.setHeader('Content-Type', contentType);
            return res.send(dataBuffer);
        }

        let htmlContent = await response.text();
        const proxyBase = `${req.protocol}://${req.get('host')}/service?url=`;

        // MASTER PATH REWRITER: Translates all relative and absolute web structures to stay bound to your proxy
        htmlContent = htmlContent.replace(/(href|src|action)="\/([^"]*)"/g, `$1="${proxyBase}${encodeURIComponent(urlObj.origin + '/')}$2"`);

        // INJECTION MATRIX: Hooks directly into the iframe's background data lanes to force Enter key submission routing
        const globalInterceptionScript = `<head><script>
            (function() {
                try {
                    // Paralyze frame breakout attempts to ensure top URL bar stays permanently frozen
                    Object.defineProperty(window, 'top', { value: window, configurable: false, writable: false });
                    Object.defineProperty(window, 'parent', { value: window, configurable: false, writable: false });

                    // 1. CATCH FORM SUBMISSIONS (Hitting Enter): Intercepts the submit action and forces it through the proxy
                    window.addEventListener('submit', function(e) {
                        e.preventDefault();
                        const form = e.target;
                        let actionUrl = form.action || window.location.href;
                        
                        // Collect form search data inputs
                        const formData = new FormData(form);
                        const params = new URLSearchParams(formData);
                        
                        if (params.toString()) {
                            actionUrl += (actionUrl.includes('?') ? '&' : '?') + params.toString();
                        }

                        window.location.href = "${proxyBase}" + encodeURIComponent(actionUrl);
                    }, true);

                    // 2. CATCH BACKGROUND JAVASCRIPT FETCH: Forces Google's internal lookups to run via your backend tunnel
                    const originalFetch = window.fetch;
                    window.fetch = function(input, init) {
                        let url = typeof input === 'string' ? input : input.url;
                        if (url.startsWith('/') || !url.startsWith(window.location.origin)) {
                            const absoluteUrl = new URL(url, "${urlObj.origin}").href;
                            url = "${proxyBase}" + encodeURIComponent(absoluteUrl);
                        }
                        return originalFetch(url, init);
                    };
                } catch(e) {}
            })();
        <\/script><base href="${urlObj.origin}/">`;

        // Inject our master interceptor layer directly at the start of the document head
        htmlContent = htmlContent.replace(/<head>/i, globalInterceptionScript);
        htmlContent = htmlContent.replace(/content-security-policy/gi, 'disabled-csp');
        htmlContent = htmlContent.replace(/x-frame-options/gi, 'disabled-xfo');

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
        res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless');
        
        res.send(htmlContent);

    } catch (err) {
        res.status(500).send(`<h3>Proxy Server Pipeline Error:</h3><p>${err.message}</p>`);
    }
});

// Serve your authentic student dashboard interface layout file
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Full-Access Search Engine operating live on port ${PORT}`));
