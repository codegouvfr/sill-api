Work in progress on the SILL 2.0

# Publishing

The data are published via [garronej/sill-publish](https://github.com/garronej/sill-publish)  
(It was published @garronej because the ability to enable GitHub pages on private repo
is a premium GitHub feature).

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
