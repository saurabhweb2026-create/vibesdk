import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { apiClient, type MetaStatus, type MetaTarget } from '@/lib/api-client';
import { blobToDataUrl, cutReel, drawPicture } from '@/lib/make-media';
import { toJpegDataUrl } from '@/components/meta-post-dialog';
import { speak } from '@/lib/voice';
import { PANEL } from './troop-shared';

const PINK = '#ec4899';

interface Brief {
	goal: string;
	tone: string;
	offer: string;
	audience: string;
	location: string;
	budgetInr: number;
}

interface Made {
	picture: string;
	caption: string;
	videoUrl: string | null;
	videoBlob: Blob | null;
	videoIsMp4: boolean;
}

interface Props {
	appId: string;
	brand: string;
	brief: Brief;
	meta: MetaStatus | null;
	onPosted: () => void;
	/** Set when the owner asked for it by voice, so the work starts without a tap. */
	autoStart?: string;
}

/**
 * One tap: John plans the campaign, draws the picture with its headline, cuts a short video
 * with music, and leaves a single button to post it.
 */
export function QuickCampaign({ appId, brand, brief, meta, onPosted, autoStart }: Props) {
	const [step, setStep] = useState('');
	const [made, setMade] = useState<Made | null>(null);
	const [posting, setPosting] = useState('');
	const started = useRef(false);

	const create = async (spoken?: string) => {
		setMade(null);
		try {
			setStep('John is planning your campaign…');
			const res = await apiClient.generateLouieAds({
				appId,
				goal: brief.goal,
				budgetInr: brief.budgetInr,
				audience: brief.audience || undefined,
				location: brief.location || undefined,
				tone: brief.tone,
				offer: (spoken ?? brief.offer) || undefined,
				formats: ['Creatives', 'Video scripts'],
			});
			const content = res.data?.content;
			const creative = content?.creatives?.[0];
			const script = content?.videoScripts?.[0];
			if (!content || !creative) throw new Error('John could not plan a creative this time. Please try again.');

			setStep('John is drawing the picture…');
			const picture = await drawPicture(appId, creative.imagePrompt || creative.visual, creative.overlayText, brand, PINK);
			const tags = (content.hashtags?.niche ?? []).slice(0, 4).join(' ');
			const caption = [creative.caption, tags].filter(Boolean).join('\n\n');
			setMade({ picture, caption, videoUrl: null, videoBlob: null, videoIsMp4: false });

			if (script?.shots?.length) {
				setStep('John is cutting the video…');
				const { blob, isMp4 } = await cutReel(appId, script.shots, script.cta, script.title, PINK);
				setMade({ picture, caption, videoUrl: URL.createObjectURL(blob), videoBlob: blob, videoIsMp4: isMp4 });
			}
			toast.success('John finished your creative');
			if (spoken) void speak('Your picture and video are ready. Tap post when you like them.');
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not create the campaign');
		}
		setStep('');
	};

	useEffect(() => {
		if (!autoStart || started.current) return;
		started.current = true;
		void create(autoStart);
	});

	useEffect(() => () => void (made?.videoUrl && URL.revokeObjectURL(made.videoUrl)), [made?.videoUrl]);

	const target: MetaTarget = meta?.instagramName ? 'both' : 'facebook';

	const post = async (kind: 'picture' | 'video') => {
		if (!made) return;
		setPosting(kind);
		try {
			const body =
				kind === 'video' && made.videoBlob
					? { video: await blobToDataUrl(made.videoBlob) }
					: { image: await toJpegDataUrl(made.picture) };
			const res = await apiClient.postToMeta({ appId, message: made.caption, target, ...body });
			if (res.data?.post.status === 'failed') throw new Error(res.data.post.error || 'Meta refused the post');
			toast.success(target === 'both' ? 'Posted on Facebook and Instagram.' : 'Posted on Facebook.');
			onPosted();
		} catch (e) {
			toast.error(e instanceof Error ? e.message : 'Could not post');
		}
		setPosting('');
	};

	const connected = Boolean(meta?.connected);

	return (
		<div className={PANEL} style={{ borderColor: `${PINK}55` }}>
			<div className="flex flex-wrap items-center justify-between gap-3">
				<div>
					<div className="font-label text-[11px]" style={{ color: PINK }}>One click</div>
					<div className="mt-1 text-lg font-medium text-white">Picture and video, ready to post</div>
					<p className="mt-0.5 text-sm text-white/60">John plans it, draws it, cuts the video with music, and you press post.</p>
				</div>
				<button
					type="button"
					disabled={!!step}
					onClick={() => void create()}
					className="rounded-full px-6 py-2.5 text-sm font-semibold text-black disabled:opacity-60"
					style={{ background: PINK }}
				>
					{step || (made ? 'Make another' : 'Create now')}
				</button>
			</div>

			{made && (
				<div className="mt-5 grid gap-4 sm:grid-cols-2">
					<div>
						<img src={made.picture} alt="Your creative" className="w-full rounded-2xl border border-white/10" />
						<button
							type="button"
							disabled={!connected || !!posting}
							onClick={() => void post('picture')}
							className="mt-3 w-full rounded-full bg-white px-4 py-2.5 text-sm font-medium text-black disabled:opacity-50"
						>
							{posting === 'picture' ? 'Posting…' : 'Post the picture now'}
						</button>
					</div>
					<div>
						{made.videoUrl ? (
							<video src={made.videoUrl} controls playsInline className="mx-auto h-[26rem] rounded-2xl border border-white/10" />
						) : (
							<div className="flex h-[26rem] items-center justify-center rounded-2xl border border-dashed border-white/15 text-sm text-white/50">{step.includes('video') ? 'Cutting the video…' : 'No video this time'}</div>
						)}
						{made.videoUrl && (
							<>
								<button
									type="button"
									disabled={!connected || !!posting || !made.videoIsMp4}
									onClick={() => void post('video')}
									className="mt-3 w-full rounded-full px-4 py-2.5 text-sm font-medium text-black disabled:opacity-50"
									style={{ background: PINK }}
								>
									{posting === 'video' ? 'Posting, this can take a minute…' : 'Post the video now'}
								</button>
								<a href={made.videoUrl} download={`${brand}-video.${made.videoIsMp4 ? 'mp4' : 'webm'}`} className="mt-2 inline-block text-sm text-[#8bf0c4] underline">
									Download video
								</a>
								{!made.videoIsMp4 && <p className="mt-1 text-xs text-amber-300">This browser saved the video as WebM, which Meta does not accept. Use Chrome on a computer to post the video.</p>}
							</>
						)}
					</div>
					<textarea
						value={made.caption}
						onChange={(e) => setMade({ ...made, caption: e.target.value })}
						rows={4}
						className="w-full resize-none rounded-2xl border border-white/10 bg-black/40 p-3 text-sm text-white outline-none focus:border-white/30 sm:col-span-2"
					/>
				</div>
			)}
			{made && !connected && <p className="mt-3 text-sm text-amber-300">Connect Meta above to post. You can still download everything.</p>}
			{made && connected && <p className="mt-3 text-xs text-white/45">Posts go to {target === 'both' ? 'your Facebook Page and Instagram' : 'your Facebook Page'}.</p>}
		</div>
	);
}
