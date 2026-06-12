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
		expect(() => parseGalleryYaml(raw, urlMap)).toThrow('Missing content file: ghost.png');
	});

	it('returns empty sections array for empty yaml', () => {
		const raw = `sections: []`;
		expect(parseGalleryYaml(raw, urlMap)).toEqual({ sections: [] });
	});
});
