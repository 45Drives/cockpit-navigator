#!/usr/bin/env python3

import os
from stat import S_ISDIR, filemode
import json
import sys
from pwd import getpwuid
from grp import getgrgid

def get_stat(full_path, filename = '/'):
    stats = os.lstat(full_path)
    isdir = False
    try:
        isdir = S_ISDIR(os.stat(full_path).st_mode)
    except OSError:
        pass
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
    response = {
        "filename": filename,
        "isdir": isdir,
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
        }
    }
    return response

def main():
    if(len(sys.argv) < 2):
        sys.exit(1)
    try:
        nodes = os.listdir(sys.argv[1])
    except:
        print("No such file or directory")
        sys.exit(1)
    response = {
        ".": get_stat(sys.argv[1]),
        "children": []
    }
    for node in nodes:
        full_path = sys.argv[1] + "/" + node
        response["children"].append(get_stat(full_path, node))
    print(json.dumps(response))


if __name__ == "__main__":
    main()
