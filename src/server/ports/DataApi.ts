import type { CompiledData } from "../../model/types";
import type {
    SoftwareRow,
    ReferentRow,
    SoftwareReferentRow,
    ServiceRow,
} from "../../model/types";
import type { StatefulReadonlyEvt } from "evt";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";
import { zSoftwareRow } from "../../model/z";

export type DataApi = {
    evtState: StatefulReadonlyEvt<DataApi.State>;

    derivedStates: {
        evtReferentsBySoftwareId: StatefulReadonlyEvt<
            Record<number, CompiledData.Software.WithReferent["referents"]>
        >;
        evtCompiledDataWithoutReferents: StatefulReadonlyEvt<
            CompiledData<"without referents">
        >;
        evtTags: StatefulReadonlyEvt<string[]>;
    };

    mutators: {
        createReferent: (params: {
            referentRow: ReferentRow;
            softwareId: number;
            isExpert: boolean;
            useCaseDescription: string;
            isPersonalUse: boolean;
        }) => Promise<void>;
        userNoLongerReferent: (params: {
            email: string;
            softwareId: number;
        }) => Promise<void>;
        addSoftware: (params: {
            partialSoftwareRow: PartialSoftwareRow;
            referentRow: ReferentRow;
            isExpert: boolean;
            useCaseDescription: string;
            isPersonalUse: boolean;
        }) => Promise<{ software: CompiledData.Software<"with referents"> }>;
        updateSoftware: (params: {
            softwareId: number;
            partialSoftwareRow: PartialSoftwareRow;
            email: string;
        }) => Promise<{ software: CompiledData.Software<"with referents"> }>;
        changeUserAgencyName: (params: {
            email: string;
            newAgencyName: string;
        }) => Promise<void>;
        updateUserEmail: (params: {
            email: string;
            newEmail: string;
        }) => Promise<void>;
    };
};

export namespace DataApi {
    export type State = {
        compiledData: CompiledData<"with referents">;
        db: {
            softwareRows: SoftwareRow[];
            referentRows: ReferentRow[];
            softwareReferentRows: SoftwareReferentRow[];
            serviceRows: ServiceRow[];
        };
    };
}

type PartialSoftwareRowKey =
    | "name"
    | "function"
    | "isFromFrenchPublicService"
    | "wikidataId"
    | "comptoirDuLibreId"
    | "license"
    | "versionMin"
    | "agentWorkstation"
    | "tags"
    | "alikeSoftwares"
    | "dereferencing";

assert<PartialSoftwareRowKey extends keyof SoftwareRow ? true : false>();

type PartialSoftwareRow = Pick<SoftwareRow, PartialSoftwareRowKey>;

export const zPartialSoftwareRow = zSoftwareRow.pick({
    "name": true,
    "function": true,
    "isFromFrenchPublicService": true,
    "wikidataId": true,
    "comptoirDuLibreId": true,
    "license": true,
    "versionMin": true,
    "agentWorkstation": true,
    "tags": true,
    "alikeSoftwares": true,
    "dereferencing": true,
});

{
    type Got = ReturnType<typeof zPartialSoftwareRow["parse"]>;
    type Expected = PartialSoftwareRow;

    assert<Equals<Got, Expected>>();
}
