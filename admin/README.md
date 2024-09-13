
# COLD Admin

> COLD - controlled object lists and datum

This project implements the administrative interface for [cold](https://github.com/caltechlibrary/cold). It is implemented in TypeScript, compiled into an executable via [Deno](https://deno.land). It is intended to run as a service via systemd in Linux or other POSIX system. Objects are stored in [dataset](https://caltechlibrary.github.io/dataset) collection. The collections are accessed via JSON API provided by [datasetd](https://caltechlibrary.github.io/datatset/datasetd.1.html). Dataset collections are using [SQLite 3](https://sqlite.org) for object storage.j

## Requirements

- [Dataset](https://github.com/caltechlibrary/dataset) >= 2.1.18 (running COLD Admin)
- [Deno](https://deno.land) >= 1.46.4 (used to build the app and compile services) (build COLD Admin)
- [Pandoc](https://pandoc.org) >= 3.1 (render documentation and version.ts) (build COLD Admin)
- GNU Make (build COLD Admin)
- Zip (packaging build and installation)
- Bash+cURL or Powershell (installation only)

## Additional Resources

- COLD Admin [User Manual](user_manual.md)

## Report problems and issues

See [Github Issues](https://github.com/caltechlibrary/cold_admin/issues)

