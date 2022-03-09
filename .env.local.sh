#!/bin/bash

export CONFIGURATION=$(cat << EOF
{
	/*
	"keycloakParams": {
		"url": "https://auth.sspcloud.fr",
		"realm": "sspcloud",
		"clientId": "sill"
	}
	*/
	"jwtClaims": {
		"email": "email",
		"familyName": "familyName",
		"firstName": "familyName",
		"username": "username",
		"groups": "groups",
		"local": "local"
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