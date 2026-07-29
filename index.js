const express = require('express');
const cors = require('cors');
const fetch = (...args) => import('node-fetch').then(({default: f}) => f(...args));

const app = express().use(cors());

app.get('/gateway-tunnel', async (req, res) => {
    let target = req.query.url;
    if (!target) return res.status(400).send("No target site specified.");
    try {
        target = decodeURIComponent(target);
        if (!target.startsWith('http')) target = 'https://' + target;
        const u = new URL(target);
        const response = await fetch(target, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        let contentType = response.headers.get('content-type') || '';

        if (!contentType.includes('text/html')) {
            return res.send(await response.buffer());
        }

        let html = await response.text();
        const base = `${req.protocol}://${req.get('host')}/gateway-tunnel?mask=${req.query.mask || ''}&url=`;
        html = html.replace(/(href|src|action)="\/([^"]*)"/g, `$1="${base}${encodeURIComponent(u.origin + '/')}$2"`);

        const inject = `<head><base href="${u.origin}/"><script>
            (function() {
                try {
                    Object.defineProperty(window, 'top', { value: window, configurable: false });
                    Object.defineProperty(window, 'parent', { value: window, configurable: false });
                    window.addEventListener('submit', function(e) {
                        e.preventDefault();
                        if (e.target.action) window.location.href = "${base}" + encodeURIComponent(e.target.action);
                    }, true);
                } catch(err) {}
            })();
        <\/script>`;

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        res.send(html.replace(/<head>/i, inject).replace(/content-security-policy/gi, 'disabled-csp').replace(/x-frame-options/gi, 'disabled-xfo'));
    } catch (err) { res.status(500).send(`Error: ${err.message}`); }
});

app.get('/', (req, res) => {
    const mask = req.query.assignment || '';
    const search = req.query.q || '';
    res.send(`<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Workspace Portal</title><style>
        body,html{margin:0;padding:0;width:100%;height:100%;font-family:sans-serif;background:#f4f6f9;color:#1e293b;overflow:hidden;}
        .container{display:flex;min-height:100vh;}
        .sidebar{width:240px;background:#2c3e50;color:white;padding:20px;box-sizing:border-box;}
        .logo{font-size:18px;font-weight:bold;padding-bottom:20px;border-bottom:1px solid rgba(255,255,255,0.1);margin-bottom:20px;}
        .main{flex:1;padding:40px;box-sizing:border-box;display:flex;flex-direction:column;gap:25px;}
        .card{background:white;border:1px solid #e2e8f0;border-radius:12px;padding:25px;}
        input{width:100%;padding:14px;font-size:15px;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:20px;box-sizing:border-box;}
        button{display:block;padding:14px;font-size:15px;background:#0070f3;color:white;border:none;border-radius:8px;cursor:pointer;width:100%;font-weight:bold;}
        .clone-btn{background:#1e293b;margin-top:10px;}
        .panel{display:${search?'block':'none'};width:100%;height:100%;position:fixed;top:0;left:0;z-index:1000;background:#fff;}
        iframe{width:100%;height:100%;border:none;}
        #box{margin-top:20px;padding:15px;background:#f0f7ff;border:1px solid #bae7ff;border-radius:8px;display:none;word-break:break-all;}
    </style></head><body>
        <!-- FIXED ENCAPSULATION ID MARKERS REGISTERED FOR RUNTIME EXECUTION -->
        <div class="panel" id="panel"><iframe id="proxyIframe" src="${search?'/gateway-tunnel?mask='+encodeURIComponent(mask)+'&url='+encodeURIComponent(search):''}" sandbox="allow-forms allow-modals allow-pointer-lock allow-popups allow-same-origin allow-scripts"></iframe></div>
        <div class="container"><div class="sidebar"><div class="logo">CampusWorkspace</div><div>Assignment Core</div></div>
        <div class="main"><div class="card"><h3>Active Session: ${mask.toUpperCase() || 'AWAITING INITIALIZATION'}</h3></div>
        <div class="card"><h3>Research Engine Tunnel</h3><input type="text" id="inp" placeholder="Enter target site..."><button id="sBtn">Execute Pipeline</button></div>
        <div class="card"><h3>Mirror Link Cloner</h3><button class="clone-btn" id="cBtn">Clone Proxy URL</button><div id="box"></div></div></div></div>
        <script>
            const p = new URLSearchParams(window.location.search); let m = p.get('assignment') || '';
            if(!m){ m = 'workbook-' + Math.floor(1000+Math.random()*9000); window.history.replaceState({},'','/?assignment='+m); window.location.reload(); }
            document.getElementById('sBtn').onclick=function(){
                let t=document.getElementById('inp').value.trim(); if(!t)return;
                if(!t.includes('.')) t='https://wikipedia.org;
                else if(!/^https?:\\/\\//i.test(t)) t='https://'+t;
                document.getElementById('panel').style.display='block';
                document.getElementById('proxyIframe').src='/gateway-tunnel?mask='+encodeURIComponent(m)+'&url='+encodeURIComponent(t);
            };
            document.getElementById('cBtn').onclick=function(){
                const b=document.getElementById('box'); b.style.display="block";
                const n=window.location.origin+'/?assignment=workbook-'+Math.floor(1000+Math.random()*9000);
                b.innerHTML='<strong>Mirror Cloned:</strong><br><br><a href="' + n + '" target="_self" style="color:#0070f3;text-decoration:none;">' + n + '</a>';
            };
        </script>
    </body></html>`);
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log("System initialization completed successfully."));
