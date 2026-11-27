import { getPurchasedBalance, getUserPlan, trySpendPurchased, type AgentId } from '../credits/purchasedCredits';

// The AlwaysBro team: each member has a name, outfit, XP and morale. Tables are created on first use.

export const AGENTS: Array<{ id: AgentId; defaultName: string; role: string }> = [
	{ id: 'caesar', defaultName: 'Jack', role: 'Builds your websites and apps' },
	{ id: 'louie', defaultName: 'John', role: 'Ads and social media' },
	{ id: 'jack', defaultName: 'Maria', role: 'Customer support' },
];

export interface Outfit {
	id: string;
	name: string;
	price: number;
	color: string;
	perk: string;
}

export const OUTFITS: Outfit[] = [
	{ id: 'party', name: 'Party Hat', price: 20, color: '#f59e0b', perk: 'Celebrates every launch' },
	{ id: 'hoodie', name: 'Cozy Hoodie', price: 30, color: '#6366f1', perk: 'Late-night build energy' },
	{ id: 'suit', name: 'Sharp Suit', price: 60, color: '#0ea5e9', perk: 'Client-meeting ready' },
	{ id: 'hero', name: 'Hero Cape', price: 100, color: '#ef4444', perk: 'Saves the day' },
	{ id: 'gold', name: 'Golden Badge', price: 150, color: '#eab308', perk: 'Employee of the month' },
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
	outfit: string | null;
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
	outfits: Outfit[];
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
	const [rows, owned, balance, customize] = await Promise.all([
		env.DB
			.prepare('SELECT agent_id, name, outfit, xp, morale FROM troop_team WHERE user_id = ?1')
			.bind(userId)
			.all<{ agent_id: string; name: string | null; outfit: string | null; xp: number; morale: number }>(),
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
			outfit: row?.outfit ?? null,
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
		outfits: OUTFITS,
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

export async function buyOutfit(env: Env, userId: string, outfitId: string): Promise<void> {
	const outfit = OUTFITS.find((o) => o.id === outfitId);
	if (!outfit) throw new Error('Unknown outfit');
	if (!(await canCustomize(env, userId))) throw new Error('The outfit shop is part of the Pro plan');
	await ensureTables(env);
	const have = await env.DB.prepare('SELECT 1 AS x FROM troop_outfits WHERE user_id = ?1 AND outfit_id = ?2').bind(userId, outfitId).first();
	if (have) throw new Error('You already own this outfit');
	if (!(await trySpendPurchased(env, userId, outfit.price))) throw new Error('Not enough credits');
	await env.DB.prepare('INSERT OR IGNORE INTO troop_outfits (user_id, outfit_id) VALUES (?1, ?2)').bind(userId, outfitId).run();
}

export async function equipOutfit(env: Env, userId: string, agentId: string, outfitId: string | null): Promise<void> {
	if (!isAgent(agentId)) throw new Error('Unknown team member');
	await ensureTables(env);
	if (outfitId) {
		const owns = await env.DB.prepare('SELECT 1 AS x FROM troop_outfits WHERE user_id = ?1 AND outfit_id = ?2').bind(userId, outfitId).first();
		if (!owns) throw new Error('Buy this outfit first');
	}
	await upsertMember(env, userId, agentId);
	await env.DB.prepare('UPDATE troop_team SET outfit = ?1 WHERE user_id = ?2 AND agent_id = ?3').bind(outfitId, userId, agentId).run();
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
