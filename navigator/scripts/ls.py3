#!/usr/bin/env python3

"""
	Cockpit Navigator - A File System Browser for Cockpit.
	Copyright (C) 2021 Josh Boudreau <jboudreau@45drives.com>

	This file is part of Cockpit Navigator.
	Cockpit Navigator is free software: you can redistribute it and/or modify
	it under the terms of the GNU General Public License as published by
	the Free Software Foundation, either version 3 of the License, or
	(at your option) any later version.
	Cockpit Navigator is distributed in the hope that it will be useful,
	but WITHOUT ANY WARRANTY; without even the implied warranty of
	MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
	GNU General Public License for more details.
	You should have received a copy of the GNU General Public License
	along with Cockpit Navigator.  If not, see <https://www.gnu.org/licenses/>.
"""

import os
from stat import S_ISDIR, S_ISLNK, filemode
import json
import sys
import magic
from optparse import OptionParser
from pwd import getpwuid
from grp import getgrgid

def get_stat(full_path, filename = '/', no_mimetype=False):
	try:
		stats = os.lstat(full_path)
	except OSError:
		return {
			"filename": filename,
			"isdir": False,
			"link-target": "",
			"stat": {
				"inaccessible": True,
				"mode": 0,
				"mode-str": "?",
				"uid": 0,
				"owner": "?",
				"gid": 0,
				"group": "?",
				"size": 0,
				"atime": 0,
				"mtime": 0,
				"ctime": 0
			}
		}
	isdir = False
	try:
		isdir = S_ISDIR(os.stat(full_path).st_mode)
	except OSError:
		pass
	link_target = '?'
	if S_ISLNK(stats.st_mode):
		link_target = os.readlink(full_path)
	owner = '?'
	try:
		owner = getpwuid(stats.st_uid).pw_name
	except:
		pass
	group = '?'
	try:
		group = getgrgid(stats.st_gid).gr_name
	except:
		pass
	mimetype = None
	if not no_mimetype:
		try:
			if not isdir:
				mimetype = magic.detect_from_filename(full_path)[0]
		except:
			pass
	response = {
		"inaccessible": False,
		"filename": filename,
		"isdir": isdir,
		"link-target": link_target,
		"stat": {
			"mode": stats.st_mode,
			"mode-str": filemode(stats.st_mode),
			"uid": stats.st_uid,
			"owner": owner,
			"gid": stats.st_gid,
			"group": group,
			"size": stats.st_size,
			"atime": stats.st_atime,
			"mtime": stats.st_mtime,
			"ctime": stats.st_ctime
		},
		"mimetype": mimetype
	}
	return response

def main():
	parser = OptionParser()
	parser.add_option("-m", "--no-mimetype", dest="no_mimetype", default=False, action="store_true")
	(options, args) = parser.parse_args()
	if(len(args) != 1):
		print("Not enough args: ", args)
		sys.exit(1)
	try:
		nodes = os.listdir(args[0])
	except Exception as e:
		print(e)
		sys.exit(1)
	response = {
		".": get_stat(args[0], no_mimetype=options.no_mimetype),
		"children": []
	}
	for node in nodes:
		full_path = args[0] + "/" + node
		response["children"].append(get_stat(full_path, node, no_mimetype=options.no_mimetype))
	print(json.dumps(response))


if __name__ == "__main__":
	main()
