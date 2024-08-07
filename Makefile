#
# Simple Makefile for conviently testing, building and deploying experiment.
#
PROJECT = cold

GIT_GROUP = caltechlibrary

PACKAGE =  $(shell ls -1 *.ts | grep -v 'version.ts')

VERSION = $(shell grep '"version":' codemeta.json | cut -d\"  -f 4)

BRANCH = $(shell git branch | grep '* ' | cut -d\  -f 2)

MAN_PAGES_1 = $(shell ls -1 *.1.md | sed -E 's/\.1.md/.1/g')

MAN_PAGES_3 = $(shell ls -1 *.3.md | sed -E 's/\.3.md/.3/g')

MAN_PAGES_7 = $(shell ls -1 *.7.md | sed -E 's/\.7.md/.7/g')

MD_PAGES = $(shell ls -1 htdocs/*.md)

PAGES = $(basename $(MD_PAGES))

HTML_PAGES = $(addsuffix .html, $(PAGES))

TS_MODS = $(shell ls -1 *.ts | grep -v _test.ts | grep -v deps.ts | grep -v version.ts)

HTDOCS = "$(shell pwd)/htdocs"

APP_PREFIX_PATH = /cold

#PREFIX = /usr/local/bin
PREFIX = $(HOME)

ifneq ($(prefix),)
        PREFIX = $(prefix)
endif

OS = $(shell uname)

EXT =
ifeq ($(OS), Windows)
        EXT = .exe
endif

PROGRAMS = $(shell ls -1 cmd)

build: version.ts CITATION.cff about.md $(HTML_PAGES) htdocs compile installer.sh installer.ps1

compile: .FORCE
compile: $(TS_MODS)
	deno check *.ts
	deno task build
	./bin/cold$(EXT) --help >cold.1.md

version.ts: codemeta.json .FORCE
	echo '' | pandoc --from t2t --to plain \
                --metadata-file codemeta.json \
                --metadata package=$(PROJECT) \
                --metadata version=$(VERSION) \
                --metadata release_date=$(RELEASE_DATE) \
                --metadata release_hash=$(RELEASE_HASH) \
                --template codemeta-version-ts.tmpl \
                LICENSE >version.ts

man: $(MAN_PAGES_1) # $(MAN_PAGES_3) $(MAN_PAGES_7)


$(MAN_PAGES_1): .FORCE
	mkdir -p man/man1
	pandoc $@.md --from markdown --to man -s >man/man1/$@

### 
### $(MAN_PAGES_3): .FORCE
### 	mkdir -p man/man3
### 	pandoc $@.md --from markdown --to man -s >man/man3/$@
### 
### $(MAN_PAGES_7): .FORCE
### 	mkdir -p man/man7
### 	pandoc $@.md --from markdown --to man -s >man/man7/$@
### 

CITATION.cff: codemeta.json .FORCE
	cat codemeta.json | sed -E   's/"@context"/"at__context"/g;s/"@type"/"at__type"/g;s/"@id"/"at__id"/g' >_codemeta.json
	echo "" | pandoc --metadata title="Cite $(PROJECT)" --metadata-file=_codemeta.json --template=codemeta-cff.tmpl >CITATION.cff

about.md: codemeta.json .FORCE
	cat codemeta.json | sed -E 's/"@context"/"at__context"/g;s/"@type"/"at__type"/g;s/"@id"/"at__id"/g' >_codemeta.json
	echo "" | pandoc --metadata-file=_codemeta.json --template codemeta-md.tmpl >about.md 2>/dev/null
	if [ -f _codemeta.json ]; then rm _codemeta.json; fi
	cp about.md htdocs/

website: $(HTML_PAGES) .FORCE
	make -f website.mak
	
htdocs: .FORCE
	deno task htdocs

install: build
	@for FNAME in $(MAN_PAGES_1); do if [ -f "./man/man1/$${FNAME}" ]; then cp -v "./man/man1/$${FNAME}" "$(PREFIX)/man/man1/$${FNAME}"; fi; done
	@for FNAME in $(MAN_PAGES_3); do if [ -f "./man/man3/$${FNAME}" ]; then cp -v "./man/man3/$${FNAME}" "$(PREFIX)/man/man3/$${FNAME}"; fi; done
	@for FNAME in $(MAN_PAGES_7); do if [ -f "./man/man7/$${FNAME}" ]; then cp -v "./man/man7/$${FNAME}" "$(PREFIX)/man/man7/$${FNAME}"; fi; done
	@echo ""
	@echo "Make sure $(PREFIX)/man is in your MANPATH"
	@echo ""

uninstall: .FORCE
	@for FNAME in $(MAN_PAGES); do if [ -f "$(PREFIX)/man/man1/$${FNAME}" ]; then rm -v "$(PREFIX)/man/man1/$$FNAME"; fi; done
	@for FNAME in $(MAN_PAGES); do if [ -f "$(PREFIX)/man/man3/$${FNAME}" ]; then rm -v "$(PREFIX)/man/man3/$$FNAME"; fi; done
	@for FNAME in $(MAN_PAGES); do if [ -f "$(PREFIX)/man/man7/$${FNAME}" ]; then rm -v "$(PREFIX)/man/man7/$$FNAME"; fi; done

test: clean build
	@if [ -f test_cmd.bash ]; then bash test_cmd.bash; fi

cleanweb:
	@for FNAME in $(HTML_PAGES); do rm "$${FNAME}"; done

clean: 
	@if [ -f htdocs/index.html ]; then rm htdocs/*.html; fi
	@if [ -d dist ]; then rm -fR dist; fi
	@if [ -d testout ]; then rm -fR testout; fi
	@if [ -d htdocs/widgets/config.js ]; then rm -fR htdocs/widgets/config.js; fi

dist: .FORCE
	@mkdir -p dist
	@cd dist && zip -r $(PROJECT)-$(VERSION).zip LICENSE codemeta.json CITATION.cff cold.yaml *.md man/* htdocs/*

distribute_docs: build
	if [ -d dist ]; then rm -fR dist; fi
	mkdir -p dist
	cp -v codemeta.json dist/
	cp -v CITATION.cff dist/
	cp -v README.md dist/
	cp -v LICENSE dist/
	cp -v INSTALL.md dist/
	cp -vR htdocs dist/

distribute_tools:
	@mkdir -p dist

update_version:
	$(EDITOR) codemeta.json
	@echo '' | pandoc --metadata title=$(PROJECT) --metadata-file codemeta.json --template codemeta-cff.tml >CITATION.cff

ui: .FORCE clean htdocs/index.html $(HTML_PAGES) htdocs/widgets/config.js

installer.sh: .FORCE
	@echo '' | pandoc --metadata title="Installer" --metadata git_org_or_person="$(GIT_GROUP)" --metadata-file codemeta.json --template codemeta-bash-installer.tmpl >installer.sh
	chmod 775 installer.sh
	git add -f installer.sh

installer.ps1: .FORCE
	@echo '' | pandoc --metadata title="Installer" --metadata git_org_or_person="$(GIT_GROUP)" --metadata-file codemeta.json --template codemeta-ps1-installer.tmpl >installer.ps1
	chmod 775 installer.ps1
	git add -f installer.ps1

release: clean version.sql $(HTML_PAGES) htdocs/index.html htdocs/widgets/config.js distribute_docs distribute_tools dist

status:
	git status

save:
	if [ "$(msg)" != "" ]; then git commit -am "$(msg)"; else git commit -am "Quick Save"; fi
	git push origin $(BRANCH)

publish:
	make -f website.mak
	bash publish.bash

.FORCE:
