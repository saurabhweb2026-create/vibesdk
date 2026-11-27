import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiClient, type JackSetupData } from '@/lib/api-client';
import { CopyButton, INPUT, LockedNotice, PANEL, SitePicker, TroopHeader, useTroopSites } from './troop-shared';

const LIME = '#14b8a6';
const TONES = [
	{ id: 'friendly', label: 'Friendly' },
	{ id: 'formal', label: 'Formal' },
	{ id: 'short', label: 'Short' },
];

interface Bubble {
	mine: boolean;
	text: string;
}

function TestChat({ appId, enabled }: { appId: string; enabled: boolean }) {
	const [bubbles, setBubbles] = useState<Bubble[]>([]);
	const [text, setText] = useState('');
	const [busy, setBusy] = useState(false);
	const visitor = useRef(`owner${Math.random().toString(36).slice(2, 10)}`);
	const end = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setBubbles([]);
	}, [appId]);
	useEffect(() => {
		end.current?.scrollIntoView({ block: 'nearest' });
	}, [bubbles]);

	const send = async () => {
		const message = text.trim();
		if (!message || busy) return;
		setText('');
		setBubbles((b) => [...b, { mine: true, text: message }]);
		setBusy(true);
		try {
			const res = await fetch('/api/jack/public/chat', {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ bot: appId, visitor: visitor.current, message }),
			});
			const data = (await res.json()) as { reply?: string; error?: string };
			setBubbles((b) => [...b, { mine: false, text: data.reply ?? data.error ?? 'Something went wrong' }]);
		} catch {
			setBubbles((b) => [...b, { mine: false, text: 'Could not connect. Please try again.' }]);
		}
		setBusy(false);
	};

	return (
		<div className={PANEL}>
			<div className="mb-3 font-label text-[11px]" style={{ color: LIME }}>
				Try Maria
			</div>
			{!enabled && <div className="mb-3 text-sm text-white/60">Switch Maria on and press Save to try him here.</div>}
			<div className="mb-3 flex h-56 flex-col gap-2 overflow-y-auto rounded-xl bg-black/30 p-3">
				{bubbles.map((b, i) => (
					<div
						key={i}
						className="max-w-[85%] whitespace-pre-wrap rounded-xl px-3 py-2 text-sm"
						style={b.mine ? { alignSelf: 'flex-end', background: LIME, color: '#000' } : { alignSelf: 'flex-start', background: '#1f1f1f', color: '#fff' }}
					>
						{b.text}
					</div>
				))}
				<div ref={end} />
			</div>
			<form
				className="flex gap-2"
				onSubmit={(e) => {
					e.preventDefault();
					send();
				}}
			>
				<input className={INPUT} value={text} onChange={(e) => setText(e.target.value)} placeholder="Ask a customer question" maxLength={500} />
				<button type="submit" disabled={busy || !enabled} className="rounded-xl px-4 text-sm font-medium text-black disabled:opacity-50" style={{ background: '#fff' }}>
					Send
				</button>
			</form>
		</div>
	);
}

