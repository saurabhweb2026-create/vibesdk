import { useCallback, useEffect, useRef, useState } from 'react';
import { Coins } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import type { BillingStatusData, PaidPlanId } from '@/lib/api-client';
import { OrangeButton } from '@/components/shared/OrangeButton';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';

declare global {
	interface Window {
		Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
	}
}

type PaidPlan = PaidPlanId;

const PLAN_LINES: Record<PaidPlan, string[]> = {
	basic: ['Jack, the AI website builder', 'Websites live (see your limit below)', 'Monthly credits for building and editing'],
	louie: ['John writes your ads', 'Google, Facebook and Instagram ads, posts and a budget plan', 'Works on any website you built'],
	jack: ['Maria answers your customers on your website', 'Saves the customers who leave their details', 'You teach him your prices, timings and offers'],
	pro: ['Jack, John and Maria together', 'Cheaper than taking all three one by one', 'More monthly credits'],
};

const EVERY_PLAN_EXTRAS = ['Unlock looks and moods for the whole app with credits', 'Connect your own domain to your website'];

const PLAN_STYLE: Record<PaidPlan, { color: string; glow: string; tag: string }> = {
	basic: { color: '#3b82f6', glow: 'rgba(59,130,246,0.35)', tag: 'Builds websites' },
	louie: { color: '#ec4899', glow: 'rgba(236,72,153,0.35)', tag: 'Ads and posts' },
	jack: { color: '#14b8a6', glow: 'rgba(20,184,166,0.35)', tag: 'Customer chat' },
	pro: { color: '#f59e0b', glow: 'rgba(245,158,11,0.4)', tag: 'The whole crew' },
};

const PLAN_NAMES: Record<PaidPlan, string> = { basic: 'Jack', louie: 'John', jack: 'Maria', pro: 'Pro' };
const PLAN_ORDER: PaidPlan[] = ['basic', 'louie', 'jack', 'pro'];

function loadRazorpay(): Promise<boolean> {
	if (window.Razorpay) return Promise.resolve(true);
	return new Promise((resolve) => {
		const script = document.createElement('script');
		script.src = 'https://checkout.razorpay.com/v1/checkout.js';
		script.onload = () => resolve(true);
		script.onerror = () => resolve(false);
		document.body.appendChild(script);
	});
}

const rupees = (n: number) => '₹' + n.toLocaleString('en-IN');

const fail = (error: unknown, fallback: string) =>
	error instanceof Error && error.message && error.message.length < 80 ? error.message : fallback;

