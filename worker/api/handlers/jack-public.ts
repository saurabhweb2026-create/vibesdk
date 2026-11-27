import { askJack, defaultGreeting } from '../../services/troop/jack';
import {
	canUseTroop,
	getBot,
	getSiteById,
	recentTurns,
	saveLead,
	saveTurn,
	takeUsage,
} from '../../services/troop/troopStore';

// Public endpoints used by the Maria chat bubble on a customer's own website.
// They sit outside the signed-in API: no cookies are involved, so they answer any origin.

const CORS: Record<string, string> = {
	'access-control-allow-origin': '*',
	'access-control-allow-methods': 'GET, POST, OPTIONS',
	'access-control-allow-headers': 'content-type',
	'access-control-max-age': '86400',
};

const DEFAULT_APP_DAILY_LIMIT = 300;
const VISITOR_DAILY_LIMIT = 60;
const MAX_MESSAGE_LENGTH = 500;

export function isJackPublicPath(pathname: string): boolean {
	return pathname === '/api/jack/widget.js' || pathname === '/api/jack/public/chat';
}

function json(body: unknown, status = 200): Response {
	return new Response(JSON.stringify(body), { status, headers: { ...CORS, 'content-type': 'application/json' } });
}

const safeId = (v: unknown): string => (typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v) ? v : '');

function widgetSource(origin: string, botId: string, name: string, greeting: string): string {
	const cfg = JSON.stringify({ origin, botId, name, greeting }).replace(/</g, '\\u003c');
	return `(function(){
var C=${cfg};
if(window.__mtJack)return;window.__mtJack=1;
var vid;try{vid=localStorage.getItem('mt_jack_v');if(!vid){vid='v'+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem('mt_jack_v',vid);}}catch(e){vid='v'+Math.random().toString(36).slice(2);}
function el(t,s,x){var n=document.createElement(t);if(s)n.style.cssText=s;if(x)n.textContent=x;return n;}
var btn=el('button','position:fixed;right:20px;bottom:20px;width:60px;height:60px;border-radius:50%;border:2px solid #84cc16;background:#0c0c0c url('+C.origin+'/troop/maria-face.webp) center/cover;cursor:pointer;z-index:2147483646;box-shadow:0 6px 24px rgba(0,0,0,.35)');
btn.setAttribute('aria-label','Chat with '+C.name);
var box=el('div','position:fixed;right:20px;bottom:92px;width:340px;max-width:calc(100vw - 24px);height:460px;max-height:calc(100vh - 120px);background:#0c0c0c;color:#fff;border:1px solid #2a2a2a;border-radius:16px;display:none;flex-direction:column;overflow:hidden;z-index:2147483646;font:14px/1.4 system-ui,sans-serif;box-shadow:0 12px 40px rgba(0,0,0,.45)');
var head=el('div','padding:12px 14px;background:#161616;border-bottom:1px solid #2a2a2a;display:flex;align-items:center;gap:10px');
head.appendChild(el('div','width:8px;height:8px;border-radius:50%;background:#84cc16'));
head.appendChild(el('div','font-weight:600',C.name+' - support'));
var list=el('div','flex:1;overflow-y:auto;padding:12px;display:flex;flex-direction:column;gap:8px');
var form=el('form','display:flex;gap:8px;padding:10px;border-top:1px solid #2a2a2a');
var inp=el('input','flex:1;background:#161616;color:#fff;border:1px solid #333;border-radius:10px;padding:9px 10px;font:inherit;outline:none');
inp.placeholder='Type your question...';inp.maxLength=${MAX_MESSAGE_LENGTH};
var send=el('button','background:#84cc16;color:#000;border:0;border-radius:10px;padding:0 14px;font-weight:600;cursor:pointer','Send');
send.type='submit';
form.appendChild(inp);form.appendChild(send);
box.appendChild(head);box.appendChild(list);box.appendChild(form);
function bubble(text,mine){var b=el('div','max-width:85%;padding:8px 11px;border-radius:12px;white-space:pre-wrap;word-break:break-word;'+(mine?'align-self:flex-end;background:#84cc16;color:#000':'align-self:flex-start;background:#1f1f1f;color:#fff'),text);list.appendChild(b);list.scrollTop=list.scrollHeight;return b;}
bubble(C.greeting,false);
btn.onclick=function(){box.style.display=box.style.display==='flex'?'none':'flex';if(box.style.display==='flex')inp.focus();};
form.onsubmit=function(e){e.preventDefault();var m=inp.value.trim();if(!m)return;inp.value='';bubble(m,true);var wait=bubble('...',false);send.disabled=true;
fetch(C.origin+'/api/jack/public/chat',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({bot:C.botId,visitor:vid,message:m})})
.then(function(r){return r.json();}).then(function(d){wait.textContent=d&&d.reply?d.reply:(d&&d.error)||'Sorry, something went wrong.';})
.catch(function(){wait.textContent='Sorry, I could not connect. Please try again.';})
.then(function(){send.disabled=false;list.scrollTop=list.scrollHeight;});};
document.body.appendChild(btn);document.body.appendChild(box);
})();`;
}

