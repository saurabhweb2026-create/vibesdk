// John's content calendar: learn the business from a link, plan a month of posts, and publish the approved ones on their dates.
import { createPost, type MetaPostRow, type MetaTarget } from '../meta/metaService';
import { parseJsonObject, troopComplete } from './troopLlm';
import type { SiteInfo } from './troopStore';

export interface Brand {
	url: string;
	about: string;
	tone: string;
	audience: string;
	products: Array<{ name: string; price: string }>;
}

export interface PlanShot {
	seconds: number;
	text: string;
	imagePrompt: string;
}

export type PlanStatus = 'draft' | 'approved' | 'posted' | 'failed' | 'skipped';

export interface PlanItem {
	id: string;
	appId: string;
	day: string;
	kind: 'image' | 'reel';
	idea: string;
	caption: string;
	imagePrompt: string;
	overlay: string;
	shots: PlanShot[];
	cta: string;
	status: PlanStatus;
	scheduledAt: number | null;
	error: string | null;
}

interface PlanRecord {
	id: string;
	app_id: string;
	day: string;
	kind: 'image' | 'reel';
	idea: string;
	caption: string;
	image_prompt: string;
	overlay: string;
	shots: string;
	cta: string;
	status: PlanStatus;
	post_id: string | null;
	scheduled_at: number | null;
	post_status: MetaPostRow['status'] | null;
	post_error: string | null;
}

const POSTS_PER_MONTH = 12;
const PAGE_CHARS = 6000;
const DAY_MS = 24 * 60 * 60 * 1000;
const PUBLISH_HOUR_UTC = 4;
const MIN_LEAD_MS = 6 * 60 * 1000;

let tablesReady = false;

