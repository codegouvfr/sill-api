import type { CompiledData, InstanceRow } from "./types";

export async function buildServices(params: {
    serviceRows: InstanceRow[];
}): Promise<{ services: CompiledData.Service[] }> {
    const { serviceRows } = params;

    const services = serviceRows;

    return { services };
}
