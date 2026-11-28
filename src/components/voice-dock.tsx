import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { MicrophoneIcon } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/auth-context';
import { useAuthModal } from '@/components/auth/AuthModalProvider';
import { AUTO_RUN_KEY, PROMPT_STORAGE_KEY } from '@/lib/themes';
import { canListen, speak, useListen } from '@/lib/voice';
import { applyWardrobeCommand, routeCommand, type VoiceCommand } from '@/lib/voice-commands';
import { OUTFITS } from '@/lib/outfits';

const REPLY: Record<VoiceCommand['person'], string> = {
	jack: 'On it. I am starting your website now.',
	john: 'Got it. I am writing your ads now.',
	maria: 'Sure. Let me answer that.',
};

const PATH: Record<VoiceCommand['person'], (task: string) => string> = {
	jack: () => '/',
	john: (task) => `/louie?say=${encodeURIComponent(task)}`,
	maria: (task) => `/jack?say=${encodeURIComponent(task)}`,
};

/** One microphone for the whole team: say what you need and the right teammate takes it. */
export function VoiceDock() {
	const { user } = useAuth();
	const { showAuthModal } = useAuthModal();
	const navigate = useNavigate();
	const { listening, listen, cancel } = useListen();
	const [heard, setHeard] = useState('');

	if (!canListen()) return null;

	const dispatch = ({ person, task }: VoiceCommand) => {
		if (person === 'jack') {
			sessionStorage.setItem(PROMPT_STORAGE_KEY, task);
			sessionStorage.setItem(AUTO_RUN_KEY, '1');
		}
		navigate(PATH[person](task));
	};

	const handle = (spoken: string) => {
		setHeard(spoken);
		const outfit = applyWardrobeCommand(spoken);
		if (outfit) {
			speak(`Looking good! I am wearing the ${OUTFITS[outfit].label} outfit.`, 'maria');
			return;
		}
		const command = routeCommand(spoken);
		speak(REPLY[command.person], command.person);
		if (user) dispatch(command);
		else showAuthModal('Sign in to meet your team', () => dispatch(command));
	};

	const press = async () => {
		if (listening) {
			cancel();
			return;
		}
		setHeard('');
		try {
			handle(await listen());
		} catch (error) {
			const reason = error instanceof Error ? error.message : '';
			if (reason === 'not-allowed') toast.error('Allow the microphone to talk to your team');
			else if (reason !== 'aborted') toast.message('I did not catch that. Please try again.');
		}
	};

	return (
		<div className="fixed bottom-5 right-5 z-[70] flex items-center gap-3 pb-[env(safe-area-inset-bottom)]">
			{(listening || heard) && (
				<div className="font-label max-w-[60vw] rounded-full border border-white/10 bg-black/70 px-4 py-2 text-[11px] text-white/80 backdrop-blur">
					{listening ? 'Listening...' : heard}
				</div>
			)}
			<button
				type="button"
				onClick={press}
				aria-label={listening ? 'Stop listening' : 'Talk to your team'}
				className="relative flex size-14 items-center justify-center rounded-full bg-white text-black shadow-[0_0_40px_rgba(139,240,196,0.35)] transition-transform hover:scale-105 active:scale-95"
			>
				{listening && <span className="absolute inset-0 animate-ping rounded-full bg-[#8bf0c4]/60" />}
				<MicrophoneIcon className="relative size-6" weight="fill" />
			</button>
		</div>
	);
}