export function BuyCredits() {
	const { user } = useAuth();
	const userId = user?.id;
	const [open, setOpen] = useState(false);
	const [status, setStatus] = useState<BillingStatusData | null>(null);
	const [busy, setBusy] = useState<string | null>(null);
	const [message, setMessage] = useState('');
	const [highlight, setHighlight] = useState<PaidPlan | null>(null);
	const timer = useRef<number | null>(null);

	const refresh = useCallback(async (): Promise<BillingStatusData | null> => {
		try {
			const res = await apiClient.getBillingStatus();
			if (res.data) {
				setStatus(res.data);
				return res.data;
			}
		} catch {
			// the button simply shows no balance
		}
		return null;
	}, []);

	useEffect(() => {
		if (userId) void refresh();
	}, [userId, refresh]);

	// Landing page buttons open the app with ?plan=basic or ?plan=pro: show that plan straight away.
	useEffect(() => {
		if (!userId) return;
		const wanted = new URLSearchParams(window.location.search).get('plan');
		if (wanted === 'basic' || wanted === 'louie' || wanted === 'jack' || wanted === 'pro') {
			setHighlight(wanted);
			setOpen(true);
			const url = new URL(window.location.href);
			url.searchParams.delete('plan');
			window.history.replaceState(null, '', url.toString());
		}
	}, [userId]);

	useEffect(() => () => { if (timer.current) window.clearInterval(timer.current); }, []);

	if (!user) return null;

	const waitFor = (check: (s: BillingStatusData) => boolean, done: string) => {
		let tries = 0;
		if (timer.current) window.clearInterval(timer.current);
		timer.current = window.setInterval(async () => {
			tries += 1;
			const s = await refresh();
			if (s && check(s)) {
				if (timer.current) window.clearInterval(timer.current);
				setMessage(done);
			} else if (tries >= 20) {
				if (timer.current) window.clearInterval(timer.current);
				setMessage('Payment received. Your plan will update in a moment. Refresh if it does not.');
			}
		}, 2000);
	};

	const subscribe = async (plan: PaidPlan) => {
		setBusy(plan);
		setMessage('');
		try {
			const loaded = await loadRazorpay();
			if (!loaded || !window.Razorpay) {
				setMessage('Could not load the payment window. Please try again.');
				return;
			}
			const res = await apiClient.createSubscription(plan);
			if (!res.data) {
				setMessage('Could not start the subscription. Please try again.');
				return;
			}
			const checkout = new window.Razorpay({
				key: res.data.keyId,
				subscription_id: res.data.subscriptionId,
				name: 'AlwaysBro',
				description: PLAN_NAMES[plan] + ' plan, billed monthly',
				prefill: { email: user.email },
				theme: { color: '#f97316' },
				handler: () => {
					setMessage('Payment received. Activating your plan...');
					waitFor((s) => s.subscriptions.some((x) => x.plan === plan), 'Your plan is active. Happy building!');
				},
			});
			checkout.open();
		} catch (error) {
			setMessage(fail(error, 'Something went wrong starting the subscription. Please try again.'));
		} finally {
			setBusy(null);
		}
	};

	const cancel = async (target: PaidPlan) => {
		if (!window.confirm('Stop renewals? Your plan stays active until the end of the period you already paid for.')) return;
		setBusy('cancel');
		try {
			const res = await apiClient.cancelSubscription(target);
			setMessage(res.data ? 'Renewals stopped. Your plan stays active until the end of this period.' : 'Could not cancel. Please try again.');
			await refresh();
		} catch {
			setMessage('Could not cancel. Please try again.');
		} finally {
			setBusy(null);
		}
	};

	const buyPack = async (packId: string, label: string, credits: number) => {
		setBusy(packId);
		setMessage('');
		try {
			const loaded = await loadRazorpay();
			if (!loaded || !window.Razorpay) {
				setMessage('Could not load the payment window. Please try again.');
				return;
			}
			const res = await apiClient.createCreditOrder(packId);
			const order = res.data;
			if (!order) {
				setMessage('Could not start the payment. Please try again.');
				return;
			}
			const before = status?.balance ?? 0;
			const checkout = new window.Razorpay({
				key: order.keyId,
				order_id: order.orderId,
				amount: order.amount,
				currency: order.currency,
				name: 'AlwaysBro',
				description: `${label}: ${credits} credits`,
				prefill: { email: user.email },
				theme: { color: '#f97316' },
				handler: () => {
					setMessage('Payment received. Adding your credits...');
					waitFor((s) => s.balance > before, 'Credits added. Happy building!');
				},
			});
			checkout.open();
		} catch {
			setMessage('Something went wrong starting the payment. Please try again.');
		} finally {
			setBusy(null);
		}
	};

	const subs = status?.subscriptions ?? [];
	const ownedNames = subs.map((x) => PLAN_NAMES[x.plan]);
	const label = ownedNames.length > 0 ? ownedNames.join(' + ') : 'Upgrade';
	const buttonText = status && status.balance > 0 ? `${label} · ${status.balance.toLocaleString('en-IN')} credits` : label;
	const endDate = status?.periodEnd ? new Date(status.periodEnd).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : null;

	return (
		<>
			<OrangeButton
				size="sm"
				onClick={() => {
					setMessage('');
					setOpen(true);
					void refresh();
				}}
				icon={<Coins className="size-4" />}
			>
				{buttonText}
			</OrangeButton>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-h-[88dvh] max-w-2xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0b14]/95 p-4 sm:p-6 text-white">
					<DialogHeader>
						<DialogTitle className="font-display text-3xl font-bold">Pick your crew</DialogTitle>
						<DialogDescription className="text-white/60">
							{ownedNames.length === 0 ? 'You are on the Free plan' : `You have: ${ownedNames.join(', ')}`}
							{status?.status === 'cancelling' && endDate ? `, active until ${endDate}` : ''}. Your extra credits ({(status?.balance ?? 0).toLocaleString('en-IN')}) are used after your free daily credits run out.
						</DialogDescription>
					</DialogHeader>

					<div className="grid gap-3 sm:grid-cols-2">
						{[...(status?.plans ?? [])].sort((x, y) => PLAN_ORDER.indexOf(x.id) - PLAN_ORDER.indexOf(y.id)).map((p) => {
							const mine = subs.find((x) => x.plan === p.id);
							const current = !!mine;
							const inPro = !current && subs.some((x) => x.plan === 'pro') && p.id !== 'pro';
							const look = PLAN_STYLE[p.id];
							return (
								<div
									key={p.id}
									className="relative flex flex-col rounded-2xl border bg-white/[0.04] p-4 transition-transform hover:-translate-y-0.5"
									style={{
										borderColor: highlight === p.id || current ? look.color : 'rgba(255,255,255,0.1)',
										boxShadow: highlight === p.id || current || p.id === 'pro' ? `0 0 28px ${look.glow}` : undefined,
									}}
								>
									<div className="text-xs font-semibold uppercase tracking-wide" style={{ color: look.color }}>{look.tag}</div>
									<div className="mt-1 flex items-baseline justify-between">
										<div className="font-display text-xl font-bold">{p.name}</div>
										<div className="text-sm">
											<span className="text-lg font-semibold">{rupees(p.priceInr)}</span>
											<span className="text-white/50"> / month</span>
										</div>
									</div>
									<ul className="mt-3 flex-1 space-y-1.5 text-sm text-white/70">
										{[...PLAN_LINES[p.id], ...(p.id === 'basic' || p.id === 'pro' ? EVERY_PLAN_EXTRAS : [])].map((line) => (
											<li key={line} className="flex gap-2">
												<span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: look.color }} />
												<span>{line}</span>
											</li>
										))}
										{p.agents.includes('caesar') && (
											<li className="flex gap-2">
												<span className="mt-1.5 size-1.5 shrink-0 rounded-full" style={{ background: look.color }} />
												<span>{p.monthlyCredits.toLocaleString('en-IN')} credits every month, up to {p.maxLiveSites} live websites</span>
											</li>
										)}
									</ul>
									<div className="mt-3">
										{current ? (
											<div className="flex items-center gap-3">
												<span className="text-sm text-white/60">
													{mine?.status === 'cancelling' ? 'Active (renewal stopped)' : 'Your plan'}
												</span>
												{mine?.status === 'active' && (
													<button
														type="button"
														disabled={busy !== null}
														onClick={() => void cancel(p.id)}
														className="text-sm text-white/60 underline"
													>
														Stop renewals
													</button>
												)}
											</div>
										) : inPro ? (
											<span className="text-sm text-white/60">Included in your Pro plan</span>
										) : (
											<button
												type="button"
												disabled={busy !== null || !p.available}
												onClick={() => void subscribe(p.id)}
												className="w-full rounded-xl px-3 py-2 text-sm font-semibold text-white transition hover:brightness-110 disabled:opacity-50"
												style={{ background: `linear-gradient(135deg, ${look.color}, ${p.id === 'pro' ? '#ec4899' : look.color}cc)` }}
											>
												{!p.available ? 'Coming soon' : busy === p.id ? 'Please wait...' : `Choose ${p.name}`}
											</button>
										)}
									</div>
								</div>
							);
						})}

						{(status?.packs ?? []).length > 0 && (
							<div className="mt-1 sm:col-span-2">
								<div className="mb-2 font-display text-lg font-semibold">Need more credits? Top up once</div>
								{(status?.packs ?? []).map((pack) => (
									<div key={pack.id} className="mb-2 flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.04] p-3">
										<div>
											<div className="text-sm font-medium">{pack.label}</div>
											<div className="text-xs text-white/55">{pack.credits.toLocaleString('en-IN')} credits</div>
										</div>
										<button
											type="button"
											disabled={busy !== null}
											onClick={() => void buyPack(pack.id, pack.label, pack.credits)}
											className="rounded-xl bg-white/10 px-3 py-1.5 text-sm font-medium hover:bg-white/20 disabled:opacity-50"
										>
											{busy === pack.id ? 'Please wait...' : `Pay ${rupees(pack.priceInr)}`}
										</button>
									</div>
								))}
							</div>
						)}

						{message && <p className="text-sm sm:col-span-2">{message}</p>}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
