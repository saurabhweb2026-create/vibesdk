import { getPurchasedBalance, trySpendPurchased } from '../credits/purchasedCredits';

// App looks (colour themes). The default look is free; the others are bought once with credits and kept.

export interface Skin {
	id: string;
	name: string;
	price: number;
}

export const SKINS: Skin[] = [
	{ id: 'midnight', name: 'Midnight', price: 0 },
	{ id: 'sunset', name: 'Sunset Chai', price: 20 },
	{ id: 'ocean', name: 'Ocean Splash', price: 20 },
	{ id: 'bubblegum', name: 'Bubblegum', price: 30 },
	{ id: 'forest', name: 'Jungle Party', price: 30 },
	{ id: 'galaxy', name: 'Galaxy Brain', price: 50 },
	{ id: 'focus', name: 'Concentrate', price: 15 },
	{ id: 'lofi', name: 'Lo-fi Study', price: 25 },
	{ id: 'zen', name: 'Zen Garden', price: 25 },
	{ id: 'vibecheck', name: 'Vibe Check', price: 40 },
	{ id: 'neon', name: 'Neon Night', price: 40 },
];

const FREE_SKIN = 'midnight';

export interface SkinData {
	balance: number;
	skins: Skin[];
	owned: string[];
	active: string;
}

let tablesReady = false;

async function ensureTables(env: Env): Promise<void> {
	if (tablesReady) return;
	await env.DB.batch([
		env.DB.prepare('CREATE TABLE IF NOT EXISTS user_skins (user_id TEXT NOT NULL, skin_id TEXT NOT NULL, PRIMARY KEY (user_id, skin_id))'),
		env.DB.prepare('CREATE TABLE IF NOT EXISTS user_skin_pref (user_id TEXT PRIMARY KEY, skin_id TEXT NOT NULL)'),
	]);
	tablesReady = true;
}

export async function loadSkins(env: Env, userId: string): Promise<SkinData> {
	await ensureTables(env);
	const [owned, pref, balance] = await Promise.all([
		env.DB.prepare('SELECT skin_id FROM user_skins WHERE user_id = ?1').bind(userId).all<{ skin_id: string }>(),
		env.DB.prepare('SELECT skin_id FROM user_skin_pref WHERE user_id = ?1').bind(userId).first<{ skin_id: string }>(),
		getPurchasedBalance(env, userId),
	]);
	const ownedIds = [FREE_SKIN, ...owned.results.map((r) => r.skin_id)];
	const active = pref && ownedIds.includes(pref.skin_id) ? pref.skin_id : FREE_SKIN;
	return { balance, skins: SKINS, owned: ownedIds, active };
}

export async function buySkin(env: Env, userId: string, skinId: string): Promise<void> {
	const skin = SKINS.find((s) => s.id === skinId);
	if (!skin) throw new Error('Unknown look');
	await ensureTables(env);
	const have = await env.DB.prepare('SELECT 1 AS x FROM user_skins WHERE user_id = ?1 AND skin_id = ?2').bind(userId, skinId).first();
	if (have || skin.price === 0) throw new Error('You already own this look');
	if (!(await trySpendPurchased(env, userId, skin.price))) throw new Error('Not enough credits');
	await env.DB.prepare('INSERT OR IGNORE INTO user_skins (user_id, skin_id) VALUES (?1, ?2)').bind(userId, skinId).run();
}

export async function equipSkin(env: Env, userId: string, skinId: string): Promise<void> {
	const data = await loadSkins(env, userId);
	if (!data.owned.includes(skinId)) throw new Error('Unlock this look first');
	await env.DB.prepare('INSERT INTO user_skin_pref (user_id, skin_id) VALUES (?1, ?2) ON CONFLICT(user_id) DO UPDATE SET skin_id = ?2').bind(userId, skinId).run();
}
