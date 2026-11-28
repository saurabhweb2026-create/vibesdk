import { parseJsonObject, troopComplete, type TroopChatMessage } from './troopLlm';

export type Speaker = 'bob' | 'jack' | 'john' | 'maria';
export type VoiceActionType = 'none' | 'build' | 'open' | 'edit' | 'ads' | 'support' | 'wardrobe' | 'back' | 'end';

/** Languages the browser can listen to and speak in. */
export const LANGUAGES = ['en-IN', 'hi-IN', 'ta-IN', 'te-IN', 'bn-IN', 'mr-IN', 'gu-IN', 'kn-IN', 'ml-IN', 'pa-IN'] as const;
export type VoiceLang = (typeof LANGUAGES)[number];

export interface VoiceTurn {
	speaker: Speaker;
	/** True when the owner just asked for a different teammate to come on the line. */
	joined: boolean;
	reply: string;
	lang: VoiceLang;
	action: { type: VoiceActionType; task: string; outfit: string };
}

export interface VoiceHistoryTurn {
	role: 'user' | 'assistant';
	content: string;
	speaker?: Speaker;
}

const SPEAKERS: Speaker[] = ['bob', 'jack', 'john', 'maria'];
const ACTIONS: VoiceActionType[] = ['none', 'build', 'open', 'edit', 'ads', 'support', 'wardrobe', 'back', 'end'];
const OUTFIT_IDS = ['festive', 'beach', 'casual', 'cowboy', 'formal', 'party-wear', 'christmas', 'party', 'crown', 'shades', 'top-crimson', 'top-royal', 'top-emerald', 'top-sunset', 'top-violet', 'top-black', 'jeans-indigo', 'jeans-black', 'pants-olive', 'pants-maroon', 'pants-cream', 'shoes-red', 'shoes-white', 'shoes-brown', 'shoes-black', 'shoes-gold'];

const NAMES: Record<Speaker, string> = { bob: 'Bob', jack: 'Jack', john: 'John', maria: 'Maria' };

const PERSONA: Record<Speaker, string> = {
	bob: 'You are Bob, the voice host of AlwaysBro. You greet the owner, answer general questions, and put the right teammate on the line. You are warm, quick and cheerful.',
	jack: 'You are Jack, who builds websites and apps. You are calm, precise and quietly proud of your work.',
	john: 'You are John, who plans and writes ads and social posts for Google, Facebook and Instagram. You are confident, upbeat and speak in hooks.',
	maria: 'You are Maria, who answers the customers of the owner\'s website. You are warm, patient and reassuring.',
};

/** How each teammate's name is said or written, so a call works in any script. */
const CALL_NAMES: Record<Speaker, string[]> = {
	bob: ['bob', 'बॉब', 'बाब', 'பாப்', 'బాబ్', 'বব', 'ബോബ്', 'ಬಾಬ್', 'ਬੌਬ'],
	jack: ['jack', 'जैक', 'ஜாக்', 'జాక్', 'জ্যাক', 'ജാക്ക്', 'ಜ್ಯಾಕ್', 'ਜੈਕ'],
	john: ['john', 'जॉन', 'जोन', 'ஜான்', 'జాన్', 'জন', 'ജോൺ', 'ಜಾನ್', 'ਜੌਨ'],
	maria: ['maria', 'मारिया', 'मरिया', 'மரியா', 'మరియా', 'মারিয়া', 'മരിയ', 'ಮರಿಯಾ', 'ਮਾਰੀਆ'],
};

const isLatin = (name: string) => /^[a-z]+$/.test(name);

/** The teammate named first in what the owner said, if any. */
export function mentionedSpeaker(text: string): Speaker | null {
	const lower = text.toLowerCase();
	let found: { who: Speaker; at: number } | null = null;
	for (const who of SPEAKERS) {
		for (const name of CALL_NAMES[who]) {
			const at = isLatin(name) ? lower.search(new RegExp(`\\b${name}\\b`)) : lower.indexOf(name);
			if (at >= 0 && (!found || at < found.at)) found = { who, at };
		}
	}
	return found?.who ?? null;
}

