import { useRef, useState } from 'react';
import { useNavigate, useLocation } from 'react-router';
import { toast } from 'sonner';
import { MicrophoneIcon } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/auth-context';
import { useAuthModal } from '@/components/auth/AuthModalProvider';
import { apiClient, type VoiceHistoryTurn, type VoiceTurn } from '@/lib/api-client';
import { AUTO_RUN_KEY, PROMPT_STORAGE_KEY } from '@/lib/themes';
import { canListen, speak, useListen } from '@/lib/voice';
import type { TroopPerson } from '@/lib/outfits';

const PAGE_OWNER: Record<string, TroopPerson> = { '/louie': 'john', '/jack': 'maria' };

/** One microphone for the whole team: say what you need, the right teammate answers aloud and gets on it. */
export function VoiceDock() {
	const { user } = useAuth();
	const { showAuthModal } = useAuthModal();
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const { listening, listen, cancel } = useListen();
	const [heard, setHeard] = useState('');
	const [thinking, setThinking] = useState(false);
	const history = useRef<VoiceHistoryTurn[]>([]);

	if (!canListen()) return null;

	const act = ({ speaker, action }: VoiceTurn) => {
		switch (action.type) {
			case 'build':
				sessionStorage.setItem(PROMPT_STORAGE_KEY, action.task);
				sessionStorage.setItem(AUTO_RUN_KEY, '1');
				navigate('/');
				break;
			case 'ads':
				navigate(`/louie?say=${encodeURIComponent(action.task)}`);
				break;
			case 'support':
				navigate(`/jack?say=${encodeURIComponent(action.task)}`);
				break;
			case 'wardrobe':
				navigate(`/wardrobe?outfit=${encodeURIComponent(action.outfit)}&who=${speaker}`);
				break;
		}
	};

	const converse = async (spoken: string) => {
		setThinking(true);
		try {
			const res = await apiClient.voiceTurn(spoken, history.current, PAGE_OWNER[pathname]);
			if (!res.data) throw new Error('empty');
			const turn = res.data;
			history.current = [...history.current, { role: 'user' as const, content: spoken }, { role: 'assistant' as const, content: turn.reply }].slice(-8);
			void speak(turn.reply, turn.speaker);
			act(turn);
		} catch {
			toast.message('The team could not answer just now. Please try again.');
		} finally {
			setThinking(false);
		}
	};

	const handle = (spoken: string) => {
		setHeard(spoken);
		if (user) void converse(spoken);
		else showAuthModal('Sign in to talk to your team', () => void converse(spoken));
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

	const status = listening ? 'Listening...' : thinking ? 'Thinking...' : heard;

	return (
		<div className="fixed bottom-5 right-5 z-[70] flex items-center gap-3 pb-[env(safe-area-inset-bottom)]">
			{status && (
				<div className="font-label max-w-[60vw] rounded-full border border-white/10 bg-black/70 px-4 py-2 text-[11px] text-white/80 backdrop-blur">{status}</div>
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
