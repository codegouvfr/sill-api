#!/bin/bash

export CONFIGURATION=$(cat << EOF
{
  "keycloakParams": {
    "url": "https://sill-auth.etalab.gouv.fr/auth",
    "realm": "etalab",
    "clientId": "sill",
    "termsOfServices": "https://sill.etalab.gouv.fr/tos_fr.md",
    "adminPassword": "$KEYCLOAK_ETALAB_ADMIN_PASSWORD" 
  },
    "jwtClaims": {
    "id": "sub",
    "email": "email",
    "agencyName": "agency_name",
    "locale": "locale"
  },
  "dataRepoSshUrl": "git@github.com:etalab/sill-data-test.git",
  // We assume the key is already pressent in the ssh config
  "sshPrivateKeyForGit": "" 
}
EOF
) 

$@