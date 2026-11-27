import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ThumbsUp } from 'lucide-react';

const QUESTION = 'Are you available?...';
const STORAGE_KEY = 'alwaysbro-splash-seen';
const TYPE_MS = 70;
const BRAND_AT_MS = QUESTION.length * TYPE_MS + 900;
const END_AT_MS = BRAND_AT_MS + 2200;

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

	useEffect(() => {
		if (!visible) return;
		const typer = window.setInterval(() => {
			setTyped((n) => (n < QUESTION.length ? n + 1 : n));
		}, reduceMotion ? 0 : TYPE_MS);
		const brand = window.setTimeout(() => setShowBrand(true), reduceMotion ? 300 : BRAND_AT_MS);
		const end = window.setTimeout(() => {
			markSeen();
			setVisible(false);
		}, reduceMotion ? 1500 : END_AT_MS);
		return () => {
			window.clearInterval(typer);
			window.clearTimeout(brand);
			window.clearTimeout(end);
		};
	}, [visible, reduceMotion]);

	const skip = () => {
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
					onClick={skip}
					className="fixed inset-0 z-[100] flex cursor-pointer flex-col items-center justify-center bg-[#0a0a0f] text-white"
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
							<motion.p
								key="question"
								className="relative px-6 text-center text-2xl font-medium tracking-tight sm:text-4xl"
								exit={{ opacity: 0, y: -10 }}
								transition={{ duration: 0.3 }}
							>
								{QUESTION.slice(0, typed)}
								<span className="ml-0.5 inline-block w-[2px] animate-pulse bg-white align-middle">&nbsp;</span>
							</motion.p>
						) : (
							<motion.div
								key="brand"
								className="relative flex flex-col items-center gap-4"
								initial={{ opacity: 0, scale: 0.85 }}
								animate={{ opacity: 1, scale: 1 }}
								transition={{ duration: 0.5, ease: 'easeOut' }}
							>
								<img src="/logo.svg" alt="" className="size-20 rounded-2xl shadow-[0_0_40px_rgba(79,70,229,0.5)]" />
								<div className="flex items-center gap-3">
									<span className="text-3xl font-bold tracking-tight sm:text-5xl">
										Always<span className="text-[#818cf8]">Bro</span>
									</span>
									<motion.span
										initial={{ opacity: 0, scale: 0, rotate: -25 }}
										animate={{ opacity: 1, scale: [0, 1.3, 1], rotate: [-25, 10, 0] }}
										transition={{ delay: 0.5, duration: 0.6 }}
										className="text-[#facc15]"
									>
										<ThumbsUp className="size-8 sm:size-11" fill="currentColor" />
									</motion.span>
								</div>
							</motion.div>
						)}
					</AnimatePresence>
				</motion.div>
			)}
		</AnimatePresence>
	);
}
