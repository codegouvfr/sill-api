<p align="center">
    <i>Ongoing work toward a new version of sill.etalab.gouv.fr</i>
    <br>
    <br>
    <a href="https://github.com/etalab/sill-api/actions">
      <img src="https://github.com/etalab/sill-api/workflows/ci/badge.svg?branch=main">
    </a>
    <a href="https://github.com/etalab/sill#licence">
      <img src="https://img.shields.io/npm/l/sillfr">
    </a>
</p>

-   [Dev](#dev)
    -   [Checking out the code](#checking-out-the-code)
    -   [Model](#model)
        -   [Publishing a new version of the types definitions](#publishing-a-new-version-of-the-types-definitions)
    -   [Server](#server)
-   [Licences](#licences)

# Dev

> This repo contains a private submodules that should be
> checked out after cloning the repo.

## Checking out the code

```bash
git clone https://github.com/etalab/sill-api
cd sill-api
git submodule update --init
```

## Model

This repo publish a [`sill-data.json`](https://code.gouv.fr/data/sill-data.json) files that compiles data from [the data private submodule](/data)
and [Le comptoir du libre](https://comptoir-du-libre.org/).

It will be used from [code.gouv.fr](https://code.gouv.fr/) to expose the SILL.

### Publishing a new version of the types definitions

To update the version of the [`src/types.ts`](/src/types.ts) published
as [an NPM modules](https://www.npmjs.com/package/sillfr) just bump the version
of the [`package.json`](/package.json) file.

## Server

This is a node program that constitute the backend of `sill-web`

To see what to put in configuration look at `src/server/configuration.ts` and `.env.local.sh` for an example.

```bash
docker build -t etalab/sill-api:main .
docker run -it -p 8080:8080 --env GITHUB_PERSONAL_ACCESS_TOKEN=$GITHUB_PERSONAL_ACCESS_TOKEN --env CONFIGURATION='
{ "keycloakParams": { "url": "https://etalab-auth.lab.sspcloud.fr/auth", "realm": "etalab", "clientId": "sill" }, "jwtClaims": { "email": "email", "familyName": "family_name", "firstName": "given_name", "username": "preferred_username", "groups": "groups", "locale": "locale" }, "dataRepoUrl": "https://github.com/etalab/sill-data", "buildBranch": "build", "githubPersonalAccessToken": { "envName": "GITHUB_PERSONAL_ACCESS_TOKEN" }, "port": 8080 }' etalab/sill-api:main
```

To test that the container is up:

http://localhost:80/api/getKeycloakParams

### Trigger scrapping

Every four hours data from WikiData.org and Le-compoirt-du-libre.org are updated.  
You can, however, trigger the scrapping manually with the following commands.

```bash
git clone https://github.com/etalab/sill-api
cd sill-api
yarn
yarn build
node dist/bin/trigger-ci-build-data.js
```

# Licences

DINUM and contributors of the repository, 2022.

-   The data are licensed under the [licence Ouverte 2.0](LICENSES/LICENSE.Etalab-2.0.md).
-   The source code is licensed under the [MIT license](LICENSES/LICENSE.MIT.md).
