import { useSyncExternalStore } from 'react';
import type { TeamMember, WardrobeItem, WardrobeSlot } from '@/lib/api-client';

export type TroopPerson = 'jack' | 'john' | 'maria';

/** The teammate each server-side agent id stands for. */
export const PERSON_AGENT = { jack: 'caesar', john: 'louie', maria: 'jack' } as const satisfies Record<TroopPerson, string>;

/** One worn item: its id and the colour it tints with. */
export interface Worn {
	id: string;
	color: string;
}

export type Look = Partial<Record<WardrobeSlot, Worn>>;

/** File infix of the artwork each full set uses. A set swaps the whole picture, so it also swaps the face icon. */
const SET_ART: Record<string, string> = {
	festive: '-ethnic',
	beach: '-beach',
	casual: '-casual',
	cowboy: '-cowboy',
	formal: '-formal',
	'party-wear': '-party',
};

export const setArt = (look: Look | undefined): string => (look?.set ? SET_ART[look.set.id] ?? '' : '');

/** Hats and glasses are placed for the everyday and festive pictures only. */
export const fitsHeadGear = (look: Look | undefined): boolean => !look?.set || look.set.id === 'festive';

export interface Occasion {
	id: string;
	name: string;
	/** The wardrobe item the team asks for. */
	item: string;
	/** Inclusive start and end as [month, day], month starting at 1. */
	from: [number, number];
	to: [number, number];
	/** What the team says when asking for the new look. */
	ask: string;
}

/** Festivals that move each year are listed as the window around their next date. */
export const OCCASIONS: Occasion[] = [
	{ id: 'christmas', name: 'Christmas', item: 'christmas', from: [11, 20], to: [12, 26], ask: 'Christmas is coming! Can we get Santa hats for the team?' },
	{ id: 'sankranti', name: 'Makar Sankranti and Pongal', item: 'festive', from: [1, 8], to: [1, 16], ask: 'Sankranti and Pongal are here! Can we wear our festive outfits?' },
	{ id: 'republic-day', name: 'Republic Day', item: 'festive', from: [1, 22], to: [1, 26], ask: 'Republic Day is near. Can we dress up in our ethnic wear?' },
	{ id: 'holi', name: 'Holi', item: 'festive', from: [3, 18], to: [3, 23], ask: 'Holi is almost here! Can we put on our festive outfits?' },
	{ id: 'diwali', name: 'Diwali', item: 'festive', from: [10, 22], to: [11, 1], ask: 'Diwali is around the corner! Can we dress in our festive best?' },
];

const dayNumber = (month: number, day: number) => month * 100 + day;

export function activeOccasion(date = new Date()): Occasion | null {
	const today = dayNumber(date.getMonth() + 1, date.getDate());
	return OCCASIONS.find((o) => today >= dayNumber(...o.from) && today <= dayNumber(...o.to)) ?? null;
}

const STORAGE_KEY = 'alwaysbro-wardrobe';

interface WardrobeState {
	/** Occasion windows the user has already answered, as "id-year". */
	answered: string[];
	worn: Partial<Record<TroopPerson, Look>>;
}

const listeners = new Set<() => void>();
let state: WardrobeState = read();

function read(): WardrobeState {
	try {
		const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '') as Partial<WardrobeState>;
		return { answered: Array.isArray(parsed.answered) ? parsed.answered : [], worn: parsed.worn ?? {} };
	} catch {
		return { answered: [], worn: {} };
	}
}

function write(next: WardrobeState) {
	state = next;
	try {
		localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
	} catch {
		// the look then lasts until the page closes
	}
	listeners.forEach((fn) => fn());
}

const subscribe = (fn: () => void) => {
	listeners.add(fn);
	return () => listeners.delete(fn);
};

/** Builds the look a team member wears from the items the server says they have on. */
export function lookOf(member: TeamMember, items: WardrobeItem[]): Look {
	const look: Look = {};
	for (const [slot, id] of Object.entries(member.wearing) as Array<[WardrobeSlot, string]>) {
		const item = items.find((i) => i.id === id);
		if (item) look[slot] = { id: item.id, color: item.color };
	}
	return look;
}

/** Adopts what the signed-in user's teammates wear. */
export function syncWorn(members: TeamMember[], items: WardrobeItem[]) {
	const worn: Partial<Record<TroopPerson, Look>> = {};
	for (const person of Object.keys(PERSON_AGENT) as TroopPerson[]) {
		const member = members.find((m) => m.id === PERSON_AGENT[person]);
		worn[person] = member ? lookOf(member, items) : {};
	}
	write({ ...state, worn });
}

export function answerOccasion(occasion: Occasion) {
	const key = `${occasion.id}-${new Date().getFullYear()}`;
	if (!state.answered.includes(key)) write({ ...state, answered: [...state.answered, key] });
}

export function pendingOccasion(): Occasion | null {
	const occasion = activeOccasion();
	if (!occasion) return null;
	return state.answered.includes(`${occasion.id}-${new Date().getFullYear()}`) ? null : occasion;
}

export function useOutfit() {
	const current = useSyncExternalStore(subscribe, () => state);
	const lookFor = (person: TroopPerson): Look => current.worn[person] ?? {};
	return {
		answered: current.answered,
		lookFor,
		waveSrc: (person: TroopPerson) => `/troop/${person}${setArt(lookFor(person))}-wave.webp`,
		faceSrc: (person: TroopPerson) => `/troop/${person}${setArt(lookFor(person))}-face.webp`,
	};
}
