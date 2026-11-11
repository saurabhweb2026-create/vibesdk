import { useCallback, useEffect, useState } from 'react';
import { Coins } from 'lucide-react';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
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

interface Pack {
	id: string;
	label: string;
	credits: number;
	priceInr: number;
}

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

export function BuyCredits() {
	const { user } = useAuth();
	const [open, setOpen] = useState(false);
	const [packs, setPacks] = useState<Pack[]>([]);
	const [balance, setBalance] = useState(0);
	const [busyPack, setBusyPack] = useState<string | null>(null);
	const [message, setMessage] = useState('');

	const refresh = useCallback(async (): Promise<number | null> => {
		try {
			const res = await apiClient.getCreditPacks();
			if (res.data) {
				setPacks(res.data.packs);
				setBalance(res.data.balance);
				return res.data.balance;
			}
		} catch {
			// ignore: the button simply shows no balance
		}
		return null;
	}, []);

	useEffect(() => {
		if (user) void refresh();
	}, [user, refresh]);

	if (!user) return null;

	const waitForCredits = (before: number) => {
		let tries = 0;
		const timer = setInterval(async () => {
			tries += 1;
			const now = await refresh();
			if (now !== null && now > before) {
				clearInterval(timer);
				setMessage('Credits added. Happy building!');
			} else if (tries >= 15) {
				clearInterval(timer);
				setMessage('Payment received. Your credits will appear shortly. Refresh if they do not.');
			}
		}, 2000);
	};

	const buy = async (pack: Pack) => {
		setBusyPack(pack.id);
		setMessage('');
		try {
			const loaded = await loadRazorpay();
			if (!loaded || !window.Razorpay) {
				setMessage('Could not load the payment window. Please try again.');
				return;
			}
			const res = await apiClient.createCreditOrder(pack.id);
			const order = res.data;
			if (!order) {
				setMessage('Could not start the payment. Please try again.');
				return;
			}
			const before = balance;
			const checkout = new window.Razorpay({
				key: order.keyId,
				order_id: order.orderId,
				amount: order.amount,
				currency: order.currency,
				name: 'Monkeytrooprs',
				description: `${pack.label}: ${pack.credits} credits`,
				prefill: { email: user.email },
				theme: { color: '#f97316' },
				handler: () => {
					setMessage('Payment received. Adding your credits...');
					waitForCredits(before);
				},
			});
			checkout.open();
		} catch {
			setMessage('Something went wrong starting the payment. Please try again.');
		} finally {
			setBusyPack(null);
		}
	};

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
				{balance > 0 ? `Credits · ${balance}` : 'Buy credits'}
			</OrangeButton>

			<Dialog open={open} onOpenChange={setOpen}>
				<DialogContent className="max-w-md">
					<DialogHeader>
						<DialogTitle>Buy credits</DialogTitle>
						<DialogDescription>
							Purchased credits are used after your free daily credits run out. You have {balance} purchased credits.
						</DialogDescription>
					</DialogHeader>

					<div className="flex flex-col gap-2">
						{packs.length === 0 && (
							<p className="text-sm text-muted-foreground">Credit packs are not available yet.</p>
						)}
						{packs.map((pack) => (
							<div key={pack.id} className="flex items-center justify-between rounded-lg border p-3">
								<div>
									<div className="text-sm font-medium">{pack.label}</div>
									<div className="text-xs text-muted-foreground">{pack.credits} credits</div>
								</div>
								<button
									type="button"
									disabled={busyPack !== null}
									onClick={() => void buy(pack)}
									className="rounded-md bg-orange-500 px-3 py-1.5 text-sm text-white hover:bg-orange-600 disabled:opacity-50"
								>
									{busyPack === pack.id ? 'Please wait...' : `Pay ₹${pack.priceInr}`}
								</button>
							</div>
						))}
						{message && <p className="text-sm">{message}</p>}
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
