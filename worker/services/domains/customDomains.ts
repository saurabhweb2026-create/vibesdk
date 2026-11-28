import { getOwnedSite } from '../troop/troopStore';

// Custom domains for the websites people build. Uses Cloudflare custom hostnames on the platform zone.

export interface DomainRecord {
	type: 'CNAME' | 'TXT';
	name: string;
	value: string;
}

export interface DomainState {
	hostname: string;
	status: 'pending' | 'active' | 'failed';
	records: DomainRecord[];
	note: string;
}

interface CfHostname {
	id: string;
	hostname: string;
	status: string;
	ssl?: { status?: string; validation_records?: Array<{ txt_name?: string; txt_value?: string }> };
	ownership_verification?: { type?: string; name?: string; value?: string };
	verification_errors?: string[];
}

interface CfEnvelope<T> {
	success: boolean;
	result: T;
	errors?: Array<{ message?: string }>;
}

let tablesReady = false;

async function ensureTables(env: Env): Promise<void> {
	if (tablesReady) return;
	await env.DB.prepare(
		'CREATE TABLE IF NOT EXISTS app_domains (hostname TEXT PRIMARY KEY, app_id TEXT NOT NULL, user_id TEXT NOT NULL, cf_id TEXT, status TEXT NOT NULL, created_at INTEGER NOT NULL)',
	).run();
	await env.DB.prepare('CREATE INDEX IF NOT EXISTS app_domains_app ON app_domains (app_id)').run();
	tablesReady = true;
}

const HOSTNAME_PATTERN = /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,24}$/;

export function normalizeHostname(input: string): string {
	return input.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/.*$/, '');
}

async function cf<T>(env: Env, path: string, init: RequestInit = {}): Promise<T> {
	const res = await fetch(`https://api.cloudflare.com/client/v4${path}`, {
		...init,
		headers: { authorization: `Bearer ${env.CLOUDFLARE_API_TOKEN}`, 'content-type': 'application/json', ...(init.headers ?? {}) },
	});
	const body = (await res.json()) as CfEnvelope<T>;
	if (!res.ok || !body.success) {
		throw new Error(body.errors?.[0]?.message ?? `Cloudflare answered ${res.status}`);
	}
	return body.result;
}

async function platformZoneId(env: Env): Promise<string> {
	const configured = (env as unknown as Record<string, string | undefined>).CUSTOM_HOSTNAMES_ZONE_ID;
	if (configured) return configured;
	const zones = await cf<Array<{ id: string }>>(env, `/zones?name=${encodeURIComponent(env.CUSTOM_DOMAIN)}`);
	if (!zones[0]) throw new Error('The platform domain was not found in Cloudflare');
	return zones[0].id;
}

function toState(row: { hostname: string; status: string }, h: CfHostname | null, env: Env): DomainState {
	const records: DomainRecord[] = [{ type: 'CNAME', name: row.hostname, value: env.CUSTOM_DOMAIN }];
	if (h?.ownership_verification?.name && h.ownership_verification.value) {
		records.push({ type: 'TXT', name: h.ownership_verification.name, value: h.ownership_verification.value });
	}
	for (const r of h?.ssl?.validation_records ?? []) {
		if (r.txt_name && r.txt_value) records.push({ type: 'TXT', name: r.txt_name, value: r.txt_value });
	}
	const active = h?.status === 'active' && h.ssl?.status === 'active';
	const failed = h?.status === 'blocked' || h?.status === 'deleted';
	return {
		hostname: row.hostname,
		status: active ? 'active' : failed ? 'failed' : 'pending',
		records: active ? [] : records,
		note: active ? 'Your domain is live.' : 'Add these records where you bought the domain, then press Check again. It can take a few minutes.',
	};
}

/** The connected hostname of a website, once it is active. */
export async function activeHostname(env: Env, userId: string, appId: string): Promise<string | null> {
	await ensureTables(env);
	const row = await env.DB.prepare("SELECT hostname FROM app_domains WHERE app_id = ?1 AND user_id = ?2 AND status = 'active'").bind(appId, userId).first<{ hostname: string }>();
	return row?.hostname ?? null;
}

