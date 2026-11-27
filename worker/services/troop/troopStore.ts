import { getAgentAccess } from '../credits/purchasedCredits';

// John (ads) and Maria (support) data. Tables are created on first use, so no migration step is needed.

let tablesReady = false;

async function ensureTables(env: Env): Promise<void> {
	if (tablesReady) return;
	await env.DB.batch([
		env.DB.prepare(
			'CREATE TABLE IF NOT EXISTS troop_ad_packs (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, app_id TEXT NOT NULL, goal TEXT, budget_inr INTEGER, content TEXT NOT NULL, created_at INTEGER NOT NULL)',
		),
		env.DB.prepare('CREATE INDEX IF NOT EXISTS troop_ad_packs_app ON troop_ad_packs (user_id, app_id, created_at)'),
		env.DB.prepare(
			'CREATE TABLE IF NOT EXISTS jack_bots (app_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, business_name TEXT, knowledge TEXT, tone TEXT, greeting TEXT, enabled INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)',
		),
		env.DB.prepare(
			'CREATE TABLE IF NOT EXISTS jack_messages (id INTEGER PRIMARY KEY AUTOINCREMENT, app_id TEXT NOT NULL, visitor_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, needs_human INTEGER NOT NULL DEFAULT 0, created_at INTEGER NOT NULL)',
		),
		env.DB.prepare('CREATE INDEX IF NOT EXISTS jack_messages_visitor ON jack_messages (app_id, visitor_id, id)'),
		env.DB.prepare(
			'CREATE TABLE IF NOT EXISTS jack_leads (id INTEGER PRIMARY KEY AUTOINCREMENT, app_id TEXT NOT NULL, visitor_id TEXT NOT NULL, contact TEXT NOT NULL, note TEXT, created_at INTEGER NOT NULL)',
		),
		env.DB.prepare('CREATE TABLE IF NOT EXISTS troop_usage (key TEXT PRIMARY KEY, count INTEGER NOT NULL)'),
	]);
	tablesReady = true;
}

/* ===================== access and limits ===================== */

// John and Maria are open to everyone while testing. Set TROOP_REQUIRE_PLAN=true to require that agent's plan (or Pro).
export async function canUseTroop(env: Env, userId: string, agent: 'louie' | 'jack'): Promise<boolean> {
	const flag = (env as unknown as Record<string, string | undefined>).TROOP_REQUIRE_PLAN;
	if (flag !== 'true') return true;
	return (await getAgentAccess(env, userId))[agent];
}

function today(): string {
	return new Date().toISOString().slice(0, 10);
}

// Counts one use against a daily budget. Returns false when the budget is already spent.
export async function takeUsage(env: Env, scope: string, limit: number): Promise<boolean> {
	await ensureTables(env);
	const row = await env.DB
		.prepare('INSERT INTO troop_usage (key, count) VALUES (?1, 1) ON CONFLICT(key) DO UPDATE SET count = count + 1 RETURNING count')
		.bind(`${scope}:${today()}`)
		.first<{ count: number }>();
	return (row?.count ?? 1) <= limit;
}

/* ===================== the user's websites ===================== */

export interface SiteInfo {
	id: string;
	title: string;
	description: string | null;
	originalPrompt: string;
	status: string;
}

interface SiteRow {
	id: string;
	title: string;
	description: string | null;
	original_prompt: string;
	status: string;
}

const toSite = (r: SiteRow): SiteInfo => ({
	id: r.id,
	title: r.title,
	description: r.description,
	originalPrompt: r.original_prompt,
	status: r.status,
});

export async function listSites(env: Env, userId: string): Promise<SiteInfo[]> {
	const { results } = await env.DB
		.prepare('SELECT id, title, description, original_prompt, status FROM apps WHERE user_id = ?1 AND COALESCE(is_archived, 0) = 0 ORDER BY updated_at DESC LIMIT 100')
		.bind(userId)
		.all<SiteRow>();
	return results.map(toSite);
}

export async function getOwnedSite(env: Env, userId: string, appId: string): Promise<SiteInfo | null> {
	const row = await env.DB
		.prepare('SELECT id, title, description, original_prompt, status FROM apps WHERE id = ?1 AND user_id = ?2')
		.bind(appId, userId)
		.first<SiteRow>();
	return row ? toSite(row) : null;
}

export async function getSiteById(env: Env, appId: string): Promise<SiteInfo | null> {
	const row = await env.DB
		.prepare('SELECT id, title, description, original_prompt, status FROM apps WHERE id = ?1')
		.bind(appId)
		.first<SiteRow>();
	return row ? toSite(row) : null;
}

/* ===================== John: saved ad packs ===================== */

export interface SavedAdPack {
	id: string;
	appId: string;
	goal: string | null;
	budgetInr: number | null;
	createdAt: number;
	content: unknown;
}

export async function saveAdPack(
	env: Env,
	p: { userId: string; appId: string; goal: string; budgetInr: number; content: unknown },
): Promise<SavedAdPack> {
	await ensureTables(env);
	const id = crypto.randomUUID();
	const createdAt = Date.now();
	await env.DB
		.prepare('INSERT INTO troop_ad_packs (id, user_id, app_id, goal, budget_inr, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)')
		.bind(id, p.userId, p.appId, p.goal, p.budgetInr, JSON.stringify(p.content), createdAt)
		.run();
	return { id, appId: p.appId, goal: p.goal, budgetInr: p.budgetInr, createdAt, content: p.content };
}

