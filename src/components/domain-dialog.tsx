import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { GlobeIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { apiClient, type DomainState } from '@/lib/api-client';

/** Connect a website to the owner's own domain. Shows the DNS records to add and the live status. */
export function DomainButton({ appId }: { appId: string }) {
	const [open, setOpen] = useState(false);
	const [domain, setDomain] = useState<DomainState | null>(null);
	const [input, setInput] = useState('');
	const [busy, setBusy] = useState(false);

	const load = useCallback(async () => {
		try {
			const res = await apiClient.getDomain(appId);
			setDomain(res.data?.domain ?? null);
		} catch {
			// the API client already shows the reason
		}
	}, [appId]);

	useEffect(() => {
		if (open) void load();
	}, [open, load]);

	const connect = async () => {
		setBusy(true);
		try {
			const res = await apiClient.connectDomain(appId, input);
			setDomain(res.data?.domain ?? null);
			setInput('');
		} catch {
			// the API client already shows the reason
		}
		setBusy(false);
	};

	const remove = async () => {
		setBusy(true);
		try {
			await apiClient.removeDomain(appId);
			setDomain(null);
			toast.success('Domain disconnected');
		} catch {
			// the API client already shows the reason
		}
		setBusy(false);
	};

	return (
		<>
			<button
				type="button"
				onClick={() => setOpen(true)}
				className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-white/15 px-3 text-sm font-medium text-white hover:bg-white/10"
			>
				<GlobeIcon className="size-3.5" weight="duotone" />
				Domain
			</button>
			{open &&
				createPortal(
					<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
						<div className="max-h-[90dvh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0b0b14]/95 p-5 text-white shadow-2xl sm:p-6" onClick={(e) => e.stopPropagation()}>
							<div className="flex items-start justify-between gap-3">
								<div>
									<h2 className="font-display text-2xl font-bold">Your own domain</h2>
									<p className="mt-1 text-sm text-white/60">Show this website on an address you own, like www.mybakery.com.</p>
								</div>
								<button type="button" onClick={() => setOpen(false)} className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20">Done</button>
							</div>

							{!domain ? (
								<div className="mt-5 flex gap-2">
									<input
										value={input}
										onChange={(e) => setInput(e.target.value)}
										placeholder="www.example.com"
										className="min-w-0 flex-1 rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-sm outline-none focus:border-[#ec4899]"
									/>
									<button
										type="button"
										disabled={busy || input.trim().length < 4}
										onClick={() => void connect()}
										className="rounded-xl bg-gradient-to-r from-[#3b82f6] to-[#ec4899] px-4 py-2 text-sm font-semibold disabled:opacity-50"
									>
										{busy ? 'Connecting…' : 'Connect'}
									</button>
								</div>
							) : (
								<div className="mt-5">
									<div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3">
										<span className="font-medium">{domain.hostname}</span>
										<span className={`rounded-full px-3 py-0.5 text-xs font-semibold ${domain.status === 'active' ? 'bg-emerald-500/20 text-emerald-300' : domain.status === 'failed' ? 'bg-red-500/20 text-red-300' : 'bg-amber-500/20 text-amber-300'}`}>
											{domain.status === 'active' ? 'Live' : domain.status === 'failed' ? 'Problem' : 'Waiting for DNS'}
										</span>
									</div>
									<p className="mt-3 text-sm text-white/65">{domain.note}</p>
									{domain.records.map((r) => (
										<div key={`${r.type}-${r.name}`} className="mt-2 overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 font-mono text-xs">
											<div><span className="text-white/45">Type </span>{r.type}</div>
											<div><span className="text-white/45">Name </span>{r.name}</div>
											<div className="whitespace-nowrap"><span className="text-white/45">Value </span>{r.value}</div>
										</div>
									))}
									<div className="mt-4 flex gap-2">
										<button type="button" onClick={() => void load()} className="rounded-xl bg-white/10 px-4 py-2 text-sm hover:bg-white/20">Check again</button>
										<button type="button" disabled={busy} onClick={() => void remove()} className="rounded-xl px-4 py-2 text-sm text-red-300 hover:bg-red-500/10">Disconnect</button>
									</div>
								</div>
							)}
						</div>
					</div>,
					document.body,
				)}
		</>
	);
}
