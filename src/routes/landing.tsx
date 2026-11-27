import { motion, useReducedMotion } from 'framer-motion';
import { BrandFace, BrandName } from '@/components/brand/brand-mark';
import { WavingCharacter, type TroopPerson } from '@/components/brand/waving-character';

const TROOP = [
	{
		name: 'Jack',
		role: 'Builds your website',
		text: 'Tell Jack your idea. He plans, designs and writes your site, then hands it over.',
		color: '#3b82f6',
		person: 'jack' as TroopPerson,
		live: true,
	},
	{
		name: 'John',
		role: 'Ads and social media',
		text: 'John reads your finished site and writes your Google, Facebook and Instagram ads, posts and budget plan.',
		color: '#ec4899',
		person: 'john' as TroopPerson,
		live: true,
	},
	{
		name: 'Maria',
		role: 'Answers your customers',
		text: 'Maria learns your business and answers your customers on your website, day and night, and saves the leads.',
		color: '#14b8a6',
		person: 'maria' as TroopPerson,
		live: true,
	},
];

const PLANS = [
	{ name: 'Free', price: '₹0', line: '20 free credits every day', points: ['Try Jack', 'No card needed'] },
	{ name: 'Jack', price: '₹1,999', line: 'per month', points: ['The website builder', '3 live websites'] },
	{ name: 'John', price: '₹2,999', line: 'per month', points: ['Ads for your website', 'Google, Facebook, Instagram'] },
	{ name: 'Maria', price: '₹2,499', line: 'per month', points: ['Answers your customers', 'Saves your leads'] },
	{ name: 'Pro', price: '₹6,999', line: 'per month', points: ['Jack, John and Maria', 'Best value'] },
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

			<motion.section
				initial={reduce ? false : { opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.6 }}
				className="relative mx-auto max-w-4xl px-5 pb-6 pt-10 text-center sm:pt-16"
			>
				<motion.div
					aria-hidden
					className="pointer-events-none absolute left-1/2 top-0 -z-10 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-[#4f46e5]/25 blur-3xl"
					animate={reduce ? undefined : { opacity: [0.5, 0.9, 0.5], scale: [1, 1.08, 1] }}
					transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
				/>
				<p className="mb-4 font-sans text-xs tracking-wide text-[#a5b4fc]">
					Your AI team
				</p>
				<h1 className="text-[clamp(2rem,6vw,3.75rem)] font-semibold leading-[1.05]">
					Three AI teammates.
					<br />
					<span className="text-[#4f46e5]">One business.</span>
				</h1>
				<p className="mx-auto mt-5 max-w-xl text-base text-white/70 sm:text-lg">
					Jack builds your website. John runs your ads. Maria answers
					your customers. They pass the work to each other, so you do
					not have to.
				</p>
				<div className="mt-8 flex flex-wrap items-center justify-center gap-3">
					<motion.button
						type="button"
						onClick={onEnter}
						whileHover={reduce ? undefined : { scale: 1.05 }}
						whileTap={reduce ? undefined : { scale: 0.97 }}
						className="rounded-full bg-[#4f46e5] px-7 py-3 text-base font-semibold text-white shadow-[0_0_30px_rgba(79,70,229,0.4)] hover:bg-[#6366f1]"
					>
						Start building free
					</motion.button>
					<a
						href="#plans"
						className="rounded-full border border-white/20 px-6 py-3 text-base text-white/90 hover:bg-white/10"
					>
						See plans
					</a>
				</div>
			</motion.section>

			<section className="mx-auto grid max-w-5xl grid-cols-1 gap-4 px-5 py-10 sm:grid-cols-3">
				{TROOP.map((c, i) => (
					<motion.div
						key={c.name}
						initial={reduce ? false : { opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ duration: 0.5, delay: i * 0.12 }}
						whileHover={reduce ? undefined : { y: -6, scale: 1.02 }}
						className="flex flex-col items-center rounded-2xl border border-white/10 bg-white/[0.03] px-5 pb-6 pt-5 text-center"
						style={{ boxShadow: `0 0 40px ${c.color}14` }}
					>
						<WavingCharacter person={c.person} color={c.color} delay={i * 0.4} />
						<div className="mt-3 flex items-center gap-2 font-sans text-sm tracking-wide">
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
					Pick one helper, or take them all
				</h2>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
					{PLANS.map((p) => (
						<div
							key={p.name}
							className="rounded-2xl border border-white/10 bg-white/[0.03] p-5"
						>
							<div className="font-sans text-xs tracking-wide text-[#a5b4fc]">
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
						className="rounded-full bg-[#4f46e5] px-7 py-3 text-base font-semibold text-white hover:bg-[#6366f1]"
					>
						Meet Jack
					</button>
				</div>
			</section>

			<footer className="border-t border-white/10 py-6 text-center text-xs text-white/40">
				© AlwaysBro
			</footer>
		</div>
	);
}
