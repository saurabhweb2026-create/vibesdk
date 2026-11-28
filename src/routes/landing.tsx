import { useState, type FormEvent } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { BrandLogo, BrandName } from '@/components/brand/brand-mark';
import { GlyphMatrix } from '@/components/brand/glyph-matrix';
import { FutureBackdrop } from '@/components/brand/future-backdrop';
import { MicButton } from '@/components/mic-button';
import { useAuthModal } from '@/components/auth/AuthModalProvider';
import { PROMPT_STORAGE_KEY, THEME_STORAGE_KEY } from '@/lib/themes';
import { LandingCrew } from './landing-sections/landing-crew';
import { LandingShowcase } from './landing-sections/landing-showcase';

const ACCENT = '#8bf0c4';

const PLANS = [
	{ name: 'Free', price: '₹0', line: '20 free credits every day', points: ['Try Jack', 'No card needed'] },
	{ name: 'Jack', price: '₹1,999', line: 'per month', points: ['The website builder', '3 live websites', 'Your own domain'] },
	{ name: 'John', price: '₹2,999', line: 'per month', points: ['Ads, posts and videos', 'Schedules and posts on Meta', 'Google and Meta ad copy'] },
	{ name: 'Maria', price: '₹2,499', line: 'per month', points: ['Answers your customers', 'Saves your leads', 'Learns your prices and offers'] },
	{ name: 'Pro', price: '₹6,999', line: 'per month', points: ['Jack, John and Maria', 'Looks and moods for the app', 'Best value'], featured: true },
];

const STEPS = [
	{ n: '01', title: 'Describe your idea', text: 'Say what your business does, in your own words. Jack asks what he needs, nothing is guessed.' },
	{ n: '02', title: 'Watch it get built', text: 'Your website appears live. Change anything by chatting, and connect your own domain.' },
	{ n: '03', title: 'Get customers', text: 'John posts and runs your ads on Meta. Maria chats with every visitor and keeps the leads.' },
];

const FAQ = [
	{ q: 'What is AlwaysBro?', a: 'Three AI teammates for your business. Jack builds your website, John creates and posts your ads and social content, and Maria answers your customers on your site.' },
	{ q: 'Do I need to know how to code?', a: 'No. You describe what you want in plain words and Jack builds it. You can keep editing by chatting.' },
	{ q: 'Can I use my own domain?', a: 'Yes. Open your website, press Domain, enter your address and add the records shown. It goes live with a secure certificate.' },
	{ q: 'How does John post on Meta?', a: 'You connect your Facebook Page and Instagram account once. John writes the post or ad, shows you a preview, and posts it or schedules it for the time you pick.' },
	{ q: 'How do credits work?', a: 'Every account gets free credits each day. Paid plans add monthly credits, and you can top up any time. Credits also unlock looks and moods for the app.' },
	{ q: 'Who owns my website?', a: 'You do. Your content and your domain are yours.' },
];

function Label({ children }: { children: string }) {
	return <p className="font-label mb-4 text-xs text-white/50">{children}</p>;
}

