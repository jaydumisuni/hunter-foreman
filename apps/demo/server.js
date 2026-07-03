const http = require('http');

const port = process.env.PORT || 3000;

const html = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Hunter Foreman Demo</title>
  <style>
    body { font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; margin: 0; background: #101114; color: #f5f5f5; }
    main { max-width: 920px; margin: 0 auto; padding: 48px 20px; }
    .card { background: #191b21; border: 1px solid #2a2d35; border-radius: 18px; padding: 24px; margin: 18px 0; }
    h1 { font-size: 44px; margin-bottom: 10px; }
    .flow { white-space: pre-wrap; line-height: 1.7; color: #d7d7d7; }
    .tag { display: inline-block; padding: 6px 10px; border-radius: 999px; background: #262a33; color: #b9f6ca; margin-right: 8px; }
  </style>
</head>
<body>
  <main>
    <span class="tag">Public Demo</span><span class="tag">Hackathon Scaffold</span>
    <h1>Hunter Foreman</h1>
    <p>AI operations foreman for small businesses — routes requests, escalates tasks, and coordinates workflows across web, email, WhatsApp, and dashboards.</p>
    <section class="card">
      <h2>Demo Flow</h2>
      <div class="flow">Customer request → AI receptionist → Intent router → Task workflow → Dashboard → Email/WhatsApp handoff → Human escalation</div>
    </section>
    <section class="card">
      <h2>Public Safety</h2>
      <p>This demo is public-safe. It uses demo workflows only and does not expose private THETECHGUY repair engines, credentials, or production logic.</p>
    </section>
  </main>
</body>
</html>`;

http.createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ ok: true, service: 'hunter-foreman-demo' }));
    return;
  }

  res.writeHead(200, { 'content-type': 'text/html' });
  res.end(html);
}).listen(port, () => {
  console.log(`Hunter Foreman demo running on http://localhost:${port}`);
});
