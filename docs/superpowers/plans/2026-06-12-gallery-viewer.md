# Gallery Viewer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a prerendered SvelteKit gallery at `/` that displays images from `src/lib/content/data.yaml` as full-viewport scroll-snap slides with pan/zoom, optimized for landscape iPhone 12 mini, deployable to GitHub Pages.

**Architecture:** Parse `data.yaml` at build time in `+page.ts`, resolve co-located asset URLs via Vite `import.meta.glob`. The page renders a vertical scroll-snap container with sticky section labels. Each slide mounts `@panzoom/panzoom` on an `<img>` element with gesture rules that defer to native scroll at 1× zoom.

**Tech Stack:** SvelteKit 5, `@sveltejs/adapter-static`, Tailwind CSS 4, `@panzoom/panzoom`, `yaml`, Vitest (node), bun

**Spec:** `docs/superpowers/specs/2026-06-12-gallery-viewer-design.md`

---

## File map

| File | Responsibility |
|---|---|
| `src/lib/gallery/types.ts` | `GalleryItem`, `GallerySection`, `GalleryData` types |
| `src/lib/gallery/parse.ts` | Parse YAML + resolve filenames to URLs |
| `src/lib/gallery/parse.spec.ts` | Unit tests for parse logic |
| `src/lib/components/gallery/SectionLabel.svelte` | Sticky section title bar |
| `src/lib/components/gallery/GallerySlide.svelte` | One slide + Panzoom lifecycle |
| `src/routes/+layout.ts` | `export const prerender = true` |
| `src/routes/+page.ts` | Load gallery data |
| `src/routes/+page.svelte` | Scroll container, sentinels, label state |
| `vite.config.ts` | `fallback: '404.html'`, `paths.base` for GitHub Pages |
| `static/.nojekyll` | Disable Jekyll on GitHub Pages |
| `.github/workflows/deploy.yml` | CI build + deploy |

---

### Task 1: Commit design spec

**Files:**
- Add: `docs/superpowers/specs/2026-06-12-gallery-viewer-design.md`

- [ ] **Step 1: Stage and commit design spec**

```bash
git add docs/superpowers/specs/2026-06-12-gallery-viewer-design.md
git commit -m "$(cat <<'EOF'
docs: add gallery viewer design spec

EOF
)"
```

---

### Task 2: Install dependencies

**Files:**
- Modify: `package.json`, `bun.lock`

- [ ] **Step 1: Install runtime packages**

```bash
bun add @panzoom/panzoom yaml
```

Expected: `package.json` lists `@panzoom/panzoom` and `yaml` under `dependencies`.

- [ ] **Step 2: Commit**

```bash
git add package.json bun.lock
git commit -m "$(cat <<'EOF'
chore: add panzoom and yaml dependencies

EOF
)"
```

---

### Task 3: Gallery types and parse module (TDD)

**Files:**
- Create: `src/lib/gallery/types.ts`
- Create: `src/lib/gallery/parse.ts`
- Create: `src/lib/gallery/parse.spec.ts`

- [ ] **Step 1: Write the failing test**

Create `src/lib/gallery/parse.spec.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseGalleryYaml } from './parse';

describe('parseGalleryYaml', () => {
	const urlMap = {
		'a.svg': '/content/a.svg',
		'b.png': '/content/b.png'
	};

	it('maps yaml sections to items with resolved urls', () => {
		const raw = `
sections:
  - title: Alpha
    items:
      - a.svg
  - title: Beta
    items:
      - b.png
`;
		const result = parseGalleryYaml(raw, urlMap);

		expect(result.sections).toHaveLength(2);
		expect(result.sections[0]).toEqual({
			title: 'Alpha',
			items: [{ filename: 'a.svg', url: '/content/a.svg' }]
		});
		expect(result.sections[1]).toEqual({
			title: 'Beta',
			items: [{ filename: 'b.png', url: '/content/b.png' }]
		});
	});

	it('throws when a yaml entry has no matching file', () => {
		const raw = `
sections:
  - title: Missing
    items:
      - ghost.png
`;
		expect(() => parseGalleryYaml(raw, urlMap)).toThrow(
			'Missing content file: ghost.png'
		);
	});

	it('returns empty sections array for empty yaml', () => {
		const raw = `sections: []`;
		expect(parseGalleryYaml(raw, urlMap)).toEqual({ sections: [] });
	});
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
bun run test:unit -- --run src/lib/gallery/parse.spec.ts
```

Expected: FAIL — module `./parse` not found.

- [ ] **Step 3: Write types**

Create `src/lib/gallery/types.ts`:

```ts
export type GalleryItem = {
	filename: string;
	url: string;
};

export type GallerySection = {
	title: string;
	items: GalleryItem[];
};

export type GalleryData = {
	sections: GallerySection[];
};

export type RawGalleryYaml = {
	sections: {
		title: string;
		items: string[];
	}[];
};
```

- [ ] **Step 4: Write minimal implementation**

Create `src/lib/gallery/parse.ts`:

```ts
import { parse as parseYaml } from 'yaml';
import type { GalleryData, RawGalleryYaml } from './types';

export function parseGalleryYaml(raw: string, urlByFilename: Record<string, string>): GalleryData {
	const data = parseYaml(raw) as RawGalleryYaml;
	const sections = (data.sections ?? []).map((section) => ({
		title: section.title,
		items: section.items.map((filename) => {
			const url = urlByFilename[filename];
			if (!url) {
				throw new Error(`Missing content file: ${filename}`);
			}
			return { filename, url };
		})
	}));

	return { sections };
}

export function buildContentUrlMap(): Record<string, string> {
	const modules = import.meta.glob('$lib/content/*.{svg,png,gif,webp,jpg,jpeg}', {
		eager: true,
		query: '?url',
		import: 'default'
	}) as Record<string, string>;

	const urlByFilename: Record<string, string> = {};
	for (const [path, url] of Object.entries(modules)) {
		const filename = path.split('/').pop();
		if (filename) {
			urlByFilename[filename] = url;
		}
	}
	return urlByFilename;
}

export function loadGalleryData(rawYaml: string): GalleryData {
	return parseGalleryYaml(rawYaml, buildContentUrlMap());
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
bun run test:unit -- --run src/lib/gallery/parse.spec.ts
```

Expected: PASS (3 tests).

- [ ] **Step 6: Commit**

```bash
git add src/lib/gallery/types.ts src/lib/gallery/parse.ts src/lib/gallery/parse.spec.ts
git commit -m "$(cat <<'EOF'
feat: add gallery yaml parser with tests

EOF
)"
```

---

### Task 4: Prerender layout and page load

**Files:**
- Create: `src/routes/+layout.ts`
- Create: `src/routes/+page.ts`

- [ ] **Step 1: Add prerender to layout**

Create `src/routes/+layout.ts`:

```ts
export const prerender = true;
```

- [ ] **Step 2: Add page load function**

Create `src/routes/+page.ts`:

```ts
import type { PageLoad } from './$types';
import rawYaml from '$lib/content/data.yaml?raw';
import { loadGalleryData } from '$lib/gallery/parse';

export const load: PageLoad = () => {
	const gallery = loadGalleryData(rawYaml);
	return { gallery };
};
```

- [ ] **Step 3: Verify types compile**

```bash
bun run check
```

