import { useReducedMotion } from 'framer-motion';
import { THEMES, type SiteTheme } from '@/lib/themes';

function ThemeCard({ theme, onPick }: { theme: SiteTheme; onPick: (id: string) => void }) {
	return (
		<button
			type="button"
			onClick={() => onPick(theme.id)}
			className="group w-72 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] text-left transition-transform hover:-translate-y-1 hover:border-[#4f46e5]/60 sm:w-80"
		>
			<img src={`/themes/thumbs/${theme.id}.webp`} alt={`${theme.name} theme`} loading="lazy" draggable={false} className="aspect-[3/2] w-full object-cover object-top" />
			<div className="flex items-center justify-between px-4 py-3">
				<div>
					<div className="text-sm font-semibold text-white">{theme.name}</div>
					<div className="text-xs text-white/55">{theme.bestFor}</div>
				</div>
				<span className="rounded-full bg-[#4f46e5] px-3 py-1 text-xs font-medium text-white opacity-80 transition-opacity group-hover:opacity-100">Use this</span>
			</div>
		</button>
	);
}

export function LandingShowcase({ onPick }: { onPick: (id: string) => void }) {
	const reduce = useReducedMotion();
	const loop = [...THEMES, ...THEMES];
	return (
		<div className="overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]" aria-label="Website themes Jack can start from">
			<div
				className="flex w-max gap-4 pr-4 hover:[animation-play-state:paused]"
				style={reduce ? undefined : { animation: 'landing-marquee 50s linear infinite' }}
			>
				{loop.map((t, i) => (
					<ThemeCard key={`${t.id}-${i}`} theme={t} onPick={onPick} />
				))}
			</div>
		</div>
	);
}
