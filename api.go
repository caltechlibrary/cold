package cold

import (
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path"
	"strings"
	"syscall"
)

const (
	LogQuiet = iota
	LogErrorsOnly
	LogResponses
	LogRequests
	LogVerbose
)

type API struct {
	AppName  string
	Settings string
	Cfg      *Config
	log      *log.Logger
	logMode  int
}

// packageJSON takes a writer, request, src and error packing up
// the http response.
func (api *API) packageJSON(w http.ResponseWriter, r *http.Request, src []byte, err error) {
	if err != nil {
		http.NotFound(w, r)
		api.logResponse(r, http.StatusNotFound, fmt.Errorf(`not found, %s`, err))
		return
	}
	w.Header().Set("Content-Type", "application/json")
	if r.Method == `HEAD` {
		fmt.Fprintf(w, "")
		return
	}
	fmt.Fprintf(w, "%s", src)
}

// isDotPath checks to see if a path is requested with a dot file (e.g. docs/.git/* or docs/.htaccess)
func (api *API) isDotPath(p string) bool {
	for _, part := range strings.Split(path.Clean(p), "/") {
		if (!strings.HasPrefix(part, "..")) && strings.HasPrefix(part, ".") && len(part) > 1 {
			return true
		}
	}
	return false
}

// logRequest logs a request based on writer and request
func (api *API) logRequest(w http.ResponseWriter, r *http.Request) {
	if api.logMode == LogRequests || api.logMode == LogVerbose {
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
}

// requestLogger logs the request based on the request object passed into it.
func (api *API) requestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		api.logRequest(w, r)
		next.ServeHTTP(w, r)
	})
}

// logResponse logs the response based on a request, status and error message
func (api *API) logResponse(r *http.Request, status int, err error) {
	if api.logMode == LogQuiet {
		return
	}
	var (
		msg       string
		statusMsg string
	)
	if err == nil {
		statusMsg = http.StatusText(status)
	} else {
		statusMsg = fmt.Sprintf("%s, %s", http.StatusText(status), err)
	}
	q := r.URL.Query()
	if len(q) > 0 {
		msg = fmt.Sprintf("Response: %s Path: %s RemoteAddr: %s UserAgent: %s Query: %+v Status: %d, %s", r.Method, r.URL.Path, r.RemoteAddr, r.UserAgent(), q, status, statusMsg)
	} else {
		msg = fmt.Sprintf("Response: %s Path: %s RemoteAddr: %s UserAgent: %s Status: %d, %s", r.Method, r.URL.Path, r.RemoteAddr, r.UserAgent(), status, statusMsg)
	}
	switch api.logMode {
	case LogErrorsOnly:
		if err != nil && status >= 500 {
			api.log.Printf("%s %q\n", msg, err)
		}
	case LogResponses:
		if err != nil && status >= 400 {
			api.log.Printf("%s %q\n", msg, err)
		} else if status >= 400 {
			api.log.Println(msg)
		}
	default:
		// LogVerbose
		if err != nil {
			api.log.Printf("%s %q\n", msg, err)
		} else {
			api.log.Println(msg)
		}
	}
}

// StaticRouter scans the request object to either add a .html extension or prevent serving a dot file path
func (api *API) staticRouter(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// If given a dot file path, send forbidden
		if api.isDotPath(r.URL.Path) {
			http.Error(w, "Forbidden", http.StatusForbidden)
			api.logResponse(r, http.StatusForbidden, fmt.Errorf("forbidden, requested a dot path"))
			return
		}
		// If we make it this far, fall back to the default handler
		next.ServeHTTP(w, r)
	})
}

