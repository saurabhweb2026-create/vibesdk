import { useState } from 'react';
import { useNavigate } from 'react-router';
import { motion, useReducedMotion } from 'framer-motion';
import { ChevronDown, ChevronUp } from 'lucide-react';

export type TroopStatus =
	| 'idle'
	| 'planning'
	| 'setup'
	| 'building'
	| 'fixing'
	| 'preview'
	| 'deploying'
	| 'done';

interface TroopStageProps {
	status: TroopStatus;
	fileName?: string;
	appId?: string;
}

const TROOP = [
	{ id: 'caesar', name: 'Caesar', role: 'Builds your site', color: '#f97316', src: '/troop/caesar.webp' },
	{ id: 'louie', name: 'Louie', role: 'Ads', color: '#ec4899', src: '/troop/louie.webp' },
	{ id: 'jack', name: 'Jack', role: 'Customer support', color: '#84cc16', src: '/troop/jack.webp' },
] as const;

const STEPS = ['Plan', 'Build', 'Preview', 'Ready'];

const STEP_INDEX: Record<TroopStatus, number> = {
	idle: -1,
	planning: 0,
	setup: 1,
	building: 1,
	fixing: 1,
	preview: 2,
	deploying: 3,
	done: 4,
};

function baseName(path?: string): string {
	if (!path) return '';
	const parts = path.split('/');
	return parts[parts.length - 1] || path;
}

function caesarLine(status: TroopStatus, fileName?: string): string {
	switch (status) {
		case 'planning':
			return 'Drawing the plan for your site...';
		case 'setup':
			return 'Setting up your project...';
		case 'building':
			return fileName ? `Writing ${baseName(fileName)}...` : 'Building your pages...';
		case 'fixing':
			return 'Spotting and fixing a problem...';
		case 'preview':
			return 'Putting your preview together...';
		case 'deploying':
			return 'Taking your site live...';
		case 'done':
			return 'All done! Your site is ready.';
		default:
			return 'Tell me what to build and I will get to work.';
	}
}

function louieLine(status: TroopStatus): string {
	if (status === 'done') return 'Nice work, Caesar! Want ads for this site?';
	if (status === 'idle') return 'I write your ads once the site is ready.';
	return 'Taking notes for your ads.';
}

function jackLine(status: TroopStatus): string {
	if (status === 'done') return 'Great site! Want me to answer your customers?';
	if (status === 'idle') return 'I answer your customers once the site is ready.';
	return 'Learning your site to help customers.';
}

