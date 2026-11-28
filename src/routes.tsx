import { Outlet, type RouteObject } from 'react-router';
import type { ComponentType, ReactNode } from 'react';

import App from './App';
import HomeGate from './routes/home-gate';
import { DarkSurface } from './components/dark-surface';
import { ProtectedRoute } from './routes/protected-route';

type Page = { default: ComponentType };

/** Each page is its own chunk, so a visit only downloads the screen it opens. */
const page = (load: () => Promise<Page>) => async () => ({ Component: (await load()).default });

function guarded(path: string, load: () => Promise<Page>, wrap: (children: ReactNode) => ReactNode = (children) => children): RouteObject {
	return {
		path,
		element: <ProtectedRoute>{wrap(<Outlet />)}</ProtectedRoute>,
		children: [{ index: true, lazy: page(load) }],
	};
}

const dark = (children: ReactNode) => <DarkSurface>{children}</DarkSurface>;

const routes = [
	{
		path: '/',
		Component: App,
		children: [
			{ index: true, Component: HomeGate },
			{ path: 'chat/:chatId', lazy: page(() => import('./routes/chat/chat')) },
			guarded('profile', () => import('./routes/profile')),
			guarded('settings', () => import('./routes/settings/index')),
			guarded('apps', () => import('./routes/apps')),
			{ path: 'app/:id', lazy: page(() => import('./routes/app')) },
			{ path: 'discover', lazy: page(() => import('./routes/discover')) },
			guarded('louie', () => import('./routes/troop/louie'), dark),
			guarded('team', () => import('./routes/troop/team'), dark),
			guarded('wardrobe', () => import('./routes/troop/wardrobe'), dark),
			guarded('jack', () => import('./routes/troop/jack'), dark),
		],
	},
] satisfies RouteObject[];

export { routes };
