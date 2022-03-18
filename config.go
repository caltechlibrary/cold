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

//
// Service configuration management
//

import (
	"database/sql"
	"fmt"
	"io/ioutil"
)

// Config holds a configuration file structure used by EPrints Extended API
// Configuration file is expected to be in JSON format.
type Config struct {
	// Hostname (and port) for running service, e.g. localhost:8486
	Hostname string `json:"hostname"`

	// BaseURL is the URL used to resolve relative paths browser side
	// E.g. the base URL generated in `/widgets/config.js`.
	BaseURL string `json:"base_url"`

	// Htdocs holds static pages, help and Widgets
	Htdocs string `json:"htdocs"`

	// PrefixPath is the partial URL path used as a "base" href
	// by web pages. This allows for controlling the expected path
	// in a reverse proxy deployment.
	PrefixPath string `json:"prefix_path"`

	// Logfile
	Logfile string `json:"logfile,omitempty"`

	// DSType (e.g. the database type: "mysql", "postgres")
	DSType string `json:"db_type,omitempty"`

	// DSN holds the data source name used to connect to the database
	DSN string `json:"dsn,omitempty"`

	// Connection holds database connection
	Connection *sql.DB `json:"-"`
}

func CheckConfig(cfg *Config) error {
	if cfg.DSN == "" {
		return fmt.Errorf(`"dsn" not set, required`)
	}
	return nil
}

// LoadConfig reads a JSON file and returns a Config structure
// or error.
func LoadConfig(fname string) (*Config, error) {
	config := new(Config)
	if src, err := ioutil.ReadFile(fname); err != nil {
		return nil, err
	} else {
		// Since we should be OK, unmarshal in into active config
		if err = jsonDecode(src, &config); err != nil {
			return nil, fmt.Errorf("Unmarshaling %q failed, %s", fname, err)
		}
		if config.Hostname == "" {
			config.Hostname = "localhost:8486"
		}
		if config.DSType == "" {
			config.DSType = "mysql"
		}
		if config.Htdocs == "" {
			config.Htdocs = "htdocs"
		}
		if config.PrefixPath == "" {
			config.PrefixPath = ""
		}
		if config.BaseURL == "" {
			config.BaseURL = fmt.Sprintf(`http://%s/`, config.Hostname)
		}
	}
	return config, nil
}
