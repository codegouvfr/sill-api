import { execSync } from "child_process";
import { compiledDataBranch } from "../core/adapters/dbApi";

// Script to run that will make codegouvfr/sill-data-test is the same as codegouvfr/sill-data

const tmpDirBasename = "tmp_x3dL4bZdj4dbq2Td";

const repoUrl = "https://github.com/codegouvfr/sill-data";

execSync(
    [
        `rm -rf ${tmpDirBasename}`,
        `git clone --depth 1 ${repoUrl} ${tmpDirBasename}`,
        `cd ${tmpDirBasename}`,
        `git remote set-url origin ${repoUrl}-test`,
        `git push -f`,
        `cd ..`,
        `rm -rf ${tmpDirBasename}`,
        `git clone --branch ${compiledDataBranch} --depth 1 ${repoUrl} ${tmpDirBasename}`,
        `cd ${tmpDirBasename}`,
        `git remote set-url origin ${repoUrl}-test`,
        `git push -f`,
        `cd ..`,
        `rm -rf ${tmpDirBasename}`
    ].join(" && sleep 1 && ")
);

console.log("https://github.com/codegouvfr/sill-data-test");
