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
