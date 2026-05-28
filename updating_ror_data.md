
# Updating ROR Data

We use the ROR dataset for affiliation information. We keep a local copy in the dataset collection called ror.ds. This needs to be updated from the ROR data dump releases that happen every so often.

You can find the latest ROR data dump at Zenodo, see https://zenodo.org/records/20140273. You download the latest Zip file and place it in the COLD application directory.

To update our dataset collection use the `bin/ror_import` command. This updates the dataset collection as well as the country list in `htdocs/data`.


