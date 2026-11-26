import type { RouteObject } from 'react-router';

import App from './App';
import HomeGate from './routes/home-gate';
import Chat from './routes/chat/chat';
import Profile from './routes/profile';
import Settings from './routes/settings/index';
import AppsPage from './routes/apps';
import AppView from './routes/app';
import DiscoverPage from './routes/discover';
import LouiePage from './routes/troop/louie';
import JackPage from './routes/troop/jack';
import { ProtectedRoute } from './routes/protected-route';

const routes = [
	{
		path: '/',
		Component: App,
		children: [
			{
				index: true,
				Component: HomeGate,
			},
			{
				path: 'chat/:chatId',
				Component: Chat,
			},
			{
				path: 'profile',
				element: (
					<ProtectedRoute>
						<Profile />
					</ProtectedRoute>
				),
			},
			{
				path: 'settings',
				element: (
					<ProtectedRoute>
						<Settings />
					</ProtectedRoute>
				),
			},
			{
				path: 'apps',
				element: (
					<ProtectedRoute>
						<AppsPage />
					</ProtectedRoute>
				),
			},
			{
				path: 'app/:id',
				Component: AppView,
			},
			{
				path: 'discover',
				Component: DiscoverPage,
			},
			{
				path: 'louie',
				element: (
					<ProtectedRoute>
						<LouiePage />
					</ProtectedRoute>
				),
			},
			{
				path: 'jack',
				element: (
					<ProtectedRoute>
						<JackPage />
					</ProtectedRoute>
				),
			},
		],
	},
] satisfies RouteObject[];

export { routes };
