//
// cold package is a Go service for managing controlled object lists and vocavularies for Caltech Library.
//
// @author R. S. Doiel, <rsdoiel@caltech.edu>
//
// Copyright (c) 2022, Caltech
// All rights not granted herein are expressly reserved by Caltech.
//
// Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
//
// 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
//
// 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
//
// 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
//
// THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
//
package cold

import (
	"flag"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"net/http"
	"net/url"
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
		src         []byte
		err         error
		clPeopleID  string
		requestPath string
	)
	requestPath = r.URL.Path
	if api.Cfg.PrefixPath != "" {
		requestPath = strings.TrimPrefix(r.URL.Path, api.Cfg.PrefixPath)
	}
	args := strings.Split(requestPath, "/")
	if len(args) > 3 {
		clPeopleID = strings.Join(args[3:], "/")
	}
	if r.Method == `GET` || r.Method == `HEAD` {
		if clPeopleID == `` {
			clPeopleIDs, err := GetAllPeopleID(api.Cfg)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("GetAllPeopleID: %s", err))
				return
			}
			src, err = jsonEncode(clPeopleIDs)
			api.packageJSON(w, r, src, err)
		} else {
			obj, err := GetPeople(api.Cfg, clPeopleID)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("GetPeople(%q): %s", clPeopleID, err))
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
			obj := new(People)
			err = jsonDecode(src, &obj)
			if err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, json decode %s", clPeopleID, err))
				return
			}
			switch r.Method {
			case `PUT`:
				err = CreatePeople(api.Cfg, obj)
				if err != nil {
					http.Error(w, "Internal Server Error", http.StatusInternalServerError)
					api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, create person %s", clPeopleID, err))
					return
				}
			case `POST`:
				err = UpdatePeople(api.Cfg, obj)
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
			if err := DeletePeople(api.Cfg, clPeopleID); err != nil {
				http.Error(w, "Internal Server Error", http.StatusInternalServerError)
				api.logResponse(r, http.StatusInternalServerError, fmt.Errorf("id: %q, delete person %s", clPeopleID, err))
				return
			}
			return
		}
	}
	// Method is not implemented or not supported
	err = fmt.Errorf("PeopleAPI: %s not allowed", r.Method)
	api.logResponse(r, http.StatusMethodNotAllowed, fmt.Errorf("PeopleAPI: %s", err))
	http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
}

// GroupAPI handles the group requests
func (api *API) GroupAPI(w http.ResponseWriter, r *http.Request) {
	var (
		src         []byte
		err         error
		clGroupID   string
		requestPath string
	)
	requestPath = r.URL.Path
	if api.Cfg.PrefixPath != "" {
		requestPath = strings.TrimPrefix(r.URL.Path, api.Cfg.PrefixPath)
	}
	args := strings.Split(requestPath, "/")
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
		src         []byte
		err         error
		clFunderID  string
		requestPath string
	)
	requestPath = r.URL.Path
	if api.Cfg.PrefixPath != "" {
		requestPath = strings.TrimPrefix(r.URL.Path, api.Cfg.PrefixPath)
	}
	args := strings.Split(requestPath, "/")
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
		err         error
		src         []byte
		args        []string
		voc, vocId  string
		requestPath string
	)
	requestPath = r.URL.Path
	if api.Cfg.PrefixPath != "" {
		requestPath = strings.TrimPrefix(r.URL.Path, api.Cfg.PrefixPath)
	}

	args = strings.Split(requestPath, "/")[1:]
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

// Crosswalk takes a collection, field path and value and returns a list of ids or error
func (api *API) Crosswalk(w http.ResponseWriter, r *http.Request) {
	var (
		err         error
		src         []byte
		args        []string
		requestPath string
	)
	requestPath = r.URL.Path
	if api.Cfg.PrefixPath != "" {
		requestPath = strings.TrimPrefix(r.URL.Path, api.Cfg.PrefixPath)
	}

	args = strings.Split(requestPath, "/")[3:]
	if len(args) != 3 {
		http.Error(w, `Bad Request`, http.StatusBadRequest)
		api.logResponse(r, http.StatusBadRequest, fmt.Errorf(`bad request, collection name, expected field name and value %+v`, args))
		return
	}
	ids, err := Crosswalk(api.Cfg, args[0], args[1], args[2])
	if err != nil {
		api.packageJSON(w, r, src, err)
		return
	}
	src, err = jsonEncode(ids)
	api.packageJSON(w, r, src, err)
}

