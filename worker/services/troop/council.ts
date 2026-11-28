import { parseJsonObject, troopComplete } from './troopLlm';
import type { SiteInfo } from './troopStore';

/**
 * The advisor bench of the free "marketingskills" library by Corey Haines (MIT, github.com/coreyhaines31/marketingskills),
 * condensed to each advisor's lens, signature questions and documented positions.
 */
interface Advisor {
	name: string;
	lens: string;
	asks: string[];
	stands: string[];
}

const BENCH: Advisor[] = [
	{ name: "Alex Hormozi", lens: "Marketing problems are math problems — value delivered vs. friction imposed, inputs vs. outputs — and most \"marketing\" failures are actually offer or volume failures upstream of the creative.", asks: ["What would make this offer so good they'd feel stupid saying no?", "Which value-equation variable is weakest — outcome, certainty, time, or effort?", "How much volume are you actually doing? Show me the daily numbers."], stands: ["Offer beats persuasion: a mediocre marketer with a Grand Slam Offer beats a great marketer with a commodity offer", "Never compete on price — premium pricing justified by stacked value and guarantees; discounting signals low value.", "Contrarian vs. \"work smarter\": most people fail from too little output, not bad strategy — volume before optimization"] },
	{ name: "Ann Handley", lens: "Every marketing problem is at bottom a writing-and-empathy problem — the brand that sounds the most human, to one specific reader, wins.", asks: ["So what? …Because? Keep going until you hit something the reader actually cares about.", "Who is the *one person* you're writing this to?", "Would you say this sentence out loud to a customer?"], stands: ["Her signature keynote warning: the biggest missed opportunity in content marketing is playing it too safe — the fix is \"bigger, braver, bolder\" content", "Everybody writes — writing is a learnable habit, not a gift; in a content-driven world every marketer is a writer", "Empathy is a marketing strategy — signal \"we get you\" through word choice and tone."] },
	{ name: "April Dunford", lens: "Positioning is deliberately choosing the market context that makes your product's unique value obvious to the customers best equipped to appreciate it — and most companies default into their positioning by accident.", asks: ["If your product didn't exist, what would your customers honestly do instead?", "What can you do that the alternatives genuinely cannot — and can you prove it?", "Who cares *a lot* about that value? Who are the customers who love you?"], stands: ["The classic fill-in-the-blank positioning statement is \"not only pointless but potentially dangerous\" — a Mad Libs exercise that gives no way to derive the answers", "Contrarian: category creation is overrated — \"companies don't create categories; categories emerge, and some companies are wise to that\"", "Positioning is not messaging or branding — it's an input to go-to-market that messaging is built *on*"] },
	{ name: "Byron Sharp", lens: "Marketing should be an evidence-based science governed by empirical, law-like patterns that replicate across categories and decades — and much of what marketers believe about loyalty, differentiation, and targeting contradicts the data.", asks: ["What does the data actually show — across categories, countries, and decades — versus this quarter's anecdote?", "Are you reaching *all* category buyers, especially light and non-buyers, or just talking to the already-loyal?", "Would a buyer recognize this as yours with the name removed? What are your distinctive assets?"], stands: ["Loyalty programs deliver little — they skew to heavy buyers who'd buy anyway; acquisition drives growth", "Differentiation is largely a myth; distinctiveness is what matters — a direct attack on Porter/Kotler orthodoxy", "Tight targeting caps growth — brands sell to nearly identical, overlapping customer bases; excluding buyers is self-harm."] },
	{ name: "Claude Hopkins (1866–1932)", lens: "Advertising is salesmanship multiplied and measured — every claim, headline, and dollar must justify itself with traceable response data.", asks: ["Have you tested it? What did the returns say?", "What specific, provable claim can we make that no competitor has made — even if they could?", "Would a good salesman say this line to a buyer's face?"], stands: ["\"I have learned to consider myself as a salesman, not as a writer… not trying to entertain people or be clever or build what is called a brand.\" — *My Life in Advertising*", "Never let opinion or committee judgment settle what a test can — *Scientific Advertising*", "Fine writing is a liability — it draws attention to itself and away from the sale."] },
	{ name: "David Ogilvy (1911–1999)", lens: "Advertising is salesmanship at scale — a medium of information, not entertainment — disciplined by research, direct-response evidence, and respect for the consumer's intelligence.", asks: ["Have you done your homework — what does the research say about the product, the consumer, and what's worked in this category?", "What's the Big Idea? Will it still work in 30 years?", "Does the headline promise a benefit — and would it stop your neighbor?"], stands: ["\"The consumer is not a moron. She's your wife.\" — *Confessions*", "Advertising's job is to sell, not win awards — openly hostile to creative-awards culture", "\"Never stop testing, and your advertising will never stop improving.\" — *Confessions*"] },
	{ name: "Eugene Schwartz (1927–1995)", lens: "Copy cannot create desire — it can only channel the mass desire already existing in millions of hearts onto a particular product. The market, not the writer, writes the ad.", asks: ["What stage of awareness is this prospect in — and does the headline meet him exactly there?", "How many times has this market already heard this claim? Do we need a new mechanism?", "What mass desire already exists that we can channel? (We are not going to create one.)"], stands: ["The greatest marketing mistake is trying to create desire; only channeling works — *Breakthrough Advertising*, ch. 1.", "The headline's only job is to stop the prospect and get the first sentence read — it need not sell or even mention the product at early awareness stages.", "Contrarian: creativity is overrated — the ad is already written by the market; listening beats genius"] },
	{ name: "Gary Halbert (1938–2007)", lens: "Markets beat copy — find a \"starving crowd\" whose demonstrated buying behavior proves hunger, then reach them with a message that feels personal and impossible to ignore.", asks: ["Who's the starving crowd here? What have these people already bought?", "What list are you mailing — buyers or compiled names? How recent, how often, how much?", "Would this land in the A-pile or the B-pile?"], stands: ["The list is the single biggest success factor in direct response — before copy, before offer format", "Contrarian: you cannot create desire, only channel existing mass desire — against his own industry's \"great copy sells anything\" mythology.", "Specific, exact details create believability; vague claims kill it."] },
	{ name: "Gary Vaynerchuk", lens: "Attention is the only asset in marketing — find where consumer attention is underpriced right now, and make platform-native content there before the price gets bid up.", asks: ["Where is attention *underpriced* right now — and why aren't you there yet?", "Is this native to the platform, or are you cross-posting the same asset everywhere?", "How many pieces of content did you put out yesterday? Why so few?"], stands: ["\"Marketers ruin everything\"", "Organic social is the most underpriced brand-building lever right now — even follower-less brands win via interest-graph distribution", "Volume is non-negotiable — dozens of platform-native pieces per day; atomize one pillar piece into many micro-pieces"] },
	{ name: "Rory Sutherland", lens: "Most marketing problems are perception problems, not reality problems — humans run on \"psycho-logic,\" not economic logic, so the highest-leverage move changes how something is framed, felt, or signaled rather than what it objectively is.", asks: ["What's the psychological problem here, as opposed to the logical one we've been solving?", "Could we change how this *feels* instead of what it *is* — and would that be 100x cheaper?", "What does this signal? What does its cost (or cheapness) communicate?"], stands: ["Against logic-driven marketing: a purely rational process gets you to the same place as your competitors; powerful messages contain \"an element of absurdity, illogicality, costliness... or extravagance\"", "Against measurement obsession: chasing perfect spend-to-outcome attribution makes firms over-invest in the measurable and under-invest in what matters", "Committees reject cheap psychological solutions *because* they're cheap — people distrust perceived-value gains that don't cost enough"] },
	{ name: "Russell Brunson (b. 1980)", lens: "Every business is one funnel away — package the offer, story, and traffic into a sequenced value ladder that ascends each customer from free bait to the highest-priced back end.", asks: ["What's the *offer*? Not the product — what's stacked into it, what's it worth vs. what it costs?", "What does your value ladder look like — where does this customer go next?", "What's the hook, what's the story, and which of the three is broken right now?"], stands: ["\"You're one funnel away\" — a single working funnel can transform a business; a website without a sequence is a dead end", "Traffic is never free — you earn your way or buy your way into audiences other people built", "You don't get rich on the front end — front ends break even to acquire customers; profit lives in upsells, back end, continuity"] },
	{ name: "Seth Godin", lens: "Marketing is the generous act of helping someone become who they want to be — done by earning attention and trust from the smallest group that matters, never by stealing attention at scale.", asks: ["Who's it for, and what's it for?", "What's the smallest viable audience you could delight so much they'd tell others?", "Would anyone miss you if you were gone?\" (the remarkability test)"], stands: ["Interruption advertising is theft of attention and increasingly ineffective — the founding argument of *Permission Marketing*", "Marketing is something you do *for* people, not *to* them — thesis of *This Is Marketing*", "Contrarian: don't chase scale, followers, or SEO traffic — vanity metrics corrupt the work; he famously doesn't read comments or optimize for platforms"] },
];

