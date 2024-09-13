
# Deploying **cold** and **cold_admin**

Deploying cold and and cold admin on a remote system requires manual setup.  You will need the following software to successfully build and deploy.

- Deno >= 1.45.5
- Dataset >= 2.1.17
- Pandoc >= 3.1
- GNU Make
- Git
- Tmux highly recommended
- eLinks or Lynx recommended (to test form the console)

## Deployment steps

My current recommendation is the following.

1. Setup the directory to old he web application if it doesn't exist.
2. Clone the repository **recursively** to `/Sites/cold`
3. Run `make` to build the binary for the cold service
5. Copy `cold.service-example` to `cold.service`, edit it and move it appropirate place in your Systemd service directory
6. Symbolicly link `cold.service` to `/etc/systemd/system/`
7. Edit the service file and make the paths are correct.
8. Change into the "admin" directory (i.e. the `cold_admin` repo)
9. Run `make` to build the binaries for cold admin
10. Copy `cold_admin.service-example` to `cold_admin.service`
11. Edit the service file and make the paths are correct.
12. Symbolicly link `cold_admin.service` to `/etc/systemd/system/`
13. Copy `cold_admin_api.service-example` to `cold_admin_api.service`
14. Edit the service file and make the paths are correct.
15. Symbolicly link `cold_admin_api.service` to `/etc/systemd/system/`
16. Reload the systemd daemon, `sudo systemctl daemon-reload`
17. Enable the services (only needed the first time, may return a warning about symbolic link)
    a. `sudo systemctl enable cold.service`
    b. `sudo systemctl enable cold_admin.service`
    c. `sudo systemctl enable cold_admin_api.service`
18. Start the services using `systemctl` in the usual way
    a. `sudo systemctl start cold.service`
    b. `sudo systemctl start cold_admin.service`
    c. `sudo systemctl start cold_admin_api.service`
19. In the admin directory use the Deno task setup to create your dataset collections
20. Test the public and admin services using elinks. If you get a gateway error it means datasetd isn't runining correctly in port 8112. Debug with curl, systemctl status, journalctl.

You can configure Apache to reverse proxy to the cold service running on port 8110 allowing public access. Apache should
be configured similar but with access restricted to staff for the cold_admin service running on port 8111.

For a good description of how to setup new systemd services the Debian (works with Ubuntu too) way see <https://wiki.debian.org/systemd/Services>.

Here's an example of the shell session based on the above list. I'm assuming the user/group you're running things under is "www-data".

~~~shell
ssh apps.example.edu
sudo mkdir -p /Sites/
sudo chgrp www-data /Sites/
sudo chmod 775 /Sites/
cd /Sites
git clone --recursive git@github.com:caltechlibrary/cold
cd cold
make
cp cold.service-example cold.service
nano cold.service
sudo ln cold.service /etc/systemd/system/
cd admin
cp cold_admin.service-example cold_admin.service
naon cold_admin.service
sudo ln cold_admin.service /etc/systemd/system/
cp cold_admin_api.service-example cold_admin_api.service
sudo ln cold_admin_api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable cold.service
sudo systemctl enable cold_admin.service
sudo systemctl enable cold_admin_api.service
sudo systemctl start cold.service
sudo systemctl start cold_admin.service
sudo systemctl start cold_admin_api.service
deno task setup
elinks http://localhost:8110
elinks http://localhost:8111
~~~

NOTE: The TypeScript services need to be compile before running with Systemd.
