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
Synopsys: return-exists.py3 /full/path1 [/full/path2 ...]
replys with JSON formatted dictionary of path : boolean where true means the file exists
"""

import os
import sys
import json

def main():
    argv = sys.argv
    argc = len(sys.argv)
    if argc <= 1:
        print("No arguments provided")
        sys.exit(1)
    response = {}
    for i in range (1, argc):
        path = argv[i]
        response[path] = os.path.lexists(path)
    print(json.dumps(response))
    sys.exit(0)


if __name__ == "__main__":
    main()