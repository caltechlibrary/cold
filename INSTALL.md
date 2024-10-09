Installation for development of **cold**
========================================

**cold** is experimental software providing a read only view of managed controlled object lists and datum (e.g. controlled vocabularies). The **cold** repository provides the public facing JSON API for integration with other services.

The management interface is found in the **admin** directory. It contains the source to compile the curatorial services for cold.

**cold** public and admin services are intended to run behind a front facing web server (e.g. Apache 2) providing access control and authentication. In a development setting this can be as simple as configuring BasicAuth.  In a production setting you need something robust like Shibboleth.  An example apache2 configuration is included in the source repository for **cold**. It will require adaptation to your specific web server configuration.

**cold** requires the datasetd web service to provide access to people.ds and group.ds collections. For **cold** and **cold_admin** you should configure your collections to use sql storage, e.g. SQLite3 or PostgreSQL. This can be done form the cold_admin submodule using a Deno task or via the Makefile (which calls the deno task).

If you are setting up to run in production you should compile the services and
install the systemd service scripts so that systemd can manage the applications.

Required software
-----------------

1. Git (to clone the cold repository on GitHub)
2. Deno >= 1.46.3 (to run the public and management web services)
3. Dataset >= 2.1.22 (datasetd provides the JSON API for cold public and admin services)
4. Pandoc > 3.1 (to build or update documation)

Setting up cold and cold_admin
---------------------------

These are setup instructions for testing and development.  Step four changes
if you are setting up for production.

1. Retrieve cold and cold_admin repositories
    a. `cd`
    b. `git clone https://github.com/caltechlibrary/cold`
    c. `cd cold`
    d. `git pull origin main`
2. Setup cold public services
    a. `deno task build`
3. Setup cold admin services
    a. `cd admin`
    b. `deno task setup`
    c. (optional) `deno task load_data` (initially populate COLD from CSV files)
4. You need to start three web services, I recommend using tmux. You can then split the window to create each session and still see everything going on.
    a. from the cold admin directory start up tmux
      a. `tmux`
    a. change to the admin directory, start the JSON API and setup your dataset collections
      a. `cd admin`
      b. `deno task setup`
      c. `deno task json_api`
    b. open another tmux window, change to the admin directory, start the admin web service
      a. split the screen, e.g. `Ctl-%`
      b. `cd admin`
      c. `deno task start`
    c. open a third tmux window, change to the cold repository location and start the public web service
      a. split the screen, e.g. `Ctl-"`
      a. `deno task start`

You should now have three web services running running on localhost at ports 8110 (public service), 8111 (admin service), 8112 (JSON API).

Port 8110
: This is the public web service

Port 8111
: This is the management web service

Port 8112
: This is the management JSON API for `cold_admin` and `cold`

In a remote deployment you'd setup up to run these services using systemd service scripts. See [deployments](deployment.md) documentation for details.

