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
Synopsis: echo <contents of file> | write-to-file.py3 <path/to/file>
"""

import sys
import os

def main():
	if len(sys.argv) != 2:
		print("Invalid number of arguments.")
		sys.exit(1)
	file_path = sys.argv[1]
	try:
		with open(file_path, "w") as f:
			for line in sys.stdin:
				f.write(line)
	except Exception as e:
		print(e)
		sys.exit(1)

if __name__ == "__main__":
	main()