export async function getDomain(env: Env, userId: string, appId: string, refresh = true): Promise<DomainState | null> {
	await ensureTables(env);
	const row = await env.DB.prepare('SELECT hostname, cf_id, status FROM app_domains WHERE app_id = ?1 AND user_id = ?2').bind(appId, userId).first<{ hostname: string; cf_id: string | null; status: string }>();
	if (!row) return null;
	if (!row.cf_id) return toState(row, null, env);
	const zone = await platformZoneId(env);
	const h = await cf<CfHostname>(env, `/zones/${zone}/custom_hostnames/${row.cf_id}`);
	const state = toState(row, h, env);
	if (refresh && state.status !== row.status) {
		await env.DB.prepare('UPDATE app_domains SET status = ?1 WHERE hostname = ?2').bind(state.status, row.hostname).run();
	}
	return state;
}

export async function connectDomain(env: Env, userId: string, appId: string, rawHostname: string): Promise<DomainState> {
	const hostname = normalizeHostname(rawHostname);
	if (!HOSTNAME_PATTERN.test(hostname)) throw new Error('Enter a domain like www.mybakery.com');
	if (hostname === env.CUSTOM_DOMAIN || hostname.endsWith(`.${env.CUSTOM_DOMAIN}`)) throw new Error('Use your own domain, not an AlwaysBro address');
	if (!(await getOwnedSite(env, userId, appId))) throw new Error('Website not found');
	await ensureTables(env);

	const taken = await env.DB.prepare('SELECT app_id FROM app_domains WHERE hostname = ?1').bind(hostname).first<{ app_id: string }>();
	if (taken && taken.app_id !== appId) throw new Error('That domain is already connected to another website');
	const mine = await env.DB.prepare('SELECT hostname, cf_id FROM app_domains WHERE app_id = ?1').bind(appId).first<{ hostname: string; cf_id: string | null }>();
	if (mine && mine.hostname !== hostname) await removeDomain(env, userId, appId);

	const zone = await platformZoneId(env);
	const created = await cf<CfHostname>(env, `/zones/${zone}/custom_hostnames`, {
		method: 'POST',
		body: JSON.stringify({ hostname, ssl: { method: 'txt', type: 'dv', settings: { min_tls_version: '1.2' } } }),
	});
	await env.DB.prepare('INSERT OR REPLACE INTO app_domains (hostname, app_id, user_id, cf_id, status, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6)').bind(hostname, appId, userId, created.id, 'pending', Date.now()).run();
	return toState({ hostname, status: 'pending' }, created, env);
}

export async function removeDomain(env: Env, userId: string, appId: string): Promise<void> {
	await ensureTables(env);
	const row = await env.DB.prepare('SELECT hostname, cf_id FROM app_domains WHERE app_id = ?1 AND user_id = ?2').bind(appId, userId).first<{ hostname: string; cf_id: string | null }>();
	if (!row) return;
	if (row.cf_id) {
		try {
			const zone = await platformZoneId(env);
			await cf<unknown>(env, `/zones/${zone}/custom_hostnames/${row.cf_id}`, { method: 'DELETE' });
		} catch (error) {
			console.error('Could not remove the custom hostname', error);
		}
	}
	await env.DB.prepare('DELETE FROM app_domains WHERE hostname = ?1').bind(row.hostname).run();
}

/** The website behind a connected domain, or null when the host is unknown or not yet active. */
export async function appForHostname(env: Env, hostname: string): Promise<string | null> {
	await ensureTables(env);
	const row = await env.DB.prepare('SELECT app_id FROM app_domains WHERE hostname = ?1 AND status = ?2').bind(hostname.toLowerCase(), 'active').first<{ app_id: string }>();
	return row?.app_id ?? null;
}
