import { motion, useReducedMotion } from 'framer-motion';

import { OUTFITS, useOutfit, type OutfitId, type TroopPerson } from '@/lib/outfits';

export type { TroopPerson };

/** Where the head sits in the everyday artwork, as fractions of the image width. */
const HEAD: Record<TroopPerson, { x: number; width: number }> = {
	jack: { x: 0.567, width: 0.29 },
	john: { x: 0.554, width: 0.264 },
	maria: { x: 0.528, width: 0.3 },
};

export function SantaHat({ person }: { person: TroopPerson }) {
	const { x, width } = HEAD[person];
	const hatWidth = width * 1.12;
	return (
		<svg
			viewBox="0 0 100 80"
			aria-hidden
			className="pointer-events-none absolute"
			style={{ width: `${hatWidth * 100}%`, left: `${(x - hatWidth / 2) * 100}%`, bottom: '95.5%', transform: 'rotate(-7deg)' }}
		>
			<path d="M8 66 C16 20 52 2 80 18 C86 22 90 30 92 66 Z" fill="#d62839" />
			<path d="M8 66 C16 20 52 2 80 18 C70 30 40 40 8 66 Z" fill="#ef4452" opacity="0.5" />
			<rect x="2" y="62" width="96" height="16" rx="8" fill="#fdf6ec" />
			<circle cx="84" cy="14" r="9" fill="#fdf6ec" />
		</svg>
	);
}

interface WavingCharacterProps {
	person: TroopPerson;
	/** Shows this outfit instead of the one the person wears, for trying looks on. */
	preview?: OutfitId;
	color: string;
	className?: string;
	delay?: number;
}

/**
 * Transparent full-body character that sways gently from the feet. Hover adds a wave-back.
 */
export function WavingCharacter({ person, color, preview, className = 'h-72', delay = 0 }: WavingCharacterProps) {
	const reduce = useReducedMotion();
	const { outfitFor } = useOutfit();
	const outfit = preview ? OUTFITS[preview] : outfitFor(person);
	const glow = { filter: `drop-shadow(0 0 18px ${color}88)` };

	return (
		<motion.div
			className="relative inline-block"
			style={{ transformOrigin: '50% 100%' }}
			animate={reduce ? undefined : { rotate: [-1.2, 1.2, -1.2], y: [0, -4, 0] }}
			whileHover={reduce ? undefined : { scale: 1.06, rotate: [0, -3, 3, -2, 0], transition: { duration: 0.7 } }}
			transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay }}
		>
			<img src={`/troop/${person}${outfit.art}-wave.webp`} alt={person} draggable={false} className={`w-auto ${className}`} style={glow} />
			{outfit.santaHat && <SantaHat person={person} />}
		</motion.div>
	);
}
