import { Location } from "./Location";

export namespace ItemDisplay {
	export type mimetype = `text/${string}` | `image/${string}` | `video/${string}`;
}

export interface ItemDisplay<SourceItemType extends Location> {
	sourceItem: SourceItemType;
	name: string;
	displayType: 'directory' | 'file';
	isLink: boolean;
	isBrokenLink: boolean;
	mimetype?: ItemDisplay.mimetype;
}
