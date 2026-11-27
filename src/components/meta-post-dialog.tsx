import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { toast } from 'sonner';
import { apiClient, type MetaStatus, type MetaTarget } from '@/lib/api-client';

const PINK = '#ec4899';

/** Instagram only accepts JPEG pictures, so every picture is re-encoded before it is sent. */
export async function toJpegDataUrl(source: string): Promise<string> {
	const img = new Image();
	img.src = source;
	await img.decode();
	const canvas = document.createElement('canvas');
	canvas.width = img.naturalWidth;
	canvas.height = img.naturalHeight;
	const ctx = canvas.getContext('2d');
	if (!ctx) throw new Error('Could not prepare the picture');
	ctx.fillStyle = '#ffffff';
	ctx.fillRect(0, 0, canvas.width, canvas.height);
	ctx.drawImage(img, 0, 0);
	return canvas.toDataURL('image/jpeg', 0.92);
}

export function useMetaStatus() {
	const [status, setStatus] = useState<MetaStatus | null>(null);
	const refresh = async () => {
		try {
			const res = await apiClient.getMetaStatus();
			if (res.data) setStatus(res.data);
		} catch {
			// the panel just stays empty
		}
	};
	useEffect(() => {
		void refresh();
	}, []);
	return { status, refresh };
}

const localInput = (ms: number): string => {
	const d = new Date(ms - new Date().getTimezoneOffset() * 60000);
	return d.toISOString().slice(0, 16);
};

interface Props {
	appId: string;
	initialText: string;
	image?: string | null;
	status: MetaStatus | null;
	onClose: () => void;
	onDone: () => void;
}

export function MetaPostDialog({ appId, initialText, image, status, onClose, onDone }: Props) {
	const [text, setText] = useState(initialText);
	const [target, setTarget] = useState<MetaTarget>(image && status?.instagramName ? 'both' : 'facebook');
	const [when, setWhen] = useState<'now' | 'later'>('now');
	const [at, setAt] = useState(() => localInput(Date.now() + 60 * 60 * 1000));
	const [busy, setBusy] = useState(false);

	const needsPicture = target !== 'facebook' && !image;

	const send = async () => {
		setBusy(true);
		try {
			const jpeg = image ? await toJpegDataUrl(image) : undefined;
			const scheduleAt = when === 'later' ? new Date(at).getTime() : undefined;
			const res = await apiClient.postToMeta({ appId, message: text, target, image: jpeg, scheduleAt });
			const post = res.data?.post;
			if (post?.status === 'failed') throw new Error(post.error || 'Meta refused the post');
			toast.success(when === 'later' ? 'Scheduled. John will post it on time.' : 'Posted.');
			onDone();
			onClose();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not post');
		}
		setBusy(false);
	};

	return createPortal(
		<div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
			<div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-white/10 bg-[#0e0e12] p-6 text-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
				<div className="flex items-start justify-between">
					<h2 className="text-2xl font-medium">Post with John</h2>
					<button type="button" onClick={onClose} className="rounded-full bg-white/10 px-3 py-1 text-sm hover:bg-white/20">Close</button>
				</div>
				<p className="mt-1 text-sm text-white/55">Check the preview, choose where it goes, and when.</p>

				<div className="mt-5 grid gap-4 sm:grid-cols-[1fr_180px]">
					<textarea
						value={text}
						onChange={(e) => setText(e.target.value)}
						rows={8}
						className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-3 text-sm outline-none focus:border-white/30"
					/>
					{image ? <img src={image} alt="Post picture" className="w-full rounded-2xl border border-white/10 object-cover" /> : <div className="flex items-center justify-center rounded-2xl border border-dashed border-white/15 p-3 text-center text-xs text-white/40">No picture. Draw one first to post on Instagram.</div>}
				</div>

				<div className="mt-5 flex flex-wrap gap-2">
					{([['facebook', 'Facebook'], ['instagram', 'Instagram'], ['both', 'Both']] as Array<[MetaTarget, string]>).map(([id, label]) => (
						<button
							key={id}
							type="button"
							onClick={() => setTarget(id)}
							className={`rounded-full border px-4 py-1.5 text-sm transition-colors ${target === id ? 'border-transparent text-black' : 'border-white/15 text-white/70 hover:bg-white/10'}`}
							style={target === id ? { background: PINK } : undefined}
						>
							{label}
						</button>
					))}
				</div>
				{status && !status.instagramName && target !== 'facebook' && (
					<p className="mt-2 text-xs text-amber-300">No Instagram business account is linked to your Page, so only Facebook will work.</p>
				)}
				{needsPicture && <p className="mt-2 text-xs text-amber-300">Instagram needs a picture. Draw one from the Creatives list.</p>}

				<div className="mt-5 flex flex-wrap items-center gap-2">
					{(['now', 'later'] as const).map((w) => (
						<button key={w} type="button" onClick={() => setWhen(w)} className={`rounded-full border px-4 py-1.5 text-sm ${when === w ? 'border-white bg-white text-black' : 'border-white/15 text-white/70 hover:bg-white/10'}`}>
							{w === 'now' ? 'Post now' : 'Schedule'}
						</button>
					))}
					{when === 'later' && (
						<input type="datetime-local" value={at} min={localInput(Date.now() + 6 * 60 * 1000)} onChange={(e) => setAt(e.target.value)} className="rounded-xl border border-white/15 bg-black/40 px-3 py-1.5 text-sm [color-scheme:dark]" />
					)}
				</div>

				<button
					type="button"
					disabled={busy || needsPicture || text.trim().length < 2}
					onClick={() => void send()}
					className="mt-6 w-full rounded-full py-3 text-sm font-semibold text-black disabled:opacity-50"
					style={{ background: PINK }}
				>
					{busy ? 'Sending…' : when === 'later' ? 'Schedule the post' : 'Post now'}
				</button>
			</div>
		</div>,
		document.body,
	);
}