export default function JackPage() {
	const { data, error, sites, selectedId, select } = useTroopSites();
	const [setup, setSetup] = useState<JackSetupData | null>(null);
	const [saving, setSaving] = useState(false);

	const load = useCallback(async (appId: string) => {
		try {
			const res = await apiClient.getJackSetup(appId);
			if (res.data) setSetup(res.data);
		} catch {
			// the API client already shows the reason
		}
	}, []);

	useEffect(() => {
		setSetup(null);
		if (selectedId && data?.access.jack) load(selectedId);
	}, [selectedId, data?.access.jack, load]);

	const patch = (p: Partial<JackSetupData>) => setSetup((s) => (s ? { ...s, ...p } : s));

	const connect = async () => {
		if (!setup) return;
		setSaving(true);
		try {
			await apiClient.saveJackSetup({
				appId: setup.appId,
				businessName: setup.businessName,
				knowledge: setup.knowledge,
				tone: setup.tone,
				greeting: setup.greeting,
				enabled: true,
			});
			patch({ enabled: true });
			toast.success('Maria is connected to your website');
		} catch {
			// the API client already shows the reason
		}
		setSaving(false);
	};

	const save = async () => {
		if (!setup) return;
		setSaving(true);
		try {
			await apiClient.saveJackSetup({
				appId: setup.appId,
				businessName: setup.businessName,
				knowledge: setup.knowledge,
				tone: setup.tone,
				greeting: setup.greeting,
				enabled: setup.enabled,
			});
			toast.success('Maria is updated');
		} catch {
			// the API client already shows the reason
		}
		setSaving(false);
	};

	return (
		<div className="mx-auto max-w-3xl px-5 py-8 text-white">
			<title>Maria - AlwaysBro</title>
			<TroopHeader face="/troop/maria-face.webp" name="Maria" color={LIME} role="Customer support" line="Teach me your business and I will answer your customers." />
			{error && <div className={PANEL}>{error}</div>}
			{data && !data.access.jack && <LockedNotice agent="Maria" />}
			{data && data.access.jack && (
				<>
					<SitePicker sites={sites} selectedId={selectedId} onSelect={select} />
					{setup && (
						<div className="grid gap-4">
							<div className={PANEL}>
								<div className="mb-3 flex items-center justify-between">
									<div className="font-label text-[11px]" style={{ color: LIME }}>
										What Maria knows
									</div>
									<label className="flex cursor-pointer items-center gap-2 text-sm text-white/85">
										<input type="checkbox" checked={setup.enabled} onChange={(e) => patch({ enabled: e.target.checked })} className="size-4 accent-[#8bf0c4]" />
										Maria is on
									</label>
								</div>
								<label className="mb-3 block">
									<span className="mb-1 block text-xs text-white/50">Business name</span>
									<input className={INPUT} value={setup.businessName} onChange={(e) => patch({ businessName: e.target.value })} />
								</label>
								<label className="mb-3 block">
									<span className="mb-1 block text-xs text-white/50">Add what customers ask: prices, timings, address, offers, policies</span>
									<textarea
										className={`${INPUT} min-h-40`}
										value={setup.knowledge}
										onChange={(e) => patch({ knowledge: e.target.value })}
										placeholder={'Open: 10am to 8pm, Monday to Saturday\nHaircut: Rs 400\nAddress: ...\nWe accept UPI and cash'}
									/>
								</label>
								<div className="mb-3">
									<span className="mb-1 block text-xs text-white/50">How Maria talks</span>
									<div className="flex flex-wrap gap-2">
										{TONES.map((t) => (
											<button
												key={t.id}
												type="button"
												onClick={() => patch({ tone: t.id })}
												className="rounded-full border px-3 py-1.5 text-sm"
												style={{
													borderColor: setup.tone === t.id ? '#8bf0c4' : 'rgba(255,255,255,0.15)',
													background: setup.tone === t.id ? '#8bf0c41a' : 'transparent',
												}}
											>
												{t.label}
											</button>
										))}
									</div>
								</div>
								<label className="mb-4 block">
									<span className="mb-1 block text-xs text-white/50">First message customers see</span>
									<input className={INPUT} value={setup.greeting} onChange={(e) => patch({ greeting: e.target.value })} maxLength={200} />
								</label>
								<button type="button" disabled={saving} onClick={save} className="rounded-full px-6 py-2.5 text-sm font-medium text-black disabled:opacity-60" style={{ background: '#fff' }}>
									{saving ? 'Saving...' : 'Save'}
								</button>
							</div>

							<TestChat appId={setup.appId} enabled={setup.enabled} />

							<div className={PANEL}>
								<div className="mb-2 font-label text-[11px]" style={{ color: LIME }}>
									Your website
								</div>
								{setup.enabled ? (
									<p className="text-sm text-white/85">I am connected. Visitors now see my chat bubble on your website.</p>
								) : (
									<>
										<p className="mb-3 text-sm text-white/85">Should I connect to your website?</p>
										<div className="flex gap-2">
											<button
												type="button"
												disabled={saving}
												onClick={connect}
												className="rounded-full px-6 py-2.5 text-sm font-medium text-black disabled:opacity-60"
												style={{ background: '#fff' }}
											>
												Yes, connect
											</button>
											<button type="button" onClick={() => toast('No problem. I will wait until you are ready.')} className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-white hover:bg-white/10">
												No, not now
											</button>
										</div>
									</>
								)}
								<details className="mt-4 text-xs text-white/50">
									<summary className="cursor-pointer">Website not built here? Show the code line</summary>
									<div className="mt-2 flex items-start gap-3 rounded-xl bg-black/30 p-3">
										<code className="min-w-0 flex-1 break-all text-white/85">{setup.embedSnippet}</code>
										<CopyButton text={setup.embedSnippet} label="Code copied" />
									</div>
								</details>
							</div>

							<div className={PANEL}>
								<div className="mb-3 font-label text-[11px]" style={{ color: LIME }}>
									Customers who left their details
								</div>
								{setup.leads.length === 0 && <div className="text-sm text-white/55">Nobody yet. When Maria cannot answer, he asks for a phone number or email and it shows here.</div>}
								{setup.leads.map((l, i) => (
									<div key={i} className="border-b border-white/5 py-2 text-sm last:border-0">
										<div className="text-white">{l.contact}</div>
										<div className="text-xs text-white/50">
											{l.note} - {new Date(l.createdAt).toLocaleString()}
										</div>
									</div>
								))}
							</div>

							<div className={PANEL}>
								<div className="mb-3 font-label text-[11px]" style={{ color: LIME }}>
									Recent chats
								</div>
								{setup.conversations.length === 0 && <div className="text-sm text-white/55">No chats yet.</div>}
								{setup.conversations.map((c) => (
									<details key={c.visitorId} className="border-b border-white/5 py-2 last:border-0">
										<summary className="cursor-pointer text-sm text-white/90">
											{c.turns.find((t) => t.role === 'user')?.content.slice(0, 70) ?? 'Chat'}
											{c.needsHuman && <span className="ml-2 rounded-full border border-orange-400/60 px-2 text-[10px] text-orange-300">Needs you</span>}
										</summary>
										<div className="mt-2 space-y-1 text-sm">
											{c.turns.map((t, i) => (
												<div key={i} className={t.role === 'user' ? 'text-white' : 'text-white/60'}>
													{t.role === 'user' ? 'Customer: ' : 'Maria: '}
													{t.content}
												</div>
											))}
										</div>
									</details>
								))}
							</div>
						</div>
					)}
				</>
			)}
		</div>
	);
}
