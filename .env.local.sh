#!/bin/bash

export CONFIGURATION=$(cat << EOF
{
	"keycloakParams": {
		"url": "https://etalab-auth.lab.sspcloud.fr/auth",
		"realm": "etalab",
		"clientId": "sill"
	},
	"jwtClaims": {
		"email": "email",
		"familyName": "family_name",
		"firstName": "given_name",
		"username": "preferred_username",
		"groups": "groups",
		"locale": "locale"
	},
    "sillCsvRepoUrl": "https://github.com/etalab/sill-csv",
    "archiveRepoUrl": "https://github.com/etalab/sill-csv-private",
    "archiveRepoBranch": "archive",
	"githubPersonalAccessToken": { 
		/* This env need to be defined in your .bashrc */
		"envName": "GITHUB_PERSONAL_ACCESS_TOKEN" 
	},
	"port": 8080
}
EOF
) 

$@