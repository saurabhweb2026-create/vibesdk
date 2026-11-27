import { motion, useReducedMotion } from 'framer-motion';

export type TroopPerson = 'jack' | 'john' | 'maria';

const WAVE_SRC: Record<TroopPerson, string> = {
	jack: '/troop/jack-wave.webp',
	john: '/troop/john-wave.webp',
	maria: '/troop/maria-wave.webp',
};

const IDLE_SRC: Partial<Record<TroopPerson, string>> = {
	jack: '/troop/jack-stand.webp',
};

interface WavingCharacterProps {
	person: TroopPerson;
	color: string;
	className?: string;
	delay?: number;
}

/**
 * Transparent full-body character. Jack alternates between a standing and a
 * waving pose; the others sway gently from the feet. Hover adds a wave-back.
 */
export function WavingCharacter({ person, color, className = 'h-72', delay = 0 }: WavingCharacterProps) {
	const reduce = useReducedMotion();
	const idle = IDLE_SRC[person];
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
			{idle && !reduce && (
				<motion.img
					src={idle}
					alt=""
					aria-hidden
					draggable={false}
					className={`absolute inset-0 w-auto ${className}`}
					style={glow}
					animate={{ opacity: [1, 1, 0, 0, 1] }}
					transition={{ duration: 3.2, repeat: Infinity, times: [0, 0.35, 0.45, 0.8, 0.9], delay }}
				/>
			)}
		</motion.div>
	);
}
