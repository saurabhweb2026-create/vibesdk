import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { CheckIcon, CoinsIcon, LockSimpleIcon } from '@phosphor-icons/react';
import { WavingCharacter } from '@/components/brand/waving-character';
import { apiClient, type TeamData } from '@/lib/api-client';
import { PERSON_AGENT, artOutfit, syncWorn, type TroopPerson } from '@/lib/outfits';

const PEOPLE: Array<{ person: TroopPerson; color: string }> = [
	{ person: 'jack', color: '#3b82f6' },
	{ person: 'john', color: '#ec4899' },
	{ person: 'maria', color: '#14b8a6' },
];

const EVERYDAY = { id: null, name: 'Everyday', price: 0, color: '#8bf0c4', perk: 'Your team as they arrived' };

const isPerson = (value: string | null): value is TroopPerson => PEOPLE.some((p) => p.person === value);

/** Snapchat-style wardrobe: pick a teammate, try any look on for free, pay credits to keep it. */
export default function WardrobePage() {
	const [params] = useSearchParams();
	const [data, setData] = useState<TeamData | null>(null);
	const [error, setError] = useState('');
	const [busy, setBusy] = useState(false);
	const initialWho = params.get('who');
	const [who, setWho] = useState<TroopPerson>(isPerson(initialWho) ? initialWho : 'jack');
	const [trying, setTrying] = useState<string | null>(params.get('outfit'));

	const reload = useCallback(async () => {
		try {
			const res = await apiClient.getTeam();
			if (!res.data) throw new Error('empty');
			setData(res.data);
			syncWorn(Object.fromEntries(res.data.members.map((m) => [m.id, m.outfit])));
		} catch {
			setError('Could not load your wardrobe');
		}
	}, []);

	useEffect(() => void reload(), [reload]);

	const member = data?.members.find((m) => m.id === PERSON_AGENT[who]);
	const tiles = useMemo(() => (data ? [EVERYDAY, ...data.outfits] : []), [data]);
	const selected = tiles.find((t) => t.id === trying) ?? EVERYDAY;
	const owned = selected.id === null || Boolean(data?.owned.includes(selected.id));
	const wearing = (member?.outfit ?? null) === selected.id;
	const personColor = PEOPLE.find((p) => p.person === who)?.color ?? '#8bf0c4';

	const apply = async () => {
		if (!data || !member) return;
		setBusy(true);
		try {
			if (!owned && selected.id) {
				await apiClient.buyOutfit(selected.id);
				toast.success(`${selected.name} is yours`);
			}
			await apiClient.equipOutfit(member.id, selected.id);
			await reload();
		} catch {
			// the API client already shows the reason
		} finally {
			setBusy(false);
		}
	};

	const label = wearing ? 'Wearing now' : owned ? `Make ${member?.name ?? ''} wear it` : `Buy for ${selected.price} credits`;
	const short = !owned && data !== null && data.balance < selected.price;

	return (
		<div className="mx-auto max-w-5xl px-5 py-8 text-white">
			<title>Wardrobe - AlwaysBro</title>
			<h1 className="text-future text-4xl font-medium tracking-[-0.03em]">Wardrobe</h1>
			<p className="mt-1 text-sm text-white/60">Try any look for free. Pay credits only for the ones you keep.</p>
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
									onClick={() => setWho(p.person)}
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

					<div className="mt-6 grid items-center gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
						<div
							className="flex min-h-[26rem] flex-col items-center justify-end rounded-3xl border border-white/10 px-6 pt-8 pb-6"
							style={{ background: `radial-gradient(circle at 50% 35%, ${selected.color}33, transparent 65%), rgba(255,255,255,0.03)` }}
						>
							<WavingCharacter person={who} color={selected.id ? selected.color : personColor} preview={artOutfit(selected.id)} className="h-80" />
							<div className="mt-4 text-center">
								<div className="text-lg font-medium">{selected.name}</div>
								<div className="text-xs text-white/60">{selected.perk}</div>
							</div>
							<button
								type="button"
								disabled={busy || wearing || short || !data.canCustomize}
								onClick={apply}
								className="mt-4 w-full rounded-full bg-white px-5 py-2.5 text-sm font-medium text-black transition-opacity hover:bg-white/85 disabled:opacity-50"
							>
								{short ? 'Not enough credits' : label}
							</button>
						</div>

						<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
							{tiles.map((t) => {
								const have = t.id === null || data.owned.includes(t.id);
								const active = selected.id === t.id;
								const worn = (member.outfit ?? null) === t.id;
								return (
									<button
										key={t.id ?? 'everyday'}
										type="button"
										onClick={() => setTrying(t.id)}
										className="relative flex flex-col items-start rounded-2xl border p-4 text-left transition-transform hover:-translate-y-0.5"
										style={{ borderColor: active ? t.color : 'rgba(255,255,255,0.12)', background: active ? `${t.color}1f` : 'rgba(255,255,255,0.03)' }}
									>
										<span className="size-9 rounded-full" style={{ background: `radial-gradient(circle at 30% 30%, #fff8, ${t.color})` }} />
										<span className="mt-3 text-sm font-medium">{t.name}</span>
										<span className="font-label mt-1 text-[10px] text-white/50">{worn ? 'Wearing' : have ? 'Owned' : `${t.price} credits`}</span>
										{worn ? (
											<CheckIcon className="absolute right-3 top-3 size-4 text-[#8bf0c4]" weight="bold" />
										) : (
											!have && <LockSimpleIcon className="absolute right-3 top-3 size-4 text-white/40" />
										)}
									</button>
								);
							})}
						</div>
					</div>
				</>
			)}
		</div>
	);
}
