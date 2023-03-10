import type { CompiledData, Db } from "../../../model-dsfr/types";

export type DbApi = {
    fetchCompiledData: () => Promise<CompiledData<"with referents">>;
    fetchDb: () => Promise<Db>;
    updateDb: (params: { newDb: Db; commitMessage: string }) => Promise<void>;
};
