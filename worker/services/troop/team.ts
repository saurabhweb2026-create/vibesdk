import { getPurchasedBalance, getUserPlan, trySpendPurchased, type AgentId } from '../credits/purchasedCredits';

// The AlwaysBro team: each member has a name, outfit, XP and morale. Tables are created on first use.

export const AGENTS: Array<{ id: AgentId; defaultName: string; role: string }> = [
	{ id: 'caesar', defaultName: 'Jack', role: 'Builds your websites and apps' },
	{ id: 'louie', defaultName: 'John', role: 'Ads and social media' },
	{ id: 'jack', defaultName: 'Maria', role: 'Customer support' },
];

export const SLOTS = ['set', 'head', 'top', 'bottom', 'shoes'] as const;
export type Slot = (typeof SLOTS)[number];

/** Wardrobe items. `color` is the tint for top, bottom and shoes, and the accent for the rest. */
export interface WardrobeItem {
	id: string;
	slot: Slot;
	name: string;
	price: number;
	color: string;
	perk: string;
}

const item = (id: string, slot: Slot, name: string, price: number, color: string, perk: string): WardrobeItem => ({ id, slot, name, price, color, perk });

export const WARDROBE: WardrobeItem[] = [
	item('festive', 'set', 'Festive wear', 40, '#f59e0b', 'Kurta and saree for every Indian festival'),
	item('beach', 'set', 'Beach wear', 50, '#38bdf8', 'Sun, sand and a launch by the sea'),
	item('casual', 'set', 'Casual wear', 50, '#94a3b8', 'Relaxed Friday look'),
	item('cowboy', 'set', 'Cowboy wear', 60, '#b45309', 'Ride into the next deadline'),
	item('formal', 'set', 'Formal wear', 60, '#475569', 'Boardroom ready'),
	item('party-wear', 'set', 'Party wear', 60, '#c026d3', 'Dressed to celebrate'),
	item('christmas', 'head', 'Santa hat', 25, '#ef4444', 'Ho ho ho, the whole team in red'),
	item('party', 'head', 'Party hat', 20, '#a855f7', 'Celebrates every launch'),
	item('shades', 'head', 'Cool shades', 30, '#38bdf8', 'Too bright a future to look at'),
	item('crown', 'head', 'Hero crown', 100, '#eab308', 'Employee of the month, every month'),
	item('top-crimson', 'top', 'Crimson top', 20, '#c8102e', 'Bold and confident'),
	item('top-royal', 'top', 'Royal blue top', 20, '#2f55d4', 'Sharp for client meetings'),
	item('top-emerald', 'top', 'Emerald top', 20, '#168a5b', 'Fresh and calm'),
	item('top-sunset', 'top', 'Sunset top', 20, '#f59e0b', 'Warm like a festival evening'),
	item('top-violet', 'top', 'Violet top', 20, '#7c3aed', 'Creative energy'),
	item('top-black', 'top', 'Black top', 20, '#16161a', 'Always in style'),
	item('jeans-indigo', 'bottom', 'Indigo jeans', 35, '#2b4c8c', 'Classic denim'),
	item('jeans-black', 'bottom', 'Black jeans', 35, '#1a1a1d', 'Goes with everything'),
	item('pants-olive', 'bottom', 'Olive cargos', 30, '#6b6b3a', 'Weekend ready'),
	item('pants-maroon', 'bottom', 'Maroon trousers', 30, '#7a1f3d', 'Evening wear'),
	item('pants-cream', 'bottom', 'Cream trousers', 30, '#e8e4da', 'Light for summer'),
	item('shoes-red', 'shoes', 'Red shoes', 20, '#d41c1c', 'Run to the next launch'),
	item('shoes-white', 'shoes', 'White shoes', 20, '#f2f2f2', 'Fresh out of the box'),
	item('shoes-brown', 'shoes', 'Brown shoes', 30, '#6b3f21', 'Leather look'),
	item('shoes-black', 'shoes', 'Black shoes', 30, '#141414', 'Formal and sharp'),
	item('shoes-gold', 'shoes', 'Gold shoes', 40, '#d4a017', 'Walk like a star'),
];

export const BONUS_AMOUNTS = [10, 25, 50];
const LEVEL_XP = [0, 100, 300, 700, 1500];
const NAME_MAX = 20;

