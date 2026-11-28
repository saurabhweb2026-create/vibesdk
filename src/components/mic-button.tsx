import { MicrophoneIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { canListen, useListen } from '@/lib/voice';

/** A small microphone that turns speech into text for the field next to it. */
export function MicButton({ onText, className = '' }: { onText: (text: string) => void; className?: string }) {
	const { listening, listen, cancel } = useListen();
	if (!canListen()) return null;

	const press = async () => {
		if (listening) {
			cancel();
			return;
		}
		try {
			onText(await listen());
		} catch (error) {
			if (error instanceof Error && error.message === 'not-allowed') toast.error('Allow the microphone to use your voice');
		}
	};

	return (
		<button
			type="button"
			onClick={press}
			aria-label={listening ? 'Stop listening' : 'Speak'}
			className={`relative flex size-9 shrink-0 items-center justify-center rounded-full border border-white/15 text-white/80 transition-colors hover:bg-white/10 ${className}`}
		>
			{listening && <span className="absolute inset-0 animate-ping rounded-full bg-[#8bf0c4]/40" />}
			<MicrophoneIcon className="relative size-4" weight={listening ? 'fill' : 'regular'} />
		</button>
	);
}
