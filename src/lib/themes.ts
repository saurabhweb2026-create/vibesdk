export interface SiteTheme {
	id: string;
	name: string;
	bestFor: string;
}

/** Free MIT-licensed Start Bootstrap templates (each 400 to 2,600 GitHub stars), hosted under /themes/<id>/ with the shared motion layer from /themes/_motion/. Jack has a matching `theme-<id>` skill. */
export const THEMES: SiteTheme[] = [
	{ id: 'agency', name: 'Agency', bestFor: 'Business or services' },
	{ id: 'freelancer', name: 'Freelancer', bestFor: 'Portfolio' },
	{ id: 'shop-homepage', name: 'Shop', bestFor: 'Online store' },
	{ id: 'resume', name: 'Resume', bestFor: 'Personal profile' },
	{ id: 'landing-page', name: 'Lead page', bestFor: 'One offer, sign-ups' },
	{ id: 'grayscale', name: 'Grayscale', bestFor: 'Studio or cafe' },
	{ id: 'creative', name: 'Creative', bestFor: 'Studio or brand with a bold hero' },
	{ id: 'new-age', name: 'New Age', bestFor: 'App or product launch' },
	{ id: 'stylish-portfolio', name: 'Stylish', bestFor: 'Portfolio or boutique' },
	{ id: 'modern-business', name: 'Modern Business', bestFor: 'Company or consultancy' },
	{ id: 'one-page-wonder', name: 'One Page Wonder', bestFor: 'Story style product page' },
];

export const THEME_STORAGE_KEY = 'alwaysbro-theme';

export const PROMPT_STORAGE_KEY = 'alwaysbro-first-prompt';
/** Set when the prompt came from the voice dock, so the builder starts without another tap. */
export const AUTO_RUN_KEY = 'alwaysbro-auto-run';
