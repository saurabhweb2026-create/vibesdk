import { useCallback, useRef, useState } from 'react';
import { apiClient } from './api-client';
import type { TroopPerson } from './outfits';

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

/** Each teammate sounds a little different: the voice is picked by name, pitch and pace. */
const PERSONA: Record<TroopPerson, { pitch: number; rate: number; female: boolean }> = {
	jack: { pitch: 1, rate: 1, female: false },
	john: { pitch: 0.85, rate: 1.04, female: false },
	maria: { pitch: 1.12, rate: 1, female: true },
};

const FEMALE_VOICE = /female|woman|zira|heera|veena|samantha|aria|jenny|susan|karen/i;
const MALE_VOICE = /(?<!fe)male|\bman\b|ravi|rishi|david|mark|daniel|guy|alex/i;

function pickVoice(female: boolean): SpeechSynthesisVoice | undefined {
	const voices = window.speechSynthesis.getVoices();
	const english = voices.filter((v) => v.lang.toLowerCase().startsWith('en'));
	const indian = english.filter((v) => v.lang.toLowerCase().includes('in'));
	const matches = (list: SpeechSynthesisVoice[]) => list.find((v) => (female ? FEMALE_VOICE : MALE_VOICE).test(v.name));
	return matches(indian) ?? matches(english) ?? indian[0] ?? english[0];
}

function speakWithBrowser(text: string, person: TroopPerson): void {
	if (!canSpeak()) return;
	const { pitch, rate, female } = PERSONA[person];
	window.speechSynthesis.cancel();
	const utterance = new SpeechSynthesisUtterance(text);
	utterance.voice = pickVoice(female) ?? null;
	utterance.lang = utterance.voice?.lang ?? 'en-IN';
	utterance.pitch = pitch;
	utterance.rate = rate;
	window.speechSynthesis.speak(utterance);
}

let player: HTMLAudioElement | null = null;
let speechToken = 0;

/** Speaks in the teammate's own studio voice; falls back to the browser voice when that is unavailable. */
export async function speak(text: string, person: TroopPerson): Promise<void> {
	stopSpeaking();
	const token = ++speechToken;
	try {
		const blob = await apiClient.voiceSpeak(person, text);
		if (token !== speechToken) return;
		const url = URL.createObjectURL(blob);
		const audio = new Audio(url);
		audio.onended = () => URL.revokeObjectURL(url);
		player = audio;
		await audio.play();
	} catch {
		if (token === speechToken) speakWithBrowser(text, person);
	}
}

export function stopSpeaking(): void {
	speechToken++;
	player?.pause();
	player = null;
	if (canSpeak()) window.speechSynthesis.cancel();
}

/** Listens once and resolves with what was said. */
export function useListen() {
	const [listening, setListening] = useState(false);
	const active = useRef<Recognition | null>(null);

	const listen = useCallback((): Promise<string> => {
		const Ctor = recognitionCtor();
		if (!Ctor) return Promise.reject(new Error('unsupported'));
		active.current?.stop();
		return new Promise((resolve, reject) => {
			const recognition = new Ctor();
			recognition.lang = 'en-IN';
			recognition.interimResults = false;
			let heard = '';
			recognition.onresult = (event) => {
				heard = Array.from(event.results)
					.map((r) => r[0]?.transcript ?? '')
					.join(' ')
					.trim();
			};
			recognition.onerror = (event) => reject(new Error(event.error));
			recognition.onend = () => {
				setListening(false);
				active.current = null;
				if (heard) resolve(heard);
				else reject(new Error('no-speech'));
			};
			active.current = recognition;
			setListening(true);
			recognition.start();
		});
	}, []);

	const cancel = useCallback(() => active.current?.stop(), []);

	return { listening, listen, cancel };
}
