#
# Makefile for running pandoc on all Markdown docs ending in .md
#
PROJECT = htdocs

PANDOC = $(shell which pandoc)

MD_PAGES = $(shell ls -1 htdocs/*.md | grep -v 'nav.md')

HTML_PAGES = $(shell ls -1 htdocs/*.md | grep -v 'nav.md' | sed -E 's/.md/.html/g')

build: $(HTML_PAGES) $(MD_PAGES)

$(HTML_PAGES): $(MD_PAGES) .FORCE
	if [ -f $(PANDOC) ]; then $(PANDOC) --metadata title=$(basename $@) -s --to html5 $(basename $@).md -o $(basename $@).html \
		--lua-filter=links-to-html.lua \
	    --template=cold_page.tmpl; fi
	@if [ $@ = "README.html" ]; then mv README.html index.html; fi

clean:
	rm htdocs/*.html

.FORCE:
