default:
	

all: default

install:
	mkdir -p $(DESTDIR)/usr/share/cockpit/
	cp -rpf navigator $(DESTDIR)/usr/share/cockpit

uninstall:
	rm -rf $(DESTDIR)/usr/share/cockpit/samba-manager

install-local:
	mkdir -p $(HOME)/.local/share/cockpit
	cp -rpf navigator $(HOME)/.local/share/cockpit
	sed -i "s#\"/usr/share/\(cockpit/navigator/scripts/.*\)\"#\"$(HOME)/.local/share/\1\"#g" $(HOME)/.local/share/cockpit/navigator/navigator.js

make uninstall-local:
	rm -rf $(HOME)/.local/share/cockpit/navigator
