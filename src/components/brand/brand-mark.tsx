import { cn } from '@cloudflare/kumo';

export function BrandFace({ className }: { className?: string }) {
	return (
		<span
			className={cn(
				'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-[#f97316]/50 bg-[#1a1008]',
				className,
			)}
		>
			<img
				src="/troop/caesar-face.webp"
				alt="Monkeytrooprs"
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
