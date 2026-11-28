/** Bob's face, the voice assistant. */
export function BobAvatar({ className = 'size-full' }: { className?: string }) {
	return <img src="/troop/bob-face.webp" alt="Bob" draggable={false} className={`${className} bg-[#1f2a44] object-cover`} />;
}