const SEATING = `Question type: strong fits / natural dissenters
Positioning or messaging: Dunford, Godin, Schwartz / Sharp
Offer or pricing: Hormozi, Halbert, Brunson / Sutherland, Godin
Brand building or awareness: Sharp, Ogilvy, Sutherland / Hopkins, Halbert
Copy or creative review: Ogilvy, Schwartz, Halbert, Handley / Sutherland
Funnels or conversion: Brunson, Hormozi, Hopkins / Godin, Handley
Content strategy: Handley, Godin, Vaynerchuk / Sharp, Hopkins
Paid ads or media: Hopkins, Sharp, Vaynerchuk / Godin
Growth or scaling: Hormozi, Vaynerchuk, Sharp / Handley, Dunford
Audience or channel choice: Vaynerchuk, Sharp, Halbert / Godin
Launch: Brunson, Godin, Halbert / Sharp`;

export interface CouncilTake {
	advisor: string;
	lens: string;
	take: string;
	bottomLine: string;
}

export interface CouncilResult {
	question: string;
	seated: CouncilTake[];
	disagreements: Array<{ conflict: string; tradeoff: string; test: string }>;
	recommendation: string;
	doNext: string[];
	tripwire: string;
}

const text = (value: unknown, max: number) => (typeof value === 'string' ? value.trim().slice(0, max) : '');
const rows = (value: unknown, max: number): Array<Record<string, unknown>> =>
	Array.isArray(value) ? value.filter((v): v is Record<string, unknown> => Boolean(v) && typeof v === 'object').slice(0, max) : [];

