---
title: ROR Integration
---

# ROR Integration

The ROR data is used to look up a name or acronym and populate our Funder records.

COLD integrates with ROR for curating funder information.   ROR releases updates every four to six weeks. The latest can be retreived from [Zenodo](https://zenodo.org/communities/ror-data/records?q&l=list&p=1&s=10&sort=newest), see <https://github.com/ror-community/ror-updates/releases> for the latest release. 

Currently the process is to fetch the complete data for ROR. `ror_import` to clear out the contents and update it from the ROR dump file zip.

The `ror.ds` provides the backing data for doing a local look up of Funder information via the funder name or acronym.  If the organization if found then the record is imported into the web form.


## Updating ror.ds

You need to be in the directory where COLD is installed.

1. Retrieve the latest release zip file from <https://zenodo.org/communities/ror-data/records?q&l=list&p=1&s=10&sort=newest>.
2. Run `ror_import ROR_DUMP_FILE_FILE` to proccess the Zip file and update `ror.ds`.
3. Restart the COLD API to pickup the new data. Example, in production run `sudo systemctl restart cold_api`.

This example show getting the release was v1.65 updated on 2025-05-05. The zip file was is called "v1.65-2025-05-05-ror-data.zip". Curl was being used to fetch the data, you could also just use your web browser.

~~~shell
curl -L -O https://zenodo.org/records/15343380/files/v1.65-2025-05-05-ror-data.zip?download=1
./bin/ror_import v1.65-2025-05-05-ror-data.zip 
sudo systemctl restart cold_api
~~~~
