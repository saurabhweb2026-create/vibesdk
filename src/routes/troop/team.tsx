import { WavingCharacter, type TroopPerson } from '@/components/brand/waving-character';
import { OutfitPicker } from '@/components/outfit-ask';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { apiClient, type AgentId, type TeamData, type TeamMember } from '@/lib/api-client';
import { INPUT, PANEL } from './troop-shared';

const FACE: Record<AgentId, TroopPerson> = { caesar: 'jack', louie: 'john', jack: 'maria' };
const COLOR: Record<AgentId, string> = { caesar: '#3b82f6', louie: '#ec4899', jack: '#14b8a6' };

function Bar({ value, color }: { value: number; color: string }) {
	return (
		<div className="h-1.5 overflow-hidden rounded-full bg-white/10">
			<div className="h-full rounded-full transition-all" style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
		</div>
	);
}

function MemberCard({ m, data, reload }: { m: TeamMember; data: TeamData; reload: () => void }) {
	const [name, setName] = useState(m.name);
	const [busy, setBusy] = useState(false);
	const [reply, setReply] = useState('');
	const color = COLOR[m.id];
	const outfit = data.outfits.find((o) => o.id === m.outfit);
	const ringColor = outfit?.color ?? color;
	const xpBase = m.nextLevelXp ? m.xp / m.nextLevelXp : 1;

	useEffect(() => setName(m.name), [m.name]);

	const run = async (action: () => Promise<void>) => {
		setBusy(true);
		try {
			await action();
			reload();
		} catch {
			// the API client already shows the reason
		}
		setBusy(false);
	};

	return (
		<div className={PANEL}>
			<div className="flex items-start gap-4">
				<div
					className="relative shrink-0 overflow-hidden rounded-2xl bg-white/[0.04] px-2"
					style={{ boxShadow: `0 0 0 3px ${ringColor}, 0 0 24px ${ringColor}66` }}
				>
					<WavingCharacter person={FACE[m.id]} color={ringColor} className="h-40" />
					{outfit && (
						<span className="absolute inset-x-0 bottom-0 bg-black/70 px-1 py-0.5 text-center text-[11px] text-white">{outfit.name}</span>
					)}
				</div>
				<div className="min-w-0 flex-1">
					<div className="text-base font-semibold text-white">{m.name}</div>
					<div className="text-sm text-white/60">{m.role}</div>
					<div className="mt-3 text-xs text-white/60">Level {m.level}</div>
					<Bar value={xpBase * 100} color={color} />
					<div className="mt-3 text-xs text-white/60">Morale {m.morale}%</div>
					<Bar value={m.morale} color="#facc15" />
				</div>
			</div>

			{data.canCustomize ? (
				<div className="mt-4 flex gap-2">
					<input className={INPUT} value={name} maxLength={20} onChange={(e) => setName(e.target.value)} aria-label={`Name for ${m.name}`} />
					<button
						type="button"
						disabled={busy || name.trim() === m.name}
						onClick={() => run(async () => void (await apiClient.renameTeamMember(m.id, name)))}
						className="shrink-0 rounded-xl border border-white/15 px-4 text-sm text-white hover:bg-white/10 disabled:opacity-50"
					>
						Rename
					</button>
				</div>
			) : (
				<p className="mt-4 text-xs text-white/50">Renaming and outfits are part of the Pro plan.</p>
			)}

			<div className="mt-4 text-xs text-white/60">Give a bonus for good work</div>
			<div className="mt-2 flex flex-wrap gap-2">
				{data.bonusAmounts.map((amount) => (
					<button
						key={amount}
						type="button"
						disabled={busy || data.balance < amount}
						onClick={() =>
							run(async () => {
								const res = await apiClient.giveBonus(m.id, amount);
								if (res.data) setReply(res.data.reply);
							})
						}
						className="rounded-full px-3.5 py-1.5 text-sm font-medium text-white disabled:opacity-40"
						style={{ background: color }}
					>
						{amount} credits
					</button>
				))}
			</div>
			{reply && <p className="mt-3 rounded-xl bg-white/5 p-3 text-sm italic text-white/80">{m.name}: {reply}</p>}

			<div className="mt-5 text-xs text-white/60">Story</div>
			<ol className="mt-2 space-y-2 border-l border-white/15 pl-4">
				{m.story.map((line, i) => (
					<li key={i} className="text-sm text-white/85">
						<span className="mr-2 text-xs text-white/45">Chapter {i + 1}</span>
						{line}
					</li>
				))}
			</ol>

			{data.canCustomize && data.owned.length > 0 && (
				<div className="mt-5 flex flex-wrap gap-2">
					<button
						type="button"
						disabled={busy || m.outfit === null}
						onClick={() => run(async () => void (await apiClient.equipOutfit(m.id, null)))}
						className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/75 disabled:opacity-40"
					>
						No outfit
					</button>
					{data.outfits
						.filter((o) => data.owned.includes(o.id))
						.map((o) => (
							<button
								key={o.id}
								type="button"
								disabled={busy}
								onClick={() => run(async () => void (await apiClient.equipOutfit(m.id, o.id)))}
								className="rounded-full border px-3 py-1 text-xs text-white"
								style={{ borderColor: m.outfit === o.id ? o.color : 'rgba(255,255,255,0.15)', background: m.outfit === o.id ? `${o.color}33` : 'transparent' }}
							>
								{o.name}
							</button>
						))}
				</div>
			)}
		</div>
	);
}

