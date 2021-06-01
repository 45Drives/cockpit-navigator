Name:           cockpit-navigator
Version:        0.2.0
Release:        1%{?dist}
Summary:        A File System Browser for Cockpit.
License:        GPL-3.0+
URL:            github.com/45drives/cockpit-navigator/blob/main/README.md
Source0:        %{name}-%{version}.tar.gz
BuildArch:      noarch
Requires:       cockpit python3

BuildRoot: %{_tmppath}/%{name}-%{version}-%{release}-root

%description
Cockpit Navigator
A File System Browser for Cockpit.

%prep
%setup -q

%build
# empty

%install
rm -rf %{buildroot}
mkdir -p  %{buildroot}
cp -a * %{buildroot}

%clean
rm -rf %{buildroot}

%files
/usr/share/cockpit/navigator/*

%changelog
* Tue Jun 01 2021 Josh Boudreau <jboudreau@45drives.com> 0.2.0-1
- Allow for batch editing permissions and deletion by
  holding shift or control while clicking to select multiple
  entries.
* Fri May 28 2021 Josh Boudreau <jboudreau@45drives.com> 0.1.0-1
- First Build