export async function listAdPacks(env: Env, userId: string, appId: string): Promise<SavedAdPack[]> {
	await ensureTables(env);
	const { results } = await env.DB
		.prepare('SELECT id, app_id, goal, budget_inr, content, created_at FROM troop_ad_packs WHERE user_id = ?1 AND app_id = ?2 ORDER BY created_at DESC LIMIT 10')
		.bind(userId, appId)
		.all<{ id: string; app_id: string; goal: string | null; budget_inr: number | null; content: string; created_at: number }>();
	return results.map((r) => ({
		id: r.id,
		appId: r.app_id,
		goal: r.goal,
		budgetInr: r.budget_inr,
		createdAt: r.created_at,
		content: JSON.parse(r.content) as unknown,
	}));
}

/* ===================== Maria: bot, chats, leads ===================== */

export interface JackBot {
	appId: string;
	userId: string;
	businessName: string;
	knowledge: string;
	tone: string;
	greeting: string;
	enabled: boolean;
}

interface BotRow {
	app_id: string;
	user_id: string;
	business_name: string | null;
	knowledge: string | null;
	tone: string | null;
	greeting: string | null;
	enabled: number;
}

const toBot = (r: BotRow): JackBot => ({
	appId: r.app_id,
	userId: r.user_id,
	businessName: r.business_name ?? '',
	knowledge: r.knowledge ?? '',
	tone: r.tone ?? 'friendly',
	greeting: r.greeting ?? '',
	enabled: r.enabled === 1,
});

export async function getBot(env: Env, appId: string): Promise<JackBot | null> {
	await ensureTables(env);
	const row = await env.DB
		.prepare('SELECT app_id, user_id, business_name, knowledge, tone, greeting, enabled FROM jack_bots WHERE app_id = ?1')
		.bind(appId)
		.first<BotRow>();
	return row ? toBot(row) : null;
}

export async function saveBot(env: Env, bot: JackBot): Promise<void> {
	await ensureTables(env);
	await env.DB
		.prepare(
			'INSERT INTO jack_bots (app_id, user_id, business_name, knowledge, tone, greeting, enabled, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8) ' +
				'ON CONFLICT(app_id) DO UPDATE SET business_name = ?3, knowledge = ?4, tone = ?5, greeting = ?6, enabled = ?7, updated_at = ?8',
		)
		.bind(bot.appId, bot.userId, bot.businessName, bot.knowledge, bot.tone, bot.greeting, bot.enabled ? 1 : 0, Date.now())
		.run();
}

export interface ChatTurn {
	role: 'user' | 'assistant';
	content: string;
}

export async function recentTurns(env: Env, appId: string, visitorId: string, limit = 10): Promise<ChatTurn[]> {
	await ensureTables(env);
	const { results } = await env.DB
		.prepare('SELECT role, content FROM jack_messages WHERE app_id = ?1 AND visitor_id = ?2 ORDER BY id DESC LIMIT ?3')
		.bind(appId, visitorId, limit)
		.all<{ role: string; content: string }>();
	return results
		.reverse()
		.map((r) => ({ role: r.role === 'assistant' ? ('assistant' as const) : ('user' as const), content: r.content }));
}

export async function saveTurn(
	env: Env,
	p: { appId: string; visitorId: string; role: 'user' | 'assistant'; content: string; needsHuman?: boolean },
): Promise<void> {
	await ensureTables(env);
	await env.DB
		.prepare('INSERT INTO jack_messages (app_id, visitor_id, role, content, needs_human, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)')
		.bind(p.appId, p.visitorId, p.role, p.content, p.needsHuman ? 1 : 0, Date.now())
		.run();
}

export async function saveLead(env: Env, p: { appId: string; visitorId: string; contact: string; note: string }): Promise<void> {
	await ensureTables(env);
	await env.DB
		.prepare('INSERT INTO jack_leads (app_id, visitor_id, contact, note, created_at) VALUES (?1, ?2, ?3, ?4, ?5)')
		.bind(p.appId, p.visitorId, p.contact, p.note, Date.now())
		.run();
}

export interface InboxConversation {
	visitorId: string;
	lastAt: number;
	needsHuman: boolean;
	turns: ChatTurn[];
}

export interface InboxLead {
	visitorId: string;
	contact: string;
	note: string;
	createdAt: number;
}

export async function loadInbox(env: Env, appId: string): Promise<{ conversations: InboxConversation[]; leads: InboxLead[] }> {
	await ensureTables(env);
	const { results: visitors } = await env.DB
		.prepare(
			'SELECT visitor_id AS visitorId, MAX(created_at) AS lastAt, MAX(needs_human) AS needsHuman FROM jack_messages WHERE app_id = ?1 GROUP BY visitor_id ORDER BY lastAt DESC LIMIT 20',
		)
		.bind(appId)
		.all<{ visitorId: string; lastAt: number; needsHuman: number }>();

	const conversations: InboxConversation[] = [];
	for (const v of visitors) {
		conversations.push({
			visitorId: v.visitorId,
			lastAt: v.lastAt,
			needsHuman: v.needsHuman === 1,
			turns: await recentTurns(env, appId, v.visitorId, 20),
		});
	}

	const { results: leadRows } = await env.DB
		.prepare('SELECT visitor_id, contact, note, created_at FROM jack_leads WHERE app_id = ?1 ORDER BY id DESC LIMIT 50')
		.bind(appId)
		.all<{ visitor_id: string; contact: string; note: string | null; created_at: number }>();

	return {
		conversations,
		leads: leadRows.map((l) => ({ visitorId: l.visitor_id, contact: l.contact, note: l.note ?? '', createdAt: l.created_at })),
	};
}
