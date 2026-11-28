import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { apiClient, type LouieAdContent, type LouiePack, type MetaStatus } from '@/lib/api-client';
import { composeCreative, loadImage } from '@/lib/creative-image';
import { renderShortVideo, type VideoShot } from '@/lib/short-video';
import { speak } from '@/lib/voice';
import { MetaPostDialog, useMetaStatus } from '@/components/meta-post-dialog';
import { MarketingCouncil } from './marketing-council';
import { CopyButton, INPUT, LockedNotice, PANEL, SitePicker, TroopHeader, useTroopSites } from './troop-shared';

const GOALS = ['Get more bookings', 'Sell more products', 'Bring more visitors', 'Launch something new'];
const FORMATS = ['Ads', 'Social posts', 'Video scripts', 'Creatives'] as const;
const TONES = ['Friendly', 'Premium', 'Fun', 'Urgent'];
const PINK = '#ec4899';

type OnPost = (text: string, image?: string | null) => void;

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className={PANEL}>
			<div className="mb-3 font-label text-[11px]" style={{ color: PINK }}>
				{title}
			</div>
			{children}
		</div>
	);
}

function Row({ text }: { text: string }) {
	return (
		<div className="flex items-start justify-between gap-3 border-b border-white/5 py-2 text-sm text-white/90 last:border-0">
			<span className="min-w-0 whitespace-pre-wrap break-words">{text}</span>
			<CopyButton text={text} />
		</div>
	);
}

const IMAGE_SHOTS = 3;

function MakeVideoButton({ script, appId }: { script: NonNullable<LouieAdContent['videoScripts']>[number]; appId: string }) {
	const [busy, setBusy] = useState('');
	const [url, setUrl] = useState<string | null>(null);
	const [ext, setExt] = useState('webm');

	const make = async (withPictures: boolean) => {
		setBusy(withPictures ? 'John is drawing the scenes…' : 'Making your video…');
		try {
			const shots: VideoShot[] = (script.shots ?? []).map((sh) => ({ seconds: sh.seconds, text: sh.text }));
			if (withPictures) {
				const wanted = (script.shots ?? [])
					.map((sh, i) => ({ i, prompt: sh.imagePrompt ?? '' }))
					.filter((x) => x.prompt.length > 4)
					.slice(0, IMAGE_SHOTS);
				for (const [n, w] of wanted.entries()) {
					setBusy(`John is drawing scene ${n + 1} of ${wanted.length}…`);
					const res = await apiClient.generateLouieImage({ appId, prompt: w.prompt });
					if (res.data?.image) shots[w.i].image = await loadImage(res.data.image);
				}
				// Scenes without their own picture reuse the nearest drawn one so the video stays full of visuals.
				shots.forEach((sh, i) => {
					if (sh.image) return;
					sh.image = shots.slice(0, i).reverse().find((x) => x.image)?.image ?? shots.find((x) => x.image)?.image ?? null;
				});
				setBusy('Putting the video together…');
			}
			const { blob } = await renderShortVideo({ shots, cta: script.cta, brand: script.title, accent: PINK, music: withPictures });
			if (url) URL.revokeObjectURL(url);
			setExt(blob.type.includes('mp4') ? 'mp4' : 'webm');
			setUrl(URL.createObjectURL(blob));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not make the video');
		}
		setBusy('');
	};

	return (
		<div className="mt-2 flex flex-wrap items-center gap-3">
			<button
				type="button"
				disabled={!!busy}
				onClick={() => make(true)}
				className="rounded-full px-4 py-1.5 text-sm font-medium text-black disabled:opacity-50"
				style={{ background: '#fff' }}
			>
				{busy || 'Make a video with pictures and music'}
			</button>
			<button
				type="button"
				disabled={!!busy}
				onClick={() => make(false)}
				className="rounded-full border border-white/15 px-4 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-50"
			>
				Quick text video
			</button>
			{url && (
				<a href={url} download={`${script.title || 'video'}.${ext}`} className="text-sm text-[#8bf0c4] underline">
					Download video
				</a>
			)}
			{url && <video src={url} controls className="mt-2 h-80 rounded-xl border border-white/10" />}
		</div>
	);
}

function CreativeCard({ creative, appId, brand, onPost }: { creative: NonNullable<LouieAdContent['creatives']>[number]; appId: string; brand: string; onPost: OnPost }) {
	const [busy, setBusy] = useState(false);
	const [picture, setPicture] = useState<string | null>(null);

	const draw = async () => {
		setBusy(true);
		try {
			const res = await apiClient.generateLouieImage({ appId, prompt: creative.imagePrompt || creative.visual });
			if (!res.data?.image) throw new Error('John could not draw that picture');
			setPicture(await composeCreative(res.data.image, creative.overlayText, brand, PINK));
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not draw the picture');
		}
		setBusy(false);
	};

	return (
		<div>
			<Row text={`${creative.format}\nImage: ${creative.visual}\nText on image: ${creative.overlayText}\nCaption: ${creative.caption}`} />
			<div className="mt-2 flex flex-wrap items-start gap-3">
				<button
					type="button"
					disabled={busy}
					onClick={draw}
					className="rounded-full px-4 py-1.5 text-sm font-medium text-black disabled:opacity-50"
					style={{ background: '#fff' }}
				>
					{busy ? 'John is drawing…' : picture ? 'Draw another' : 'Draw this picture'}
				</button>
				{picture && (
					<a href={picture} download={`${creative.overlayText || 'creative'}.png`} className="self-center text-sm text-[#8bf0c4] underline">
						Download picture
					</a>
				)}
				<button type="button" onClick={() => onPost(creative.caption, picture)} className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white hover:bg-white/10">
					Post on Meta
				</button>
			</div>
			{picture && <img src={picture} alt={creative.overlayText} className="mt-3 h-96 rounded-xl border border-white/10" />}
		</div>
	);
}

