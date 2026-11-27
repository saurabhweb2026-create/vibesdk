import { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { PaletteIcon } from '@phosphor-icons/react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/auth-context';
import { useAuthModal } from '@/components/auth/AuthModalProvider';
import { apiClient, type SkinData } from '@/lib/api-client';
import { SKIN_LOOKS, setActiveSkin, useActiveSkin } from '@/lib/skins';

export function SkinPicker({ className }: { className?: string }) {
	const { user } = useAuth();
	const { showAuthModal } = useAuthModal();
	const active = useActiveSkin();
	const [open, setOpen] = useState(false);
	const [data, setData] = useState<SkinData | null>(null);
	const [busy, setBusy] = useState('');
	const [tab, setTab] = useState<'mood' | 'look'>('mood');

	const refresh = useCallback(async () => {
		if (!user) return;
		try {
			const res = await apiClient.getSkins();
			if (res.data) setData(res.data);
		} catch {
			// the API client already shows the reason
		}
	}, [user]);

	useEffect(() => {
		if (open) void refresh();
	}, [open, refresh]);

	const close = () => {
		setOpen(false);
		if (data && data.owned.includes(data.active)) setActiveSkin(data.active);
		else if (!user) setActiveSkin('midnight');
	};

	const act = async (id: string, kind: 'buy' | 'equip') => {
		if (!user) {
			showAuthModal('Sign in to unlock looks');
			return;
		}
		setBusy(id);
		try {
			if (kind === 'buy') await apiClient.buySkin(id);
			await apiClient.equipSkin(id);
			setActiveSkin(id);
			await refresh();
			toast.success(kind === 'buy' ? 'Unlocked! Enjoy the new look.' : 'Look changed.');
		} catch {
			// the API client already shows the reason
		} finally {
			setBusy('');
		}
	};

	return (
		<>
			<button
				type="button"
				aria-label="Change look"
				title="Change look"
				onClick={() => setOpen(true)}
				className={className}
			>
				<PaletteIcon className="mx-auto size-4" weight="duotone" />
			</button>
			{createPortal(
			<AnimatePresence>
				{open && (
					<motion.div
						className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						onClick={close}
					>
						<motion.div
							role="dialog"
							aria-label="Choose a look"
							className="w-full max-w-3xl rounded-3xl border border-white/10 bg-[#0b0b14]/95 p-6 text-white shadow-2xl"
							initial={{ scale: 0.92, y: 20 }}
							animate={{ scale: 1, y: 0 }}
							exit={{ scale: 0.95, opacity: 0 }}
							onClick={(e) => e.stopPropagation()}
						>
							<div className="flex items-start justify-between gap-4">
								<div>
									<h2 className="font-display text-2xl font-bold">Set your vibe</h2>
									<p className="mt-1 text-sm text-white/60">Unlock once with credits, keep it forever.</p>
								</div>
								<div className="flex items-center gap-3">
									{data && <span className="rounded-full bg-white/10 px-3 py-1 text-sm">Credits: <b>{data.balance}</b></span>}
									<button type="button" onClick={close} className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20">Done</button>
								</div>
							</div>
							<div className="mt-4 inline-flex rounded-full bg-white/10 p-1 text-sm">
								{(['mood', 'look'] as const).map((t) => (
									<button
										key={t}
										type="button"
										onClick={() => setTab(t)}
										className={`rounded-full px-4 py-1.5 font-display font-medium transition-colors ${tab === t ? 'bg-white text-black' : 'text-white/70 hover:text-white'}`}
									>
										{t === 'mood' ? 'Moods' : 'Colour looks'}
									</button>
								))}
							</div>
							<div className="mt-4 grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto pr-1 sm:grid-cols-3">
								{SKIN_LOOKS.filter((l) => l.kind === tab || l.id === 'midnight' && tab === 'look').map((look) => {
									const meta = data?.skins.find((s) => s.id === look.id);
									const price = meta?.price ?? (look.id === 'midnight' ? 0 : null);
									const owned = look.id === 'midnight' || (data?.owned.includes(look.id) ?? false);
									const isActive = active.id === look.id && owned;
									return (
										<div key={look.id} className="overflow-hidden rounded-2xl border border-white/10" style={{ background: look.base }}>
											<div className="relative h-24 overflow-hidden">
												{look.blobs.map((c, i) => (
													<span
														key={c}
														className="absolute size-24 rounded-full blur-2xl"
														style={{ background: c, opacity: 0.7, left: `${i * 32}%`, top: i === 1 ? '30%' : '-10%' }}
													/>
												))}
											</div>
											<div className="p-3">
												<div className="font-display text-base font-semibold">{look.name}</div>
												<div className="text-xs text-white/55">{look.tagline}</div>
												<div className="mt-1 text-[10px] uppercase tracking-wider text-white/40">{look.motion === 'off' ? 'Still' : look.motion === 'calm' ? 'Slow motion' : look.motion === 'hyper' ? 'Hyper motion' : 'Flowing'}</div>
												<div className="mt-3 flex gap-2">
													{owned ? (
														<button
															type="button"
															disabled={isActive || busy === look.id}
															onClick={() => void act(look.id, 'equip')}
															className="flex-1 rounded-lg bg-white/15 px-2 py-1.5 text-sm font-medium hover:bg-white/25 disabled:opacity-60"
														>
															{isActive ? 'In use' : 'Use'}
														</button>
													) : (
														<>
															<button
																type="button"
																onClick={() => setActiveSkin(look.id)}
																className="rounded-lg border border-white/20 px-2 py-1.5 text-sm hover:bg-white/10"
															>
																Peek
															</button>
															<button
																type="button"
																disabled={busy === look.id}
																onClick={() => void act(look.id, 'buy')}
																className="flex-1 rounded-lg px-2 py-1.5 text-sm font-semibold text-black disabled:opacity-60"
																style={{ background: look.blobs[0] }}
															>
																{price === null ? 'Unlock' : `${price} credits`}
															</button>
														</>
													)}
												</div>
											</div>
										</div>
									);
								})}
							</div>
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>,
			document.body,
			)}
		</>
	);
}
