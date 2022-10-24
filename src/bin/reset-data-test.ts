import { execSync } from "child_process";
import { buildBranch } from "../server/core/adapters/createGitDbApi";

// Script to run that will make etalab/sill-data-test is the same as etalab/sill-data

const tmpDirBasename = "tmp_x3dL4bZdj4dbq2Td";

execSync(
    [
        `rm -rf ${tmpDirBasename}`,
        `git clone https://github.com/etalab/sill-data ${tmpDirBasename}`,
        `cd ${tmpDirBasename}`,
        `git remote set-url origin https://github.com/etalab/sill-data-test`,
        `git push -f`,
        `git checkout ${buildBranch}`,
        `git push -f`,
        `cd ..`,
        `rm -rf ${tmpDirBasename}`,
    ].join(" && "),
);

console.log("https://github.com/etalab/sill-data-test");
