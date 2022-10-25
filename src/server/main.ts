import * as trpc from "@trpc/server";
import type { ReturnType } from "tsafe";
import { getConfiguration } from "./configuration";
import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import express from "express";
import * as trpcExpress from "@trpc/server/adapters/express";
import { createValidateKeycloakSignature } from "../tools/createValidateKeycloakSignature";
import { parseJwtPayload } from "../tools/parseJwtPayload";
import * as jwtSimple from "jwt-simple";
import { TRPCError } from "@trpc/server";
import cors from "cors";
import { assert } from "tsafe/assert";
import { zParsedJwtTokenPayload } from "./zParsedJwtTokenPayload";
import { z } from "zod";
import { createValidateGitHubWebhookSignature } from "../tools/validateGithubWebhookSignature";
import { fetchWikiDataData as fetchWikidataData } from "../model/fetchWikiDataData";
import { getLatestSemVersionedTagFromSourceUrl } from "../tools/getLatestSemVersionedTagFromSourceUrl";
import { fetchComptoirDuLibre } from "../model/fetchComptoirDuLibre";
import type { Language } from "../model/types";
import { createResolveLocalizedString } from "i18nifty/LocalizedString";
import { id } from "tsafe/id";
import compression from "compression";
import { zSoftwareRowEditableByForm, zServiceFormData } from "./core/usecases/webApi";
import * as fs from "fs";
import { join as pathJoin } from "path";
import { getProjectRoot } from "../tools/getProjectRoot";
import fetch from "node-fetch";
import { createCoreApi } from "./core";
import { buildBranch } from "./core/adapters/createGitDbApi";

const { resolveLocalizedString } = createResolveLocalizedString({
    "currentLanguage": id<Language>("en"),
    "fallbackLanguage": "en"
});

const configuration = getConfiguration();

const { createContext } = (() => {
    const { validateKeycloakSignature } =
        configuration.keycloakParams !== undefined
            ? createValidateKeycloakSignature(configuration.keycloakParams)
            : { "validateKeycloakSignature": undefined };

    async function createContext({ req }: CreateExpressContextOptions) {
        // Create your context based on the request object
        // Will be available as `ctx` in all your resolvers

        const { authorization } = req.headers;

        if (!authorization) {
            return null;
        }

        const jwtToken = authorization.split(" ")[1];

        await validateKeycloakSignature?.({ jwtToken });

        const parsedJwt = parseJwtPayload({
            "jwtClaims": configuration.jwtClaims,
            zParsedJwtTokenPayload,
            "jwtPayload": jwtSimple.decode(jwtToken, "", true)
        });

        return { parsedJwt };
    }

    return { createContext };
})();

