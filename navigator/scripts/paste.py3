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
Synopsis: `paste.py3 [-m] <cwd of copy> <list of source files> <destination directory>`
all full paths
"""

import os
import sys
from optparse import OptionParser
import json
import subprocess

def prompt_user(message, wants_response, conflicts = None):
    payload = {
        "wants-response": wants_response,
        "message": message
    }
    if conflicts != None:
        payload["conflicts"] = conflicts
    print(json.dumps(payload) + "\n")
    if wants_response:
        response = json.loads(input())
        if isinstance(response, str) and response == "abort":
            sys.exit(0)
        return response
    return

def split_paths_at_cwd(paths, cwd):
    response = []
    for path in paths:
        response.append(cwd + "/./" + os.path.relpath(path, cwd))
    return response

def recursive_get_conflicts(input_array, cwd, dest):
    conflicts = []
    non_conflicts = []
    for source in input_array:
        if os.path.isdir(source):
            child_nodes = os.listdir(source)
            child_paths = []
            for node in child_nodes:
                child_paths.append(source + "/" + node)
            (more_conflicts, more_non_conflicts) = recursive_get_conflicts(child_paths, cwd, dest)
            conflicts += more_conflicts
            non_conflicts += more_non_conflicts
            continue
        dest_path = dest + "/" + os.path.relpath(source, cwd)
        if os.path.exists(dest_path):
            conflicts.append((source, dest_path))
        else:
            non_conflicts.append(source)
    return (conflicts, non_conflicts)

def filter_existing(args, cwd):
    sources = args[:-1]
    dest = args[-1]
    (conflicts, non_conflicts) = recursive_get_conflicts(sources, cwd, dest)
    if len(conflicts):
        conflicts = prompt_user("Overwrite?", True, conflicts)
        non_conflicts.extend(conflicts)
    if not len(non_conflicts):
        sys.exit(0) # exit if nothing to copy
    filtered_args = [*split_paths_at_cwd(non_conflicts, cwd), dest]
    return filtered_args

def paste(cmd, args):
    try:
        child = subprocess.Popen(
            [*cmd, *args],
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True
        )
    except Exception as e:
        prompt_user(str(e), False)
        sys.exit(1)
    child.wait()
    if child.returncode:
        stdout, stderr = child.communicate()
        prompt_user(stdout + stderr, False)
    sys.exit(child.returncode)


def main():
    parser = OptionParser()
    parser.add_option("-m", "--move", help="remove source files", action="store_true", dest="move", default=False)
    (options, args) = parser.parse_args()
    cwd = args[0]
    filtered_args = filter_existing(args[1:], cwd)
    if options.move:
        paste(["rsync", "-aI", "--relative", "--remove-source-files"], filtered_args)
    else:
        paste(["rsync", "-aI", "--relative"], filtered_args)
    sys.exit(0)
    

if __name__ == "__main__":
    main()