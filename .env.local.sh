#!/bin/bash

export CONFIGURATION=$(cat << EOF
{
	"keycloakParams": {
		//"url": "https://sill-auth.etalab.gouv.fr/auth",
		"url": "https://sill-auth-test.lab.sspcloud.fr/auth",
		"realm": "etalab",
		"clientId": "sill",
		"termsOfServices": "https://sill.etalab.gouv.fr/tos_fr.md",
		"adminPassword": "jrph0ykgrb9kiv1yo19f2" 
	},
	"jwtClaims": {
		"id": "sub",
		"email": "email",
		"agencyName": "agency_name",
		"locale": "locale"
	},
    "dataRepoUrl": "https://github.com/etalab/sill-data-test",
	"githubPersonalAccessToken": { 
		/* This env need to be defined in your .bashrc */
		"envName": "GITHUB_TOKEN" 
	},
    "githubWebhookSecret": "NO VERIFY",
	"port": 8080
}
EOF
) 

export ENVIRONNEMENT="development"

$@