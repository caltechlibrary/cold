#
# A Deno project makefile
#
PROJECT = cold_admin

PACKAGE =  $(shell ls -1 *.ts | grep -v 'version.ts')

PROGRAMS = ds_importer cold_admin

DIST_FOLDERS = bin/* man/* htdocs/*

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

build: version.ts CITATION.cff about.md $(TS_MODS) docs htdocs bin compile installer.sh installer.ps1

bin: .FORCE
	mkdir -p bin

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
                LICENSE >version.ts
	

CITATION.cff: codemeta.json .FORCE
	cat codemeta.json | sed -E   's/"@context"/"at__context"/g;s/"@type"/"at__type"/g;s/"@id"/"at__id"/g' >_codemeta.json
	echo "" | pandoc --metadata title="Cite $(PROJECT)" --metadata-file=_codemeta.json --template=codemeta-cff.tmpl >CITATION.cff

about.md: codemeta.json .FORCE
	cat codemeta.json | sed -E 's/"@context"/"at__context"/g;s/"@type"/"at__type"/g;s/"@id"/"at__id"/g' >_codemeta.json
	echo "" | pandoc --metadata-file=_codemeta.json --template codemeta-about.tmpl >about.md 2>/dev/null
	if [ -f _codemeta.json ]; then rm _codemeta.json; fi

man: $(MAN_PAGES)

$(MAN_PAGES): .FORCE
	mkdir -p man/man1
	pandoc $@.md --from markdown --to man -s >man/man1/$@

$(HTML_PAGES): website

website: .FORCE
	make -f website.mak

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
	deno doc --html --name="COLD UI"  --output=./docs $(TS_MODS)

clean: .FORCE
	rm -fR docs/*
	rm -fR bin/$(PROGRAM)$(EXT)
	rm -fR dist/
	-make -f website.mak clean
	-make -f htdocs.mak clean


status:
	git status

save:
	if [ "$(msg)" != "" ]; then git commit -am "$(msg)"; else git commit -am "Quick Save"; fi
	git push origin $(BRANCH)

publish:
	make -f website.mak
	bash publish.bash

install: build man
	@echo "Installing programs in $(PREFIX)/bin"
	@for FNAME in $(PROGRAMS); do if [ -f "./bin/$${FNAME}$(EXT)" ]; then mv -v "./bin/$${FNAME}$(EXT)" "$(PREFIX)/bin/$${FNAME}$(EXT)"; fi; done
	@echo ""
	@echo "Make sure $(PREFIX)/bin is in your PATH"
	@echo "Installing man pages in $(PREFIX)/man/man1"
	@mkdir -p $(PREFIX)/man/man1
	@for FNAME in $(MAN_PAGES); do cp -v man/man1/$$FNAME $(PREFIX)/man/man1/; done
	@echo "Make sure $(PREFIX)/man is in your MANPATH"

uninstall: .FORCE
	@echo "Removing programs in $(PREFIX)/bin"
	@for FNAME in $(PROGRAMS); do if [ -f "$(PREFIX)/bin/$${FNAME}$(EXE)" ]; then rm -v "$(PREFIX)/bin/$${FNAME}$(EXT)"; fi; done
	@echo "Removing manpages in $(PREFIX)/man"
	@for FNAME in $(MAN_PAGES); do if [ -f "$(PREFIX)/man/man1/$${FNAME}" ]; then rm -v "$(PREFIX)/man/man1/$${FNAME}"; fi; done


installer.sh: .FORCE
	@echo '' | pandoc --metadata title="Installer" --metadata git_org_or_person="$(GIT_GROUP)" --metadata-file codemeta.json --template codemeta-bash-installer.tmpl >installer.sh
	chmod 775 installer.sh
	git add -f installer.sh

installer.ps1: .FORCE
	@echo '' | pandoc --metadata title="Installer" --metadata git_org_or_person="$(GIT_GROUP)" --metadata-file codemeta.json --template codemeta-ps1-installer.tmpl >installer.ps1
	chmod 775 installer.ps1
	git add -f installer.ps1


release: clean CITATION.cff version.ts $(HTML_PAGES) distribute_docs dist/Linux-x86_64 dist/Linux-aarch64 dist/macOS-x86_64 dist/macOS-arm64 dist/Windows-x86_64

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

distribute_docs: man htdocs CITATION.cff about.md .FORCE 
	if [ -d dist ]; then rm -fR dist; fi
	mkdir -p dist
	cp -v codemeta.json dist/
	cp -v CITATION.cff dist/
	cp -v README.md dist/
	cp -v LICENSE dist/
	cp -v INSTALL.md dist/
	cp -vR man dist/
	cp -vR docs dist/
	cp -vR htdocs dist/


.FORCE:
