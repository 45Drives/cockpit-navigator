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

from functools import partial
import os, shutil, errno, re
import sys
from optparse import OptionParser
import json

def copy_metadata_wrapper(copy_func):
	def wrapper(src, dst, *args, **kwargs):
		stat = None
		try:
			stat = os.stat(src, follow_symlinks=False)
		except:
			pass
		copy_func(src, dst, *args, **kwargs)
		try:
			if stat:
				os.chown(dst, stat.st_uid, stat.st_gid)
				os.chmod(dst, stat.st_mode)
		except:
			pass
	return wrapper

class File:
	def __init__(self, path, cwd, dest_path):
		self.src = path
		self.dst = dest_path + "/" + os.path.relpath(path, cwd)

	def __str__(self):
		return self.src + " -> " + self.dst
	
	def __repr__(self):
		return "File(" + self.__str__() + ")"
	
	def check_if_exists(self):
		return os.path.exists(self.dst)

	def move(self):
		if self.check_if_exists(): # for overwriting
			os.remove(self.dst)
		if not os.path.exists(os.path.dirname(self.dst)):
			os.makedirs(os.path.dirname(self.dst))
		shutil.move(self.src, self.dst, copy_function=partial(copy_metadata_wrapper(shutil.copy2), follow_symlinks=False))
	
	def copy(self):
		if self.check_if_exists(): # for overwriting
			os.remove(self.dst)
		if not os.path.exists(os.path.dirname(self.dst)):
			os.makedirs(os.path.dirname(self.dst))
		copy_metadata_wrapper(shutil.copy2)(self.src, self.dst, follow_symlinks=False)


def prompt_user(message, wants_response, conflicts = None, choices = None, detail = None):
	payload = {
		"wants-response": wants_response,
		"message": message
	}
	if conflicts != None:
		payload["conflicts"] = conflicts
	if choices != None:
		payload["choices"] = choices
	if detail != None:
		payload["detail"] = detail
	print(json.dumps(payload) + "\n")
	if wants_response:
		response = json.loads(input())
		if isinstance(response, str) and response == "abort":
			sys.exit(0)
		return response
	return

def get_conflicts(files):
	conflicts = []
	non_conflicts = []
	for file in files:
		if file.check_if_exists():
			conflicts.append(file)
		else:
			non_conflicts.append(file)
	return (conflicts, non_conflicts)

def filter_existing(files):
	(conflicts, non_conflicts) = get_conflicts(files)
	if len(conflicts):
		choice = prompt_user("Conflicts Found", True, choices=[("skip-conflicts", "Skip Conflicts"), ("rename", "Append Number to Conflicting Names"), ("select", "Overwrite Selectively"), ("overwrite", "Overwrite All")])
		if choice == "overwrite":
			non_conflicts.extend(conflicts)
		elif choice == "select":
			prompts = list(map(lambda f: [f.src, f.dst], conflicts)) # get list of [src, dst]
			keeper_lut = prompt_user("Overwrite?", True, conflicts=prompts) # returns dict of srcs : keep (bool)
			non_conflicts.extend(filter(lambda f: keeper_lut[f.src], conflicts))
		elif choice == "rename":
			for conflict in conflicts:
				num = 1
				conflict.dst = "(1)".join(os.path.splitext(conflict.dst))
				while conflict.check_if_exists():
					num += 1
					conflict.dst = re.sub(r'\(\d+\)(?=(\.[^(]+)?$)', f"({num})", conflict.dst)
			non_conflicts.extend(conflicts)
		elif choice == "skip-conflicts":
			pass
		else: # cancelled
			sys.exit(0)
		
	return non_conflicts

def recursive_get_files(cwd, dest_path, source_directory):
	files = []
	directories_to_remove = []
	for entry in os.listdir(source_directory):
		path = source_directory + "/" + entry
		if os.path.isdir(path):
			(new_files, new_directories) = recursive_get_files(cwd, dest_path, path)
			files.extend(new_files)
			directories_to_remove.extend(new_directories)
			directories_to_remove.append(path)
		else:
			files.append(File(path, cwd, dest_path))
	return (files, directories_to_remove)

def main():
	parser = OptionParser()
	parser.add_option("-m", "--move", help="remove source files", action="store_true", dest="move", default=False)
	(options, args) = parser.parse_args()
	cwd = args[0]
	sources = args[1:-1]
	dest_path = args[-1]
	files = []
	directories_to_remove = []
	for source_path in sources:
		if os.path.isdir(source_path):
			(new_files, new_directories) = recursive_get_files(cwd, dest_path, source_path)
			files.extend(new_files)
			directories_to_remove.extend(new_directories)
			directories_to_remove.append(source_path)
		elif os.path.exists(source_path):
			files.append(File(source_path, cwd, dest_path))
	if options.move:
		files = filter(lambda f: f.src != f.dst, files)
	files = filter_existing(files)
	if not len(files):
		sys.exit(0) # exit if nothing to copy
	if options.move:
		for file in files:
			try:
				file.move()
			except Exception as e:
				prompt_user("Failed to move " + os.path.relpath(file.src, cwd), wants_response=False, detail=str(e))
		for directory in directories_to_remove:
			try:
				os.rmdir(directory)
			except OSError as e:
				if e.errno == errno.ENOTEMPTY:
					pass # skip deletion
				else:
					prompt_user("Failed to remove directory " + directory, wants_response=False, detail=str(e))
			except Exception as e:
				prompt_user("Failed to remove directory " + directory, wants_response=False, detail=str(e))
	else:
		for file in files:
			try:
				file.copy()
			except Exception as e:
				prompt_user("Failed to copy " + os.path.relpath(file.src, cwd), wants_response=False, detail=str(e))
	sys.exit(0)
	

if __name__ == "__main__":
	main()
