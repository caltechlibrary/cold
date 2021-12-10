package cold

//
// cold.go provides crosswalk methods to/from SQL
//
import (
	"database/sql"
	"fmt"

	_ "github.com/go-sql-driver/mysql"
)

const (
	// timestamp holds the Format of a MySQL time field
	timestamp = `2006-01-02 15:04:05`
	datestamp = `2006-01-02`
)

//
// DB SQL functions.
//

// OpenConnection
func OpenConnection(config *Config) error {
	db, err := sql.Open(config.DSType, config.DSN)
	if err != nil {
		return fmt.Errorf("could not open %q connection, %s", config.DSType, err)
	}
	config.Connection = db
	return nil
}

// CloseConnection
func CloseConnection(config *Config) error {
	if config.Connection == nil {
		return fmt.Errorf("no connection defined")
	}
	db := config.Connection
	if err := db.Close(); err != nil {
		return fmt.Errorf("Failed to close, %s", err)
	}
	return nil
}

// sqlQueryStringIDs takes a repostory ID, a SQL statement and applies
// the args returning a list of string type id or error.
func sqlQueryStringIDs(config *Config, stmt string, args ...interface{}) ([]string, error) {
	db := config.Connection
	rows, err := db.Query(stmt, args...)
	if err != nil {
		return nil, fmt.Errorf("ERROR: query error, %s", err)
	}
	defer rows.Close()
	value := ``
	values := []string{}
	for rows.Next() {
		err := rows.Scan(&value)
		if err == nil {
			values = append(values, value)
		} else {
			return nil, fmt.Errorf("ERROR: scan error, %q, %s", stmt, err)
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("ERROR: rows error, %s", err)
	}
	if err != nil {
		return nil, fmt.Errorf("ERROR: query error, %s", err)
	}
	return values, nil
}

// GetAllPersonID returns a list of cl_people_id in the people table
func GetAllPersonID(config *Config) ([]string, error) {
	stmt := `SELECT cl_people_id FROM people ORDER BY cl_people_id GROUP BY cl_people_id`
	return sqlQueryStringIDs(config, stmt)
}

// GetPerson returns a list of all usernames in a repository
func GetPerson(config *Config, clPersonID string) ([]string, error) {
	stmt := `SELECT cl_people_id, object FROM people WHERE cl_people_id = ?`
	return sqlQueryStringIDs(config, stmt, clPersonID)
}

func SQLCreatePerson(config *Config, person *Person) error {
	db := config.Connection
	stmt := fmt.Sprintf(`INSERT INTO people (cl_people_id, object) VALUES (?,?)`)
	_, err := db.Exec(stmt, person.CLPeopleID, person.String())
	return err
}

func SQLUpdatePerson(config *Config, person *Person) error {
	db := config.Connection
	stmt := fmt.Sprintf(`REPLACE INTO people (cl_people_id, object) VALUES (?, ?)`)
	_, err := db.Exec(stmt, person.CLPeopleID, person.String())
	return err
}

func SQLReadPerson(config *Config, clPersonID string) (*Person, error) {
	return nil, fmt.Errorf(`SQLReadPerson(%+v, %s) not implememented`, config, clPersonID)
}

func SQLDeletePerson(config *Config, clPeopleID string) error {
	db := config.Connection
	stmt := `DELETE FROM people WHERE cl_people_id = ?`
	_, err := db.Exec(stmt, clPeopleID)
	return err
}

// GetAllGroupID returns a list of cl_group_id in the group table
func GetAllGroupID(config *Config, clGroupID string) ([]string, error) {
	stmt := `SELECT cl_group_id FROM group ORDER BY cl_group_id GROUP BY cl_group_id`
	return sqlQueryStringIDs(config, stmt)
}

// GetGroup takes a username and returns a list of userid
func GetGroup(config *Config, clGroupID string) ([]string, error) {
	stmt := `SELECT id, cl_group_id, field, value FROM group WHERE cl_group_id = ? ORDER BY cl_group_id, field`
	return sqlQueryStringIDs(config, stmt, clGroupID)
}

func SQLCreateGroup(config *Config, group *Group) error {
	return fmt.Errorf(`SQLCreateGroup(%+v, %s) not implememented`, config, group)
}

func SQLUpdateGroup(config *Config, group *Group) error {
	return fmt.Errorf(`SQLUpdateGroup(%+v, %s) not implememented`, config, group)
}

func SQLReadGroup(config *Config, clGroupID string) (*Group, error) {
	return nil, fmt.Errorf(`SQLReadGroup(%+v, %s) not implememented`, config, clGroupID)
}

func SQLDeleteGroup(config *Config, clGroupID string) error {
	return fmt.Errorf(`SQLDeleteGroup(%+v, %s) not implememented`, config, clGroupID)
}

// GetAllFunderID returns a list of cl_group_id in the group table
func GetAllFunderID(config *Config, clFunderID string) ([]string, error) {
	stmt := `SELECT cl_funder_id FROM funder ORDER BY cl_funder_id GROUP BY cl_funder_id`
	return sqlQueryStringIDs(config, stmt)
}

// GetFunder takes a username and returns a list of userid
func GetFunder(config *Config, clFunderID string) ([]string, error) {
	stmt := `SELECT id, cl_funder_id, field, value FROM funder WHERE cl_funder_id = ? ORDER BY cl_funder_id, field`
	return sqlQueryStringIDs(config, stmt, clFunderID)
}

func SQLCreateFunder(config *Config, funder *Funder) error {
	return fmt.Errorf(`SQLCreateFunder(%+v, %s) not implememented`, config, funder)
}

func SQLUpdateFunder(config *Config, funder *Funder) error {
	return fmt.Errorf(`SQLUpdateFunder(%+v, %s) not implememented`, config, funder)
}

func SQLReadFunder(config *Config, clFunderID string) (*Funder, error) {
	return nil, fmt.Errorf(`SQLReadFunder(%+v, %s) not implememented`, config, clFunderID)
}

func SQLDeleteFunder(config *Config, clFunderID string) error {
	return fmt.Errorf(`SQLDeleteFunder(%+v, %s) not implememented`, config, clFunderID)
}
