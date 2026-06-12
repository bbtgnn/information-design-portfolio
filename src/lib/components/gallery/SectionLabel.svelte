<script lang="ts">
	let { title }: { title: string } = $props();
</script>

<header
	class="sticky top-0 z-10 flex h-7 shrink-0 items-center border-b border-white/10 bg-[#111]/90 px-3 backdrop-blur-sm"
	aria-live="polite"
>
	<span class="truncate text-xs font-medium tracking-wide text-white/80 uppercase">
		{title}
	</span>
</header>
