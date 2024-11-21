
# Deploying **cold**

Deploying cold on a remote system requires manual setup.  You will need the following software to successfully build and deploy.

- Deno >= 2.0.6 (for compiling COLD)
- Dataset >= 2.1.23
- Pandoc >= 3.1
- GNU Make
- Git
- Tmux highly recommended
- eLinks or Lynx recommended (to test form the console)

## Deployment steps

My current recommendation is the following.

1. Setup the directory to hold he web application if it doesn't exist.
2. Clone the repository, e.g. clone to `/Sites/cold` and change into the repository directory
3. Run Deno tasks `setup` (if the collections don't exist) and `build` to build the binary for the cold service
5. Copy `cold.service-example` to `cold.service`, edit it and move to `/etc/systemd/system/`
6. Copy `cold_api.service-example` to `cold_api.service`, edit it and and move to `/etc/systemd/system/`
7. Reload the systemd daemon, `sudo systemctl daemon-reload`
8. Enable the services (only needed the first time, may return a warning about symbolic link)
    a. `sudo systemctl enable cold.service`
    b. `sudo systemctl enable cold_api.service`
9. Start the services using `systemctl` in the usual way
    a. `sudo systemctl start cold.service`
    b. `sudo systemctl start cold_api.service`
10. Test web services using eLinks. If you get a gateway error it means datasetd isn't running correctly in port 8111. Debug with curl, systemctl status, journalctl.

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
deno task setup
deno task build
cp cold.service-example cold.service
nano cold.service
sudo mv cold.service /etc/systemd/system/
cp cold_api.service-example cold_api.service
nano cold_api.service
sudo mv cold_api.service /etc/systemd/system/
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


## Example data migration from spreadsheets for CaltechPEOPLE

This is a note for migrating data from our historic spreadsheet for CaltechPEOPLE. Once cold is installed and you've created the empty
dataset collections (e.g. people.ds) you can use two tools to populate the collection and set the `include_in_feeds` property.

Steps:

1. Set the environment variable FEEDS_BASE_DIR to point to where feeds staging is deployed.
2. Copy people.csv and groups.csv from feeds.library.caltech.edu and save then as `people_final.csv` and `groups_final.csv`.  Copy edit the files if necessary (e.g. remove duplicate rows)
3. Copy the directory names for people on feeds.library.caltech.edu and render this as a [single CSV column](in_feeds.csv-example) with the heading `clpid`.
4. Clear test data from `people.ds` with SQLite3 cli.
5. Run `ds_importer`
6. Run `set_include_in_feeds`

~~~shell
FEEDS_BASE_DIR="/Sites/feeds"
scp "library.example.edu:$FEEDS_BASE_DIR/people.csv" people_final.csv
echo "clpid" >in_feeds.csv
ssh library.example.edu "ls -1 -d $FEEDS_BASE_DIR/htdocs/people/* | cut -d / -f 6" >>in_feeds.csv
./bin/ds_importer people.ds people_final.csv
./bin/set_include_in_feeds people.ds in_feeds.csv
~~~
