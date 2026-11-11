// Purchased credits: Razorpay credit packs that top up the free daily allowance.
// Tables are created on first use, so no migration step is needed.

type Vars = Record<string, string | undefined>;
const vars = (env: Env) => env as unknown as Vars;

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

let tablesReady = false;
async function ensureTables(env: Env): Promise<void> {
	if (tablesReady) return;
	await env.DB.batch([
		env.DB.prepare('CREATE TABLE IF NOT EXISTS credit_balances (user_id TEXT PRIMARY KEY, balance INTEGER NOT NULL DEFAULT 0, updated_at INTEGER NOT NULL)'),
		env.DB.prepare('CREATE TABLE IF NOT EXISTS credit_payments (razorpay_payment_id TEXT PRIMARY KEY, razorpay_order_id TEXT NOT NULL, user_id TEXT NOT NULL, pack_id TEXT NOT NULL, credits INTEGER NOT NULL, amount_paise INTEGER NOT NULL, created_at INTEGER NOT NULL)'),
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

export async function createRazorpayOrder(env: Env, userId: string, pack: CreditPack) {
	const v = vars(env);
	if (!v.RAZORPAY_KEY_ID || !v.RAZORPAY_KEY_SECRET) throw new Error('Payments are not configured');
	const res = await fetch('https://api.razorpay.com/v1/orders', {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			Authorization: 'Basic ' + btoa(`${v.RAZORPAY_KEY_ID}:${v.RAZORPAY_KEY_SECRET}`),
		},
		body: JSON.stringify({
			amount: Math.round(pack.priceInr * 100),
			currency: 'INR',
			receipt: `cr_${Date.now()}`,
			notes: { user_id: userId, pack_id: pack.id, credits: String(pack.credits) },
		}),
	});
	if (!res.ok) throw new Error(`Razorpay order failed (${res.status})`);
	const order = (await res.json()) as { id: string; amount: number; currency: string };
	return { orderId: order.id, amount: order.amount, currency: order.currency, keyId: v.RAZORPAY_KEY_ID };
}

async function signatureValid(body: string, signature: string, secret: string): Promise<boolean> {
	const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body));
	const expected = [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, '0')).join('');
	if (expected.length !== signature.length) return false;
	let diff = 0;
	for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
	return diff === 0;
}

// Razorpay calls this after a payment. It must run before the app's CSRF check.
export async function handleRazorpayWebhook(env: Env, request: Request): Promise<Response> {
	const secret = vars(env).RAZORPAY_WEBHOOK_SECRET;
	if (!secret) return new Response('not configured', { status: 503 });

	const body = await request.text();
	const signature = request.headers.get('x-razorpay-signature') || '';
	if (!(await signatureValid(body, signature, secret))) return new Response('bad signature', { status: 400 });

	try {
		const event = JSON.parse(body);
		if (event.event !== 'payment.captured') return new Response('ignored', { status: 200 });
		const pay = event.payload?.payment?.entity;
		const credits = Number(pay?.notes?.credits);
		if (!pay?.id || !pay?.notes?.user_id || !Number.isInteger(credits) || credits <= 0 || credits > 100000) {
			return new Response('ignored', { status: 200 });
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
	} catch (e) {
		console.error('razorpay webhook failed', e);
		return new Response('error', { status: 500 }); // Razorpay will retry
	}
}
