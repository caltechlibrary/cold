
# Deploying **cold**

Deploying cold on a remote system requires manual setup.  You will need the following software to successfully build and deploy.

- Deno >= 2.8.2 (for compiling COLD; browser-module bundling uses `deno bundle`)
- Dataset >= 2.5.1
- Pandoc >= 3.1 (for `installer.sh`/`installer.ps1` and the man pages)
- GNU Make
- Git
- Tmux highly recommended
- eLinks or Lynx recommended (to test from the console)

**CMTools is not required to deploy.** It used to be listed here, and that has
been wrong since `version.ts` and `CITATION.cff` moved out of the `build`
target into `release`. `cmt` is now needed only when cutting a release, which
happens on the maintainer's own machine — see the comment above `release:` in
the `Makefile`. A deployment needs none of it.

## Deployment steps

My current recommendation is the following.

1. Setup the directory to hold he web application if it doesn't exist.
2. Clone the repository, e.g. clone to `/Sites/cold` and change into the repository directory
3. Run Deno tasks `setup` (if the collections don't exist) and `build` to build the binary for the cold service
5. Copy `cold.service-example` to `cold.service`, edit it and move to `/etc/systemd/system/`
6. Copy `cold_api.service-example` to `cold_api.service`, edit it and and move to `/etc/systemd/system/`
7. Copy `cold_reports.service-example` to `cold_reports.service`, edit it and and move to `/etc/systemd/system/`
7. Reload the systemd daemon, `sudo systemctl daemon-reload`
8. Enable the services (only needed the first time, may return a warning about symbolic link)
    a. `sudo systemctl enable cold.service`
    b. `sudo systemctl enable cold_api.service`
    c. `sudo systemctl enable cold_reports.service`
9. Start the services using `systemctl` in the usual way
    a. `sudo systemctl start cold.service`
    b. `sudo systemctl start cold_api.service`
    b. `sudo systemctl start cold_reports.service`
10. Test web services using eLinks. If you get a gateway error it means datasetd isn't running correctly in port 8111. Debug with curl, systemctl status, journalctl.
11. Make sure the `htdocs/rpt` directory has the correct ownership and sticky bit set so that reports can be run from a cronjob and from the reports UI and not get "stuck".

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
cp cold_reports.service-example cold_reports.service
nano cold_reports.service
sudo mv cold_reports.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable cold.service
sudo systemctl enable cold_api.service
sudo systemctl enable cold_reports.service
sudo systemctl start cold.service
sudo systemctl start cold_api.service
sudo systemctl start cold_reports.service
elinks http://localhost:8111
sudo chown -R $USER:$USER htdocs/rpt
chmod +t htdocs/rpt
~~~

NOTE: The TypeScript services need to be compile before running them with Systemd.

## Deploying the people push to RDM

The people push ([rdm_people_push.md](rdm_people_push.md)) writes COLD's people to an RDM instance's names list. It needs
six things in place beyond the steps above. Do them in order, and **do not skip the dry run**.

1. **Install COLD and irdmtools together.** The program that writes to RDM is `scripts/people_rdm_*.py` in the irdmtools
   repository, and `cold` ships it to the RDM host on every run from `IRDMTOOLS_SCRIPTS` (default `../irdmtools/scripts`, so
   `/Sites/irdmtools` beside `/Sites/cold`). Every COLD release is paired with an irdmtools release; pull both on the host
   and compare the versions before the first run. Each run row records the version and a hash of the files it shipped.
2. **Build `cold` and `people_sync` fresh.** `deno task build` builds both. `cold` needs `--allow-env=PEOPLE_SYNC_ENV`, which
   its build task and every release task grant. `run_people_sync.bash` prefers `./bin/people_sync` when it exists, so a stale
   binary silently runs old code: rebuild after every pull.
3. **Create the two run collections** if they do not exist: in `/Sites/cold`, `dataset init people_sync_runs.ds` and
   `dataset init people_sync_items.ds` (they are the last two commands of `deno task setup`, which a new deployment has already
   run). They are not tracked in git. Restart `cold_api` afterwards: `datasetd` reads `cold_api.yaml` and the collections at start.
4. **Write the target env file** (for example `caltechauthors.env` in `/Sites/cold`, untracked) naming the instance; every key
   is described in `cold.env-example` and `people_sync --help`. The ones that matter:

   | Key | Value |
   |---|---|
   | `RDM_URL` | the instance's public URL, recorded on every run |
   | `PEOPLE_SYNC_TRANSPORT` | `ssh` (production, from this host) |
   | `RDM_HOST` | the instance's ssh host; key authentication, no prompt |
   | `PEOPLE_SYNC_MODE` | **`dry-run`** until the review below is done; then `apply` |
   | `PEOPLE_SYNC_STALE_SECONDS` | the longest a run may take (default 600) |
   | `PEOPLE_SYNC_PREIMAGE_DIR` | where an apply keeps its pre-image on the RDM host (default `/var/tmp/people_sync_preimages`) |

   The ssh user needs `sudo -n -u ubuntu` on the RDM host (the run user, `RDM_RUN_USER`) and `uv` for it.
5. **Point the services at the env file.** `PEOPLE_SYNC_ENV` has no default. Set it in the environment of **`cold`** (which reads
   the file to show where the next run will go), of **`cold_reports`** (which runs the push) and of cron. In each systemd unit:

   ~~~ini
   [Service]
   Environment=PEOPLE_SYNC_ENV=caltechauthors.env
   ~~~

   then `sudo systemctl daemon-reload` and restart `cold` and `cold_reports`. The `*.service-example` files carry the line
   commented out. Restart `cold_api` too after any change to `cold_api.yaml`, because `datasetd` serves its queries as loaded.
6. **The front end must not add caching.** No `Expires`, `Header set Cache-Control` or `mod_expires` rule for COLD's paths
   (see [Caching](configuring_cold.md#caching)); a librarian must never see a stale sync page.

### First run against an instance

1. Check what the page says. Open `rdm_people_sync.html`: *Next run* must name the instance and mode you expect.
2. From the command line, run a **dry run** (`PEOPLE_SYNC_MODE=dry-run`) and read the report: the counts, every removal, every
   warning. Review it with the people who own that instance.
3. On the RDM host, take a **table dump** of `name_metadata` and keep it (see [the way back](rdm_people_push.md#the-way-back)).
4. Set `PEOPLE_SYNC_MODE=apply`, restart nothing (the mode is read from the file on each run), and run the push. The page's
   next-run line now says *Apply*.
5. Confirm the run row has a `preimage` path and that the file exists on the RDM host.

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
