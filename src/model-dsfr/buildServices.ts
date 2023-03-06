import type { CompiledData, ServiceRow } from "./types";

export async function buildServices(params: {
    serviceRows: ServiceRow[];
}): Promise<{ services: CompiledData.Service[] }> {
    const { serviceRows } = params;

    const services = serviceRows;

    return { services };
}
