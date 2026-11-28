import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { FlowField } from './flow-field';
import { GlyphMatrix } from './glyph-matrix';
import { BrandLogo } from './brand-mark';
import { WavingCharacter } from './waving-character';

const LEAD = 'When you ask your team,';
const QUESTION = 'Are you available?...';
const FULL_TEXT = `${LEAD}\n${QUESTION}`;
const STORAGE_KEY = 'alwaysbro-splash-seen';
const TYPE_MS = 45;
const BRAND_HOLD_MS = 1800;

function alreadySeen(): boolean {
	try {
		return sessionStorage.getItem(STORAGE_KEY) === '1';
	} catch {
		return false;
	}
}

function markSeen(): void {
	try {
		sessionStorage.setItem(STORAGE_KEY, '1');
	} catch {
		// storage can be unavailable; the splash then simply shows again next load
	}
}

export function SplashScreen() {
	const reduceMotion = useReducedMotion();
	const [visible, setVisible] = useState(() => !alreadySeen());
	const [typed, setTyped] = useState(0);
	const [showBrand, setShowBrand] = useState(false);
	const typingDone = typed >= FULL_TEXT.length;

	useEffect(() => {
		if (!visible || typingDone) return;
		const typer = window.setInterval(() => {
			setTyped((n) => Math.min(n + 1, FULL_TEXT.length));
		}, reduceMotion ? 10 : TYPE_MS);
		return () => window.clearInterval(typer);
	}, [visible, typingDone, reduceMotion]);

	useEffect(() => {
		if (!showBrand) return;
		const end = window.setTimeout(() => {
			markSeen();
			setVisible(false);
		}, BRAND_HOLD_MS);
		return () => window.clearTimeout(end);
	}, [showBrand]);

	const finish = () => {
		markSeen();
		setVisible(false);
	};

	return (
		<AnimatePresence>
			{visible && (
				<motion.div
					key="splash"
					role="dialog"
					aria-label="AlwaysBro"
					onClick={showBrand ? finish : undefined}
					className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0b0b0d] text-white"
					initial={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.5 }}
				>
					<FlowField />
					<GlyphMatrix className="opacity-40" />
					<motion.div
						aria-hidden
						className="pointer-events-none absolute left-1/2 top-1/2 size-[46rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[radial-gradient(circle,rgba(139,240,196,0.16),transparent_65%)]"
						animate={reduceMotion ? undefined : { scale: [1, 1.18, 1], opacity: [0.6, 1, 0.6] }}
						transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
					/>
					<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,rgba(11,11,13,0.65)_0%,transparent_70%)]" />
					<button type="button" onClick={finish} className="font-label absolute right-6 top-6 text-[11px] text-white/40 transition-colors hover:text-white">Skip</button>
					<AnimatePresence mode="wait">
						{!showBrand ? (
							<motion.div
								key="question"
								className="relative flex flex-col items-center gap-8 px-6"
								exit={{ opacity: 0, y: -10 }}
								transition={{ duration: 0.3 }}
							>
								<p className="min-h-[1.5em] text-center text-4xl font-medium tracking-[-0.035em] sm:text-7xl">
									<span className="font-label mb-5 block min-h-[1.2em] text-xs font-normal text-[#8bf0c4]/80 sm:text-sm">{FULL_TEXT.slice(0, Math.min(typed, LEAD.length))}</span>
									{typed > LEAD.length + 1 && FULL_TEXT.slice(LEAD.length + 1, typed)}
									<span className="ml-0.5 inline-block w-[2px] animate-pulse bg-[#8bf0c4] align-middle">&nbsp;</span>
								</p>
								<motion.button
									type="button"
									onClick={() => setShowBrand(true)}
									disabled={!typingDone}
									initial={{ opacity: 0, y: 8 }}
									animate={typingDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
									whileTap={{ scale: 0.98 }}
									className="rounded-full bg-white px-8 py-3 text-sm font-medium text-black transition-colors hover:bg-white/85 disabled:pointer-events-none"
								>
									Click here
								</motion.button>
							</motion.div>
						) : (
							<motion.div
								key="brand"
								className="relative flex cursor-pointer flex-col items-center gap-5"
								initial={{ opacity: 0, scale: 0.85 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.5, ease: 'easeOut' }}
							>
								<motion.span
									initial={{ opacity: 0, scale: 0, rotate: -25 }}
									animate={{ opacity: 1, scale: [0, 1.25, 1], rotate: [-25, 10, 0] }}
									transition={{ duration: 0.7 }}
									className="flex size-32 items-center justify-center "
								>
									<BrandLogo className="size-32" />
								</motion.span>
								<span className="text-5xl font-medium tracking-[-0.04em] sm:text-7xl">
									Always<span className="text-[#8bf0c4]">Bro</span>
								</span>
								<div className="mt-2 flex items-end gap-4 sm:gap-8">
									<WavingCharacter person="jack" color="#3b82f6" className="h-40 sm:h-56" />
									<WavingCharacter person="john" color="#ec4899" className="h-40 sm:h-56" delay={0.3} />
									<WavingCharacter person="maria" color="#14b8a6" className="h-40 sm:h-56" delay={0.6} />
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
