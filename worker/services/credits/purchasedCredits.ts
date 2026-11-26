// Credits, credit packs and subscription plans (Razorpay).
// Tables are created on first use, so no migration step is needed.

type Vars = Record<string, string | undefined>;
const vars = (env: Env) => env as unknown as Vars;

/* ===================== credit packs (one-time top-ups) ===================== */

export interface CreditPack {
	id: string;
	label: string;
	credits: number;
	priceInr: number;
}

export function getPacks(env: Env): CreditPack[] {
	try {
		const raw = vars(env).CREDIT_PACKS;
		if (!raw) return [];
		const list = JSON.parse(raw) as Array<{ id: string; label?: string; credits: number; price_inr: number }>;
		return list
			.filter((p) => p.id && p.credits > 0 && p.price_inr > 0)
			.map((p) => ({ id: p.id, label: p.label ?? p.id, credits: Math.floor(p.credits), priceInr: p.price_inr }));
	} catch {
		return [];
	}
}

/* ===================== subscription plans ===================== */

export type PaidPlanId = 'basic' | 'louie' | 'jack' | 'pro';
export type PlanId = 'free' | PaidPlanId;
export type AgentId = 'caesar' | 'louie' | 'jack';

export interface PlanInfo {
	id: PaidPlanId;
	name: string;
	priceInr: number; // shown to the user; the real price is the one on the Razorpay plan
	monthlyCredits: number; // added to the user's credits every time a monthly payment succeeds
	maxLiveSites: number;
	agents: AgentId[]; // which of the troop this plan switches on
	available: boolean; // true once the Razorpay plan id is set
}

function num(v: string | undefined, fallback: number): number {
	const n = Number(v);
	return v !== undefined && v !== '' && Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
}

// Change these numbers from the Cloudflare dashboard (Variables), no code needed:
// PLAN_PRICE_<X>, PLAN_CREDITS_<X>, PLAN_SITES_<X>, RAZORPAY_PLAN_<X> where <X> is BASIC (Caesar), LOUIE, JACK or PRO (all three).
export function getPaidPlans(env: Env): PlanInfo[] {
	const v = vars(env);
	return [
		{ id: 'basic', name: 'Caesar', priceInr: num(v.PLAN_PRICE_BASIC, 1999), monthlyCredits: num(v.PLAN_CREDITS_BASIC, 1500), maxLiveSites: num(v.PLAN_SITES_BASIC, 3), agents: ['caesar'], available: !!v.RAZORPAY_PLAN_BASIC },
		{ id: 'louie', name: 'Louie', priceInr: num(v.PLAN_PRICE_LOUIE, 2999), monthlyCredits: num(v.PLAN_CREDITS_LOUIE, 0), maxLiveSites: 0, agents: ['louie'], available: !!v.RAZORPAY_PLAN_LOUIE },
		{ id: 'jack', name: 'Jack', priceInr: num(v.PLAN_PRICE_JACK, 2499), monthlyCredits: num(v.PLAN_CREDITS_JACK, 0), maxLiveSites: 0, agents: ['jack'], available: !!v.RAZORPAY_PLAN_JACK },
		{ id: 'pro', name: 'Pro: all three', priceInr: num(v.PLAN_PRICE_PRO, 6999), monthlyCredits: num(v.PLAN_CREDITS_PRO, 6000), maxLiveSites: num(v.PLAN_SITES_PRO, 3), agents: ['caesar', 'louie', 'jack'], available: !!v.RAZORPAY_PLAN_PRO },
	];
}

function planById(env: Env, id: string): PlanInfo | undefined {
	return getPaidPlans(env).find((p) => p.id === id);
}

function razorpayPlanId(env: Env, id: PaidPlanId): string | undefined {
	const v = vars(env);
	const ids: Record<PaidPlanId, string | undefined> = {
		basic: v.RAZORPAY_PLAN_BASIC,
		louie: v.RAZORPAY_PLAN_LOUIE,
		jack: v.RAZORPAY_PLAN_JACK,
		pro: v.RAZORPAY_PLAN_PRO,
	};
	return ids[id];
}

