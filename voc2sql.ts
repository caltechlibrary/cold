package main

import (
	"flag"
	"fmt"
	"io"
	"os"
	"path"
	"strings"

	// 3rd Party
	"gopkg.in/yaml.v3"
)

var (
	helpText = `% {app_name}(1) {app_name}
% R. S. Doiel
% 2023-07-24

# NAME

{app_name}

# SYNOPIS

{app_name} < vocabulary.yaml >vocabulary.sql

# DESCRIPTION

{app_name} translates a vocabulary file into Postgres SQL.

# OPTIONS

-help
: display help

-i
: read from filename

-o
: write to filename

# EXAMPLES

~~~
{app_name} < vocabulary.yaml >vocabulary.sql
~~~

`
)

type Vocabulary struct {
	Name        string            `json:"name,omitempty" yaml:"name,omitempty"`
	Description string            `json:"description,omitempty" yaml:"omitempty"`
	Dict        map[string]string `json:"dict,omitempty" yaml:"dict,omitempty"`
}

func fmtText(txt string, appName string) string {
	return strings.ReplaceAll(txt, "{app_name}", appName)
}

func main() {
	appName := path.Base(os.Args[0])
	showHelp, input, output := false, "", ""
	flag.BoolVar(&showHelp, "help", showHelp, "display help")
	flag.StringVar(&input, "i", input, "read from file")
	flag.StringVar(&output, "o", output, "write to file")
	flag.Parse()

	var err error
    args := flag.Args()
	in := os.Stdin
	out := os.Stdout
	eout := os.Stderr

	if len(args) > 1 {
		input, output = args[0], args[1]
	} else if len(args) > 0 {
		input = args[0]
	}

	if input != "" {
		in, err = os.Open(input)
		if err != nil {
			fmt.Fprintf(eout, "%s\n", err)
			os.Exit(1)
		}
		defer in.Close()
	}
	if output != "" {
		out, err = os.Create(output)
		if err != nil {
			fmt.Fprintf(eout, "%s\n", err)
			os.Exit(1)
		}
	}

	if showHelp {
		fmt.Fprintf(out, "%s\n", fmtText(helpText, appName))
		os.Exit(0)
	}

	src, err := io.ReadAll(in)
	if err != nil {
		fmt.Fprintf(eout, "%s\n", err)
		os.Exit(1)
	}
	vocs := []*Vocabulary{}
	if err := yaml.Unmarshal(src, &vocs); err != nil {
		fmt.Fprintf(eout, "%s\n", err)
		os.Exit(1)
	}
	fmt.Fprintln(out, "\\c cold")
	for _, voc := range vocs {
		for k, v := range voc.Dict {
			fmt.Fprintf(out, `INSERT INTO cold.%s (key, value) VALUES ('%s', '%s');
`, voc.Name, k, v)
		}
		fmt.Fprintln(out, "")
	}
}
