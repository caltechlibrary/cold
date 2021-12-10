package cold

import (
	"io/ioutil"
	"path"
	"testing"
)

func TestPersonObject(t *testing.T) {
	fName := path.Join("testdata", "people.json")
	src, err := ioutil.ReadFile(fName)
	if err != nil {
		t.Errorf("Can't load test data %q, %s", fName, err)
	}
	personList := []*Person{}
	if err := jsonDecode(src, &personList); err != nil {
		t.Errorf("Can't unmarshal person list, %s", err)
	}
	for i, person := range personList {
		s := person.String()
		obj := new(Person)
		if err := jsonDecode([]byte(s), &obj); err != nil {
			t.Errorf("expected (%d) to decode %q, got %s", i, s, err)
		}
	}
}

func TestGroupObject(t *testing.T) {
	fName := path.Join("testdata", "groups.json")
	src, err := ioutil.ReadFile(fName)
	if err != nil {
		t.Errorf("Can't load test data %q, %s", fName, err)
	}
	groupList := []*Group{}
	if err := jsonDecode(src, &groupList); err != nil {
		t.Errorf("Can't unmarshal group list, %s", err)
	}
	for i, group := range groupList {
		s := group.String()
		obj := new(Group)
		if err := jsonDecode([]byte(s), &obj); err != nil {
			t.Errorf("expected (%d) to decode %q, got %s", i, s, err)
		}
	}
}
