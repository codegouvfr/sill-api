#!/bin/bash

export CONFIGURATION=$(cat << EOF
{
  "keycloakParams": {
    "url": "https://auth.code.gouv.fr/auth",
    "realm": "codegouv",
    "clientId": "sill",
    "adminPassword": "$KEYCLOAK_CODEGOUV_ADMIN_PASSWORD",
    "organizationUserProfileAttributeName": "agencyName"
  },
  "readmeUrl": "https://git.sr.ht/~codegouvfr/logiciels-libres/blob/main/sill.md",
  "termsOfServiceUrl": "https://code.gouv.fr/sill/tos_fr.md",
  "jwtClaimByUserKey": {
    "id": "sub",
    "email": "email",
    "organization": "organization"
  },
  "dataRepoSshUrl": "git@github.com:codegouvfr/sill-data-test.git",
  "sshPrivateKeyForGitName": "$SSH_PRIVATE_KEY_FOR_GIT_NAME",
  "sshPrivateKeyForGit": "$SSH_PRIVATE_KEY_FOR_GIT",
  "githubPersonalAccessTokenForApiRateLimit": "$GITHUB_TOKEN",
  "githubWebhookSecret": "$GITHUB_SILL_WEBHOOK_SECRET",
  "port": 3084,
  "isDevEnvironnement": true
}
EOF
) 
$@
