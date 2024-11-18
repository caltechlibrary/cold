Installation for development of **cold**
========================================

**cold** is experimental software for curation of managed controlled object lists (e.g. people, groups and controlled vocabularies) through several services.

**cold** web services are intended to run behind a front facing web server (e.g. Apache 2) providing access control and authentication. In a development setting this can be as simple as configuring BasicAuth.  In a production setting you need something robust like Shibboleth.  An example apache2 configuration is included in the source repository for **cold**. It will require adaptation to your specific web server configuration.

**cold** requires the datasetd web service to provide access to people.ds, group.ds and other collections. For **cold** your collections should use SQL storage, e.g. SQLite3 or PostgreSQL. Setting up SQLite3 dataset collections can be done using a Deno task or via the Makefile (which calls the deno task).

If you are setting up to run in production you should compile the services and install the systemd service scripts so that systemd can manage the applications.

Required software
-----------------

1. Git (to clone the cold repository on GitHub)
2. Deno >= 2.0.5 (to run the public and management web services)
3. Dataset >= 2.1.23 (datasetd provides the JSON API for cold public and admin services)
4. Pandoc > 3.1 (to build or update documentation)

Setting up cold
---------------

These are setup instructions for testing and development.  Step four changes
if you are setting up for production.

1. Retrieve cold and cold_admin repositories
    a. `cd`
    b. `git clone https://github.com/caltechlibrary/cold`
    c. `cd cold`
    d. `git pull origin main`
2. Setup cold services
    a. `deno task setup`
    b. (optional) `deno task load_data` (initially populate COLD from CSV files)
3. You need to start two web services, I recommend using tmux. You can then split the window to create each session and still see everything going on.
    a. start up tmux
      a. `tmux`
    a. start the JSON API and setup your dataset collections
      a. `deno task setup`
      b. `deno task cold_api`
    b. open another tmux window, change to the admin directory, start the admin web service
      a. split the screen, e.g. `Ctl-%`
      b. `deno task cold`

You should now have two web services running on localhost at ports 8111 (web service), 8112 (JSON API).

Port 8111
: This is the management web service

Port 8112
: This is the management JSON API for `cold`

In a remote deployment you'd setup up to run these services using systemd service scripts. See [deployments](deployment.md) documentation for details.
