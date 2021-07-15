#!/usr/bin/env python3

"""
    Cockpit Navigator - A File System Browser for Cockpit.
    Copyright (C) 2021 Josh Boudreau <jboudreau@45drives.com>
    Copyright (C) 2021 Sam Silver    <ssilver@45drives.com>

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

import sys
import re
import subprocess
import math
import json
from optparse import OptionParser

###############################################################################
# Name: dir_attributes
# Args: path to directory, command to run
# Desc: executes getfattr to retrive ceph dir attribute and returns as dictionary
###############################################################################


def dir_attributes(path, type, command):
    attrs = {}
    try:
        child = subprocess.Popen(
            ["getfattr", "-n", "ceph." + type + "." + command, path], stdout=subprocess.PIPE, stderr=subprocess.PIPE, universal_newlines=True)
        output_string, err = child.communicate()
    except OSError:
        print("Error executing getfattr. Is xattr installed?")
        sys.exit(1)
    if child.wait() != 0:
        if err.find("No such attribute") != -1:
            return {}
        else:
            print("Error executing getfattr. Is xattr installed?")
            sys.exit(1)
            # return {}
    fields = re.findall(
        r"^ceph\.[dir|quota]+\.([^=]+)=\"([^\"]+)\"$", output_string, re.MULTILINE)
    if len(fields) == 0:
        print(f'No ceph xattrs, is {path} in a ceph filesystem?')
        sys.exit(1)
    attrs[fields[0][0]] = fields[0][1]
    return attrs


###############################################################################
# Name: run_dir_commands
# Args: path to directory
# Desc: calls dir_attributes and quota_attrivutes multiple times each with a different command
# Retu: Returns the outputs of all commands in a dictionary
###############################################################################


def run_dir_commands(path):
    outputs = {'path':path}
    dirList = ["entries", "files", "rbytes", "rentries",
               "rfiles", "rsubdirs", "subdirs", "layout.pool"]
    quotaList = ["max_files", "max_bytes"]
    for items in dirList:
        outputs.update(dir_attributes(path, "dir", items))
    for items in quotaList:
        outputs.update(dir_attributes(path, "quota", items))

    if "rbytes" in outputs.keys():
        outputs["rbytes"] = format_bytes(int(outputs["rbytes"]))
    if "max_bytes" in outputs.keys():
        outputs["max_bytes"] = format_bytes(int(outputs["max_bytes"]))

    return outputs

###############################################################################
# Name: display_attributes
# Args: path to directory
# Desc: calls run_dir_commands and prints output
###############################################################################


def display_attributes(path):
    attrs = run_dir_commands(path)

    print(path, ":")
    max_width = len(
        max(attrs.values(), key=lambda x: len(x.split(" ")[0])).split(" ")[0])
    print("Files:                 ", "{0:>{1}}".format(
        attrs["files"], max_width) if "files" in attrs.keys() else "N/A")
    print("Directories:           ", "{0:>{1}}".format(
        attrs["subdirs"], max_width) if "subdirs" in attrs.keys() else "N/A")
    print("Recursive Files:       ", "{0:>{1}}".format(
        attrs["rfiles"], max_width) if "rfiles" in attrs.keys() else "N/A")
    print("Recursive Directories: ", "{0:>{1}}".format(
        attrs["rsubdirs"], max_width) if "rsubdirs" in attrs.keys() else "N/A")
    print("Total Size:            ", "{0:>{1}}".format(attrs["rbytes"].split(" ")[
        0], max_width) + " " + attrs["rbytes"].split(" ")[1] if "rbytes" in attrs.keys() else "N/A")
    print("Layout Pool:           ", "{0:>{1}}".format(
        attrs["layout.pool"], max_width) if "layout.pool" in attrs.keys() else "N/A")
    print("Max Files:             ", "{0:>{1}}".format(
        attrs["max_files"], max_width) if "max_files" in attrs.keys() else "        N/A")
    print("Max Bytes:                 ", "{0:>{1}}".format(
        attrs["max_bytes"], max_width) if "max_bytes" in attrs.keys() else "    N/A")
    print()

################################################################################
# Name: format_bytes
# Args: integer value in bytes
# Desc: formats size_bytes in SI base units and returns as string
################################################################################


def format_bytes(size_bytes):
    if size_bytes == 0:
        return "0 B"
    size_name = ("B", "KiB", "MiB", "GiB", "TiB", "PiB", "EiB", "ZiB", "YiB")
    i = int(math.floor(math.log(size_bytes, 1024)))
    p = math.pow(1024, i)
    s = round(size_bytes / p, 2)
    return "%s %s" % (s, size_name[i])

###############################################################################
# Name: main (cephfs-dir-stats)
# Args: (see parser)
# Desc: lists recursive ceph stats of specified directory
###############################################################################


def main():
    parser = OptionParser()
    parser.add_option("-j", "--json", help="output stats in JSON format.", action="store_true", dest="json", default=False)
    (options, args) = parser.parse_args()
    if len(args) == 0:
        args = ["."]
    if(options.json):
        obj = []
        for arg in args:
            obj.append(run_dir_commands(arg))
        obj = json.dumps(obj)
        print(obj)
    else:
        for arg in args:
            display_attributes(arg)


if __name__ == "__main__":
    main()
