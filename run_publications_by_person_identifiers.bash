#!/bin/bash

# run_publications_by_person_identifiers.bash - Runs the publications_by_person_identifiers report

# Initialize variables
CLPID=""
ORCID=""
FORMAT=""

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --help|-h)
            ./bin/publications_by_person_identifiers --help
            exit 0
            ;;
        --format|-f)
            FORMAT="$2"
            shift 2
            ;;
        --format=*|-f=*)
            FORMAT="${1#*=}"
            shift
            ;;
        *)
            # Positional arguments: CLPID and ORCID
            if [ -z "$CLPID" ]; then
                CLPID="$1"
            elif [ -z "$ORCID" ]; then
                ORCID="$1"
            else
                echo "Error: Too many positional arguments. Usage: $0 [-f json|csv|jsonl] [CLPID] [ORCID]"
                exit 1
            fi
            shift
            ;;
    esac
done

if [ "$CLPID" = "" ] && [ "$ORCID" = "" ]; then
    echo "Error: At least one of CLPID or ORCID must be provided."
    echo "Usage: $0 [-f json|csv|jsonl] [CLPID] [ORCID]"
    exit 1
fi

# Build arguments for the TypeScript script
ARGS=()
if [ -n "$FORMAT" ]; then
    ARGS+=("--format" "$FORMAT")
fi
ARGS+=("$CLPID" "$ORCID")

# Run the TypeScript script
./bin/publications_by_person_identifiers "${ARGS[@]}"
