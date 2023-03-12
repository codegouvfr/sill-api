import * as trpc from "@trpc/server";
import type { ReturnType } from "tsafe";
import { TRPCError } from "@trpc/server";
import { assert } from "tsafe/assert";
import { z } from "zod";
import { getLatestSemVersionedTagFromSourceUrl } from "../tools/getLatestSemVersionedTagFromSourceUrl";
import * as fs from "fs";
import { join as pathJoin } from "path";
import { getProjectRoot } from "../tools/getProjectRoot";
import fetch from "node-fetch";
import type { CoreApi } from "../core";
import type { Context, User } from "./context";
import type { KeycloakParams } from "../tools/createValidateKeycloakSignature";
import type { SoftwareType, Os, SoftwareFormData, WikidataEntry } from "../core/usecases/readWriteSillData";
import type { Equals } from "tsafe";

export function createRouter(params: {
    coreApi: CoreApi;
    keycloakParams: KeycloakParams | undefined;
    jwtClaimByUserKey: Record<keyof User, string>;
}) {
    const { coreApi, keycloakParams, jwtClaimByUserKey } = params;

    const router = trpc
        .router<Context>()
        .query("getVersion", {
            "resolve": (() => {
                const version: string = JSON.parse(
                    fs.readFileSync(pathJoin(getProjectRoot(), "package.json")).toString("utf8")
                )["version"];

                return () => version;
            })()
        })
        .query("getOidcParams", {
            "resolve": (() => {
                if (keycloakParams === undefined) {
                    throw new TRPCError({ "code": "FORBIDDEN", "message": "Authentication disabled" });
                }

                const { url, realm, clientId } = keycloakParams;

                const out = {
                    "keycloakParams": { url, realm, clientId },
                    jwtClaimByUserKey
                };

                return () => out;
            })()
        })
        .query("getSoftwares", {
            "resolve": () => {
                const { softwares } = coreApi.selectors.readWriteSillData.softwares(coreApi.getState());
                return softwares;
            }
        })
        .query("getInstances", {
            "resolve": () => {
                const { instances } = coreApi.selectors.readWriteSillData.instances(coreApi.getState());
                return instances;
            }
        })
        .query("getAllowedEmailRegexp", {
            "resolve": coreApi.extras.userApi.getAllowedEmailRegexp
        })
        .query("getAgencyNames", {
            "resolve": coreApi.extras.userApi.getAgencyNames
        })
        .query("createSoftware", {
            "input": z.object({
                "formData": zSoftwareFormData
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { formData } = input;

                coreApi.functions.readWriteSillData.createSoftware({
                    formData,
                    "agent": {
                        "email": ctx.user.email,
                        "organization": ctx.user.agencyName
                    }
                });
            }
        })
        .mutation("changeAgentOrganization", {
            "input": z.object({
                "newOrganization": z.string()
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                assert(keycloakParams !== undefined);

                const { newOrganization } = input;

                await coreApi.functions.readWriteSillData.changeAgentOrganization({
                    "email": ctx.user.email,
                    newOrganization,
                    "userId": ctx.user.id
                });
            }
        })
        .mutation("updateEmail", {
            "input": z.object({
                "newEmail": z.string().email()
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { newEmail } = input;

                assert(keycloakParams !== undefined);

                await coreApi.functions.readWriteSillData.updateUserEmail({
                    "userId": ctx.user.id,
                    "email": ctx.user.email,
                    newEmail
                });
            }
        })
        .query("autoFillFormInfo", {
            "input": z.object({
                "wikidataId": z.string()
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }
                const { wikidataId } = input;

                const wikidataData = await fetchWikidataData({ wikidataId });

                if (wikidataData === undefined) {
                    return undefined;
                }

                const comptoirDuLibreId = await (async () => {
                    const comptoirDuLibre = await fetchComptoirDuLibre();

                    const comptoirDuLibreSoftware = comptoirDuLibre.softwares.find(software => {
                        if (wikidataData.label === undefined) {
                            return false;
                        }

                        const format = (name: string) =>
                            name
                                .normalize("NFD")
                                .replace(/[\u0300-\u036f]/g, "")
                                .toLowerCase()
                                .replace(/ g/, "");

                        return format(software.name).includes(
                            format(resolveLocalizedString(wikidataData.label)).substring(0, 8)
                        );
                    });

                    return comptoirDuLibreSoftware?.id;
                })();

                const latestSemVersionedTag =
                    wikidataData.sourceUrl === undefined
                        ? undefined
                        : await getLatestSemVersionedTagFromSourceUrl({
                              "githubPersonalAccessToken": configuration.githubPersonalAccessToken,
                              "sourceUrl": wikidataData.sourceUrl
                          });

                return {
                    wikidataData,
                    latestSemVersionedTag,
                    comptoirDuLibreId
                };
            }
        })
        .query("downloadCorsProtectedTextFile", {
            "input": z.object({
                "url": z.string()
            }),
            "resolve": async ({ input }) => {
                const { url } = input;

                const textContent = await fetch(url).then(res => res.text());

                return textContent;
            }
        });

    return { router };
}

export type TrpcRouter = ReturnType<typeof createRouter>["router"];

const zSoftwareType = z.union([
    z.object({
        "type": z.literal("desktop"),
        "os": z.object({
            "windows": z.boolean(),
            "linux": z.boolean(),
            "mac": z.boolean()
        })
    }),
    z.object({
        "type": z.literal("cloud")
    }),
    z.object({
        "type": z.literal("stack")
    })
]);

{
    type Got = ReturnType<(typeof zSoftwareType)["parse"]>;
    type Expected = SoftwareType;

    assert<Equals<Got, Expected>>();
}

const zOs = z.enum(["windows", "linux", "mac"]);

{
    type Got = ReturnType<(typeof zOs)["parse"]>;
    type Expected = Os;

    assert<Equals<Got, Expected>>();
}

export const zWikidataEntry = z.object({
    "wikidataLabel": z.string(),
    "wikidataDescription": z.string(),
    "wikidataId": z.string()
});

{
    type Got = ReturnType<(typeof zWikidataEntry)["parse"]>;
    type Expected = WikidataEntry;

    assert<Equals<Got, Expected>>();
}

const zSoftwareFormData = z.object({
    "softwareType": zSoftwareType,
    "wikidataId": z.string().optional(),
    "comptoirDuLibreId": z.number().optional(),
    "softwareName": z.string(),
    "softwareDescription": z.string(),
    "softwareLicense": z.string(),
    "softwareMinimalVersion": z.string(),
    "isPresentInSupportContract": z.boolean(),
    "isFromFrenchPublicService": z.boolean(),
    "similarSoftwares": z.array(zWikidataEntry)
});

{
    type Got = ReturnType<(typeof zSoftwareFormData)["parse"]>;
    type Expected = SoftwareFormData;

    assert<Equals<Got, Expected>>();
}
