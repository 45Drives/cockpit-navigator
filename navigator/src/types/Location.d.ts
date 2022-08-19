import { Source } from "./Source";

export interface Location {
	/**
	 * Reference to the source that contains the item
	 */
	source: Source;
	/**
	 * Path to item relative to source's base path
	 */
	path: string;
}
