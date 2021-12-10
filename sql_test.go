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

func assertSamePerson(t *testing.T, expected *Person, got *Person) {
	if expected.CLPeopleID != got.CLPeopleID {
		t.Errorf("expected cl_people_id: %q, got %q", expected.CLPeopleID, got.CLPeopleID)
	}
	if expected.ORCID != got.ORCID {
		t.Errorf("expected orcid: %q, got %q", expected.ORCID, got.ORCID)
	}
	if expected.ROR != got.ROR {
		t.Errorf("expected ror: %q, got %q", expected.ROR, got.ROR)
	}
	if expected.DOI != got.DOI {
		t.Errorf("expected doi: %q, got %q", expected.DOI, got.DOI)
	}
	if expected.Email != got.Email {
		t.Errorf("expected Email: %q, got %q", expected.Email, got.Email)
	}
	if expected.AuthorsID != got.AuthorsID {
		t.Errorf("expected Email: %q, got %q", expected.Email, got.Email)
	}
	if expected.ContributorID != got.ContributorID {
		t.Errorf("expected ContributorID: %q, got %q", expected.ContributorID, got.ContributorID)
	}
	if expected.EditorID != got.EditorID {
		t.Errorf("expected EditorID: %q, got %q", expected.EditorID, got.EditorID)
	}
	if expected.ThesisAuthorID != got.ThesisAuthorID {
		t.Errorf("expected ThesisAuthorID: %q, got %q", expected.ThesisAuthorID, got.ThesisAuthorID)
	}
	if expected.ThesisAdvisorID != got.ThesisAdvisorID {
		t.Errorf("expected ThesisAdvisorID: %q, got %q", expected.ThesisAdvisorID, got.ThesisAdvisorID)
	}
	if expected.ThesisCommitteeID != got.ThesisCommitteeID {
		t.Errorf("expected ThesisCommitteeID: %q, got %q", expected.ThesisCommitteeID, got.ThesisCommitteeID)
	}
	if expected.ArchivesSpaceID != got.ArchivesSpaceID {
		t.Errorf("expected ArchivesSpaceID: %q, got %q", expected.ArchivesSpaceID, got.ArchivesSpaceID)
	}
	if expected.DirectoryID != got.DirectoryID {
		t.Errorf("expected ArchivesSpaceID: %q, got %q", expected.ArchivesSpaceID, got.ArchivesSpaceID)
	}
	if expected.VIAF != got.VIAF {
		t.Errorf("expected VIAF: %q, got %q", expected.VIAF, got.VIAF)
	}
	if expected.ISNI != got.ISNI {
		t.Errorf("expected ISNI: %q, got %q", expected.ISNI, got.ISNI)
	}
	if expected.WikiData != got.WikiData {
		t.Errorf("expected WikiData: %q, got %q", expected.WikiData, got.WikiData)
	}
	if expected.SNAC != got.SNAC {
		t.Errorf("expected SNAC: %q, got %q", expected.SNAC, got.SNAC)
	}
	if expected.Image != got.Image {
		t.Errorf("expected Image: %q, got %q", expected.Image, got.Image)
	}
	if expected.EducatedAt != got.EducatedAt {
		t.Errorf("expected EducatedAt: %q, got %q", expected.EducatedAt, got.EducatedAt)
	}
	if expected.Caltech != got.Caltech {
		t.Errorf("expected Caltech: %t, got %t", expected.Caltech, got.Caltech)
	}
	if expected.JPL != got.JPL {
		t.Errorf("expected JPL: %t, got %t", expected.JPL, got.JPL)
	}
	if expected.Faculty != got.Faculty {
		t.Errorf("expected Faculty: %t, got %t", expected.Faculty, got.Faculty)
	}
	if expected.Alumn != got.Alumn {
		t.Errorf("expected Alumn: %t, got %t", expected.Alumn, got.Alumn)
	}
	if expected.Status != got.Status {
		t.Errorf("expected Status: %q, got %q", expected.Status, got.Status)
	}
	if expected.DirectoryPersonType != got.DirectoryPersonType {
		t.Errorf("expected DirectoryPersonType: %q, got %q", expected.DirectoryPersonType, got.DirectoryPersonType)
	}
	if expected.Title != got.Title {
		t.Errorf("expected Title: %q, got %q", expected.Title, got.Title)
	}
	if expected.Bio != got.Bio {
		t.Errorf("expected Bio: %q, got %q", expected.Bio, got.Bio)
	}
	if expected.Division != got.Division {
		t.Errorf("expected Division: %q, got %q", expected.Division, got.Division)
	}
	if expected.Created != got.Created {
		t.Errorf("expected Created: %q, got %q", expected.Created, got.Division)
	}
	if expected.Updated != got.Updated {
		t.Errorf("expected Updated: %q, got %q", expected.Updated, got.Updated)
	}
}

