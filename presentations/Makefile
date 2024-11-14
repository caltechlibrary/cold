
# where FORMAT is either s5, slidy, slideous, dzslides, or revealjs.
SLIDE_FORMAT = slidy

build: clean html

html: .FORCE
	pandoc -V lang=en -s -t $(SLIDE_FORMAT) presentation1.md -o presentation1.html
	git add presentation1.html

pdf: .FORCE
	pandoc -V lang=en -s -t beamer presentation1.md -o presentation1.pdf

pptx: .FORCE
	pandoc -V lang=en -s presentation1.md -o presentation1.pptx

clean: .FORCE
	@if [ -f presentation1.html ]; then rm presentation1.html; fi
	@if [ -f presentation1.pdf ];  then rm presentation1.pdf; fi
	@if [ -f presentation1.pptx ]; then rm presentation1.pptx; fi
	
.FORCE:
