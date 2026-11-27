// John's Meta connection: Facebook Page posts and Instagram publishing through the Graph API.
// Posts can go out now or on a schedule; a cron trigger sends the due ones.

const GRAPH = 'https://graph.facebook.com/v21.0';
const SCOPES = ['pages_show_list', 'pages_manage_posts', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish'];
const MEDIA_TTL_SECONDS = 30 * 24 * 60 * 60;
const MAX_SCHEDULE_MS = 28 * 24 * 60 * 60 * 1000;

export type MetaTarget = 'facebook' | 'instagram' | 'both';

export interface MetaStatus {
	configured: boolean;
	connected: boolean;
	pageName: string | null;
	instagramName: string | null;
	posts: MetaPostRow[];
}

export interface MetaPostRow {
	id: string;
	appId: string;
	target: MetaTarget;
	message: string;
	hasImage: boolean;
	status: 'scheduled' | 'publishing' | 'posted' | 'failed' | 'cancelled';
	scheduledAt: number | null;
	publishedAt: number | null;
	error: string | null;
}

interface ConnectionRow {
	user_id: string;
	page_id: string;
	page_name: string;
	page_token: string;
	ig_id: string | null;
	ig_name: string | null;
}

interface PostRecord {
	id: string;
	user_id: string;
	app_id: string;
	target: MetaTarget;
	message: string;
	media_key: string | null;
	status: MetaPostRow['status'];
	scheduled_at: number | null;
	published_at: number | null;
	error: string | null;
}

interface GraphError {
	error?: { message?: string };
}

interface SecretConfig {
	META_APP_ID?: string;
	META_APP_SECRET?: string;
}

const config = (env: Env): SecretConfig => env as unknown as SecretConfig;
export const metaConfigured = (env: Env): boolean => Boolean(config(env).META_APP_ID && config(env).META_APP_SECRET);

let tablesReady = false;

async function ensureTables(env: Env): Promise<void> {
	if (tablesReady) return;
	await env.DB.prepare(
		'CREATE TABLE IF NOT EXISTS meta_connections (user_id TEXT PRIMARY KEY, page_id TEXT NOT NULL, page_name TEXT NOT NULL, page_token TEXT NOT NULL, ig_id TEXT, ig_name TEXT, connected_at INTEGER NOT NULL)',
	).run();
	await env.DB.prepare(
		'CREATE TABLE IF NOT EXISTS meta_posts (id TEXT PRIMARY KEY, user_id TEXT NOT NULL, app_id TEXT NOT NULL, target TEXT NOT NULL, message TEXT NOT NULL, media_key TEXT, status TEXT NOT NULL, scheduled_at INTEGER, published_at INTEGER, error TEXT, created_at INTEGER NOT NULL)',
	).run();
	await env.DB.prepare('CREATE INDEX IF NOT EXISTS meta_posts_due ON meta_posts (status, scheduled_at)').run();
	tablesReady = true;
}

// Page tokens are stored encrypted with a key derived from the platform secret.
async function cipherKey(env: Env): Promise<CryptoKey> {
	const raw = new TextEncoder().encode(`meta-token:${env.JWT_SECRET}`);
	const digest = await crypto.subtle.digest('SHA-256', raw);
	return crypto.subtle.importKey('raw', digest, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

const toB64 = (bytes: Uint8Array): string => btoa(String.fromCharCode(...bytes));
const fromB64 = (text: string): Uint8Array => Uint8Array.from(atob(text), (c) => c.charCodeAt(0));

async function seal(env: Env, plain: string): Promise<string> {
	const iv = crypto.getRandomValues(new Uint8Array(12));
	const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, await cipherKey(env), new TextEncoder().encode(plain));
	return `${toB64(iv)}.${toB64(new Uint8Array(data))}`;
}

async function unseal(env: Env, sealed: string): Promise<string> {
	const [iv, data] = sealed.split('.');
	const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, await cipherKey(env), fromB64(data));
	return new TextDecoder().decode(plain);
}

async function sign(env: Env, text: string): Promise<string> {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(`meta-state:${env.JWT_SECRET}`), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	return toB64(new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(text)))).replace(/[+/=]/g, '');
}