const SYSTEM = `You convene a simulated board of marketing advisors for a small business in India. The value is their disagreement, so the takes must clash where their documented views clash.
Seat 3 to 5 advisors from the bench: 2 or 3 whose lens fits the question and always at least one natural dissenter. Seating guide:
${SEATING}

Rules:
- Each take applies the advisor's own signature questions and documented positions to THIS business, in 2 or 3 plain sentences. It is a simulation of their published frameworks, never a quote and never what the real person thinks of this company.
- If a fact is not in the brief, do not invent it: no prices, results or customer numbers.
- Plain, simple English. No markdown.

BENCH:
${BENCH.map((a) => `${a.name} | Lens: ${a.lens} | Asks: ${a.asks.join(' / ')} | Stands: ${a.stands.join(' / ')}`).join('\n')}

Answer with ONE JSON object only:
{"seated":[{"advisor":"name from the bench","take":"2 to 3 sentences","bottomLine":"one sentence"}],
"disagreements":[{"conflict":"who says what","tradeoff":"the real trade-off","test":"what evidence would settle it"}],
"recommendation":"the recommendation that fits this business's stage and budget, 2 to 3 sentences",
"doNext":["3 to 4 concrete actions"],"tripwire":"which advisor's warning to watch and the signal"}
Give 2 to 3 disagreements.`;

export async function holdCouncil(env: Env, site: SiteInfo, question: string): Promise<CouncilResult> {
	const brief = [`Business website: ${site.title}`, site.description ? `About: ${site.description}` : '', `Original idea: ${site.originalPrompt.slice(0, 600)}`, `Question for the council: ${question}`]
		.filter(Boolean)
		.join('\n');
	const answer = await troopComplete(env, [{ role: 'system', content: SYSTEM }, { role: 'user', content: brief }], { maxTokens: 2400, temperature: 0.7 });
	const raw = parseJsonObject(answer);
	const seated = rows(raw?.seated, 5)
		.map((s): CouncilTake | null => {
			const advisor = BENCH.find((a) => a.name === s.advisor);
			return advisor ? { advisor: advisor.name, lens: advisor.lens, take: text(s.take, 600), bottomLine: text(s.bottomLine, 200) } : null;
		})
		.filter((s): s is CouncilTake => s !== null && s.take !== '');
	if (seated.length < 2) throw new Error('The council could not meet this time. Please try again.');
	return {
		question,
		seated,
		disagreements: rows(raw?.disagreements, 3).map((d) => ({ conflict: text(d.conflict, 300), tradeoff: text(d.tradeoff, 300), test: text(d.test, 300) })),
		recommendation: text(raw?.recommendation, 700),
		doNext: Array.isArray(raw?.doNext) ? raw.doNext.map((x) => text(x, 200)).filter(Boolean).slice(0, 4) : [],
		tripwire: text(raw?.tripwire, 300),
	};
}
