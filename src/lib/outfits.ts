import { useSyncExternalStore } from 'react';

export type TroopPerson = 'jack' | 'john' | 'maria';
export type OutfitId = 'classic' | 'festive' | 'christmas';

export interface Outfit {
	id: OutfitId;
	label: string;
	/** File infix of the artwork this outfit uses. */
	art: '' | '-ethnic';
	santaHat: boolean;
}

export const OUTFITS: Record<OutfitId, Outfit> = {
	classic: { id: 'classic', label: 'Everyday', art: '', santaHat: false },
	festive: { id: 'festive', label: 'Festive', art: '-ethnic', santaHat: false },
	christmas: { id: 'christmas', label: 'Christmas', art: '', santaHat: true },
};

export const OUTFIT_ORDER: OutfitId[] = ['classic', 'festive', 'christmas'];

export interface Occasion {
	id: string;
	name: string;
	outfit: OutfitId;
	/** Inclusive start and end as [month, day], month starting at 1. */
	from: [number, number];
	to: [number, number];
	/** What the team says when asking for the new look. */
	ask: string;
}

/** Festivals that move each year are listed as the window around their next date. */
export const OCCASIONS: Occasion[] = [
	{ id: 'christmas', name: 'Christmas', outfit: 'christmas', from: [11, 20], to: [12, 26], ask: 'Christmas is coming! Can we get Santa hats for the team?' },
	{ id: 'sankranti', name: 'Makar Sankranti and Pongal', outfit: 'festive', from: [1, 8], to: [1, 16], ask: 'Sankranti and Pongal are here! Can we wear our festive outfits?' },
	{ id: 'republic-day', name: 'Republic Day', outfit: 'festive', from: [1, 22], to: [1, 26], ask: 'Republic Day is near. Can we dress up in our ethnic wear?' },
	{ id: 'holi', name: 'Holi', outfit: 'festive', from: [3, 18], to: [3, 23], ask: 'Holi is almost here! Can we put on our festive outfits?' },
	{ id: 'diwali', name: 'Diwali', outfit: 'festive', from: [10, 22], to: [11, 1], ask: 'Diwali is around the corner! Can we dress in our festive best?' },
];

const dayNumber = (month: number, day: number) => month * 100 + day;

export function activeOccasion(date = new Date()): Occasion | null {
	const today = dayNumber(date.getMonth() + 1, date.getDate());
	return OCCASIONS.find((o) => today >= dayNumber(...o.from) && today <= dayNumber(...o.to)) ?? null;
}

const STORAGE_KEY = 'alwaysbro-outfit';

interface OutfitState {
	outfit: OutfitId;
	/** Occasion windows the user has already answered, as "id-year". */
	answered: string[];
}

const listeners = new Set<() => void>();
let state: OutfitState = read();

function read(): OutfitState {
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Partial<OutfitState>;
		const outfit = parsed.outfit && parsed.outfit in OUTFITS ? parsed.outfit : 'classic';
		return { outfit, answered: Array.isArray(parsed.answered) ? parsed.answered : [] };
	} catch {
		return { outfit: 'classic', answered: [] };
	}
}

function write(next: OutfitState) {
	state = next;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// the choice then lasts until the page closes
	}
	listeners.forEach((fn) => fn());
}

const subscribe = (fn: () => void) => {
	listeners.add(fn);
	return () => listeners.delete(fn);
};

export function setOutfit(outfit: OutfitId) {
	write({ ...state, outfit });
}

export function answerOccasion(occasion: Occasion, accepted: boolean) {
	const key = `${occasion.id}-${new Date().getFullYear()}`;
	write({
		outfit: accepted ? occasion.outfit : state.outfit,
		answered: state.answered.includes(key) ? state.answered : [...state.answered, key],
	});
}

export function pendingOccasion(): Occasion | null {
	const occasion = activeOccasion();
	if (!occasion) return null;
	return state.answered.includes(`${occasion.id}-${new Date().getFullYear()}`) ? null : occasion;
}

export function useOutfit() {
	const current = useSyncExternalStore(subscribe, () => state);
	const outfit = OUTFITS[current.outfit];
	return {
		outfit,
		answered: current.answered,
		waveSrc: (person: TroopPerson) => `/troop/${person}${outfit.art}-wave.webp`,
		faceSrc: (person: TroopPerson) => `/troop/${person}${outfit.art}-face.webp`,
	};
}
