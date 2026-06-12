<script lang="ts">
	import GallerySlide from '$lib/components/gallery/GallerySlide.svelte';
	import SectionLabel from '$lib/components/gallery/SectionLabel.svelte';
	let { data } = $props();

	const gallery = $derived(data.gallery);
	let activeTitle = $state('');

	$effect(() => {
		if (!activeTitle && gallery.sections[0]) {
			activeTitle = gallery.sections[0].title;
		}
	});

	const slides = $derived(
		gallery.sections.flatMap((section, sectionIndex) =>
			section.items.map((item, itemIndex) => ({
				section,
				item,
				isFirstInSection: itemIndex === 0,
				sentinelId: `section-${sectionIndex}`
			}))
		)
	);

	function observeSentinel(node: HTMLElement, sectionTitle: string) {
		const observer = new IntersectionObserver(
			([entry]) => {
				if (entry?.isIntersecting) activeTitle = sectionTitle;
			},
			{ rootMargin: '-1px 0px -90% 0px', threshold: 0 }
		);
		observer.observe(node);
		return {
			destroy() {
				observer.disconnect();
			}
		};
	}
</script>

{#if slides.length === 0}
	<main class="flex h-dvh items-center justify-center bg-[#111] text-white/70">No content</main>
{:else}
	<main
		class="gallery-scroll h-dvh snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-[#111]"
	>
		<SectionLabel title={activeTitle} />

		{#each slides as slide (slide.item.filename)}
			{#if slide.isFirstInSection}
				<div
					class="h-0 w-full"
					id={slide.sentinelId}
					use:observeSentinel={slide.section.title}
				></div>
			{/if}
			<GallerySlide item={slide.item} />
		{/each}
	</main>
{/if}