/* ===================== storage ===================== */

let tablesReady = false;
async function ensureTables(env: Env): Promise<void> {
	if (tablesReady) return;
	await env.DB.batch([
		env.DB.prepare('CREATE TABLE IF NOT EXISTS credit_balances (user_id TEXT PRIMARY KEY, balance INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)'),
		env.DB.prepare('CREATE TABLE IF NOT EXISTS credit_payments (razorpay_payment_id TEXT PRIMARY KEY, razorpay_order_id TEXT NOT NULL, user_id TEXT NOT NULL, pack_id TEXT NOT NULL, credits INTEGER NOT NULL, amount_paise INTEGER NOT NULL, created_at INTEGER NOT NULL)'),
		env.DB.prepare('CREATE TABLE IF NOT EXISTS user_plans (user_id TEXT PRIMARY KEY, plan TEXT NOT NULL, status TEXT NOT NULL, razorpay_subscription_id TEXT, current_period_end INTEGER, updated_at INTEGER NOT NULL)'),
		env.DB.prepare('CREATE TABLE IF NOT EXISTS user_subs (user_id TEXT NOT NULL, plan TEXT NOT NULL, status TEXT NOT NULL, razorpay_subscription_id TEXT, current_period_end INTEGER, updated_at INTEGER NOT NULL, PRIMARY KEY (user_id, plan))'),
		env.DB.prepare('INSERT OR IGNORE INTO user_subs (user_id, plan, status, razorpay_subscription_id, current_period_end, updated_at) SELECT user_id, plan, status, razorpay_subscription_id, current_period_end, updated_at FROM user_plans'),
	]);
	tablesReady = true;
}

export async function getPurchasedBalance(env: Env, userId: string): Promise<number> {
	try {
		await ensureTables(env);
		const row = await env.DB.prepare('SELECT balance FROM credit_balances WHERE user_id = ?1').bind(userId).first<{ balance: number }>();
		return row?.balance ?? 0;
	} catch (e) {
		console.error('getPurchasedBalance failed', e);
		return 0;
	}
}

// Spends paid credits atomically. Returns true only if the full amount was available.
export async function trySpendPurchased(env: Env, userId: string, amount: number): Promise<boolean> {
	try {
		await ensureTables(env);
		const cost = Math.ceil(amount);
		const res = await env.DB
			.prepare('UPDATE credit_balances SET balance = balance - ?1, updated_at = ?2 WHERE user_id = ?3 AND balance >= ?1')
			.bind(cost, Date.now(), userId)
			.run();
		return (res.meta?.changes ?? 0) === 1;
	} catch (e) {
		console.error('trySpendPurchased failed', e);
		return false;
	}
}

// Adds credits once per payment id. A repeated webhook for the same payment adds nothing.
async function addCredits(
	env: Env,
	p: { paymentId: string; orderId: string; userId: string; packId: string; credits: number; amountPaise: number },
): Promise<'added' | 'duplicate'> {
	await ensureTables(env);
	const now = Date.now();
	try {
		await env.DB.batch([
			env.DB
				.prepare('INSERT INTO credit_payments (razorpay_payment_id, razorpay_order_id, user_id, pack_id, credits, amount_paise, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7)')
				.bind(p.paymentId, p.orderId, p.userId, p.packId, p.credits, p.amountPaise, now),
			env.DB
				.prepare('INSERT INTO credit_balances (user_id, balance, updated_at) VALUES (?1, ?2, ?3) ON CONFLICT(user_id) DO UPDATE SET balance = balance + ?2, updated_at = ?3')
				.bind(p.userId, p.credits, now),
		]);
		return 'added';
	} catch (e) {
		if (/UNIQUE|constraint/i.test(e instanceof Error ? e.message : '')) return 'duplicate';
		throw e;
	}
}

