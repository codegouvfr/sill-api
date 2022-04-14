import type { CompiledData } from "../../model/types";
import type {
    SoftwareRow,
    ReferentRow,
    SoftwareReferentRow,
    ServiceRow,
} from "../../model/types";
import type { StatefulReadonlyEvt } from "evt";

export type DataApi = {
    evtState: StatefulReadonlyEvt<DataApi.State>;

    derivedStates: {
        evtReferentsBySoftwareId: StatefulReadonlyEvt<
            Record<number, CompiledData.Software.WithReferent["referents"]>
        >;
        evtCompiledDataWithoutReferents: StatefulReadonlyEvt<
            CompiledData<"without referents">
        >;
    };

    mutators: {
        createReferent: (params: {
            referentRow: ReferentRow;
            softwareId: number;
            isExpert: boolean;
        }) => Promise<void>;
        userNoLongerReferent: (params: {
            email: string;
            softwareId: number;
        }) => Promise<void>;
        addSoftware: (params: {
            partialSoftwareRow: Pick<SoftwareRow, PartialSoftwareRowKey>;
            referentRow: ReferentRow;
            isExpert: boolean;
        }) => Promise<{ software: CompiledData.Software<"with referents"> }>;
        updateSoftware: (params: {
            softwareId: number;
            partialSoftwareRow: Pick<SoftwareRow, PartialSoftwareRowKey>;
            email: string;
        }) => Promise<{ software: CompiledData.Software<"with referents"> }>;
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
    | "agentWorkstation";