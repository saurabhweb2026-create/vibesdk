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
	basic: ['Caesar, the AI website builder', 'Websites live (see your limit below)', 'Monthly credits for building and editing'],
	louie: ['Louie writes your ads', 'Google, Facebook and Instagram ads, posts and a budget plan', 'Works on any website you built'],
	jack: ['Jack answers your customers on your website', 'Saves the customers who leave their details', 'You teach him your prices, timings and offers'],
	pro: ['Caesar, Louie and Jack together', 'Cheaper than taking all three one by one', 'More monthly credits'],
};

const PLAN_NAMES: Record<PaidPlan, string> = { basic: 'Caesar', louie: 'Louie', jack: 'Jack', pro: 'Pro' };
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
				name: 'Monkeytrooprs',
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
				name: 'Monkeytrooprs',
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
				<DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Plans and credits</DialogTitle>
						<DialogDescription>
							{ownedNames.length === 0 ? 'You are on the Free plan' : `You have: ${ownedNames.join(', ')}`}
							{status?.status === 'cancelling' && endDate ? `, active until ${endDate}` : ''}. Your extra credits ({(status?.balance ?? 0).toLocaleString('en-IN')}) are used after your free daily credits run out.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-3">
						{[...(status?.plans ?? [])].sort((x, y) => PLAN_ORDER.indexOf(x.id) - PLAN_ORDER.indexOf(y.id)).map((p) => {
							const mine = subs.find((x) => x.plan === p.id);
							const current = !!mine;
							const inPro = !current && subs.some((x) => x.plan === 'pro') && p.id !== 'pro';
							return (
								<div
									key={p.id}
									className={'rounded-lg border p-4 ' + (highlight === p.id ? 'border-orange-500' : '')}
								>
									<div className="flex items-baseline justify-between">
										<div className="text-base font-semibold">{p.name}</div>
										<div className="text-sm">
											<span className="text-lg font-semibold">{rupees(p.priceInr)}</span>
											<span className="text-muted-foreground"> / month</span>
										</div>
									</div>
									<ul className="mt-2 list-disc pl-5 text-sm text-muted-foreground">
										{PLAN_LINES[p.id].map((line) => (
											<li key={line}>{line}</li>
										))}
										{p.agents.includes('caesar') && (
											<li>{p.monthlyCredits.toLocaleString('en-IN')} credits every month, up to {p.maxLiveSites} live websites</li>
										)}
									</ul>
									<div className="mt-3">
										{current ? (
											<div className="flex items-center gap-3">
												<span className="text-sm text-muted-foreground">
													{mine?.status === 'cancelling' ? 'Active (renewal stopped)' : 'Your plan'}
												</span>
												{mine?.status === 'active' && (
													<button
														type="button"
														disabled={busy !== null}
														onClick={() => void cancel(p.id)}
														className="text-sm text-muted-foreground underline"
													>
														Stop renewals
													</button>
												)}
											</div>
										) : inPro ? (
											<span className="text-sm text-muted-foreground">Included in your Pro plan</span>
										) : (
											<button
												type="button"
												disabled={busy !== null || !p.available}
												onClick={() => void subscribe(p.id)}
												className="rounded-md bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600 disabled:opacity-50"
											>
												{!p.available ? 'Coming soon' : busy === p.id ? 'Please wait...' : `Choose ${p.name}`}
											</button>
										)}
									</div>
								</div>
							);
						})}

						{(status?.packs ?? []).length > 0 && (
							<div className="mt-1">
								<div className="mb-2 text-sm font-medium">Need more credits? Top up once</div>
								{(status?.packs ?? []).map((pack) => (
									<div key={pack.id} className="mb-2 flex items-center justify-between rounded-lg border p-3">
										<div>
											<div className="text-sm font-medium">{pack.label}</div>
											<div className="text-xs text-muted-foreground">{pack.credits.toLocaleString('en-IN')} credits</div>
										</div>
										<button
											type="button"
											disabled={busy !== null}
											onClick={() => void buyPack(pack.id, pack.label, pack.credits)}
											className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
										>
											{busy === pack.id ? 'Please wait...' : `Pay ${rupees(pack.priceInr)}`}
										</button>
									</div>
								))}
							</div>
						)}

						{message && <p className="text-sm">{message}</p>}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
