#
# A Deno project makefile
#
PROJECT = cold

PACKAGE =  $(shell ls -1 *.ts | grep -v 'version.ts')

PROGRAMS = ds_importer cold_admin

GIT_GROUP = caltechlibrary

VERSION = $(shell grep '"version":' codemeta.json | cut -d\"  -f 4)

BRANCH = $(shell git branch | grep '* ' | cut -d\  -f 2)

PACKAGE = $(shell ls -1 *.ts | grep -v 'version.ts')

RELEASE_DATE=$(shell date +'%Y-%m-%d')

RELEASE_HASH=$(shell git log --pretty=format:'%h' -n 1)

MAN_PAGES = $(shell ls -1 *.1.md | sed -E 's/\.1.md/.1/g')

HTML_PAGES = $(shell ls -1 *.html)

OS = $(shell uname)

EXT =
ifeq ($(OS), Windows)
        EXT = .exe
endif

#PREFIX = /usr/local/bin
PREFIX = $(HOME)

TS_MODS = $(shell ls -1 *.ts | grep -v _test.ts | grep -v deps.ts | grep -v version.ts)

build: version.ts $(TS_MODS) docs htdocs bin compile

bin: .FORCE
	mkdir -p ../bin

compile: $(TS_MODS)
	deno check *.ts #--all cold_admin.ts
	#deno check --all cold_admin.ts
	#deno check --all ds_importer.ts
	deno task build
	./bin/cold_admin$(EXT) --help >cold_admin.1.md

check: $(TS_MODS)
	deno check --all cold_admin.ts
	deno check --all ds_importer.ts
	deno check --all dataset.ts
	deno check --all groups.ts
	deno check --all people.ts
	deno check --all funders.ts

version.ts: codemeta.json .FORCE
	echo '' | pandoc --from t2t --to plain \
                --metadata-file codemeta.json \
                --metadata package=$(PROJECT) \
                --metadata version=$(VERSION) \
                --metadata release_date=$(RELEASE_DATE) \
                --metadata release_hash=$(RELEASE_HASH) \
                --template codemeta-version-ts.tmpl \
                ../LICENSE >version.ts
	

format: $(shell ls -1 *.ts | grep -v version.ts | grep -v deps.ts)

$(shell ls -1 *.ts | grep -v version.ts): .FORCE
	deno fmt $@

setup_dataset: test.ds/collection.json people.ds/collection.json groups.ds/collection.json import_people_csv import_groups_csv

people.ds/collection.json:
	if [ ! -d people.ds ]; then dataset init people.ds 'sqlite://collection.db'; fi

groups.ds/collection.json:
	if [ ! -d groups.ds ]; then dataset init groups.ds 'sqlite://collection.db'; fi

test.ds/collection.json:
	if [ ! -d test.ds ]; then dataset init test.ds 'sqlite://collection.db'; fi

import_people_csv: .FORCE
	deno task import_people_csv

import_groups_csv: .FORCE
	deno task import_groups_csv

reload_dataset:
	deno task reload_data

htdocs: .FORCE
	deno task htdocs

test: .FORCE
	deno task test

docs: .FORCE
	deno doc --html --name="COLD Admin"  --output=docs $(TS_MODS)

dist/Linux-x86_64: .FORCE
	@mkdir -p dist/bin
	@for FNAME in $(PROGRAMS); do deno compile --output dist/bin/$$FNAME --target x86_64-unknown-linux-gnu "$${FNAME}.ts"; done
	@cd dist && zip -r $(PROJECT)-v$(VERSION)-Linux-x86_64.zip LICENSE codemeta.json CITATION.cff *.md $(DIST_FOLDERS)
	@rm -fR dist/bin

dist/Linux-aarch64: .FORCE
	@mkdir -p dist/bin
	@for FNAME in $(PROGRAMS); do deno compile --output dist/bin/$$FNAME --target aarch64-unknown-linux-gnu "$${FNAME}.ts"; done
	@cd dist && zip -r $(PROJECT)-v$(VERSION)-Linux-aarch64.zip LICENSE codemeta.json CITATION.cff *.md $(DIST_FOLDERS)
	@rm -fR dist/bin

dist/macOS-x86_64: .FORCE
	@mkdir -p dist/bin
	@for FNAME in $(PROGRAMS); do deno compile --output dist/bin/$$FNAME --target x86_64-apple-darwin cold_admin.ts "$${FNAME}.ts"; done
	@cd dist && zip -r $(PROJECT)-v$(VERSION)-macOS-x86_64.zip LICENSE codemeta.json CITATION.cff *.md $(DIST_FOLDERS)
	@rm -fR dist/bin

dist/macOS-arm64: .FORCE
	@mkdir -p dist/bin
	@for FNAME in $(PROGRAMS); do deno compile --output dist/bin/$$FNAME --target aarch64-apple-darwin cold_admin.ts "$${FNAME}.ts"; done
	@cd dist && zip -r $(PROJECT)-v$(VERSION)-macOS-arm64.zip LICENSE codemeta.json CITATION.cff *.md $(DIST_FOLDERS)
	@rm -fR dist/bin

dist/Windows-x86_64: .FORCE
	@mkdir -p dist/bin
	@for FNAME in $(PROGRAMS); do deno compile --output "dist/bin/$${FNAME}.exe" --target x86_64-pc-windows-msvc cold_admin.ts "$${FNAME}.ts"; done
	@cd dist && zip -r $(PROJECT)-v$(VERSION)-Windows-x86_64.zip LICENSE codemeta.json CITATION.cff *.md $(DIST_FOLDERS)
	@rm -fR dist/bin


.FORCE:
