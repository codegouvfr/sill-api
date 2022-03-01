import { symToStr } from "tsafe/symToStr";
import memoize from "memoizee";
import { assert } from "tsafe/assert";
import type { Equals } from "tsafe";
import { arrDiff } from "evt/tools/reducers/diff";
import * as JSONC from "comment-json";
import { objectKeys } from "tsafe/objectKeys";
import { id } from "tsafe/id";

const kcLanguageTags = [
    "en",
    "fr",
    "ca",
    "cs",
    "da",
    "de",
    "es",
    "hu",
    "it",
    "ja",
    "lt",
    "nl",
    "no",
    "pl",
    "pt-BR",
    "ru",
    "sk",
    "sv",
    "tr",
    "zh-CN",
] as const;
type KcLanguageTag = typeof kcLanguageTags[number];

export type Configuration = {
    //If not defined we will not check the signature and just trust the claims in the JWT.
    keycloakParams?: {
        url: `https://${string}`; //Without the '/auth' at the end
        realm: string;
        clientId: string;
        termsOfServices?: string | Partial<Record<KcLanguageTag, string>>;
    };
    //The name of the properties in the JWT parsed token.
    jwtClaims: {
        email: string;
        familyName: string;
        firstName: string;
        username: string;
        groups: string;
        local: string;
    };
    //Needed to open PRs and pull etalab/sill-referents#archive
    githubPersonalAccessToken: string | { envName: string };
    //Port we listen to, default 8080
    port?: number;
};

export const getConfiguration = memoize(
    (): Omit<Configuration, "githubPersonalAccessToken" | "port"> & {
        githubPersonalAccessToken: string;
        port: number;
    } => {
        const { CONFIGURATION } = process.env;

        const m = (reason: string) =>
            [
                `The ${symToStr({
                    CONFIGURATION,
                })} environnement variable is malformed:`,
                reason,
            ].join(" ");

        if (CONFIGURATION === undefined) {
            throw new Error(
                `We need a ${symToStr({
                    CONFIGURATION,
                })} environnement variable`,
            );
        }

        let configuration: Configuration;

        try {
            configuration = JSONC.parse(CONFIGURATION) as any;
        } catch {
            throw new Error(
                m(
                    `It's not a valid JSONC string (JSONC = JSON + Comment support)\n${CONFIGURATION}`,
                ),
            );
        }

        assert(configuration instanceof Object, m("Should be a JSON object"));

        {
            const {
                keycloakParams,
                jwtClaims,
                githubPersonalAccessToken,
                port,
            } = configuration;

            const propertiesNames = [
                symToStr({ keycloakParams }),
                symToStr({ jwtClaims }),
                symToStr({ githubPersonalAccessToken }),
                symToStr({ port }),
            ] as const;

            assert<
                Equals<typeof propertiesNames[number], keyof Configuration>
            >();

            const { added } = arrDiff(
                propertiesNames,
                Object.keys(configuration),
            );

            assert(
                added.length === 0,
                m(
                    `The following properties are not recognized: ${added.join(
                        " ",
                    )}`,
                ),
            );
        }

        scope: {
            const { keycloakParams } = configuration;

            if (keycloakParams === undefined) {
                break scope;
            }

            const m_1 = (reason: string) =>
                m(`${symToStr({ keycloakParams })}: ${reason}`);

            assert(
                keycloakParams instanceof Object,
                m_1("Is supposed to be an object"),
            );

            const { url, realm, clientId, termsOfServices } = keycloakParams;

            {
                const propertiesNames = [
                    symToStr({ url }),
                    symToStr({ realm }),
                    symToStr({ clientId }),
                    symToStr({ termsOfServices }),
                ] as const;

                assert<
                    Equals<
                        typeof propertiesNames[number],
                        keyof NonNullable<Configuration["keycloakParams"]>
                    >
                >();

                const { added } = arrDiff(
                    propertiesNames,
                    Object.keys(keycloakParams),
                );

                assert(
                    added.length === 0,
                    m_1(
                        `The following properties are not recognized: ${added.join(
                            " ",
                        )}`,
                    ),
                );
            }

            for (const [propertyName, propertyValue] of [
                [symToStr({ url }), url],
                [symToStr({ realm }), realm],
                [symToStr({ clientId }), clientId],
            ] as const) {
                assert(
                    propertyValue !== undefined,
                    m_1(`${propertyName} missing`),
                );
                assert(
                    typeof propertyValue === "string",
                    m_1(`${propertyName} is supposed to be a string`),
                );
                assert(
                    propertyValue !== "",
                    m_1(`${propertyName} is supposed to be a non empty string`),
                );
            }

            assert(
                /^https:\/\//.test(url),
                m_1(
                    `${symToStr({
                        url,
                    })} should be an url (starting with 'https://')`,
                ),
            );
            assert(
                !/\/auth\/?$/.test(url),
                m_1(
                    `${symToStr({
                        url,
                    })} The '/auth' portion of the path should be removed`,
                ),
            );

            scope_1: {
                if (termsOfServices === undefined) {
                    break scope_1;
                }

                if (typeof termsOfServices === "string") {
                    assert(
                        termsOfServices.startsWith("https"),
                        m_1(
                            `If ${symToStr({
                                termsOfServices,
                            })} is a string it should be an url (starting with http) pointing to a .md file`,
                        ),
                    );

                    break scope_1;
                }

                {
                    const languages = objectKeys(termsOfServices);

                    assert(
                        languages.length !== 0,
                        m_1(
                            `${symToStr({
                                termsOfServices,
                            })} if an object is provided it should have at least one tos for one language`,
                        ),
                    );

                    languages.forEach(lng =>
                        assert(
                            id<readonly string[]>(kcLanguageTags).includes(lng),
                            m_1(
                                `${symToStr({
                                    termsOfServices,
                                })}: ${lng} is not a supported languages, supported languages are: ${kcLanguageTags.join(
                                    ", ",
                                )}`,
                            ),
                        ),
                    );

                    languages.forEach(lng => {
                        const url = termsOfServices[lng];
                        assert(
                            typeof url === "string" && url.startsWith("http"),
                            m_1(
                                `${symToStr({
                                    termsOfServices,
                                })} malformed (${lng}). It is supposed to be an url (starting with http) pointing to a .md file`,
                            ),
                        );
                    });
                }
            }
        }

        {
            const { jwtClaims } = configuration;

            const m_1 = (reason: string) =>
                m(`${symToStr({ jwtClaims })}: ${reason}`);

            assert(
                jwtClaims instanceof Object,
                m_1("Is supposed to be an object"),
            );

            const { email, familyName, firstName, groups, local, username } =
                jwtClaims;

            {
                const propertiesNames = [
                    symToStr({ email }),
                    symToStr({ familyName }),
                    symToStr({ firstName }),
                    symToStr({ groups }),
                    symToStr({ local }),
                    symToStr({ username }),
                ] as const;

                assert<
                    Equals<
                        typeof propertiesNames[number],
                        keyof NonNullable<Configuration["jwtClaims"]>
                    >
                >();

                const { added } = arrDiff(
                    propertiesNames,
                    Object.keys(jwtClaims),
                );

                assert(
                    added.length === 0,
                    m_1(
                        `The following properties are not recognized: ${added.join(
                            " ",
                        )}`,
                    ),
                );
            }

            for (const [propertyName, propertyValue] of [
                [symToStr({ email }), email],
                [symToStr({ familyName }), familyName],
                [symToStr({ firstName }), firstName],
                [symToStr({ groups }), groups],
                [symToStr({ local }), local],
                [symToStr({ username }), username],
            ] as const) {
                assert(
                    propertyValue !== undefined,
                    m_1(`${propertyName} missing`),
                );
                assert(
                    typeof propertyValue === "string",
                    m_1(`${propertyName} is supposed to be a non empty string`),
                );
                assert(
                    propertyValue !== "",
                    m_1(`${propertyName} is supposed to be a non empty string`),
                );
            }
        }

        let resolvedGithubPersonalAccessToken: string;

        scope: {
            const { githubPersonalAccessToken } = configuration;

            if (typeof githubPersonalAccessToken === "string") {
                resolvedGithubPersonalAccessToken = githubPersonalAccessToken;
                break scope;
            }

            if (githubPersonalAccessToken instanceof Object) {
                const { envName } = githubPersonalAccessToken;

                const m_1 = (reason: string) =>
                    m(`${symToStr({ githubPersonalAccessToken })}: ${reason}`);

                {
                    const propertiesNames = [symToStr({ envName })] as const;

                    assert<
                        Equals<
                            typeof propertiesNames[number],
                            keyof Exclude<
                                Configuration["githubPersonalAccessToken"],
                                undefined | string
                            >
                        >
                    >();

                    const { added } = arrDiff(
                        propertiesNames,
                        Object.keys(githubPersonalAccessToken),
                    );

                    assert(
                        added.length === 0,
                        m_1(
                            `The following properties are not recognized: ${added.join(
                                " ",
                            )}`,
                        ),
                    );
                }

                assert(
                    envName !== undefined,
                    m_1(`${symToStr({ envName })} missing`),
                );
                assert(
                    typeof envName === "string",
                    m_1(`${symToStr({ envName })} is supposed to be a string`),
                );
                assert(
                    envName !== "",
                    m_1(
                        `${symToStr({
                            envName,
                        })} is supposed to be a non empty string`,
                    ),
                );

                const envValue = process.env[envName];

                assert(
                    envValue !== undefined,
                    m_1(
                        `${envName} environnement variable is supposed to be defined`,
                    ),
                );
                assert(
                    envValue !== "",
                    m_1(
                        `${envName} value is supposed to be a non empty string`,
                    ),
                );

                resolvedGithubPersonalAccessToken = envValue;

                break scope;
            }

            assert(
                false,
                m(
                    `${symToStr({
                        githubPersonalAccessToken,
                    })} is supposed to be a string or an object`,
                ),
            );
        }

        let resolvedPort: number;

        scope: {
            const { port } = configuration;

            if (port === undefined) {
                resolvedPort = 8080;
                break scope;
            }

            assert(
                typeof port === "number",
                m(`${symToStr({ port })} is supposed to be a number`),
            );

            resolvedPort = port;
        }

        const { port, githubPersonalAccessToken, ...rest } = configuration;

        return {
            ...rest,
            [symToStr({ port })]: resolvedPort,
            [symToStr({ githubPersonalAccessToken })]:
                resolvedGithubPersonalAccessToken,
        };
    },
);

if (require.main === module) {
    console.log(getConfiguration());
}