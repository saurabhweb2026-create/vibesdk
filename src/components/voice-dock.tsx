import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { MicrophoneIcon, StopIcon } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/auth-context';
import { useAuthModal } from '@/components/auth/AuthModalProvider';
import { apiClient, type VoiceHistoryTurn, type VoiceTurn } from '@/lib/api-client';
import { AUTO_RUN_KEY, PROMPT_STORAGE_KEY } from '@/lib/themes';
import { canListen, speak, stopSpeaking, useListen } from '@/lib/voice';

type Phase = 'listening' | 'thinking' | 'speaking';
interface Line {
	who: 'you' | 'vinod';
	text: string;
}

const PHASE_LABEL: Record<Phase, string> = { listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking' };
const MAX_SILENT_ROUNDS = 3;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Vinod, the team's voice. One tap starts a hands-free conversation: he listens, answers aloud,
 * puts the team to work on the right half of the screen, and listens again until you stop him.
 */
export function VoiceDock() {
	const { user } = useAuth();
	const { showAuthModal } = useAuthModal();
	const navigate = useNavigate();
	const { pathname } = useLocation();
	const { listen, cancel } = useListen();
	const [live, setLive] = useState(false);
	const [phase, setPhase] = useState<Phase>('listening');
	const [lines, setLines] = useState<Line[]>([]);
	const running = useRef(false);
	const history = useRef<VoiceHistoryTurn[]>([]);
	const lang = useRef('en-IN');
	const path = useRef(pathname);
	const feed = useRef<HTMLDivElement>(null);
	path.current = pathname;

	useEffect(() => {
		document.body.classList.toggle('voice-split', live);
		return () => document.body.classList.remove('voice-split');
	}, [live]);

	useEffect(() => {
		feed.current?.scrollTo({ top: feed.current.scrollHeight, behavior: 'smooth' });
	}, [lines]);

	useEffect(
		() => () => {
			running.current = false;
			stopSpeaking();
		},
		[],
	);

	if (!canListen()) return null;

	const act = ({ action }: VoiceTurn) => {
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
				navigate(`/wardrobe?outfit=${encodeURIComponent(action.outfit)}`);
				break;
		}
	};

	const say = (who: Line['who'], text: string) => setLines((all) => [...all.slice(-30), { who, text }]);

	const converse = async (spoken: string): Promise<VoiceTurn> => {
		const res = await apiClient.voiceTurn(spoken, history.current, path.current);
		if (!res.data) throw new Error('empty');
		history.current = [...history.current, { role: 'user' as const, content: spoken }, { role: 'assistant' as const, content: res.data.reply }].slice(-12);
		return res.data;
	};

	const loop = async () => {
		let silent = 0;
		while (running.current) {
			setPhase('listening');
			let spoken = '';
			try {
				spoken = await listen(lang.current);
				silent = 0;
			} catch (error) {
				const reason = error instanceof Error ? error.message : '';
				if (reason === 'aborted') break;
				if (reason === 'not-allowed' || reason === 'service-not-allowed') {
					toast.error('Allow the microphone to talk to Vinod');
					break;
				}
				if (++silent >= MAX_SILENT_ROUNDS) {
					toast.message('Vinod is here whenever you need him. Tap the mic to talk again.');
					break;
				}
				await pause(300);
				continue;
			}
			say('you', spoken);
			setPhase('thinking');
			try {
				const turn = await converse(spoken);
				lang.current = turn.lang;
				say('vinod', turn.reply);
				act(turn);
				setPhase('speaking');
				await speak(turn.reply, turn.lang);
				if (turn.action.type === 'end') break;
			} catch {
				say('vinod', 'Sorry, I lost the line for a moment. Please say that again.');
				await speak('Sorry, I lost the line for a moment. Please say that again.', 'en-IN');
			}
		}
		running.current = false;
		setLive(false);
	};

	const start = () => {
		if (running.current) return;
		running.current = true;
		history.current = [];
		lang.current = 'en-IN';
		setLines([]);
		setLive(true);
		void loop();
	};

	const stop = () => {
		running.current = false;
		cancel();
		stopSpeaking();
		setLive(false);
	};

	const press = () => (user ? start() : showAuthModal('Sign in to talk to your team', start));

	return (
		<>
			{!live && (
				<button
					type="button"
					onClick={press}
					aria-label="Talk to Vinod"
					className="fixed bottom-5 right-5 z-[70] flex size-14 items-center justify-center rounded-full bg-white pb-[env(safe-area-inset-bottom)] text-black shadow-[0_0_40px_rgba(139,240,196,0.35)] transition-transform hover:scale-105 active:scale-95"
				>
					<MicrophoneIcon className="size-6" weight="fill" />
				</button>
			)}
			{live &&
				createPortal(
					<section className="fixed inset-x-0 top-0 z-[80] flex h-[42%] flex-col border-b border-white/10 bg-[#07080b] text-white md:inset-y-0 md:right-auto md:h-full md:w-1/2 md:border-b-0 md:border-r">
						<header className="flex items-center gap-4 px-5 pt-5 pb-3">
							<div className="relative flex size-14 shrink-0 items-center justify-center">
								<span
									className="absolute inset-0 rounded-full bg-gradient-to-br from-[#8bf0c4] via-[#7aa2ff] to-[#c084fc] opacity-70 blur-md"
									style={{ animation: `voice-pulse ${phase === 'speaking' ? 0.9 : phase === 'thinking' ? 0.5 : 2.4}s ease-in-out infinite` }}
								/>
								<span className="relative flex size-12 items-center justify-center rounded-full bg-black/80 ring-1 ring-white/25">
									<MicrophoneIcon className="size-5 text-[#8bf0c4]" weight="fill" />
								</span>
							</div>
							<div className="min-w-0 flex-1">
								<div className="text-lg font-medium tracking-[-0.02em]">Vinod</div>
								<div className="font-label text-[11px] text-[#8bf0c4]">{PHASE_LABEL[phase]}</div>
							</div>
							<button
								type="button"
								onClick={stop}
								className="font-label flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-[11px] hover:bg-white/10"
							>
								<StopIcon className="size-4" weight="fill" />
								End
							</button>
						</header>
						<div ref={feed} className="flex-1 space-y-3 overflow-y-auto px-5 pb-5">
							{lines.length === 0 && <p className="text-sm text-white/50">Go ahead, I am listening. Ask in any Indian language.</p>}
							{lines.map((line, i) => (
								<div key={i} className={line.who === 'you' ? 'flex justify-end' : 'flex'}>
									<p
										className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-snug ${
											line.who === 'you' ? 'bg-white/10 text-white/90' : 'border border-[#8bf0c4]/25 bg-[#8bf0c4]/10 text-white'
										}`}
									>
										{line.text}
									</p>
								</div>
							))}
						</div>
					</section>,
					document.body,
				)}
		</>
	);
}
