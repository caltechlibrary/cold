package main

import (
	"fmt"
	"os"
	"path"

	// Caltech Library Packages
	"github.com/caltechlibrary/cold"
)

func main() {
	appName := path.Base(os.Args[0])
	fmt.Printf("%s %s not implemented.", appName, cold.Version)
	os.Exit(1)
}
