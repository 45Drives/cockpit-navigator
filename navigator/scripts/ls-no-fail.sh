#!/usr/bin/env bash

ls -lL "$1"

if [[ "$?" != "2" ]]; then
    exit 0
fi
exit 1