const STORY: Record<AgentId, string[]> = {
	caesar: [
		'Day one at the agency. Jack unpacks his laptop and promises to turn your idea into a real website.',
		'Jack ships his first sites and starts to trust his own eye for layout.',
		'Clients now ask for Jack by name. He keeps a sticky note: "Always test the preview."',
		'Jack mentors the team on clean design and fast pages.',
		'Jack is the agency legend: if it can be built, he builds it.',
	],
	louie: [
		'John joins the agency, notebook full of campaign ideas and a phone full of reels.',
		'His first ads bring in real visitors. John celebrates with a very large coffee.',
		'Brands start copying his hooks. John just smiles and posts another one.',
		'John runs three campaigns at once without losing his calm.',
		'John becomes the voice of the brand across every channel.',
	],
	jack: [
		'Maria puts on her headset and greets the very first customer.',
		'She answers questions at midnight and never loses her smile.',
		'Customers leave thank-you notes. Maria pins them above her desk.',
		'Maria spots problems before customers even ask.',
		'Maria is the heart of the agency: every customer feels looked after.',
	],
};

const BONUS_LINES = [
	'Thank you! That means a lot. Back to work with a big smile.',
	'A bonus! The whole team heard about it. We are on it.',
	'You just made our week. Expect even better work from us.',
];

let tablesReady = false;

async function ensureTables(env: Env): Promise<void> {
	if (tablesReady) return;
	await env.DB.batch([
		env.DB.prepare(
			'CREATE TABLE IF NOT EXISTS troop_team (user_id TEXT NOT NULL, agent_id TEXT NOT NULL, name TEXT, outfit TEXT, xp INTEGER NOT NULL DEFAULT 0, morale INTEGER NOT NULL DEFAULT 60, PRIMARY KEY (user_id, agent_id))',
		),
		env.DB.prepare('CREATE TABLE IF NOT EXISTS troop_outfits (user_id TEXT NOT NULL, outfit_id TEXT NOT NULL, PRIMARY KEY (user_id, outfit_id))'),
		env.DB.prepare('CREATE TABLE IF NOT EXISTS troop_wear (user_id TEXT NOT NULL, agent_id TEXT NOT NULL, slot TEXT NOT NULL, item_id TEXT NOT NULL, PRIMARY KEY (user_id, agent_id, slot))'),
	]);
	tablesReady = true;
}

export function levelFor(xp: number): number {
	let level = 1;
	for (let i = 1; i < LEVEL_XP.length; i++) if (xp >= LEVEL_XP[i]) level = i + 1;
	return level;
}

export interface TeamMember {
	id: AgentId;
	name: string;
	role: string;
	/** Item worn in each slot. */
	wearing: Partial<Record<Slot, string>>;
	xp: number;
	level: number;
	nextLevelXp: number | null;
	morale: number;
	story: string[];
}

export interface TeamData {
	canCustomize: boolean;
	balance: number;
	members: TeamMember[];
	items: WardrobeItem[];
	owned: string[];
	bonusAmounts: number[];
}

// While testing, everyone can customize. Set TROOP_REQUIRE_PLAN=true to limit it to Pro.
export async function canCustomize(env: Env, userId: string): Promise<boolean> {
	const flag = (env as unknown as Record<string, string | undefined>).TROOP_REQUIRE_PLAN;
	if (flag !== 'true') return true;
	return (await getUserPlan(env, userId)).plan === 'pro';
}

export async function loadTeam(env: Env, userId: string): Promise<TeamData> {
	await ensureTables(env);
	const [rows, wear, owned, balance, customize] = await Promise.all([
		env.DB
			.prepare('SELECT agent_id, name, xp, morale FROM troop_team WHERE user_id = ?1')
			.bind(userId)
			.all<{ agent_id: string; name: string | null; xp: number; morale: number }>(),
		env.DB.prepare('SELECT agent_id, slot, item_id FROM troop_wear WHERE user_id = ?1').bind(userId).all<{ agent_id: string; slot: Slot; item_id: string }>(),
		env.DB.prepare('SELECT outfit_id FROM troop_outfits WHERE user_id = ?1').bind(userId).all<{ outfit_id: string }>(),
		getPurchasedBalance(env, userId),
		canCustomize(env, userId),
	]);
	const byAgent = new Map(rows.results.map((r) => [r.agent_id, r]));
	const members = AGENTS.map((a): TeamMember => {
		const row = byAgent.get(a.id);
		const xp = row?.xp ?? 0;
		const level = levelFor(xp);
		return {
			id: a.id,
			name: row?.name || a.defaultName,
			role: a.role,
			wearing: Object.fromEntries(wear.results.filter((w) => w.agent_id === a.id).map((w) => [w.slot, w.item_id])),
			xp,
			level,
			nextLevelXp: LEVEL_XP[level] ?? null,
			morale: row?.morale ?? 60,
			story: STORY[a.id].slice(0, level),
		};
	});
	return {
		canCustomize: customize,
		balance,
		members,
		items: WARDROBE,
		owned: owned.results.map((o) => o.outfit_id),
		bonusAmounts: BONUS_AMOUNTS,
	};
}

function isAgent(id: string): id is AgentId {
	return AGENTS.some((a) => a.id === id);
}

async function upsertMember(env: Env, userId: string, agentId: AgentId): Promise<void> {
	await ensureTables(env);
	await env.DB.prepare('INSERT OR IGNORE INTO troop_team (user_id, agent_id) VALUES (?1, ?2)').bind(userId, agentId).run();
}

export async function renameMember(env: Env, userId: string, agentId: string, rawName: string): Promise<string> {
	if (!isAgent(agentId)) throw new Error('Unknown team member');
	if (!(await canCustomize(env, userId))) throw new Error('Renaming is part of the Pro plan');
	const name = rawName.replace(/[^\p{L}\p{N} '\-]/gu, '').trim().slice(0, NAME_MAX);
	if (name.length < 2) throw new Error('Please use at least 2 letters');
	await upsertMember(env, userId, agentId);
	await env.DB.prepare('UPDATE troop_team SET name = ?1 WHERE user_id = ?2 AND agent_id = ?3').bind(name, userId, agentId).run();
	return name;
}

export async function buyItem(env: Env, userId: string, itemId: string): Promise<void> {
	const found = WARDROBE.find((o) => o.id === itemId);
	if (!found) throw new Error('Unknown item');
	if (!(await canCustomize(env, userId))) throw new Error('The wardrobe is part of the Pro plan');
	await ensureTables(env);
	const have = await env.DB.prepare('SELECT 1 AS x FROM troop_outfits WHERE user_id = ?1 AND outfit_id = ?2').bind(userId, itemId).first();
	if (have) throw new Error('You already own this');
	if (!(await trySpendPurchased(env, userId, found.price))) throw new Error('Not enough credits');
	await env.DB.prepare('INSERT OR IGNORE INTO troop_outfits (user_id, outfit_id) VALUES (?1, ?2)').bind(userId, itemId).run();
}

/** Puts an owned item on a teammate, or takes the slot back to the original look when itemId is null. */
export async function wearItem(env: Env, userId: string, agentId: string, slot: string, itemId: string | null): Promise<void> {
	if (!isAgent(agentId)) throw new Error('Unknown team member');
	if (!SLOTS.some((s) => s === slot)) throw new Error('Unknown clothing slot');
	await ensureTables(env);
	if (!itemId) {
		await env.DB.prepare('DELETE FROM troop_wear WHERE user_id = ?1 AND agent_id = ?2 AND slot = ?3').bind(userId, agentId, slot).run();
		return;
	}
	const found = WARDROBE.find((o) => o.id === itemId);
	if (!found || found.slot !== slot) throw new Error('That does not go there');
	const owns = await env.DB.prepare('SELECT 1 AS x FROM troop_outfits WHERE user_id = ?1 AND outfit_id = ?2').bind(userId, itemId).first();
	if (!owns) throw new Error('Buy this first');
	await env.DB
		.prepare('INSERT INTO troop_wear (user_id, agent_id, slot, item_id) VALUES (?1, ?2, ?3, ?4) ON CONFLICT (user_id, agent_id, slot) DO UPDATE SET item_id = ?4')
		.bind(userId, agentId, slot, itemId)
		.run();
}

export async function giveBonus(env: Env, userId: string, agentId: string, amount: number): Promise<string> {
	if (!isAgent(agentId)) throw new Error('Unknown team member');
	if (!BONUS_AMOUNTS.includes(amount)) throw new Error('Choose one of the bonus amounts');
	if (!(await trySpendPurchased(env, userId, amount))) throw new Error('Not enough credits');
	await upsertMember(env, userId, agentId);
	await env.DB
		.prepare('UPDATE troop_team SET xp = xp + ?1, morale = MIN(100, morale + ?2) WHERE user_id = ?3 AND agent_id = ?4')
		.bind(amount * 2, Math.ceil(amount / 2), userId, agentId)
		.run();
	return BONUS_LINES[Math.floor(Math.random() * BONUS_LINES.length)];
}

// Called when a member finishes real work, so the story moves forward.
export async function addXp(env: Env, userId: string, agentId: AgentId, xp: number): Promise<void> {
	try {
		await upsertMember(env, userId, agentId);
		await env.DB.prepare('UPDATE troop_team SET xp = xp + ?1 WHERE user_id = ?2 AND agent_id = ?3').bind(xp, userId, agentId).run();
	} catch (e) {
		console.error('addXp failed', e);
	}
}
