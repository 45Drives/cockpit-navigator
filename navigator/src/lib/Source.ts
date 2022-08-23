import { ItemDisplay } from '@/types/FrontEnd';
import { Location } from '@/types/Location';

export interface ItemPermissions {
	owner: string | number;
	group: string | number;
	mode: number;
}

export namespace Source {
	export interface CreateOptions {
		/**
		 * If a file/link already exists at the specified path, and is the same type as what is being created, overwrite it.
		 * Cannot overwrite directories.
		 */
		overwrite?: boolean;
		/**
		 * If a file/link already exists at the specified path, overwrite it regardless of original type.
		 * Cannot overwrite directories.
		 */
		forceOverwrite?: boolean;
		/**
		 * If the path does not exist, create parent directories.
		 * Analogous to `mkdir -p`
		 */
		parents?: boolean;
	}
	export interface DeleteOptions {
		/**
		 * For directories, delete all children. If not specified for non-empty directory, deletion will fail.
		 */
		recursive?: boolean;
	}
	export interface DownloadOptions {
		/**
		 * Compress files/directories into archive before downloading
		 */
		zip?: boolean;
	}
}

export interface Source<ItemType extends Location, FileType extends Location = ItemType, DirectoryType extends Location = ItemType, LinkType extends Location = ItemType> {
	displayTransform(item: Readonly<ItemType>): ItemDisplay<ItemType>;

	list(path?: string): Promise<ItemType[]>;
	lookup(path: string): Promise<ItemType>;

	createFile?(path: string, opts?: Readonly<Source.CreateOptions>): Promise<FileType>;
	createDirectory?(path: string, opts?: Readonly<Source.CreateOptions>): Promise<DirectoryType>;
	createLink?(path: string, targetLocation: string, opts?: Readonly<Source.CreateOptions>): Promise<LinkType>;

	delete?(item: ItemType, opts?: Readonly<Source.DeleteOptions>): Promise<ItemType>;
	moveToTrash?(item: ItemType, opts?: Readonly<Source.DeleteOptions>): Promise<ItemType>;

	read?(item: FileType): Promise<Uint8Array>;
	write?(item: FileType, data: Uint8Array): Promise<FileType>;

	getPermissions?(item: Location): Promise<Location & ItemPermissions>;
	setPermissions?(item: Location & Partial<ItemPermissions>, newPermissions?: Partial<ItemPermissions>): Promise<Location & ItemPermissions>;

	download?(item: Location, options: Source.DownloadOptions): Promise<Location>;
	download?(items: Location[], options: Source.DownloadOptions): Promise<Location>;
	upload?(dataTransfer: DataTransfer): Promise<Location | Location[]>;
}

export interface SourceStatic {
	readonly sourceTypeId: string;
}

export const defineSource = <
	ItemType extends Location,
	FileType extends Location = ItemType,
	DirectoryType extends Location = ItemType,
	LinkType extends Location = ItemType
>(ctor: SourceStatic & { new (...args: any[]): Source<ItemType, FileType, DirectoryType, LinkType>}) => ctor;
