#!/bin/bash

export CONFIGURATION=$(cat << EOF
{
  "keycloakParams": {
    "url": "https://auth.code.gouv.fr/auth",
    "realm": "etalab",
    "clientId": "sill",
    "termsOfServices": "https://sill.code.gouv.fr/tos_fr.md",
    "adminPassword": "$KEYCLOAK_CODEGOUV_ADMIN_PASSWORD",
    "agencyNameAttributeName:": "agencyName"
  },
  "jwtClaimByUserKey": {
    "id": "sub",
    "email": "email",
    "agencyName": "agency_name",
    "locale": "locale"
  },
  "dataRepoSshUrl": "git@github.com:codegouv/sill-data-test.git",
  "sshPrivateKeyForGitName": "$SSH_PRIVATE_KEY_FOR_GIT_NAME",
  "sshPrivateKeyForGit": "$SSH_PRIVATE_KEY_FOR_GIT",
  "githubPersonalAccessToken": "$GITHUB_TOKEN",
  "port": 8080
}
EOF
) 
$@
