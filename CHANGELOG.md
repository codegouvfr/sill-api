### **0.17.5** (2022-06-10)  
  
- Update dependencies  
- Fix problem with deleted wikidata entries    
  
### **0.17.4** (2022-06-09)  
  
- package.json: Bump version to 0.17.4  
- .github/workflows/data.yaml: Update sill-data.json upload location    
  
### **0.17.3** (2022-06-07)  
  
- List at most 15 versions when suggesting latest version    
  
### **0.17.2** (2022-06-05)  
  
- https://github.com/etalab/sill-web/issues/44    
  
### **0.17.1** (2022-06-02)  
  
- Dont crash when user do not have an agencyName  
- Do not crash with user without agencyName    
  
## **0.17.0** (2022-05-30)  
  
- Api endpoint for getting all agencyNames    
  
### **0.16.2** (2022-05-29)  
  
- git: don't crash if no changes, just dont commit    
  
### **0.16.1** (2022-05-28)  
  
- fix bug updating agency name    
  
## **0.16.0** (2022-05-28)  
  
- Fix email update  
- Make it possible to update Email and agencyName https://github.com/etalab/sill-web/issues/3    
  
### **0.15.5** (2022-05-20)  
  
  
  
### **0.15.4** (2022-05-20)  
  
- Fix Wikidata parser to work with quote character in software name (eg: G'MIC)    
  
### **0.15.3** (2022-05-20)  
  
- Use mutex when we update state from ping  
- Fix buf if build data fails    
  
### **0.15.2** (2022-05-19)  
  
- Fix bug in keeping the local copy up to date, enable concurent editing    
  
### **0.15.1** (2022-05-19)  
  
- Bump version (cangelog ignore)  
- Change commit message when a software is updated    
  
## **0.15.0** (2022-05-19)  
  
- Incorporate isPersonalUse in compiled data  
- Update README.md  
- Update README.md    
  
## **0.14.0** (2022-05-17)  
  
- https://github.com/etalab/sill-web/issues/33    
  
### **0.13.4** (2022-05-16)  
  
- package.json: Bump version to 0.13.4  
- src/../createGitHubDataApi.ts: set isStillInObservation to false

By default, set "isStillInObservation" to false.

The "In observation" category was ditched a while ago.  New entries
have the "Recommended" status by default -- see e.g. this addition:

https://git.sr.ht/~etalab/sill/commit/6cc6fe50bae44dffbe52b7c85f68af23b208df5b  
- update editService script  
- Add script for edditing service  
- remove comitizen  
- :card_file_box:  Get the author short name  
- :bug: Update .env.local    
  
### **0.13.3** (2022-05-11)  
  
- :wheelchair:  Better comptoir du libre autofill    
  
### **0.13.2** (2022-05-10)  
  
- package.json: Bump version  
- README.md: Fix copyright year  
- :work:  Update eddit script    
  
### **0.13.1** (2022-05-10)  
  
- :heavy_plus_sign:  Making i18nifty a dependency  
- :construction_worker:  Add eddit script    
  
## **0.13.0** (2022-05-10)  
  
- :sparkles:  add software usecase https://github.com/etalab/sill-web/issues/9 https://github.com/etalab/sill-web/issues/13    
  
## **0.12.0** (2022-05-10)  
  
- :sparkles:  Provide more infos for form autofill  
- :card_file_box:  Rename sill3.json into sill-data.json

Closes #19  
- :card_file_box:  Rename service.softwareId into service.softwareSillId

Closes  
- :sparkles:  If the website is the source the undefined  
- :sparkles:  Sort by preference wikidata  
- :sparkles:  Look for developpers in creators and funders props

https://github.com/etalab/sill-web/issues/17    
  
## **0.10.0** (2022-04-28)  
  
- :card_file_box:  Developper list always present even if empty  
- :sparkles:  Fetch developper list from wikidata  
- :card_file_box:  Do not use localized string when all string equals  
- :bug:  Fixing script that trigers build  
- :sparkles:  Update convignence script  
- :bug:  Undefined when no translation in the supported languages  
- :sparkles:  New script to trigger full data build  
- :bug:  Fix how wiki data are serialized  
- :sparkles:  Write a script to reset sill-data-test on sill-data  
- :sparkles:  Feature script to help hacking sill-data/software.json  
- :bug:  Fix bug in fetch wikidata    
  
## **0.9.0** (2022-04-19)  
  
- :sparkles:  Fetch more data from wikidata and version from github    
  
## **0.8.0** (2022-04-15)  
  
- :sparkles:  Endpoint for fetching wikidata id    
  
### **0.7.2** (2022-04-15)  
  
- :fire:  Prevent frequent data update in dev mode    
  
### **0.7.1** (2022-04-15)  
  
- :bug:  Fix bug    
  
## **0.7.0** (2022-04-15)  
  
- :sparkles:  Create and update software    
  
## **0.6.0** (2022-04-11)  
  
- :bookmark:  Bump version  
- :sparkles:  API endpoint for creating form    
  
### **0.5.1** (2022-04-07)  
  
- :bookmark:  Bump version  
- :card_file_box:  Add agentWorkstation field in software

https://github.com/etalab/sill-web/issues/5    
  
## **0.5.0** (2022-04-06)  
  
- :bookmark:  
- :sparkles:  User can remove himself from referents list    
  
### **0.4.1** (2022-04-06)  
  
- :zap:  Do not wait for the data to be re-compiled    
  
## **0.4.0** (2022-04-05)  
  
- :bug:  Fix build  
- :bookmark:  Bump version  
- :sparkles:  Enable user to declare himself as referent    
  
### **0.3.17** (2022-03-31)  
  
- :bookmark:  Bump version  
- :recycle:  Remove helper type    
  
### **0.3.16** (2022-03-29)  
  
- :sparkles:  Create endpoint for serving referent information  
- :sparkles:  Send referent emails when user is logged in    
  
### **0.3.15** (2022-03-29)  
  
- :bookmark:  Bump version  
- :label: (Update SoftwareRow)    
  
### **0.3.14** (2022-03-25)  
  
- :label:  Better management of jwt    
  
### **0.3.13** (2022-03-24)  
  
- :boom:  Update user profile  
- :green_heart:  Fix workflow    
  
### **0.3.12** (2022-03-23)  
  
- :art:  update  
- :green_heart:  Only upload to code gouv for production server    
  
### **0.3.11** (2022-03-23)  
  
- :bug:  Work when there is no build branch  
- :construction_worker:  Poke gitops after buid docker    
  
### **0.3.10** (2022-03-23)  
  
- :construction_worker:  Improving CI automation workflow  
- :fire:  Remove debug job  
- :wrench:  Update gitignore    
  
### **0.3.9** (2022-03-23)  
  
- :green_heart:  Fix build  
- :zap:  Do not re-fetch all wikidata data each time  
- :construction_worker:  fix ci  
- :bug:  fixing env  
- :bug:  Fix bug in ci  
- :bug:  Fix bug in ci  
- :construction_worker:  rename secret  
- :construction_worker:  Rename Token    
  
### **0.3.8** (2022-03-22)  
  
- :bookmark:  Bump version  
- :fire:  Remove unecessary log  
- :bug:  Fix bug in CI    
  
### **0.3.7** (2022-03-22)  
  
- :bookmark:  Update version  
- :loud_sound:  Log ondataupdate  
- :bookmark:  Bump version  
- :bug:  Fix whebhook endpoint  
- :heavy_minus_sign:  update yarn.lock    
  
### **0.3.5** (2022-03-22)  
  
- :bookmark:  Bump version  
- :sparkles:  Implement auto refesh when data changed    
  
### **0.3.4** (2022-03-22)  
  
- :bookmark:  Bump version  
- :construction:  Add endpoint to ping when data updated  
- :construction_worker:  Update CI  
- :construction_worker:  Update CI  
- :construction_worker:  Update CI  
- :construction_worker:  Setup auto update  
- :rewind:  Restoring .env.local.sh as it was  
- :recycle: (sill-data no longer a submodule)    
  
### **0.3.3** (2022-03-21)  
  
- :bookmark:  Bump version  
- :bug:  Fix the bugs at launch  
- :construction_worker:  Try to fix CI  
- :construction_worker:  Try to fix the ci  
- :construction_worker:  Fix ci    
  
## **0.3.2** (2022-03-21)  
  
- :bookmark:  Bump version  
- :boom:  Changing naming convention  
- :pencil:  Update readme instructions  
- Update data  
- :label:  Add "agencyName" in referentRow

Closes #15  
- Addresses #14  
- :card_file_box:  Update data  
- :pencil:  Removing section of the readme that are no longer relevent  
- :pencil:  Update README  
- :construction_worker:  Fix upload to codegouv server  
- :construction_worker:  Updat repo we update the computed data to  
- :construction_worker:  Fix CI workflow  
- :card_file_box:  Update data submodule  
- :pencil:  Updating docs  
- :recycle:  Refactor using only a private repo for data

Only private repo for data and json files as source of truth  
- :fire:  Remove data submodule (to be replaced)    
  
### **0.2.2** (2022-03-11)  
  
- :bookmark:  Bump version  
- :bug:  Fix getSoftware endpoint    
  
### **0.2.1** (2022-03-11)  
  
- :bookmark:  Bump version  
- :label:  Exporting NoReferentCredentialsSoftware in the index  
- :construction_worker:  Fix CI    
  
## **0.2.0** (2022-03-11)  
  
- :bookmark:  Bump version  
- :sparkles:  Add endpoint to fetch user softwares id    
  
### **0.1.3** (2022-03-11)  
  
- :bookmark:  Bump version  
- :construction_worker:  Respond ok to Kubernetes healthchecks  
- :pencil:  Add actual command to start docker image locally    
  
### **0.1.2** (2022-03-11)  
  
- :bookmark: Bump version  
- :whale:  include git in docker image    
  
### **0.1.1** (2022-03-10)  
  
- :bookmark:    
  
## **0.1.0** (2022-03-10)  
  
- :bookmark:  Bump version  
- Trigger etalab/paris-sspcloud autoupdate    
  
### **0.0.27** (2022-03-10)  
  
- :bookmark:  Bump version  
- :whale:  Use forver to automatically restart if process crashes  
- :bug:  Fix bug in signature validation  
- :bug:  Fix bug in contacts to reality  
- :green_heart:  fix test script  
- :pencil:  
- :whale:  Publish the Docker image under etalab/sill-api  
- :pencil:  Update README  
- Update ci.yaml  
- Update ci.yaml  
- :construction_worker:  Update the version of actions/checkout used  
- :construction_worker:  Remove du -a . (debug step)  
- :construction_worker:  Clone submodules recursively  
- :fire: (Remove ncc from deps, use it directly in Dockerfile instead)  
- Update ci.yaml  
- Update ci.yaml  
- :whale:  Configure docker image  
- :bug:  The server actually works  
- :card_file_box:  Update db  
- :card_file_box:  Update data  
- :card_file_box:  Update data  
- :recycle:  Using a single submodule for data  
- :fire:  Removing data files  
- :fire:  Remove sill-referents submodule    
  
### **0.0.26** (2022-03-01)  
  
- :bookmark:  Bump version  
- :label: (model) Anticipate "isReferentExpert?" to be obsolete at some point

Closes #13  
- :label: (model) Rename whereAndInWhatContextIsItUsed to contextOfUse

Closes #12  
- :arrow_down:  Downgrade TS to work with TRPC

We have to wait for @trpc/server to be updated to work with TS4.6

Closes  
- :label: (model) Add deprecation warning for RecommendationStatus

Closes #10  
- :label: (model) Removing underscores

Closes #9  
- :chart_with_upwards_trend:  Configure commitizen and cz-emoji

It helps quickly see what a commit is about    
  
### **0.0.25** (2022-02-26)  
  
- Fix previous commit  
- Fix previous commit  
- Fix previous commit  
- Fetch correct logo  
- Only stringify non string  
- Do not make port mandatory, use 8080 default  
- Fix build problems  
- Fix build error related to comment-json  
- Stringify values that might not be string in JWT token  
- Improve launch mechanism  
- Fix bug in configuration  
- Do not allow unknown properties in CONFIGURATION env  
- Strong configuration validation, implement decodeJwt adapters    
  
### **0.0.24** (2022-02-17)  
  
- Only includes dependencies needed for types definitions    
  
### **0.0.23** (2022-02-17)  
  
- Rename SoftwareX -> Software    
  
### **0.0.22** (2022-02-17)  
  
- Rename npm module sill-api (it was an error to call it sill-web)    
  
### **0.0.21** (2022-02-17)  
  
- Implement strict isolation of concern  
- Rename lib/ -> model/  
- Fix build  
- Change directory structure    
  
### **0.0.20** (2022-02-16)  
  
- Rename the module  
- Restore readme    
  
### **0.0.19** (2022-02-16)  
  
  
  
### **0.0.18** (2022-02-16)  
  
- Publish type of the API  
- The start script is now for launching the server  
- Refactor  
- Lay the ground for autenticated API  
- Feature restoring parsed data to CSV  
- Remove duplicate columns from type definition  
- Coma si a reserved symbol in a csv  
- #7  
- Provide advancement feedback fetching wikidata  
- #8  
- Fix "Licenses" section  
- Multiple entries can't be separated by comas, use ; instead    
  
### **0.0.17** (2022-02-11)  
  
- Incoporate Wikidata infos    
  
### **0.0.16** (2022-02-10)  
  
- There might be multiple urls, (separated by comas). useCaseUrl -> useCasesUrl  
- Rename directory cards to useCases  
- Droping the papillon name, incorporing servcies into the API data.  
- Update readme, we no longer statically expose private data  
- Update upload location  
- Rollback publishing private data    
  
### **0.0.13** (2022-02-10)  
  
- Rename cardUrl -> useCaseUrl    
  
### **0.0.12** (2022-02-10)  
  
- Stop publishing referent in data.json    
  
### **0.0.11** (2022-02-10)  
  
- Integrate workshopUrl testUrl and useCaseUrl  
- commit hack migration  
- debug  
- update formating of target path  
- Update submodule  
- updat secret path and domain where we publish the data.json  
- Send to etalab's server  
- Test deploy with SSH  
- Rename ovh-pages -> static    
  
### **0.0.10** (2022-02-04)  
  
- Add papillon data    
  
### **0.0.9** (2022-02-04)  
  
- Incorporate comptoir du libre data    
  
### **0.0.8** (2022-02-03)  
  
- Generates referents stats  
- Make (primary email, secondary email) primary key of referents  
- Remove the Type collumn from type def of referent csv  
- Update sill-referents submodule  
- Update sill-referents submodule  
- Match softwares names in softwares.csv and referents.csv  
- Fix bug bool logic bug  
- Imediately delete artefact after creation, it's private data  
- Build the .json files in the ci    
  
### **0.0.6** (2022-02-02)  
  
- Update documentation  
- Dissociate build job and the job that generates the *.json  
- Generate list of softwares without names  
- Publish every json under data/  
- untrack all json files under data (those are generated)  
- Detect when two softwares have the same name in CSV  
- Grammalecte was present twice  
- Make sure there isn't two softwares with the same name  
- Rename ApiDataEntry -> ApiSoftware  
  
