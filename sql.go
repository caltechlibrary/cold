package cold

//
// cold.go provides crosswalk methods to/from SQL
//
import (
	"database/sql"
	"fmt"
	"time"

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
		err := rows.Scan(&value)
		if err != nil {
			return fmt.Errorf("ERROR: scan error, %q, %s", stmt, err)
		}
		break
	}
	if err := rows.Err(); err != nil {
		return fmt.Errorf("ERROR: rows error, %s", err)
	}
	if err != nil {
		return fmt.Errorf("ERROR: query error, %s", err)
	}
	return jsonDecode([]byte(value), &obj)
}

// GetAllPersonID returns a list of cl_people_id in the person table
func GetAllPersonID(config *Config) ([]string, error) {
	stmt := `SELECT cl_people_id FROM person ORDER BY cl_people_id GROUP BY cl_people_id`
	return sqlQueryStringIDs(config, stmt)
}

// GetPerson returns a list of all usernames in a repository
func GetPerson(config *Config, clPeopleID string) ([]string, error) {
	stmt := `SELECT object FROM person WHERE cl_people_id = ?`
	return sqlQueryStringIDs(config, stmt, clPeopleID)
}

// SQLCreatePerson will add a "person" to the database. It
// has a side effect of populating .Created if it was empty.
func SQLCreatePerson(config *Config, person *Person) error {
	db := config.Connection
	if person.Created == `` {
		person.Created = time.Now().Format(timestamp)
	}
	stmt := fmt.Sprintf(`INSERT INTO person (cl_people_id, object) VALUES (?,?)`)
	_, err := db.Exec(stmt, person.CLPeopleID, person.String())
	return err
}

// SQLUpdatePerson will update a "person" in the database. It
// has a side effect of populating/updating .Updated attribute.
func SQLUpdatePerson(config *Config, person *Person) error {
	db := config.Connection
	person.Updated = time.Now().Format(timestamp)
	stmt := fmt.Sprintf(`REPLACE INTO person (cl_people_id, object) VALUES (?,?)`)
	_, err := db.Exec(stmt, person.CLPeopleID, person.String())
	return err
}

func SQLReadPerson(config *Config, clPeopleID string) (*Person, error) {
	stmt := `SELECT object FROM person WHERE cl_people_id = ?`
	obj := new(Person)
	obj.Name = new(Name)
	err := sqlQueryObject(config, stmt, clPeopleID, &obj)
	return obj, err
}

func SQLDeletePerson(config *Config, clPeopleID string) error {
	db := config.Connection
	stmt := `DELETE FROM person WHERE cl_people_id = ?`
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

// SQLCreateGroup will add a "group" to the database. It
// has a side effect of populating .Created if it was empty.
func SQLCreateGroup(config *Config, group *Group) error {
	db := config.Connection
	if group.Created == `` {
		group.Created = time.Now().Format(timestamp)
	}
	stmt := fmt.Sprintf(`INSERT INTO local_group (cl_group_id, object) VALUES (?,?)`)
	_, err := db.Exec(stmt, group.CLGroupID, group.String())
	return err
}

// SQLUpdateGroup will update a "group" in the database. It
// has a side effect of populating/updating .Updated attribute.
func SQLUpdateGroup(config *Config, group *Group) error {
	db := config.Connection
	group.Updated = time.Now().Format(timestamp)
	stmt := fmt.Sprintf(`REPLACE INTO local_group (cl_group_id, object) VALUES (?,?)`)
	_, err := db.Exec(stmt, group.CLGroupID, group.String())
	return err
}

func SQLReadGroup(config *Config, clGroupID string) (*Group, error) {
	stmt := `SELECT object FROM group WHERE cl_group_id = ?`
	obj := new(Group)
	err := sqlQueryObject(config, stmt, clGroupID, &obj)
	return obj, err
}

func SQLDeleteGroup(config *Config, clGroupID string) error {
	db := config.Connection
	stmt := `DELETE FROM group WHERE cl_group_id = ?`
	_, err := db.Exec(stmt, clGroupID)
	return err
}

// GetAllFunderID returns a list of cl_group_id in the group table
func GetAllFunderID(config *Config, clFunderID string) ([]string, error) {
	stmt := `SELECT cl_funder_id FROM funder ORDER BY cl_funder_id GROUP BY cl_funder_id`
	return sqlQueryStringIDs(config, stmt)
}

// GetFunder takes a username and returns a list of userid
func GetFunder(config *Config, clFunderID string) ([]string, error) {
	stmt := `SELECT object FROM funder WHERE cl_funder_id = ?`
	return sqlQueryStringIDs(config, stmt, clFunderID)
}

// SQLCreateFunder will add a "funder" to the database. It
// has a side effect of populating .Created if it was empty.
func SQLCreateFunder(config *Config, funder *Funder) error {
	db := config.Connection
	if funder.Created == `` {
		funder.Created = time.Now().Format(timestamp)
	}
	stmt := fmt.Sprintf(`INSERT INTO funder (cl_funder_id, object) VALUES (?,?)`)
	_, err := db.Exec(stmt, funder.CLFunderID, funder.String())
	return err
}

// SQLUpdateFunder will update a "funder" in the database. It
// has a side effect of populating/updating .Updated attribute.
func SQLUpdateFunder(config *Config, funder *Funder) error {
	db := config.Connection
	funder.Updated = time.Now().Format(timestamp)
	stmt := fmt.Sprintf(`REPLACE INTO funder (cl_funder_id, object) VALUES (?,?)`)
	_, err := db.Exec(stmt, funder.CLFunderID, funder.String())
	return err
}

func SQLReadFunder(config *Config, clFunderID string) (*Funder, error) {
	stmt := `SELECT object FROM funder WHERE cl_funder_id = ?`
	obj := new(Funder)
	err := sqlQueryObject(config, stmt, clFunderID, &obj)
	return obj, err
}

func SQLDeleteFunder(config *Config, clFunderID string) error {
	db := config.Connection
	stmt := `DELETE FROM funder WHERE cl_funder_id = ?`
	_, err := db.Exec(stmt, clFunderID)
	return err
}
