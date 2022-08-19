import { Location } from "../../../types/Location";

export enum LsType {
	REGULAR_FILE = 'f',
	DIRECTORY = 'd',
	LINK = 'l',
	CHARACTER = 'c',
	BLOCK = 'b',
	FIFO = 'p',
	SOCKET = 's',
	UNKNOWN = 'U',
	LINK_LOOP = 'L',
	LINK_BROKEN = 'N',
	DOOR = 'D',
}

export namespace LsType {
	export const humanReadableLut: { [key in LsType]: string } = {
		[LsType.REGULAR_FILE]: 'regular file',
		[LsType.DIRECTORY]: 'directory',
		[LsType.LINK]: 'symbolic link',
		[LsType.CHARACTER]: 'character device',
		[LsType.BLOCK]: 'block device',
		[LsType.FIFO]: 'FIFO (named pipe)',
		[LsType.SOCKET]: 'socket',
		[LsType.UNKNOWN]: 'unknown file type',
		[LsType.LINK_LOOP]: 'broken link (loop)',
		[LsType.LINK_BROKEN]: 'broken link (non-existent)',
		[LsType.DOOR]: 'door (Solaris)', // probably don't need this, but why not right?
	}
}

/**
 * POSIX-spec of stat output, minus st_nlink, st_rdev, st_blksz, st_blocks
 */
export interface ItemPosixBase extends Location {
	/**
	 * Name of file
	 */
	name: string;
	/**
	 * ID of device containing file
	 */
	st_dev?: number;
	/**
	 * inode number
	 */
	st_ino?: number;
	/**
	 * protection
	 */
	st_mode?: number;
	/**
	 * user ID of owner
	 */
	st_uid?: number;
	/**
	 * user name of owner
	 */
	user: string;
	/**
	 * group ID of owner
	 */
	st_gid?: number;
	/**
	 * group name of owner
	 */
	group: string;
	/**
	 * total size, in bytes
	 */
	st_size?: number;
	/**
	 * time of last access
	 */
	st_atime?: number;
	/**
	 * time of last modification
	 */
	st_mtime?: number;
	/**
	 * time of last status change
	 */
	st_ctime?: number;
	/**
	 * Birth time (not supported on all filesystems)
	 */
	st_btime?: number;
	/**
	 * File's type (like in ls -l), U=unknown type (shouldn't happen)
	 */
	type: LsType;
}

export interface ItemPosixNonLink extends ItemPosixBase {
	type: Exclude<LsType, LsType.LINK | LsType.LINK_BROKEN | LsType.LINK_LOOP>;
}

export interface ItemPosixLink extends ItemPosixBase {
	type: LsType.LINK;
	/**
	 * Only if symbolic link:
	 * File's type (like %y), plus follow symbolic links: `L'=loop, `N'=nonexistent, `?' for any other error
	 */
	targetType: LsType;
	target: string;
}

export type ItemPosix = ItemPosixNonLink | ItemPosixLink;
