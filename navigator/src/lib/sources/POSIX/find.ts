import { Source } from "../../../types/Source";
import { ItemPosix, ItemPosixLink, ItemPosixNonLink, LsType } from "./types";
import { UNIT_SEPARATOR, RECORD_SEPARATOR } from "../../constants";

const findPrintfDirectives = [
	'%p', // full path
	'%f', // name
	'%D', // dev id
	'%i', // inode
	'%m', // mode (octal)
	'%U', // uid
	'%u', // user
	'%G', // gid
	'%g', // group
	'%s', // size
	'%A@', // atime
	'%T@', // mtime
	'%C@', // ctime
	'%B@', // btime
	'%y', // type
	'%Y', // symlink target type or type if not symlink
	'%l', // symlink target name or '' if not symlink
];

type FindRecord = [
	string, // full path
	string, // name
	string, // dev id
	string, // inode
	string, // mode (octal)
	string, // uid
	string, // user
	string, // gid
	string, // group
	string, // size
	string, // atime
	string, // mtime
	string, // ctime
	string, // btime
	ItemPosixNonLink["type"], // type
	ItemPosixNonLink["type"], // symlink target type or type if not symlink
	'', // symlink target name or '' if not symlink
] | [
	string, // full path
	string, // name
	string, // dev id
	string, // inode
	string, // mode (octal)
	string, // uid
	string, // user
	string, // gid
	string, // group
	string, // size
	string, // atime
	string, // mtime
	string, // ctime
	string, // btime
	ItemPosixLink["type"], // type
	string, // symlink target type or type if not symlink
	ItemPosixLink["targetType"], // symlink target name or '' if not symlink
]

const findPrintfArg = `${findPrintfDirectives.join(UNIT_SEPARATOR)}${RECORD_SEPARATOR}`;

const parseIntFunctor = (radix?: number) => (str: string) => {
	const num = parseInt(str, radix);
	return isNaN(num) ? undefined : num;
}

function makeItem(record: string): Omit<ItemPosixLink, 'source'> | Omit<ItemPosixNonLink, 'source'> {
	const [
		path,
		name,
		st_devStr,
		st_inoStr,
		st_modeOctStr,
		st_uidStr,
		user,
		st_gidStr,
		group,
		st_sizeStr,
		st_atimeStr,
		st_mtimeStr,
		st_ctimeStr,
		st_btimeStr,
		type,
		target,
		targetType
	] = record.split(UNIT_SEPARATOR) as FindRecord;
	const [
		st_dev,
		st_ino,
		st_uid,
		st_gid,
		st_size,
		st_atime,
		st_mtime,
		st_ctime,
		st_btime
	] = [
		st_devStr,
		st_inoStr,
		st_uidStr,
		st_gidStr,
		st_sizeStr,
		st_atimeStr,
		st_mtimeStr,
		st_ctimeStr,
		st_btimeStr,
	].map(parseIntFunctor(10));
	const [st_mode] = [st_modeOctStr].map(parseIntFunctor(8));
	if (type === LsType.LINK) {
		return {
			path,
			name,
			st_dev,
			st_ino,
			st_mode,
			st_uid,
			user,
			st_gid,
			group,
			st_size,
			st_atime,
			st_mtime,
			st_ctime,
			st_btime,
			type,
			target,
			targetType,
		}
	} else {
		return {
			path,
			name,
			st_dev,
			st_ino,
			st_mode,
			st_uid,
			user,
			st_gid,
			group,
			st_size,
			st_atime,
			st_mtime,
			st_ctime,
			st_btime,
			type,
		}
	}
}
