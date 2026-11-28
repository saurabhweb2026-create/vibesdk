import { setOutfit, type OutfitId, type TroopPerson } from './outfits';

export interface VoiceCommand {
	person: TroopPerson;
	/** What was asked, without the teammate's name in front. */
	task: string;
}

const NAME = /^(?:hey |hi |ok |okay )?(jack|john|maria)[,:]?\s*/i;
const JOHN = /\b(ads?|advert\w*|campaign|instagram|facebook|meta|reel|social|promot\w*|market\w*|post)\b/i;
const MARIA = /\b(customers?|support|reply|answer|chat ?bot|faq|complaint|question)\b/i;

/** Decides who should handle a spoken request: a name wins, then keywords, and Jack builds by default. */
export function routeCommand(spoken: string): VoiceCommand {
	const named = NAME.exec(spoken);
	const task = spoken.replace(NAME, '').trim() || spoken.trim();
	if (named) return { person: named[1].toLowerCase() as TroopPerson, task };
	if (JOHN.test(task)) return { person: 'john', task };
	if (MARIA.test(task)) return { person: 'maria', task };
	return { person: 'jack', task };
}

const WARDROBE: Array<[RegExp, OutfitId]> = [
	[/christmas|santa|xmas/i, 'christmas'],
	[/festiv|diwali|holi|pongal|sankranti|ethnic|traditional|kurta|saree|sari|indian/i, 'festive'],
	[/everyday|normal|classic|regular|usual/i, 'classic'],
];

/** "Wear the Christmas outfit" changes the team's clothes. Returns the outfit chosen, if any. */
export function applyWardrobeCommand(spoken: string): OutfitId | null {
	if (!/\b(wear|dress|outfit|clothes|costume|look)\b/i.test(spoken)) return null;
	const hit = WARDROBE.find(([pattern]) => pattern.test(spoken));
	if (!hit) return null;
	setOutfit(hit[1]);
	return hit[1];
}
