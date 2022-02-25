/etc examples
-------------

This directory holds example configuration for **cold**, and example
service files for running **cold** under systemd (e.g. Ubuntu 20.04 LTS) or
launchd (e.g. macOS Monterey). What is missing is an Apache2 configuration. Normally **cold** is running behind a front end web server like Apache2 or NginX. Either front end web server needs to provide an authentication/authorization machanism like Shibboleth or BasicAuth to controll access. The front end web server should then "reverse proxy" to the **cold** service. 