// PeopleAPI handles the people/person requests
func (api *API) PeopleAPI(w http.ResponseWriter, r *http.Request) {
	var (
		src        []byte
		err        error
		clPeopleID string
	)
	args := strings.Split(r.URL.Path, "/")
	if len(args) > 3 {
		clPeopleID = strings.Join(args[3:], "/")
	}
	if r.Method == `GET` || r.Method == `HEAD` {
		if clPeopleID == `` {
			clPersonIDs, err := GetAllPersonID(api.Cfg)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("GetAllPersonID: %s", err))
				return
			}
			src, err = jsonEncode(clPersonIDs)
			api.packageJSON(w, r, src, err)
		} else {
			obj, err := GetPerson(api.Cfg, clPeopleID)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("GetPerson(%q): %s", clPeopleID, err))
				return
			}
			if obj == nil {
				http.Error(w, "Not Found", http.StatusNotFound)
				api.logResponse(r, http.StatusNotFound, fmt.Errorf("GetPeople(%q): %s", clPeopleID, "not found"))
				return
			}
			src, err = jsonEncode(obj)
			api.packageJSON(w, r, src, err)
		}
		return
	}
	if clPeopleID != `` {
		if r.Method == `PUT` || r.Method == `POST` {
			src, err := ioutil.ReadAll(r.Body)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, read body %s", clPeopleID, err))
				return
			}
			defer r.Body.Close()
			obj := new(Person)
			err = jsonDecode(src, &obj)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, json decode %s", clPeopleID, err))
				return
			}
			switch r.Method {
			case `PUT`:
				err = CreatePerson(api.Cfg, obj)
				if err != nil {
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, create person %s", clPeopleID, err))
					return
				}
			case `POST`:
				err = UpdatePerson(api.Cfg, obj)
				if err != nil {
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, update person %s", clPeopleID, err))
					return
				}

			}
			api.logResponse(r, http.StatusOK, nil)
			http.Error(w, "OK", http.StatusOK)
			return
		}
		if r.Method == `DELETE` {
			if err := DeletePerson(api.Cfg, clPeopleID); err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, delete person %s", clPeopleID, err))
				return
			}
			return
		}
	}
	// Method is not implemented or not supported
	err = fmt.Errorf("PersonAPI: %s not allowed", r.Method)
	api.logResponse(r, http.StatusMethodNotAllowed, fmt.Errorf("PersonAPI: %s", err))
	http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
}

// GroupAPI handles the group requests
func (api *API) GroupAPI(w http.ResponseWriter, r *http.Request) {
	var (
		src       []byte
		err       error
		clGroupID string
	)
	args := strings.Split(r.URL.Path, "/")
	if len(args) > 3 {
		clGroupID = strings.Join(args[3:], "/")
	}
	if r.Method == `GET` || r.Method == `HEAD` {
		if clGroupID == `` {
			clGroupIDs, err := GetAllGroupID(api.Cfg)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("GetAllGroupID: %s", err))
				return
			}
			src, err = jsonEncode(clGroupIDs)
			api.packageJSON(w, r, src, err)
		} else {
			obj, err := GetGroup(api.Cfg, clGroupID)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("GetGroup(%q): %s", clGroupID, err))
				return
			}
			if obj == nil {
				http.Error(w, "Not Found", http.StatusNotFound)
				api.logResponse(r, http.StatusNotFound, fmt.Errorf("GetGroup(%q): %s", clGroupID, "not found"))
				return
			}
			src, err = jsonEncode(obj)
			api.packageJSON(w, r, src, err)
		}
		return
	}
	if clGroupID != "" {
		if r.Method == `PUT` || r.Method == `POST` {
			src, err := ioutil.ReadAll(r.Body)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, read body %s", clGroupID, err))
				return
			}
			defer r.Body.Close()
			obj := new(Group)
			err = jsonDecode(src, &obj)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, json decode %s", clGroupID, err))
				return
			}
			switch r.Method {
			case `PUT`:
				err = CreateGroup(api.Cfg, obj)
				if err != nil {
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, create group %s", clGroupID, err))
					return
				}
			case `POST`:
				err = UpdateGroup(api.Cfg, obj)
				if err != nil {
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, update group %s", clGroupID, err))
					return
				}

			}
			api.logResponse(r, http.StatusOK, nil)
			http.Error(w, "OK", http.StatusOK)
			return
		}
		if r.Method == `DELETE` {
			if err := DeleteGroup(api.Cfg, clGroupID); err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, delete group %s", clGroupID, err))
				return
			}
			return
		}
	}

	// Method is not implemented or not supported
	err = fmt.Errorf("GroupAPI: %s not allowed", r.Method)
	api.logResponse(r, http.StatusMethodNotAllowed, fmt.Errorf("GroupAPI: %s", err))
	http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
}

