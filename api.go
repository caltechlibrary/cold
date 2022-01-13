package cold

import (
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path"
	"strings"
	"syscall"
)

type API struct {
	AppName  string
	Settings string
	Cfg      *Config
	log      *log.Logger
}

// packageJSON takes a writer, request, src and error packing up
// the http response.
func (api *API) packageJSON(w http.ResponseWriter, r *http.Request, src []byte, err error) {
	if err != nil {
		http.NotFound(w, r)
		api.logResponse(r, 404, fmt.Errorf(`Not found, %s`, err))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	fmt.Fprintf(w, "%s", src)
}

// isDotPath checks to see if a path is requested with a dot file (e.g. docs/.git/* or docs/.htaccess)
func (api *API) isDotPath(p string) bool {
	for _, part := range strings.Split(path.Clean(p), "/") {
		if strings.HasPrefix(part, "..") == false && strings.HasPrefix(part, ".") == true && len(part) > 1 {
			return true
		}
	}
	return false
}

// logRequest logs a request based on writer and request
func (api *API) logRequest(w http.ResponseWriter, r *http.Request) {
	//FIXME: Need to implement log levels and log output accordingly.
	p := r.URL.Path
	if p == "" {
		p = "/"
	}
	q := r.URL.Query()
	if len(q) > 0 {
		api.log.Printf("Request: %s Path: %s RemoteAddr: %s UserAgent: %s Query: %+v\n", r.Method, p, r.RemoteAddr, r.UserAgent(), q)
	} else {
		api.log.Printf("Request: %s Path: %s RemoteAddr: %s UserAgent: %s\n", r.Method, p, r.RemoteAddr, r.UserAgent())
	}
}

// requestLogger logs the request based on the request object passed into it.
func (api *API) requestLogger(next http.Handler) http.Handler {
	//FIXME: Need to implement log levels and log output accordingly.
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		api.logRequest(w, r)
		next.ServeHTTP(w, r)
	})
}

// logResponse logs the response based on a request, status and error message
func (api *API) logResponse(r *http.Request, status int, err error) {
	//FIXME: Need to implement log levels and log output accordingly.
	q := r.URL.Query()
	if status <= 200 && status >= 300 {
		if len(q) > 0 {
			api.log.Printf("Response: %s Path: %s RemoteAddr: %s UserAgent: %s Query: %+v Status: %d, %s %q\n", r.Method, r.URL.Path, r.RemoteAddr, r.UserAgent(), q, status, http.StatusText(status), err)
		} else {
			api.log.Printf("Response: %s Path: %s RemoteAddr: %s UserAgent: %s Status: %d, %s %q\n", r.Method, r.URL.Path, r.RemoteAddr, r.UserAgent(), status, http.StatusText(status), err)
		}
	} else {
		//FIXME: This is excessive, only useful in debugging
		if len(q) > 0 {
			api.log.Printf("Response: %s Path: %s RemoteAddr: %s UserAgent: %s Query: %+v Status: %d, %s\n", r.Method, r.URL.Path, r.RemoteAddr, r.UserAgent(), q, status, http.StatusText(status))
		} else {
			api.log.Printf("Response: %s Path: %s RemoteAddr: %s UserAgent: %s Status: %d, %s\n", r.Method, r.URL.Path, r.RemoteAddr, r.UserAgent(), status, http.StatusText(status))
		}
	}
}

// StaticRouter scans the request object to either add a .html extension or prevent serving a dot file path
func (api *API) staticRouter(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// If given a dot file path, send forbidden
		if api.isDotPath(r.URL.Path) == true {
			http.Error(w, "Forbidden", 403)
			api.logResponse(r, 403, fmt.Errorf("Forbidden, requested a dot path"))
			return
		}
		// If we make it this far, fall back to the default handler
		next.ServeHTTP(w, r)
	})
}

