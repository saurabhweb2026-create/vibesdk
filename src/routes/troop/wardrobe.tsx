import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { CheckIcon, CoinsIcon, LockSimpleIcon } from '@phosphor-icons/react';
import { WavingCharacter } from '@/components/brand/waving-character';
import { apiClient, type TeamData, type WardrobeItem, type WardrobeSlot } from '@/lib/api-client';
import { PERSON_AGENT, lookOf, syncWorn, type Look, type TroopPerson } from '@/lib/outfits';

const PEOPLE: Array<{ person: TroopPerson; color: string }> = [
	{ person: 'jack', color: '#3b82f6' },
	{ person: 'john', color: '#ec4899' },
	{ person: 'maria', color: '#14b8a6' },
];

const SLOTS: Array<{ slot: WardrobeSlot; label: string; none: string }> = [
	{ slot: 'set', label: 'Full outfits', none: 'Everyday' },
	{ slot: 'head', label: 'Hats and shades', none: 'Nothing' },
	{ slot: 'top', label: 'Tops', none: 'Original' },
	{ slot: 'bottom', label: 'Jeans and trousers', none: 'Original' },
	{ slot: 'shoes', label: 'Shoes', none: 'Original' },
];

const isPerson = (value: string | null): value is TroopPerson => PEOPLE.some((p) => p.person === value);