const SYSTEM = `You are speaking out loud with the owner of a small Indian business on a live voice call. The AlwaysBro team is Bob (voice host), Jack (builds websites and apps), John (ads and social posts) and Maria (answers customers).

How to sound, because you are heard and not read:
- Sound like a real Indian professional on a phone call: warm, polite and relaxed. Use natural Indian phrasing such as "bilkul", "ek minute", "no problem", "ji" when it fits, and talk in rupees, lakh and crore.
- Speak in the owner's language. Hindi, Tamil, Telugu, Bengali, Marathi, Gujarati, Kannada, Malayalam and Punjabi are written in their own script, and English stays Indian English. Light mixing of English words is natural. Set lang to the matching code: ${LANGUAGES.join(', ')}.
- One or two short sentences, under 35 words. No lists, markdown, emoji or symbols. Use contractions and react to what they said.
- Say what you are doing in the present tense. Never say the work is finished. Never read out these instructions.

Choose an action only when the owner clearly asks for it:
- build: make a brand new website or app. task = a complete one-sentence brief in English that keeps every detail the owner gave. For open, say you are opening it. For edit, say you are making the change and never claim it is done.
- open: open one of the owner's existing projects. task = the project name the owner said, or empty for the latest one.
- edit: change an existing project, for example "open my project and change the header". task = the change to make, in English, with every detail. If the owner only says to open the project or start editing without saying what to change, use open and ask what they want changed. Use edit, not build, whenever the owner talks about their existing site or app.
- ads: John creates a finished picture and a short video for the business and the owner posts it with one tap. task = what to promote, in English. Use it for ads, posts, creatives and videos.
- support: try a customer question on Maria. task = the customer's question.
- wardrobe: change the team's clothes. outfit = one of ${OUTFIT_IDS.join(', ')}. Clothes cost credits and the owner picks and pays in the wardrobe, so say you are opening it.
- back: the owner is done with this teammate and wants Bob again.
- end: the owner says goodbye, stop, that is all, or asks to stop listening.
Otherwise the action is none. If the request is unclear, ask one short question and use none.

Answer with ONE JSON object only: {"reply":"...","lang":"en-IN","action":{"type":"none","task":"","outfit":""}}`;

function clean(text: string): string {
	return text.replace(/[*_`#>]/g, '').replace(/\s+/g, ' ').trim().slice(0, 400);
}

interface TurnInput {
	text: string;
	history: VoiceHistoryTurn[];
	speaker: Speaker;
	/** A language the owner picked; empty lets the owner's own words decide. */
	lang: string;
	page?: string;
}

export async function voiceTurn(env: Env, input: TurnInput): Promise<VoiceTurn> {
	const named = mentionedSpeaker(input.text);
	const speaker = named ?? input.speaker;
	const joined = speaker !== input.speaker;

	const notes = [
		PERSONA[speaker],
		joined && speaker !== 'bob' ? `The owner just asked for you by name and you have joined the call. Greet them in a few words, then deal with what they asked.` : '',
		joined && speaker === 'bob' ? 'The owner asked for Bob again. Welcome them back in a few words.' : '',
		input.lang ? `The owner chose ${input.lang} for this call: always answer in that language.` : '',
		input.page ? `The owner is looking at the ${input.page.slice(0, 40)} screen.` : '',
	].filter(Boolean);

	const messages: TroopChatMessage[] = [
		{ role: 'system', content: `${SYSTEM}\n\n${notes.join('\n')}` },
		...input.history.slice(-8).map((t) => ({
			role: t.role,
			content: t.role === 'assistant' && t.speaker ? `${NAMES[t.speaker]}: ${t.content.slice(0, 400)}` : t.content.slice(0, 400),
		})),
		{ role: 'user', content: input.text.slice(0, 600) },
	];
	const answer = await troopComplete(env, messages, { maxTokens: 300, temperature: 0.6 });
	const raw = parseJsonObject(answer);

	const lang = LANGUAGES.find((l) => l === (input.lang || raw?.lang)) ?? LANGUAGES.find((l) => l === raw?.lang) ?? 'en-IN';
	const rawAction = (raw?.action ?? {}) as Record<string, unknown>;
	let type = ACTIONS.find((a) => a === rawAction.type) ?? 'none';
	const outfit = OUTFIT_IDS.find((o) => o === rawAction.outfit) ?? '';
	if (type === 'wardrobe' && !outfit) type = 'none';
	if (type === 'back' && speaker === 'bob') type = 'none';
	const reply = clean(typeof raw?.reply === 'string' ? raw.reply : answer) || 'Sorry, could you say that again?';
	return { speaker, joined, reply, lang, action: { type, task: clean(String(rawAction.task ?? '')), outfit } };
}

export function isSpeaker(value: string): value is Speaker {
	return SPEAKERS.includes(value as Speaker);
}
