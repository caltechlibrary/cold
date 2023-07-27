#
# Simple Makefile for conviently testing, building and deploying experiment.
#
PROJECT = cold

VERSION = $(shell grep '"version":' codemeta.json | cut -d\"  -f 4)

BRANCH = $(shell git branch | grep '* ' | cut -d\  -f 2)

MAN_PAGES = $(shell ls -1 *.1.md | sed -E 's/\.1.md/.1/g')

MD_PAGES = $(shell ls -1 htdocs/*.md)

PAGES = $(basename $(MD_PAGES))

HTML_PAGES = $(addsuffix .html, $(PAGES))

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

build: version.sql CITATION.cff about.md $(PROGRAMS) $(HTML_PAGES) htdocs/widgets/config.js htdocs/readme.html cold_setup.sql cold_models.sql cold_models_test.sql

$(PROGRAMS): $(PACKAGE)
	@mkdir -p bin
	go build -o "bin/$@$(EXT)" cmd/$@/*.go
	@./bin/$@ -help >$@.1.md

man: $(MAN_PAGES)

$(MAN_PAGES): .FORCE
	mkdir -p man/man1
	pandoc $@.md --from markdown --to man -s >man/man1/$@

CITATION.cff: codemeta.json .FORCE
	cat codemeta.json | sed -E   's/"@context"/"at__context"/g;s/"@type"/"at__type"/g;s/"@id"/"at__id"/g' >_codemeta.json
	echo "" | pandoc --metadata title="Cite $(PROJECT)" --metadata-file=_codemeta.json --template=codemeta-cff.tmpl >CITATION.cff

about.md: codemeta.json .FORCE
	cat codemeta.json | sed -E 's/"@context"/"at__context"/g;s/"@type"/"at__type"/g;s/"@id"/"at__id"/g' >_codemeta.json
	echo "" | pandoc --metadata-file=_codemeta.json --template codemeta-md.tmpl >about.md 2>/dev/null
	if [ -f _codemeta.json ]; then rm _codemeta.json; fi


version.sql: .FORCE
	cat codemeta.json | sed -E   's/"@context"/"at__context"/g;s/"@type"/"at__type"/g;s/"@id"/"at__id"/g' >_codemeta.json
	@echo '' | pandoc --metadata title=${PROJECT} --metadata-file codemeta.json --template codemeta-version-sql.tmpl >version.sql

sql: version.sql cold_setup.sql cold_models.sql cold_models_test.sql vocabularies.sql issn_journal_publisher.sql .FORCE

cold_setup.sql: cold.yaml
	newt -pg-setup cold.yaml >cold_setup.sql

cold_models.sql: cold.yaml
	newt -pg-models cold.yaml >cold_models.sql

cold_models_test.sql: cold.yaml
	newt -pg-models-test cold.yaml >cold_models_test.sql

vocabularies.sql: 
	./voc2sql < vocabularies.yaml >vocabularies.sql

issn_journal_publisher.sql:
	./issn_voc2sql < issn_journal_publisher.tsv > issn_journal_publisher.sql

website: $(HTML_PAGES) .FORCE
	make -f website.mak
	

htdocs/widgets/config.js:
	mkpage codemeta=codemeta.json "prefix_path=text:$(APP_PREFIX_PATH)" templates/config-js.tmpl >htdocs/widgets/config.js	

htdocs/readme.html: nav.md README.md
	mkpage "prefix_path=text:$(APP_PREFIX_PATH)" body=README.md nav=nav.md templates/page.tmpl >htdocs/readme.html

load: .FORCE
	psql -f cold_setup.sql
	psql -f version.sql
	psql -f cold_models.sql
	psql -f vocabularies.sql
	psql -f issn_journal_publisher.sql
	psql -f cold_models_test.sql

harvest: .FORCE
	./harvest_testdata.bash

install: build
	@for FNAME in $(MAN_PAGES); do if [ -f "./man/man1/$${FNAME}" ]; then cp -v "./man/man1/$${FNAME}" "$(PREFIX)/man/man1/$${FNAME}"; fi; done
	@echo ""
	@echo "Make sure $(PREFIX)/man is in your MANPATH"
	@echo ""

uninstall: .FORCE
	@for FNAME in $(MAN_PAGES); do if [ -f "$(PREFIX)/man/man1/$${FNAME}" ]; then rm -v "$(PREFIX)/man/man1/$$FNAME"; fi; done

test: clean build
	psql -f cold_setup.sql
	psql -f version.sql
	psql -f cold_models.sql
	psql -f vocabularies.sql
	psql -f cold_models_test.sql
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
	@cd dist && zip -r $(PROJECT)-$(VERSION).zip LICENSE codemeta.json CITATION.cff cold.yaml *.sql *.md man/* docs/* htdocs/*

distribute_docs: build
	if [ -d dist ]; then rm -fR dist; fi
	mkdir -p dist
	cp -v codemeta.json dist/
	cp -v CITATION.cff dist/
	cp -v README.md dist/
	cp -v LICENSE dist/
	cp -v INSTALL.md dist/
	cp -vR docs dist/
	cp -vR htdocs dist/

distribute_tools:
	@mkdir -p dist
	cp -vR dataloader dist/
	cp -vp build_lunr_index.py dist/
	cp -vp csv_to_object_lists.py dist/
	cp -vp load_testdata.py dist/
	cp -vp unload_testdata.py dist/
	
update_version:
	$(EDITOR) codemeta.json
	@echo '' | pandoc --metadata title=$(PROJECT) --metadata-file codemeta.json --template codemeta-cff.tml >CITATION.cff

ui: .FORCE clean htdocs/index.html $(HTML_PAGES) htdocs/widgets/config.js


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
