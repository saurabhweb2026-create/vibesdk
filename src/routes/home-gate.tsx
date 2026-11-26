import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import Home from './home';
import Landing from './landing';

const KEY = 'mt-entered';

function alreadyEntered(): boolean {
	try {
		return sessionStorage.getItem(KEY) === '1';
	} catch {
		return false;
	}
}

export default function HomeGate() {
	const { user, isLoading } = useAuth();
	const [entered, setEntered] = useState(alreadyEntered);

	if (isLoading) return null;
	if (user || entered) return <Home />;

	return (
		<Landing
			onEnter={() => {
				try {
					sessionStorage.setItem(KEY, '1');
				} catch {
					/* ignore */
				}
				setEntered(true);
			}}
		/>
	);
}
