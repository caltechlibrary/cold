package main

import (
	"encoding/csv"
	"flag"
	"fmt"
	"os"
	"path"
	"strings"
)

var (
	helpText = `% {app_name}(1) {app_name}
% R. S. Doiel
% 2023-07-24

# NAME

{app_name}

# SYNOPIS

{app_name} < issn_journal_publisher.tsv >issn_journal_publisher.sql

# DESCRIPTION

{app_name} translates a tsv vocabulary file into Postgres SQL.

# OPTIONS

-help
: display help

-i
: read from filename

-o
: write to filename

# EXAMPLES

~~~
{app_name} < issn_journal_publisher.tsv >issn_journal_publisher.sql
~~~

`
)

func fmtText(txt string, appName string) string {
	return strings.ReplaceAll(txt, "{app_name}", appName)
}

func quote(s string) string {
	if strings.Contains(s, "'") {
		return strings.ReplaceAll(s, "'", "''")
	}
	return s
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

	r := csv.NewReader(in)
	r.Comma = '\t'
	r.Comment = '#'
	fmt.Fprintf(out, "\\c cold\n");
	rows, err := r.ReadAll()
	if err != nil {
		fmt.Fprintf(eout, "%s\n", err)
		os.Exit(1)
	}
	for i, row := range rows {
		if i == 0 {
			fmt.Fprintf(out, `-- Inserting records with : %s`, strings.Join(row, ", "))
		} else {
			fmt.Fprintf(out, `INSERT INTO cold.journal_names (issn, journal, publisher) VALUES ('%s', '%s', '%s');`, row[0], quote(row[1]), quote(row[2]));
		}
		fmt.Fprintln(out, "")
	}
}
