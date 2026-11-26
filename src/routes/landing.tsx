import { motion, useReducedMotion } from 'framer-motion';
import { BrandFace, BrandName } from '@/components/brand/brand-mark';

const TROOP = [
	{
		name: 'Caesar',
		role: 'Builds your website',
		text: 'Tell Caesar your idea. He plans, designs and writes your site, then hands it over.',
		color: '#f97316',
		src: '/troop/caesar.webp',
		live: true,
	},
	{
		name: 'Louie',
		role: 'Runs your ads',
		text: 'Louie takes the finished site and turns it into ads that bring visitors.',
		color: '#ec4899',
		src: '/troop/louie.webp',
		live: false,
	},
	{
		name: 'Jack',
		role: 'Answers your customers',
		text: 'Jack learns your site and replies to your customers, day and night.',
		color: '#84cc16',
		src: '/troop/jack.webp',
		live: false,
	},
];

const PLANS = [
	{
		name: 'Free',
		price: '₹0',
		line: '20 free credits every day',
		points: ['Try Caesar', 'No card needed'],
	},
	{
		name: 'Basic',
		price: '₹1,999',
		line: 'per month',
		points: ['Caesar', '3 live websites'],
	},
	{
		name: 'Pro',
		price: '₹6,999',
		line: 'per month',
		points: ['Caesar, Louie and Jack', 'The whole troop'],
	},
];

export default function Landing({ onEnter }: { onEnter: () => void }) {
	const reduce = useReducedMotion();
	return (
		<div
			className="fixed inset-0 z-[60] overflow-y-auto bg-[#0a0a0a] text-white"
			style={{
				backgroundImage:
					'radial-gradient(ellipse at 50% -10%, rgba(249,115,22,0.22), transparent 55%), linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)',
				backgroundSize: '100% 100%, 28px 28px, 28px 28px',
			}}
		>
			<header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
				<div className="flex items-center gap-2.5">
					<BrandFace className="size-9" />
					<BrandName className="text-base" />
				</div>
				<button
					type="button"
					onClick={onEnter}
					className="rounded-full border border-white/20 px-4 py-1.5 text-sm text-white/90 hover:bg-white/10"
				>
					Sign in
				</button>
			</header>

			<section className="mx-auto max-w-4xl px-5 pb-6 pt-10 text-center sm:pt-16">
				<p className="mb-4 font-mono text-[11px] uppercase tracking-[0.25em] text-[#fdba74]">
					Your AI team
				</p>
				<h1 className="text-[clamp(2rem,6vw,3.75rem)] font-semibold leading-[1.05]">
					Three AI teammates.
					<br />
					<span className="text-[#f97316]">One business.</span>
				</h1>
				<p className="mx-auto mt-5 max-w-xl text-base text-white/70 sm:text-lg">
					Caesar builds your website. Louie runs your ads. Jack answers
					your customers. They pass the work to each other, so you do
					not have to.
				</p>
				<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
					<button
						type="button"
						onClick={onEnter}
						className="rounded-full bg-[#f97316] px-7 py-3 text-base font-semibold text-black shadow-[0_0_30px_rgba(249,115,22,0.45)] hover:bg-[#fb923c]"
					>
						Start building free
					</button>
					<a
						href="#plans"
						className="rounded-full border border-white/20 px-6 py-3 text-base text-white/90 hover:bg-white/10"
					>
						See plans
					</a>
				</div>
			</section>

			<section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-5 py-10 sm:grid-cols-3">
				{TROOP.map((c, i) => (
					<motion.div
						key={c.name}
						initial={reduce ? false : { opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: i * 0.12 }}
						className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 pb-6 pt-5 text-center"
						style={{ boxShadow: `0 0 40px ${c.color}14` }}
					>
						<motion.img
							src={c.src}
							alt={c.name}
							draggable={false}
							className="h-44 w-auto object-contain"
							style={{
								filter: `drop-shadow(0 0 18px ${c.color}88)`,
								opacity: c.live ? 1 : 0.85,
							}}
							animate={reduce ? undefined : { y: [0, -6, 0] }}
							transition={{
								duration: 2.8,
								repeat: Infinity,
								ease: 'easeInOut',
								delay: i * 0.4,
							}}
						/>
						<div className="mt-3 flex items-center gap-2 font-mono text-sm uppercase tracking-wider">
							<span style={{ color: c.color }}>{c.name}</span>
							<span
								className="rounded-full border px-2 text-[10px]"
								style={{
									borderColor: c.live ? c.color : 'rgba(255,255,255,0.2)',
									color: c.live ? c.color : 'rgba(255,255,255,0.55)',
								}}
							>
								{c.live ? 'Live' : 'Soon'}
							</span>
						</div>
						<div className="mt-1 text-sm font-medium text-white/90">
							{c.role}
						</div>
						<p className="mt-2 text-sm text-white/60">{c.text}</p>
					</motion.div>
				))}
			</section>

			<section id="plans" className="mx-auto max-w-5xl px-5 pb-12 pt-6">
				<h2 className="mb-6 text-center text-2xl font-semibold">
					Simple plans
				</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
					{PLANS.map((p) => (
						<div
							key={p.name}
							className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
						>
							<div className="font-mono text-xs uppercase tracking-wider text-[#fdba74]">
								{p.name}
							</div>
							<div className="mt-2 text-3xl font-semibold">{p.price}</div>
							<div className="text-sm text-white/55">{p.line}</div>
							<ul className="mt-4 space-y-1.5 text-sm text-white/80">
								{p.points.map((pt) => (
									<li key={pt}>• {pt}</li>
								))}
							</ul>
						</div>
					))}
				</div>
				<div className="mt-8 text-center">
					<button
						type="button"
						onClick={onEnter}
						className="rounded-full bg-[#f97316] px-7 py-3 text-base font-semibold text-black hover:bg-[#fb923c]"
					>
						Meet Caesar
					</button>
				</div>
			</section>

			<footer className="border-t border-white/10 py-6 text-center text-xs text-white/40">
				© Monkeytrooprs
			</footer>
		</div>
	);
}
