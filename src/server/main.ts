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
import { Evt } from "evt";
import type { DataApi } from "./ports/DataApi";
import {
    createGitHubDataApi,
    buildBranch,
} from "./adapter/createGitHubDataApi";
import { createValidateGitHubWebhookSignature } from "../tools/validateGithubWebhookSignature";
import { fetchWikiDataData as fetchWikidataData } from "../model/fetchWikiDataData";
import { getLatestSemVersionedTagFromSourceUrl } from "../tools/getLatestSemVersionedTagFromSourceUrl";
import { fetchComptoirDuLibre } from "../model/fetchComptoirDuLibre";
import type { Language } from "../model/types";
import { createResolveLocalizedString } from "i18nifty/LocalizedString";
import { id } from "tsafe/id";
const { resolveLocalizedString } = createResolveLocalizedString({
    "currentLanguage": id<Language>("en"),
    "fallbackLanguage": "en",
});

const configuration = getConfiguration();

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
        "jwtPayload": jwtSimple.decode(jwtToken, "", true),
    });

    return { parsedJwt };
}

const createRouter = (params: { dataApi: DataApi }) => {
    const { dataApi } = params;
    const router = trpc
        .router<ReturnType<typeof createContext>>()
        .query("getOidcParams", {
            "resolve": (() => {
                const { keycloakParams, jwtClaims } = configuration;

                return () => ({ keycloakParams, jwtClaims });
            })(),
        })
        .query("getCompiledData", {
            "resolve": () =>
                dataApi.derivedStates.evtCompiledDataWithoutReferents.state,
        })
        .query("getReferentsBySoftwareId", {
            "resolve": async ({ ctx }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }
                return dataApi.derivedStates.evtReferentsBySoftwareId.state;
            },
        })
        .mutation("declareUserReferent", {
            "input": z.object({
                "softwareId": z.number(),
                "isExpert": z.boolean(),
                "useCaseDescription": z.string(),
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { softwareId, isExpert, useCaseDescription } = input;

                const { agencyName, email } = ctx.parsedJwt;

                await dataApi.mutators.createReferent({
                    "referentRow": {
                        agencyName,
                        email,
                        "firstName": "todo ask when register",
                        "familyName": "todo ask when register",
                    },
                    softwareId,
                    isExpert,
                    useCaseDescription,
                });
            },
        })
        .mutation("userNoLongerReferent", {
            "input": z.object({
                "softwareId": z.number(),
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { softwareId } = input;

                const { email } = ctx.parsedJwt;

                await dataApi.mutators.userNoLongerReferent({
                    softwareId,
                    email,
                });
            },
        })
        .mutation("addSoftware", {
            "input": z.object({
                "partialSoftwareRow": zPartialSoftwareRow,
                "isExpert": z.boolean(),
                "useCaseDescription": z.string(),
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { isExpert, partialSoftwareRow, useCaseDescription } =
                    input;

                const { email, agencyName } = ctx.parsedJwt;

                const { software } = await dataApi.mutators.addSoftware({
                    partialSoftwareRow,
                    "referentRow": {
                        agencyName,
                        email,
                        "firstName": "todo ask when register",
                        "familyName": "todo ask when register",
                    },
                    isExpert,
                    useCaseDescription,
                });

                return { software };
            },
        })
        .mutation("updateSoftware", {
            "input": z.object({
                "softwareId": z.number(),
                "partialSoftwareRow": zPartialSoftwareRow,
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }

                const { softwareId, partialSoftwareRow } = input;

                const { email } = ctx.parsedJwt;

                const { software } = await dataApi.mutators.updateSoftware({
                    partialSoftwareRow,
                    softwareId,
                    email,
                });

                return { software };
            },
        })
        .query("autoFillFormInfo", {
            "input": z.object({
                "wikidataId": z.string(),
            }),
            "resolve": async ({ ctx, input }) => {
                if (ctx === null) {
                    throw new TRPCError({ "code": "UNAUTHORIZED" });
                }
                const { wikidataId } = input;

                const wikidataData = await fetchWikidataData({ wikidataId });

                const comptoirDuLibreId = await (async () => {
                    const comptoirDuLibre = await fetchComptoirDuLibre();

                    const comptoirDuLibreSoftware =
                        comptoirDuLibre.softwares.find(software => {
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
                                format(
                                    resolveLocalizedString(wikidataData.label),
                                ).substring(0, 8),
                            );
                        });

                    return comptoirDuLibreSoftware?.id;
                })();

                const latestSemVersionedTag =
                    wikidataData.sourceUrl === undefined
                        ? undefined
                        : await getLatestSemVersionedTagFromSourceUrl({
                              "githubPersonalAccessToken":
                                  configuration.githubPersonalAccessToken,
                              "sourceUrl": wikidataData.sourceUrl,
                          });

                return {
                    wikidataData,
                    latestSemVersionedTag,
                    comptoirDuLibreId,
                };
            },
        });

    return { router };
};
export type TrpcRouter = ReturnType<typeof createRouter>["router"];

const isDevelopment = process.env["ENVIRONNEMENT"] === "development";

(async function main() {
    const evtDataUpdated = Evt.create();

    express()
        .use(cors())
        .use(
            (req, _res, next) => (
                console.log("⬅", req.method, req.path, req.body ?? req.query),
                next()
            ),
        )
        .use("/public/healthcheck", (...[, res]) => res.sendStatus(200))
        .post(
            "/api/ondataupdated",
            (() => {
                const { validateGitHubWebhookSignature } =
                    createValidateGitHubWebhookSignature({
                        "githubWebhookSecret":
                            configuration.githubWebhookSecret,
                    });

                return async (req, res) => {
                    console.log("Webhook signature OK");
                    const reqBody = await validateGitHubWebhookSignature(
                        req,
                        res,
                    );

                    assert(
                        configuration.dataRepoUrl.replace(/\/$/, "") ===
                            reqBody.repository.url,
                        "Webhook doesn't come from the right repo",
                    );

                    if (reqBody.ref !== `refs/heads/${buildBranch}`) {
                        console.log(
                            `Not a push on the ${buildBranch} branch, doing nothing`,
                        );
                        res.sendStatus(200);
                        return;
                    }

                    console.log("Refreshing data");

                    evtDataUpdated.post();

                    res.sendStatus(200);
                };
            })(),
        )
        .use(
            "/api",
            await (async () => {
                const { router } = createRouter({
                    "dataApi": await createGitHubDataApi({
                        "dataRepoUrl": configuration.dataRepoUrl,
                        "githubPersonalAccessToken":
                            configuration.githubPersonalAccessToken,
                        evtDataUpdated,
                        "doPeriodicallyTriggerComputationOfCompiledData":
                            !isDevelopment,
                    }),
                });

                return trpcExpress.createExpressMiddleware({
                    router,
                    createContext,
                });
            })(),
        )
        .listen(configuration.port, () =>
            console.log(`Listening on port ${configuration.port}`),
        );
})();

const zPartialSoftwareRow = z.object({
    "name": z.string(),
    "function": z.string(),
    "isFromFrenchPublicService": z.boolean(),
    "wikidataId": z.string().optional(),
    "comptoirDuLibreId": z.number().optional(),
    "license": z.string(),
    "versionMin": z.string(),
    "agentWorkstation": z.boolean(),
    "isPresentInSupportContract": z.boolean(),
});
