#!/usr/bin/env bash

#    Copyright (C) 2021 Joshua Boudreau <jboudreau@45drives.com>
#    
#    This file is part of Cockpit Navigator.
# 
#    Cockpit Navigator is free software: you can redistribute it and/or modify
#    it under the terms of the GNU General Public License as published by
#    the Free Software Foundation, either version 3 of the License, or
#    (at your option) any later version.
# 
#    Cockpit Navigator is distributed in the hope that it will be useful,
#    but WITHOUT ANY WARRANTY; without even the implied warranty of
#    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
#    GNU General Public License for more details.
# 
#    You should have received a copy of the GNU General Public License
#    along with Cockpit Navigator.  If not, see <https://www.gnu.org/licenses/>.

if [[ "$#" == 1 && "$1" == "clean" ]]; then
	rm -rf dist/tmp
	rm -rf dist/el8
	exit 0
fi

command -v docker > /dev/null 2>&1 || {
	echo "Please install docker.";
	exit 1;
}

# if docker image DNE, build it
if [[ "$(docker images -q cockpit-navigator-el8-builder 2> /dev/null)" == "" ]]; then
	docker build -t cockpit-navigator-el8-builder - < docker/el8
	res=$?
	if [ $res -ne 0 ]; then
		echo "Building docker image failed."
		exit $res
	fi
fi

mkdir -p dist/{el8,tmp}

SOURCE_DIR_NAME=cockpit-navigator-$(grep Version el/cockpit-navigator.spec --color=never | awk '{print $2}')
SOURCE_DIR=dist/tmp/$SOURCE_DIR_NAME
mkdir -p $SOURCE_DIR

make DESTDIR=$SOURCE_DIR install

pushd $SOURCE_DIR/..
tar -czvf $SOURCE_DIR_NAME.tar.gz $SOURCE_DIR_NAME
popd

# build rpm from source tar and place it dist/el8 by mirroring dist/el8 to rpmbuild/RPMS
docker run -u $(id -u):$(id -g) -w /home/rpm/rpmbuild -it -v$(pwd)/dist/tmp:/home/rpm/rpmbuild/SOURCES -v$(pwd)/dist/el8:/home/rpm/rpmbuild/RPMS -v$(pwd)/el:/home/rpm/rpmbuild/SPECS --rm cockpit-navigator-el8-builder rpmbuild -ba SPECS/cockpit-navigator.spec
res=$?
if [ $res -ne 0 ]; then
	echo "Packaging failed."
	exit $res
fi

rm -rf dist/tmp

echo "rpm is in dist/el8/"

exit 0
