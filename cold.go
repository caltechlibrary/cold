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
	"fmt"
)

type Name struct {
	Family  string `json:"family,omitempty"`
	Given   string `json:"given,omitempty"`
	Display string `json:"display_name,omitempty"`
	Sort    string `json:"sort_name,omitempty"`
}

type People struct {
	CLPeopleID string `json:"cl_people_id"`
	//Name                *Name  `json:"name,omitempty"`
	Family              string `json:"family_name,omitempty"`
	Given               string `json:"given_name,omitempty"`
	Honorific           string `json:"honorific,omitempty"`
	Lineage             string `json:"lineage,omitempty"`
	ORCID               string `json:"orcid,omitempty"`
	ROR                 string `json:"ror,omitempty"`
	DOI                 string `json:"doi,omitempty"`
	Email               string `json:"email,omitempty"`
	AuthorsID           string `json:"authors_id,omitempty"`
	ContributorID       string `json:"contributor_id,omitempty"`
	EditorID            string `json:"editor_id,omitempty"`
	ThesisAuthorID      string `json:"thesis_author_id,omitempty"`
	ThesisAdvisorID     string `json:"thesis_advisor_id,omitempty"`
	ThesisCommitteeID   string `json:"thesis_committee_id,omitempty"`
	ArchivesSpaceID     string `json:"archivesspace_id,omitempty"`
	DirectoryID         string `json:"directory_id,omitempty"`
	VIAF                string `json:"viaf,omitempty"`
	ISNI                string `json:"lcnaf,omitempty"`
	WikiData            string `json:"wikidata,omitempty"`
	SNAC                string `json:"snac,omitempty"`
	Image               string `json:"image,omitempty"`
	EducatedAt          string `json:"educated_at,omitempty"`
	Caltech             bool   `json:"caltech,omitempty"`
	JPL                 bool   `json:"jpl,omitempty"`
	Faculty             bool   `json:"faculty,omitempty"`
	Alumn               bool   `json:"alumn,omitempty"`
	Status              string `json:"status,omitempty"`
	DirectoryPersonType string `json:"directory_person_type,omitempty"`
	Title               string `json:"title,omitempty"`
	Bio                 string `json:"bio,omitempty"`
	Division            string `json:"division,omitempty"`
	//Created             string `json:"created,omitempty"`
	Updated string `json:"updated,omitempty"`
}

// Group holds our local group controlled vocabulary
// fields: name,alternative,email,date,description,start,
//         approx_start,activity,end,approx_end,website,
//         pi,parent,prefix,grid,isni,ringgold,viaf,ror,
//         updated
type Group struct {
	CLGroupID           string `json:"cl_group_id"`
	Name                string `json:"name,omitempty"`
	Alternative         string `json:"alternative,omitempty"`
	EMail               string `json:"email,omitempty"`
	Date                string `json:"date,omitempty"`
	Description         string `json:"description,omitempty"`
	Start               string `json:"start,omitempty"`
	AproxStart          string `json:"approx_start,omitempty"`
	Activity            string `json:"activity,omitempty"`
	End                 string `json:"end,omitempty"`
	ApproxEnd           string `json:"approx_end,omitempty"`
	Website             string `json:"website,omitempty"`
	PrimaryInvestigator string `json:"pi,omitempty"`
	Prefix              string `json:"prefix,omitempty"`
	Grid                string `json:"grid,omitempty"`
	ISNI                string `json:"isni,omitempty"`
	RIN                 string `json:"ringgold,omitempty"`
	VIAF                string `json:"viaf,omitempty"`
	ROR                 string `json:"ror,omitempty"`
	Updated             string `json:"updated"`
}

type Funder struct {
	CLFunderID       string   `json:"cl_funder_id"`
	Agency           string   `json:"agency,omitempty"`
	CrossRefFunderID string   `json:"crossref_funder_id,omitempty"`
	ROR              string   `json:"ror,omitempty"`
	DOI              string   `json:"doi,omitempty"`
	GrantNumber      []string `json:"grant_number,omitempty"`
	//Created          string   `json:"created,omitempty"`
	Updated string `json:"updated,omitempty"`
}

// Publisher maps a PID (e.g. ISSN, DOI Prefix) and a cononical publisher name
type Publisher struct {
	Name      string `json:"name"`
	DOIPrefix string `json:"doi_prefix"`
	ISSN      string `json:"issn"`
}

func (n *Name) String() string {
	src, _ := jsonEncode(n)
	return string(src)
}

func (p *People) String() string {
	src, _ := jsonEncode(p)
	return string(src)
}

func (p *People) ToMap() (map[string]interface{}, error) {
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

func (pub *Publisher) String() string {
	src, _ := jsonEncode(pub)
	return string(src)
}

func (pub *Publisher) ToMap() (map[string]interface{}, error) {
	m := map[string]interface{}{}
	if pub.Name != `` {
		return m, fmt.Errorf(`no publisher name`)
	}
	if pub.DOIPrefix != `` {
		m[pub.DOIPrefix] = pub.Name
	}
	if pub.ISSN != `` {
		m[pub.ISSN] = pub.Name
	}
	var err error
	if len(m) == 0 {
		err = fmt.Errorf(`no DOI prefix or ISSN`)
	}
	return m, err
}
