import { ItemDisplay } from "./FrontEnd";
import { Location } from "./Location";

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
	displayTransform(item: ItemType): ItemDisplay<ItemType>;

	async list(path?: string): Promise<ItemType[]>;
	async lookup(path: string): Promise<ItemType>;

	async createFile?(path: string, opts?: Source.CreateOptions): Promise<FileType>;
	async createDirectory?(path: string, opts?: Source.CreateOptions): Promise<DirectoryType>;
	async createLink?(path: string, targetLocation: string, opts?: Source.CreateOptions): Promise<LinkType>;

	async delete?(item: ItemType, opts?: Source.DeleteOptions): Promise<ItemType>;
	async moveToTrash?(item: ItemType, opts?: Source.DeleteOptions): Promise<ItemType>;

	async read?(item: FileType): Promise<Uint8Array>;
	async write?(item: FileType, data: Uint8Array): Promise<FileType>;

	async getPermissions?(item: Location): Promise<Location & ItemPermissions>;
	async setPermissions?(item: Location & Partial<ItemPermissions>, newPermissions?: Partial<ItemPermissions>): Promise<Location & ItemPermissions>;

	async download?(item: Location, options: Source.DownloadOptions): Promise<Location>;
	async download?(items: Location[], options: Source.DownloadOptions): Promise<Location>;
	async upload?(dataTransfer: DataTransfer): Promise<Location | Location[]>;
}
