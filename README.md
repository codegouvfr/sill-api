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
