/**
 * Skill catalog for the Think agent. The skill `SKILL.md` files are owned by
 * the agent (`worker/agents/think/skills/`) and are the single source of truth;
 * the space build's skill manifest sources the same files. Each file is inlined
 * here at build time (`?raw`), parsed with the `agents/skills` frontmatter
 * parser, and exposed as an in-memory `SkillSource` via `fromManifest`.
 * `ThinkAgent.getSkills()` returns this source; Think then injects the skill
 * catalog into the system prompt and registers the skill-loading tool
 * automatically.
 */
import { fromManifest, parseSkillMarkdown } from 'agents/skills';
import type { SkillManifest, SkillManifestEntry, SkillSource } from 'agents/skills';

import APP_FILE_STRUCTURE from './skills/app-file-structure/SKILL.md?raw';
import APP_AI_BINDING from './skills/app-ai-binding/SKILL.md?raw';
import FRONTEND_DESIGN from './skills/frontend-design/SKILL.md?raw';
import FRONTEND_DESIGN_LANDING_PAGE from './skills/frontend-design-landing-page/SKILL.md?raw';
import FRONTEND_DESIGN_SAAS from './skills/frontend-design-saas/SKILL.md?raw';
import FRONTEND_DESIGN_LANDING_PAGE_REFERENCE from './skills/frontend-design-landing-page-reference/SKILL.md?raw';
import FRONTEND_DESIGN_SAAS_REFERENCE from './skills/frontend-design-saas-reference/SKILL.md?raw';

import THEME_AGENCY from './skills/theme-agency/SKILL.md?raw';
import THEME_FREELANCER from './skills/theme-freelancer/SKILL.md?raw';
import THEME_SHOP_HOMEPAGE from './skills/theme-shop-homepage/SKILL.md?raw';
import THEME_RESUME from './skills/theme-resume/SKILL.md?raw';
import THEME_LANDING_PAGE from './skills/theme-landing-page/SKILL.md?raw';
import THEME_GRAYSCALE from './skills/theme-grayscale/SKILL.md?raw';
import THEME_CREATIVE from './skills/theme-creative/SKILL.md?raw';
import THEME_NEW_AGE from './skills/theme-new-age/SKILL.md?raw';
import THEME_STYLISH_PORTFOLIO from './skills/theme-stylish-portfolio/SKILL.md?raw';
import THEME_MODERN_BUSINESS from './skills/theme-modern-business/SKILL.md?raw';
import THEME_ONE_PAGE_WONDER from './skills/theme-one-page-wonder/SKILL.md?raw';

/** Raw `SKILL.md` contents keyed by their source directory name. */
const RAW_SKILLS: Record<string, string> = {
	'app-file-structure': APP_FILE_STRUCTURE,
	'app-ai-binding': APP_AI_BINDING,
	'frontend-design': FRONTEND_DESIGN,
	'frontend-design-landing-page': FRONTEND_DESIGN_LANDING_PAGE,
	'frontend-design-saas': FRONTEND_DESIGN_SAAS,
	'frontend-design-landing-page-reference': FRONTEND_DESIGN_LANDING_PAGE_REFERENCE,
	'frontend-design-saas-reference': FRONTEND_DESIGN_SAAS_REFERENCE,
	'theme-agency': THEME_AGENCY,
	'theme-freelancer': THEME_FREELANCER,
	'theme-shop-homepage': THEME_SHOP_HOMEPAGE,
	'theme-resume': THEME_RESUME,
	'theme-landing-page': THEME_LANDING_PAGE,
	'theme-grayscale': THEME_GRAYSCALE,
	'theme-creative': THEME_CREATIVE,
	'theme-new-age': THEME_NEW_AGE,
	'theme-stylish-portfolio': THEME_STYLISH_PORTFOLIO,
	'theme-modern-business': THEME_MODERN_BUSINESS,
	'theme-one-page-wonder': THEME_ONE_PAGE_WONDER,
};

function buildEntries(): SkillManifestEntry[] {
	const entries: SkillManifestEntry[] = [];
	for (const [dir, raw] of Object.entries(RAW_SKILLS)) {
		const parsed = parseSkillMarkdown(raw);
		if (!parsed) continue;
		entries.push({
			name: parsed.name || dir,
			description: parsed.description || dir,
			body: parsed.body,
			rawContent: raw,
			...(parsed.compatibility ? { compatibility: parsed.compatibility } : {}),
			...(parsed.license ? { license: parsed.license } : {}),
			...(parsed.allowedTools ? { allowedTools: parsed.allowedTools } : {}),
			...(parsed.metadata ? { metadata: parsed.metadata } : {}),
		});
	}
	return entries;
}

const entries = buildEntries();

/** Content-derived fingerprint so Think re-reads the catalog if a skill changes. */
const fingerprint = entries.map((e) => `${e.name}:${e.rawContent?.length ?? 0}`).join('|');

const manifest: SkillManifest = {
	id: 'vibesdk-think-skills',
	fingerprint,
	skills: entries,
};

/** In-memory skill source consumed by `ThinkAgent.getSkills()`. */
export function createThinkSkillSource(): SkillSource {
	return fromManifest(manifest);
}