export default function TeamPage() {
	const [data, setData] = useState<TeamData | null>(null);
	const [error, setError] = useState('');

	const reload = useCallback(() => {
		apiClient
			.getTeam()
			.then((res) => {
				if (res.data) setData(res.data);
				else setError('Could not load your team');
			})
			.catch((e: unknown) => setError(e instanceof Error ? e.message : 'Could not load your team'));
	}, []);

	useEffect(reload, [reload]);

	const buy = async (id: string) => {
		try {
			await apiClient.buyOutfit(id);
			toast.success('Outfit bought');
			reload();
		} catch {
			// the API client already shows the reason
		}
	};

	return (
		<div className="mx-auto max-w-5xl px-5 py-8 text-white">
			<title>Your team - AlwaysBro</title>
			<h1 className="text-4xl font-medium tracking-[-0.03em]">Your team</h1>
			<div className="mt-4"><OutfitPicker /></div>
			<p className="mt-1 text-sm text-white/60">
				Jack, John and Maria grow as they work for you. Reward good work with a bonus and watch their story unfold.
			</p>
			{error && <div className={`${PANEL} mt-4`}>{error}</div>}
			{data && (
				<>
					<div className="mt-4 text-sm text-white/70">Your credits: <span className="font-semibold text-white">{data.balance}</span></div>
					<div className="mt-4 grid gap-4 md:grid-cols-3">
						{data.members.map((m) => (
							<MemberCard key={m.id} m={m} data={data} reload={reload} />
						))}
					</div>
					<h2 className="mt-8 text-xl font-medium tracking-[-0.02em]">Outfit shop</h2>
					<div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
						{data.outfits.map((o) => {
							const owned = data.owned.includes(o.id);
							return (
								<div key={o.id} className={PANEL} style={{ borderColor: `${o.color}66` }}>
									<div className="text-sm font-semibold" style={{ color: o.color }}>{o.name}</div>
									<div className="mt-1 min-h-8 text-xs text-white/60">{o.perk}</div>
									<button
										type="button"
										disabled={owned || !data.canCustomize || data.balance < o.price}
										onClick={() => buy(o.id)}
										className="mt-3 w-full rounded-full border border-white/15 px-3 py-1.5 text-sm text-white hover:bg-white/10 disabled:opacity-50"
									>
										{owned ? 'Owned' : `${o.price} credits`}
									</button>
								</div>
							);
						})}
					</div>
				</>
			)}
		</div>
	);
}
