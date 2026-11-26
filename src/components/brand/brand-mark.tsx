import { cn } from '@cloudflare/kumo';

const FACE_BORDER = {
	caesar: 'border-[#f97316]/50',
	louie: 'border-[#ec4899]/50',
	jack: 'border-[#84cc16]/50',
} as const;

export function BrandFace({
	className,
	face = 'caesar',
}: {
	className?: string;
	face?: keyof typeof FACE_BORDER;
}) {
	return (
		<span
			className={cn(
				'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-[#1a1008]',
				FACE_BORDER[face],
				className,
			)}
		>
			<img
				src={`/troop/${face}-face.webp`}
				alt={face === 'caesar' ? 'Monkeytrooprs' : face}
				className="size-full object-cover"
				draggable={false}
			/>
		</span>
	);
}

export function BrandName({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				'font-funky-mono font-black uppercase tracking-wide',
				className,
			)}
		>
			Monkey<span className="text-[#f97316]">trooprs</span>
		</span>
	);
}
