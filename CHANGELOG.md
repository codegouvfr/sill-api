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
  
