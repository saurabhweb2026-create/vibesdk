import { AnimatePresence, motion } from 'framer-motion';
import { SpeakerHighIcon } from '@phosphor-icons/react';
import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { useAuth } from '@/contexts/auth-context';
import { apiClient } from '@/lib/api-client';
import { answerOccasion, pendingOccasion, syncWorn, useOutfit, type TroopPerson } from '@/lib/outfits';
import { canSpeak, speak } from '@/lib/voice';

const ASKERS: Array<{ person: TroopPerson; name: string }> = [
	{ person: 'maria', name: 'Maria' },
	{ person: 'john', name: 'John' },
	{ person: 'jack', name: 'Jack' },
];

/** When a festival is near, a teammate asks to change into the matching outfit. */
export function OutfitAsk() {
	const { faceSrc, answered } = useOutfit();
	const { user } = useAuth();
	const navigate = useNavigate();

	useEffect(() => {
		if (!user) return;
		apiClient
			.getTeam()
			.then((res) => res.data && syncWorn(Object.fromEntries(res.data.members.map((m) => [m.id, m.outfit]))))
			.catch(() => undefined);
	}, [user]);
	const occasion = user && answered && pendingOccasion();
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
								<button type="button" aria-label="Listen" onClick={() => void speak(occasion.ask)} className="text-white/50 hover:text-white">
									<SpeakerHighIcon className="size-4" />
								</button>
							)}
						</div>
						<p className="leading-snug">{occasion.ask}</p>
						<div className="mt-3 flex gap-2">
							<button
								type="button"
								onClick={() => {
									answerOccasion(occasion, false);
									void speak('Let me show you our outfits. You pick what we wear!');
									navigate(`/wardrobe?outfit=${occasion.outfit}&who=${asker.person}`);
								}}
								className="rounded-full bg-white px-4 py-1.5 text-xs font-medium text-black hover:bg-white/85"
							>
								See outfits
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
