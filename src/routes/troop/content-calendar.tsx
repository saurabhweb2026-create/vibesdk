import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiClient, type MetaStatus, type MetaTarget, type PlanBrand, type PlanItem } from '@/lib/api-client';
import { blobToDataUrl, cutReel, drawPicture } from '@/lib/make-media';
import { toJpegDataUrl } from '@/components/meta-post-dialog';
import { INPUT, PANEL } from './troop-shared';

const PINK = '#ec4899';

interface Made {
	picture?: string;
	videoUrl?: string;
	videoBlob?: Blob;
	videoIsMp4?: boolean;
}

const STATUS_LABEL: Record<PlanItem['status'], string> = {
	draft: 'Waiting for you',
	approved: 'Scheduled',
	posted: 'Posted',
	failed: 'Failed',
	skipped: 'Skipped',
};

const dayLabel = (day: string): string => new Date(`${day}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' });
const whenLabel = (ms: number): string => new Date(ms).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

interface Props {
	appId: string;
	brand: string;
	meta: MetaStatus | null;
	onPosted: () => void;
}

/**
 * John's month: he learns the business from a link, plans the posts, and makes each one.
 * Nothing goes out until you approve it; approved posts publish on their planned day.
 */
export function ContentCalendar({ appId, brand, meta, onPosted }: Props) {
	const [profile, setProfile] = useState<PlanBrand | null>(null);
	const [items, setItems] = useState<PlanItem[]>([]);
	const [link, setLink] = useState('');
	const [focus, setFocus] = useState('');
	const [busy, setBusy] = useState('');
	const [working, setWorking] = useState<string | null>(null);
	const [made, setMade] = useState<Record<string, Made>>({});
	const [problems, setProblems] = useState<Record<string, string>>({});

	const load = useCallback(async () => {
		const res = await apiClient.getPlan(appId);
		if (res.data) {
			setProfile(res.data.brand);
			setItems(res.data.items);
			setLink(res.data.brand?.url || res.data.siteLink);
		}
	}, [appId]);

	useEffect(() => {
		setProfile(null);
		setItems([]);
		setMade({});
		setLink('');
		void load().catch(() => undefined);
	}, [load]);

	const target: MetaTarget = meta?.instagramName ? 'both' : 'facebook';
	const connected = Boolean(meta?.connected);

	const learn = async () => {
		setBusy('learn');
		try {
			const res = await apiClient.learnBrand(appId, link);
			if (res.data) setProfile(res.data.brand);
			toast.success('John learned your business');
		} catch {
			// the API client already shows the reason
		}
		setBusy('');
	};

	const plan = async () => {
		setBusy('plan');
		try {
			const res = await apiClient.generatePlan(appId, focus);
			if (res.data) {
				setItems(res.data.items);
				setMade({});
				toast.success('Your month is planned. Check each post and approve.');
			}
		} catch {
			// the API client already shows the reason
		}
		setBusy('');
	};

	const patch = (id: string, change: Partial<PlanItem>) => setItems((all) => all.map((i) => (i.id === id ? { ...i, ...change } : i)));

	const brandColor = profile?.colors?.[0];

	const make = async (item: PlanItem, fresh = false): Promise<Made> => {
		const existing = made[item.id];
		if (!fresh && (item.kind === 'image' ? existing?.picture : existing?.videoBlob)) return existing as Made;
		const next: Made =
			item.kind === 'image'
				? { picture: await drawPicture(appId, item.imagePrompt || item.idea, item.overlay, brand, PINK, { cta: item.cta, variant: items.findIndex((i) => i.id === item.id), brandColor }) }
				: await cutReel(appId, item.shots, item.cta || 'Order now', brand, PINK, brandColor).then(({ blob, isMp4 }) => ({ videoUrl: URL.createObjectURL(blob), videoBlob: blob, videoIsMp4: isMp4 }));
		setMade((m) => ({ ...m, [item.id]: next }));
		return next;
	};

	const preview = async (item: PlanItem) => {
		setWorking(item.id);
		setProblems((p) => ({ ...p, [item.id]: '' }));
		try {
			await make(item, true);
		} catch (e) {
			const reason = e instanceof Error ? e.message : 'John could not make this one';
			setProblems((p) => ({ ...p, [item.id]: reason }));
			toast.error(reason);
		}
		setWorking(null);
	};

	const approve = async (item: PlanItem): Promise<boolean> => {
		setWorking(item.id);
		try {
			const media = await make(item);
			if (item.kind === 'reel' && !media.videoIsMp4) throw new Error('This browser saved the video as WebM, which Meta does not accept. Use Chrome on a computer.');
			const body = item.kind === 'reel' && media.videoBlob ? { video: await blobToDataUrl(media.videoBlob) } : { image: await toJpegDataUrl(media.picture ?? '') };
			const res = await apiClient.approvePlanItem(item.id, { message: item.caption, target, ...body });
			if (res.data) patch(item.id, res.data.item);
			onPosted();
			setWorking(null);
			return true;
		} catch (e) {
			const reason = e instanceof Error ? e.message : 'Could not schedule the post';
			setProblems((p) => ({ ...p, [item.id]: reason }));
			toast.error(reason);
			setWorking(null);
			return false;
		}
	};

	const approveAll = async () => {
		setBusy('all');
		let done = 0;
		for (const item of items.filter((i) => i.status === 'draft')) {
			if (!(await approve(item))) break;
			done += 1;
		}
		if (done) toast.success(`${done} posts scheduled`);
		setBusy('');
	};

	const skip = async (item: PlanItem, value: boolean) => {
		patch(item.id, { status: value ? 'skipped' : 'draft' });
		await apiClient.editPlanItem(item.id, { skip: value }).catch(() => undefined);
	};

	const saveCaption = (item: PlanItem) => void apiClient.editPlanItem(item.id, { caption: item.caption }).catch(() => undefined);
	const saveDay = (item: PlanItem, day: string) => {
		patch(item.id, { day });
		void apiClient.editPlanItem(item.id, { day }).catch(() => undefined);
	};

	const drafts = items.filter((i) => i.status === 'draft').length;

	return (
		<div className={PANEL} style={{ borderColor: `${PINK}55` }}>
			<div className="font-label text-[11px]" style={{ color: PINK }}>Your month with John</div>
			<div className="mt-1 text-lg font-medium text-white">Learn, plan, approve, and John posts</div>

			<div className="mt-4 flex flex-wrap gap-2">
				<input value={link} onChange={(e) => setLink(e.target.value)} placeholder="Paste your website, Instagram page or catalog link" className={`${INPUT} min-w-0 flex-1`} />
				<button type="button" disabled={!!busy} onClick={() => void learn()} className="rounded-full border border-white/20 px-5 py-2 text-sm font-medium text-white disabled:opacity-60">
					{busy === 'learn' ? 'Reading…' : profile ? 'Learn again' : 'Let John learn my business'}
				</button>
			</div>

			<p className="mt-1 text-xs text-white/45">Filled from the website you selected. Change it to teach John from any other link.</p>

			{profile && (
				<div className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-sm text-white/80">
					<p>{profile.about}</p>
					<p className="mt-1 text-xs text-white/50">
						Voice: {profile.tone}
						{profile.audience ? ` · For: ${profile.audience}` : ''}
						{profile.products.length ? ` · ${profile.products.length} products noticed` : ''}
					</p>
				</div>
			)}

			{profile && (
				<div className="mt-4 flex flex-wrap gap-2">
					<input value={focus} onChange={(e) => setFocus(e.target.value)} placeholder="Anything to focus on this month? (festival, new product, offer)" className={`${INPUT} min-w-0 flex-1`} />
					<button type="button" disabled={!!busy} onClick={() => void plan()} className="rounded-full px-5 py-2 text-sm font-semibold text-black disabled:opacity-60" style={{ background: PINK }}>
						{busy === 'plan' ? 'Planning your month…' : items.length ? 'Plan again' : 'Plan my month'}
					</button>
				</div>
			)}

			{items.length > 0 && (
				<>
					<div className="mt-5 flex flex-wrap items-center justify-between gap-2">
						<p className="text-sm text-white/60">
							{drafts} waiting for your approval. Nothing is posted until you approve it.
						</p>
						{drafts > 0 && (
							<button type="button" disabled={!!busy || !connected} onClick={() => void approveAll()} className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black disabled:opacity-50">
								{busy === 'all' ? 'Making and scheduling…' : `Approve all ${drafts}`}
							</button>
						)}
					</div>
					{!connected && <p className="mt-2 text-sm text-amber-300">Connect Meta above to approve posts. You can still preview them.</p>}

					<div className="mt-4 grid gap-4 sm:grid-cols-2">
						{items.map((item) => {
							const m = made[item.id];
							const open = item.status === 'draft' || item.status === 'skipped';
							const isWorking = working === item.id;
							return (
								<div key={item.id} className={`rounded-2xl border border-white/10 bg-black/30 p-3 ${item.status === 'skipped' ? 'opacity-50' : ''}`}>
									<div className="flex items-center justify-between gap-2 text-xs">
										{open ? (
											<input type="date" value={item.day} onChange={(e) => saveDay(item, e.target.value)} className="rounded-lg border border-white/10 bg-black/40 px-2 py-1 text-white" />
										) : (
											<span className="text-white/70">{item.scheduledAt ? whenLabel(item.scheduledAt) : dayLabel(item.day)}</span>
										)}
										<span className="flex items-center gap-2">
											<span className="rounded-full border border-white/15 px-2 py-0.5 text-white/70">{item.kind === 'reel' ? 'Reel' : 'Picture'}</span>
											<span style={{ color: item.status === 'failed' ? '#fca5a5' : item.status === 'draft' ? '#fcd34d' : '#8bf0c4' }}>{STATUS_LABEL[item.status]}</span>
										</span>
									</div>
									<p className="mt-2 text-sm text-white">{item.idea}</p>

									{m?.picture && <img src={m.picture} alt={item.idea} className="mt-2 w-full rounded-xl border border-white/10" />}
									{m?.videoUrl && <video src={m.videoUrl} controls playsInline loop className="mx-auto mt-2 h-96 rounded-xl border border-white/10" />}

									<textarea
										value={item.caption}
										disabled={!open}
										onChange={(e) => patch(item.id, { caption: e.target.value })}
										onBlur={() => open && saveCaption(item)}
										rows={4}
										className="mt-2 w-full resize-none rounded-xl border border-white/10 bg-black/40 p-2 text-xs text-white outline-none focus:border-white/30 disabled:opacity-70"
									/>
									{isWorking && <p className="mt-2 text-xs text-white/60">{item.kind === 'reel' ? 'Drawing scenes and recording the reel. This takes about 40 seconds, please keep this tab open.' : 'Drawing the picture…'}</p>}
									{(problems[item.id] || item.error) && <p className="mt-1 text-xs text-red-300">{problems[item.id] || item.error}</p>}

									{open && (
										<div className="mt-2 flex flex-wrap gap-2">
											{item.status === 'draft' ? (
												<>
													<button type="button" disabled={isWorking || !!busy || !connected} onClick={() => void approve(item)} className="rounded-full px-4 py-1.5 text-xs font-semibold text-black disabled:opacity-50" style={{ background: PINK }}>
														{isWorking ? 'Making…' : 'Approve'}
													</button>
													<button type="button" disabled={isWorking || !!busy} onClick={() => void preview(item)} className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-white disabled:opacity-50">
														{m ? 'Make again' : 'Preview'}
													</button>
													<button type="button" disabled={isWorking} onClick={() => void skip(item, true)} className="rounded-full px-3 py-1.5 text-xs text-white/60 underline">
														Skip
													</button>
												</>
											) : (
												<button type="button" onClick={() => void skip(item, false)} className="rounded-full border border-white/20 px-4 py-1.5 text-xs text-white">
													Bring it back
												</button>
											)}
										</div>
									)}
								</div>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
}