export interface UserSub {
	plan: PaidPlanId;
	status: 'active' | 'cancelling';
	subscriptionId: string | null;
	periodEnd: number | null;
}

export interface UserPlan {
	plan: PlanId; // the biggest plan the user has, for labels
	status: 'none' | 'active' | 'cancelling';
	subscriptionId: string | null;
	periodEnd: number | null;
}

const PLAN_RANK: PaidPlanId[] = ['pro', 'basic', 'louie', 'jack'];

// Every plan the user pays for. Louie and Jack can be taken on their own, so there can be several.
export async function getUserSubs(env: Env, userId: string): Promise<UserSub[]> {
	try {
		await ensureTables(env);
		const { results } = await env.DB
			.prepare("SELECT plan, status, razorpay_subscription_id AS sid, current_period_end AS pe FROM user_subs WHERE user_id = ?1 AND status IN ('active', 'cancelling')")
			.bind(userId)
			.all<{ plan: string; status: string; sid: string | null; pe: number | null }>();
		const subs: UserSub[] = [];
		for (const r of results) {
			const plan = PLAN_RANK.find((id) => id === r.plan);
			if (plan && (r.status === 'active' || r.status === 'cancelling')) {
				subs.push({ plan, status: r.status, subscriptionId: r.sid, periodEnd: r.pe });
			}
		}
		return subs.sort((x, y) => PLAN_RANK.indexOf(x.plan) - PLAN_RANK.indexOf(y.plan));
	} catch (e) {
		console.error('getUserSubs failed', e);
		return [];
	}
}

export async function getUserPlan(env: Env, userId: string): Promise<UserPlan> {
	const top = (await getUserSubs(env, userId))[0];
	if (!top) return { plan: 'free', status: 'none', subscriptionId: null, periodEnd: null };
	return { plan: top.plan, status: top.status, subscriptionId: top.subscriptionId, periodEnd: top.periodEnd };
}

// Which of the troop the user has paid for (Caesar also works on free daily credits).
export async function getAgentAccess(env: Env, userId: string): Promise<Record<AgentId, boolean>> {
	const access: Record<AgentId, boolean> = { caesar: false, louie: false, jack: false };
	for (const sub of await getUserSubs(env, userId)) {
		for (const agent of planById(env, sub.plan)?.agents ?? []) access[agent] = true;
	}
	return access;
}

// How many websites this user may keep live (0 on the free plan).
export async function getMaxLiveSites(env: Env, userId: string): Promise<number> {
	let best = num(vars(env).PLAN_SITES_FREE, 0);
	for (const sub of await getUserSubs(env, userId)) {
		best = Math.max(best, planById(env, sub.plan)?.maxLiveSites ?? 0);
	}
	return best;
}

async function saveActivePlan(env: Env, p: { userId: string; plan: PaidPlanId; subscriptionId: string; periodEnd: number | null }): Promise<void> {
	await ensureTables(env);
	await env.DB
		.prepare(
			"INSERT INTO user_subs (user_id, plan, status, razorpay_subscription_id, current_period_end, updated_at) VALUES (?1, ?2, 'active', ?3, ?4, ?5) " +
				"ON CONFLICT(user_id, plan) DO UPDATE SET status = CASE WHEN razorpay_subscription_id = ?3 AND status = 'cancelling' THEN 'cancelling' ELSE 'active' END, razorpay_subscription_id = ?3, current_period_end = ?4, updated_at = ?5",
		)
		.bind(p.userId, p.plan, p.subscriptionId, p.periodEnd, Date.now())
		.run();
}

async function endPlanBySubscription(env: Env, subscriptionId: string): Promise<void> {
	await ensureTables(env);
	await env.DB
		.prepare("UPDATE user_subs SET status = 'inactive', updated_at = ?2 WHERE razorpay_subscription_id = ?1")
		.bind(subscriptionId, Date.now())
		.run();
}

