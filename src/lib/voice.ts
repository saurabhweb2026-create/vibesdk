import { useCallback, useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';

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

export type VoiceWho = 'bob' | 'jack' | 'john' | 'maria';

/** How each speaker sounds: Maria gets a female voice, the men differ in pitch and in which male voice they take. */
const STYLE: Record<VoiceWho, { female: boolean; pitch: number; rate: number; rank: number }> = {
	bob: { female: false, pitch: 0.95, rate: 0.98, rank: 0 },
	jack: { female: false, pitch: 1.12, rate: 1.04, rank: 1 },
	john: { female: false, pitch: 0.8, rate: 0.94, rank: 2 },
	maria: { female: true, pitch: 1.05, rate: 1, rank: 0 },
};

/** The most human voice the device has for a language and speaker: neural and Indian first. */
function pickVoice(voices: SpeechSynthesisVoice[], lang: string, who: VoiceWho): SpeechSynthesisVoice | undefined {
	const base = lang.split('-')[0].toLowerCase();
	const same = voices.filter((v) => v.lang.toLowerCase().replace('_', '-').startsWith(base));
	const exact = same.filter((v) => v.lang.toLowerCase().replace('_', '-') === lang.toLowerCase());
	const pool = exact.length ? exact : same;
	const style = STYLE[who];
	const score = (v: SpeechSynthesisVoice) => (FEMALE.test(v.name) === style.female ? 2 : 0) + (NEURAL.test(v.name) ? 1 : 0);
	const ranked = [...pool].sort((a, b) => score(b) - score(a));
	const best = score(ranked[0]);
	const equals = ranked.filter((v) => score(v) === best);
	return equals[style.rank % equals.length];
}

let speakToken = 0;

/** One audio element is reused so the browser keeps allowing playback after the first tap. */
let player: HTMLAudioElement | null = null;
const SILENT_WAV = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

/** Browsers only allow audio after a tap, so the shared element is unlocked on the first one. */
function unlockPlayer(): void {
	if (player) return;
	player = new Audio(SILENT_WAV);
	void player.play().then(() => player?.pause()).catch(() => { player = null; });
}

if (typeof document !== 'undefined') {
	for (const type of ['pointerdown', 'touchend', 'keydown'] as const) {
		document.addEventListener(type, unlockPlayer, { once: true, passive: true });
	}
}
/** When the studio voice failed, the device voice is used until this time. */
let studioRetryAt = 0;
const STUDIO_RETRY_MS = 5 * 60 * 1000;

async function speakStudio(text: string, lang: string, who: VoiceWho, token: number): Promise<boolean> {
	if (Date.now() < studioRetryAt) return false;
	const audio = await apiClient.speakAudio(text, lang, who);
	if (!audio) {
		studioRetryAt = Date.now() + STUDIO_RETRY_MS;
		return false;
	}
	if (token !== speakToken) return true;
	player ??= new Audio();
	const url = URL.createObjectURL(audio);
	const el = player;
	let started = false;
	try {
		await new Promise<void>((resolve, reject) => {
			el.onended = () => resolve();
			el.onpause = () => resolve();
			el.onerror = () => reject(new Error('playback'));
			el.src = url;
			el.play().then(() => { started = true; }, reject);
		});
	} catch {
		// a blocked start falls back to the device voice; a mid-sentence error is not repeated
	} finally {
		URL.revokeObjectURL(url);
	}
	return started;
}

/** Speaks as the given teammate: a studio Indian voice when it is set up, the device voice otherwise. */
export async function speak(text: string, lang = 'en-IN', who: VoiceWho = 'bob'): Promise<void> {
	const token = ++speakToken;
	if (canSpeak()) window.speechSynthesis.cancel();
	player?.pause();
	if (await speakStudio(text, lang, who, token)) return;
	if (!canSpeak() || token !== speakToken) return;
	const voice = pickVoice(await loadVoices(), lang, who);
	if (token !== speakToken) return;
	await new Promise<void>((resolve) => {
		const utterance = new SpeechSynthesisUtterance(text);
		utterance.voice = voice ?? null;
		utterance.lang = voice?.lang ?? lang;
		utterance.rate = STYLE[who].rate;
		utterance.pitch = STYLE[who].pitch;
		utterance.onend = () => resolve();
		utterance.onerror = () => resolve();
		window.speechSynthesis.speak(utterance);
	});
}

export function stopSpeaking(): void {
	speakToken++;
	player?.pause();
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
