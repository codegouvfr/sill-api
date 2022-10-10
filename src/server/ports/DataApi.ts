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
            softwareRowEditableByForm: SoftwareRowEditableByForm;
            referentRow: ReferentRow;
            isExpert: boolean;
            useCaseDescription: string;
            isPersonalUse: boolean;
        }) => Promise<{ software: CompiledData.Software<"with referents"> }>;
        updateSoftware: (params: {
            softwareId: number;
            softwareRowEditableByForm: SoftwareRowEditableByForm;
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
        dereferenceSoftware: (params: {
            softwareId: number;
            email: string;
            dereferencing: {
                reason?: string;
                time: number;
                lastRecommendedVersion?: string;
            };
        }) => Promise<void>;
        deleteService: (params: {
            serviceId: number;
            reason: string;
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

type SoftwareRowKeyEditableByForm =
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
    | "generalInfoMd";

assert<SoftwareRowKeyEditableByForm extends keyof SoftwareRow ? true : false>();

type SoftwareRowEditableByForm = Pick<
    SoftwareRow,
    SoftwareRowKeyEditableByForm
>;

export const zSoftwareRowEditableByForm = zSoftwareRow.pick({
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
    "generalInfoMd": true,
});

{
    type Got = ReturnType<typeof zSoftwareRowEditableByForm["parse"]>;
    type Expected = SoftwareRowEditableByForm;

    assert<Equals<Got, Expected>>();
}
