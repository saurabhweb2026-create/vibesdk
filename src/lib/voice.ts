import { useCallback, useRef, useState } from 'react';

interface RecognitionEvent {
	results: ArrayLike<ArrayLike<{ transcript: string }>>;
}

interface Recognition {
	lang: string;
	interimResults: boolean;
	onresult: ((event: RecognitionEvent) => void) | null;
	onerror: ((event: { error: string }) => void) | null;
	onend: (() => void) | null;
	start(): void;
	stop(): void;
}

type RecognitionCtor = new () => Recognition;

const recognitionCtor = (): RecognitionCtor | undefined => {
	const w = window as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
	return w.SpeechRecognition ?? w.webkitSpeechRecognition;
};

export const canListen = () => typeof window !== 'undefined' && Boolean(recognitionCtor());
export const canSpeak = () => typeof window !== 'undefined' && 'speechSynthesis' in window;

const FEMALE = /female|woman|zira|heera|veena|neerja|swara|kalpana|lekha|samantha|aria|jenny|susan|karen/i;
const NEURAL = /natural|neural|online|google/i;

function loadVoices(): Promise<SpeechSynthesisVoice[]> {
	const now = window.speechSynthesis.getVoices();
	if (now.length) return Promise.resolve(now);
	return new Promise((resolve) => {
		const done = () => resolve(window.speechSynthesis.getVoices());
		window.speechSynthesis.addEventListener('voiceschanged', done, { once: true });
		setTimeout(done, 1000);
	});
}

/** The most human male voice the device has for a language: neural and Indian first, then any male voice. */
function pickVoice(voices: SpeechSynthesisVoice[], lang: string): SpeechSynthesisVoice | undefined {
	const base = lang.split('-')[0].toLowerCase();
	const same = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(base));
	const exact = same.filter((v) => v.lang.toLowerCase().replace('_', '-') === lang.toLowerCase());
	const pool = exact.length ? exact : same;
	const score = (v: SpeechSynthesisVoice) => (FEMALE.test(v.name) ? 0 : 2) + (NEURAL.test(v.name) ? 1 : 0);
	return [...pool].sort((a, b) => score(b) - score(a))[0];
}

let speakToken = 0;

/** Speaks in Vinod's voice in the given language and resolves when the sentence has finished. */
export async function speak(text: string, lang = 'en-IN'): Promise<void> {
	if (!canSpeak()) return;
	window.speechSynthesis.cancel();
	const token = ++speakToken;
	const voice = pickVoice(await loadVoices(), lang);
	if (token !== speakToken) return;
	await new Promise<void>((resolve) => {
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.voice = voice ?? null;
		utterance.lang = voice?.lang ?? lang;
		utterance.rate = 0.98;
		utterance.pitch = 0.95;
		utterance.onend = () => resolve();
		utterance.onerror = () => resolve();
		window.speechSynthesis.speak(utterance);
	});
}

export function stopSpeaking(): void {
	speakToken++;
	if (canSpeak()) window.speechSynthesis.cancel();
}

/** Listens once in the given language and resolves with what was said. */
export function useListen() {
	const [listening, setListening] = useState(false);
	const active = useRef<Recognition | null>(null);
	const cancelled = useRef(false);

	const listen = useCallback((lang = 'en-IN'): Promise<string> => {
		const Ctor = recognitionCtor();
		if (!Ctor) return Promise.reject(new Error('unsupported'));
		active.current?.stop();
		cancelled.current = false;
		return new Promise((resolve, reject) => {
			const recognition = new Ctor();
			recognition.lang = lang;
			recognition.interimResults = false;
			let heard = '';
			let failure = '';
			recognition.onresult = (event) => {
				heard = Array.from(event.results)
					.map((r) => r[0]?.transcript ?? '')
					.join(' ')
					.trim();
			};
			recognition.onerror = (event) => {
				failure = event.error;
			};
			recognition.onend = () => {
				setListening(false);
				active.current = null;
				if (cancelled.current) reject(new Error('aborted'));
				else if (heard) resolve(heard);
				else reject(new Error(failure || 'no-speech'));
			};
			active.current = recognition;
			setListening(true);
			recognition.start();
		});
	}, []);

	const cancel = useCallback(() => {
		cancelled.current = true;
		active.current?.stop();
	}, []);

	return { listening, listen, cancel };
}
