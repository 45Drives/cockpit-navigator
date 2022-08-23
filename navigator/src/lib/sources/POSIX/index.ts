import { ItemDisplay } from '@/types/FrontEnd';
import { defineSource, Source, SourceStatic } from '@/lib/Source';
import { SourceError } from '@/lib/Error';
import { ItemPosix, LsType } from './types';

export class SourcePosixError extends SourceError { }

export default defineSource(class SourcePosix implements Source<ItemPosix> {
	static readonly sourceTypeId = "fs";
	constructor(private root: string, private host: string) { }
	displayTransform(item: ItemPosix): ItemDisplay<ItemPosix> {
		const sourceItem = item;
		let displayType: ItemDisplay<ItemPosix>['displayType'];
		let isLink: ItemDisplay<ItemPosix>['isLink'];
		let isBrokenLink: ItemDisplay<ItemPosix>['isBrokenLink'];

		switch (item.type) {
			case LsType.DIRECTORY:
				isLink = isBrokenLink = false;
				displayType = 'directory';
				break;
			case LsType.LINK:
				isLink = true;
				isBrokenLink = false;
				switch (item.targetType) {
					case LsType.DIRECTORY:
						displayType = 'directory';
						break;
					case LsType.LINK_BROKEN:
					case LsType.LINK_LOOP:
						isBrokenLink = true;
					/* fall through */
					default:
						displayType = 'file';
						break;
				}
			default:
				isLink = isBrokenLink = false;
				displayType = 'file';
				break;
		}

		return {
			name: item.name,
			sourceItem,
			displayType,
			isLink,
			isBrokenLink,
		};
	}
	async list(path: string = ""): Promise<(ItemPosix)[]> {
		return [];
	}
	async lookup(path: string): Promise<ItemPosix> {
		return {
			source: this,
			path,
			name: 'test',
			st_dev: 0,
			st_ino: 0,
			st_mode: 0,
			st_uid: 0,
			user: 'jimmy',
			st_gid: 0,
			group: 'bob',
			st_size: 0,
			st_atime: 0,
			st_mtime: 0,
			st_ctime: 0,
			st_btime: 0,
			type: LsType.REGULAR_FILE,
		}
	}
});
