Installation for development of **cold**
=======================================

**cold** is experimental software for managing controlled object lists and providing static vocabularies. It provides a JSON API for managing the objects via PostgreSQL and PostgREST. A human user interface is built via static HTML, CSS and JavaScript as well as with Pandoc templates processed via Pandoc in server mode. The means installing **cold** is more than installing the **cold** binary and a `settings.json` file. 

**cold** is intended to run behind a front facing web server (e.g. Apache 2 or NginX) that access control and authentication. This can be configured in Apache 2 or NginX by use of Shibboleth or BasicAuth.  An example apache2 configuration block is included in the source repository for **cold**. It will require adaptation to your specific web server configuration.

**cold** requires access to a PostgreSQL 14 through PostgREST 10. Both need to be configured. Template rendering is provided by Pandoc running in server mode.  Installation, setup of user accounts and creating databases is beyond the scope of this documentation but is require to have a working cold instance.

You will need to build **cold** for your specific system configuration.  You need to rebuild the static web content (very likely) you'll need to have Git, GNU Make, Pandoc 3 and available and working on your system.

Required software
-----------------

Adjusting the web content to your host system requires the following

1. Git (to clone the cold repository on GitHub)
2. PostgreSQL 15
3. PostgREST 11
4. Pandoc 3 (both cli and server)
5. GNU Make

Building the required software
------------------------------

Currently Pandoc 2 ships with many packaging systems (e.g. Ubuntu 22.04 LTS). **cold** requires Pandoc 3 and PostrREST 11. These will need a modern Haskell installed (e.g. via [gchup](https://www.haskell.org/ghcup/)). Included in this repository is a [cloud-init.yaml](cloud-init.yaml) file that can be used with [multipass](https://multipass.run) to build **cold** is a virtual machine.

Here's an example of the commands you could using to build an VM 
and then build the necessary software to run **cold**.

~~~
multipass -v launch --name cold --cloud-init cold-init.yaml
multipass shell cold
ghcup-build.bash
source $HOME/.ghcup/env
pandoc-build.bash
postgrest-build.bash
git clone https://github.com:caltechlibrary/cold \
          src/github.com/caltechlibrary/cold
cd src/github.com/caltechlibrary/cold
make build
~~~

Installation on macOS
---------------------

1. Install Haskell via [ghcup](https://www.haskell.org/ghcup/)
2. Make sure `$HOME/bin` exists and is in your path
    a. `mkdir -p $HOME/bin`
    b. Add it to your .bashrc, `echo 'export PATH="$HOME/bin:$PATH"' >>$HOME.bashrc`
    c. Source .bashrc if needed `source $HOME/.bashrc`
3. Build Pandoc 3 install as pandoc and pandoc-server
    a. `cd`
    b. `git clone https://github.com/jgm/pandoc src/github.com/jgm/pandoc`
    c. `cd src/github.com/jgm/pandoc`
    d. `make`
    e. `cp -vi $(find . -type f -name pandoc) $HOME/bin/pandoc-server`
    f. `cp -vi $(find . -type f -name pandoc) $HOME/bin/pandoc`
3. Build PostgREST and install 
    a. `cd`
    b. `git clone https://github.com/PostgREST/postgrest src/postgrest`
    c. `cd src/postgrest`
    d. `stack build --install-ghc --copy-bins --local-bin-path $HOME/bin`
4. Clone the Git repository for cold and run with Make
    a. `cd`
    b. `git clone https://github.com/caltechlibrary/cold src/github.com/caltechlibrary/cold`
    b. `cd src/github.com/caltechlibrary/cold`
    c. `make`
5. Run PostgREST in the background, `postgrest postgrest.conf &`
6. Run Pandoc in server mode in the back ground, `pandoc-server &`
7. Run a static web server (e.g. via Python) for the htdocs directory
    a. Change into the htdocs directory, `cd htdocs`
    b. Use python to service files, ` python3 -m http.server`
    c. Point your browser at `https://localhost:8000` and test.

Here's an example of the steps I'd take on my M1 Mac Mini. 

~~~
curl --proto '=https' --tlsv1.2 -sSf https://get-ghcup.haskell.org | sh
source $HOME/.ghcup/env
mkdir -p $HOME/bin
echo 'export PATH="$HOME/bin:$PATH"' >>"$HOME/.bashrc"
source $HOME/.bashrc
cd
git clone https://github.com/jgm/pandoc \
    src/github.com/jgm/pandoc
cd src/github.com/jgm/pandoc
make
cp -vi $(find . -type f -name pandoc) $HOME/bin/pandoc
cp -vi $(find . -type f -name pandoc) $HOME/bin/pandoc-server
cd
git clone git@github.com:PostgREST/postgrest \
    src/github.com/PostgREST/postgrest
cd src/github.com/PostgREST/postgrest
stack build --install-ghc --copy-bins --local-bin-path $HOME/bin
cd
git clone git@github.com:caltechlibrary/cold \
   src/github.com/caltechlibrary/cold
cd src/github.com/caltechlibrary/cold
make 
postgrest postgrest.conf &
pandoc-server --port 3030 &
cd htdocs
python3 -m http.server
~~~

The cold application is visible to your web browser at

The URL <http://localhost:8000>

The JSON API is visible from PostgREST at <http://localhost:3000>

The Pandoc server is visible at <http://localhost:3030>

To shutdown the running services I do the following

- Press ctl-c to quick the Python localhost web server
- "forground" the pandoc-server with `fg` and then press ctl-c
- "foreground" the postgrest server with `fg` and then press ctl-c
- Postgres can be stop using systemctl, `systemctl stop postgres`



