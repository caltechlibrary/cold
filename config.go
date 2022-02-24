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
		if config.BaseURL == "" {
			config.BaseURL = fmt.Sprintf(`http://%s/`, config.Hostname)
		}
	}
	return config, nil
}