func TestPersonSQL(t *testing.T) {
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

	clearTable(t, cfg, `person`)

	fName := path.Join("testdata", "people.json")
	src, err := ioutil.ReadFile(fName)
	if err != nil {
		t.Errorf("Can't load test data %q, %s", fName, err)
	}
	personList := []*Person{}
	if err := jsonDecode(src, &personList); err != nil {
		t.Errorf("Can't unmarshal person list, %s", err)
	}
	// Test Creating person
	for i, person := range personList {
		if err := SQLCreatePerson(cfg, person); err != nil {
			t.Errorf(`(%d) create failed, %q, %s`, i, person.String(), err)
		}
	}
	// Test SQLReadPerson
	for i, person := range personList {
		if obj, err := SQLReadPerson(cfg, person.CLPeopleID); err != nil {
			t.Errorf(`(%d) read failed, %q, %s`, i, person.String(), err)
		} else {
			assertSamePerson(t, person, obj)
		}
	}
	// Test SQLUpdatePerson
	var obj *Person
	for i, person := range personList {
		person.Created = `1801-01-01 01:00:00`
		person.Updated = `1901-01-01 01:00:00`
		if err := SQLUpdatePerson(cfg, person); err != nil {
			t.Errorf(`(%d) update failed, %q, %s`, i, person.String(), err)
		}

		obj, err = SQLReadPerson(cfg, person.CLPeopleID)
		if err != nil {
			t.Errorf(`(%d) read back failed, %q, %s`, i, person.String(), err)
		}
		if &obj == &person {
			t.Errorf(`(%d) should have had a new object for person and obj, not have same address`, i)
			t.FailNow()
		}
		if person.Created != obj.Created {
			t.Errorf(`(%d) cl_people_id: %q, expected same created %q, got %q`, i, person.CLPeopleID, person.Created, obj.Created)
			t.FailNow()
		}
		if obj.Updated == `` {
			t.Errorf(`(%d) cl_people_id: %q, expected populated .Update, person.Updated %q, got obj.Updated %q`, i, person.CLPeopleID, person.Updated, obj.Updated)
			t.FailNow()
		}
		if obj.Created == obj.Updated {
			t.Errorf(`(%d) cl_people_id: %q, expected obj.Created != obj.Updated, got  %q and %q`, i, obj.CLPeopleID, obj.Created, obj.Updated)
			t.FailNow()
		}
	}
	// Test SQLDeletePerson
	for i, person := range personList {
		if err := SQLDeletePerson(cfg, person.CLPeopleID); err != nil {
			t.Errorf("(%d) explected to delete person %q but error, %s", i, person.CLPeopleID, err)
		}
	}
}

func TestFunderSQL(t *testing.T) {
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

	clearTable(t, cfg, `funder`)
	t.Errorf(`test for TestFunderSQL not implemented`)
}

func TestGroupSQL(t *testing.T) {
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

	clearTable(t, cfg, `local_group`)
	t.Errorf(`test for TestGroupSQL not implemented`)
}