function AdPackView({ c, appId, brand, onPost }: { c: LouieAdContent; appId: string; brand: string; onPost: OnPost }) {
	return (
		<div className="mt-6 grid gap-4">
			<Section title="The idea">
				<p className="text-sm text-white/90">{c.summary}</p>
				<div className="mt-3 flex flex-wrap gap-2">
					{c.audience.map((a) => (
						<span key={a} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/75">
							{a}
						</span>
					))}
				</div>
			</Section>
			<Section title="Google search ads">
				<div className="mb-1 text-xs text-white/50">Headlines</div>
				{c.googleSearch.headlines.map((h) => (
					<Row key={h} text={h} />
				))}
				<div className="mb-1 mt-4 text-xs text-white/50">Descriptions</div>
				{c.googleSearch.descriptions.map((d) => (
					<Row key={d} text={d} />
				))}
				<div className="mb-1 mt-4 text-xs text-white/50">Keywords</div>
				<Row text={c.googleSearch.keywords.join(', ')} />
			</Section>
			<Section title="Facebook and Instagram ads">
				{c.metaAds.map((a, i) => (
					<div key={i}>
						<Row text={`${a.headline}\n${a.primaryText}\nButton: ${a.cta}`} />
						<button type="button" onClick={() => onPost(`${a.headline}\n\n${a.primaryText}`)} className="mt-1 text-sm text-[#8bf0c4] underline">Post on Meta</button>
					</div>
				))}
			</Section>
			<Section title="Social posts">
				{c.socialPosts.map((p, i) => (
					<div key={i}>
						<Row text={`${p.caption}\n${p.hashtags.join(' ')}`} />
						<button type="button" onClick={() => onPost(`${p.caption}\n\n${p.hashtags.join(' ')}`)} className="mt-1 text-sm text-[#8bf0c4] underline">Post on Meta</button>
					</div>
				))}
			</Section>
			{!!c.hashtags && (c.hashtags.broad.length + c.hashtags.niche.length + c.hashtags.local.length > 0) && (
				<Section title="Hashtag ideas">
					<Row text={`Broad: ${c.hashtags.broad.join(' ')}\nNiche: ${c.hashtags.niche.join(' ')}\nLocal: ${c.hashtags.local.join(' ')}`} />
				</Section>
			)}
			<Section title="WhatsApp message">
				<Row text={c.whatsappMessage} />
			</Section>
			{!!c.videoScripts?.length && (
				<Section title="Video scripts">
					{c.videoScripts.map((v, i) => (
						<div key={i}>
							<Row text={`${v.title}\nHook: ${v.hook}\n${v.scenes.map((sc, n) => `${n + 1}. ${sc}`).join('\n')}\nVoiceover: ${v.voiceover}\nEnd: ${v.cta}`} />
							{!!v.shots?.length && <MakeVideoButton script={v} appId={appId} />}
						</div>
					))}
				</Section>
			)}
			{!!c.creatives?.length && (
				<Section title="Creatives">
					{c.creatives.map((cr, i) => (
						<CreativeCard key={i} creative={cr} appId={appId} brand={brand} onPost={onPost} />
					))}
				</Section>
			)}
			<Section title="Where to put your budget">
				{c.budgetPlan.map((b) => (
					<div key={b.channel} className="border-b border-white/5 py-2 last:border-0">
						<div className="flex justify-between text-sm text-white">
							<span>{b.channel}</span>
							<span>{b.sharePercent}%</span>
						</div>
						<div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
							<div className="h-full rounded-full" style={{ width: `${b.sharePercent}%`, background: PINK }} />
						</div>
						<div className="mt-1 text-xs text-white/55">{b.why}</div>
					</div>
				))}
			</Section>
			<Section title="Your first 7 days">
				<ol className="list-decimal space-y-1.5 pl-5 text-sm text-white/90">
					{c.firstWeek.map((w) => (
						<li key={w}>{w}</li>
					))}
				</ol>
			</Section>
		</div>
	);
}

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
	const [goal, setGoal] = useState(GOALS[0]);
	const [budget, setBudget] = useState('10000');
	const [audience, setAudience] = useState('');
	const [location, setLocation] = useState('');
	const [tone, setTone] = useState(TONES[0]);
	const [offer, setOffer] = useState('');
	const [formats, setFormats] = useState<string[]>([...FORMATS]);
	const [busy, setBusy] = useState(false);
	const [packs, setPacks] = useState<LouiePack[]>([]);
	const [shown, setShown] = useState(0);
	const { status: meta, refresh: refreshMeta } = useMetaStatus();
	const [postDraft, setPostDraft] = useState<{ text: string; image: string | null } | null>(null);

	useEffect(() => {
		if (!selectedId) return;
		let alive = true;
		setPacks([]);
		setShown(0);
		apiClient
			.getLouiePacks(selectedId)
			.then((res) => {
				if (alive && res.data) setPacks(res.data.packs);
			})
			.catch(() => undefined);
		return () => {
			alive = false;
		};
	}, [selectedId]);

	const generate = async (spoken?: string) => {
		setBusy(true);
		try {
			const res = await apiClient.generateLouieAds({
				appId: selectedId,
				goal,
				budgetInr: Number(budget) || 10000,
				audience: audience || undefined,
				location: location || undefined,
				tone,
				offer: (spoken ?? offer) || undefined,
				formats,
			});
			if (res.data) {
				const pack = res.data;
				setPacks((p) => [pack, ...p]);
				setShown(0);
				toast.success('John finished your ads');
				if (spoken) void speak('Your ads are ready. Take a look.');
			}
		} catch {
			// the API client already shows the reason
		}
		setBusy(false);
	};

	const current = packs[shown];

	// A spoken request fills the brief and starts the work straight away.
	const [params] = useSearchParams();
	const say = params.get('say');
	const started = useRef(false);
	useEffect(() => {
		if (!say || started.current || !selectedId || !data?.access.louie) return;
		started.current = true;
		setOffer(say);
		void generate(say);
	});

	return (
		<div className="mx-auto max-w-3xl px-5 py-8 text-white">
			<title>John - AlwaysBro</title>
			<TroopHeader person="john" name="John" color={PINK} role="Ads" line="Tell me your goal and I will write your ads." />
			{error && <div className={PANEL}>{error}</div>}
			{data && !data.access.louie && <LockedNotice agent="John" />}
			{data && data.access.louie && (
				<>
					<SitePicker sites={sites} selectedId={selectedId} onSelect={select} />
					<MetaPanel status={meta} refresh={refreshMeta} />
					{selectedId && (
						<div className={PANEL}>
							<div className="mb-2 text-xs tracking-wide text-white/50">Your goal</div>
							<div className="mb-4 flex flex-wrap gap-2">
								{GOALS.map((g) => (
									<button
										key={g}
										type="button"
										onClick={() => setGoal(g)}
										className="rounded-full border px-3 py-1.5 text-sm"
										style={{
											borderColor: goal === g ? '#8bf0c4' : 'rgba(255,255,255,0.15)',
											background: goal === g ? '#8bf0c41a' : 'transparent',
											color: goal === g ? '#fff' : 'rgba(255,255,255,0.75)',
										}}
									>
										{g}
									</button>
								))}
							</div>
							<div className="mb-2 text-xs tracking-wide text-white/50">What should I create?</div>
							<div className="mb-4 flex flex-wrap gap-2">
								{FORMATS.map((f) => {
									const on = formats.includes(f);
									return (
										<button
											key={f}
											type="button"
											onClick={() => setFormats((cur) => (on ? cur.filter((x) => x !== f) : [...cur, f]))}
											className="rounded-full border px-3 py-1.5 text-sm"
											style={{
												borderColor: on ? '#8bf0c4' : 'rgba(255,255,255,0.15)',
												background: on ? '#8bf0c41a' : 'transparent',
												color: on ? '#fff' : 'rgba(255,255,255,0.75)',
											}}
										>
											{f}
										</button>
									);
								})}
							</div>
							<div className="mb-2 text-xs tracking-wide text-white/50">Tone</div>
							<div className="mb-4 flex flex-wrap gap-2">
								{TONES.map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => setTone(t)}
										className="rounded-full border px-3 py-1.5 text-sm"
										style={{
											borderColor: tone === t ? '#8bf0c4' : 'rgba(255,255,255,0.15)',
											background: tone === t ? '#8bf0c41a' : 'transparent',
											color: tone === t ? '#fff' : 'rgba(255,255,255,0.75)',
										}}
									>
										{t}
									</button>
								))}
							</div>
							<label className="mb-4 block">
								<span className="mb-1 block text-xs text-white/50">Any offer or discount to promote? (optional)</span>
								<input className={INPUT} value={offer} onChange={(e) => setOffer(e.target.value)} placeholder="20% off first order" />
							</label>
							<div className="grid gap-3 sm:grid-cols-3">
								<label className="block">
									<span className="mb-1 block text-xs text-white/50">Monthly budget (Rs)</span>
									<input className={INPUT} inputMode="numeric" value={budget} onChange={(e) => setBudget(e.target.value.replace(/\D/g, ''))} />
								</label>
								<label className="block">
									<span className="mb-1 block text-xs text-white/50">Who are your customers? (optional)</span>
									<input className={INPUT} value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Women 20-35" />
								</label>
								<label className="block">
									<span className="mb-1 block text-xs text-white/50">City (optional)</span>
									<input className={INPUT} value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Mumbai" />
								</label>
							</div>
							<button
								type="button"
								disabled={busy || formats.length === 0}
								onClick={() => void generate()}
								className="mt-5 rounded-full px-6 py-2.5 text-sm font-medium text-black disabled:opacity-60"
								style={{ background: '#fff' }}
							>
								{busy ? 'John is creating...' : 'Create my content'}
							</button>
						</div>
					)}
					{packs.length > 1 && (
						<div className="mt-5 flex flex-wrap gap-2">
							{packs.map((p, i) => (
								<button
									key={p.id}
									type="button"
									onClick={() => setShown(i)}
									className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/75"
									style={i === shown ? { borderColor: '#8bf0c4', color: '#fff' } : undefined}
								>
									{new Date(p.createdAt).toLocaleString()}
								</button>
							))}
						</div>
					)}
					{current && <AdPackView c={current.content} appId={current.appId} brand={sites.find((x) => x.id === current.appId)?.title ?? 'AlwaysBro'} onPost={(text, image) => setPostDraft({ text, image: image ?? null })} />}
					{selectedId && <MarketingCouncil appId={selectedId} />}
					{postDraft && selectedId && <MetaPostDialog appId={selectedId} initialText={postDraft.text} image={postDraft.image} status={meta} onClose={() => setPostDraft(null)} onDone={() => void refreshMeta()} />}
				</>
			)}
		</div>
	);
}
