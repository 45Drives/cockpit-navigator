#!/usr/bin/env python3

import os
import json
import sys

def main():
    if(len(sys.argv) < 2):
        sys.exit(1)
    try:
        nodes = os.listdir(sys.argv[1])
    except:
        print("No such file or directory")
        sys.exit(1)
    response = []
    for node in nodes:
        response.append({"filename": node, "isdir": os.path.isdir(sys.argv[1] + "/" + node)})
    print(json.dumps(response, indent=4))


if __name__ == "__main__":
    main()