// FunderAPI handles the funder requests
func (api *API) FunderAPI(w http.ResponseWriter, r *http.Request) {
	var (
		src        []byte
		err        error
		clFunderID string
	)
	args := strings.Split(r.URL.Path, "/")
	if len(args) > 3 {
		clFunderID = strings.Join(args[3:], "/")
	}
	if r.Method == `GET` || r.Method == `HEAD` {
		if clFunderID == `` {
			clFunderIDs, err := GetAllFunderID(api.Cfg)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("GetAllFunderID: %s", err))
				return
			}
			src, err = jsonEncode(clFunderIDs)
			api.packageJSON(w, r, src, err)
		} else {
			obj, err := GetFunder(api.Cfg, clFunderID)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("GetFunder(%q): %s", clFunderID, err))
				return
			}
			if obj == nil {
				http.Error(w, "Not Found", http.StatusNotFound)
				api.logResponse(r, http.StatusNotFound, fmt.Errorf("GetGroup(%q): %s", clFunderID, "not found"))
				return
			}
			src, err = jsonEncode(obj)
			api.packageJSON(w, r, src, err)
		}
		return
	}
	if clFunderID != "" {
		if r.Method == `PUT` || r.Method == `POST` {
			src, err := ioutil.ReadAll(r.Body)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, read body %s", clFunderID, err))
				return
			}
			defer r.Body.Close()
			obj := new(Funder)
			err = jsonDecode(src, &obj)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, json decode %s", clFunderID, err))
				return
			}
			switch r.Method {
			case `PUT`:
				err = CreateFunder(api.Cfg, obj)
				if err != nil {
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, create funder %s", clFunderID, err))
					return
				}
			case `POST`:
				err = UpdateFunder(api.Cfg, obj)
				if err != nil {
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, update funder %s", clFunderID, err))
					return
				}

			}
			api.logResponse(r, http.StatusOK, nil)
			http.Error(w, "OK", http.StatusOK)
			return
		}
		if r.Method == `DELETE` {
			if err := DeleteFunder(api.Cfg, clFunderID); err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, delete funder %s", clFunderID, err))
				return
			}
			return
		}
	}
	// Method is not implemented or not supported
	err = fmt.Errorf("FunderAPI: %s not allowed", r.Method)
	api.logResponse(r, http.StatusMethodNotAllowed, fmt.Errorf("FunderAPI: %s", err))
	http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
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
		api.logResponse(r, http.StatusBadRequest, fmt.Errorf(`bad request`))
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
			api.logResponse(r, http.StatusNotFound, fmt.Errorf(`not found`))
		}
	case "issn":
		if vocId == "" {
			src, err = jsonEncode(ISSN)
		} else if item, ok := ISSN[vocId]; ok {
			src, err = jsonEncode(item)
		} else {
			http.NotFound(w, r)
			api.logResponse(r, http.StatusNotFound, fmt.Errorf(`not found`))
		}
	case "doi-prefix":
		if vocId == "" {
			src, err = jsonEncode(DoiPrefixes)
		} else if item, ok := DoiPrefixes[vocId]; ok {
			src, err = jsonEncode(item)
		} else {
			http.NotFound(w, r)
			api.logResponse(r, http.StatusNotFound, fmt.Errorf(`not found`))
		}
	default:
		http.NotFound(w, r)
		api.logResponse(r, http.StatusNotFound, fmt.Errorf(`not found`))
		return
	}
	api.packageJSON(w, r, src, err)
}

