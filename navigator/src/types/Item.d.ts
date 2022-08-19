import { Location } from "./Location";
import { Source } from "./Source";

export namespace Item {
	export type Type = "file" | "directory" | "link";
}

export interface ItemBase extends Location {
	type: Item.Type;
}

export interface ItemFile extends ItemBase {
	type: "file";
	size?: number;
}

export interface ItemDirectory extends ItemBase {
	type: "directory";
}

export interface ItemLinkBase extends ItemBase {
	type: "link";
	link: ItemBase["path"];
	resolvedType: Omit<Item.Type, "link">
}

export interface ItemLinkFile extends ItemLinkBase, ItemFile {
	resolvedType: "file";
}

export interface ItemLinkDirectory extends ItemLinkBase, ItemDirectory {
	resolvedType: "directory";
}

export interface ItemLinkBroken extends ItemLinkBase {
	broken: true;
}

export type Item = ItemFile | ItemDirectory | ItemLinkFile | ItemLinkDirectory;