/* ===================== Razorpay calls ===================== */

function authHeader(env: Env): { header: string; keyId: string } {
	const v = vars(env);
	if (!v.RAZORPAY_KEY_ID || !v.RAZORPAY_KEY_SECRET) throw new Error('Payments are not configured');
	return { header: 'Basic ' + btoa(`${v.RAZORPAY_KEY_ID}:${v.RAZORPAY_KEY_SECRET}`), keyId: v.RAZORPAY_KEY_ID };
}

export async function createRazorpayOrder(env: Env, userId: string, pack: CreditPack) {
	const { header, keyId } = authHeader(env);
	const res = await fetch('https://api.razorpay.com/v1/orders', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: header },
		body: JSON.stringify({
			amount: Math.round(pack.priceInr * 100),
			currency: 'INR',
			receipt: `cr_${Date.now()}`,
			notes: { user_id: userId, pack_id: pack.id, credits: String(pack.credits) },
		}),
	});
	if (!res.ok) throw new Error(`Razorpay order failed (${res.status})`);
	const order = (await res.json()) as { id: string; amount: number; currency: string };
	return { orderId: order.id, amount: order.amount, currency: order.currency, keyId };
}

export async function createRazorpaySubscription(env: Env, userId: string, planId: string): Promise<{ subscriptionId: string; keyId: string; plan: PaidPlanId }> {
	const plan = planById(env, planId);
	if (!plan) throw new Error('Unknown plan');
	const rzpPlan = razorpayPlanId(env, plan.id);
	if (!rzpPlan) throw new Error('This plan is not available yet');
	const subs = await getUserSubs(env, userId);
	if (subs.some((x) => x.plan === plan.id)) throw new Error('You are already on this plan');
	const covered = subs.some((x) => plan.agents.every((a) => planById(env, x.plan)?.agents.includes(a)));
	if (covered) throw new Error('You already have this with another plan');
	const { header, keyId } = authHeader(env);
	const res = await fetch('https://api.razorpay.com/v1/subscriptions', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: header },
		body: JSON.stringify({
			plan_id: rzpPlan,
			total_count: 120, // up to 10 years of monthly billing; the user can cancel any time
			quantity: 1,
			customer_notify: 1,
			notes: { user_id: userId, plan: plan.id },
		}),
	});
	if (!res.ok) throw new Error(`Razorpay subscription failed (${res.status})`);
	const sub = (await res.json()) as { id: string };
	return { subscriptionId: sub.id, keyId, plan: plan.id };
}

// Stops renewals of one plan at the end of the period the user already paid for.
export async function cancelUserSubscription(env: Env, userId: string, planId: string): Promise<'cancelling' | 'nothing'> {
	const sub = (await getUserSubs(env, userId)).find((x) => x.plan === planId);
	if (!sub || !sub.subscriptionId) return 'nothing';
	const { header } = authHeader(env);
	const res = await fetch(`https://api.razorpay.com/v1/subscriptions/${encodeURIComponent(sub.subscriptionId)}/cancel`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json', Authorization: header },
		body: JSON.stringify({ cancel_at_cycle_end: 1 }),
	});
	if (!res.ok) throw new Error(`Razorpay cancel failed (${res.status})`);
	await ensureTables(env);
	await env.DB.prepare("UPDATE user_subs SET status = 'cancelling', updated_at = ?3 WHERE user_id = ?1 AND plan = ?2").bind(userId, sub.plan, Date.now()).run();
	return 'cancelling';
}

export interface BillingStatus {
	plan: PlanId;
	status: UserPlan['status'];
	periodEnd: number | null;
	subscriptions: UserSub[];
	access: Record<AgentId, boolean>;
	balance: number;
	plans: PlanInfo[];
	packs: CreditPack[];
}

