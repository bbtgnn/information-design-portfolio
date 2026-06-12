# Gallery Viewer — Design Spec

**Date:** 2026-06-12  
**Status:** Approved (brainstorming)  
**Deploy target:** GitHub Pages via `@sveltejs/adapter-static`

## Goal

A mobile-first gallery page for landscape iPhone 12 mini that displays all images defined in `src/lib/content/data.yaml`. Each image occupies a full-viewport slide with pan/zoom. Section titles appear as a sticky label while scrolling through that section's images.

## Requirements Summary

| Decision          | Choice                                                                        |
| ----------------- | ----------------------------------------------------------------------------- |
| Framework         | SvelteKit 5, static adapter, full prerender                                   |
| Content source    | `src/lib/content/data.yaml` + co-located media files                          |
| Navigation        | Vertical scroll-snap, one slide per image                                     |
| Section titles    | Sticky small label at top                                                     |
| Initial image fit | Contain with side margins                                                     |
| Pan/zoom          | `@panzoom/panzoom` (npm)                                                      |
| YAML parsing      | `yaml` package (npm)                                                          |
| Route             | `/` (replaces default welcome page)                                           |
| Publishing        | [GitHub Pages guide](https://svelte.dev/docs/kit/adapter-static#GitHub-Pages) |

## Layout & Scroll

**Viewport target:** landscape iPhone 12 mini (~812 × 375 CSS px). Use `100dvh` / `100dvw` and `env(safe-area-inset-*)`.

```
┌─────────────────────────────────────┐
│ [Section title]     ← sticky ~28px  │
├─────────────────────────────────────┤
│                                     │
│    ┌─────────────────────┐          │
│    │      image          │  gutter  │  fit: contain
│    └─────────────────────┘          │
│                                     │
└─────────────────────────────────────┘
        ↓ scroll-snap to next slide
```

- **Scroll container:** `scroll-snap-type: y mandatory` on the main axis.
- **Slides:** each image is one `100dvh` slide with `scroll-snap-align: start`.
- **Sticky label:** `position: sticky` bar at top. Text updates when the first slide of a new section enters view (Intersection Observer on section sentinel elements).
- **Image stage:** ~90% width, centered, small horizontal gutter for pan headroom.
- **Background:** dark neutral (`#111`) for letterboxing.

## Pan & Zoom

**Library:** `@panzoom/panzoom` — pointer events, pinch-to-zoom on iOS, CSS transforms.

**DOM per slide:**

```
.slide (100dvh, scroll-snap-align: start, overflow: hidden)
  └── .pan-stage (fills slide below label, touch-action toggled)
        └── <img src={url} alt={filename} />  ← Panzoom target
```

**Gesture rules:**

| State     | Vertical swipe             | Pinch    | Drag       |
| --------- | -------------------------- | -------- | ---------- |
| Zoom = 1× | Scrolls to next/prev slide | Zooms in | Ignored    |
| Zoom > 1× | Pans image                 | Zooms    | Pans image |

**Options:**

- `minScale`: 1 (cannot zoom below fit)
- `maxScale`: 4
- `startScale`: computed on image `load` so image fits contain inside stage
- **Double-tap:** `zoomToPoint` to 2×; second double-tap resets to fit
- **GIFs:** standard `<img>` — animation continues under Panzoom

**Scroll vs pan:** at scale 1, release touch handling so native scroll-snap works; when scale > 1, `touch-action: none` on stage. Toggle on `panzoomend` / scale checks.

**Reset:** when a slide leaves viewport (Intersection Observer), reset pan/zoom to fit.

## Data & File Structure

```
src/lib/content/
  data.yaml
  dashboard-1.svg
  dashboard-2.svg
  napoli-planning.svg
  coding-introduction.svg
  project-1.png       # required by yaml — add before build
  web.gif               # required by yaml — add before build
  text-analysis.png     # required by yaml — add before build
  webapp.png            # required by yaml — add before build

src/lib/gallery/
  types.ts              # GallerySection, GalleryItem types
  parse.ts              # yaml parse + glob URL resolution

src/lib/components/gallery/
  GallerySlide.svelte
  SectionLabel.svelte

src/routes/
  +layout.ts            # export const prerender = true
  +page.ts              # load gallery data
  +page.svelte          # scroll container + label
```

**`data.yaml` schema:**

```yaml
sections:
  - title: string
    items:
      - filename string # basename only, resolved against src/lib/content/
```

**Load function (`+page.ts`):**

1. Import `data.yaml` as raw (`?raw`).
2. Parse with `yaml` package.
3. Resolve filenames via `import.meta.glob('$lib/content/*.{svg,png,gif,webp,jpg,jpeg}', { eager: true, query: '?url', import: 'default' })`.
4. Return `{ sections: { title, items: { filename, url }[] }[] }`.
5. Throw at build time if a yaml entry has no matching file.

## GitHub Pages Deployment

Per [SvelteKit adapter-static GitHub Pages docs](https://svelte.dev/docs/kit/adapter-static#GitHub-Pages).

**`vite.config.ts`:**

```ts
adapter({
  fallback: '404.html'
}),
kit: {
  paths: {
    base: process.argv.includes('dev') ? '' : (process.env.BASE_PATH ?? '')
  }
}
```

**`static/.nojekyll`:** empty file to disable Jekyll.

**`.github/workflows/deploy.yml`:**

- Trigger: push to `main`
- `bun install` → `bun run build` with `BASE_PATH: '/${{ github.event.repository.name }}'`
- Upload `build/` → `actions/deploy-pages@v4`

**One-time:** enable GitHub Pages from Actions in repo settings.

Image URLs from Vite imports automatically respect `paths.base` in production.

## Error Handling

- **Missing asset at build:** fail the prerender/build with a clear message naming the missing filename.
- **Broken image at runtime:** `onerror` on `<img>` shows filename + "failed to load" in the slide (should not occur if build passes).
- **Empty yaml:** render a single slide with "No content" message.

## Out of Scope

- Desktop-specific UI chrome
- Image upload / CMS editing
- Authentication
- Horizontal swipe between images within a section
- SPA fallback routes beyond `404.html`

## Testing (manual)

1. `bun run dev` — verify scroll-snap, sticky label, pan/zoom on landscape mobile emulation (812×375).
2. Pinch zoom, double-tap, pan when zoomed, scroll when at 1×.
3. Verify GIF animates while pannable.
4. `BASE_PATH=/data-viz bun run build && bun run preview` — confirm assets load under subpath.
5. Deploy workflow produces working GitHub Pages URL.

## Dependencies to Add

```bash
bun add @panzoom/panzoom yaml
```
