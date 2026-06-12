import type { PageLoad } from './$types';
import rawYaml from '$lib/content/data.yaml?raw';
import { loadGalleryData } from '$lib/gallery/parse';

export const load: PageLoad = () => {
	const gallery = loadGalleryData(rawYaml);
	return { gallery };
};
