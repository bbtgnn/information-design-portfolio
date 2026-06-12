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
