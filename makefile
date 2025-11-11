# Cockpit Navigator - A File System Browser for Cockpit.
# Copyright (C) 2021 Josh Boudreau <jboudreau@45drives.com>

# This file is part of Cockpit Navigator.
# Cockpit Navigator is free software: you can redistribute it and/or modify
# it under the terms of the GNU General Public License as published by
# the Free Software Foundation, either version 3 of the License, or
# (at your option) any later version.
# Cockpit Navigator is distributed in the hope that it will be useful,
# but WITHOUT ANY WARRANTY; without even the implied warranty of
# MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
# GNU General Public License for more details.
# You should have received a copy of the GNU General Public License
# along with Cockpit Navigator.  If not, see <https://www.gnu.org/licenses/>.

EL7_DIST=.el7

default:
	

all: default

install:
	mkdir -p $(DESTDIR)/usr/share/cockpit/
	cp -rpf navigator $(DESTDIR)/usr/share/cockpit
ifeq ($(DIST),$(EL7_DIST))
	sed -i "s/pf-c-button/btn/g;s/pf-m-primary/btn-primary/g;s/pf-m-secondary/btn-default/g;s/pf-m-danger/btn-danger/g" $(DESTDIR)/usr/share/cockpit/navigator/index.html
	sed -i "s/pf-c-button/btn/g;s/pf-m-primary/btn-primary/g;s/pf-m-secondary/btn-default/g;s/pf-m-danger/btn-danger/g" $(DESTDIR)/usr/share/cockpit/navigator/components/ModalPrompt.js
endif
ifneq ($(NAV_VERS),)
	echo "export let NAVIGATOR_VERSION = \"$(NAV_VERS)\";" > $(DESTDIR)/usr/share/cockpit/navigator/version.js
endif

uninstall:
	rm -rf $(DESTDIR)/usr/share/cockpit/navigator

install-local:
	mkdir -p $(HOME)/.local/share/cockpit
	cp -rpf navigator $(HOME)/.local/share/cockpit
	find $(HOME)/.local/share/cockpit/navigator -name '*.js' -exec sed -i "s#\"/usr/share/\(cockpit/navigator/scripts/.*\)\"#\"$(HOME)/.local/share/\1\"#g" {} \;
ifneq ($(NAV_VERS),)
	echo "export let NAVIGATOR_VERSION = \"$(NAV_VERS)\";" > $(HOME)/.local/share/cockpit/navigator/version.js
endif

uninstall-local:
	rm -rf $(HOME)/.local/share/cockpit/navigator
# Remote install defaults
REMOTE_HOST ?= 192.168.123.5
REMOTE_USER ?= root
# Where navigator lands on the remote
REMOTE_PREFIX ?= /root/.local/share/cockpit
REMOTE_DESTDIR ?= $(DESTDIR)
# Restart cockpit on remote after install (1=yes)
RESTART_COCKPIT ?= 0
# Tools
SSH := ssh $(REMOTE_USER)@$(REMOTE_HOST)
RSYNC := rsync -aH

# Remote install (uses ssh + rsync)
install-remote:
	@echo "Installing to $(REMOTE_USER)@$(REMOTE_HOST):$(REMOTE_DESTDIR)$(REMOTE_PREFIX)"
	$(SSH) "mkdir -p $(REMOTE_DESTDIR)$(REMOTE_PREFIX)"
	$(RSYNC) navigator $(REMOTE_USER)@$(REMOTE_HOST):$(REMOTE_DESTDIR)$(REMOTE_PREFIX)/
ifeq ($(DIST),$(EL7_DIST))
	$(SSH) "sed -i 's/pf-c-button/btn/g;s/pf-m-primary/btn-primary/g;s/pf-m-secondary/btn-default/g;s/pf-m-danger/btn-danger/g' $(REMOTE_DESTDIR)$(REMOTE_PREFIX)/navigator/index.html"
	$(SSH) "sed -i 's/pf-c-button/btn/g;s/pf-m-primary/btn-primary/g;s/pf-m-secondary/btn-default/g;s/pf-m-danger/btn-danger/g' $(REMOTE_DESTDIR)$(REMOTE_PREFIX)/navigator/components/ModalPrompt.js"
endif
	$(SSH) "find \$$HOME/.local/share/cockpit/navigator -name '*.js' -exec sed -i 's#\"/usr/share/\(cockpit/navigator/scripts/.*\)\"#\"'\$$HOME'/.local/share/\1\"#g' {} \;"
ifneq ($(NAV_VERS),)
	$(SSH) "printf '%s\n' 'export let NAVIGATOR_VERSION = \"$(NAV_VERS)\";' > $(REMOTE_DESTDIR)$(REMOTE_PREFIX)/navigator/version.js"
endif
ifeq ($(RESTART_COCKPIT),1)
	$(SSH) "systemctl stop cockpit.socket || true; systemctl start cockpit.socket || true"
endif

# Optional convenience target
uninstall-remote:
	$(SSH) "rm -rf $(REMOTE_DESTDIR)$(REMOTE_PREFIX)/navigator"
