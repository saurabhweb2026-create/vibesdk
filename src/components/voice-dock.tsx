import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useLocation, useNavigate } from 'react-router';
import { toast } from 'sonner';
import { ArrowUUpLeftIcon, MicrophoneIcon, StopIcon } from '@phosphor-icons/react';
import { useAuth } from '@/contexts/auth-context';
import { useAuthModal } from '@/components/auth/AuthModalProvider';
import { apiClient, type VoiceHistoryTurn, type VoiceSpeaker, type VoiceTurn } from '@/lib/api-client';
import { BobAvatar } from '@/components/brand/bob-avatar';
import { useOutfit, type TroopPerson } from '@/lib/outfits';
import { queueVoiceEdit } from '@/lib/voice-edit';
import { AUTO_RUN_KEY, PROMPT_STORAGE_KEY } from '@/lib/themes';
import { canListen, speak, stopSpeaking, useListen } from '@/lib/voice';

const LANG_KEY = 'alwaysbro-voice-lang';

/** Auto lets Bob follow whichever language the owner speaks. */
const LANGUAGES: Array<{ code: string; label: string }> = [
	{ code: 'auto', label: 'Auto' },
	{ code: 'en-IN', label: 'English' },
	{ code: 'hi-IN', label: 'हिन्दी' },
	{ code: 'ta-IN', label: 'தமிழ்' },
	{ code: 'te-IN', label: 'తెలుగు' },
	{ code: 'bn-IN', label: 'বাংলা' },
	{ code: 'mr-IN', label: 'मराठी' },
	{ code: 'gu-IN', label: 'ગુજરાતી' },
	{ code: 'kn-IN', label: 'ಕನ್ನಡ' },
	{ code: 'ml-IN', label: 'മലയാളം' },
	{ code: 'pa-IN', label: 'ਪੰਜਾਬੀ' },
];

const GREETING: Record<string, string> = {
	'en-IN': 'Hello! I am Bob. Tell me, what shall we do today?',
	'hi-IN': 'नमस्ते! मैं बॉब हूँ। बताइए, आज क्या करना है?',
	'ta-IN': 'வணக்கம்! நான் பாப். சொல்லுங்கள், இன்று என்ன செய்யலாம்?',
	'te-IN': 'నమస్కారం! నేను బాబ్. చెప్పండి, ఈ రోజు ఏం చేద్దాం?',
	'bn-IN': 'নমস্কার! আমি বব। বলুন, আজ কী করব?',
	'mr-IN': 'नमस्कार! मी बॉब आहे. सांगा, आज काय करूया?',
	'gu-IN': 'નમસ્તે! હું બોબ છું. કહો, આજે શું કરીએ?',
	'kn-IN': 'ನಮಸ್ಕಾರ! ನಾನು ಬಾಬ್. ಹೇಳಿ, ಇಂದು ಏನು ಮಾಡೋಣ?',
	'ml-IN': 'നമസ്കാരം! ഞാൻ ബോബ്. പറയൂ, ഇന്ന് എന്ത് ചെയ്യണം?',
	'pa-IN': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਮੈਂ ਬੌਬ ਹਾਂ। ਦੱਸੋ, ਅੱਜ ਕੀ ਕਰੀਏ?',
};

const CREW: Record<VoiceSpeaker, { name: string; person: TroopPerson | null; route: string | null; hello: string }> = {
	bob: { name: 'Bob', person: null, route: null, hello: '' },
	jack: { name: 'Jack', person: 'jack', route: null, hello: 'Hi, Jack here. What shall we build?' },
	john: { name: 'John', person: 'john', route: '/louie', hello: 'John here. Tell me about your ads and your audience.' },
	maria: { name: 'Maria', person: 'maria', route: '/jack', hello: 'Maria here. How can I help your customers today?' },
};

type Phase = 'listening' | 'thinking' | 'speaking';
interface Line {
	who: 'you' | VoiceSpeaker;
	text: string;
}