func (api *API) RouteHandler(w http.ResponseWriter, r *http.Request) {
	api.logRequest(w, r)
	switch {
	case r.URL.Path == "/" || r.URL.Path == "/index.html":
		http.Redirect(w, r, "/app/", http.StatusMovedPermanently)
		api.logResponse(r, 301, fmt.Errorf(`redirected to "/app/"`))
	case strings.HasSuffix(r.URL.Path, "/help"):
		http.Redirect(w, r, "/app/api-help.md", http.StatusMovedPermanently)
		api.logResponse(r, 301, fmt.Errorf(`redirected to "/app/index.html"`))
	case strings.HasPrefix(r.URL.Path, "/api/version"):
		fmt.Fprintf(w, "%s %s\n", api.AppName, Version)
		api.logResponse(r, http.StatusOK, nil)
	case strings.HasPrefix(r.URL.Path, "/api/people"):
		api.PeopleAPI(w, r)
	case strings.HasPrefix(r.URL.Path, "/api/group"):
		api.GroupAPI(w, r)
	case strings.HasPrefix(r.URL.Path, "/api/funder"):
		api.FunderAPI(w, r)
	case strings.HasPrefix(r.URL.Path, "/api/subject"):
		api.VocabularyAPI(w, r)
	case strings.HasPrefix(r.URL.Path, "/api/issn"):
		api.VocabularyAPI(w, r)
	case strings.HasPrefix(r.URL.Path, "/api/doi-prefix"):
		api.VocabularyAPI(w, r)
	default:
		http.NotFound(w, r)
		api.logResponse(r, http.StatusNotFound, fmt.Errorf(`not found`))
	}
}

func DisplayLicense(out io.Writer, appName string, license string) {
	fmt.Fprintln(out, strings.ReplaceAll(strings.ReplaceAll(license, "{app_name}", appName), "{version}", Version))
}

func DisplayVersion(out io.Writer, appName string) {
	fmt.Fprintf(out, "%s %s\n", appName, Version)
}

func DisplayUsage(out io.Writer, appName string, flagSet *flag.FlagSet, description string, examples string, license string) {
	// Convert {app_name} and {version} in description
	if description != "" {
		fmt.Fprintln(out, strings.ReplaceAll(description, "{app_name}", appName))
	}
	flagSet.SetOutput(out)
	flagSet.PrintDefaults()

	if examples != "" {
		fmt.Fprintln(out, strings.ReplaceAll(examples, "{app_name}", appName))
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
		return fmt.Errorf("reload failed, could not shutdown the current processes")
	}
	fmt.Fprintf(os.Stderr, "Restarting %s using %s", api.AppName, settings)
	return api.Init(api.AppName, settings, api.logMode)
}

func (api *API) Init(appName string, settings string, logMode int) error {
	api.AppName = appName
	api.Settings = settings
	api.logMode = logMode
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
		return fmt.Errorf(`failed to open database connections, %s`, err)
	}
	return nil
}

func (api *API) Run() error {
	var logStatus string
	switch api.logMode {
	case LogQuiet:
		logStatus = "not logging"
	case LogErrorsOnly:
		logStatus = "logging internal errors only"
	case LogResponses:
		logStatus = "logging responses with status >= 400"
	default:
		// LogVerbose:
		logStatus = "logging requests and responses"
	}
	/* Setup web server */
	api.log.Printf(`
%s %s

Using configuration %s

Process id: %d

EPrints 3.3.x Extended API

Listening on http://%s
Log status: %s
Press ctl-c to terminate.
`, api.AppName, Version, api.Settings, os.Getpid(), api.Cfg.Hostname, logStatus)

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

	fs := api.requestLogger(api.staticRouter(http.FileServer(http.Dir(api.Cfg.Htdocs))))
	http.Handle("/app/", http.StripPrefix("/app/", fs))
	http.Handle("/css/", fs)
	http.Handle("/assets/", fs)
	http.Handle("/widgets/", fs)
	http.Handle("/index.html", fs)
	http.HandleFunc("/", api.RouteHandler)
	return http.ListenAndServe(api.Cfg.Hostname, nil)
}