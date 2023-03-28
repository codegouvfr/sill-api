import type { ReturnType } from "tsafe";
import { TRPCError } from "@trpc/server";
import { assert } from "tsafe/assert";
import { z } from "zod";
import * as fs from "fs";
import { join as pathJoin } from "path";
import { getProjectRoot } from "../tools/getProjectRoot";
import fetch from "node-fetch";
import type { CoreApi } from "../core";
import type { Context } from "./context";
import type { User } from "./user";
import type { KeycloakParams } from "../tools/createValidateKeycloakSignature";
import type {
    SoftwareType,
    Os,
    SoftwareFormData,
    WikidataEntry,
    DeclarationFormData,
    InstanceFormData
} from "../core/usecases/readWriteSillData";
import type { Equals } from "tsafe";
import type { OptionalIfCanBeUndefined } from "../tools/OptionalIfCanBeUndefined";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { LocalizedString, Language } from "../core/ports/GetWikidataSoftware";

export function createRouter(params: {
    coreApi: CoreApi;
    keycloakParams: KeycloakParams | undefined;
    jwtClaimByUserKey: Record<keyof User, string>;
    termsOfServiceUrl: LocalizedString;
}) {
    const { coreApi, keycloakParams, jwtClaimByUserKey, termsOfServiceUrl } = params;

    const t = initTRPC.context<Context>().create({
        "transformer": superjson
    });

    const router = t.router({
        "getApiVersion": t.procedure.query(
            (() => {
                const out: string = JSON.parse(
                    fs.readFileSync(pathJoin(getProjectRoot(), "package.json")).toString("utf8")
                )["version"];

                return () => out;
            })()
        ),
        "getOidcParams": t.procedure.query(
            (() => {
                const out = {
                    "keycloakParams": (() => {
                        if (keycloakParams === undefined) {
                            return undefined;
                        }

                        const { url, realm, clientId } = keycloakParams;

                        return { url, realm, clientId };
                    })(),
                    jwtClaimByUserKey,
                    termsOfServiceUrl
                };

                return () => out;
            })()
        ),
        "getSoftwares": t.procedure.query(() => {
            const { softwares } = coreApi.selectors.readWriteSillData.softwares(coreApi.getState());
            return softwares;
        }),
        "getInstances": t.procedure.query(() => {
            const { instances } = coreApi.selectors.readWriteSillData.instances(coreApi.getState());
            return instances;
        }),
        "getWikidataOptions": t.procedure
            .input(
                z.object({
                    "queryString": z.string(),
                    "language": zLanguage
                })
            )
            .query(({ ctx: { user }, input }) => {
                if (user === undefined) {
                    //To prevent abuse.
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { queryString, language } = input;

                return coreApi.functions.suggestionAndAutoFill.getWikidataOptionsWithPresenceInSill({
                    queryString,
                    language
                });
            }),
        "getSoftwareFormAutoFillDataFromWikidataAndOtherSources": t.procedure
            .input(
                z.object({
                    "wikidataId": z.string()
                })
            )
            .query(async ({ ctx: { user }, input }) => {
                if (user === undefined) {
                    //To prevent abuse.
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { wikidataId } = input;

                return coreApi.functions.suggestionAndAutoFill.getSoftwareFormAutoFillDataFromWikidataAndOtherSources({
                    wikidataId
                });
            }),
        "createSoftware": t.procedure
            .input(
                z.object({
                    "formData": zSoftwareFormData
                })
            )
            .mutation(async ({ ctx: { user }, input }) => {
                if (user === undefined) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { formData } = input;

                await coreApi.functions.readWriteSillData.createSoftware({
                    formData,
                    "agent": {
                        "email": user.email,
                        "organization": user.agencyName
                    }
                });
            }),
        "updateSoftware": t.procedure
            .input(
                z.object({
                    "softwareSillId": z.number(),
                    "formData": zSoftwareFormData
                })
            )
            .mutation(async ({ ctx: { user }, input }) => {
                if (user === undefined) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { softwareSillId, formData } = input;

                await coreApi.functions.readWriteSillData.updateSoftware({
                    softwareSillId,
                    formData,
                    "agent": {
                        "email": user.email,
                        "organization": user.agencyName
                    }
                });
            }),
        "createUserOrReferent": t.procedure
            .input(
                z.object({
                    "formData": zDeclarationFormData,
                    "softwareName": z.string()
                })
            )
            .mutation(async ({ ctx: { user }, input }) => {
                if (user === undefined) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { formData, softwareName } = input;

                await coreApi.functions.readWriteSillData.createUserOrReferent({
                    formData,
                    softwareName,
                    "agent": {
                        "email": user.email,
                        "organization": user.agencyName
                    }
                });
            }),
        "createInstance": t.procedure
            .input(
                z.object({
                    "formData": zInstanceFormData
                })
            )
            .mutation(async ({ ctx: { user }, input }) => {
                if (user === undefined) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { formData } = input;

                const { instanceId } = await coreApi.functions.readWriteSillData.createInstance({
                    formData,
                    "agent": {
                        "email": user.email,
                        "organization": user.agencyName
                    }
                });

                return { instanceId };
            }),
        "updateInstance": t.procedure
            .input(
                z.object({
                    "instanceId": z.number(),
                    "formData": zInstanceFormData
                })
            )
            .mutation(async ({ ctx: { user }, input }) => {
                if (user === undefined) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { instanceId, formData } = input;

                await coreApi.functions.readWriteSillData.updateInstance({
                    instanceId,
                    formData,
                    "agentEmail": user.email
                });
            }),
        "getAgents": t.procedure.query(async ({ ctx: { user } }) => {
            if (user === undefined) {
                throw new TRPCError({ "code": "UNAUTHORIZED" });
            }

            return coreApi.selectors.readWriteSillData.agents(coreApi.getState());
        }),
        "getAllowedEmailRegexp": t.procedure.query(coreApi.extras.userApi.getAllowedEmailRegexp),
        "getAgencyNames": t.procedure.query(coreApi.extras.userApi.getAgencyNames),
        "changeAgentOrganization": t.procedure
            .input(
                z.object({
                    "newOrganization": z.string()
                })
            )
            .mutation(async ({ ctx: { user }, input }) => {
                if (user === undefined) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                assert(keycloakParams !== undefined);

                const { newOrganization } = input;

                await coreApi.functions.readWriteSillData.changeAgentOrganization({
                    "email": user.email,
                    newOrganization,
                    "userId": user.id
                });
            }),
        "updateEmail": t.procedure
            .input(
                z.object({
                    "newEmail": z.string().email()
                })
            )
            .mutation(async ({ ctx: { user }, input }) => {
                if (user === undefined) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { newEmail } = input;

                assert(keycloakParams !== undefined);

                await coreApi.functions.readWriteSillData.updateUserEmail({
                    "userId": user.id,
                    "email": user.email,
                    newEmail
                });
            }),
        "getRegisteredUserCount": t.procedure.query(async () => coreApi.extras.userApi.getUserCount()),
        "getTotalReferentCount": t.procedure.query(() =>
            coreApi.selectors.readWriteSillData.referentCount(coreApi.getState())
        ),
        "downloadCorsProtectedTextFile": t.procedure.input(z.object({ "url": z.string() })).query(async ({ input }) => {
            const { url } = input;

            const textContent = await fetch(url).then(res => res.text());

            return textContent;
        })
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

const zSoftwareFormData = (() => {
    const zOut = z.object({
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
        type Got = ReturnType<(typeof zOut)["parse"]>;
        type Expected = OptionalIfCanBeUndefined<SoftwareFormData>;

        assert<Equals<Got, Expected>>();
    }

    return zOut as z.ZodType<SoftwareFormData>;
})();

const zDeclarationFormData = (() => {
    const zUser = z.object({
        "declarationType": z.literal("user"),
        "usecaseDescription": z.string(),
        "os": zOs.optional(),
        "version": z.string(),
        "serviceUrl": z.string().optional()
    });

    {
        type Got = ReturnType<(typeof zUser)["parse"]>;
        type Expected = OptionalIfCanBeUndefined<DeclarationFormData.User>;

        assert<Equals<Got, Expected>>();
    }

    const zReferent = z.object({
        "declarationType": z.literal("referent"),
        "isTechnicalExpert": z.boolean(),
        "usecaseDescription": z.string(),
        "serviceUrl": z.string().optional()
    });

    {
        type Got = ReturnType<(typeof zReferent)["parse"]>;
        type Expected = OptionalIfCanBeUndefined<DeclarationFormData.Referent>;

        assert<Equals<Got, Expected>>();
    }

    return z.union([zUser, zReferent]) as z.ZodType<DeclarationFormData>;
})();

const zInstanceFormData = (() => {
    const zOut = z.object({
        "mainSoftwareSillId": z.number(),
        "organization": z.string(),
        "targetAudience": z.string(),
        "publicUrl": z.string().optional(),
        "otherSoftwares": z.array(zWikidataEntry)
    });

    {
        type Got = ReturnType<(typeof zOut)["parse"]>;
        type Expected = OptionalIfCanBeUndefined<InstanceFormData>;

        assert<Equals<Got, Expected>>();
    }

    return zOut as z.ZodType<InstanceFormData>;
})();

const zLanguage = z.union([z.literal("fr"), z.literal("en")]);

{
    type Got = ReturnType<(typeof zLanguage)["parse"]>;
    type Expected = Language;

    assert<Equals<Got, Expected>>();
}
