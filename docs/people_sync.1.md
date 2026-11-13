%people_sync(1) user manual | 0.2.0 d2510d0
% R. S.Doiel
% 2026-11-12

# NAME

people_sync

# SYNOPSIS

people_sync [OPTIONS]

# DESCRIPTION

people_sync pushes COLD's people to the CaltechAUTHORS RDM names pick list and records
the result in COLD. COLD is authoritative: the pick list is made to match what COLD holds.
It exports COLD's people, ships the irdmtools program (people_rdm_*.py) to the RDM host,
runs it there as the instance's own user, and writes a run row and item rows to
people_sync_runs.ds and people_sync_items.ds.

The default is a **dry run**: RDM is read and nothing is written. PEOPLE_SYNC_MODE=apply in
the env file turns writing on. An apply first keeps a pre-image of the names tables on the RDM
host (see PEOPLE_SYNC_PREIMAGE_DIR) and records its path on the run row.

people_sync is normally started through run_people_sync.bash, by the report runner
(the page's button, the person page's button, or cron). See docs/rdm_people_push.md for
what a push writes, the safeguards and the way back, and docs/deployment.md for setting it
up.

# OPTIONS

-e, --env FILE
: the env file naming the target (required; there is no default)

-s, --scope CLPID
: push one person (default: everyone)

--trigger NAME
: who started it, human or cron; recorded on the run (default unknown)

--request-id ID
: the report request that started it; recorded on the run

-h, --help
: display help

-v, --version
: display version

-l, --license
: display license

# ENV FILE KEYS

PEOPLE_SYNC_TRANSPORT
: ssh (default) or ssm (AWS Systems Manager)

RDM_HOST
: ssh host of the RDM instance (required for ssh)

RDM_INSTANCE_ID
: EC2 instance id i-... (required for ssm)

AWS_REGION, AWS_PROFILE
: optional, passed to the aws CLI (ssm)

RDM_URL
: the target's public URL, recorded on every run (required)

RDM_CHECKOUT
: the RDM checkout on that host (/Sites/caltechauthors)

RDM_RUN_USER
: the user the program runs as, through sudo (ubuntu)

IRDMTOOLS_SCRIPTS
: the irdmtools scripts directory (../irdmtools/scripts)

PEOPLE_SYNC_MODE
: dry-run (default) or apply

PEOPLE_SYNC_STALE_SECONDS
: the longest a run may take (600): the program is ended on the host at this limit and the
  lock released; a lock with a live owner is never broken

PEOPLE_SYNC_PREIMAGE_DIR
: where an apply keeps its pre-image on the RDM host (/var/tmp/people_sync_preimages,
  mode 700, owned by the run user); the newest 20 are kept, and the run records the path

COLD_API_URL
: COLD's datasetd (http://localhost:8112)

# EXIT STATUS

0
: completed (items needing a person are in the page, not an error)

2
: usage

66
: no env file, no target or no program files

69
: the RDM host or COLD's API cannot be reached, or the pre-image directory could not be made

70
: the program failed or a write failed

74
: a write to COLD failed

75
: another sync holds the lock

78
: the env file is present but wrong

# EXAMPLE

A dry run of one person, from the COLD directory:

~~~shell
people_sync --env caltechauthors.env --scope Doe-Jane --trigger human
~~~

