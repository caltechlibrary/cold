
Installation for development of **cold_admin**
==============================================

**cold_admin** is experimental software providing an administrative interface for managing controlled object lists and datum (e.g. controlled vocabularies) hosted in a dataset collections. The application is split with two layers of responsibility. The Admin UI is written in Typescript and run via [Deno](https://deno.land). A JSON API used by __cold_admin__ is provided by datasetd for managing the people, groups and vocabularies collections.

**cold_admin** is largely configuration free. It run on localhost with the UI on port 8111 and the JSON API on port 8112.

**cold_admin** is intended to run behind a front facing web server (e.g. Apache 2 or NginX) that implements access control and authentication. This can be configured in Apache 2 or NginX by use of Shibboleth or BasicAuth.  An example apache2 configuration block is included in the source repository for **cold**. It will require adaptation to your specific web server configuration.

These installation instructions are for a developer setup. You will need additional software to do development.

Requirements
------------

- Deno >= 1.46.4
- Pandoc >= 3.1
- Dataset >= 2.1.18
- GNU Make
- Git
- Tmux (highly recommended for development)

<!--

Quick install with curl or irm
------------------------------

There is an experimental installer.sh script that can be run with the
following command to install latest table release. This may work for
macOS, Linux and if you're using Windows with the Unix subsystem. This
would be run from your shell (e.g. Terminal on macOS).

~~~
curl https://caltechlibrary.github.io/cold_admin/installer.sh | sh
~~~

This will install dataset and datasetd in your `$HOME/bin` directory.

If you are running Windows 10 or 11 use the Powershell command
below.

~~~
irm https://caltechlibrary.github.io/cold_admin/installer.ps1 | iex
~~~

NOTE: You will need to install [dataset](https://github.com/caltechlibrary/dataset) if it is not available. You need to install dataset
in `/usr/local`.

-->

Quick installation using Git
----------------------------

It is best to clone the [cold](https://github.com/caltechlibrary/cold) recursively to get the full cold application (public and admin UIs). If you are just working on the admin UI then you can do the following.

1. Clone the Git Repo
2. Change into the Git repo
3. Start up tmux
4. Launch the JSON API using deno task
5. Open a new tmux window
6. Use the deno task to setup the dataset collections.
7. Launch the web UI using deno task
8. Test with your web browser.

~~~shell
git clone git@github.com:caltechlibrary/cold_admin
cd cold_admin
tmux
deno task json_api
# open new window, e.g. Ctrl-"
deno task setup
deno task start
# Open new window
elinks http://localhost:8111
~~~

NOTE: You can use a GUI web browser to test, I've used elinks as an example.


The cold admin application is visible to your web browser at <http://localhost:8111>

The datasetd JSON API is visible at <http://localhost:8112>

To shutdown the running services I do the following

- Press ctl-c to quit in the datasetd window to stop the JSON API
- Press ctl-c to quit `deno task start` or run `deno task stop`

See [deployments](deployment.md) for a description of deploying on an application server.