// PeopleAPI handles the people/person requests
func (api *API) PeopleAPI(w http.ResponseWriter, r *http.Request) {
	fmt.Fprintf(w, "PeopleAPI not implemented")
}

func (api *API) VocabularyAPI(w http.ResponseWriter, r *http.Request) {
	var (
		err        error
		src        []byte
		args       []string
		voc, vocId string
	)
	args = strings.Split(r.URL.Path, "/")[1:]
	if len(args) < 2 {
		http.Error(w, "Bad Request", http.StatusBadRequest)
		api.logResponse(r, 400, fmt.Errorf(`Bad Request`))
		return
	}
	voc, vocId = args[1], ``
	if len(args) > 2 {
		vocId = args[2]
	}
	switch voc {
	case "subject":
		if vocId == "" {
			src, err = jsonEncode(Subject)
		} else if item, ok := Subject[vocId]; ok {
			src, err = jsonEncode(item)
		} else {
			http.NotFound(w, r)
			api.logResponse(r, 404, fmt.Errorf(`Not Found`))
		}
	case "issn":
		if vocId == "" {
			src, err = jsonEncode(ISSN)
		} else if item, ok := ISSN[vocId]; ok {
			src, err = jsonEncode(item)
		} else {
			http.NotFound(w, r)
			api.logResponse(r, 404, fmt.Errorf(`Not Found`))
		}
	case "doi-prefix":
		if vocId == "" {
			src, err = jsonEncode(DoiPrefixes)
		} else if item, ok := DoiPrefixes[vocId]; ok {
			src, err = jsonEncode(item)
		} else {
			http.NotFound(w, r)
			api.logResponse(r, 404, fmt.Errorf(`Not Found`))
		}
	default:
		http.NotFound(w, r)
		api.logResponse(r, 404, fmt.Errorf(`Not Found`))
		return
	}
	api.packageJSON(w, r, src, err)
}

func (api *API) RouteHandler(w http.ResponseWriter, r *http.Request) {
	api.logRequest(w, r)
	switch {
	case r.URL.Path == "/" || r.URL.Path == "/index.html":
		http.Redirect(w, r, "/app/", 301)
		api.logResponse(r, 301, fmt.Errorf(`Redirected to "/app/"`))
	case strings.HasSuffix(r.URL.Path, "/help"):
		http.Redirect(w, r, "/app/index.html", 301)
		api.logResponse(r, 301, fmt.Errorf(`Redirected to "/app/index.html"`))
	case strings.HasPrefix(r.URL.Path, "/api/version"):
		fmt.Fprintf(w, "%s %s\n", api.AppName, Version)
		api.logResponse(r, 202, nil)
	case strings.HasPrefix(r.URL.Path, "/api/people"):
		api.PeopleAPI(w, r)
	//case strings.HasPrefix(r.URL.Path, "/api/group"):
	case strings.HasPrefix(r.URL.Path, "/api/subject"):
		api.VocabularyAPI(w, r)
	case strings.HasPrefix(r.URL.Path, "/api/issn"):
		api.VocabularyAPI(w, r)
	case strings.HasPrefix(r.URL.Path, "/api/doi-prefix"):
		api.VocabularyAPI(w, r)
	default:
		http.NotFound(w, r)
		api.logResponse(r, 404, fmt.Errorf(`Not Found`))
	}
}

func DisplayLicense(out io.Writer, appName string, license string) {
	fmt.Fprintf(out, strings.ReplaceAll(strings.ReplaceAll(license, "{app_name}", appName), "{version}", Version))
}

func DisplayVersion(out io.Writer, appName string) {
	fmt.Fprintf(out, "%s %s\n", appName, Version)
}

func DisplayUsage(out io.Writer, appName string, flagSet *flag.FlagSet, description string, examples string, license string) {
	// Convert {app_name} and {version} in description
	if description != "" {
		fmt.Fprintf(out, strings.ReplaceAll(description, "{app_name}", appName))
	}
	flagSet.SetOutput(out)
	flagSet.PrintDefaults()

	if examples != "" {
		fmt.Fprintf(out, strings.ReplaceAll(examples, "{app_name}", appName))
	}
	if license != "" {
		DisplayLicense(out, appName, license)
	}
}

