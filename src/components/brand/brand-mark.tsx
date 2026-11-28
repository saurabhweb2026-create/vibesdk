import { cn } from '@cloudflare/kumo';
import { useOutfit } from '@/lib/outfits';

const FACE_BORDER = {
	caesar: 'border-[#3b82f6]/50',
	louie: 'border-[#ec4899]/50',
	jack: 'border-[#14b8a6]/50',
} as const;

const FACE_FILE = { caesar: 'jack', louie: 'john', jack: 'maria' } as const;

export function BrandLogo({ className }: { className?: string }) {
	return (
		<img
			src="/logo-512.png"
			alt="AlwaysBro"
			className={cn('shrink-0 object-contain', className)}
			draggable={false}
		/>
	);
}

export function BrandFace({
	className,
	face = 'caesar',
}: {
	className?: string;
	face?: keyof typeof FACE_BORDER;
}) {
	const { faceSrc } = useOutfit();
	return (
		<span
			className={cn(
				'inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border bg-[#eef2ff]',
				FACE_BORDER[face],
				className,
			)}
		>
			<img
				src={faceSrc(FACE_FILE[face])}
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
				'font-semibold tracking-tight',
				className,
			)}
		>
			Always<span className="text-[#8bf0c4]">Bro</span>
		</span>
	);
}