Expected: no errors (page data not yet consumed in `+page.svelte` — that's fine).

- [ ] **Step 4: Commit**

```bash
git add src/routes/+layout.ts src/routes/+page.ts
git commit -m "$(cat <<'EOF'
feat: load gallery data at build time from content yaml

EOF
)"
```

---

### Task 5: SectionLabel component

**Files:**
- Create: `src/lib/components/gallery/SectionLabel.svelte`

- [ ] **Step 1: Create sticky label component**

Create `src/lib/components/gallery/SectionLabel.svelte`:

```svelte
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
```

- [ ] **Step 2: Run svelte autofixer / check**

```bash
bun run check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/gallery/SectionLabel.svelte
git commit -m "$(cat <<'EOF'
feat: add sticky section label component

EOF
)"
```

---

### Task 6: GallerySlide component with Panzoom

**Files:**
- Create: `src/lib/components/gallery/GallerySlide.svelte`

- [ ] **Step 1: Create slide component**

Create `src/lib/components/gallery/GallerySlide.svelte`:

```svelte
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
		if (!panzoomInstance || !stageEl) return;
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
		stageEl.addEventListener('panzoomend', onEnd);
		stageEl.addEventListener('panzoomchange', onEnd);

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
			stageEl?.removeEventListener('panzoomend', onEnd);
			stageEl?.removeEventListener('panzoomchange', onEnd);
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
```

- [ ] **Step 2: Run check**

```bash
bun run check
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/lib/components/gallery/GallerySlide.svelte
git commit -m "$(cat <<'EOF'
feat: add gallery slide with panzoom gestures

EOF
)"
```

---

### Task 7: Main gallery page

**Files:**
- Modify: `src/routes/+page.svelte`
- Modify: `src/routes/layout.css` (optional overflow reset)

- [ ] **Step 1: Replace welcome page with gallery**

Replace `src/routes/+page.svelte` with:

```svelte
<script lang="ts">
	import GallerySlide from '$lib/components/gallery/GallerySlide.svelte';
	import SectionLabel from '$lib/components/gallery/SectionLabel.svelte';
	import type { GallerySection } from '$lib/gallery/types';

	let { data } = $props();

	const sections: GallerySection[] = data.gallery.sections;
	let activeTitle = $state(sections[0]?.title ?? '');

	const slides = sections.flatMap((section, sectionIndex) =>
		section.items.map((item, itemIndex) => ({
			section,
			item,
			isFirstInSection: itemIndex === 0,
			sentinelId: `section-${sectionIndex}`
		}))
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
	<main class="flex h-dvh items-center justify-center bg-[#111] text-white/70">
		No content
	</main>
{:else}
	<main class="gallery-scroll h-dvh snap-y snap-mandatory overflow-y-auto overscroll-y-contain bg-[#111]">
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
```

- [ ] **Step 2: Add gallery scroll styles**

Append to `src/routes/layout.css`:

```css
html,
body {
	height: 100%;
	overflow: hidden;
	background: #111;
}

.gallery-scroll {
	scroll-snap-type: y mandatory;
	-webkit-overflow-scrolling: touch;
}
```

- [ ] **Step 3: Run dev server and verify in browser**

```bash
bun run dev
```

Open `http://localhost:5173` with DevTools device emulation set to iPhone 12 mini landscape (812×375). Verify:
- Vertical scroll snaps between images
- Sticky label updates per section
- Pinch zoom and double-tap work
- At 1× zoom, vertical swipe scrolls to next slide

- [ ] **Step 4: Commit**

```bash
git add src/routes/+page.svelte src/routes/layout.css
git commit -m "$(cat <<'EOF'
feat: add scroll-snap gallery page with section labels

EOF
)"
```

---

### Task 8: GitHub Pages config

**Files:**
- Modify: `vite.config.ts`
- Create: `static/.nojekyll`
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Update vite config for GitHub Pages**

Replace the `sveltekit({...})` block in `vite.config.ts` with:

```ts
		sveltekit({
			compilerOptions: {
				runes: ({ filename }) =>
					filename.split(/[/\\]/).includes('node_modules') ? undefined : true
			},
			adapter: adapter({ fallback: '404.html' }),
			kit: {
				paths: {
					base: process.argv.includes('dev') ? '' : (process.env.BASE_PATH ?? '')
				}
			}
		})
```

- [ ] **Step 2: Add `.nojekyll`**

```bash
touch static/.nojekyll
```

- [ ] **Step 3: Add deploy workflow**

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: ['main']

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  build_site:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Bun
        uses: oven-sh/setup-bun@v2

      - name: Install dependencies
        run: bun install --frozen-lockfile

      - name: Build
        env:
          BASE_PATH: '/${{ github.event.repository.name }}'
        run: bun run build

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: build/

  deploy:
    needs: build_site
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy
        id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 4: Verify subpath build locally**

```bash
BASE_PATH=/data-viz bun run build && bun run preview
```

Open preview URL — images and CSS must load (no 404s on assets).

- [ ] **Step 5: Commit**

```bash
git add vite.config.ts static/.nojekyll .github/workflows/deploy.yml
git commit -m "$(cat <<'EOF'
chore: configure GitHub Pages static deployment

EOF
)"
```

---

### Task 9: Final verification

- [ ] **Step 1: Run full test suite**

```bash
bun run test:unit -- --run
bun run check
bun run lint
```

Expected: all pass.

- [ ] **Step 2: Production build**

```bash
bun run build
```

Expected: build succeeds; `build/index.html` contains gallery markup; `build/404.html` exists.

- [ ] **Step 3: Commit plan document**

```bash
git add docs/superpowers/plans/2026-06-12-gallery-viewer.md
git commit -m "$(cat <<'EOF'
docs: add gallery viewer implementation plan

EOF
)"
```

---

## Spec coverage checklist

| Spec requirement | Task |
|---|---|
| SvelteKit static + prerender | Task 4, 8 |
| `src/lib/content/data.yaml` + assets | Task 3, 4 (glob resolves co-located files) |
| Vertical scroll-snap | Task 7 |
| Sticky section label | Task 5, 7 |
| Contain fit + side margins | Task 6 (CSS `max-w-full`, `px-[5%]`) |
| `@panzoom/panzoom` gestures | Task 6 |
| Double-tap zoom / reset | Task 6 |
| Reset on slide leave | Task 6 (IntersectionObserver) |
| Missing asset build failure | Task 3 (`parseGalleryYaml` throw) |
| Empty yaml handling | Task 3 test + Task 7 empty state |
| Image load error UI | Task 6 |
| GitHub Pages base path + 404 fallback | Task 8 |
| `.nojekyll` | Task 8 |
| CI deploy workflow | Task 8 |
