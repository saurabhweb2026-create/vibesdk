import { AnimatePresence, motion } from 'framer-motion';
import { SpeakerHighIcon } from '@phosphor-icons/react';
import { OUTFITS, OUTFIT_ORDER, answerOccasion, pendingOccasion, setOutfit, useOutfit, type TroopPerson } from '@/lib/outfits';
import { canSpeak, speak } from '@/lib/voice';

const ASKERS: Array<{ person: TroopPerson; name: string }> = [
	{ person: 'maria', name: 'Maria' },
	{ person: 'john', name: 'John' },
	{ person: 'jack', name: 'Jack' },
];

/** When a festival is near, a teammate asks to change into the matching outfit. */
export function OutfitAsk() {
	const { faceSrc, answered } = useOutfit();
	const occasion = answered && pendingOccasion();
	const asker = ASKERS[new Date().getDate() % ASKERS.length];

	return (
		<AnimatePresence>
			{occasion && (
				<motion.div
					initial={{ opacity: 0, y: 24 }}
					animate={{ opacity: 1, y: 0 }}
					exit={{ opacity: 0, y: 24 }}
					className="fixed bottom-5 left-5 z-[70] flex max-w-[min(22rem,calc(100vw-7.5rem))] items-end gap-3"
				>
					<img src={faceSrc(asker.person)} alt={asker.name} className="size-12 shrink-0 rounded-full object-cover ring-1 ring-white/20" />
					<div className="rounded-2xl rounded-bl-sm border border-white/10 bg-[#0b0b0d]/90 p-4 text-sm text-white shadow-2xl backdrop-blur">
						<div className="font-label mb-1.5 flex items-center justify-between text-[11px] text-[#8bf0c4]">
							{asker.name}
							{canSpeak() && (
								<button type="button" aria-label="Listen" onClick={() => speak(occasion.ask, asker.person)} className="text-white/50 hover:text-white">
									<SpeakerHighIcon className="size-4" />
								</button>
							)}
						</div>
						<p className="leading-snug">{occasion.ask}</p>
						<div className="mt-3 flex gap-2">
							<button
								type="button"
								onClick={() => {
									answerOccasion(occasion, true);
									speak('Thank you! How do I look?', asker.person);
								}}
								className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black hover:bg-white/85"
							>
								Yes, dress up
							</button>
							<button type="button" onClick={() => answerOccasion(occasion, false)} className="rounded-full px-3 py-1.5 text-xs text-white/60 hover:text-white">
								Not now
							</button>
						</div>
					</div>
				</motion.div>
			)}
		</AnimatePresence>
	);
}

/** Pick any outfit by hand, whatever the date. */
export function OutfitPicker() {
	const { outfit } = useOutfit();
	return (
		<div className="flex flex-wrap items-center gap-2">
			<span className="font-label text-[11px] text-white/50">Team outfit</span>
			{OUTFIT_ORDER.map((id) => (
				<button
					key={id}
					type="button"
					onClick={() => setOutfit(id)}
					className="rounded-full border px-3 py-1 text-xs transition-colors"
					style={{
						borderColor: outfit.id === id ? '#8bf0c4' : 'rgba(255,255,255,0.15)',
						background: outfit.id === id ? '#8bf0c41a' : 'transparent',
						color: outfit.id === id ? '#fff' : 'rgba(255,255,255,0.7)',
					}}
				>
					{OUTFITS[id].label}
				</button>
			))}
		</div>
	);
}
