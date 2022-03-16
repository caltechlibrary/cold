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
