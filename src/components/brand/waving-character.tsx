import { motion, useReducedMotion } from 'framer-motion';

export type TroopPerson = 'jack' | 'john' | 'maria';

const WAVE_SRC: Record<TroopPerson, string> = {
	jack: '/troop/jack-wave.webp',
	john: '/troop/john-wave.webp',
	maria: '/troop/maria-wave.webp',
};

interface WavingCharacterProps {
	person: TroopPerson;
	color: string;
	className?: string;
	delay?: number;
}

/**
 * Transparent full-body character that sways gently from the feet. Hover adds a wave-back.
 */
export function WavingCharacter({ person, color, className = 'h-72', delay = 0 }: WavingCharacterProps) {
	const reduce = useReducedMotion();
	const glow = { filter: `drop-shadow(0 0 18px ${color}88)` };

	return (
		<motion.div
			className="relative inline-block"
			style={{ transformOrigin: '50% 100%' }}
			animate={reduce ? undefined : { rotate: [-1.2, 1.2, -1.2], y: [0, -4, 0] }}
			whileHover={reduce ? undefined : { scale: 1.06, rotate: [0, -3, 3, -2, 0], transition: { duration: 0.7 } }}
			transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut', delay }}
		>
			<img src={WAVE_SRC[person]} alt={person} draggable={false} className={`w-auto ${className}`} style={glow} />
		</motion.div>
	);
}
