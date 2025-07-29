#
# A Deno project makefile
#
PROJECT = cold

PACKAGE =  $(shell ls -1 *.ts | grep -v 'version.ts')

PROGRAMS = cold cold_reports directory_sync journal_vocabulary group_vocabulary people_vocabulary division_people thesis_option_vocabulary ror_import cold_api_test

TS_MODS = cold.ts cold_reports.ts directory_sync.ts journal_vocabulary.ts group_vocabulary.ts people_vocabulary.ts thesis_option_vocabulary.ts ror_import.ts cold_api_test.ts

GIT_GROUP = caltechlibrary

VERSION = $(shell grep '"version":' codemeta.json | cut -d\"  -f 4)

BRANCH = $(shell git branch | grep '* ' | cut -d\  -f 2)

PACKAGE = $(shell ls -1 *.ts | grep -v 'version.ts')

MAN_PAGES_1 = $(shell ls -1 *.1.md | sed -E 's/\.1.md/.1/g')

MAN_PAGES_3 = $(shell ls -1 *.3.md | sed -E 's/\.3.md/.3/g')

MAN_PAGES_7 = $(shell ls -1 *.7.md | sed -E 's/\.7.md/.7/g')

RELEASE_DATE=$(shell date +'%Y-%m-%d')

RELEASE_HASH=$(shell git log --pretty=format:'%h' -n 1)

HTML_PAGES = $(shell ls -1 *.html)

OS = $(shell uname)

EXT =
ifeq ($(OS), Windows)
        EXT = .exe
endif

#PREFIX = /usr/local/bin
PREFIX = $(HOME)

TS_MODS = $(shell ls -1 *.ts | grep -v _test.ts | grep -v deps.ts | grep -v version.ts)

build: version.ts $(TS_MODS) CITATION.cff about.md INSTALL.md htdocs bin compile installer.sh installer.ps1 $(HTML_PAGES)

bin: .FORCE
	mkdir -p bin

compile: check $(TS_MODS)
	deno task build
	bin/cold$(EXT) --help >cold.1.md
	bin/directory_sync$(EXT) --help >directory_sync.1.md
	bin/cold_reports$(EXT) --help >cold_reports.1.md
	bin/group_vocabulary$(EXT) --help >group_vocabulary.1.md
	bin/people_vocabulary$(EXT) --help >people_vocabulary.1.md
	bin/thesis_option_vocabulary$(EXT) --help >thesis_option_vocabulary.1.md
	bin/journal_vocabulary$(EXT) --help >journal_vocabulary.1.md
	bin/division_people$(EXT) --help >division_people.1.md

check: $(TS_MODS)
	deno task check

version.ts: codemeta.json .FORCE
	cmt codemeta.json version.ts

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

man: $(MAN_PAGES_1) # $(MAN_PAGES_3) $(MAN_PAGES_7)

$(MAN_PAGES_1): .FORCE
	mkdir -p man/man1
	pandoc $@.md --from markdown --to man -s >man/man1/$@

CITATION.cff: codemeta.json .FORCE
	cmt codemeta.json CITATION.cff

about.md: codemeta.json .FORCE
	cmt codemeta.json about.md
	cp about.md htdocs/
	deno task htdocs

INSTALL.md: codemeta.json .FORCE
	cmt codemeta.json INSTALL.md

status:
	git status

save:
	if [ "$(msg)" != "" ]; then git commit -am "$(msg)"; else git commit -am "Quick Save"; fi
	git push origin $(BRANCH)

website: $(HTML_PAGES) presentations .FORCE
	make -f website.mak

presentations: .FORCE
	cd presentations && make || exit 1

publish: website .FORCE
	./publish.bash

htdocs: .FORCE
	deno task htdocs

test: .FORCE
	deno task test

installer.sh: .FORCE
	@echo '' | pandoc --metadata title="Installer" --metadata git_org_or_person="$(GIT_GROUP)" --metadata-file codemeta.json --template codemeta-bash-installer.tmpl >installer.sh
	chmod 775 installer.sh
	git add -f installer.sh

installer.ps1: .FORCE
	@echo '' | pandoc --metadata title="Installer" --metadata git_org_or_person="$(GIT_GROUP)" --metadata-file codemeta.json --template codemeta-ps1-installer.tmpl >installer.ps1
	chmod 775 installer.ps1
	git add -f installer.ps1

clean:
	if [ -d bin ]; then rm -fR bin/*; fi
	if [ -d dist ]; then rm -fR dist/*; fi

release: clean build man website distribute_docs dist/Linux-x86_64 dist/Linux-aarch64 dist/macOS-x86_64 dist/macOS-arm64 dist/Windows-x86_64
	echo "Ready to do ./release.bash"

setup_dist: .FORCE
	@rm -fR dist
	@mkdir -p dist

distribute_docs: website man setup_dist
	@cp README.md dist/
	@cp LICENSE dist/
	@cp codemeta.json dist/
	@cp CITATION.cff dist/
	@cp *.1.md dist/
	@cp INSTALL.md dist/
	@cp deployment.md dist/
	@cp -vR man dist/

dist/Linux-x86_64: .FORCE
	@mkdir -p dist/bin
	deno task release_linux_x86_64
	@cd dist && zip -r $(PROJECT)-v$(VERSION)-Linux-x86_64.zip LICENSE codemeta.json CITATION.cff *.md bin/* man/*
	@rm -fR dist/bin

dist/Linux-aarch64: .FORCE
	@mkdir -p dist/bin
	deno task release_linux_aarch64
	@cd dist && zip -r $(PROJECT)-v$(VERSION)-Linux-aarch64.zip LICENSE codemeta.json CITATION.cff *.md bin/* man/*
	@rm -fR dist/bin

dist/macOS-x86_64: .FORCE
	@mkdir -p dist/bin
	deno task release_macos_x86_64
	@cd dist && zip -r $(PROJECT)-v$(VERSION)-macOS-x86_64.zip LICENSE codemeta.json CITATION.cff *.md bin/* man/*
	@rm -fR dist/bin

dist/macOS-arm64: .FORCE
	@mkdir -p dist/bin
	deno task release_macos_aarch64
	@cd dist && zip -r $(PROJECT)-v$(VERSION)-macOS-arm64.zip LICENSE codemeta.json CITATION.cff *.md bin/* man/*
	@rm -fR dist/bin

dist/Windows-x86_64: .FORCE
	@mkdir -p dist/bin
	deno task release_windows_x86_64
	@cd dist && zip -r $(PROJECT)-v$(VERSION)-Windows-x86_64.zip LICENSE codemeta.json CITATION.cff *.md bin/* man/*
	@rm -fR dist/bin

dist/Windows-aarch64: .FORCE
	@mkdir -p dist/bin
	deno task release_windows_x86_64 # deno task release_windows_aarch64 <-- switch when Windows ARM64 is natively supported by Deno
	@cd dist && zip -r $(PROJECT)-v$(VERSION)-Windows-aarch64.zip LICENSE codemeta.json CITATION.cff *.md bin/* man/*
	@rm -fR dist/bin

.FORCE:
