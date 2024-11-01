
# where FORMAT is either s5, slidy, slideous, dzslides, or revealjs.
WEB_FORMAT = slidy

build: .FORCE clean html

html: .FORCE
	pandoc -V lang=en -s -t $(WEB_FORMAT) presentation1.md -o presentation1.html
	git add presentation1.html

pdf: .FORCE
	pandoc -V lang=en -s -t beamer presentation1.md -o presentation1.pdf

pptx: .FORCE
	pandoc -V lang=en -s presentation1.md -o presentation1.pptx

clean: .FORCE
	- rm presentation1.html > /dev/null 2>&1
	- rm presentation1.pdf > /dev/null 2>&1
	- rm presentation1.pptx > /dev/null 2>&1

.FORCE:
