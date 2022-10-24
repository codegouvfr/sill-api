import type {
    CompiledData,
    SoftwareRow,
    ReferentRow,
    SoftwareReferentRow,
    ServiceRow,
} from "../../../model/types";

export type Db = {
    softwareRows: SoftwareRow[];
    referentRows: ReferentRow[];
    softwareReferentRows: SoftwareReferentRow[];
    serviceRows: ServiceRow[];
};

export type DbApi = {
    fetchCompiledData: () => Promise<CompiledData<"with referents">>;
    fetchDb: () => Promise<Db>;
    updateDb: (params: { newDb: Db; commitMessage: string }) => Promise<void>;
};
