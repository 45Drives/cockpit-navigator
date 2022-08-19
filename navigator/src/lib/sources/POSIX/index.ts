import { defineSource } from "../../../composables/SourceAdapter";
import { Source } from "../../../types/Source";
import { ItemPosix } from "./types";

export default defineSource(({ notifications }) => {
	return class SourcePosix implements Source<ItemPosix> {
		constructor(private root: string, private host: string) { }
		private async getRecords(location: string): Promise<string[]> {
			return [
				""
			]
		}
		async list(path: string = ""): Promise<(ItemPosix)[]> {
			return (await this.getRecords(this.root + path)).map(record => this.makeItem(record));
		}
		async lookup(path: string): Promise<ItemPosix> {
			return this.makeItem(this.getRecords(this.root + location)[0])
		}
	}
})
