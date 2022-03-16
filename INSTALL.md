Installation of **cold**
========================

**cold** is experimental software for managing controlled object lists and providing static vocabularies. It provides a JSON API for managing the objects as wel as a human user interface via static web pages using web components to wrap the JSON API and make it useful. Not **cold** does NOT manage access. Authentication and authorization is deferred to a front end web server like Apache 2 or NginX via mechanisms like Shibboleth or BasicAuth.  The setup and configuration of Apache 2 or NginX is beyond the scope of this installation instructions. These instructions only cover installation, configuration and setup to run as a service via systemd or launchd depending on your operating system.

Additionally **cold** relies on a working MySQL 8 setup with permissions for the cold user to create/manage the cold tables for managing objects. Installation, setup of user accounts and creating databases is beyond the scope of this documentation.

Required software
-----------------

Adjusting the web content to your host system requires the following

1. Golang version 1.18 or better
2. Pandoc
3. MkPage
4. Python 3
5. GNU Make

Compiling **cold** requires Golang 1.18 or better (you need to recompile the daemon if you change the static vocabularies provided).

This is experimental software the installation suggested should be adjusted based on your own system needs.

1. Download the most recent release of [cold](https://github.com/caltechlibrary/cold/releases)
	a. pre-compiled versions are supplied for Linux, macOS and Windows
	b. download the specific version for your OS and machine type (e.g. amd62 versys arm64)
2. Unzip the downloaded archive in a suitable location (e.g. /usr/local/src/cold-release)
3. Change directory into where you've placed the downloaded release
4. Copy the contents of `bin` to `/usr/local/bin/` (make sure `/usr/local/bin` is in your path)
5. Copy the contents of `etc` to `/usr/local/etc`
6. Symbolically link or copy the plist or .service file into the appropriate folder for use with `launchd` or `systemd` depending on the host system
7. Update `/usr/local/etc/cold/settings.json` to match your system
8. Load the schema into MySQL 8's cold data base (see `schema/*.sql`)
9. Start service and test with cURL and your web browser