export default function Landing({ onEnter }: { onEnter: () => void }) {
	const reduce = useReducedMotion();
	const { showAuthModal } = useAuthModal();
	const [prompt, setPrompt] = useState('');
	const [open, setOpen] = useState<number | null>(0);

	const stash = (key: string, value: string) => {
		try {
			sessionStorage.setItem(key, value);
		} catch {
			// without storage the builder simply opens empty
		}
	};
	const pickTheme = (id: string) => {
		stash(THEME_STORAGE_KEY, id);
		onEnter();
	};
	const submit = (e: FormEvent) => {
		e.preventDefault();
		if (prompt.trim()) stash(PROMPT_STORAGE_KEY, prompt.trim());
		onEnter();
	};
	const signIn = () => showAuthModal('Sign in to meet your team', onEnter);

	return (
		<div className="fixed inset-0 z-[60] overflow-y-auto scroll-smooth bg-[#0b0b0d] text-white">
			<div className="pointer-events-none fixed inset-0">
				<FutureBackdrop />
			</div>
			<header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#0b0b0d]/80 backdrop-blur-xl">
				<div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3">
					<div className="flex items-center gap-2.5">
						<BrandLogo className="size-9" />
						<BrandName className="text-lg" />
					</div>
					<nav className="hidden items-center gap-8 text-sm text-white/60 md:flex">
						<a href="#team" className="transition-colors hover:text-white">Your team</a>
						<a href="#templates" className="transition-colors hover:text-white">Templates</a>
						<a href="#plans" className="transition-colors hover:text-white">Pricing</a>
						<a href="#faq" className="transition-colors hover:text-white">FAQ</a>
					</nav>
					<div className="flex items-center gap-2">
						<button type="button" onClick={signIn} className="rounded-full px-4 py-2 text-sm text-white/70 transition-colors hover:text-white">Sign in</button>
						<button type="button" onClick={onEnter} className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85">Get started</button>
					</div>
				</div>
			</header>

			<section className="relative overflow-hidden">
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_40%,rgba(11,11,13,0.7)_20%,transparent_70%)]" />
				<motion.div
					initial={reduce ? false : { opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ duration: 0.6 }}
					className="relative mx-auto max-w-3xl px-5 pb-24 pt-24 text-center sm:pt-32"
				>
					<h1 className="text-future text-[clamp(2.4rem,6.5vw,4.6rem)] font-medium leading-[1.05] tracking-[-0.03em]">
						Describe your idea.
						<br />
						Your AI team <span style={{ color: ACCENT }}>runs the rest.</span>
					</h1>
					<p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-white/60 sm:text-lg">
						Jack builds your website. John creates and posts your ads. Maria answers your customers. One team, one chat.
					</p>
					<form onSubmit={submit} className="mx-auto mt-10 max-w-2xl rounded-3xl border border-white/10 bg-white/[0.05] p-3 text-left shadow-[0_0_80px_rgba(139,240,196,0.06)] backdrop-blur">
						<textarea
							value={prompt}
							onChange={(e) => setPrompt(e.target.value)}
							rows={3}
							placeholder="A website for my home bakery in Pune with online orders..."
							className="w-full resize-none bg-transparent px-3 py-2 text-base text-white outline-none placeholder:text-white/35"
						/>
						<div className="flex items-center justify-between px-1 pt-1">
							<span className="font-label px-2 text-[11px] text-white/35">Free to start</span>
							<span className="flex items-center gap-2">
							<MicButton onText={(t) => setPrompt((p) => `${p} ${t}`.trim())} />
							<button type="submit" className="rounded-full bg-white px-5 py-2 text-sm font-medium text-black transition-colors hover:bg-white/85">Build it</button>
							</span>
						</div>
					</form>
					<div className="mt-6 flex flex-wrap justify-center gap-2 text-xs text-white/50">
						{['D2C brands', 'Solopreneurs', 'Students', 'Creators'].map((t) => (
							<span key={t} className="rounded-full border border-white/10 px-3 py-1">{t}</span>
						))}
					</div>
				</motion.div>
			</section>

			<section id="team" className="py-24">
				<div className="mx-auto mb-12 max-w-3xl px-5 text-center">
					<Label>MEET YOUR TEAM</Label>
					<h2 className="text-3xl font-medium tracking-[-0.02em] sm:text-5xl">What can your team do for you?</h2>
					<p className="mt-4 text-white/55">From the first idea to the first customer, three specialists hand the work to each other.</p>
				</div>
				<LandingCrew />
			</section>

			<section id="templates" className="py-20">
				<div className="mx-auto mb-10 max-w-3xl px-5 text-center">
					<Label>TEMPLATES</Label>
					<h2 className="text-3xl font-medium tracking-[-0.02em] sm:text-5xl">Start from a look you like</h2>
					<p className="mt-4 text-white/55">Pick one and Jack builds your site on it, with your words and pictures.</p>
				</div>
				<LandingShowcase onPick={pickTheme} />
			</section>

			<section className="mx-auto max-w-6xl px-5 py-24">
				<div className="mb-12 text-center">
					<Label>HOW IT WORKS</Label>
					<h2 className="text-3xl font-medium tracking-[-0.02em] sm:text-5xl">From idea to customers in three steps</h2>
				</div>
				<div className="grid gap-4 md:grid-cols-3">
					{STEPS.map((s) => (
						<div key={s.n} className="rounded-3xl border border-white/10 bg-white/[0.03] p-7">
							<div className="font-label text-sm" style={{ color: ACCENT }}>{s.n}</div>
							<h3 className="mt-6 text-xl font-medium">{s.title}</h3>
							<p className="mt-2 text-sm leading-relaxed text-white/55">{s.text}</p>
						</div>
					))}
				</div>
			</section>

			<section id="plans" className="mx-auto max-w-6xl px-5 py-24">
				<div className="mb-12 text-center">
					<Label>PRICING</Label>
					<h2 className="text-3xl font-medium tracking-[-0.02em] sm:text-5xl">Simple pricing for every builder</h2>
					<p className="mt-4 text-white/55">Start free. Add a teammate when you need one.</p>
				</div>
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
					{PLANS.map((p) => (
						<div key={p.name} className={`flex flex-col rounded-3xl border p-6 ${p.featured ? 'border-[#8bf0c4]/60 bg-[#8bf0c4]/[0.06]' : 'border-white/10 bg-white/[0.03]'}`}>
							<div className="font-label text-xs" style={{ color: p.featured ? ACCENT : 'rgba(255,255,255,0.5)' }}>{p.name}</div>
							<div className="mt-4 text-4xl font-medium tracking-tight">{p.price}</div>
							<div className="text-sm text-white/50">{p.line}</div>
							<ul className="mt-6 flex-1 space-y-2.5 text-sm text-white/75">
								{p.points.map((pt) => (
									<li key={pt} className="flex gap-2"><span style={{ color: ACCENT }}>+</span>{pt}</li>
								))}
							</ul>
							<button type="button" onClick={onEnter} className={`mt-7 rounded-full px-4 py-2.5 text-sm font-medium transition-colors ${p.featured ? 'bg-white text-black hover:bg-white/85' : 'border border-white/20 text-white hover:bg-white/10'}`}>
								{p.name === 'Free' ? 'Start free' : `Choose ${p.name}`}
							</button>
						</div>
					))}
				</div>
			</section>

			<section id="faq" className="mx-auto max-w-3xl px-5 py-24">
				<div className="mb-10">
					<Label>FREQUENTLY ASKED QUESTIONS</Label>
					<h2 className="text-3xl font-medium tracking-[-0.02em] sm:text-4xl">Curious about AlwaysBro? We got you.</h2>
				</div>
				{FAQ.map((f, i) => (
					<div key={f.q} className="border-t border-white/10 last:border-b">
						<button type="button" onClick={() => setOpen(open === i ? null : i)} className="flex w-full items-center justify-between py-5 text-left">
							<span className={`text-lg transition-colors ${open === i ? 'text-[#8bf0c4]' : 'text-white'}`}>{f.q}</span>
							<span className="text-2xl text-white/40">{open === i ? '−' : '+'}</span>
						</button>
						{open === i && <p className="pb-6 pr-8 text-white/60">{f.a}</p>}
					</div>
				))}
			</section>

			<section className="relative overflow-hidden border-t border-white/[0.06] py-28 text-center">
				<GlyphMatrix />
				<div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_50%,#0b0b0d_30%,transparent_80%)]" />
				<div className="relative px-5">
					<h2 className="text-4xl font-medium leading-tight tracking-[-0.03em] sm:text-6xl">
						Start building
						<br />
						<span style={{ color: ACCENT }}>with AlwaysBro today.</span>
					</h2>
					<button type="button" onClick={onEnter} className="mt-10 rounded-full bg-white px-8 py-3.5 text-base font-medium text-black transition-colors hover:bg-white/85">Get started free</button>
				</div>
			</section>

			<footer className="border-t border-white/[0.06] px-5 py-12">
				<div className="mx-auto flex max-w-6xl flex-col gap-8 sm:flex-row sm:justify-between">
					<div className="max-w-xs">
						<div className="flex items-center gap-2.5"><BrandLogo className="size-8" /><BrandName className="text-base" /></div>
						<p className="mt-3 text-sm text-white/45">Your AI team for building, promoting and growing your business.</p>
					</div>
					<div className="flex gap-16 text-sm">
						<div className="flex flex-col gap-2.5 text-white/55">
							<span className="font-label text-xs text-white/35">PRODUCT</span>
							<a href="#team" className="hover:text-white">Your team</a>
							<a href="#templates" className="hover:text-white">Templates</a>
							<a href="#plans" className="hover:text-white">Pricing</a>
						</div>
						<div className="flex flex-col gap-2.5 text-white/55">
							<span className="font-label text-xs text-white/35">HELP</span>
							<a href="#faq" className="hover:text-white">FAQ</a>
							<button type="button" onClick={signIn} className="text-left hover:text-white">Sign in</button>
						</div>
					</div>
				</div>
				<p className="font-label mx-auto mt-10 max-w-6xl text-[11px] text-white/30">© 2026 AlwaysBro</p>
			</footer>
		</div>
	);
}
