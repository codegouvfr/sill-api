<p align="center">
    <i>Ongoing work toward a new version of sill.etalab.gouv.fr</i>
    <br>
    <br>
    <a href="https://github.com/etalab/sill/actions">
      <img src="https://github.com/etalab/sill/workflows/ci/badge.svg?branch=main">
    </a>
    <a href="https://github.com/etalab/sill#licence">
      <img src="https://img.shields.io/badge/Licence-EPL%2C%20Licence%20Ouverte-orange.svg?style=flat-square">
    </a>
</p>

Ce dépôt contient la liste des logiciels recommandés dans le [socle
interministériel de logiciels libres](https://sill.etalab.gouv.fr).

Pour des explications détaillées sur le SILL, voir [cette
page](https://man.sr.ht/~etalab/logiciels-libres/sill.md).

L'interface d'affichage du SILL est développée [via ce
dépôt](https://git.sr.ht/~etalab/sill.etalab.gouv.fr).

# How the data are made available

This repo publish a `sill.json` files that compiles the data from
`/sill-softwares.json` and `/sill-referents/sill-referents.json`.  
This file is meant to provide the information needed to implement
an interface like [this one](https://sill.etalab.gouv.fr).

## Where are the data available

The information about the software's referents aren't publicly available.  
If you are entitle to access the data [here is where it's available](https://github.com/etalab/sill-referents/blob/main/private_notes.md).

## How does it work

1. Every push [this job of the CI runs](https://github.com/etalab/sill/blob/4b926f7819bd78c3a21f135f85208dc662bf30fa/.github/workflows/ci.yaml#L157-L172)
2. It riggers [a custom action](https://github.com/etalab/sill/blob/gh-actions/src/publish_easily_consumable_entries.ts) hosted on the `gh-actions` branch.
3. The custom action [calls](https://github.com/etalab/sill/blob/2203b02f0c3d8e5b7068251089a1f763a867e723/src/publish_easily_consumable_entries.ts#L98) the function
   in charges of compiling the softwares and referents into a single file.
   It's [here](https://github.com/etalab/sill/blob/main/src/buildExposedData.ts).
4. The data pushed to a static host and made available [here](https://github.com/etalab/sill-referents/blob/main/private_notes.md).
5. The types definition are available [here](https://github.com/etalab/sill/blob/4b926f7819bd78c3a21f135f85208dc662bf30fa/src/types.ts#L45-L69) and can be imported
   as [an NPM modules](https://www.npmjs.com/package/sillfr).

# Dev

> This repo contains a private submodules that should be
> checked out after cloning the repo.

## Checking out the code

```bash
git clone https://github.com/etalab/sill
cd etalab
git submodule update --init --recursive
cd sill-referents
git checkout main
```

# Pushing new code

```bash
cd sill-referents
git add -A
git commit -am "commit message"
git push
cd ..
git add -A
git commit -am "commit message"
git push
```

# Licence

Les Groupes Mutualisation Interministérielle et les contributeurs du
dépôt, 2019-2022.

Le contenu du SILL et de ce dépôt est sous [licence
EPL-2.0 ](LICENSES/LICENSE.EPL-2.0.txt) pour les codes sources et
[licence Ouverte 2.0](LICENSES/LICENSE.Etalab-2.0.md) pour les
données ([sill-softwares.json](/sill-softwares.json)).
