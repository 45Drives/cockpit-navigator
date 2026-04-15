#!/usr/bin/env python3

from pathlib import Path
import argparse
import sys

CHUNK_SIZE = 1024 * 1024

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("output", type=Path)

    args = parser.parse_args()

    output = args.output

    output.parent.mkdir(parents=True, exist_ok=True)

    bytes_received = 0

    with output.open("wb") as f:
        while True:
            chunk = sys.stdin.buffer.read(CHUNK_SIZE)
            if len(chunk) == 0:
                break
            bytes_received += len(chunk)
            print(f"{bytes_received}", flush=True)
            f.write(chunk)


if __name__ == "__main__":
    main()
