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
Synopsis: `zip-for-download.py3 </path/to/cwd> </path/to/file> [</path/to/file> ...]`
Output is JSON object with form:
{
    message: <error message if applicable>,
    archive-path: </path/to/archive>,
    stat: {
        size: <size of archive in bytes> // for setting channel max read size
    }
}
"""

import os
import sys
import json
import subprocess
from datetime import datetime

def get_relpaths(full_paths, cwd):
    response = []
    for path in full_paths:
        response.append(os.path.relpath(path, cwd))
    return response

def make_zip(path):
    try:
        cwd = sys.argv[1]
        files = get_relpaths(sys.argv[2:], cwd)
        os.chdir(cwd)
    except Exception as e:
        print(json.dumps({
            "message": e
        }))
        sys.exit(1)
    cmd = ["zip", "-ryq", path, *files]
    try:
        child = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True
        )
    except Exception as e:
        print(json.dumps({
            "message": e
        }))
        sys.exit(1)
    child.wait()
    if child.returncode:
        stdout, stderr = child.communicate()
        print(json.dumps({
            "message": stdout + stderr
        }))
        sys.exit(child.returncode)
    try:
        archive_size = os.stat(path).st_size
    except Exception as e:
        print(json.dumps({
            "message": e
        }))
        sys.exit(1)
    print(json.dumps({
        "message": "",
        "archive-path": path,
        "stat": {
            "size": archive_size
        }
    }))

def main():
    tmp_dir = "/tmp/navigator"
    if not os.path.exists(tmp_dir):
        os.mkdir(tmp_dir)
    elif not os.path.isdir(tmp_dir):
        print(json.dumps({
            "message": "Temp path already exists."
        }))
        sys.exit(1)
    archive_path = tmp_dir + "/navigator-download_" + datetime.now().strftime("%Y-%m-%d_%H-%M-%S.%f") + ".zip"
    make_zip(archive_path)
    sys.exit(0)


if __name__ == "__main__":
    main()