/** Wardrobe: pick a teammate and a clothing type, try items on for free, pay credits to keep them. */
export default function WardrobePage() {
	const [params] = useSearchParams();
	const [data, setData] = useState<TeamData | null>(null);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);
	const initialWho = params.get('who');
	const [who, setWho] = useState<TroopPerson>(isPerson(initialWho) ? initialWho : 'jack');
	const [slot, setSlot] = useState<WardrobeSlot>('head');
	/** Items being tried on, one per slot; these show on the preview but are not yet worn. */
	const [trying, setTrying] = useState<Partial<Record<WardrobeSlot, string | null>>>({});

	const reload = useCallback(async () => {
		try {
			const res = await apiClient.getTeam();
			if (!res.data) throw new Error('empty');
			setData(res.data);
			syncWorn(res.data.members, res.data.items);
		} catch {
			setError('Could not load your wardrobe');
		}
	}, []);

	useEffect(() => void reload(), [reload]);

	useEffect(() => {
		const wanted = data?.items.find((i) => i.id === params.get('item'));
		if (wanted) {
			setSlot(wanted.slot);
			setTrying((t) => ({ ...t, [wanted.slot]: wanted.id }));
		}
	}, [data, params]);

	const member = data?.members.find((m) => m.id === PERSON_AGENT[who]);
	const items = data?.items ?? [];
	const byId = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);
	const worn = member?.wearing ?? {};

	const previewLook: Look = useMemo(() => {
		if (!member) return {};
		const look = lookOf(member, items);
		for (const [s, id] of Object.entries(trying) as Array<[WardrobeSlot, string | null]>) {
			const item = id ? byId.get(id) : undefined;
			if (item) look[s] = { id: item.id, color: item.color };
			else delete look[s];
		}
		return look;
	}, [member, items, trying, byId]);

	const pending = (Object.keys(trying) as WardrobeSlot[]).filter((s) => (trying[s] ?? null) !== (worn[s] ?? null));
	const toBuy = pending.map((s) => (trying[s] ? byId.get(trying[s] as string) : undefined)).filter((i): i is WardrobeItem => Boolean(i) && !data?.owned.includes((i as WardrobeItem).id));
	const cost = toBuy.reduce((sum, i) => sum + i.price, 0);
	const short = data !== null && data.balance < cost;
	const personColor = PEOPLE.find((p) => p.person === who)?.color ?? '#8bf0c4';

	const choose = (id: string | null) => setTrying((t) => ({ ...t, [slot]: id }));

	const apply = async () => {
		if (!member) return;
		setBusy(true);
		try {
			for (const item of toBuy) await apiClient.buyItem(item.id);
			for (const s of pending) await apiClient.wearItem(member.id, s, trying[s] ?? null);
			if (toBuy.length) toast.success(toBuy.length === 1 ? `${toBuy[0].name} is yours` : 'New clothes are yours');
			setTrying({});
			await reload();
		} catch {
			// the API client already shows the reason
		} finally {
			setBusy(false);
		}
	};

	const label = pending.length === 0 ? 'Try something on' : cost > 0 ? `Buy and wear for ${cost} credits` : `Make ${member?.name ?? ''} wear it`;
	const slotItems = items.filter((i) => i.slot === slot);
	const slotInfo = SLOTS.find((s) => s.slot === slot) ?? SLOTS[0];
	const current = slot in trying ? trying[slot] ?? null : worn[slot] ?? null;

	return (
		<div className="mx-auto max-w-5xl px-5 py-8 text-white">
			<title>Wardrobe - AlwaysBro</title>
			<h1 className="text-future text-4xl font-medium tracking-[-0.03em]">Wardrobe</h1>
			<p className="mt-1 text-sm text-white/60">Mix tops, jeans, shoes and hats. Try everything for free and pay credits only for what you keep.</p>
			{error && <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm">{error}</div>}
			{data && member && (
				<>
					<div className="mt-5 flex flex-wrap items-center gap-2">
						{PEOPLE.map((p) => {
							const m = data.members.find((x) => x.id === PERSON_AGENT[p.person]);
							const active = who === p.person;
							return (
								<button
									key={p.person}
									type="button"
									onClick={() => {
										setWho(p.person);
										setTrying({});
									}}
									className="font-label rounded-full border px-4 py-1.5 text-[11px] transition-colors"
									style={{ borderColor: active ? p.color : 'rgba(255,255,255,0.15)', background: active ? `${p.color}26` : 'transparent' }}
								>
									{m?.name ?? p.person}
								</button>
							);
						})}
						<span className="ml-auto inline-flex items-center gap-1.5 text-sm text-white/70">
							<CoinsIcon className="size-4 text-[#8bf0c4]" weight="fill" />
							<span className="font-semibold text-white">{data.balance}</span> credits
						</span>
					</div>

					<div className="mt-6 grid items-start gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
						<div
							className="flex min-h-[26rem] flex-col items-center justify-end rounded-3xl border border-white/10 px-6 pt-8 pb-6"
							style={{ background: `radial-gradient(circle at 50% 35%, ${personColor}33, transparent 65%), rgba(255,255,255,0.03)` }}
						>
							<WavingCharacter person={who} color={personColor} look={previewLook} className="h-80" />
							<button
								type="button"
								disabled={busy || pending.length === 0 || short || !data.canCustomize}
								onClick={apply}
								className="mt-4 w-full rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:bg-white/85 disabled:opacity-50"
							>
								{short ? 'Not enough credits' : label}
							</button>
							{!data.canCustomize && <p className="mt-2 text-xs text-white/50">Buying clothes is part of the Pro plan.</p>}
							{pending.length > 0 && (
								<button type="button" onClick={() => setTrying({})} className="mt-2 text-xs text-white/60 hover:text-white">
									Reset
								</button>
							)}
						</div>

						<div>
							<div className="flex flex-wrap gap-2">
								{SLOTS.map((s) => (
									<button
										key={s.slot}
										type="button"
										onClick={() => setSlot(s.slot)}
										className="font-label rounded-full border px-3.5 py-1.5 text-[11px] transition-colors"
										style={{ borderColor: slot === s.slot ? '#8bf0c4' : 'rgba(255,255,255,0.15)', background: slot === s.slot ? 'rgba(139,240,196,0.12)' : 'transparent' }}
									>
										{s.label}
									</button>
								))}
							</div>
							<div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
								{[null, ...slotItems].map((t) => {
									const id = t?.id ?? null;
									const have = t === null || data.owned.includes(t.id);
									const active = current === id;
									const on = (worn[slot] ?? null) === id;
									const color = t?.color ?? '#8bf0c4';
									return (
										<button
											key={id ?? 'none'}
											type="button"
											onClick={() => choose(id)}
											className="relative flex flex-col items-start rounded-2xl border p-4 text-left transition-transform hover:-translate-y-0.5"
											style={{ borderColor: active ? color : 'rgba(255,255,255,0.12)', background: active ? `${color}1f` : 'rgba(255,255,255,0.03)' }}
										>
											<span className="size-9 rounded-full" style={{ background: t ? `radial-gradient(circle at 30% 30%, #fff8, ${color})` : 'rgba(255,255,255,0.12)' }} />
											<span className="mt-3 text-sm font-medium">{t?.name ?? slotInfo.none}</span>
											<span className="font-label mt-1 text-[10px] text-white/50">{on ? 'Wearing' : have ? 'Owned' : `${t.price} credits`}</span>
											{on ? (
												<CheckIcon className="absolute right-3 top-3 size-4 text-[#8bf0c4]" weight="bold" />
											) : (
												!have && <LockSimpleIcon className="absolute right-3 top-3 size-4 text-white/40" />
											)}
										</button>
									);
								})}
							</div>
							<p className="mt-4 text-xs text-white/45">A full outfit replaces tops, jeans and shoes while it is on. Hats and shades only fit the everyday and festive looks.</p>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
