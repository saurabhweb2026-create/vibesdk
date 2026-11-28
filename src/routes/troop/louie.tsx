import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { apiClient, type MetaStatus } from '@/lib/api-client';
import { canListen, useListen } from '@/lib/voice';
import { useMetaStatus } from '@/components/meta-post-dialog';
import { MarketingCouncil } from './marketing-council';
import { ContentCalendar } from './content-calendar';
import { QuickCampaign } from './quick-campaign';
import { INPUT, LockedNotice, PANEL, SitePicker, TroopHeader, useTroopSites } from './troop-shared';

const PINK = '#ec4899';

function MetaPanel({ status, refresh }: { status: MetaStatus | null; refresh: () => Promise<void> }) {
	const [busy, setBusy] = useState(false);

	useEffect(() => {
		const url = new URL(window.location.href);
		const result = url.searchParams.get('meta');
		if (!result) return;
		if (result === 'connected') toast.success('Meta connected. John can post for you now.');
		else toast.error('Could not connect Meta. Please try again.');
		url.searchParams.delete('meta');
		window.history.replaceState(null, '', url.toString());
		void refresh();
	}, [refresh]);

	const connect = async () => {
		setBusy(true);
		try {
			const res = await apiClient.getMetaConnectUrl();
			if (res.data?.url) {
				window.location.href = res.data.url;
				return;
			}
		} catch {
			// the API client already shows the reason
		}
		setBusy(false);
	};

	const unlink = async () => {
		setBusy(true);
		try {
			await apiClient.disconnectMeta();
			await refresh();
		} catch {
			// the API client already shows the reason
		}
		setBusy(false);
	};

	const cancel = async (id: string) => {
		try {
			await apiClient.cancelMetaPost(id);
			await refresh();
		} catch {
			// the API client already shows the reason
		}
	};

	if (!status) return null;
	const queue = status.posts.filter((p) => p.status === 'scheduled' || p.status === 'failed' || p.status === 'posted').slice(0, 6);

	return (
		<div className={PANEL}>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<div className="text-sm font-medium text-white">Facebook and Instagram</div>
					<div className="text-xs text-white/55">
						{!status.configured
							? 'Meta posting is being set up on this platform.'
							: status.connected
								? `Connected to ${status.pageName}${status.instagramName ? ` and @${status.instagramName}` : ' (no Instagram linked)'}`
								: 'Connect once and John can post and schedule for you.'}
					</div>
				</div>
				{status.configured &&
					(status.connected ? (
						<button type="button" disabled={busy} onClick={() => void unlink()} className="text-sm text-white/60 underline">Disconnect</button>
					) : (
						<button type="button" disabled={busy} onClick={() => void connect()} className="rounded-full px-4 py-1.5 text-sm font-medium text-black disabled:opacity-50" style={{ background: '#fff' }}>
							{busy ? 'Opening Meta…' : 'Connect Meta'}
						</button>
					))}
			</div>
			{status.connected && queue.length > 0 && (
				<div className="mt-4 space-y-2 border-t border-white/10 pt-3">
					{queue.map((p) => (
						<div key={p.id} className="flex items-center justify-between gap-3 text-sm">
							<span className="line-clamp-1 text-white/80">{p.message}</span>
							<span className="flex shrink-0 items-center gap-2 text-xs text-white/55">
								{p.status === 'scheduled' && p.scheduledAt ? `Scheduled ${new Date(p.scheduledAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}` : p.status === 'failed' ? `Failed: ${p.error ?? 'unknown'}` : 'Posted'}
								{p.status === 'scheduled' && <button type="button" onClick={() => void cancel(p.id)} className="underline">Cancel</button>}
							</span>
						</div>
					))}
				</div>
			)}
		</div>
	);
}

export default function LouiePage() {
	const { data, error, sites, selectedId, select } = useTroopSites();
	const { status: meta, refresh: refreshMeta } = useMetaStatus();
	// A spoken request from Bob arrives as ?say= and is made straight away.
	const [params] = useSearchParams();
	const [ask, setAsk] = useState(params.get('say') ?? '');
	const [typed, setTyped] = useState('');
	const { listen, listening } = useListen();
	const brand = sites.find((x) => x.id === selectedId)?.title ?? 'AlwaysBro';

	const askJohn = (text: string) => {
		const request = text.trim();
		if (request.length < 3) return;
		setAsk(request);
		setTyped('');
	};

	const askByVoice = () => {
		listen('en-IN')
			.then(askJohn)
			.catch(() => toast.error('John could not hear you. Please type it instead.'));
	};

	return (
		<div className="mx-auto max-w-3xl px-5 py-8 text-white">
			<title>John - AlwaysBro</title>
			<TroopHeader person="john" name="John" color={PINK} role="Ads" line="Tell me about your business and I will plan, make and post your content." />
			{error && <div className={PANEL}>{error}</div>}
			{data && !data.access.louie && <LockedNotice agent="John" />}
			{data && data.access.louie && (
				<>
					<SitePicker sites={sites} selectedId={selectedId} onSelect={select} />
					<MetaPanel status={meta} refresh={refreshMeta} />
					{selectedId && <ContentCalendar key={`plan-${selectedId}`} appId={selectedId} brand={brand} meta={meta} onPosted={() => void refreshMeta()} />}
					{selectedId && (
						<form
							className={PANEL}
							onSubmit={(e) => {
								e.preventDefault();
								askJohn(typed);
							}}
						>
							<div className="text-sm text-white/70">Need something extra? Tell John, by typing or speaking.</div>
							<div className="mt-2 flex gap-2">
								<input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="Diwali offer post, today's sales update, a reel for the new shirt…" className={`${INPUT} min-w-0 flex-1`} />
								{canListen() && (
									<button type="button" onClick={askByVoice} disabled={listening} className="rounded-full border border-white/20 px-4 py-2 text-sm text-white disabled:opacity-60">
										{listening ? 'Listening…' : 'Speak'}
									</button>
								)}
								<button type="submit" className="rounded-full px-5 py-2 text-sm font-semibold text-black" style={{ background: PINK }}>
									Make it
								</button>
							</div>
						</form>
					)}
					{selectedId && ask && <QuickCampaign key={`${selectedId}-${ask}`} appId={selectedId} brand={brand} request={ask} meta={meta} onPosted={() => void refreshMeta()} />}
					{selectedId && <MarketingCouncil appId={selectedId} />}
				</>
			)}
		</div>
	);
}
