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
  
