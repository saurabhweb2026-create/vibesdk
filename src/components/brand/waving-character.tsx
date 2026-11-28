import { motion, useReducedMotion } from 'framer-motion';

import { fitsHeadGear, setArt, useOutfit, type Look, type TroopPerson } from '@/lib/outfits';

export type { TroopPerson };

/** Where the head sits in the everyday artwork: centre and width as fractions of the image width, eye line as a fraction of its height. */
const HEAD: Record<TroopPerson, { x: number; width: number; eyes: number }> = {
	jack: { x: 0.567, width: 0.29, eyes: 0.085 },
	john: { x: 0.554, width: 0.264, eyes: 0.091 },
	maria: { x: 0.528, width: 0.3, eyes: 0.073 },
};

/** How much a tint is lifted so dark clothes can take a light colour. */
const BASE_LIFT: Record<TroopPerson, Record<'top' | 'bottom' | 'shoes', number>> = {
	jack: { top: 0.25, bottom: 0.1, shoes: 0.2 },
	john: { top: 0.15, bottom: 0, shoes: 0.05 },
	maria: { top: 0.1, bottom: 0.3, shoes: 0.1 },
};

const luminance = (hex: string) => {
	const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
	return 0.3 * r + 0.59 * g + 0.11 * b;
};

function Tint({ person, region, color }: { person: TroopPerson; region: 'top' | 'bottom' | 'shoes'; color: string }) {
	const mask = `url(/troop/masks/${person}-${region}.webp)`;
	const layer = { position: 'absolute', inset: 0, pointerEvents: 'none', WebkitMaskImage: mask, maskImage: mask, WebkitMaskSize: '100% 100%', maskSize: '100% 100%', backgroundColor: color } as const;
	const lift = Math.min(0.7, BASE_LIFT[person][region] + 0.35 * luminance(color));
	return (
		<>
			<div aria-hidden style={{ ...layer, mixBlendMode: 'color' }} />
			{lift > 0.02 && <div aria-hidden style={{ ...layer, mixBlendMode: 'screen', opacity: lift }} />}
		</>
	);
}

function HeadGear({ person, item }: { person: TroopPerson; item: string }) {
	const { x, width, eyes } = HEAD[person];
	const anchor = (w: number) => ({ width: `${w * 100}%`, left: `${(x - w / 2) * 100}%` });

	if (item === 'christmas') {
		const w = width * 1.12;
		return (
			<svg viewBox="0 0 100 80" aria-hidden className="pointer-events-none absolute" style={{ ...anchor(w), bottom: '95.5%', transform: 'rotate(-7deg)' }}>
				<path d="M8 66 C16 20 52 2 80 18 C86 22 90 30 92 66 Z" fill="#d62839" />
				<path d="M8 66 C16 20 52 2 80 18 C70 30 40 40 8 66 Z" fill="#ef4452" opacity="0.5" />
				<rect x="2" y="62" width="96" height="16" rx="8" fill="#fdf6ec" />
				<circle cx="84" cy="14" r="9" fill="#fdf6ec" />
			</svg>
		);
	}
	if (item === 'party') {
		const w = width * 0.62;
		return (
			<svg viewBox="0 0 60 80" aria-hidden className="pointer-events-none absolute" style={{ ...anchor(w), bottom: '95%', transform: 'rotate(8deg)' }}>
				<path d="M30 4 L56 76 L4 76 Z" fill="#a855f7" />
				<path d="M30 4 L43 40 L17 40 Z" fill="#c084fc" />
				<path d="M13 52 L47 52 L50 62 L10 62 Z" fill="#fbbf24" opacity="0.9" />
				<circle cx="30" cy="5" r="5" fill="#fde047" />
			</svg>
		);
	}
	if (item === 'crown') {
		const w = width * 0.8;
		return (
			<svg viewBox="0 0 100 60" aria-hidden className="pointer-events-none absolute" style={{ ...anchor(w), bottom: '95%' }}>
				<path d="M6 54 L10 12 L32 32 L50 6 L68 32 L90 12 L94 54 Z" fill="#eab308" />
				<path d="M6 54 L10 12 L32 32 L50 6 L50 54 Z" fill="#facc15" opacity="0.55" />
				<rect x="6" y="46" width="88" height="10" rx="3" fill="#ca8a04" />
				<circle cx="50" cy="26" r="4.5" fill="#ef4444" />
				<circle cx="28" cy="40" r="3.5" fill="#38bdf8" />
				<circle cx="72" cy="40" r="3.5" fill="#22c55e" />
			</svg>
		);
	}
	if (item === 'shades') {
		const w = width * 0.98;
		return (
			<svg viewBox="0 0 100 34" aria-hidden className="pointer-events-none absolute" style={{ ...anchor(w), top: `${eyes * 100}%`, transform: 'translateY(-52%)' }}>
				<rect x="4" y="6" width="38" height="24" rx="9" fill="#0b0b0f" />
				<rect x="58" y="6" width="38" height="24" rx="9" fill="#0b0b0f" />
				<rect x="40" y="10" width="20" height="4" rx="2" fill="#0b0b0f" />
				<path d="M10 11 L22 11 L14 25 L10 25 Z" fill="#7dd3fc" opacity="0.35" />
				<path d="M64 11 L76 11 L68 25 L64 25 Z" fill="#7dd3fc" opacity="0.35" />
			</svg>
		);
	}
	return null;
}

interface WavingCharacterProps {
	person: TroopPerson;
	/** Shows this look instead of the one the person wears, for trying clothes on. */
	look?: Look;
	color: string;
	className?: string;
	delay?: number;
}

/**
 * Transparent full-body character that sways gently from the feet. Hover adds a wave-back.
 * Clothes are tinted onto the photo with blend modes, so folds and lighting stay.
 */
export function WavingCharacter({ person, color, look, className = 'h-72', delay = 0 }: WavingCharacterProps) {
	const reduce = useReducedMotion();
	const { lookFor } = useOutfit();
	const worn = look ?? lookFor(person);
	const art = setArt(worn);
	const glow = { filter: `drop-shadow(0 0 18px ${color}88)` };

	return (
		<motion.div
			className="relative isolate inline-block"
			style={{ transformOrigin: '50% 100%' }}
			animate={reduce ? undefined : { rotate: [-1.2, 1.2, -1.2], y: [0, -4, 0] }}
			whileHover={reduce ? undefined : { scale: 1.06, rotate: [0, -3, 3, -2, 0], transition: { duration: 0.7 } }}
			transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay }}
		>
			<img src={`/troop/${person}${art}-wave.webp`} alt={person} draggable={false} className={`w-auto ${className}`} style={glow} />
			{!worn.set && (['bottom', 'top', 'shoes'] as const).map((slot) => worn[slot] && <Tint key={slot} person={person} region={slot} color={worn[slot].color} />)}
			{worn.head && fitsHeadGear(worn) && <HeadGear person={person} item={worn.head.id} />}
		</motion.div>
	);
}
