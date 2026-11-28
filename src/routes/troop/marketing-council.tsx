import { useState } from 'react';
import { toast } from 'sonner';
import { apiClient, type CouncilResult } from '@/lib/api-client';
import { INPUT, PANEL } from './troop-shared';

const IDEAS = ['How should I position my business against competitors?', 'What offer would get more customers to buy?', 'Where should I spend my ad budget first?'];

/** John's board of famous marketers: ask a business question and see where they disagree. */
export function MarketingCouncil({ appId }: { appId: string }) {
	const [question, setQuestion] = useState('');
	const [busy, setBusy] = useState(false);
	const [result, setResult] = useState<CouncilResult | null>(null);

	const convene = async () => {
		setBusy(true);
		try {
			const res = await apiClient.askCouncil(appId, question);
			if (res.data) setResult(res.data);
		} catch (error) {
			toast.error(error instanceof Error ? error.message : 'The council could not meet');
		} finally {
			setBusy(false);
		}
	};

	return (
		<div className={`${PANEL} mt-6`}>
			<div className="font-label text-[11px] text-[#ec4899]">Marketing council</div>
			<p className="mt-1 text-sm text-white/60">Ask a business decision. A board of famous marketers answers and shows where they disagree.</p>
			<textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={2} placeholder="What do you want to decide?" className={`${INPUT} mt-3`} />
			<div className="mt-2 flex flex-wrap gap-2">
				{IDEAS.map((idea) => (
					<button key={idea} type="button" onClick={() => setQuestion(idea)} className="rounded-full border border-white/15 px-3 py-1 text-xs text-white/70 hover:text-white">
						{idea}
					</button>
				))}
			</div>
			<button
				type="button"
				disabled={busy || question.trim().length < 8}
				onClick={convene}
				className="mt-3 rounded-full bg-white px-5 py-2 text-sm font-medium text-black hover:bg-white/85 disabled:opacity-50"
			>
				{busy ? 'The council is meeting...' : 'Ask the council'}
			</button>

			{result && (
				<div className="mt-5 space-y-4">
					<p className="font-label text-[10px] text-white/40">Simulated council. Each take applies the advisor's published ideas, not their actual review.</p>
					{result.seated.map((s) => (
						<div key={s.advisor} className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
							<div className="text-sm font-medium">{s.advisor}</div>
							<p className="mt-2 text-sm text-white/80">{s.take}</p>
							<p className="mt-2 text-sm text-[#8bf0c4]">{s.bottomLine}</p>
						</div>
					))}
					{result.disagreements.length > 0 && (
						<div>
							<div className="font-label mb-2 text-[11px] text-[#ec4899]">Where they disagree</div>
							{result.disagreements.map((d, i) => (
								<div key={i} className="mb-2 rounded-xl border border-white/10 p-4 text-sm">
									<p className="text-white/90">{d.conflict}</p>
									<p className="mt-1 text-white/60">Trade-off: {d.tradeoff}</p>
									<p className="mt-1 text-white/60">To settle it: {d.test}</p>
								</div>
							))}
						</div>
					)}
					<div className="rounded-xl border border-[#8bf0c4]/30 bg-[#8bf0c4]/5 p-4 text-sm">
						<div className="font-label mb-1 text-[11px] text-[#8bf0c4]">Recommendation</div>
						<p>{result.recommendation}</p>
						<ul className="mt-2 list-disc space-y-1 pl-5 text-white/85">
							{result.doNext.map((step) => (
								<li key={step}>{step}</li>
							))}
						</ul>
						{result.tripwire && <p className="mt-2 text-white/60">Watch for: {result.tripwire}</p>}
					</div>
				</div>
			)}
		</div>
	);
}
