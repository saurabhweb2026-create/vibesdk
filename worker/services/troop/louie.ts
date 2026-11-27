// Craft rules adapted from coreyhaines31/marketingskills (MIT). See THIRD_PARTY_NOTICES.md.
import { parseJsonObject, troopComplete } from './troopLlm';
import type { SiteInfo } from './troopStore';

export interface AdPack {
	summary: string;
	audience: string[];
	googleSearch: { headlines: string[]; descriptions: string[]; keywords: string[] };
	metaAds: Array<{ primaryText: string; headline: string; cta: string }>;
	socialPosts: Array<{ caption: string; hashtags: string[] }>;
	whatsappMessage: string;
	budgetPlan: Array<{ channel: string; sharePercent: number; why: string }>;
	firstWeek: string[];
	hashtags: { broad: string[]; niche: string[]; local: string[] };
	videoScripts: Array<{ title: string; hook: string; scenes: string[]; shots: Array<{ seconds: number; text: string; imagePrompt: string }>; voiceover: string; cta: string }>;
	creatives: Array<{ format: string; visual: string; imagePrompt: string; overlayText: string; caption: string }>;
}

export interface AdRequest {
	goal: string;
	budgetInr: number;
	audience: string;
	location: string;
	tone: string;
	offer: string;
	formats: string[];
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.trim().slice(0, max) : '');

function strList(v: unknown, maxItems: number, maxLen: number): string[] {
	if (!Array.isArray(v)) return [];
	return v
		.map((x) => str(x, maxLen))
		.filter((x) => x.length > 0)
		.slice(0, maxItems);
}

function objList(v: unknown, maxItems: number): Array<Record<string, unknown>> {
	if (!Array.isArray(v)) return [];
	return v
		.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object' && !Array.isArray(x))
		.slice(0, maxItems);
}

function normalize(raw: Record<string, unknown>): AdPack {
	const google = (raw.googleSearch ?? {}) as Record<string, unknown>;
	const hashtagGroup = (raw.hashtags ?? {}) as Record<string, unknown>;
	return {
		summary: str(raw.summary, 400),
		audience: strList(raw.audience, 6, 120),
		googleSearch: {
			headlines: strList(google.headlines, 8, 30),
			descriptions: strList(google.descriptions, 4, 90),
			keywords: strList(google.keywords, 12, 60),
		},
		metaAds: objList(raw.metaAds, 4).map((a) => ({
			primaryText: str(a.primaryText, 400),
			headline: str(a.headline, 60),
			cta: str(a.cta, 30),
		})),
		socialPosts: objList(raw.socialPosts, 4).map((p) => ({
			caption: str(p.caption, 500),
			hashtags: strList(p.hashtags, 10, 40),
		})),
		whatsappMessage: str(raw.whatsappMessage, 600),
		budgetPlan: objList(raw.budgetPlan, 5).map((b) => ({
			channel: str(b.channel, 60),
			sharePercent: Math.max(0, Math.min(100, Math.round(Number(b.sharePercent) || 0))),
			why: str(b.why, 200),
		})),
		firstWeek: strList(raw.firstWeek, 7, 200),
		hashtags: {
			broad: strList(hashtagGroup.broad, 5, 40),
			niche: strList(hashtagGroup.niche, 8, 40),
			local: strList(hashtagGroup.local, 5, 40),
		},
		videoScripts: objList(raw.videoScripts, 3).map((v) => ({
			title: str(v.title, 80),
			hook: str(v.hook, 160),
			scenes: strList(v.scenes, 6, 200),
			shots: objList(v.shots, 5).map((sh) => ({
				seconds: Math.max(1, Math.min(4, Math.round(Number(sh.seconds) || 2))),
				text: str(sh.text, 70),
				imagePrompt: str(sh.imagePrompt, 300),
			})),
			voiceover: str(v.voiceover, 600),
			cta: str(v.cta, 80),
		})),
		creatives: objList(raw.creatives, 4).map((c) => ({
			format: str(c.format, 40),
			visual: str(c.visual, 300),
			imagePrompt: str(c.imagePrompt, 400),
			overlayText: str(c.overlayText, 80),
			caption: str(c.caption, 300),
		})),
	};
}

const SYSTEM_RULES = `You are John, the advertising and social media specialist of the AlwaysBro AI team. You write ready-to-use marketing material for small businesses in India.
Write in clear, simple English. Be specific to the business. Never invent prices, offers, awards or claims that are not in the brief.

Craft rules you always follow:
- Angles: pick from pain point, outcome, social proof only if the brief gives real proof, curiosity, urgency only when the offer really ends, and identity ("for people who..."). Give each piece a different angle and a different sentence shape.
- Every ad and post opens with a hook that is specific to the customer: a concrete benefit, a question they really ask, or a sharp problem. Never use "Stop scrolling", "Here's what nobody tells you", "Unlock the power of", "Say goodbye to" or "Take it to the next level".
- Write like a person. Avoid contrast reveals ("It's not X, it's Y"), stacked negations ("No X, no Y, no Z"), self-answered questions ("The result?"), engagement bait ("Thoughts?", "Let that sink in"), emoji used as bullets, and em dashes.
- Specific beats vague, benefits beat features, active voice beats passive. Use numbers only when the brief supplies them. Never write "best", "leading" or "number one".
- One message and one call to action per piece. Name the action and what the customer gets, for example "Book your free trial class".
- Platform limits: Google headlines at most 30 characters and descriptions at most 90. Meta primary text shows about 125 characters before "more", so put the hook and the offer first; Meta headline at most 40 characters. Instagram captions allow 2,200 characters but show about 125 before "more".
- Hashtags: Instagram and TikTok take at most 5, Facebook 1 or 2, YouTube Shorts 1 to 5. Per post use 3 to 5. Build the hashtags field from three groups: broad (3 to 5), niche for the exact product or service (5 to 8), local for the city, area or festival (2 to 5). Never use banned or spammy tags. These are relevant ideas, not live trend data.
- Short videos are 6 to 10 seconds in total and vertical. Shot 1 is the hook and appears in the first second. Middle shots show the product, the result or proof from the brief. The last shot is the call to action. Keep on-screen text under 7 words per shot.
- Story and trend sense: build every video as a tiny story with a beginning (the problem or desire), a middle (the product making it better) and an end (the action). Use formats people already watch: before and after, a day in the life, three quick tips, a surprising detail, behind the scenes, a customer moment. Mention trending formats or sounds only as ideas to try, never as claims about what is trending right now.
- Image prompts describe one real, photographable scene with a clear subject, never abstract art or a collage, and never ask for text in the picture.
- Time suggestions around Indian festivals or seasons only when the brief or location makes it relevant.`;

