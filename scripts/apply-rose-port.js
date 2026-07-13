const fs = require('fs');
const path = require('path');

const serverFile = path.join(__dirname, '..', 'apps', 'demo', 'server.js');
let source = fs.readFileSync(serverFile, 'utf8');

function replaceOnce(needle, replacement, label) {
  if (!source.includes(needle)) throw new Error(`Could not find ${label}`);
  source = source.replace(needle, replacement);
}

if (!source.includes("const { createRoseReply } = require('./rose');")) {
  const anchor = "const { sendToExternalApp } = require('../../packages/app-bridge');\n";
  replaceOnce(anchor, `${anchor}const { createRoseReply } = require('./rose');\n`, 'ROSE server import anchor');
}

if (!source.includes('function servePublicAsset(')) {
  const anchor = "function serveBase64Asset(res, file, type) { try { const b64 = fs.readFileSync(path.join(__dirname, 'assets', file), 'utf8').trim(); res.writeHead(200, { 'content-type': type, 'cache-control':'no-store' }); res.end(Buffer.from(b64, 'base64')); } catch { res.writeHead(404, { 'content-type':'text/plain' }); res.end('asset missing'); } }\n";
  replaceOnce(anchor, `${anchor}function servePublicAsset(res, file, type) { try { const content = fs.readFileSync(path.join(__dirname, 'public', file)); res.writeHead(200, { 'content-type': type, 'cache-control':'no-store' }); res.end(content); } catch { res.writeHead(404, { 'content-type':'text/plain' }); res.end('asset missing'); } }\n`, 'public asset helper anchor');
}

if (!source.includes('/assets/rose-actions.css?v=20260713-2')) {
  replaceOnce('<title>Hunter Foreman</title><style>', '<title>Hunter Foreman</title><link rel="stylesheet" href="/assets/rose-actions.css?v=20260713-2"><style>', 'ROSE stylesheet anchor');
}

const appsAnchor = "['Payment Gateway','💳','Not connected','Existing payment, referral, and commission workflow; transaction services and credentials are excluded from the public demo.','disconnected'],['Dashboard Hub'";
if (!source.includes("['POS System'")) {
  replaceOnce(appsAnchor, "['Payment Gateway','💳','Not connected','Existing payment, referral, and commission workflow; transaction services and credentials are excluded from the public demo.','disconnected'],['POS System','▣','Not connected','Existing mobile-friendly point-of-sale system; authorised staff can sign in from a supported phone, tablet, or computer, but the private business connection is excluded from this public demo.','disconnected'],['Dashboard Hub'", 'POS app anchor');
}

if (!source.includes('/assets/rose-runtime.js?v=20260713-2')) {
  replaceOnce('</script></body></html>`;', '</script><script src="/assets/rose-actions.js?v=20260713-2"></script><script src="/assets/rose-runtime.js?v=20260713-2"></script></body></html>`;', 'ROSE script anchor');
}

const serverAnchor = "http.createServer(async (req,res)=>{if(req.method==='OPTIONS')return sendJson(res,200,{ok:true});if(req.url==='/assets/rose.jpg')return serveBase64Asset(res,'rose-avatar.b64','image/jpeg');";
if (!source.includes("const requestUrl=new URL(req.url,'http://localhost')")) {
  replaceOnce(serverAnchor, "http.createServer(async (req,res)=>{const requestUrl=new URL(req.url,'http://localhost');const pathname=requestUrl.pathname;if(req.method==='OPTIONS')return sendJson(res,200,{ok:true});if(pathname==='/assets/rose.jpg')return serveBase64Asset(res,'rose-avatar.b64','image/jpeg');if(pathname==='/assets/rose-actions.css')return servePublicAsset(res,'rose-actions.css','text/css; charset=utf-8');if(pathname==='/assets/rose-actions.js')return servePublicAsset(res,'rose-actions.js','application/javascript; charset=utf-8');if(pathname==='/assets/rose-runtime.js')return servePublicAsset(res,'rose-runtime.js','application/javascript; charset=utf-8');", 'server route anchor');
}

source = source
  .replaceAll("req.url==='/health'", "pathname==='/health'")
  .replaceAll("req.url==='/api/app-bridge/status'", "pathname==='/api/app-bridge/status'")
  .replaceAll("req.url==='/api/tasks'", "pathname==='/api/tasks'")
  .replaceAll("req.url==='/api/reset'", "pathname==='/api/reset'")
  .replaceAll("req.url==='/api/requests'", "pathname==='/api/requests'")
  .replaceAll("req.url.startsWith('/api/dispatch/')", "pathname.startsWith('/api/dispatch/')")
  .replaceAll("decodeURIComponent(req.url.split('/').pop())", "decodeURIComponent(pathname.split('/').pop())");

if (!source.includes("pathname==='/api/rose'")) {
  const requestAnchor = "if(req.method==='POST'&&pathname==='/api/requests'){";
  replaceOnce(requestAnchor, "if(req.method==='POST'&&pathname==='/api/rose'){try{const body=await readBody(req);const response=await createRoseReply(body);return sendJson(res,200,response);}catch(error){return sendJson(res,400,{ok:false,error:'ROSE could not respond to that message.',detail:error.message});}}if(req.method==='POST'&&pathname==='/api/assistant-feedback'){await readBody(req).catch(()=>({}));return sendJson(res,202,{ok:true,recorded:true});}" + requestAnchor, 'ROSE endpoint anchor');
}
fs.writeFileSync(serverFile, source);

const runtimeFile = path.join(__dirname, '..', 'apps', 'demo', 'public', 'rose-runtime.js');
let runtime = fs.readFileSync(runtimeFile, 'utf8');
const pattern = /  function ensurePosCard\(\)\{[\s\S]*?\n  \}\n\n  function scheduleRestore\(\)\{/;
if (!pattern.test(runtime)) throw new Error('Could not locate the runtime POS function');
runtime = runtime.replace(pattern, "  function ensurePosCard(){}\n\n  function scheduleRestore(){");
fs.writeFileSync(runtimeFile, runtime);
console.log('Applied official ROSE runtime port with POS owned by renderApps');
