## Logiciel libre concerné avec identifiant SILL

LemonLDAP::NG : <https://sill.etalab.gouv.fr/fr/software?id=77>

## Logiciel développé par l’administration ? Si oui, bref historique et acteurs engagés.

LemonLDAP::NG est un logiciel open source, créé en 2004 par la
Gendarmerie Nationale française, en fourchant le logiciel LemonLDAP.

Finalité du service (base de donnée, service web, etc.) Ce logiciel
fournit une solution d’authentification unique distribuée avec gestion
centralisée des droits sous licence GPL, et transmission de données
utilisateurs pour les besoins applicatifs.

## Nom de la direction qui a installé et infogère le logiciel

Service des Technologies et des Systèmes d’Information de la Sécurité
Intérieure

## Date de la première installation du logiciel

2004

## Nombre d’instances installées et infogérées

6

## Nombre d’agents ayant une expertise technique sur le logiciel

5

## Si pertinent, nombre d’utilisateurs du logiciel

Les SSO s'appuyant sur cette brique de sécurité assurent
l'authentification des 130 000 personnels de la Gendarmerie Nationale
et 150 000 personnels de la Police Nationale.

## Description détaillée

_Utilisation de LemonLDAP::NG pour assurer l’identité numérique au sein de la Gendarmerie et la Police Nationale_

La Gendarmerie et la Police Nationale ont fait le choix depuis plus de 15 ans
de s’appuyer sur le logiciel open-source et libre LemonLDAP::NG pour l’ensemble
de ses SSO et solutions de fédération d’identités. C’est le STSISI (Service des
Technologies et des Systèmes d’Information de la Sécurité Intérieure) qui
administre ces systèmes, utilisés par les 130 000 utilisateurs de la Gendarmerie et
150 000 utilisateurs pour la Police.

Décliné pour répondre à différents besoins et sur divers
environnements, le STSISI gère et fait évoluer 12 SSO s’appuyant tous
sur la brique LemonLDAP::NG :

-   Proxyma : SSO authentifiant les personnels de la Gendarmerie
    Nationale uniquement, sur le réseau intranet, et décliné en
    environnement de production, préproduction, formation et
    développement.

-   Cheops : SSO authentifiant les personnels de la Police Nationale
    uniquement, sur le réseau intranet, et décliné en environnement de
    production, préproduction et formation.

-   PSI : SSO en fédération d'identité qui permet de rendre accessible
    une même application aux personnels gendarmes, policiers et
    personnels de Préfectures, à travers une seule URL. Ce SSO est
    décliné en environnement de production et preproduction.

-   Curasso : SSO authentifiant les personnels de la Gendarmerie
    Nationale uniquement, sur le réseau internet.

-   Espresso : SSO ouvert à n’importe quel utilisateur, à travers la
    création d’un compte, sur le réseau internet. C’est un SSO utilisé
    principalement pour le recrutement et la formation.

-   Judiweb : SSO en fédération d'identité permettant d’exposer les
    applications gérées par le ST(SI)2, aux autres administrations
    publiques, principalement judiciaires, sur le réseau
    interministériel, comme par exemple FPR (Fichier des Personnes
    Recherchées).

Certains SSO sont déclinés sur des différents environnements réseaux
pour répondre à des besoins spécifiques :

-   Production : SSO utilisés par l’ensemble des personnels des 2
    institutions permettant de remplir les missions qui leur sont
    confiés au quotidien.

-   Preproduction : SSO utilisés par les chefs de projets pour tester
    leurs applications avant de les faire passer en production.

-   Formation : SSO répondants au besoin spécifique des formations en école.

-   Développement : SSO utilisé par les administrateurs pour tester les
    évolutions fonctionnelles et techniques de demain, ainsi que les
    chefs de projets souhaitant bénéficier d’une certaine autonomie sur
    le SSO pour effectuer des tests, via le SSO as a Service.

Adapté au besoin du projet, les SSO Gendarmerie / Police remplissent
plusieurs fonctions fournis par LemonLDAP::NG :

-   Authentification des personels, avec plusieurs niveaux : forte
    (certificat sur carte agent), multi-facteurs (TOTP), faible
    (login/mdp).

-   Gestion des droits d’accès : Dans le manager, nous configurons quels
    sont les groupes d’utilisateurs pouvant accéder aux différentes
    applications, selon leurs profils.

-   Transmission de données utilisateurs permettant aux applications de
    réaliser de la traçabilité et d’adapter le contenu dynamiquement aux
    informations envoyées.

-   Traçabilité au niveau du SSO des accès applicatifs de chaque
    utilisateur. L’architecture s’appuie sur des reverses-proxy, et
    l’ensemble des requêtes passent d’abord par le SSO avant d’atteindre
    les applications.

-   SLO : Fonctionnalité permettant une déconnexion globale de l’utilisateur sur

l’ensemble des sessions en cours.

En plus de ces raccordements en reverses-proxy, les SSO Gendarmerie / Police
utilisent les protocoles de fédération d’identités SAML et OIDC, intégrés dans
LemonLDAP::NG, pour s’interconnecter avec les SSO des autres administrations
publiques :

-   En tant que fournisseur d’identités, comme c’est le cas avec la
    DGFIP qui nous expose ses applications au travers de son portail.

-   En tant que fournisseur de services, avec Judiweb. Ce SSO est
    raccordé en fédération d’identités avec la DGDDI, la Justice, la
    DRSD, Tracfin, la DGCCRF, le Ministère des Affaires Étrangères et le
    Ministère de la Culture.

Au sein de la Gendarmerie et de la Police Nationale, nous utilisons
également plusieurs fonctionnalités de LemonLDAP::NG dans le cadre du
développement des projets :

-   Simulation d’identités pour tester l’application selon différents
    profils, hors environnement de production.

-   Checkuser : Interface permettant de connaître les accès, données
    utilisateurs, macros du SSO. L’accès à cette interface est limité
    aux développeurs.

-   Administration de la configuration des raccordements des
    applications au travers du manager, par les administrateurs SSO.

-   Lecture des sessions et des données générées, des notifications de
    droits d’accès des utilisateurs, de l’explorateur représentant un
    gestionnaire de version des configurations du manager. Ces outils
    sont bien entendu utilisés seulement par les administrateurs des
    SSO.

-   SSO as a Service : Possibilité offerte aux chefs de projet de se
    raccorder au SSO en toute autonomie, via un handler dédié, et gérer
    lui-même les droits d’accès et données utilisateurs qui sont
    transmises à son application. Fonctionnalité uniquement sur les SSO
    de développement.

La brique LemonLDAP::NG est au coeur même de l’identité numérique au
sein de la Gendarmerie et la Police Nationale. De nombreux projets
s’appuyant ce logiciel libre sont en cours, notamment des fédérations
d’identités en OIDC avec Agent Connect, système d’interconnexion
interministériel à l’image de France Connect pour le grand public.
