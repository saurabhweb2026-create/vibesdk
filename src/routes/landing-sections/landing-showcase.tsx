import { useReducedMotion } from 'framer-motion';

interface Theme {
	name: string;
	accent: string;
	tone: string;
}

const ROW_ONE: Theme[] = [
	{ name: 'Restaurant', accent: '#f97316', tone: '#1c1410' },
	{ name: 'Salon and spa', accent: '#ec4899', tone: '#1a1118' },
	{ name: 'Online store', accent: '#3b82f6', tone: '#0f1522' },
	{ name: 'Portfolio', accent: '#a78bfa', tone: '#15121f' },
	{ name: 'Coaching', accent: '#14b8a6', tone: '#0e1b1a' },
	{ name: 'Clinic', accent: '#22c55e', tone: '#0f1a13' },
];

const ROW_TWO: Theme[] = [
	{ name: 'Real estate', accent: '#eab308', tone: '#1a170c' },
	{ name: 'Fitness studio', accent: '#ef4444', tone: '#1c1111' },
	{ name: 'Photography', accent: '#06b6d4', tone: '#0d1a1d' },
	{ name: 'Event planner', accent: '#f472b6', tone: '#1c121a' },
	{ name: 'Tutor', accent: '#6366f1', tone: '#12132a' },
	{ name: 'Local services', accent: '#fb923c', tone: '#1c1510' },
];

function ThemeCard({ theme }: { theme: Theme }) {
	return (
		<div
			className="w-64 shrink-0 overflow-hidden rounded-2xl border border-white/10 sm:w-72"
			style={{ background: theme.tone }}
		>
			<div className="flex items-center gap-1.5 border-b border-white/10 px-3 py-2">
				<span className="size-2 rounded-full bg-white/25" />
				<span className="size-2 rounded-full bg-white/25" />
				<span className="size-2 rounded-full bg-white/25" />
			</div>
			<div className="space-y-3 p-4">
				<div className="h-24 rounded-xl" style={{ background: `linear-gradient(135deg, ${theme.accent}, ${theme.accent}33)` }} />
				<div className="h-3 w-2/3 rounded-full bg-white/80" />
				<div className="h-2 w-full rounded-full bg-white/20" />
				<div className="h-2 w-4/5 rounded-full bg-white/20" />
				<div className="flex items-center justify-between pt-1">
					<span className="text-xs font-medium text-white/80">{theme.name}</span>
					<span className="h-6 w-16 rounded-full" style={{ background: theme.accent }} />
				</div>
			</div>
		</div>
	);
}

function Row({ themes, reverse, seconds }: { themes: Theme[]; reverse?: boolean; seconds: number }) {
	const reduce = useReducedMotion();
	const loop = [...themes, ...themes];
	return (
		<div className="overflow-hidden">
			<div
				className="flex w-max gap-4 pr-4"
				style={
					reduce
						? undefined
						: {
								animation: `landing-marquee ${seconds}s linear infinite`,
								animationDirection: reverse ? 'reverse' : 'normal',
							}
				}
			>
				{loop.map((t, i) => (
					<ThemeCard key={`${t.name}-${i}`} theme={t} />
				))}
			</div>
		</div>
	);
}

export function LandingShowcase() {
	return (
		<div
			className="space-y-4 [mask-image:linear-gradient(90deg,transparent,#000_10%,#000_90%,transparent)]"
			aria-label="Website themes Jack can build"
		>
			<Row themes={ROW_ONE} seconds={55} />
			<Row themes={ROW_TWO} seconds={65} reverse />
		</div>
	);
}
