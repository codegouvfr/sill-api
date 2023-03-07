import type {
    CompiledData,
    SoftwareRow,
    AgentRow,
    SoftwareUserRow,
    SoftwareReferentRow,
    InstanceRow
} from "../../../model-dsfr/types";

export type Db = {
    softwareRows: SoftwareRow[];
    agentRows: AgentRow[];
    referentRows: SoftwareReferentRow[];
    userRows: SoftwareUserRow[];
    instanceRows: InstanceRow[];
};

export type DbApi = {
    fetchCompiledData: () => Promise<CompiledData<"with referents">>;
    fetchDb: () => Promise<Db>;
    updateDb: (params: { newDb: Db; commitMessage: string }) => Promise<void>;
};
