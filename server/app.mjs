import { createServer } from 'node:http';
import { randomBytes, randomUUID, scryptSync, timingSafeEqual, createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
import { openDatabase, TRADES, AREAS } from './db.mjs';
const id = () => randomUUID();
const hash = value => createHash('sha256').update(value).digest('hex');
const fail = (status, code) => { throw Object.assign(new Error(code), { status }); };
const requireThat = (test, code = 'INVALID_INPUT', status = 400) => { if (!test) fail(status, code); };
const text = (value, max = 2000) => typeof value === 'string' && value.trim().length > 0 && value.length <= max;
function passwordHash(password, salt = randomBytes(16).toString('hex')) { return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`; }
function passwordMatches(password, stored) { const [salt] = stored.split(':'); return timingSafeEqual(Buffer.from(stored), Buffer.from(passwordHash(password, salt))); }
async function body(req, limit = 100_000) {
  const chunks = []; let size = 0;
  for await (const chunk of req) { size += chunk.length; if (size > limit) fail(413, 'UPLOAD_TOO_LARGE'); chunks.push(chunk); }
  return Buffer.concat(chunks);
}
export function createApp({ databasePath = process.env.DATABASE_PATH || 'data/roshan.sqlite', ai = null } = {}) {
  const db = openDatabase(databasePath);
  const one = (sql, ...args) => db.prepare(sql).get(...args);
  const all = (sql, ...args) => db.prepare(sql).all(...args);
  const run = (sql, ...args) => db.prepare(sql).run(...args);
  const rate = new Map();
  function worker(row) { return { ...row, services: JSON.parse(row.services), areas: JSON.parse(row.areas), manual_available: !!row.manual_available, available: !!row.available }; }
  const workerQuery = `SELECT w.*, NOT EXISTS(SELECT 1 FROM bookings b WHERE b.worker_id=w.user_id AND b.status IN ('confirmed','in_progress')) AND w.manual_available AS available, (SELECT COUNT(*) FROM bookings b WHERE b.worker_id=w.user_id AND b.status='completed') AS completed_jobs, (SELECT COUNT(*) FROM reviews r WHERE r.worker_id=w.user_id) AS review_count, (SELECT AVG(rating) FROM reviews r WHERE r.worker_id=w.user_id) AS rating FROM workers w`;
  function participant(requestId, user) { const row = one('SELECT * FROM requests WHERE id=?', requestId); requireThat(row && [row.customer_id, row.worker_id].includes(user.id), 'NOT_FOUND', 404); return row; }
  function detail(requestId, user) { const request = participant(requestId, user); return { ...request, worker_name: one('SELECT name FROM workers WHERE user_id=?', request.worker_id).name, messages: all('SELECT * FROM messages WHERE request_id=? ORDER BY rowid', requestId), proposals: all('SELECT * FROM proposals WHERE request_id=? ORDER BY version DESC', requestId), booking: one('SELECT * FROM bookings WHERE request_id=?', requestId) || null, review: one('SELECT r.* FROM reviews r JOIN bookings b ON b.id=r.booking_id WHERE b.request_id=?', requestId) || null }; }
  const server = createServer(async (req, res) => {
    const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)); };
    try {
      const url = new URL(req.url, 'http://localhost'); const path = url.pathname; const method = req.method;
      if (!path.startsWith('/api/')) {
        if (method !== 'GET') return send(405, { error: 'METHOD_NOT_ALLOWED' });
        const root = resolve('dist'); const target = resolve(root, '.' + decodeURIComponent(path));
        requireThat(target.startsWith(root + '/') || target === root, 'NOT_FOUND', 404);
        let data; let actual = target;
        try { data = await readFile(target); } catch { actual = resolve(root, 'index.html'); data = await readFile(actual); }
        res.writeHead(200, { 'Content-Type': ({ '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml' })[extname(actual)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff' }); return res.end(data);
      }
      if (method !== 'GET' && req.headers.origin) { requireThat(new URL(req.headers.origin).host === req.headers.host, 'ORIGIN_REJECTED', 403); }
      if (path === '/api/health') return send(200, { ok: true, ai_configured: !!(ai || process.env.OPENAI_API_KEY) });
      if (path === '/api/catalog') return send(200, { trades: TRADES, areas: AREAS });
      const cookie = (req.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith('session='))?.slice(8);
      const user = cookie ? one('SELECT u.id,u.username,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token=? AND s.expires>?', hash(cookie), Date.now()) : null;
      let input;
      if (method !== 'GET' && !path.includes('/audio')) { try { input = JSON.parse((await body(req)).toString() || '{}'); } catch(e) { if(e.status) throw e; fail(400,'INVALID_JSON'); } }
      if (['/api/auth/register','/api/auth/login'].includes(path) && method === 'POST') {
        const key = req.socket.remoteAddress; const now = Date.now(); const entry = rate.get(key) || { count: 0, until: now + 60_000 }; if (entry.until < now) { entry.count = 0; entry.until = now + 60_000; } entry.count++; rate.set(key, entry); requireThat(entry.count <= 30, 'TRY_AGAIN_LATER', 429);
        requireThat(text(input.username, 64) && /^[\p{L}\p{N}_ -]+$/u.test(input.username) && text(input.password, 128) && input.password.length >= 10, 'USE_USERNAME_AND_10_CHARACTER_PASSWORD');
        const username = input.username.trim().toLowerCase(); let account = one('SELECT * FROM users WHERE username=?', username);
        if (path.endsWith('register')) { requireThat(['worker','customer'].includes(input.role)); requireThat(!account, 'USERNAME_TAKEN',409); const userId=id(); run('INSERT INTO users VALUES(?,?,?,?)',userId,username,passwordHash(input.password),input.role); account=one('SELECT * FROM users WHERE id=?',userId); }
        else requireThat(account && passwordMatches(input.password,account.password),'INVALID_CREDENTIALS',401);
        const token=randomBytes(32).toString('hex');run('INSERT INTO sessions VALUES(?,?,?)',hash(token),account.id,Date.now()+7*86400_000);
        res.setHeader('Set-Cookie',`session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${process.env.NODE_ENV==='production'?'; Secure':''}`);
        return send(200,{id:account.id,username:account.username,role:account.role});
      }
      if(path==='/api/auth/me') return send(200,{user:user || null});
      if(path==='/api/workers' && method==='GET') { let rows=all(workerQuery).map(worker); if(url.searchParams.get('trade')) rows=rows.filter(w=>w.trade===url.searchParams.get('trade'));if(url.searchParams.get('area')) rows=rows.filter(w=>w.areas.includes(url.searchParams.get('area')));if(url.searchParams.get('available')==='now') rows=rows.filter(w=>w.available);return send(200,rows); }
      if(/^\/api\/workers\/[^/]+$/.test(path) && method==='GET') { const row=one(workerQuery+' WHERE w.user_id=?',path.split('/')[3]);requireThat(row,'NOT_FOUND',404);return send(200,{...worker(row),reviews:all('SELECT rating,feedback,created_at FROM reviews WHERE worker_id=?',row.user_id)}); }
      requireThat(user,'SIGN_IN_REQUIRED',401);
      if(path==='/api/auth/logout' && method==='POST') {run('DELETE FROM sessions WHERE token=?',hash(cookie));res.setHeader('Set-Cookie','session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');return send(200,{ok:true});}
      if(path==='/api/profile' && method==='GET') { const row=one(workerQuery+' WHERE w.user_id=?',user.id);return send(200,row?worker(row):null); }
      if(path==='/api/profile' && method==='POST') {
        requireThat(user.role==='worker','FORBIDDEN',403);requireThat(text(input.name,80)&&TRADES.includes(input.trade)&&Array.isArray(input.areas)&&input.areas.length>0&&input.areas.every(a=>AREAS.includes(a))&&Array.isArray(input.services)&&input.services.length>0&&input.services.length<=15&&input.services.every(s=>text(s,200))&&(input.years_experience===null||(Number.isInteger(input.years_experience)&&input.years_experience>=0&&input.years_experience<=80))&&typeof input.manual_available==='boolean');
        run(`INSERT INTO workers VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET name=excluded.name,trade=excluded.trade,years_experience=excluded.years_experience,services=excluded.services,areas=excluded.areas,manual_available=excluded.manual_available,language=excluded.language`,user.id,input.name.trim(),input.trade,input.years_experience,JSON.stringify(input.services),JSON.stringify([...new Set(input.areas)]),+input.manual_available,['en','ur','roman'].includes(input.language)?input.language:'en');return send(200,worker(one(workerQuery+' WHERE w.user_id=?',user.id)));
      }
      // Later phases install request, booking and audio handlers here.
      if (await domainRoutes({ req,res,url,path,method,input,user,db,one,all,run,send,participant,detail,worker,workerQuery,ai })) return;
      fail(404,'NOT_FOUND');
    } catch(error) { if(!error.status) console.error('Request failed:',error.message);send(error.status || 500,{error:error.status?error.message:'INTERNAL_ERROR'}); }
  });
  return { server, db };
}
async function domainRoutes(ctx) {
 const {path,method,input,user,one,all,run,send,participant,detail}=ctx;
 if(path==='/api/requests' && method==='GET') {send(200,all('SELECT id FROM requests WHERE customer_id=? OR worker_id=? ORDER BY rowid DESC',user.id,user.id).map(r=>detail(r.id,user)));return true;}
 if(path==='/api/requests' && method==='POST') {
  requireThat(user.role==='customer','FORBIDDEN',403);const w=one('SELECT * FROM workers WHERE user_id=?',input.worker_id || '');
  requireThat(w && JSON.parse(w.areas).includes(input.area)&&text(input.description));
  const requestId=id();run('INSERT INTO requests(id,customer_id,worker_id,area,description) VALUES(?,?,?,?,?)',requestId,user.id,w.user_id,input.area,input.description.trim());send(201,detail(requestId,user));return true;
 }
 const match=path.match(/^\/api\/requests\/([^/]+)(?:\/(messages|proposals|cancel|decline))?$/);
 if(match) {
  const [,requestId,action]=match;const request=participant(requestId,user);
  if(method==='GET'&&!action){send(200,detail(requestId,user));return true;}
  if(method==='POST') {
   requireThat(['requested','discussing'].includes(request.status),'REQUEST_CLOSED',409);
   if(action==='messages') {requireThat(text(input.body)||text(input.audio_id,80));if(input.audio_id)requireThat(one('SELECT id FROM audio WHERE id=? AND owner_id=? AND request_id=?',input.audio_id,user.id,requestId),'INVALID_AUDIO');run('INSERT INTO messages(id,request_id,sender_id,body,audio_id) VALUES(?,?,?,?,?)',id(),requestId,user.id,text(input.body)?input.body.trim():null,input.audio_id || null);}
   else if(action==='proposals') {
    requireThat(user.id===request.worker_id,'FORBIDDEN',403);requireThat(text(input.scope)&&Number.isSafeInteger(input.price_pkr)&&input.price_pkr>=0&&input.price_pkr<=10000000&&typeof input.materials_included==='boolean');
    run('INSERT INTO proposals(id,request_id,version,scope,price_pkr,materials_included) SELECT ?,?,COALESCE(MAX(version),0)+1,?,?,? FROM proposals WHERE request_id=?',id(),requestId,input.scope.trim(),input.price_pkr,+input.materials_included,requestId);
   } else if(action==='cancel'||action==='decline') {requireThat(user.id===(action==='cancel'?request.customer_id:request.worker_id),'FORBIDDEN',403);run('UPDATE requests SET status=? WHERE id=?',action==='cancel'?'cancelled':'declined',requestId);send(200,detail(requestId,user));return true;}
   else return false;
   run("UPDATE requests SET status='discussing' WHERE id=?",requestId);send(200,detail(requestId,user));return true;
  }
 }
 return false;
}
export { id, fail, requireThat, text, body };
