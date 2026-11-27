export interface SiteTheme {
	id: string;
	name: string;
	bestFor: string;
}

/** Free MIT-licensed Start Bootstrap templates, hosted under /themes/<id>/. Jack has a matching `theme-<id>` skill. */
export const THEMES: SiteTheme[] = [
	{ id: 'agency', name: 'Agency', bestFor: 'Business or services' },
	{ id: 'freelancer', name: 'Freelancer', bestFor: 'Portfolio' },
	{ id: 'shop-homepage', name: 'Shop', bestFor: 'Online store' },
	{ id: 'resume', name: 'Resume', bestFor: 'Personal profile' },
	{ id: 'landing-page', name: 'Lead page', bestFor: 'One offer, sign-ups' },
	{ id: 'grayscale', name: 'Grayscale', bestFor: 'Studio or cafe' },
];

export const THEME_STORAGE_KEY = 'alwaysbro-theme';

export const PROMPT_STORAGE_KEY = 'alwaysbro-first-prompt';
