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
import memoize from "memoizee";
import type {
    SoftwareType,
    Os,
    SoftwareFormData,
    DeclarationFormData,
    InstanceFormData
} from "../core/usecases/readWriteSillData";
import type { Equals } from "tsafe";
import type { OptionalIfCanBeUndefined } from "../tools/OptionalIfCanBeUndefined";
import { initTRPC } from "@trpc/server";
import superjson from "superjson";
import { type LocalizedString, Language, languages } from "../core/ports/GetWikidataSoftware";
import { createResolveLocalizedString } from "i18nifty/LocalizedString/reactless";

export function createRouter(params: {
    coreApi: CoreApi;
    keycloakParams:
        | (KeycloakParams & {
              organizationUserProfileAttributeName: string;
          })
        | undefined;
    jwtClaimByUserKey: Record<keyof User, string>;
    termsOfServiceUrl: LocalizedString;
    readmeUrl: LocalizedString;
}) {
    const { coreApi, keycloakParams, jwtClaimByUserKey, termsOfServiceUrl, readmeUrl } = params;

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
                    jwtClaimByUserKey
                };

                return () => out;
            })()
        ),
        "getOrganizationUserProfileAttributeName": t.procedure.query(
            (() => {
                const { organizationUserProfileAttributeName } = keycloakParams ?? {};
                if (organizationUserProfileAttributeName === undefined) {
                    return () => {
                        throw new TRPCError({ "code": "METHOD_NOT_SUPPORTED" });
                    };
                }
                return () => organizationUserProfileAttributeName;
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

                try {
                    await coreApi.functions.readWriteSillData.createSoftware({
                        formData,
                        "agent": {
                            "email": user.email,
                            "organization": user.organization
                        }
                    });
                } catch (e) {
                    throw new TRPCError({ "code": "INTERNAL_SERVER_ERROR", "message": String(e) });
                }
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
                        "organization": user.organization
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
                        "organization": user.organization
                    }
                });
            }),

        "removeUserOrReferent": t.procedure
            .input(
                z.object({
                    "softwareName": z.string(),
                    "declarationType": z.enum(["user", "referent"])
                })
            )
            .mutation(async ({ ctx: { user }, input }) => {
                if (user === undefined) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { softwareName, declarationType } = input;

                await coreApi.functions.readWriteSillData.removeUserOrReferent({
                    softwareName,
                    "agentEmail": user.email,
                    declarationType
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
                        "organization": user.organization
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
        "updateAgentAbout": t.procedure
            .input(
                z.object({
                    "about": z.union([z.string(), z.literal(undefined)]),
                    "isPublic": z.boolean()
                })
            )
            .mutation(async ({ ctx: { user }, input }) => {
                if (user === undefined) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { about, isPublic } = input;

                await coreApi.functions.readWriteSillData.updateAgentAbout({
                    "email": user.email,
                    "organization": user.organization,
                    about,
                    isPublic
                });
            }),
        "getAgentAbout": t.procedure
            .input(
                z.object({
                    "email": z.string()
                })
            )
            .query(async ({ ctx: { user }, input }) => {
                if (user === undefined) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { email } = input;

                const { about, isPublic } = coreApi.functions.readWriteSillData.getAgentAbout({
                    email
                });

                if (!isPublic && user.email !== email) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                return about;
            }),
        "getAllowedEmailRegexp": t.procedure.query(coreApi.extras.userApi.getAllowedEmailRegexp),
        "getAllOrganizations": t.procedure.query(coreApi.extras.userApi.getAllOrganizations),
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
        "getTermsOfServiceUrl": t.procedure.query(() => termsOfServiceUrl),
        "getMarkdown": t.procedure
            .input(
                z.object({
                    "language": zLanguage,
                    "name": z.union([z.literal("readme"), z.literal("termsOfService")])
                })
            )
            .query(
                (() => {
                    const maxAge = (1000 * 3600) / 2;

                    const memoizedFetch = memoize(async (url: string) => fetch(url).then(res => res.text()), {
                        "promise": true,
                        maxAge,
                        "preFetch": true
                    });

                    // prettier-ignore
                    languages
                        .map(lang => createResolveLocalizedString({ "currentLanguage": lang, "fallbackLanguage": "en" }))
                        .map(({ resolveLocalizedString }) => [termsOfServiceUrl, readmeUrl].map(resolveLocalizedString))
                        .flat()
                        .forEach(async function callee(url) {

                            memoizedFetch(url);

                            await new Promise(resolve => setTimeout(resolve, maxAge - 10_000));

                            callee(url);

                        });

                    return async ({ input }) => {
                        const { language, name } = input;

                        const { resolveLocalizedString } = createResolveLocalizedString({
                            "currentLanguage": language,
                            "fallbackLanguage": "en"
                        });

                        return memoizedFetch(
                            resolveLocalizedString(
                                (() => {
                                    switch (name) {
                                        case "readme":
                                            return readmeUrl;
                                        case "termsOfService":
                                            return termsOfServiceUrl;
                                    }
                                })()
                            )
                        );
                    };
                })()
            )
    });

    return { router };
}

export type TrpcRouter = ReturnType<typeof createRouter>["router"];

const zSoftwareType = z.union([
    z.object({
        "type": z.literal("desktop/mobile"),
        "os": z.object({
            "windows": z.boolean(),
            "linux": z.boolean(),
            "mac": z.boolean(),
            "android": z.boolean(),
            "ios": z.boolean()
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

const zOs = z.enum(["windows", "linux", "mac", "android", "ios"]);

{
    type Got = ReturnType<(typeof zOs)["parse"]>;
    type Expected = Os;

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
        "similarSoftwareWikidataIds": z.array(z.string()),
        "softwareLogoUrl": z.string().optional(),
        "softwareKeywords": z.array(z.string())
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
        "otherSoftwareWikidataIds": z.array(z.string())
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