async function ensureTables(env: Env): Promise<void> {
	if (tablesReady) return;
	await env.DB.batch([
		env.DB.prepare('CREATE TABLE IF NOT EXISTS troop_brand (app_id TEXT PRIMARY KEY, user_id TEXT NOT NULL, profile TEXT NOT NULL, updated_at INTEGER NOT NULL)'),
		env.DB.prepare(
			'CREATE TABLE IF NOT EXISTS troop_plan (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, app_id TEXT NOT NULL, day TEXT NOT NULL, kind TEXT NOT NULL, idea TEXT, caption TEXT, image_prompt TEXT, overlay TEXT, shots TEXT, cta TEXT, status TEXT NOT NULL DEFAULT \'draft\', post_id TEXT, created_at INTEGER NOT NULL)',
		),
		env.DB.prepare('CREATE INDEX IF NOT EXISTS troop_plan_app ON troop_plan (user_id, app_id, day)'),
	]);
	tablesReady = true;
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

const PRIVATE_HOST = /^(localhost|.*\.local|.*\.internal|\[.*\]|\d{1,3}(\.\d{1,3}){3})$/i;

function safeUrl(raw: string): URL {
	const url = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
	if (url.protocol !== 'https:' || PRIVATE_HOST.test(url.hostname) || !url.hostname.includes('.')) throw new Error('Paste a public website link that starts with https');
	return url;
}

async function readPage(url: URL): Promise<string> {
	const res = await fetch(url.toString(), { headers: { 'user-agent': 'AlwaysBroBot/1.0', accept: 'text/html' }, redirect: 'follow', signal: AbortSignal.timeout(10_000) });
	if (!res.ok) throw new Error('John could not open that link');
	const html = (await res.text()).slice(0, 400_000);
	return html
		.replace(/<(script|style|noscript|svg)[\s\S]*?<\/\1>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/&[a-z#0-9]+;/gi, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.slice(0, PAGE_CHARS);
}

function toBrand(raw: Record<string, unknown>, url: string): Brand {
	const products = Array.isArray(raw.products) ? raw.products : [];
	return {
		url,
		about: str(raw.about, 500),
		tone: str(raw.tone, 120),
		audience: str(raw.audience, 200),
		products: products
			.filter((p): p is Record<string, unknown> => !!p && typeof p === 'object')
			.slice(0, 8)
			.map((p) => ({ name: str(p.name, 80), price: str(p.price, 30) }))
			.filter((p) => p.name),
	};
}

export async function getBrand(env: Env, userId: string, appId: string): Promise<Brand | null> {
	await ensureTables(env);
	const row = await env.DB.prepare('SELECT profile FROM troop_brand WHERE app_id = ?1 AND user_id = ?2').bind(appId, userId).first<{ profile: string }>();
	return row ? (JSON.parse(row.profile) as Brand) : null;
}

/** Reads the business link (or, without one, the website description) and keeps what John needs to write in the brand's voice. */
export async function learnBrand(env: Env, userId: string, site: SiteInfo, link: string): Promise<Brand> {
	await ensureTables(env);
	const url = link.trim() ? safeUrl(link.trim()) : null;
	const source = url ? await readPage(url) : `${site.title}. ${site.description ?? ''} ${site.originalPrompt}`.slice(0, PAGE_CHARS);
	const answer = await troopComplete(
		env,
		[
			{
				role: 'system',
				content:
					'You read a small business page and describe the business for its social media manager. Reply with JSON only: {"about": string (what they sell and what makes them different, 2 sentences), "tone": string (how the brand talks, 6 words), "audience": string (who buys), "products": [{"name": string, "price": string}]}. Use only facts found in the text. Leave price empty when it is not shown.',
			},
			{ role: 'user', content: `Business name: ${site.title}\n\nPage text:\n${source}` },
		],
		{ maxTokens: 900, temperature: 0.2 },
	);
	const raw = parseJsonObject(answer);
	if (!raw) throw new Error('John could not read that page. Try another link.');
	const brand = toBrand(raw, url?.toString() ?? '');
	await env.DB.prepare('INSERT INTO troop_brand (app_id, user_id, profile, updated_at) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(app_id) DO UPDATE SET profile = ?3, updated_at = ?4')
		.bind(site.id, userId, JSON.stringify(brand), Date.now())
		.run();
	return brand;
}

function toItem(r: PlanRecord): PlanItem {
	const status: PlanStatus = r.post_status === 'posted' ? 'posted' : r.post_status === 'failed' ? 'failed' : r.status;
	return {
		id: r.id,
		appId: r.app_id,
		day: r.day,
		kind: r.kind,
		idea: r.idea,
		caption: r.caption,
		imagePrompt: r.image_prompt,
		overlay: r.overlay,
		shots: JSON.parse(r.shots || '[]') as PlanShot[],
		cta: r.cta,
		status,
		scheduledAt: r.scheduled_at,
		error: r.post_error,
	};
}

export async function listPlan(env: Env, userId: string, appId: string): Promise<PlanItem[]> {
	await ensureTables(env);
	const { results } = await env.DB
		.prepare(
			`SELECT p.*, m.scheduled_at AS scheduled_at, m.status AS post_status, m.error AS post_error
			 FROM troop_plan p LEFT JOIN meta_posts m ON m.id = p.post_id
			 WHERE p.user_id = ?1 AND p.app_id = ?2 ORDER BY p.day ASC, p.created_at ASC LIMIT 60`,
		)
		.bind(userId, appId)
		.all<PlanRecord>();
	return results.map(toItem);
}

const isoDay = (ms: number): string => new Date(ms).toISOString().slice(0, 10);

/** Plans a fresh month. Posts that were already approved or published stay; unapproved drafts are replaced. */
export async function planMonth(env: Env, userId: string, site: SiteInfo, brand: Brand, focus: string): Promise<PlanItem[]> {
	await ensureTables(env);
	const answer = await troopComplete(
		env,
		[
			{
				role: 'system',
				content: `You are John, the social media marketer for a small Indian business. Plan exactly ${POSTS_PER_MONTH} Instagram posts for the next 27 days: about two thirds single pictures and one third short reels (15 to 20 seconds). Mix product posts, offers, behind the scenes, customer proof, tips and festive or seasonal moments. Write like the brand, plain and warm, with at most 4 hashtags in each caption. Reply with JSON only: {"posts": [{"dayOffset": number 1-27 ascending, "kind": "image" | "reel", "idea": string (one line), "caption": string, "imagePrompt": string (a photo brief with no text in the picture), "overlay": string (headline of at most 6 words, for pictures), "shots": [{"seconds": 3-5, "text": string (on-screen line), "imagePrompt": string}] (3 to 4 shots, reels only, otherwise empty), "cta": string (reels only)}]}`,
			},
			{
				role: 'user',
				content: `Business: ${site.title}\nAbout: ${brand.about}\nTone: ${brand.tone}\nAudience: ${brand.audience}\nProducts: ${brand.products.map((p) => `${p.name} ${p.price}`.trim()).join('; ') || 'not listed'}\nFocus this month: ${focus || 'steady growth and more enquiries'}`,
			},
		],
		{ maxTokens: 6000, temperature: 0.7 },
	);
	const raw = parseJsonObject(answer);
	const posts = raw && Array.isArray(raw.posts) ? raw.posts.filter((p): p is Record<string, unknown> => !!p && typeof p === 'object') : [];
	if (posts.length === 0) throw new Error('John could not plan the month. Please try again.');

	const now = Date.now();
	const statements = [env.DB.prepare("DELETE FROM troop_plan WHERE user_id = ?1 AND app_id = ?2 AND status IN ('draft', 'skipped')").bind(userId, site.id)];
	for (const p of posts.slice(0, POSTS_PER_MONTH)) {
		const kind = p.kind === 'reel' ? 'reel' : 'image';
		const offset = Math.max(1, Math.min(27, Math.round(Number(p.dayOffset) || 1)));
		const shots = Array.isArray(p.shots)
			? p.shots
					.filter((s): s is Record<string, unknown> => !!s && typeof s === 'object')
					.slice(0, 4)
					.map((s) => ({ seconds: Math.max(2, Math.min(6, Math.round(Number(s.seconds) || 4))), text: str(s.text, 80), imagePrompt: str(s.imagePrompt, 300) }))
			: [];
		if (kind === 'reel' && shots.length === 0) continue;
		statements.push(
			env.DB.prepare(
				'INSERT INTO troop_plan (id, user_id, app_id, day, kind, idea, caption, image_prompt, overlay, shots, cta, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, \'draft\', ?12)',
			).bind(crypto.randomUUID(), userId, site.id, isoDay(now + offset * DAY_MS), kind, str(p.idea, 200), str(p.caption, 1500), str(p.imagePrompt, 400), str(p.overlay, 60), JSON.stringify(kind === 'reel' ? shots : []), str(p.cta, 60), now),
		);
	}
	await env.DB.batch(statements);
	return listPlan(env, userId, site.id);
}

export interface PlanEdit {
	caption?: string;
	day?: string;
	skip?: boolean;
}

export async function editPlanItem(env: Env, userId: string, id: string, edit: PlanEdit): Promise<void> {
	await ensureTables(env);
	if (edit.skip !== undefined) {
		await env.DB.prepare("UPDATE troop_plan SET status = ?3 WHERE id = ?1 AND user_id = ?2 AND status IN ('draft', 'skipped')").bind(id, userId, edit.skip ? 'skipped' : 'draft').run();
	}
	if (edit.caption !== undefined) {
		await env.DB.prepare("UPDATE troop_plan SET caption = ?3 WHERE id = ?1 AND user_id = ?2 AND status IN ('draft', 'skipped')").bind(id, userId, edit.caption.trim().slice(0, 2200)).run();
	}
	if (edit.day !== undefined && /^\d{4}-\d{2}-\d{2}$/.test(edit.day)) {
		await env.DB.prepare("UPDATE troop_plan SET day = ?3 WHERE id = ?1 AND user_id = ?2 AND status IN ('draft', 'skipped')").bind(id, userId, edit.day).run();
	}
}

export interface PlanApproval {
	message: string;
	image?: string;
	video?: string;
	target: MetaTarget;
}

/** Approving schedules the post: it goes out on the planned day, at 9:30 in the morning India time, or a few minutes from now for a day already here. */
export async function approvePlanItem(env: Env, userId: string, id: string, input: PlanApproval): Promise<PlanItem> {
	await ensureTables(env);
	const row = await env.DB.prepare("SELECT app_id, day, kind FROM troop_plan WHERE id = ?1 AND user_id = ?2 AND status = 'draft'").bind(id, userId).first<{ app_id: string; day: string; kind: string }>();
	if (!row) throw new Error('This post was already handled');
	if (row.kind === 'reel' ? !input.video : !input.image) throw new Error(row.kind === 'reel' ? 'Make the video first' : 'Make the picture first');
	const planned = Date.parse(`${row.day}T00:00:00Z`) + PUBLISH_HOUR_UTC * 60 * 60 * 1000 + 30 * 60 * 1000;
	const scheduleAt = Math.max(planned, Date.now() + MIN_LEAD_MS);
	const post = await createPost(env, userId, {
		appId: row.app_id,
		message: input.message,
		image: row.kind === 'image' ? input.image : undefined,
		video: row.kind === 'reel' ? input.video : undefined,
		target: input.target,
		scheduleAt,
	});
	await env.DB.prepare("UPDATE troop_plan SET status = 'approved', post_id = ?3, caption = ?4 WHERE id = ?1 AND user_id = ?2").bind(id, userId, post.id, input.message.trim()).run();
	const items = await listPlan(env, userId, row.app_id);
	const item = items.find((i) => i.id === id);
	if (!item) throw new Error('Could not load the scheduled post');
	return item;
}