const CORE_SCHEMA = `Answer with ONE JSON object only, no markdown, with exactly these keys:
{
 "summary": "2 sentences: the angle of the campaign",
 "audience": ["3 to 5 short audience descriptions"],
 "googleSearch": {"headlines": ["6 headlines, each at most 30 characters"], "descriptions": ["3 descriptions, each at most 90 characters"], "keywords": ["8 to 10 search keywords"]},
 "metaAds": [{"primaryText": "short ad text", "headline": "short headline", "cta": "button text"}],
 "socialPosts": [{"caption": "post caption", "hashtags": ["#tag"]}],
 "hashtags": {"broad": ["#tag"], "niche": ["#tag"], "local": ["#tag"]},
 "whatsappMessage": "one short broadcast message",
 "budgetPlan": [{"channel": "name", "sharePercent": 50, "why": "one sentence"}],
 "firstWeek": ["5 simple actions for the first 7 days"]
}
metaAds must have 3 items and socialPosts 3 items. budgetPlan shares must add up to 100.
Match the requested tone and use the offer exactly as given. Only fill the content types the user asked for; use empty arrays for the rest.`;

const MEDIA_SCHEMA = `Answer with ONE JSON object only, no markdown, with exactly these keys:
{
 "videoScripts": [{"title": "short title", "hook": "first 3 seconds line", "scenes": ["4 to 5 shot descriptions, each one line"], "shots": [{"seconds": 2, "text": "on-screen text, at most 7 words", "imagePrompt": "one concrete picture for this shot: subject, setting, light, camera angle, mood. No text in the picture"}], "voiceover": "full voiceover for a 20 to 30 second reel", "cta": "closing line"}],
 "creatives": [{"format": "Instagram post | Story | Banner", "visual": "what the image shows in plain words", "imagePrompt": "an image-generator prompt: subject, setting, lighting, camera angle, mood, colours. 30 to 50 words. Never ask for text, letters or logos in the picture", "overlayText": "short text on the image", "caption": "post caption"}]
}
videoScripts must have 2 items, each with 4 or 5 shots whose seconds add up to between 6 and 10. creatives must have 4 items.
Match the requested tone and use the offer exactly as given. Fill only the content types the user asked for; use empty arrays for the rest.`;

export async function generateAdPack(env: Env, site: SiteInfo, req: AdRequest): Promise<AdPack> {
	const brief = [
		`Business website: ${site.title}`,
		site.description ? `About: ${site.description}` : '',
		`Original idea: ${site.originalPrompt.slice(0, 600)}`,
		`Goal: ${req.goal}`,
		`Monthly budget: Rs ${req.budgetInr}`,
		req.audience ? `Target customers: ${req.audience}` : '',
		req.location ? `Location: ${req.location}` : '',
		req.tone ? `Tone: ${req.tone}` : '',
		req.offer ? `Offer to promote: ${req.offer}` : '',
		req.formats.length ? `Content wanted: ${req.formats.join(', ')}` : '',
	]
		.filter(Boolean)
		.join('\n');

	const wantsMedia = req.formats.length === 0 || req.formats.some((f) => /video|creative/i.test(f));
	const wantsCore = req.formats.length === 0 || req.formats.some((f) => !/video|creative/i.test(f));

	let lastProblem = '';
	const ask = async (schema: string, maxTokens: number): Promise<Record<string, unknown> | null> => {
		for (let attempt = 0; attempt < 2; attempt += 1) {
			try {
				const text = await troopComplete(
					env,
					[
						{ role: 'system', content: `${SYSTEM_RULES}\n\n${schema}` },
						{ role: 'user', content: brief },
					],
					{ maxTokens, temperature: attempt === 0 ? 0.8 : 0.5 },
				);
				const raw = parseJsonObject(text);
				if (raw) return raw;
				lastProblem = 'the answer was not valid JSON';
				console.error('John: answer was not valid JSON', text.slice(0, 200));
			} catch (error) {
				lastProblem = error instanceof Error ? error.message.slice(0, 120) : 'AI call failed';
				console.error('John: AI call failed', error);
			}
		}
		return null;
	};

	const [core, media] = await Promise.all([wantsCore ? ask(CORE_SCHEMA, 2800) : Promise.resolve({}), wantsMedia ? ask(MEDIA_SCHEMA, 3200) : Promise.resolve({})]);
	if (!core && !media) throw new Error(`John could not write the ads this time (${lastProblem || 'no answer'})`);
	const pack = normalize({ ...(core ?? {}), ...(media ?? {}) });
	const empty = pack.googleSearch.headlines.length === 0 && pack.metaAds.length === 0 && pack.socialPosts.length === 0 && pack.videoScripts.length === 0 && pack.creatives.length === 0;
	if (empty) throw new Error('John could not write the ads this time');
	return pack;
}
