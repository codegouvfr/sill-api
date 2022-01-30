# Dev

> This repo contains a private submodule.

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
EPL-2.0	](LICENSES/LICENSE.EPL-2.0.txt) pour les codes sources et
[licence Ouverte 2.0](LICENSES/LICENSE.Etalab-2.0.md) pour les
données ([sill-softwares.json](/sill-softwares.json)).