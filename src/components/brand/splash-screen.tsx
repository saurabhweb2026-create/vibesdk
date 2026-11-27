import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { BrandLogo } from './brand-mark';
import { WavingCharacter } from './waving-character';

const QUESTION = 'Are you available?...';
const STORAGE_KEY = 'alwaysbro-splash-seen';
const TYPE_MS = 70;
const BRAND_HOLD_MS = 3600;

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
	const typingDone = typed >= QUESTION.length;

	useEffect(() => {
		if (!visible || typingDone) return;
		const typer = window.setInterval(() => {
			setTyped((n) => Math.min(n + 1, QUESTION.length));
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
					className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-[#0a0a0f] text-white"
					initial={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.5 }}
				>
					<motion.div
						aria-hidden
						className="pointer-events-none absolute h-80 w-80 rounded-full bg-[#4f46e5]/30 blur-3xl"
						animate={reduceMotion ? undefined : { scale: [1, 1.15, 1], opacity: [0.5, 0.9, 0.5] }}
						transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
					/>
					<AnimatePresence mode="wait">
						{!showBrand ? (
							<motion.div
								key="question"
								className="relative flex flex-col items-center gap-8 px-6"
								exit={{ opacity: 0, y: -10 }}
								transition={{ duration: 0.3 }}
							>
								<p className="min-h-[1.5em] text-center font-display text-3xl font-medium tracking-tight sm:text-4xl">
									{QUESTION.slice(0, typed)}
									<span className="ml-0.5 inline-block w-[2px] animate-pulse bg-white align-middle">&nbsp;</span>
								</p>
								<motion.button
									type="button"
									onClick={() => setShowBrand(true)}
									disabled={!typingDone}
									initial={{ opacity: 0, y: 8 }}
									animate={typingDone ? { opacity: 1, y: 0 } : { opacity: 0, y: 8 }}
									whileHover={{ scale: 1.05 }}
									whileTap={{ scale: 0.97 }}
									className="rounded-full bg-[#4f46e5] px-8 py-3 text-base font-semibold text-white shadow-[0_0_30px_rgba(79,70,229,0.5)] transition-colors hover:bg-[#6366f1] disabled:pointer-events-none"
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
									className="flex size-32 items-center justify-center drop-shadow-[0_0_40px_rgba(59,130,246,0.6)]"
								>
									<BrandLogo className="size-32" />
								</motion.span>
								<span className="font-display text-4xl font-bold tracking-tight sm:text-6xl">
									Always<span className="text-[#818cf8]">Bro</span>
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
