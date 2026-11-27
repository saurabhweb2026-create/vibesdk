import { motion } from 'framer-motion';
import { useNavigate } from 'react-router';
import { WavingCharacter, type TroopPerson } from '@/components/brand/waving-character';
import { THEMES } from '@/lib/themes';

interface Sidekick {
	person: TroopPerson;
	name: string;
	job: string;
	line: string;
	color: string;
	path: string;
}

const SIDEKICKS: Sidekick[] = [
	{ person: 'jack', name: 'Jack', job: 'Builder', line: 'Tell me the dream, I will do the typing.', color: '#3b82f6', path: '/' },
	{ person: 'john', name: 'John', job: 'Ads and posts', line: 'I make noise on the internet. The good kind.', color: '#ec4899', path: '/louie' },
	{ person: 'maria', name: 'Maria', job: 'Customer chat', line: 'Your customers never wait. I never sleep.', color: '#14b8a6', path: '/jack' },
];

const CHIP_COLORS = ['#3b82f6', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#ef4444'];

export function ThemeChips({ onPick }: { onPick: (id: string) => void }) {
	return (
		<div className="mt-4 flex flex-wrap items-center justify-center gap-2">
			<span className="font-display text-sm text-kumo-subtle">Need a head start?</span>
			{THEMES.map((t, i) => (
				<motion.button
					key={t.id}
					type="button"
					whileHover={{ y: -3, rotate: i % 2 ? 2 : -2 }}
					whileTap={{ scale: 0.95 }}
					onClick={() => onPick(t.id)}
					className="rounded-full border px-3 py-1 font-display text-sm font-medium text-kumo-strong"
					style={{ borderColor: `${CHIP_COLORS[i % CHIP_COLORS.length]}88`, background: `${CHIP_COLORS[i % CHIP_COLORS.length]}18` }}
				>
					{t.name}
				</motion.button>
			))}
		</div>
	);
}

export function SidekickRow() {
	const navigate = useNavigate();
	return (
		<section className="mx-auto mt-14 w-full max-w-4xl px-5 sm:px-6">
			<h2 className="text-center font-display text-2xl font-semibold text-kumo-strong sm:text-3xl">Your sidekicks are warming up</h2>
			<div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
				{SIDEKICKS.map((s, i) => (
					<motion.button
						key={s.person}
						type="button"
						onClick={() => navigate(s.path)}
						initial={{ opacity: 0, y: 24 }}
						whileInView={{ opacity: 1, y: 0 }}
						viewport={{ once: true }}
						transition={{ delay: i * 0.1 }}
						whileHover={{ y: -6, rotate: i === 1 ? 1 : -1 }}
						className="group relative flex flex-col items-center overflow-hidden rounded-3xl border p-5 text-center"
						style={{ borderColor: `${s.color}55`, background: `linear-gradient(160deg, ${s.color}26, transparent 70%)` }}
					>
						<WavingCharacter person={s.person} color={s.color} className="h-40" delay={i * 0.3} />
						<div className="mt-3 font-display text-xl font-semibold" style={{ color: s.color }}>
							{s.name} <span className="text-sm font-medium text-kumo-subtle">· {s.job}</span>
						</div>
						<p className="mt-1 text-sm text-kumo-subtle">{s.line}</p>
					</motion.button>
				))}
			</div>
		</section>
	);
}
