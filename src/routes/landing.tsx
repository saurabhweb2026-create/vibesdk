import { motion, useReducedMotion } from 'framer-motion';
import { BrandLogo, BrandName } from '@/components/brand/brand-mark';
import { useAuthModal } from '@/components/auth/AuthModalProvider';
import { THEME_STORAGE_KEY } from '@/lib/themes';
import { LandingShowcase } from './landing-sections/landing-showcase';
import { LandingStory } from './landing-sections/landing-story';

const PLANS = [
	{ name: 'Free', price: '₹0', line: '20 free credits every day', points: ['Try Jack', 'No card needed'] },
	{ name: 'Jack', price: '₹1,999', line: 'per month', points: ['The website builder', '3 live websites'] },
	{ name: 'John', price: '₹2,999', line: 'per month', points: ['Ads for your website', 'Google, Facebook, Instagram'] },
	{ name: 'Maria', price: '₹2,499', line: 'per month', points: ['Answers your customers', 'Saves your leads'] },
	{ name: 'Pro', price: '₹6,999', line: 'per month', points: ['Jack, John and Maria', 'Best value'], featured: true },
];

const BACKDROP =
	'radial-gradient(ellipse at 50% -10%, rgba(79,70,229,0.28), transparent 55%), linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)';

export default function Landing({ onEnter }: { onEnter: () => void }) {
	const reduce = useReducedMotion();
	const { showAuthModal } = useAuthModal();
	const pickTheme = (id: string) => {
		try {
			sessionStorage.setItem(THEME_STORAGE_KEY, id);
		} catch {
			// without storage the builder simply opens empty
		}
		onEnter();
	};
	const signIn = () => showAuthModal('Sign in to meet your team', onEnter);

	return (
		<div
			className="fixed inset-0 z-[60] overflow-y-auto scroll-smooth bg-[#08080c] text-white"
			style={{ backgroundImage: BACKDROP, backgroundSize: '100% 100%, 32px 32px, 32px 32px' }}
		>
			<header className="sticky top-0 z-20 border-b border-white/5 bg-[#08080c]/70 backdrop-blur-xl">
				<div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
					<div className="flex items-center gap-2.5">
						<BrandLogo className="size-10" />
						<BrandName className="text-base" />
					</div>
					<nav className="hidden items-center gap-8 text-sm text-white/65 md:flex">
						<a href="#how" className="transition-colors hover:text-white">How it works</a>
						<a href="#themes" className="transition-colors hover:text-white">Themes</a>
						<a href="#plans" className="transition-colors hover:text-white">Plans</a>
					</nav>
					<div className="flex items-center gap-2">
						<button type="button" onClick={signIn} className="rounded-full px-4 py-2 text-sm text-white/80 transition-colors hover:text-white">
							Sign in
						</button>
						<button
							type="button"
							onClick={onEnter}
							className="rounded-full bg-white px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-white/90"
						>
							Start free
						</button>
					</div>
				</div>
			</header>

			<motion.section
				initial={reduce ? false : { opacity: 0, y: 24 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.7 }}
				className="relative mx-auto max-w-4xl px-5 pb-16 pt-20 text-center sm:pt-28"
			>
				<p className="mx-auto mb-6 inline-flex rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1 text-xs text-[#a5b4fc]">
					Your AI team for your business
				</p>
				<h1 className="font-display text-[clamp(2.25rem,6.5vw,4.5rem)] font-semibold leading-[1.04] tracking-tight">
					Dream it. Show it.
					<br />
					<span className="bg-gradient-to-r from-[#818cf8] to-[#4f46e5] bg-clip-text text-transparent">Keep it chatty.</span>
				</h1>
				<p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
					Meet three AI friends with one job: your business. Jack builds the website, John tells the world about it, and Maria chats with every customer. They hand the baton to each other, so you can finally finish your chai.
				</p>
				<div className="mt-9 flex flex-wrap items-center justify-center gap-3">
					<motion.button
						type="button"
						onClick={onEnter}
						whileHover={reduce ? undefined : { scale: 1.04 }}
						whileTap={reduce ? undefined : { scale: 0.97 }}
						className="rounded-full bg-[#4f46e5] px-8 py-3.5 text-base font-semibold text-white shadow-[0_0_40px_rgba(79,70,229,0.45)] transition-colors hover:bg-[#6366f1]"
					>
						Start building free
					</motion.button>
					<button
						type="button"
						onClick={signIn}
						className="rounded-full border border-white/15 px-7 py-3.5 text-base text-white/90 transition-colors hover:bg-white/10"
					>
						Sign in
					</button>
				</div>
			</motion.section>

			<section id="themes" className="pb-24">
				<h2 className="mb-8 px-5 text-center font-display text-2xl font-semibold sm:text-4xl">Pick a look. Jack does the rest.</h2>
				<LandingShowcase onPick={pickTheme} />
			</section>

			<section className="pb-4 pt-8 text-center">
				<h2 className="font-display text-3xl font-semibold tracking-tight sm:text-5xl">A tiny story about three busy helpers</h2>
				<p className="mt-3 text-white/55">Scroll down. They will introduce themselves.</p>
			</section>
			<LandingStory />

			<section id="plans" className="mx-auto max-w-6xl px-5 py-24">
				<h2 className="text-center font-display text-3xl font-semibold tracking-tight sm:text-5xl">Pick your sidekicks</h2>
				<div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
					{PLANS.map((p) => (
						<div
							key={p.name}
							className={`rounded-2xl border p-6 ${p.featured ? 'border-[#4f46e5] bg-[#4f46e5]/10' : 'border-white/10 bg-white/[0.03]'}`}
						>
							<div className="text-sm font-medium text-[#a5b4fc]">{p.name}</div>
							<div className="mt-3 text-3xl font-semibold">{p.price}</div>
							<div className="text-sm text-white/55">{p.line}</div>
							<ul className="mt-5 space-y-2 text-sm text-white/80">
								{p.points.map((pt) => (
									<li key={pt}>{pt}</li>
								))}
							</ul>
						</div>
					))}
				</div>
				<div className="mt-12 text-center">
					<button
						type="button"
						onClick={onEnter}
						className="rounded-full bg-[#4f46e5] px-8 py-3.5 text-base font-semibold text-white transition-colors hover:bg-[#6366f1]"
					>
						Meet Jack
					</button>
				</div>
			</section>

			<footer className="border-t border-white/10 py-8 text-center text-xs text-white/40">© AlwaysBro</footer>
		</div>
	);
}