async function handleWidget(env: Env, request: Request): Promise<Response> {
	const url = new URL(request.url);
	const botId = safeId(url.searchParams.get('bot'));
	const bot = botId ? await getBot(env, botId) : null;
	const headers = { ...CORS, 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=300' };
	if (!bot || !bot.enabled) {
		return new Response('/* Maria is not switched on for this site */', { status: 200, headers });
	}
	const name = bot.businessName || 'Maria';
	const greeting = bot.greeting || defaultGreeting(bot.businessName);
	return new Response(widgetSource(url.origin, bot.appId, name, greeting), { status: 200, headers });
}

async function handleChat(env: Env, request: Request): Promise<Response> {
	let body: { bot?: unknown; visitor?: unknown; message?: unknown };
	try {
		body = (await request.json()) as typeof body;
	} catch {
		return json({ error: 'Bad request' }, 400);
	}

	const botId = safeId(body.bot);
	const visitorId = safeId(body.visitor);
	const message = typeof body.message === 'string' ? body.message.trim().slice(0, MAX_MESSAGE_LENGTH) : '';
	if (!botId || !visitorId || !message) return json({ error: 'Bad request' }, 400);

	const bot = await getBot(env, botId);
	if (!bot || !bot.enabled) return json({ error: 'This chat is not available right now.' }, 404);
	if (!(await canUseTroop(env, bot.userId, 'jack'))) return json({ error: 'This chat is not available right now.' }, 403);

	const rawLimit = Number((env as unknown as Record<string, string | undefined>).JACK_DAILY_LIMIT);
	const appLimit = Number.isFinite(rawLimit) && rawLimit > 0 ? rawLimit : DEFAULT_APP_DAILY_LIMIT;
	const withinApp = await takeUsage(env, `jack-app:${botId}`, appLimit);
	const withinVisitor = await takeUsage(env, `jack-visitor:${visitorId}`, VISITOR_DAILY_LIMIT);
	if (!withinApp || !withinVisitor) {
		return json({ error: 'We have reached the chat limit for today. Please try again tomorrow.' }, 429);
	}

	try {
		const [history, site] = await Promise.all([recentTurns(env, botId, visitorId, 10), getSiteById(env, botId)]);
		const answer = await askJack(env, bot, site, history, message);
		await saveTurn(env, { appId: botId, visitorId, role: 'user', content: message });
		await saveTurn(env, { appId: botId, visitorId, role: 'assistant', content: answer.reply, needsHuman: answer.needsHuman });
		if (answer.contact) {
			await saveLead(env, { appId: botId, visitorId, contact: answer.contact, note: message.slice(0, 200) });
		}
		return json({ reply: answer.reply, needsHuman: answer.needsHuman });
	} catch (error) {
		console.error('Maria chat failed', error);
		return json({ error: 'Maria is busy right now. Please try again in a moment.' }, 503);
	}
}

export async function handleJackPublic(env: Env, request: Request): Promise<Response> {
	if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: CORS });
	const { pathname } = new URL(request.url);
	if (pathname === '/api/jack/widget.js' && request.method === 'GET') return handleWidget(env, request);
	if (pathname === '/api/jack/public/chat' && request.method === 'POST') return handleChat(env, request);
	return json({ error: 'Not found' }, 404);
}
