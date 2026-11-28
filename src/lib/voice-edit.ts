const KEY = 'alwaysbro-voice-edit';
const EVENT = 'alwaysbro:voice-edit';

/** Holds an instruction spoken on a voice call until the project chat is ready to take it. */
export function queueVoiceEdit(text: string): void {
	try {
		sessionStorage.setItem(KEY, text);
	} catch {
		// the instruction is lost only if storage is blocked
	}
	window.dispatchEvent(new Event(EVENT));
}

export function takeVoiceEdit(): string {
	try {
		const text = sessionStorage.getItem(KEY) ?? '';
		sessionStorage.removeItem(KEY);
		return text;
	} catch {
		return '';
	}
}

export function onVoiceEdit(handler: () => void): () => void {
	window.addEventListener(EVENT, handler);
	return () => window.removeEventListener(EVENT, handler);
}