func (api *API) Startup() {
	api.log.Printf("Listening on http://%s\n", api.Cfg.Hostname)
}

// Shutdown shutdowns the API web service
func (api *API) Shutdown(sigName string) int {
	exitCode := 0
	pid := os.Getpid()
	api.log.Printf(`Received signal %s\n`, sigName)
	api.log.Printf(`Closing database connections %s pid: %d\n`, api.AppName, pid)
	if err := CloseConnection(api.Cfg); err != nil {
		exitCode = 1
	}
	api.log.Printf(`Shutdown completed %s pid: %d exit code: %d\n`, api.AppName, pid, exitCode)
	/*
		if api.logOutput != os.Stderr {
			if err := api.logOutput.Close(); err != nil {
				fmt.Fprintf(os.Stderr, "%s\n", err)
				exitCode = 1
			}
		}
	*/
	return exitCode
}

// Reload performs a Shutdown and an Init after re-reading
// in the settings.json file.
func (api *API) Reload(sigName string) error {
	settings := api.Settings
	exitCode := api.Shutdown(sigName)
	if exitCode != 0 {
		return fmt.Errorf("Reload failed, could not shutdown the current processes")
	}
	fmt.Fprintf(os.Stderr, "Restarting %s using %s", api.AppName, settings)
	return api.Init(api.AppName, settings)
}

func (api *API) Init(appName string, settings string) error {
	api.AppName = appName
	api.Settings = settings
	cfg, err := LoadConfig(settings)
	if err != nil {
		return err
	}
	api.Cfg = cfg
	if api.Cfg.Logfile == `` {
		api.log = log.Default()
	} else {
		fp, err := os.OpenFile(api.Cfg.Logfile, os.O_APPEND|os.O_CREATE|os.O_WRONLY, 0644)
		if err != nil {
			return err
		}
		api.log = log.New(fp, "log: ", log.Lshortfile)
	}
	if api.Cfg.Hostname == `` {
		api.Cfg.Hostname = `localhost:8486`
	}
	if err := OpenConnection(api.Cfg); err != nil {
		return fmt.Errorf(`Failed to open database connections, %s`, err)
	}
	return nil
}

func (api *API) Run() error {
	/* Setup web server */
	api.log.Printf(`
%s %s

Using configuration %s

Process id: %d

EPrints 3.3.x Extended API

Listening on http://%s

Press ctl-c to terminate.
`, api.AppName, Version, api.Settings, os.Getpid(), api.Cfg.Hostname)

	/* Listen for Ctr-C or signals */
	processControl := make(chan os.Signal, 1)
	signal.Notify(processControl, syscall.SIGINT, syscall.SIGHUP, syscall.SIGTERM)
	go func() {
		sig := <-processControl
		switch sig {
		case syscall.SIGINT:
			os.Exit(api.Shutdown(sig.String()))
		case syscall.SIGTERM:
			os.Exit(api.Shutdown(sig.String()))
		case syscall.SIGHUP:
			if err := api.Reload(sig.String()); err != nil {
				api.log.Println(err)
				os.Exit(1)
			}
		default:
			os.Exit(api.Shutdown(sig.String()))
		}
	}()

	fs := api.requestLogger(http.FileServer(http.Dir(api.Cfg.Htdocs)))
	http.Handle("/app/", http.StripPrefix("/app/", fs))
	http.Handle("/css/", fs)
	http.Handle("/assets/", fs)
	http.Handle("/widgets/", fs)
	http.Handle("/index.html", fs)
	http.HandleFunc("/", api.RouteHandler)
	return http.ListenAndServe(api.Cfg.Hostname, nil)
}