const redirectUri = (env: Env): string => `https://${env.CUSTOM_DOMAIN}/api/meta/callback`;

export async function connectUrl(env: Env, userId: string): Promise<string> {
	if (!metaConfigured(env)) throw new Error('Meta is not set up on this platform yet');
	const stamp = `${userId}.${Date.now()}`;
	const state = `${stamp}.${await sign(env, stamp)}`;
	const url = new URL('https://www.facebook.com/v21.0/dialog/oauth');
	url.searchParams.set('client_id', config(env).META_APP_ID as string);
	url.searchParams.set('redirect_uri', redirectUri(env));
	url.searchParams.set('state', state);
	url.searchParams.set('scope', SCOPES.join(','));
	return url.toString();
}

async function graph<T>(url: string, init?: RequestInit): Promise<T> {
	const res = await fetch(url, init);
	const body = (await res.json()) as T & GraphError;
	if (!res.ok || body.error) throw new Error(body.error?.message ?? `Meta answered ${res.status}`);
	return body;
}

interface AccountsResponse {
	data: Array<{ id: string; name: string; access_token: string; instagram_business_account?: { id: string; username?: string } }>;
}

/** Finishes the sign-in: swaps the code for a long-lived token and saves the first Page (preferring one with Instagram). */
export async function completeConnect(env: Env, code: string, state: string): Promise<void> {
	const parts = state.split('.');
	if (parts.length !== 3) throw new Error('Invalid sign-in state');
	const [userId, issued, signature] = parts;
	if (signature !== (await sign(env, `${userId}.${issued}`))) throw new Error('Invalid sign-in state');
	if (Date.now() - Number(issued) > 15 * 60 * 1000) throw new Error('The sign-in took too long. Please try again.');

	const base = new URL(`${GRAPH}/oauth/access_token`);
	base.searchParams.set('client_id', config(env).META_APP_ID as string);
	base.searchParams.set('client_secret', config(env).META_APP_SECRET as string);
	base.searchParams.set('redirect_uri', redirectUri(env));
	base.searchParams.set('code', code);
	const short = await graph<{ access_token: string }>(base.toString());

	const long = new URL(`${GRAPH}/oauth/access_token`);
	long.searchParams.set('grant_type', 'fb_exchange_token');
	long.searchParams.set('client_id', config(env).META_APP_ID as string);
	long.searchParams.set('client_secret', config(env).META_APP_SECRET as string);
	long.searchParams.set('fb_exchange_token', short.access_token);
	const user = await graph<{ access_token: string }>(long.toString());

	const accounts = new URL(`${GRAPH}/me/accounts`);
	accounts.searchParams.set('fields', 'id,name,access_token,instagram_business_account{id,username}');
	accounts.searchParams.set('access_token', user.access_token);
	const pages = (await graph<AccountsResponse>(accounts.toString())).data;
	const page = pages.find((p) => p.instagram_business_account) ?? pages[0];
	if (!page) throw new Error('No Facebook Page found on that account. Create a Page first, then connect again.');

	await ensureTables(env);
	await env.DB.prepare(
		'INSERT OR REPLACE INTO meta_connections (user_id, page_id, page_name, page_token, ig_id, ig_name, connected_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)',
	)
		.bind(userId, page.id, page.name, await seal(env, page.access_token), page.instagram_business_account?.id ?? null, page.instagram_business_account?.username ?? null, Date.now())
		.run();
}

export async function disconnect(env: Env, userId: string): Promise<void> {
	await ensureTables(env);
	await env.DB.prepare('DELETE FROM meta_connections WHERE user_id = ?1').bind(userId).run();
}

const toRow = (r: PostRecord): MetaPostRow => ({
	id: r.id,
	appId: r.app_id,
	target: r.target,
	message: r.message,
	hasImage: Boolean(r.media_key),
	status: r.status,
	scheduledAt: r.scheduled_at,
	publishedAt: r.published_at,
	error: r.error,
});

export async function getStatus(env: Env, userId: string): Promise<MetaStatus> {
	await ensureTables(env);
	const conn = await env.DB.prepare('SELECT page_name, ig_name FROM meta_connections WHERE user_id = ?1').bind(userId).first<{ page_name: string; ig_name: string | null }>();
	const posts = await env.DB.prepare('SELECT * FROM meta_posts WHERE user_id = ?1 ORDER BY COALESCE(scheduled_at, published_at, created_at) DESC LIMIT 20').bind(userId).all<PostRecord>();
	return {
		configured: metaConfigured(env),
		connected: Boolean(conn),
		pageName: conn?.page_name ?? null,
		instagramName: conn?.ig_name ?? null,
		posts: posts.results.map(toRow),
	};
}

const DATA_URL = /^data:image\/(jpeg|png);base64,([A-Za-z0-9+/=]+)$/;

async function storeImage(env: Env, dataUrl: string): Promise<string> {
	const match = DATA_URL.exec(dataUrl);
	if (!match) throw new Error('The picture could not be read');
	const bytes = fromB64(match[2]);
	if (bytes.byteLength > 8 * 1024 * 1024) throw new Error('The picture is too large');
	const key = `${crypto.randomUUID()}.${match[1] === 'png' ? 'png' : 'jpg'}`;
	await env.VibecoderStore.put(`meta-media:${key}`, bytes, { expirationTtl: MEDIA_TTL_SECONDS, metadata: { type: `image/${match[1]}` } });
	return key;
}

export async function readMedia(env: Env, key: string): Promise<{ body: ArrayBuffer; type: string } | null> {
	if (!/^[0-9a-f-]{36}\.(jpg|png)$/.test(key)) return null;
	const found = await env.VibecoderStore.getWithMetadata<{ type?: string }>(`meta-media:${key}`, 'arrayBuffer');
	if (!found.value) return null;
	return { body: found.value, type: found.metadata?.type ?? 'image/jpeg' };
}

export interface NewPost {
	appId: string;
	message: string;
	image?: string;
	target: MetaTarget;
	scheduleAt?: number;
}

export async function createPost(env: Env, userId: string, input: NewPost): Promise<MetaPostRow> {
	await ensureTables(env);
	const conn = await env.DB.prepare('SELECT ig_id FROM meta_connections WHERE user_id = ?1').bind(userId).first<{ ig_id: string | null }>();
	if (!conn) throw new Error('Connect your Facebook Page first');
	const message = input.message.trim();
	if (message.length < 2) throw new Error('Write the post text first');
	if (message.length > 2200) throw new Error('The post is too long');
	if (input.target !== 'facebook' && !input.image) throw new Error('Instagram posts need a picture');
	if (input.target !== 'facebook' && !conn.ig_id) throw new Error('No Instagram business account is linked to your Page');
	const now = Date.now();
	if (input.scheduleAt !== undefined) {
		if (input.scheduleAt < now + 5 * 60 * 1000) throw new Error('Pick a time at least 5 minutes from now');
		if (input.scheduleAt > now + MAX_SCHEDULE_MS) throw new Error('You can schedule up to 4 weeks ahead');
	}
	const mediaKey = input.image ? await storeImage(env, input.image) : null;
	const id = crypto.randomUUID();
	const status: MetaPostRow['status'] = input.scheduleAt ? 'scheduled' : 'publishing';
	await env.DB.prepare(
		'INSERT INTO meta_posts (id, user_id, app_id, target, message, media_key, status, scheduled_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)',
	)
		.bind(id, userId, input.appId, input.target, message, mediaKey, status, input.scheduleAt ?? null, now)
		.run();
	if (!input.scheduleAt) await publish(env, id);
	const row = await env.DB.prepare('SELECT * FROM meta_posts WHERE id = ?1').bind(id).first<PostRecord>();
	return toRow(row as PostRecord);
}

export async function cancelPost(env: Env, userId: string, id: string): Promise<void> {
	await ensureTables(env);
	await env.DB.prepare("UPDATE meta_posts SET status = 'cancelled' WHERE id = ?1 AND user_id = ?2 AND status = 'scheduled'").bind(id, userId).run();
}

async function publishToFacebook(pageId: string, token: string, message: string, imageUrl: string | null): Promise<void> {
	const body = new URLSearchParams({ access_token: token });
	if (imageUrl) {
		body.set('url', imageUrl);
		body.set('caption', message);
		await graph(`${GRAPH}/${pageId}/photos`, { method: 'POST', body });
	} else {
		body.set('message', message);
		await graph(`${GRAPH}/${pageId}/feed`, { method: 'POST', body });
	}
}

async function publishToInstagram(igId: string, token: string, message: string, imageUrl: string): Promise<void> {
	const create = await graph<{ id: string }>(`${GRAPH}/${igId}/media`, {
		method: 'POST',
		body: new URLSearchParams({ image_url: imageUrl, caption: message, access_token: token }),
	});
	// Instagram prepares the picture first; wait until it says it is ready.
	for (let i = 0; i < 10; i += 1) {
		const state = await graph<{ status_code?: string }>(`${GRAPH}/${create.id}?fields=status_code&access_token=${encodeURIComponent(token)}`);
		if (state.status_code === 'FINISHED') break;
		if (state.status_code === 'ERROR' || state.status_code === 'EXPIRED') throw new Error('Instagram could not process the picture');
		await new Promise((resolve) => setTimeout(resolve, 1500));
	}
	await graph(`${GRAPH}/${igId}/media_publish`, { method: 'POST', body: new URLSearchParams({ creation_id: create.id, access_token: token }) });
}

/** Sends one stored post. The status moves to posted or failed; a failure keeps the reason. */
async function publish(env: Env, id: string): Promise<void> {
	const post = await env.DB.prepare('SELECT * FROM meta_posts WHERE id = ?1').bind(id).first<PostRecord>();
	if (!post) return;
	const conn = await env.DB.prepare('SELECT * FROM meta_connections WHERE user_id = ?1').bind(post.user_id).first<ConnectionRow>();
	try {
		if (!conn) throw new Error('Your Facebook Page is not connected any more');
		const token = await unseal(env, conn.page_token);
		const imageUrl = post.media_key ? `https://${env.CUSTOM_DOMAIN}/api/meta/media/${post.media_key}` : null;
		if (post.target !== 'instagram') await publishToFacebook(conn.page_id, token, post.message, imageUrl);
		if (post.target !== 'facebook') {
			if (!conn.ig_id || !imageUrl) throw new Error('Instagram needs a linked account and a picture');
			await publishToInstagram(conn.ig_id, token, post.message, imageUrl);
		}
		await env.DB.prepare("UPDATE meta_posts SET status = 'posted', published_at = ?2, error = NULL WHERE id = ?1").bind(id, Date.now()).run();
	} catch (error) {
		const reason = error instanceof Error ? error.message.slice(0, 300) : 'Meta refused the post';
		await env.DB.prepare("UPDATE meta_posts SET status = 'failed', error = ?2 WHERE id = ?1").bind(id, reason).run();
	}
}

/** Cron entry: claims and sends every scheduled post that is due. */
export async function sendDuePosts(env: Env): Promise<void> {
	await ensureTables(env);
	const due = await env.DB.prepare("SELECT id FROM meta_posts WHERE status = 'scheduled' AND scheduled_at <= ?1 LIMIT 20").bind(Date.now()).all<{ id: string }>();
	for (const { id } of due.results) {
		const claimed = await env.DB.prepare("UPDATE meta_posts SET status = 'publishing' WHERE id = ?1 AND status = 'scheduled'").bind(id).run();
		if (claimed.meta.changes > 0) await publish(env, id);
	}
}
