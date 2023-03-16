import * as trpc from "@trpc/server";
import type { ReturnType } from "tsafe";
import { TRPCError } from "@trpc/server";
import { assert } from "tsafe/assert";
import { z } from "zod";
import * as fs from "fs";
import { join as pathJoin } from "path";
import { getProjectRoot } from "../tools/getProjectRoot";
import fetch from "node-fetch";
import type { CoreApi } from "../core";
import type { Context, User } from "./context";
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

export function createRouter(params: {
    coreApi: CoreApi;
    keycloakParams: KeycloakParams | undefined;
    jwtClaimByUserKey: Record<keyof User, string>;
}) {
    const { coreApi, keycloakParams, jwtClaimByUserKey } = params;

    const router = trpc
        .router<Context>()
        .query("getApiVersion", {
            "resolve": (() => {
                const out: string = JSON.parse(
                    fs.readFileSync(pathJoin(getProjectRoot(), "package.json")).toString("utf8")
                )["version"];

                return () => out;
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
        .query("getWikidataOptions", {
            "input": z.object({
                "queryString": z.string()
            }),
            "resolve": ({ ctx, input }) => {
                if (ctx === null) {
                    //To prevent abuse.
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { queryString } = input;

                return coreApi.functions.suggestionAndAutoFill.getWikidataOptionsWithPresenceInSill({
                    queryString
                });
            }
        })
        .query("getSoftwareFormAutoFillDataFromWikidataAndOtherSources", {
            "input": z.object({
                "wikidataId": z.string()
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    //To prevent abuse.
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { wikidataId } = input;

                return coreApi.functions.suggestionAndAutoFill.getSoftwareFormAutoFillDataFromWikidataAndOtherSources({
                    wikidataId
                });
            }
        })
        .mutation("createSoftware", {
            "input": z.object({
                "formData": zSoftwareFormData
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { formData } = input;

                const { user } = ctx;

                await coreApi.functions.readWriteSillData.createSoftware({
                    formData,
                    "agent": {
                        "email": user.email,
                        "organization": user.agencyName
                    }
                });
            }
        })
        .mutation("updateSoftware", {
            "input": z.object({
                "softwareSillId": z.number(),
                "formData": zSoftwareFormData
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { softwareSillId, formData } = input;

                const { user } = ctx;

                await coreApi.functions.readWriteSillData.updateSoftware({
                    softwareSillId,
                    formData,
                    "agent": {
                        "email": user.email,
                        "organization": user.agencyName
                    }
                });
            }
        })
        .mutation("createUserOrReferent", {
            "input": z.object({
                "formData": zDeclarationFormData
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { formData } = input;

                const { user } = ctx;

                await coreApi.functions.readWriteSillData.createUserOrReferent({
                    formData,
                    "agent": {
                        "email": user.email,
                        "organization": user.agencyName
                    }
                });
            }
        })
        .mutation("createInstance", {
            "input": z.object({
                "formData": zInstanceFormData
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { formData } = input;

                const { user } = ctx;

                await coreApi.functions.readWriteSillData.createInstance({
                    formData,
                    "agent": {
                        "email": user.email,
                        "organization": user.agencyName
                    }
                });
            }
        })
        .mutation("updateInstance", {
            "input": z.object({
                "instanceId": z.number(),
                "formData": zInstanceFormData
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { instanceId, formData } = input;

                await coreApi.functions.readWriteSillData.updateInstance({
                    instanceId,
                    formData
                });
            }
        })
        .query("getAgents", {
            "resolve": async ({ ctx }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                return coreApi.selectors.readWriteSillData.agents(coreApi.getState());
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
        .query("getRegisteredUserCount", {
            "resolve": async () => coreApi.extras.userApi.getUserCount()
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