const createRouter = async (coreApi: ReturnType<typeof createCoreApi>) => {
    const {
        selectors,
        getState,
        extras: { userApi },
        functions: { webApi }
    } = coreApi;

    const router = trpc
        .router<ReturnType<typeof createContext>>()
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
                const { keycloakParams, jwtClaims } = configuration;

                return () => ({ keycloakParams, jwtClaims });
            })()
        })
        .query("getCompiledData", {
            "resolve": () => {
                const { compiledDataWithoutReferents } = selectors.webApi.compiledDataWithoutReferents(getState());

                return compiledDataWithoutReferents;
            }
        })
        .query("getAllowedEmailRegexp", {
            "resolve": userApi.getAllowedEmailRegexp
        })
        .query("getAgencyNames", {
            "resolve": userApi.getAgencyNames
        })
        .query("getReferentsBySoftwareId", {
            "resolve": async ({ ctx }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }
                const { referentsBySoftwareId } = selectors.webApi.referentsBySoftwareId(getState());
                return referentsBySoftwareId;
            }
        })
        .query("getTags", {
            "resolve": () => {
                const { tags } = selectors.webApi.tags(getState());
                return tags;
            }
        })
        .mutation("declareUserReferent", {
            "input": z.object({
                "softwareId": z.number(),
                "isExpert": z.boolean(),
                "useCaseDescription": z.string(),
                "isPersonalUse": z.boolean()
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { softwareId, isExpert, useCaseDescription, isPersonalUse } = input;

                const { agencyName, email } = ctx.parsedJwt;

                await webApi.createReferent({
                    "referentRow": {
                        agencyName,
                        email,
                        "firstName": "todo ask when register",
                        "familyName": "todo ask when register"
                    },
                    softwareId,
                    isExpert,
                    useCaseDescription,
                    isPersonalUse
                });
            }
        })
        .mutation("userNoLongerReferent", {
            "input": z.object({
                "softwareId": z.number()
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { softwareId } = input;

                const { email } = ctx.parsedJwt;

                await webApi.userNoLongerReferent({
                    softwareId,
                    email
                });
            }
        })
        .mutation("addSoftware", {
            "input": z.object({
                "softwareRowEditableByForm": zSoftwareRowEditableByForm,
                "isExpert": z.boolean(),
                "useCaseDescription": z.string(),
                "isPersonalUse": z.boolean()
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { isExpert, softwareRowEditableByForm, useCaseDescription, isPersonalUse } = input;

                const { email, agencyName } = ctx.parsedJwt;

                const { software } = await webApi.addSoftware({
                    softwareRowEditableByForm,
                    "referentRow": {
                        agencyName,
                        email,
                        "firstName": "todo ask when register",
                        "familyName": "todo ask when register"
                    },
                    isExpert,
                    useCaseDescription,
                    isPersonalUse
                });

                return { software };
            }
        })
        .mutation("updateSoftware", {
            "input": z.object({
                "softwareId": z.number(),
                "softwareRowEditableByForm": zSoftwareRowEditableByForm
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { softwareId, softwareRowEditableByForm } = input;

                const { email } = ctx.parsedJwt;

                const { software } = await webApi.updateSoftware({
                    softwareRowEditableByForm,
                    softwareId,
                    email
                });

                return { software };
            }
        })
        .mutation("dereferenceSoftware", {
            "input": z.object({
                "softwareId": z.number(),
                "dereferencing": z.object({
                    "reason": z.string().optional(),
                    "lastRecommendedVersion": z.string().optional()
                }),
                "isDeletion": z.boolean()
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { softwareId, dereferencing, isDeletion } = input;

                const { email } = ctx.parsedJwt;

                await webApi.dereferenceSoftware({
                    softwareId,
                    email,
                    "dereferencing": {
                        ...dereferencing,
                        "time": Date.now()
                    },
                    isDeletion
                });
            }
        })
        .mutation("updateAgencyName", {
            "input": z.object({
                "newAgencyName": z.string()
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { newAgencyName } = input;

                const { keycloakParams } = configuration;

                assert(keycloakParams !== undefined);

                await userApi.updateUserAgencyName({
                    "userId": ctx.parsedJwt.id,
                    "agencyName": newAgencyName
                });

                await webApi.changeUserAgencyName({
                    "email": ctx.parsedJwt.email,
                    newAgencyName
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

                const { keycloakParams } = configuration;

                assert(keycloakParams !== undefined);

                await userApi.updateUserEmail({
                    "userId": ctx.parsedJwt.id,
                    "email": newEmail
                });

                await webApi.updateUserEmail({
                    "email": ctx.parsedJwt.email,
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
        })
        .mutation("deleteService", {
            "input": z.object({
                "serviceId": z.number(),
                "reason": z.string()
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { email } = ctx.parsedJwt;

                const { serviceId, reason } = input;

                await webApi.deleteService({
                    serviceId,
                    reason,
                    email
                });
            }
        })
        .mutation("addService", {
            "input": z.object({
                "serviceFormData": zServiceFormData
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { email } = ctx.parsedJwt;

                const { serviceFormData } = input;

                const { service } = await webApi.addService({
                    serviceFormData,
                    email
                });

                return { service };
            }
        })
        .mutation("updateService", {
            "input": z.object({
                "serviceId": z.number(),
                "serviceFormData": zServiceFormData
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { email } = ctx.parsedJwt;

                const { serviceFormData, serviceId } = input;

                const { service } = await webApi.updateService({
                    serviceId,
                    serviceFormData,
                    email
                });

                return { service };
            }
        });

    return { router };
};
export type TrpcRouter = ReturnType<typeof createRouter>["router"];

(async function main() {
    const coreApi = await createCoreApi({
        "gitDbApiParams": {
            "dataRepoSshUrl": configuration.dataRepoSshUrl,
            "sshPrivateKeyName": configuration.sshPrivateKeyForGitName,
            "sshPrivateKey": configuration.sshPrivateKeyForGit
        },
        "keycloakUserApiParams": configuration.keycloakParams
    });

    const { router } = await createRouter(coreApi);

    const {
        functions: { webApi }
    } = coreApi;

    const exposedSubpath = "api";

    express()
        .use(cors())
        .use(compression())
        .use((req, _res, next) => (console.log("⬅", req.method, req.path, req.body ?? req.query), next()))
        .use("/public/healthcheck", (...[, res]) => res.sendStatus(200))
        .post(
            `/${exposedSubpath}/ondataupdated`,
            (() => {
                const { githubWebhookSecret } = configuration;

                if (githubWebhookSecret === undefined) {
                    setInterval(() => {
                        console.log("Checking if data refreshed");
                        webApi.refreshRemoteData();
                    }, 3600 * 1000);

                    return async (...[, res]) => res.sendStatus(410);
                }

                const { validateGitHubWebhookSignature } = createValidateGitHubWebhookSignature({
                    githubWebhookSecret
                });

                return async (req, res) => {
                    console.log("Webhook signature OK");
                    const reqBody = await validateGitHubWebhookSignature(req, res);

                    if (reqBody.ref !== `refs/heads/${buildBranch}`) {
                        console.log(`Not a push on the ${buildBranch} branch, doing nothing`);
                        res.sendStatus(200);
                        return;
                    }

                    console.log("Refreshing data");

                    webApi.refreshRemoteData();

                    res.sendStatus(200);
                };
            })()
        )
        .get(`/${exposedSubpath}/sill.json`, (...[, res]) =>
            res.setHeader("Content-Type", "application/json").send(webApi.getSillJsonBuffer())
        )
        .use(
            `/${exposedSubpath}`,
            trpcExpress.createExpressMiddleware({
                router,
                createContext
            })
        )
        .listen(configuration.port, () => console.log(`Listening on port ${configuration.port}`));
})();
