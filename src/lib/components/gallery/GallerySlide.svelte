<script lang="ts">
	import { onMount } from 'svelte';
	import type { PanzoomGlobalOptions, PanzoomObject } from '@panzoom/panzoom';
	import type { GalleryItem } from '$lib/gallery/types';

	const ZOOM_THRESHOLD = 1.02;

	let {
		item,
		onZoomedChange
	}: {
		item: GalleryItem;
		onZoomedChange?: (zoomed: boolean) => void;
	} = $props();

	let stageEl = $state<HTMLDivElement | null>(null);
	let imgEl = $state<HTMLImageElement | null>(null);
	let loadError = $state(false);
	let zoomed = $state(false);
	let panzoomInstance: PanzoomObject | null = null;
	let gesturing = false;
	let lastTap = 0;

	function isZoomed(scale = panzoomInstance?.getScale() ?? 1) {
		return scale > ZOOM_THRESHOLD;
	}

	function syncZoomState() {
		if (!panzoomInstance || !stageEl) return;
		zoomed = isZoomed();
		onZoomedChange?.(zoomed);
		panzoomInstance.setOptions({
			disablePan: !zoomed,
			touchAction: zoomed ? 'none' : 'pan-y'
		});
		stageEl.style.touchAction = zoomed ? 'none' : 'pan-y';
	}

	function resetPanzoom() {
		if (!panzoomInstance || gesturing) return;
		panzoomInstance.reset({ animate: false });
		syncZoomState();
	}

	function handleImageLoad() {
		if (!gesturing) syncZoomState();
	}

	function handleDoubleTap(event: PointerEvent) {
		if (!panzoomInstance || gesturing || event.pointerType !== 'touch') return;
		const now = Date.now();
		if (now - lastTap < 300) {
			if (isZoomed()) {
				panzoomInstance.reset({ animate: true });
			} else {
				panzoomInstance.zoomToPoint(2, event, { animate: true });
			}
			syncZoomState();
			lastTap = 0;
			return;
		}
		lastTap = now;
	}

	onMount(() => {
		const stage = stageEl;
		const img = imgEl;
		if (!stage || !img) return;

		let cancelled = false;

		import('@panzoom/panzoom').then((mod) => {
			if (cancelled) return;

			type PanzoomFactory = (
				elem: HTMLElement,
				options?: PanzoomGlobalOptions
			) => PanzoomObject;
			const Panzoom = (mod as { default: PanzoomFactory }).default;
			panzoomInstance = Panzoom(img, {
				maxScale: 4,
				minScale: 1,
				disablePan: true,
				pinchAndPan: true,
				touchAction: 'pan-y',
				animate: false
			});

			const onStart = () => {
				gesturing = true;
				onZoomedChange?.(true);
			};

			const onEnd = () => {
				gesturing = false;
				syncZoomState();
			};

			img.addEventListener('panzoomstart', onStart);
			img.addEventListener('panzoomend', onEnd);

			if (img.complete) handleImageLoad();
		});

		const observer = new IntersectionObserver(
			([entry]) => {
				if (gesturing) return;
				if (!entry?.isIntersecting) resetPanzoom();
			},
			{ threshold: 0 }
		);
		observer.observe(stage);

		return () => {
			cancelled = true;
			onZoomedChange?.(false);
			observer.disconnect();
			panzoomInstance?.destroy();
			panzoomInstance = null;
		};
	});
</script>

<section class="slide flex h-dvh snap-start snap-always flex-col bg-[#111]">
	<div
		bind:this={stageEl}
		class="pan-stage relative flex flex-1 items-center justify-center overflow-hidden px-[5%]"
		class:touch-none={zoomed}
		role="button"
		tabindex="-1"
		aria-label="Double-tap to zoom {item.filename}"
		onpointerup={handleDoubleTap}
	>
		{#if loadError}
			<p class="text-sm text-white/60">{item.filename} failed to load</p>
		{:else}
			<img
				bind:this={imgEl}
				src={item.url}
				alt={item.filename}
				class="max-h-full max-w-full select-none will-change-transform"
				draggable="false"
				onload={handleImageLoad}
				onerror={() => (loadError = true)}
			/>
		{/if}
	</div>
</section>
