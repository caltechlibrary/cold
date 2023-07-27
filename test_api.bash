#!/bin/bash
#

#
# test_api.bash
#
# This is a collection of Postgres+PostgREST tests of API functionality
#

#
# Test a vocabulary
#
function test_a_vocabulary_view() {
	VOC="$1"
    if curl -H 'Content-Type: application/json' \
       -o "${VOC}_test.json" \
       "http://localhost:3000/${VOC}_view"; then
    	if jq . "${VOC}_test.json" >/dev/null; then
    		rm "${VOC}_test.json"
    	else
    		echo "error: jq . ${VOC}_test.json"
			exit 1
    	fi
	else
		echo "Failed to connect to http://localhost:3000/${VOC}_view"
		exit 1
	fi

}

#
# Test Vocabularies
#
function test_vocabularies() {
	test_a_vocabulary_view "subjects"
	test_a_vocabulary_view "issn_publisher"
	test_a_vocabulary_view "issn_journal"
	test_a_vocabulary_view "doi_prefix"
}

#
# Test People
#
function test_people() {
	echo "WARNING: test_people not implemented"
}

#
# Test Groups
#
function test_groups() {
	echo "WARNING: test_groups not implemented"
}

test_vocabularies
test_people
test_groups
echo "Tests completed, OK"
