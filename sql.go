package cold

//
// cold.go provides crosswalk methods to/from SQL
//
import (
	"database/sql"
	"fmt"
	"strings"
	"time"

	_ "github.com/go-sql-driver/mysql"
)

const (
	// timestamp holds the Format of a MySQL time field
	timestamp = `2006-01-02 15:04:05`
	datestamp = `2006-01-02`
)

func isErrorMsg(err error, s string) bool {
	if err == nil {
		if s == "" {
			return true
		} else {
			return false
		}
	}
	return strings.TrimSpace(fmt.Sprintf("%s", err)) == strings.TrimSpace(s)
}

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
		return fmt.Errorf("failed to close, %s", err)
	}
	return nil
}

// sqlQueryStringIDs takes a SQL statement and applies
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

// sqlQueryObject takes a SQL statement, populates an object and returns an error value
func sqlQueryObject(config *Config, stmt string, id string, obj interface{}) error {
	db := config.Connection
	rows, err := db.Query(stmt, id)
	if err != nil {
		return fmt.Errorf("ERROR: query error, %s", err)
	}
	defer rows.Close()
	value := ``
	for rows.Next() {
		if err := rows.Scan(&value); err != nil {
			return fmt.Errorf("ERROR: scan error, %q, %s", stmt, err)
		}
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("ERROR: rows error, %s", err)
	}
	if err != nil {
		return fmt.Errorf("ERROR: query error, %s", err)
	}
	if len(value) == 0 {
		obj = nil
		return fmt.Errorf("not found")
	}
	return jsonDecode([]byte(value), &obj)
}

// GetAllPeopleID returns a list of cl_people_id in the person table
func GetAllPeopleID(config *Config) ([]string, error) {
	stmt := `SELECT cl_people_id FROM person ORDER BY cl_people_id`
	return sqlQueryStringIDs(config, stmt)
}

// GetPeople returns a list of all usernames in a repository
func GetPeople(config *Config, clPeopleID string) (*People, error) {
	stmt := `SELECT object FROM person WHERE cl_people_id = ?`
	obj := new(People)
	//	obj.Name = new(Name)
	err := sqlQueryObject(config, stmt, clPeopleID, &obj)
	if isErrorMsg(err, "not found") {
		return nil, nil
	}
	return obj, err
}

// CreatePeople will add a "person" to the database. It
// has a side effect of populating. Created if it was empty.
func CreatePeople(config *Config, person *People) error {
	db := config.Connection
	if person.Created == `` {
		person.Created = time.Now().Format(timestamp)
	}
	stmt := `INSERT INTO person (cl_people_id, object) VALUES (?,?)`
	_, err := db.Exec(stmt, person.CLPeopleID, person.String())
	return err
}

// UpdatePeople will update a "person" in the database. It
// has a side effect of populating/updating .Updated attribute.
func UpdatePeople(config *Config, person *People) error {
	db := config.Connection
	person.Updated = time.Now().Format(timestamp)
	stmt := `REPLACE INTO person (cl_people_id, object) VALUES (?,?)`
	_, err := db.Exec(stmt, person.CLPeopleID, person.String())
	return err
}

func DeletePeople(config *Config, clPeopleID string) error {
	db := config.Connection
	stmt := `DELETE FROM person WHERE cl_people_id = ?`
	_, err := db.Exec(stmt, clPeopleID)
	return err
}

// GetAllGroupID returns a list of cl_group_id in the group table
func GetAllGroupID(config *Config) ([]string, error) {
	stmt := `SELECT cl_group_id FROM local_group ORDER BY cl_group_id`
	return sqlQueryStringIDs(config, stmt)
}

// GetGroup takes a group id and returns a group object and error
func GetGroup(config *Config, clGroupID string) (*Group, error) {
	stmt := `SELECT object FROM local_group WHERE cl_group_id = ?`
	obj := new(Group)
	err := sqlQueryObject(config, stmt, clGroupID, &obj)
	if isErrorMsg(err, "not found") {
		return nil, nil
	}
	return obj, err
}

// CreateGroup will add a "group" to the database. It
// has a side effect of populating .Created if it was empty.
func CreateGroup(config *Config, group *Group) error {
	db := config.Connection
	if group.Updated == `` {
		group.Updated = time.Now().Format(timestamp)
	}
	stmt := `INSERT INTO local_group (cl_group_id, object) VALUES (?,?)`
	_, err := db.Exec(stmt, group.CLGroupID, group.String())
	return err
}

// UpdateGroup will update a "group" in the database. It
// has a side effect of populating/updating .Updated attribute.
func UpdateGroup(config *Config, group *Group) error {
	db := config.Connection
	group.Updated = time.Now().Format(timestamp)
	stmt := `REPLACE INTO local_group (cl_group_id, object) VALUES (?,?)`
	_, err := db.Exec(stmt, group.CLGroupID, group.String())
	return err
}

func DeleteGroup(config *Config, clGroupID string) error {
	db := config.Connection
	stmt := `DELETE FROM local_group WHERE cl_group_id = ?`
	_, err := db.Exec(stmt, clGroupID)
	return err
}

// GetAllFunderID returns a list of cl_group_id in the group table
func GetAllFunderID(config *Config) ([]string, error) {
	stmt := `SELECT cl_funder_id FROM funder ORDER BY cl_funder_id`
	return sqlQueryStringIDs(config, stmt)
}

// GetFunder takes a username and returns a list of userid
func GetFunder(config *Config, clFunderID string) (*Funder, error) {
	stmt := `SELECT object FROM funder WHERE cl_funder_id = ?`
	obj := new(Funder)
	err := sqlQueryObject(config, stmt, clFunderID, &obj)
	if isErrorMsg(err, "not found") {
		return nil, nil
	}
	return obj, err
}

// CreateFunder will add a "funder" to the database. It
// has a side effect of populating .Created if it was empty.
func CreateFunder(config *Config, funder *Funder) error {
	db := config.Connection
	if funder.Created == `` {
		funder.Created = time.Now().Format(timestamp)
	}
	stmt := `INSERT INTO funder (cl_funder_id, object) VALUES (?,?)`
	_, err := db.Exec(stmt, funder.CLFunderID, funder.String())
	return err
}

// UpdateFunder will update a "funder" in the database. It
// has a side effect of populating/updating .Updated attribute.
func UpdateFunder(config *Config, funder *Funder) error {
	db := config.Connection
	funder.Updated = time.Now().Format(timestamp)
	stmt := `REPLACE INTO funder (cl_funder_id, object) VALUES (?,?)`
	_, err := db.Exec(stmt, funder.CLFunderID, funder.String())
	return err
}

func DeleteFunder(config *Config, clFunderID string) error {
	db := config.Connection
	stmt := `DELETE FROM funder WHERE cl_funder_id = ?`
	_, err := db.Exec(stmt, clFunderID)
	return err
}
