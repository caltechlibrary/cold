Installation of **cold**
========================

**cold** is experimental software for managing controlled object lists and providing static vocabularies. It provides a JSON API for managing the objects via PostgreSQL and PostgREST. A human user interface is built via static HTML, CSS and JavaScript as well as with Pandoc templates processed via Pandoc in server mode. The means installing **cold** is more than installing the **cold** binary and a `settings.json` file. 

**cold** is intended to run behind a front facing web server (e.g. Apache 2 or NginX) that access control and authentication. This can be configured in Apache 2 or NginX by use of Shibboleth or BasicAuth.  An example apache2 configuration block is included in the source repository for **cold**. It will require adaptation to your specific web server configuration.

**cold** requires access to a PostgreSQL 14 through PostgREST 10. Both need to be configured. Template rendering is provided by Pandoc running in server mode.  Installation, setup of user accounts and creating databases is beyond the scope of this documentation but is require to have a working cold instance.

You will need to build **cold** for your specific system configuration.  You need to rebuild the static web content (very likely) you'll need to have Git, GNU Make, Pandoc 3 and available and working on your system.

Building the required software
------------------------------

Currently Pandoc 2 ships with many package systems (e.g. Ubuntu 22.04 LTS). **cold** requires Pandoc 3. Likewise PostgREST isn't found in some package
management systems at all.

The example installation documentation below assumes that you have the
**cold** repository cloned into `/usr/local/src`, that the configuration file
is in `/usr/local/etc/cold/settings.json` and the htdocs documentation directory
is in `/usr/local/src/cold/htdocs`.

Required software
-----------------

Adjusting the web content to your host system requires the following

1. Git (to clone the cold repository on GitHub)
2. Golang version 1.18 or better
3. Pandoc
4. MkPage (available from https://github.com/caltechlibrary/mkpage)
5. GNU Make
6. Python 3

Installation steps
------------------

1. Create necessary directories if needed.
2. Change `/usr/local/src/` and make sure you have permissions to write to that directory
3. Clone https://github.com/caltechlibrary/cold
4. Change into the `cold` directory
5. Run GNU Make
6. copy the `cold` binary to `/usr/local/bin/`
7. Make a directory `/usr/local/etc/cold`
8. Create `/usr/local/etc/cold/settings.json` and configure for your local setup
9. Copy the systemd service into place for your system
10. Start up cold service using `systemctl` and verify everything works

Here's an example of the steps I've taken. Note my user account has write and
and execute permissions for `/usr/local/bin`, `/usr/local/etc` and `/usr/local/src`.

```
mkdir -p /usr/local/src
mkdir -p /usr/local/etc/cold
mkdir -p /usr/local/bin
cd /usr/lcoal/src
git clone https://github.com/caltechlibrary/cold cold
cd cold
make clean &&  make
cp bin/cold /usr/local/bin/
cp etc/setttings.json-example /usr/local/etc/cold/settings.json
nano /usr/local/etc/cold/settings.json
cp etc/systemd/cold.service /etc/systemd/system/
systemctl start cold
```

You can review the logs for **cold** using the `journalctl -u cold.service` command.

Example settings.json
---------------------

```
{
    "dsn": "DB_USER_NAME_HERE:SECRET_GOES_HERE@/cold",
    "hostname": "localhost:8486",
    "htdocs": "/usr/local/src/cold/htdocs",
    "prefix_path": "/cold",
    "disable_root_redirects": false
}
```

Apache 2 Setup
--------------

**cold** is intended to run on localhost and relies on a front-end web server like Apache 2 for authentication and authorization via reverse proxy setup (see https://httpd.apache.org/docs/2.4/howto/reverse_proxy.html).

Example configuration block for an Apache 2 virtual host configuration.

```
#
# NOTE: This following would go inside the Virtual host block of an Apache
# configuration file.  It assumes the cold deamon was configued with a
# prefix path of "/cold".
#

#
# Reverse proxy the cold service
#
Redirect /cold /cold/
ProxyPass "/cold/" "http://localhost:8486/cold/"
ProxyPassReverse "/cold/" "http://localhost:8486/cold/"
#
# Use Basic Auth for development purposes
#
<Location /cold>
    AuthType Basic
    AuthName "Cold DEV"
    AuthBasicProvider file
    AuthUserFile "/usr/local/etc/cold/passwords.txt"
    Require valid-user
</Location>
#
# Used to enable Shibboleth
#<Location /cold>
#	AuthType shibboleth
#	ShibRequestSetting requireSession 1
#	require valid-user
#</Location>
#
```


