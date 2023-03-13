import { execSync } from "child_process";
import { compiledDataBranch } from "../core/adapters/createGitDbApi";

// Script to run that will make codegouvfr/sill-data-test is the same as codegouvfr/sill-data

const tmpDirBasename = "tmp_x3dL4bZdj4dbq2Td";

execSync(
    [
        `rm -rf ${tmpDirBasename}`,
        `git clone https://github.com/codegouvfr/sill-data ${tmpDirBasename}`,
        `cd ${tmpDirBasename}`,
        `git remote set-url origin https://github.com/codegouvfr/sill-data-test`,
        `git push -f`,
        `git checkout ${compiledDataBranch}`,
        `git push -f`,
        `cd ..`,
        `rm -rf ${tmpDirBasename}`
    ].join(" && ")
);

console.log("https://github.com/codegouvfr/sill-data-test");