export function TroopStage({ status, fileName, appId }: TroopStageProps) {
	const reduceMotion = useReducedMotion();
	const navigate = useNavigate();
	const [collapsed, setCollapsed] = useState(false);
	const working = status !== 'idle' && status !== 'done';
	const finished = status === 'done';
	const stepIndex = STEP_INDEX[status];
	const lines = [caesarLine(status, fileName), louieLine(status), jackLine(status)];
	const animate = !reduceMotion;

	const header = (
		<div className="flex items-center justify-between px-3 pt-2">
			<div className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-widest text-white/60">
				<span
					className="inline-block size-1.5 rounded-full"
					style={{ background: working ? '#f97316' : finished ? '#22c55e' : '#6b7280' }}
				/>
				The troop
			</div>
			<button
				type="button"
				aria-label={collapsed ? 'Show the troop' : 'Hide the troop'}
				onClick={() => setCollapsed((v) => !v)}
				className="rounded p-0.5 text-white/60 hover:text-white"
			>
				{collapsed ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
			</button>
		</div>
	);

	if (collapsed) {
		return (
			<div className="sticky top-0 z-20">
				<div className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] text-white shadow-lg">
					{header}
					<div className="flex items-center gap-3 px-3 pb-2 pt-1">
						<img src={TROOP[0].src} alt="Caesar" className="h-9 w-auto shrink-0" />
						<div className="min-w-0 flex-1 truncate text-xs text-white/90">{lines[0]}</div>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="sticky top-0 z-20">
			<div
				className="overflow-hidden rounded-2xl border border-white/10 bg-[#0c0c0c] text-white shadow-lg"
				style={{
					backgroundImage:
						'radial-gradient(ellipse at 50% 0%, rgba(249,115,22,0.16), transparent 60%), linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
					backgroundSize: '100% 100%, 22px 22px, 22px 22px',
				}}
			>
				{header}

				<div className="relative grid grid-cols-3 gap-2 px-3 pb-1 pt-2">
					{TROOP.map((c, i) => {
						const isCaesar = i === 0;
						const active = isCaesar ? working || status === 'idle' || finished : finished;
						const waiting = !isCaesar && !finished;
						return (
							<div key={c.id} className="flex min-w-0 flex-col items-center">
								<div
									className="relative mb-1 w-full min-h-[38px] rounded-xl border px-2 py-1 text-center text-[10.5px] leading-snug"
									style={{
										borderColor: `${c.color}${isCaesar ? '99' : '44'}`,
										background: isCaesar ? `${c.color}22` : 'rgba(255,255,255,0.04)',
										color: isCaesar ? '#fff' : 'rgba(255,255,255,0.7)',
									}}
								>
									{lines[i]}
									<span
										className="absolute left-1/2 top-full size-2 -translate-x-1/2 -translate-y-1 rotate-45 border-b border-r"
										style={{
											borderColor: `${c.color}${isCaesar ? '99' : '44'}`,
											background: isCaesar ? '#2a1a0e' : '#161616',
										}}
									/>
								</div>

								<motion.div
									className="h-[84px]"
									animate={animate && (working || finished) ? { y: [0, -4, 0] } : { y: 0 }}
									transition={{
										duration: 2.4,
										repeat: Infinity,
										ease: 'easeInOut',
										delay: i * 0.45,
									}}
								>
									<img
										src={c.src}
										alt={c.name}
										className="h-full w-auto select-none object-contain"
										draggable={false}
										style={{
											opacity: waiting ? 0.72 : 1,
											filter: active
												? `drop-shadow(0 0 12px ${c.color}99)`
												: 'saturate(0.8)',
										}}
									/>
								</motion.div>

								<div className="mt-0.5 flex items-center gap-1 font-mono text-[10px] uppercase tracking-wider">
									<span style={{ color: c.color }}>{c.name}</span>
									{!isCaesar && (
										<span className="rounded-full border border-white/15 px-1.5 text-[8.5px] text-white/55">
											{finished ? 'Ready' : 'Waiting'}
										</span>
									)}
								</div>
								{!isCaesar && finished && appId && (
									<button
										type="button"
										onClick={() => navigate(`/${c.id}?site=${appId}`)}
										className="mt-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold text-black"
										style={{ background: c.color }}
									>
										{c.id === 'louie' ? 'Write my ads' : 'Set up Jack'}
									</button>
								)}
							</div>
						);
					})}

					{animate && (working || finished) && (
						<div className="pointer-events-none absolute inset-x-0 top-[62px] h-6">
							<motion.div
								className="absolute size-3.5 rounded-[4px] border"
								style={{ borderColor: '#fb923c', background: 'rgba(249,115,22,0.55)', boxShadow: '0 0 10px #f97316' }}
								animate={{ left: ['20%', '47%'], opacity: [0, 1, 1, 0], y: [0, -8, -8, 0] }}
								transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut' }}
							/>
							<motion.div
								className="absolute size-3.5 rounded-[4px] border"
								style={{ borderColor: '#f472b6', background: 'rgba(236,72,153,0.55)', boxShadow: '0 0 10px #ec4899' }}
								animate={{ left: ['52%', '80%'], opacity: [0, 1, 1, 0], y: [0, -8, -8, 0] }}
								transition={{ duration: 2.2, repeat: Infinity, ease: 'easeInOut', delay: 1.1 }}
							/>
						</div>
					)}
				</div>

				<div className="flex items-center gap-1.5 px-3 pb-2.5 pt-1">
					{STEPS.map((label, i) => {
						const complete = stepIndex > i;
						const current = stepIndex === i;
						return (
							<div key={label} className="flex flex-1 flex-col gap-1">
								<div className="h-1 overflow-hidden rounded-full bg-white/10">
									<motion.div
										className="h-full rounded-full"
										style={{ background: '#f97316' }}
										initial={false}
										animate={{ width: complete ? '100%' : current ? '55%' : '0%' }}
										transition={{ duration: 0.5 }}
									/>
								</div>
								<span
									className="font-mono text-[9px] uppercase tracking-wider"
									style={{ color: complete || current ? '#fdba74' : 'rgba(255,255,255,0.4)' }}
								>
									{label}
								</span>
							</div>
						);
					})}
				</div>
			</div>
		</div>
	);
}
