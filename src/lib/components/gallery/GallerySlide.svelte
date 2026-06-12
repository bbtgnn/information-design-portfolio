<script lang="ts">
	import { onMount } from 'svelte';
	import Panzoom from '@panzoom/panzoom';
	import type { GalleryItem } from '$lib/gallery/types';

	let {
		item,
		onVisibleChange
	}: {
		item: GalleryItem;
		onVisibleChange?: (visible: boolean) => void;
	} = $props();

	let stageEl = $state<HTMLDivElement | null>(null);
	let imgEl = $state<HTMLImageElement | null>(null);
	let loadError = $state(false);
	let panzoomInstance: ReturnType<typeof Panzoom> | null = null;
	let lastTap = 0;

	function updatePanEnabled() {
		if (!panzoomInstance || !stageEl) return;
		const scale = panzoomInstance.getScale();
		const zoomed = scale > 1.01;
		stageEl.style.touchAction = zoomed ? 'none' : 'pan-y';
		panzoomInstance.setOptions({ disablePan: !zoomed });
	}

	function resetPanzoom() {
		if (!panzoomInstance) return;
		panzoomInstance.reset({ animate: false });
		updatePanEnabled();
	}

	function handleImageLoad() {
		resetPanzoom();
	}

	function handleDoubleTap(event: PointerEvent) {
		if (!panzoomInstance) return;
		const now = Date.now();
		if (now - lastTap < 300) {
			const scale = panzoomInstance.getScale();
			if (scale > 1.01) {
				resetPanzoom();
			} else {
				panzoomInstance.zoomToPoint(2, event, { animate: true });
				updatePanEnabled();
			}
		}
		lastTap = now;
	}

	onMount(() => {
		if (!stageEl || !imgEl) return;

		panzoomInstance = Panzoom(imgEl, {
			maxScale: 4,
			minScale: 1,
			contain: 'inside',
			disablePan: true,
			touchAction: 'pan-y'
		});

		const onEnd = () => updatePanEnabled();
		imgEl.addEventListener('panzoomend', onEnd);
		imgEl.addEventListener('panzoomchange', onEnd);

		const observer = new IntersectionObserver(
			([entry]) => {
				const visible = entry?.isIntersecting ?? false;
				onVisibleChange?.(visible);
				if (!visible) resetPanzoom();
			},
			{ threshold: 0.55 }
		);
		observer.observe(stageEl);

		return () => {
			imgEl?.removeEventListener('panzoomend', onEnd);
			imgEl?.removeEventListener('panzoomchange', onEnd);
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
				class="max-h-full max-w-full select-none"
				draggable="false"
				onload={handleImageLoad}
				onerror={() => (loadError = true)}
			/>
		{/if}
	</div>
</section>