func (api *API) APIRouteHandler(w http.ResponseWriter, r *http.Request) {
	var requestPath string
	api.logRequest(w, r)
	// NOTE: We need to strip the prefix path to normalize the expected
	// API path call.
	requestPath = r.URL.Path
	if api.Cfg.PrefixPath != "" {
		requestPath = strings.TrimPrefix(r.URL.Path, api.Cfg.PrefixPath)
	}
	fmt.Printf("DEBUG requestPath -> %q\n", requestPath)

	switch {
	case strings.HasPrefix(requestPath, "/api/version"):
		w.Header().Set("Content-Type", "application/json")
		fmt.Fprintf(w, `{
	"application_name": %q, 
	"version": %q
}`, api.AppName, Version)
		api.logResponse(r, http.StatusOK, nil)
	case strings.HasPrefix(requestPath, "/api/people"):
		api.PeopleAPI(w, r)
	case strings.HasPrefix(requestPath, "/api/group"):
		api.GroupAPI(w, r)
	case strings.HasPrefix(requestPath, "/api/crosswalk"):
		api.Crosswalk(w, r)
	case strings.HasPrefix(requestPath, "/api/funder"):
		api.FunderAPI(w, r)
	case strings.HasPrefix(requestPath, "/api/subject"):
		api.VocabularyAPI(w, r)
	case strings.HasPrefix(requestPath, "/api/issn"):
		api.VocabularyAPI(w, r)
	case strings.HasPrefix(requestPath, "/api/doi-prefix"):
		api.VocabularyAPI(w, r)
	default:
		http.NotFound(w, r)
		api.logResponse(r, http.StatusNotFound, fmt.Errorf(`not found`))
	}
}

func (api *API) calcRedirect(newPathPart string) string {
	u := new(url.URL)
	//u.Host = api.Cfg.Hostname
	u.Path = path.Join(api.Cfg.PrefixPath, newPathPart)
	return u.String()
}

func (api *API) RedirectToApp(w http.ResponseWriter, r *http.Request) {
	api.logRequest(w, r)
	// NOTE: We need to strip the prefix path to normalize the expected
	// API path call.
	switch {
	case strings.HasSuffix(r.URL.Path, "/version"):
		http.Redirect(w, r, api.calcRedirect("/api/version"), http.StatusPermanentRedirect)
		api.logResponse(r, http.StatusPermanentRedirect, nil)
	case strings.HasSuffix(r.URL.Path, "/favicon.ico"):
		http.Redirect(w, r, api.calcRedirect("/app/favicon.ico"), http.StatusPermanentRedirect)
		api.logResponse(r, http.StatusPermanentRedirect, nil)
	case strings.HasSuffix(r.URL.Path, "/index.html"):
		http.Redirect(w, r, api.calcRedirect("/app/"), http.StatusPermanentRedirect)
		api.logResponse(r, http.StatusPermanentRedirect, nil)
	case strings.HasSuffix(r.URL.Path, "/"):
		http.Redirect(w, r, api.calcRedirect("/app/"), http.StatusPermanentRedirect)
		api.logResponse(r, http.StatusPermanentRedirect, nil)
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

Cold (Controlled Object Lists Daemon)

Listening on %s

Prefix Path: %s

Htdocs: %s

Log status: %s
Press ctl-c to terminate.
`, api.AppName, Version, api.Settings, os.Getpid(), api.Cfg.Hostname, api.Cfg.PrefixPath, api.Cfg.Htdocs, logStatus)

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

	appPrefixPath := fmt.Sprintf("%s/app/", api.Cfg.PrefixPath)
	apiPrefixPath := fmt.Sprintf("%s/api/", api.Cfg.PrefixPath)
	fs := api.requestLogger(api.staticRouter(http.FileServer(http.Dir(api.Cfg.Htdocs))))
	http.Handle(appPrefixPath, http.StripPrefix(appPrefixPath, fs))
	if api.Cfg.DisableRootRedirects == false {
		if api.Cfg.PrefixPath != "" {
			http.HandleFunc(fmt.Sprintf("%s/version", api.Cfg.PrefixPath), api.RedirectToApp)
			http.HandleFunc(fmt.Sprintf("%s/index.html", api.Cfg.PrefixPath), api.RedirectToApp)
			http.HandleFunc(fmt.Sprintf("%s/favicon.ico", api.Cfg.PrefixPath), api.RedirectToApp)
			http.HandleFunc(fmt.Sprintf("%s/", api.Cfg.PrefixPath), api.RedirectToApp)
		}
		http.HandleFunc("/version", api.RedirectToApp)
		http.HandleFunc("/index.html", api.RedirectToApp)
		http.HandleFunc("/favicon.ico", api.RedirectToApp)
		http.HandleFunc("/", api.RedirectToApp)
	}
	http.HandleFunc(apiPrefixPath, api.APIRouteHandler)
	return http.ListenAndServe(api.Cfg.Hostname, nil)
}
