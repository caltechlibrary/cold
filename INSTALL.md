Installation for development of **cold** and **cold_ui
======================================================

**cold** is experimental software providing a read only view of managed controlled object lists and datum (e.g. controlled vocabularies). The **cold** repository provides the public facing JSON API for integration with other services.

The management interface **cold_ui** is held in the [github.com/caltechlibrary/cold_ui](https://github.com/caltechlibrary/cold_ui) repository. **cold** implements **cold_ui** as Git submodule. When you clone **cold** you should do so recursively.

**cold** and **cold_ui** are intended to run behind a front facing web server (e.g. Apache 2) providing access control and authentication. In a development setting this can be as simple as configuring BasicAuth.  In a production setting you need something robust like Shibboleth.  An example apache2 configuration is included in the source repository for **cold**. It will require adaptation to your specific web server configuration.

**cold** requires the datasetd web service to provide access to people.ds and group.ds collections. For **cold** and **cold_ui** you should configure your collections to use sql storage, e.g. SQLite3 or PostgreSQL. This can be done form the cold_ui submodule using a Deno task or via the Makefile (which calls the deno task).

If you are setting up to run in production you should compile the services and
install the systemd service scripts so that systemd can manage the applications.

Required software
-----------------

1. Git (to clone the cold repository on GitHub)
2. Deno >= 1.44 (to run the public and management web services)
3. Dataset >= 2.1.15 (datasetd provides the JSON API for cold/cold_ui)
4. Pandoc > 3.1 (to build or update documation)

Setting up cold and cold_ui
---------------------------

These are setup instructions for testing and development.  Step four changes
if you are setting up for production.

1. Retrieve cold and cold_ui repositories
    a. `cd`
    b. `git clone https://github.com/caltechlibrary/cold --recursive`
    c. `cd cold`
    d. `git pull origin --recurse-submodules`
2. Setup cold_ui
    a. `cd cold_ui`
    b. `deno task setup`
    c. `cd ..`
3. Setup cold
    a. `deno task setup`
    b. `deno task build`
4. You need to start three web services, I recommend using tmux. You can then split the window to create each session and still see everything going on.
    a. start a shell session from the cold respotitory location
      a. `cd cold_ui`
      b. `deno task json_api`
    b. start another shell session from the cold repository locations
      a. `cd cold_ui`
      d. `deno task dev`
    c. start a third shell session in the cold repository
      a. `deno task public_service`

You should now have three web services running running on localhost.

Port 8485
: This is the management JSON API for cold_ui

Port: ison four web services running.

- a public JSON API and management JSON API
- a public web service and a managment web service

In a Production setting you'd create service scripts to run each service from systemd. Instead of `deno task dev` you'd use `deno task start` and for the public and private web services. You'd might need to change ports if the default ports are not available.
