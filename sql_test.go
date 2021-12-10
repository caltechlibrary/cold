package cold

import (
	"fmt"
	"io/ioutil"
	"os"
	"path"
	"testing"
)

func clearTable(t *testing.T, config *Config, tableName string) {
	db := config.Connection
	if db == nil {
		t.Skipf("can't find connection")
		t.SkipNow()
	}
	stmt := fmt.Sprintf(`DELETE FROM %s`, tableName)
	if _, err := db.Exec(stmt); err != nil {
		t.Errorf(`Can't delete table %q, %s, `, tableName, err)
	}
}

func TestPeople(t *testing.T) {
	settings := `test-settings.json`
	if _, err := os.Stat(settings); os.IsNotExist(err) {
		t.Errorf(`%q not found, %s`, settings, err)
		t.FailNow()
	}
	cfg, err := LoadConfig(settings)
	if err != nil {
		t.Errorf("could not load %q, %s", settings, err)
		t.FailNow()
	}
	if err := OpenConnection(cfg); err != nil {
		t.Errorf("Cound not open connection, %s", err)
		t.FailNow()
	}
	defer CloseConnection(cfg)

	clearTable(t, cfg, `people`)

	fName := path.Join("testdata", "people.json")
	src, err := ioutil.ReadFile(fName)
	if err != nil {
		t.Errorf("Can't load test data %q, %s", fName, err)
	}
	peopleList := []*Person{}
	if err := jsonDecode(src, &peopleList); err != nil {
		t.Errorf("Can't unmarshal people list, %s", err)
	}
	// Test Creating people
	for i, people := range peopleList {
		if err := SQLCreatePerson(cfg, people); err != nil {
			t.Errorf(`(%d) create failed, %q, %s`, i, people.String(), err)
		}
	}
	//FIXME: test SQLReadPerson, SQLUpdatePerson, SQLDeletePerson
	t.Errorf(`test for SQLReadPerson, SQLUpdatePerson, SQLDeletePerson not implemented`)

	clearTable(t, cfg, `local_group`)
	clearTable(t, cfg, `funder`)
}
