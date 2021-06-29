Name: ::package_name::
Version: ::package_version::
Release: ::package_build_version::%{?dist}
Summary: ::package_description_short::
License: ::package_licence::
URL: ::package_url::
Source0: %{name}-%{version}.tar.gz
BuildArch: ::package_architecture_el::
Requires: ::package_dependencies_el::

BuildRoot: %{_tmppath}/%{name}-%{version}-%{release}-root

%description
::package_title::
::package_description_long::

%prep
%setup -q

%build
# empty

%install
make DESTDIR=%{buildroot} DIST=%{dist} install

%clean
rm -rf %{buildroot}

%files
/usr/share/cockpit/navigator/*

%changelog
* Fri Jun 18 2021 Josh Boudreau <jboudreau@45drives.com> 0.4.6-1
- Disable navigation buttons when invalid.
* Thu Jun 17 2021 Josh Boudreau <jboudreau@45drives.com> 0.4.5-1
- Fix downloading a single file when the contextmenu
  event target is not the file.
* Thu Jun 10 2021 Josh Boudreau <jboudreau@45drives.com> 0.4.4-1
- Hide download option in right click context menu when no items
  are explicitly selected.
* Tue Jun 08 2021 Josh Boudreau <jboudreau@45drives.com> 0.4.3-1
- Add sort options for list view.
- Add search bar to filter items.
- Fix file size error after upload by refreshing after write process exits.
- Fix input of tab characters and copy and pasting in file editor.
* Mon Jun 07 2021 Josh Boudreau <jboudreau@45drives.com> 0.4.2-1
- Implement list view.
- Fix opening symlinks to files for editing.
* Mon Jun 07 2021 Josh Boudreau <jboudreau@45drives.com> 0.4.1-1
- Use smaller chunk size while uploading for older versions of Cockpit.
* Mon Jun 07 2021 Josh Boudreau <jboudreau@45drives.com> 0.4.0-1
- Add icons to right click menu.
- Add ability to download files and directories.
- Show transfer rate and ETA while uploading files.
* Thu Jun 03 2021 Josh Boudreau <jboudreau@45drives.com> 0.3.0-1
- Add drag and drop uploading of files.
- Add event listeners for ctrl+a to select all, ctrl+x to cut,
  ctrl+c to copy, ctrl+v to paste, and delete to remove a file.
* Wed Jun 02 2021 Josh Boudreau <jboudreau@45drives.com> 0.2.3-1
- Fix closing contextmenu in el7.
- Hide rename in right click menu with multiple selected entries.
- Populate default link target to selected item from right click menu.
* Wed Jun 02 2021 Josh Boudreau <jboudreau@45drives.com> 0.2.2-1
- Set default value in rename prompt to current filename.
* Wed Jun 02 2021 Josh Boudreau <jboudreau@45drives.com> 0.2.1-1
- Rename "Move" to "Cut" in right click context menu.
- Improve pasting files after copying/cutting with a custom python
  script to handle checking for file conflicts before calling rsync.
- Control+S saves file that's open for editing.
- Moved renaming file from properties to right click menu with prompt.
- Creating files now fails verbosely if the destination exists.
* Tue Jun 01 2021 Josh Boudreau <jboudreau@45drives.com> 0.2.0-1
- Allow for batch editing permissions and deletion by
  holding shift or control while clicking to select multiple
  entries.
- Add custom right click menu.
* Fri May 28 2021 Josh Boudreau <jboudreau@45drives.com> 0.1.0-1
- First Build