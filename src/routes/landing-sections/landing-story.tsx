import { useEffect, useRef, useState } from 'react';
import { motion, useMotionValueEvent, useMotionValue, useReducedMotion, useTransform, type MotionValue } from 'framer-motion';
import { WavingCharacter, type TroopPerson } from '@/components/brand/waving-character';

interface Step {
	person: TroopPerson;
	name: string;
	color: string;
	label: string;
	title: string;
	text: string;
	points: string[];
}

const STEPS: Step[] = [
	{
		person: 'jack',
		name: 'Jack',
		color: '#3b82f6',
		label: 'Chapter 1 · The Builder',
		title: 'Once upon an idea, Jack rolls up his sleeves',
		text: 'You tell Jack what you dream of. He asks the nosy questions first, so nothing gets guessed, then builds your site while you sip your chai.',
		points: ['Static site, online store or web app', 'Asks for your pictures and papers', 'Your own domain, when you are happy'],
	},
	{
		person: 'john',
		name: 'John',
		color: '#ec4899',
		label: 'Chapter 2 · The Showman',
		title: 'John takes your site on a world tour',
		text: 'John reads your finished site and starts talking about it everywhere. Ads, posts, hashtags and tiny videos, all in your voice.',
		points: ['Google, Facebook and Instagram ad copy', 'Hashtag ideas and a first-week plan', '6 to 10 second videos from his own creatives'],
	},
	{
		person: 'maria',
		name: 'Maria',
		color: '#14b8a6',
		label: 'Chapter 3 · The Friendly Voice',
		title: 'Maria greets every visitor like an old friend',
		text: 'Customers show up at 2 a.m. and Maria is wide awake. She answers from your real content and saves every lead for you.',
		points: ['Chats on your own website', 'Answers only from your facts', 'Leads saved in one place'],
	},
];

const TURN_ZONE = 0.22;

/** Degrees of Y rotation for a step: it turns in from the side, faces you, then turns away. */
function turnFor(progress: number, index: number): number {
	const local = progress * STEPS.length - index;
	if (index > 0 && local < TURN_ZONE) return -90 * (1 - Math.max(0, local) / TURN_ZONE);
	if (index < STEPS.length - 1 && local > 1 - TURN_ZONE) return 90 * ((Math.min(1, local) - (1 - TURN_ZONE)) / TURN_ZONE);
	return 0;
}

function StoryText({ step }: { step: Step }) {
	return (
		<div>
			<p className="text-sm font-semibold tracking-wide" style={{ color: step.color }}>
				{step.label}
			</p>
			<h3 className="mt-3 font-display text-3xl font-semibold leading-tight text-white md:text-5xl">{step.title}</h3>
			<p className="mt-4 max-w-md text-base leading-relaxed text-white/65 md:text-lg">{step.text}</p>
			<ul className="mt-6 space-y-2.5 text-sm text-white/80 md:text-base">
				{step.points.map((p) => (
					<li key={p} className="flex items-start gap-3">
						<span className="mt-2 size-1.5 shrink-0 rounded-full" style={{ background: step.color }} />
						{p}
					</li>
				))}
			</ul>
		</div>
	);
}

function StoryCharacter({ step, index, progress }: { step: Step; index: number; progress: MotionValue<number> }) {
	const rotateY = useTransform(progress, (v) => turnFor(v, index));
	return (
		<motion.div className="absolute inset-0 flex items-end justify-center" style={{ rotateY }}>
			<WavingCharacter person={step.person} color={step.color} className="h-[40vh] md:h-[68vh]" />
		</motion.div>
	);
}

function StaticStory() {
	return (
		<div className="mx-auto grid max-w-5xl gap-6 px-5 md:grid-cols-3">
			{STEPS.map((s) => (
				<div key={s.name} className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
					<WavingCharacter person={s.person} color={s.color} className="mx-auto h-56" />
					<div className="mt-4">
						<StoryText step={s} />
					</div>
				</div>
			))}
		</div>
	);
}

function nearestScroller(node: HTMLElement | null): HTMLElement | Window {
	let el = node?.parentElement ?? null;
	while (el) {
		const overflow = getComputedStyle(el).overflowY;
		if ((overflow === 'auto' || overflow === 'scroll') && el.scrollHeight > el.clientHeight) return el;
		el = el.parentElement;
	}
	return window;
}

/** Scroll progress (0 to 1) of the tall story block, measured against whichever element actually scrolls. */
function useStoryProgress(ref: React.RefObject<HTMLDivElement | null>) {
	const progress = useMotionValue(0);
	useEffect(() => {
		const node = ref.current;
		if (!node) return;
		const scroller = nearestScroller(node);
		const update = () => {
			const rect = node.getBoundingClientRect();
			const viewport = scroller instanceof Window ? window.innerHeight : scroller.clientHeight;
			const top = scroller instanceof Window ? 0 : scroller.getBoundingClientRect().top;
			const travel = rect.height - viewport;
			progress.set(travel <= 0 ? 0 : Math.min(1, Math.max(0, (top - rect.top) / travel)));
		};
		update();
		scroller.addEventListener('scroll', update, { passive: true });
		window.addEventListener('resize', update);
		return () => {
			scroller.removeEventListener('scroll', update);
			window.removeEventListener('resize', update);
		};
	}, [ref, progress]);
	return progress;
}

export function LandingStory() {
	const reduce = useReducedMotion();
	const ref = useRef<HTMLDivElement>(null);
	const [active, setActive] = useState(0);
	const scrollYProgress = useStoryProgress(ref);

	useMotionValueEvent(scrollYProgress, 'change', (v) => {
		const next = Math.min(STEPS.length - 1, Math.max(0, Math.floor(v * STEPS.length)));
		setActive((prev) => (prev === next ? prev : next));
	});

	if (reduce) return <StaticStory />;
	const step = STEPS[active];

	return (
		<div ref={ref} className="relative h-[320vh]" id="how">
			<div className="sticky top-0 flex h-screen items-center overflow-hidden pt-16">
				<div
					aria-hidden
					className="pointer-events-none absolute left-1/4 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl transition-colors duration-500"
					style={{ background: `${step.color}33` }}
				/>
				<div className="mx-auto grid h-[80vh] w-full max-w-6xl grid-rows-[1fr_1fr] items-center gap-2 px-6 [perspective:1200px] md:grid-cols-2 md:grid-rows-1 md:gap-12">
					<div className="relative h-full w-full md:h-[72vh]">
						<StoryCharacter key={step.name} step={step} index={active} progress={scrollYProgress} />
					</div>
					<div className="relative flex h-full w-full flex-col justify-center md:h-[72vh]">
						<motion.div key={step.name} initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45, ease: 'easeOut' }}>
							<StoryText step={step} />
						</motion.div>
					</div>
				</div>
				<div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
					{STEPS.map((s, i) => (
						<span
							key={s.name}
							className="h-1.5 rounded-full transition-all duration-300"
							style={{ background: s.color, width: i === active ? 28 : 10, opacity: i === active ? 1 : 0.35 }}
						/>
					))}
				</div>
			</div>
		</div>
	);
}
