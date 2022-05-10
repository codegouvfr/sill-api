#!/bin/bash

export CONFIGURATION=$(cat << EOF
{
	"keycloakParams": {
		"url": "https://etalab-auth.lab.sspcloud.fr/auth",
		"realm": "etalab",
		"clientId": "sill",
		"termsOfServices": "https://sill.garronej.dev/tos_fr.md"
	},
	"jwtClaims": {
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