export async function getBillingStatus(env: Env, userId: string): Promise<BillingStatus> {
	const [subs, balance] = await Promise.all([getUserSubs(env, userId), getPurchasedBalance(env, userId)]);
	const top = subs[0];
	const access: Record<AgentId, boolean> = { caesar: false, louie: false, jack: false };
	for (const sub of subs) {
		for (const agent of planById(env, sub.plan)?.agents ?? []) access[agent] = true;
	}
	return {
		plan: top?.plan ?? 'free',
		status: top?.status ?? 'none',
		periodEnd: top?.periodEnd ?? null,
		subscriptions: subs,
		access,
		balance,
		plans: getPaidPlans(env),
		packs: getPacks(env),
	};
}

/* ===================== webhook ===================== */

async function signatureValid(body: string, signature: string, secret: string): Promise<boolean> {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
	const expected = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
	if (expected.length !== signature.length) return false;
	let diff = 0;
	for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
	return diff === 0;
}

const ENDING_EVENTS = ['subscription.cancelled', 'subscription.halted', 'subscription.completed', 'subscription.expired'];

// Razorpay calls this after payments and subscription changes. It must run before the app's CSRF check.
export async function handleRazorpayWebhook(env: Env, request: Request): Promise<Response> {
	const secret = vars(env).RAZORPAY_WEBHOOK_SECRET;
	if (!secret) return new Response('not configured', { status: 503 });

	const body = await request.text();
	const signature = request.headers.get('x-razorpay-signature') || '';
	if (!(await signatureValid(body, signature, secret))) return new Response('bad signature', { status: 400 });

	try {
		const event = JSON.parse(body);
		const type: string = event.event;

		// one-time credit packs
		if (type === 'payment.captured') {
			const pay = event.payload?.payment?.entity;
			const credits = Number(pay?.notes?.credits);
			if (!pay?.id || !pay?.notes?.user_id || !Number.isInteger(credits) || credits <= 0 || credits > 100000) {
				return new Response('ignored', { status: 200 }); // e.g. a subscription payment: handled below
			}
			await addCredits(env, {
				paymentId: pay.id,
				orderId: pay.order_id ?? '',
				userId: pay.notes.user_id,
				packId: String(pay.notes.pack_id ?? ''),
				credits,
				amountPaise: Number(pay.amount) || 0,
			});
			return new Response('ok', { status: 200 });
		}

		// subscriptions: switch the plan on, and add the month's credits once per payment
		if (type === 'subscription.activated' || type === 'subscription.charged') {
			const sub = event.payload?.subscription?.entity;
			const userId = sub?.notes?.user_id;
			const planId = sub?.notes?.plan;
			const plan = planById(env, String(planId));
			if (!sub?.id || !userId || !plan) return new Response('ignored', { status: 200 });
			const periodEnd = Number(sub.current_end) > 0 ? Number(sub.current_end) * 1000 : null;
			await saveActivePlan(env, { userId, plan: plan.id, subscriptionId: sub.id, periodEnd });
			if (type === 'subscription.charged') {
				const pay = event.payload?.payment?.entity;
				if (pay?.id && plan.monthlyCredits > 0) {
					await addCredits(env, {
						paymentId: pay.id,
						orderId: sub.id,
						userId,
						packId: 'plan:' + plan.id,
						credits: plan.monthlyCredits,
						amountPaise: Number(pay.amount) || 0,
					});
				}
			}
			return new Response('ok', { status: 200 });
		}

		// subscriptions ending: back to the free plan (credits already paid for stay)
		if (ENDING_EVENTS.includes(type)) {
			const sub = event.payload?.subscription?.entity;
			if (sub?.id) await endPlanBySubscription(env, sub.id);
			return new Response('ok', { status: 200 });
		}

		return new Response('ignored', { status: 200 });
	} catch (e) {
		console.error('razorpay webhook failed', e);
		return new Response('error', { status: 500 }); // Razorpay will retry
	}
}
