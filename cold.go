package cold

import (
	"time"
)

type Name struct {
	Family  string `json:"family,omitempty"`
	Given   string `json:"given,omitempty"`
	Display string `json:"display_name,omitemtpy"`
}

type Person struct {
	CLPeopleID          string    `json:"cl_people_id,required"`
	Name                *Name     `json:"name,omitempty"`
	ORCID               string    `json:"orcid,omitempty"`
	ROR                 string    `json:"ror,omitempty"`
	DOI                 string    `json:"doi,omitempty"`
	Email               string    `json:"email,omitempty"`
	AuthorsID           string    `json:"authors_id,omitempty"`
	ContributorID       string    `json:"contributor_id,omitempty"`
	EditorID            string    `json:"editor_id,omitempty"`
	ThesisAuthorID      string    `json:"thesis_author_id,omitempty"`
	ThesisAdvisorID     string    `json:"thesis_advisor_id,omitempty"`
	ThesisCommitteeID   string    `json:"thesis_committee_id,omitempty"`
	ArchivesSpaceID     string    `json:"archivesspace_id,omitempty"`
	DirectoryID         string    `json:"directory_id,omitempty"`
	VIAF                string    `json:"viaf_id,omitempty"`
	ISNI                string    `json:"lcnaf,omitempty"`
	WikiData            string    `json:"wikidata,omitempty"`
	SNAC                string    `json:"snac,omitempty"`
	Image               string    `json:"image,omitempty"`
	EducatedAt          string    `json:"educated_at,omitempty"`
	Caltech             bool      `json:"caltech,omitempty"`
	JPL                 bool      `json:"jpl,omitempty"`
	Faculty             bool      `json:"faculty,omitempty"`
	Alumn               bool      `json:"alumn,omitempty"`
	Status              string    `json:"status,omitempty"`
	DirectoryPersonType string    `json:"directory_person_type,omitempty"`
	Title               string    `json:"title,omitempty"`
	Bio                 string    `json:"bio,omitempty"`
	Division            string    `json:"division,omitempty"`
	Created             time.Time `json:"created,omitempty"`
	Updated             time.Time `json:"updated,omitempty"`
}

type Group struct {
	CLGroupID string    `json:"cl_group_id,required"`
	Name      string    `json:"name,omitempty"`
	ROR       string    `json:"ror,omitempty"`
	DOI       string    `json:"doi,omitempty"`
	Created   time.Time `json:"created,omitempty"`
	Updated   time.Time `json:"updated,omitempty"`
}

type Funder struct {
	CLGroupID   string    `json:"cl_group_id,required"`
	Name        string    `json:"name,omitempty"`
	ROR         string    `json:"ror,omitempty"`
	DOI         string    `json:"doi,omitempty"`
	GrantNumber []string  `json:"grant_number,omitempty"`
	Created     time.Time `json:"created,omitempty"`
	Updated     time.Time `json:"updated,omitempty"`
}

func (n *Name) String() string {
	src, _ := jsonEncode(n)
	return string(src)
}

func (p *Person) String() string {
	src, _ := jsonEncode(p)
	return string(src)
}

func (p *Person) ToMap() (map[string]interface{}, error) {
	m := map[string]interface{}{}
	src, err := jsonEncode(p)
	if err != nil {
		return nil, err
	}
	err = jsonDecode(src, &m)
	return m, err
}

func (g *Group) String() string {
	src, _ := jsonEncode(g)
	return string(src)
}

func (g *Group) ToMap() (map[string]interface{}, error) {
	m := map[string]interface{}{}
	src, err := jsonEncode(g)
	if err != nil {
		return nil, err
	}
	err = jsonDecode(src, &m)
	return m, err
}

func (f *Funder) String() string {
	src, _ := jsonEncode(f)
	return string(src)
}

func (f *Funder) ToMap() (map[string]interface{}, error) {
	m := map[string]interface{}{}
	src, err := jsonEncode(f)
	if err != nil {
		return nil, err
	}
	err = jsonDecode(src, &m)
	return m, err
}
