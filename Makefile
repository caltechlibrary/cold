#
# Simple Makefile for conviently testing, building and deploying experiment.
#
PROJECT = cold

VERSION = $(shell grep '"version":' codemeta.json | cut -d\"  -f 4)

BRANCH = $(shell git branch | grep '* ' | cut -d\  -f 2)

CODEMETA2CFF = $(shell which codemeta2cff)

PROGRAMS = $(shell ls -1 cmd)

MD_PAGES = $(shell ls -1 htdocs/*.md)

PAGES = $(basename $(MD_PAGES))

HTML_PAGES = $(addsuffix .html, $(PAGES))

PACKAGE = $(shell ls -1 *.go)


APP_PREFIX_PATH = $(shell grep '"prefix_path":' settings.json | cut -d\"  -f 4)

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

build: version.go settings.json $(PROGRAMS) $(HTML_PAGES) htdocs/widgets/config.js htdocs/readme.html


version.go: .FORCE
	@echo "package $(PROJECT)" >version.go
	@echo '' >>version.go
	@echo '// Version of package' >>version.go
	@echo 'const Version = "$(VERSION)"' >>version.go
	@echo '' >>version.go
	@git add version.go
	@if [ -f bin/codemeta ]; then ./bin/codemeta; fi
	$(CODEMETA2CFF)

settings.json:
	@if [ ! -f settings.json ]; then cp -pvi etc/settings.json-example settings.json;fi

$(PROGRAMS): cmd/*/*.go $(PACKAGE)
	@mkdir -p bin
	go build -o bin/$@$(EXT) cmd/$@/*.go

nav.md: templates/nav.tmpl
	mkpage settings=settings.json templates/nav.tmpl >nav.md

$(HTML_PAGES): $(MD_PAGES) nav.md
	@echo "PAGE html: "$@" PAGE md: "$(basename $@).md
	mkpage settings=settings.json body=$(basename $@).md nav=nav.md templates/page.tmpl >$@

htdocs/widgets/config.js:
	mkpage codemeta=codemeta.json settings=settings.json templates/config-js.tmpl >htdocs/widgets/config.js	

htdocs/readme.html: nav.md README.md
	mkpage settings=settings.json body=README.md nav=nav.md templates/page.tmpl >htdocs/readme.html

harvest: .FORCE
	./harvest_testdata.bash

install: build
	@if [ ! -d $(PREFIX)/bin ]; then mkdir -p $(PREFIX)/bin; fi
	@echo "Installing programs in $(PREFIX)/bin"
	@for FNAME in $(PROGRAMS); do if [ -f ./bin/$$FNAME ]; then cp -v ./bin/$$FNAME $(PREFIX)/bin/$$FNAME; fi; done
	@echo ""
	@echo "Make sure $(PREFIX)/bin is in your PATH"

uninstall: .FORCE
	@echo "Removing programs in $(PREFIX)/bin"
	@for FNAME in $(PROGRAMS); do if [ -f $(PREFIX)/bin/$$FNAME ]; then rm -v $(PREFIX)/bin/$$FNAME; fi; done

test: clean build
	python3 csv_to_object_lists.py	
	go test
	@if [ -f test_cmd.bash ]; then bash test_cmd.bash; fi

cleanweb:
	@if [ -f index.html ]; then rm *.html; fi

clean: 
	@if [ -f nav.md ]; then rm nav.md; fi
	@if [ -f htdocs/index.html ]; then rm htdocs/*.html; fi
	@if [ -d bin ]; then rm -fR bin; fi
	@if [ -d dist ]; then rm -fR dist; fi
	@if [ -d testout ]; then rm -fR testout; fi
	@if [ -d htdocs/widgets/config.js ]; then rm -fR htdocs/widgets/config.js; fi

dist/linux-amd64:
	@mkdir -p dist/bin
	@for FNAME in $(PROGRAMS); do env  GOOS=linux GOARCH=amd64 go build -o dist/bin/$$FNAME cmd/$$FNAME/*.go; done
	@cd dist && zip -r $(PROJECT)-$(VERSION)-linux-amd64.zip LICENSE codemeta.json CITATION.cff *.md bin/* docs/* etc/* htdocs/* schema/* *.py dataloader/*.py
	@rm -fR dist/bin

dist/macos-amd64:
	@mkdir -p dist/bin
	@for FNAME in $(PROGRAMS); do env GOOS=darwin GOARCH=amd64 go build -o dist/bin/$$FNAME cmd/$$FNAME/*.go; done
	@cd dist && zip -r $(PROJECT)-$(VERSION)-macos-amd64.zip LICENSE codemeta.json CITATION.cff *.py *.md bin/* docs/* etc/* htdocs/* schema/* *.py dataloader/*.py
	@rm -fR dist/bin

dist/macos-arm64:
	@mkdir -p dist/bin
	@for FNAME in $(PROGRAMS); do env GOOS=darwin GOARCH=arm64 go build -o dist/bin/$$FNAME cmd/$$FNAME/*.go; done
	@cd dist && zip -r $(PROJECT)-$(VERSION)-macos-arm64.zip LICENSE codemeta.json CITATION.cff *.md bin/* docs/* etc/* htdocs/* schema/* *.py dataloader/*.py
	@rm -fR dist/bin

dist/windows-amd64:
	@mkdir -p dist/bin
	@for FNAME in $(PROGRAMS); do env GOOS=windows GOARCH=amd64 go build -o dist/bin/$$FNAME.exe cmd/$$FNAME/*.go; done
	@cd dist && zip -r $(PROJECT)-$(VERSION)-windows-amd64.zip LICENSE codemeta.json CITATION.cff *.md bin/* docs/* etc/* htdocs/* schema/* *.py dataloader/*.py
	@rm -fR dist/bin

dist/raspbian-arm7:
	@mkdir -p dist/bin
	@for FNAME in $(PROGRAMS); do env GOOS=linux GOARCH=arm GOARM=7 go build -o dist/bin/$$FNAME cmd/$$FNAME/*.go; done
	@cd dist && zip -r $(PROJECT)-$(VERSION)-rasperry-pi-os-arm7.zip LICENSE codemeta.json CITATION.cff *.md bin/* docs/* etc/*
	@rm -fR dist/bin

distribute_docs: build
	if [ -d dist ]; then rm -fR dist; fi
	mkdir -p dist
	cp -v codemeta.json dist/
	cp -v CITATION.cff dist/
	cp -v README.md dist/
	cp -v LICENSE dist/
	cp -v INSTALL.md dist/
	cp -vR docs dist/
	cp -vR etc dist/
	cp -vR htdocs dist/
	rm -fR dist/htdocs/lunr
	cp -vR schema dist/

distribute_tools:
	@mkdir -p dist
	cp -vR dataloader dist/
	cp -vp build_lunr_index.py dist/
	cp -vp csv_to_object_lists.py dist/
	cp -vp load_testdata.py dist/
	cp -vp unload_testdata.py dist/
	
update_version:
	$(EDITOR) codemeta.json
	codemeta2cff

ui: .FORCE clean htdocs/index.html $(HTML_PAGES) htdocs/widgets/config.js


release: clean version.go $(HTML_PAGES) htdocs/index.html htdocs/widgets/config.js distribute_docs distribute_tools dist/linux-amd64 dist/windows-amd64 dist/macos-amd64 dist/macos-arm64 dist/raspbian-arm7

status:
	git status

save:
	if [ "$(msg)" != "" ]; then git commit -am "$(msg)"; else git commit -am "Quick Save"; fi
	git push origin $(BRANCH)

publish:
	bash mk-website.bash
	bash publish.bash

.FORCE:
