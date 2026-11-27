import { cn } from '@cloudflare/kumo';

const FACE_BORDER = {
	caesar: 'border-[#3b82f6]/50',
	louie: 'border-[#ec4899]/50',
	jack: 'border-[#14b8a6]/50',
} as const;

const FACE_FILE = { caesar: 'jack', louie: 'john', jack: 'maria' } as const;

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
				'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-[#eef2ff]',
				FACE_BORDER[face],
				className,
			)}
		>
			<img
				src={`/troop/${FACE_FILE[face]}-face.webp`}
				alt={FACE_FILE[face]}
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
				'font-sans font-bold tracking-tight',
				className,
			)}
		>
			Always<span className="text-[#4f46e5]">Bro</span>
		</span>
	);
}
