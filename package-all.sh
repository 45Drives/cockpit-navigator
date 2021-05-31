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

./package-deb.sh && ./package-el7.sh && ./package-el8.sh
