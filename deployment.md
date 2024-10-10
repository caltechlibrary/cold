
# Deploying **cold**

Deploying cold on a remote system requires manual setup.  You will need the following software to successfully build and deploy.

- Deno >= 2.0
- Dataset >= 2.1.21
- Pandoc >= 3.1
- GNU Make
- Git
- Tmux highly recommended
- eLinks or Lynx recommended (to test form the console)

## Deployment steps

My current recommendation is the following.

1. Setup the directory to hold he web application if it doesn't exist.
2. Clone the repository, e.g. clone to `/Sites/cold` and change into the repository directory
3. Run `make` to build the binary for the cold service
5. Copy `cold.service-example` to `cold.service`, edit it and move it appropirate place in your Systemd service directory
6. Symbolicly link `cold.service` to `/etc/systemd/system/`
7. Edit the service file and make the paths are correct.
8. Reload the systemd daemon, `sudo systemctl daemon-reload`
9. Enable the services (only needed the first time, may return a warning about symbolic link)
    a. `sudo systemctl enable cold.service`
    b. `sudo systemctl enable cold_api.service`
10. Start the services using `systemctl` in the usual way
    a. `sudo systemctl start cold.service`
    b. `sudo systemctl start cold_api.service`
11. Test web services using elinks. If you get a gateway error it means datasetd isn't runining correctly in port 8111. Debug with curl, systemctl status, journalctl.

You can configure Apache to reverse proxy to the cold service running on port 8111 where it should enforce access control.

For a good description of how to setup new systemd services the Debian (works with Ubuntu too) way see <https://wiki.debian.org/systemd/Services>.

Here's an example of the shell session based on the above list. I'm assuming the user/group you're running things under is "www-data".

~~~shell
ssh apps.example.edu
sudo mkdir -p /Sites/
sudo chgrp www-data /Sites/
sudo chmod 775 /Sites/
cd /Sites
git clone git@github.com:caltechlibrary/cold
cd cold
make
deno task setup
cp cold.service-example cold.service
nano cold.service
sudo ln cold.service /etc/systemd/system/
cp cold_api.service-example cold_api.service
nano cold_api.service
sudo ln cold_api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable cold.service
sudo systemctl enable cold_api.service
sudo systemctl start cold.service
sudo systemctl start cold_api.service
elinks http://localhost:8111
~~~

NOTE: The TypeScript services need to be compile before running them with Systemd.

## Apache 2 and Shibboleth

**COLD** is designed to be a reverse proxy target. Using Apache you need to to include the following code in the main host definition.

~~~
#<!-- cold -->
ProxyPreserveHost On
Redirect "/cold" "/cold/"
ProxyPassMatch "^/cold/(.*)" "http://localhost:8111/$1"
ProxyPassReverse "/cold/" "http://localhost:8111/"
#<!-- cold admin -->
<Location /cold/>
  AuthType shibboleth
  ShibRequestSetting requireSession 1
  require user rsdoiel@caltech.edu sdavison@caltech.edu tmorrell@caltech.edu tkeswick@caltech.edu kjohnson@caltech.edu melray@library.caltech.edu
  #require valid-user
</Location>
#<!-- end cold -->
~~~
