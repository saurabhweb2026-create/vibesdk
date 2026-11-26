import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router';
import { toast } from 'sonner';
import { apiClient, type TroopSitesData } from '@/lib/api-client';

export const PANEL = 'rounded-2xl border border-white/10 bg-white/[0.03] p-5';
export const INPUT =
	'w-full rounded-xl border border-white/15 bg-black/30 px-3 py-2 text-sm text-white placeholder:text-white/35 outline-none focus:border-white/40';

export function useTroopSites() {
	const [data, setData] = useState<TroopSitesData | null>(null);
	const [error, setError] = useState('');
	const [params, setParams] = useSearchParams();

	useEffect(() => {
		let alive = true;
		apiClient
			.getTroopSites()
			.then((res) => {
				if (!alive) return;
				if (res.data) setData(res.data);
				else setError('Could not load your websites');
			})
			.catch((e: unknown) => {
				if (alive) setError(e instanceof Error ? e.message : 'Could not load your websites');
			});
		return () => {
			alive = false;
		};
	}, []);

	const wanted = params.get('site') ?? '';
	const sites = data?.sites ?? [];
	const selectedId = sites.some((s) => s.id === wanted) ? wanted : (sites[0]?.id ?? '');
	const select = (id: string) => setParams({ site: id }, { replace: true });

	return { data, error, sites, selectedId, select };
}

export async function copyText(text: string, label = 'Copied') {
	try {
		await navigator.clipboard.writeText(text);
		toast.success(label);
	} catch {
		toast.error('Could not copy. Please select the text and copy it.');
	}
}

export function CopyButton({ text, label }: { text: string; label?: string }) {
	return (
		<button
			type="button"
			onClick={() => copyText(text, label)}
			className="shrink-0 rounded-lg border border-white/15 px-2.5 py-1 text-xs text-white/80 hover:bg-white/10"
		>
			Copy
		</button>
	);
}

export function TroopHeader({ face, name, color, role, line }: { face: string; name: string; color: string; role: string; line: string }) {
	return (
		<div className="mb-6 flex items-center gap-4">
			<img
				src={face}
				alt={name}
				className="size-16 rounded-full border-2 bg-[#120c0a] object-cover"
				style={{ borderColor: color, boxShadow: `0 0 24px ${color}55` }}
				draggable={false}
			/>
			<div>
				<div className="font-mono text-xs uppercase tracking-widest" style={{ color }}>
					{name} - {role}
				</div>
				<div className="text-lg font-semibold text-white">{line}</div>
			</div>
		</div>
	);
}

export function SitePicker({
	sites,
	selectedId,
	onSelect,
}: {
	sites: Array<{ id: string; title: string }>;
	selectedId: string;
	onSelect: (id: string) => void;
}) {
	if (sites.length === 0) {
		return (
			<div className={PANEL}>
				<div className="text-white">You have no websites yet.</div>
				<a href="/" className="mt-2 inline-block text-sm text-[#fdba74] underline">
					Ask Caesar to build your first website
				</a>
			</div>
		);
	}
	return (
		<label className="mb-5 block">
			<span className="mb-1.5 block text-xs uppercase tracking-wider text-white/50">Website</span>
			<select value={selectedId} onChange={(e) => onSelect(e.target.value)} className={INPUT}>
				{sites.map((s) => (
					<option key={s.id} value={s.id} className="bg-neutral-900">
						{s.title}
					</option>
				))}
			</select>
		</label>
	);
}

export function LockedNotice({ agent }: { agent: 'Louie' | 'Jack' }) {
	return (
		<div className={PANEL}>
			<div className="font-semibold text-white">{agent} is a paid helper</div>
			<p className="mt-1 text-sm text-white/65">
				Subscribe to {agent} on his own, or take Pro to get all three. Use the plans button at the top right of the screen.
			</p>
		</div>
	);
}
