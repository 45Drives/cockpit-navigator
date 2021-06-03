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

import os
import sys

if os.path.exists(sys.argv[1]):
    sys.exit(1)

sys.exit(0)