const PHASE_LABEL: Record<Phase, string> = { listening: 'Listening', thinking: 'Thinking', speaking: 'Speaking' };
const MAX_SILENT_ROUNDS = 3;
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Bob, the team's voice. One tap starts a hands-free conversation: he listens, answers aloud,
 * brings in Jack, John or Maria when asked, puts the team to work on the right half of the screen,
 * and listens again until you stop him.
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
	const speaker = useRef<VoiceSpeaker>('bob');
	const { faceSrc } = useOutfit();
	const [onCall, setOnCall] = useState<VoiceSpeaker>('bob');
	const [pick, setPick] = useState(() => {
		try {
			return localStorage.getItem(LANG_KEY) ?? 'auto';
		} catch {
			return 'auto';
		}
	});
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

	/** The project the owner means: the one open on screen, else the named one, else the latest. */
	const openProject = async (hint: string): Promise<boolean> => {
		const current = /^\/chat\/([^/]+)/.exec(path.current)?.[1];
		if (current && !hint) return true;
		const res = await apiClient.getRecentApps();
		const apps = res.data?.apps ?? [];
		const wanted = hint.trim().toLowerCase();
		const match = (wanted && apps.find((a) => a.title.toLowerCase().includes(wanted))) || apps[0];
		if (!match) return false;
		if (current !== match.id) navigate(`/chat/${match.id}`);
		return true;
	};

	const act = ({ action }: VoiceTurn) => {
		switch (action.type) {
			case 'open':
				void openProject(action.task).then((found) => {
					if (!found) toast.message('You have no projects yet. Ask Jack to build one.');
				});
				break;
			case 'edit':
				void openProject('').then((found) => {
					if (found) queueVoiceEdit(action.task);
					else toast.message('You have no projects yet. Ask Jack to build one.');
				});
				break;
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
				navigate(`/wardrobe?item=${encodeURIComponent(action.outfit)}`);
				break;
		}
	};

	const switchTo = (who: VoiceSpeaker) => {
		speaker.current = who;
		setOnCall(who);
		const route = CREW[who].route;
		if (route && path.current !== route) navigate(route);
	};

	const say = (who: Line['who'], text: string) => setLines((all) => [...all.slice(-30), { who, text }]);

	const converse = async (spoken: string): Promise<VoiceTurn> => {
		const res = await apiClient.voiceTurn(spoken, history.current, {
			speaker: speaker.current,
			lang: pick === 'auto' ? '' : pick,
			page: path.current,
		});
		if (!res.data) throw new Error('empty');
		const turn = res.data;
		history.current = [
			...history.current,
			{ role: 'user' as const, content: spoken },
			{ role: 'assistant' as const, content: turn.reply, speaker: turn.speaker },
		].slice(-12);
		return turn;
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
					toast.error('Allow the microphone to talk to Bob');
					break;
				}
				if (++silent >= MAX_SILENT_ROUNDS) {
					toast.message('Bob is here whenever you need him. Tap the mic to talk again.');
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
				const joined = turn.speaker !== speaker.current;
				if (joined) switchTo(turn.speaker);
				if (turn.action.type === 'back') switchTo('bob');
				say(turn.speaker, turn.reply);
				act(turn);
				setPhase('speaking');
				await speak(turn.reply, turn.lang, turn.speaker);
				if (turn.action.type === 'end') break;
			} catch {
				const sorry = 'Sorry, I lost the line for a moment. Please say that again.';
				say(speaker.current, sorry);
				await speak(sorry, 'en-IN', speaker.current);
			}
		}
		running.current = false;
		setLive(false);
	};

	const start = () => {
		if (running.current) return;
		running.current = true;
		history.current = [];
		lang.current = pick === 'auto' ? 'en-IN' : pick;
		speaker.current = 'bob';
		setOnCall('bob');
		setLines([]);
		setLive(true);
		const hello = GREETING[lang.current] ?? GREETING['en-IN'];
		say('bob', hello);
		void speak(hello, lang.current, 'bob').then(() => loop());
	};

	const stop = () => {
		running.current = false;
		cancel();
		stopSpeaking();
		setLive(false);
	};

	const choose = (code: string) => {
		setPick(code);
		if (code !== 'auto') lang.current = code;
		try {
			localStorage.setItem(LANG_KEY, code);
		} catch {
			// the choice then lasts until the page closes
		}
	};

	const press = () => (user ? start() : showAuthModal('Sign in to talk to your team', start));

	return (
		<>
			{!live && (
				<button
					type="button"
					onClick={press}
					aria-label="Talk to Bob, the voice assistant"
					className="fixed bottom-24 right-3 z-[70] flex items-center gap-2.5 rounded-full border border-[#8bf0c4]/50 bg-[#07080b]/90 py-1.5 pr-4 pl-1.5 text-white shadow-[0_0_32px_rgba(139,240,196,0.35)] backdrop-blur transition-transform hover:scale-105 active:scale-95 md:bottom-28 md:right-5"
				>
					<span className="relative size-11 shrink-0">
						<span className="absolute -inset-1 rounded-full bg-[#8bf0c4]/40 blur-sm" style={{ animation: 'voice-pulse 2.4s ease-in-out infinite' }} />
						<span className="relative block size-full overflow-hidden rounded-full ring-2 ring-[#8bf0c4]">
							<BobAvatar />
						</span>
						<span className="absolute -right-0.5 -bottom-0.5 flex size-4.5 items-center justify-center rounded-full bg-[#8bf0c4] text-black">
							<MicrophoneIcon className="size-3" weight="fill" />
						</span>
					</span>
					<span className="text-left leading-tight">
						<span className="block text-sm font-medium">Bob</span>
						<span className="font-label block text-[9px] text-[#8bf0c4]">Voice assistant</span>
					</span>
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
								<span className="relative flex size-12 items-center justify-center overflow-hidden rounded-full bg-black/80 ring-1 ring-white/25">
									{CREW[onCall].person ? <img src={faceSrc(CREW[onCall].person as TroopPerson)} alt="" className="size-full object-cover" /> : <BobAvatar />}
								</span>
							</div>
							<div className="min-w-0 flex-1">
								<div className="text-lg font-medium tracking-[-0.02em]">
									{CREW[onCall].name}
									{onCall === 'bob' && <span className="font-label ml-2 rounded-full bg-[#8bf0c4]/15 px-2 py-0.5 align-middle text-[9px] text-[#8bf0c4]">Voice assistant</span>}
								</div>
								<div className="font-label text-[11px] text-[#8bf0c4]">{onCall === 'bob' ? PHASE_LABEL[phase] : `On call, ${PHASE_LABEL[phase].toLowerCase()}`}</div>
							</div>
							{onCall !== 'bob' && (
								<button
									type="button"
									onClick={() => switchTo('bob')}
									className="font-label flex items-center gap-1.5 rounded-full border border-white/20 px-3 py-2 text-[11px] hover:bg-white/10"
								>
									<ArrowUUpLeftIcon className="size-4" />
									Bob
								</button>
							)}
							<button
								type="button"
								onClick={stop}
								className="font-label flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-[11px] hover:bg-white/10"
							>
								<StopIcon className="size-4" weight="fill" />
								End
							</button>
						</header>
						<div className="flex gap-1.5 overflow-x-auto px-5 pb-3">
							{LANGUAGES.map((l) => (
								<button
									key={l.code}
									type="button"
									onClick={() => choose(l.code)}
									className="shrink-0 rounded-full border px-3 py-1 text-[11px]"
									style={{ borderColor: pick === l.code ? '#8bf0c4' : 'rgba(255,255,255,0.15)', background: pick === l.code ? 'rgba(139,240,196,0.14)' : 'transparent' }}
								>
									{l.label}
								</button>
							))}
						</div>
						<div ref={feed} className="flex-1 space-y-3 overflow-y-auto px-5 pb-5">
							{lines.length === 0 && <p className="text-sm text-white/50">Go ahead, I am listening. Ask in any Indian language, or say "call Maria".</p>}
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
