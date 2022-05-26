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

"""
Synopsis: `echo <newline delimited JSON objects> | write-chunks.py3`
JSON objects are of form:
obj = {
	seek: <byte offset>
	chunk: <base64 encoded data chunk>
}
"""

import base64
import os
import sys
import json

def write_chunk(chunk, fd):
	seek = chunk["seek"]
	data = base64.b64decode(chunk["chunk"])
	os.lseek(fd, seek, os.SEEK_SET)
	os.write(fd, data)

def create_path(path):
	try:
		if not os.path.exists(path):
			os.makedirs(path, exist_ok=True)
		elif os.path.isfile(path):
			print(path + ": exists and is not a directory.")
			sys.exit(1)
	except Exception as e:
		print(e)
		sys.exit(1)

def main():
	if len(sys.argv) != 2:
		print("Invalid number of arguments.")
		sys.exit(1)
	fd = None
	path = sys.argv[1]
	parent_path = os.path.dirname(path)
	create_path(parent_path)
	try:
		fd = os.open(sys.argv[1], os.O_WRONLY | os.O_TRUNC | os.O_CREAT)
		while True:
			try:
				json_in = input()
			except EOFError:
				break
			json_list = json_in.split("\n") # need to split in case writes happen faster than reads
			for json_obj in json_list:
				obj_in = json.loads(json_obj)
				write_chunk(obj_in, fd)
	except Exception as e:
		print(e)
		os.close(fd)
		sys.exit(1)
	os.close(fd)
	sys.exit(0)

if __name__ == "__main__":
	main()
