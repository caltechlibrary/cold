Installation for development of **cold**
===========================================

**cold** Caltech Library maintains a list of people, groups and funders and their related identifiers. For many years these were managed using a spreadsheets. That has become cumbersome. **COLD** manages data as JSON objects in [dataset](https://github.com/caltechlibrary/dataset) collections.

**COLD** is implemented as three web web services

- cold web UI
- cold JSON API (provided by datasetd)
- cold reports (the report request system)

Reports are implemented as a set of programs or bash scripts.

TypeScript+Deno is used to implement the web UI and report system.
The JSON API is provided by Dataset&#x27;s datasetd.
Access control is provided by the front end web server integrated with Shibboleth.

Quick install with curl or irm
------------------------------

There is an experimental installer.sh script that can be run with the following command to install latest table release. This may work for macOS, Linux and if you’re using Windows with the Unix subsystem. This would be run from your shell (e.g. Terminal on macOS).

~~~shell
curl https://caltechlibrary.github.io/cold/installer.sh | sh
~~~

This will install the programs included in cold in your `$HOME/bin` directory.

If you are running Windows 10 or 11 use the Powershell command below.

~~~ps1
irm https://caltechlibrary.github.io/cold/installer.ps1 | iex
~~~

Installing from source
----------------------

### Required software

- Deno &gt;&#x3D; 2.3
- GNU Make
- Pandoc &gt;&#x3D; 3.1
- Dataset &gt;&#x3D; 2.2
- CMTools &gt;&#x3D; 0.0.25

### Steps

1. git clone https://github.com/caltechlibrary/cold
2. Change directory into the `cold` directory
3. Make to build, test and install

~~~shell
git clone https://github.com/caltechlibrary/cold
cd cold
make
make test
make install
~~~

