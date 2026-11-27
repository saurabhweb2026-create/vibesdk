import { useRef } from 'react';
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from 'framer-motion';
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
		label: 'Step 1 · Build',
		title: 'Tell Jack your idea',
		text: 'Jack asks the right questions first, so nothing is guessed. Then he plans, designs and writes your website and shows you a live preview.',
		points: ['Static site, online store or web app', 'Asks for your pictures and documents', 'Connect your own domain when you are happy'],
	},
	{
		person: 'john',
		name: 'John',
		color: '#ec4899',
		label: 'Step 2 · Promote',
		title: 'John takes it to the world',
		text: 'John reads your finished website and writes ads, posts, trending hashtags and short video scripts that match your brand.',
		points: ['Google, Facebook and Instagram ad copy', 'Hashtags and a content calendar', '6 to 10 second video scripts and creatives'],
	},
	{
		person: 'maria',
		name: 'Maria',
		color: '#14b8a6',
		label: 'Step 3 · Support',
		title: 'Maria answers your customers',
		text: 'Maria learns your business from your website and answers visitors day and night. She saves every lead so you can follow up.',
		points: ['Chat on your own website', 'Answers from your real content', 'Leads saved in one place'],
	},
];

function useBand(index: number, progress: MotionValue<number>) {
	const count = STEPS.length;
	const center = (index + 0.5) / count;
	const half = 0.5 / count;
	const first = index === 0;
	const last = index === count - 1;
	// Scroll-linked values must stay inside [0, 1] and never decrease.
	const input = [
		first ? 0 : center - half * 1.15,
		first ? 0 : center - half * 0.55,
		last ? 1 : center + half * 0.55,
		last ? 1 : center + half * 1.15,
	];
	const turn = [first ? 0 : -80, 0, 0, last ? 0 : 80];
	const fade = [first ? 1 : 0, 1, 1, last ? 1 : 0];
	const lift = [first ? 0 : 24, 0, 0, last ? 0 : -24];
	return {
		rotate: useTransform(progress, input, turn),
		opacity: useTransform(progress, input, fade),
		textY: useTransform(progress, input, lift),
	};
}

function StoryText({ step }: { step: Step }) {
	return (
		<div>
			<p className="text-sm font-medium" style={{ color: step.color }}>
				{step.label}
			</p>
			<h3 className="mt-3 text-3xl font-semibold tracking-tight text-white md:text-5xl">{step.title}</h3>
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

function ProgressDots({ progress }: { progress: MotionValue<number> }) {
	return (
		<div className="absolute bottom-6 left-1/2 flex -translate-x-1/2 gap-2">
			{STEPS.map((s, i) => (
				<ProgressDot key={s.name} index={i} color={s.color} progress={progress} />
			))}
		</div>
	);
}

function ProgressDot({ index, color, progress }: { index: number; color: string; progress: MotionValue<number> }) {
	const c = (index + 0.5) / STEPS.length;
	const scaleX = useTransform(progress, [c - 0.2, c, c + 0.2], [1, 3, 1]);
	const opacity = useTransform(progress, [c - 0.2, c, c + 0.2], [0.3, 1, 0.3]);
	return <motion.span className="h-1.5 w-3 rounded-full" style={{ background: color, scaleX, opacity }} />;
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

export function LandingStory() {
	const reduce = useReducedMotion();
	const ref = useRef<HTMLDivElement>(null);
	const { scrollYProgress } = useScroll({ target: ref, offset: ['start start', 'end end'] });

	if (reduce) return <StaticStory />;

	return (
		<div ref={ref} className="relative h-[320vh]" id="how">
			<div className="sticky top-0 flex h-screen items-center overflow-hidden">
				<div
					aria-hidden
					className="pointer-events-none absolute left-1/4 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#4f46e5]/20 blur-3xl"
				/>
				<div className="mx-auto grid w-full max-w-6xl grid-rows-[1fr_1fr] items-center gap-2 px-6 md:grid-cols-2 md:grid-rows-1 md:gap-12">
					<div className="relative h-full w-full [perspective:1200px] md:h-[72vh]">
						{STEPS.map((s, i) => (
							<CharacterOnly key={s.name} step={s} index={i} progress={scrollYProgress} />
						))}
					</div>
					<div className="relative h-full w-full md:h-[72vh]">
						{STEPS.map((s, i) => (
							<TextOnly key={s.name} step={s} index={i} progress={scrollYProgress} />
						))}
					</div>
				</div>
				<ProgressDots progress={scrollYProgress} />
			</div>
		</div>
	);
}

function CharacterOnly({ step, index, progress }: { step: Step; index: number; progress: MotionValue<number> }) {
	const { rotate, opacity } = useBand(index, progress);
	return (
		<motion.div
			className="absolute inset-0 flex items-end justify-center"
			style={{ rotateY: rotate, opacity, transformStyle: 'preserve-3d' }}
		>
			<WavingCharacter person={step.person} color={step.color} className="h-[40vh] md:h-[68vh]" />
		</motion.div>
	);
}

function TextOnly({ step, index, progress }: { step: Step; index: number; progress: MotionValue<number> }) {
	const { opacity, textY } = useBand(index, progress);
	return (
		<motion.div className="absolute inset-0 flex flex-col justify-center" style={{ opacity, y: textY }}>
			<StoryText step={step} />
		</motion.div>
	);
}
