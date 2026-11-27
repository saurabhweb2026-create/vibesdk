import { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { THEMES } from '@/lib/themes';

interface Member {
	id: 'jack' | 'john' | 'maria';
	name: string;
	role: string;
	color: string;
	text: string;
}

const CREW: Member[] = [
	{ id: 'jack', name: 'Jack', role: 'Builds your website', color: '#3b82f6', text: 'Describe your business. Jack asks the right questions, then builds, edits and publishes a real website, with your own domain when you are ready.' },
	{ id: 'john', name: 'John', role: 'Runs your ads and posts', color: '#ec4899', text: 'John reads your finished site and writes ads, posts and short videos for Google, Facebook and Instagram, then schedules and posts them through Meta.' },
	{ id: 'maria', name: 'Maria', role: 'Answers your customers', color: '#14b8a6', text: 'A chat bubble on your site that answers from your real facts, 24 hours a day, and saves every lead who leaves their details.' },
];

const ROTATE_MS = 6000;

function JackVisual() {
	const [i, setI] = useState(0);
	useEffect(() => {
		const t = window.setInterval(() => setI((n) => (n + 1) % THEMES.length), 1800);
		return () => window.clearInterval(t);
	}, []);
	const theme = THEMES[i];
	return (
		<div className="relative h-full w-full overflow-hidden rounded-2xl bg-black/40">
			<AnimatePresence mode="wait">
				<motion.img
					key={theme.id}
					src={`/themes/thumbs/${theme.id}.webp`}
					alt={`${theme.name} website made by Jack`}
					initial={{ opacity: 0, scale: 1.04 }}
					animate={{ opacity: 1, scale: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.5 }}
					className="h-full w-full object-cover object-top"
				/>
			</AnimatePresence>
			<div className="font-label absolute bottom-3 left-3 rounded-full bg-black/70 px-3 py-1 text-[11px] text-white/80">{theme.name} · {theme.bestFor}</div>
		</div>
	);
}

function JohnVisual() {
	return (
		<div className="flex h-full w-full flex-col justify-center gap-3 rounded-2xl bg-black/40 p-5">
			<div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
				<div className="font-label mb-2 text-[11px] text-[#ec4899]">Instagram · scheduled Friday 7:30 pm</div>
				<p className="text-sm leading-relaxed text-white/85">Fresh out of the oven, gone by noon. Our sourdough sells out daily, so set an alarm and come early.</p>
				<p className="mt-2 text-xs text-white/45">#sourdough #freshbaked #supportlocal</p>
			</div>
			<div className="rounded-xl border border-white/10 bg-white/[0.04] p-4">
				<div className="font-label mb-2 text-[11px] text-[#ec4899]">Facebook ad · ₹300 a day</div>
				<p className="text-sm text-white/85">Bakery near you. Order before 6 pm, delivered warm.</p>
			</div>
			<div className="font-label self-start rounded-full bg-[#ec4899]/15 px-3 py-1 text-[11px] text-[#f9a8d4]">Posted through Meta</div>
		</div>
	);
}

function MariaVisual() {
	return (
		<div className="flex h-full w-full flex-col justify-end gap-2 rounded-2xl bg-black/40 p-5 text-sm">
			<div className="max-w-[80%] self-end rounded-2xl rounded-br-sm bg-white/10 px-4 py-2.5 text-white/90">Do you deliver on Sundays?</div>
			<div className="max-w-[85%] self-start rounded-2xl rounded-bl-sm bg-[#14b8a6]/20 px-4 py-2.5 text-white/95">Yes, from 8 am to 2 pm. Share your number and we will confirm your slot.</div>
			<div className="max-w-[80%] self-end rounded-2xl rounded-br-sm bg-white/10 px-4 py-2.5 text-white/90">98xxxxxx10</div>
			<div className="font-label mt-1 self-start rounded-full bg-[#14b8a6]/15 px-3 py-1 text-[11px] text-[#5eead4]">Lead saved</div>
		</div>
	);
}

const VISUAL = { jack: JackVisual, john: JohnVisual, maria: MariaVisual };

export function LandingCrew() {
	const reduce = useReducedMotion();
	const [active, setActive] = useState(0);
	const [paused, setPaused] = useState(false);

	useEffect(() => {
		if (reduce || paused) return;
		const t = window.setTimeout(() => setActive((n) => (n + 1) % CREW.length), ROTATE_MS);
		return () => window.clearTimeout(t);
	}, [active, paused, reduce]);

	const Visual = VISUAL[CREW[active].id];

	return (
		<div className="mx-auto grid max-w-6xl gap-8 px-5 lg:grid-cols-[1fr_1.15fr]" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
			<div className="flex flex-col">
				{CREW.map((m, i) => {
					const on = i === active;
					return (
						<button key={m.id} type="button" onClick={() => setActive(i)} className="border-t border-white/10 py-5 text-left last:border-b">
							<div className="flex items-center gap-3">
								<span className="size-2.5 rounded-full" style={{ background: m.color, opacity: on ? 1 : 0.4 }} />
								<span className={`text-xl font-medium transition-colors ${on ? 'text-white' : 'text-white/45'}`}>{m.name}</span>
								<span className={`text-sm transition-colors ${on ? 'text-white/60' : 'text-white/30'}`}>{m.role}</span>
							</div>
							<AnimatePresence initial={false}>
								{on && (
									<motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} className="overflow-hidden">
										<p className="pt-3 text-base leading-relaxed text-white/65">{m.text}</p>
										<div className="mt-4 h-px w-full bg-white/10">
											{!reduce && !paused && (
												<motion.div key={active} className="h-px" style={{ background: m.color }} initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: ROTATE_MS / 1000, ease: 'linear' }} />
											)}
										</div>
									</motion.div>
								)}
							</AnimatePresence>
						</button>
					);
				})}
			</div>
			<div className="aspect-[4/3] w-full rounded-3xl border border-white/10 bg-white/[0.03] p-2">
				<AnimatePresence mode="wait">
					<motion.div key={CREW[active].id} className="h-full w-full" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.35 }}>
						<Visual />
					</motion.div>
				</AnimatePresence>
			</div>
		</div>
	);
}
