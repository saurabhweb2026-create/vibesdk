import { useEffect, useState, type ReactNode } from 'react';
import { toast } from 'sonner';
import { apiClient, type LouieAdContent, type LouiePack } from '@/lib/api-client';
import { CopyButton, INPUT, LockedNotice, PANEL, SitePicker, TroopHeader, useTroopSites } from './troop-shared';

const GOALS = ['Get more bookings', 'Sell more products', 'Bring more visitors', 'Launch something new'];
const FORMATS = ['Ads', 'Social posts', 'Video scripts', 'Creatives'] as const;
const TONES = ['Friendly', 'Premium', 'Fun', 'Urgent'];
const PINK = '#ec4899';

function Section({ title, children }: { title: string; children: ReactNode }) {
	return (
		<div className={PANEL}>
			<div className="mb-3 font-mono text-xs uppercase tracking-wider" style={{ color: PINK }}>
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

function AdPackView({ c }: { c: LouieAdContent }) {
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
					<Row key={i} text={`${a.headline}\n${a.primaryText}\nButton: ${a.cta}`} />
				))}
			</Section>
			<Section title="Social posts">
				{c.socialPosts.map((p, i) => (
					<Row key={i} text={`${p.caption}\n${p.hashtags.join(' ')}`} />
				))}
			</Section>
			<Section title="WhatsApp message">
				<Row text={c.whatsappMessage} />
			</Section>
			{!!c.videoScripts?.length && (
				<Section title="Video scripts">
					{c.videoScripts.map((v, i) => (
						<Row key={i} text={`${v.title}\nHook: ${v.hook}\n${v.scenes.map((sc, n) => `${n + 1}. ${sc}`).join('\n')}\nVoiceover: ${v.voiceover}\nEnd: ${v.cta}`} />
					))}
				</Section>
			)}
			{!!c.creatives?.length && (
				<Section title="Creatives">
					{c.creatives.map((cr, i) => (
						<Row key={i} text={`${cr.format}\nImage: ${cr.visual}\nText on image: ${cr.overlayText}\nCaption: ${cr.caption}`} />
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

	const generate = async () => {
		setBusy(true);
		try {
			const res = await apiClient.generateLouieAds({
				appId: selectedId,
				goal,
				budgetInr: Number(budget) || 10000,
				audience: audience || undefined,
				location: location || undefined,
				tone,
				offer: offer || undefined,
				formats,
			});
			if (res.data) {
				const pack = res.data;
				setPacks((p) => [pack, ...p]);
				setShown(0);
				toast.success('Louie finished your ads');
			}
		} catch {
			// the API client already shows the reason
		}
		setBusy(false);
	};

	const current = packs[shown];

	return (
		<div className="mx-auto max-w-3xl px-5 py-8 text-white">
			<title>Louie - Monkeytrooprs</title>
			<TroopHeader face="/troop/louie-face.webp" name="Louie" color={PINK} role="Ads" line="Tell me your goal and I will write your ads." />
			{error && <div className={PANEL}>{error}</div>}
			{data && !data.access.louie && <LockedNotice agent="Louie" />}
			{data && data.access.louie && (
				<>
					<SitePicker sites={sites} selectedId={selectedId} onSelect={select} />
					{selectedId && (
						<div className={PANEL}>
							<div className="mb-2 text-xs uppercase tracking-wider text-white/50">Your goal</div>
							<div className="mb-4 flex flex-wrap gap-2">
								{GOALS.map((g) => (
									<button
										key={g}
										type="button"
										onClick={() => setGoal(g)}
										className="rounded-full border px-3 py-1.5 text-sm"
										style={{
											borderColor: goal === g ? PINK : 'rgba(255,255,255,0.15)',
											background: goal === g ? `${PINK}22` : 'transparent',
											color: goal === g ? '#fff' : 'rgba(255,255,255,0.75)',
										}}
									>
										{g}
									</button>
								))}
							</div>
							<div className="mb-2 text-xs uppercase tracking-wider text-white/50">What should I create?</div>
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
												borderColor: on ? PINK : 'rgba(255,255,255,0.15)',
												background: on ? `${PINK}22` : 'transparent',
												color: on ? '#fff' : 'rgba(255,255,255,0.75)',
											}}
										>
											{f}
										</button>
									);
								})}
							</div>
							<div className="mb-2 text-xs uppercase tracking-wider text-white/50">Tone</div>
							<div className="mb-4 flex flex-wrap gap-2">
								{TONES.map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => setTone(t)}
										className="rounded-full border px-3 py-1.5 text-sm"
										style={{
											borderColor: tone === t ? PINK : 'rgba(255,255,255,0.15)',
											background: tone === t ? `${PINK}22` : 'transparent',
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
								onClick={generate}
								className="mt-5 rounded-full px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
								style={{ background: PINK, boxShadow: `0 0 24px ${PINK}55` }}
							>
								{busy ? 'Louie is creating...' : 'Create my content'}
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
									style={i === shown ? { borderColor: PINK, color: '#fff' } : undefined}
								>
									{new Date(p.createdAt).toLocaleString()}
								</button>
							))}
						</div>
					)}
					{current && <AdPackView c={current.content} />}
				</>
			)}
		</div>
	);
}
