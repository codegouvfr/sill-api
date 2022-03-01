/* eslint-disable @typescript-eslint/no-namespace */
import type { SoftwareRef } from "./types";
import { SoftwareCsvRow, ReferentCsvRow, ServiceCsvRow } from "./types";
import { assert } from "tsafe/assert";
import { mimGroups } from "./types";
import { id } from "tsafe/id";
import { typeGuard } from "tsafe/typeGuard";
import { arrDiff } from "evt/tools/reducers/diff";

export function csvToModel(params: {
    rawSoftwareCsvRows: Record<string, string>[];
    rawReferentCsvRows: Record<string, string>[];
    rawServiceCsvRow: Record<string, string>[];
}): {
    softwareCsvRows: SoftwareCsvRow[];
    referentCsvRows: ReferentCsvRow[];
    servicesCsvRows: ServiceCsvRow[];
    referentsStats: ReferentCsvRow.Stats[];
} {
    const { rawSoftwareCsvRows, rawReferentCsvRows, rawServiceCsvRow } = params;

    assertsCsv(rawSoftwareCsvRows, SoftwareCsvRow.columns);
    assertsCsv(rawReferentCsvRows, ReferentCsvRow.columns);
    assertsCsv(rawServiceCsvRow, ServiceCsvRow.columns);

    const softwaresByReferent = new Map<
        ReferentCsvRow,
        { softwareName: string; isReferentExpert: true | undefined }[]
    >();

    const referentCsvRows: ReferentCsvRow[] = [];

    {
        const emailRegexp = /^[^@ ]+@[^@ ]+$/;

        rawReferentCsvRows.forEach(row => {
            const [email, m_email] = (() => {
                const column = "Courriel";

                const value = row[column];

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(value !== "", m("Can't be empty"));

                const out = value.toLowerCase();

                assert(emailRegexp.test(out), m("Not a valid email"));

                return [out, m];
            })();

            const [softwareName, m_softwareName] = (() => {
                const column = "Logiciel";

                const value = row[column];

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(value !== "", m("Can't be void"));

                return [value, m];
            })();

            const isReferentExpert = (() => {
                const column = "Référent : expert technique ?";

                const value = row[column];

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(
                    ["", "Oui", "Non"].includes(value),
                    m("Should either be '', 'Oui' or 'Non'"),
                );

                return value === "Oui" ? (true as const) : undefined;
            })();

            const [emailAlt, m_emailAlt] = (() => {
                const column = "Courriel 2";

                const value = row[column];

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                if (value === "") {
                    return [undefined, m];
                }

                const out = value.toLowerCase();

                assert(emailRegexp.test(out), m("Not a valid email"));

                assert(
                    out !== email,
                    m("Must be different from main email or empty"),
                );

                assert(
                    !referentCsvRows.map(({ email }) => email).includes(out),
                    m(
                        "There is already a referent with this email as main email",
                    ),
                );

                assert(
                    !referentCsvRows
                        .map(({ emailAlt }) => emailAlt)
                        .includes(out),
                    m("The is a referent with this email as secondary email"),
                );

                return [out, m];
            })();

            scope: {
                const referent = referentCsvRows.find(
                    referent => referent.email === email,
                );

                if (referent === undefined) {
                    break scope;
                }

                assert(
                    referent.emailAlt === emailAlt,
                    m_emailAlt(
                        "There is an other line where it's the primary email but atl email differs",
                    ),
                );

                assert(
                    !referentCsvRows
                        .filter(r => r !== referent)
                        .find(({ emailAlt }) => emailAlt === email),
                    m_email(
                        "There is another referent with this email as secondary email",
                    ),
                );

                const softwaresName = softwaresByReferent.get(referent);

                assert(softwaresName !== undefined);

                assert(
                    !Array.from(softwaresByReferent.values())
                        .flat()
                        .map(({ softwareName }) => softwareName)
                        .includes(softwareName),
                    m_softwareName(
                        "There is already a referent for this software",
                    ),
                );

                softwaresName.push({ softwareName, isReferentExpert });

                return;
            }

            const referent: ReferentCsvRow = {
                "id": (function hashCode(s) {
                    let out = NaN;
                    for (let h = 0, i = 0; i < s.length; h &= h) {
                        h = 31 * h + s.charCodeAt(i++);
                        out = h;
                    }
                    assert(!isNaN(out));
                    return out;
                })(email),
                email,
                emailAlt,
            };

            referentCsvRows.push(referent);

            softwaresByReferent.set(referent, [
                { softwareName, isReferentExpert },
            ]);
        });
    }

    const parentSoftwareNameBySoftwareId = new Map<number, string>();

    const softwareCsvRows: SoftwareCsvRow[] = [];

    rawSoftwareCsvRows.forEach(row => {
        const softwareId = (() => {
            const column = "ID";

            const value = row[column];

            const m = (reason: string) =>
                creatAssertErrorMessage({ row, column, value, reason });

            const out = parseInt(value);

            assert(!isNaN(out), m("It should be an integer"));

            assert(
                !softwareCsvRows.map(({ id }) => id).includes(out),
                m("There is another software with this id"),
            );

            return out;
        })();

        const name = (() => {
            const column = "nom";

            const value = row[column];
            const m = (reason: string) =>
                creatAssertErrorMessage({ row, column, value, reason });

            assert(value !== "", m("Should not be empty"));

            assert(
                !softwareCsvRows.map(({ name }) => name).includes(value),
                m("There is another software with this name"),
            );

            return value;
        })();

        const software: SoftwareCsvRow = {
            "id": softwareId,
            "name": name,
            "function": (() => {
                const column = "fonction";

                const value = row[column];

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(value !== "", m("Should not be empty"));

                return value;
            })(),
            "referencedSinceTime": (() => {
                const column = "annees";

                const value = row[column];

                const firstYear = value.replace(/ /g, "").split(";")[0];

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(
                    /^[0-9]{4,4}$/.test(firstYear),
                    m(
                        "Should be a ';' separated list of years. E.g. '2021 ; 2022'",
                    ),
                );

                return new Date(firstYear).getTime();
            })(),
            "recommendationStatus": (() => {
                const column = "statut";

                const value = row[column];

                switch (value) {
                    case "O":
                        return "in observation";
                    case "R":
                        return "recommended";
                    case "FR":
                        return "no longer recommended";
                }

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(
                    false,
                    m(
                        "Should either be 'R' (recommended), 'O' (in observation) or 'FR' (no longer recommended)",
                    ),
                );
            })(),
            "parentSoftware": (() => {
                const column = "parent";

                const src = row[column];

                if (src === "") {
                    return undefined;
                }

                parentSoftwareNameBySoftwareId.set(softwareId, src);

                return null as any;
            })(),
            "isFromFrenchPublicService": (() => {
                const column = "public";

                const value = row[column];

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(
                    ["", "Oui"].includes(value),
                    m("Should either be 'Oui' or an empty string"),
                );

                return value === "Oui";
            })(),
            "isPresentInSupportContract": (() => {
                const column = "support";

                const value = row["support"];

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(
                    ["", "Oui"].includes(value),
                    m("Should either be empty or 'Oui' "),
                );

                return value === "Oui";
            })(),
            "alikeSoftwares": (() => {
                const column = "similaire-a";

                const value = row[column];

                if (value === "") {
                    return [];
                }

                const out = value
                    .replace(/ /g, "")
                    .split(";")
                    .map(idAsStringOrName => {
                        const id = parseInt(idAsStringOrName);

                        return isNaN(id) ? idAsStringOrName : id;
                    })
                    .map(
                        (idOrName): SoftwareRef =>
                            typeof idOrName === "string"
                                ? {
                                      "isKnown": false,
                                      "softwareName": idOrName,
                                  }
                                : {
                                      "isKnown": true,
                                      "softwareId": idOrName,
                                  },
                    );

                return out;
            })(),
            "wikidataId": (() => {
                const column = "wikidata";

                const value = row[column];

                if (value === "") {
                    return undefined;
                }

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(
                    /^[A-Z0-9]{3,}$/,
                    m("Should be a valid wikidata identifier. E.g: Q43649390"),
                );

                return value;
            })(),
            "comptoirDuLibreId": (() => {
                const column = "comptoir-du-libre";

                const value = row[column];

                if (value === "") {
                    return undefined;
                }

                const out = parseInt(value);

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(!isNaN(out), m("Should be an integer"));

                return out;
            })(),
            "license": (() => {
                const column = "licence";

                const value = row[column];

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(value !== "", m("Should not be empty"));

                return value;
            })(),
            "contextOfUse": (() => {
                const column = "contexte-usage";

                const src = row[column];

                if (src === "") {
                    return undefined;
                }

                return src;
            })(),
            /* cspell: disable-next-line */
            "catalogNumeriqueGouvFrId": (() => {
                const column = "label";

                const value = row[column];

                if (value === "") {
                    return undefined;
                }

                const url = "https://catalogue.numerique.gouv.fr/solutions/";

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(
                    value.startsWith(url),
                    m(`Is expected to start with ${url}`),
                );

                const out = value.split("/").reverse()[0];

                assert(
                    out !== "",
                    m(`The url do not point to a specific solution`),
                );

                return out;
            })(),
            "mimGroup": (() => {
                const column = "groupe";

                const value = row[column];

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(value !== "", m("Shouldn't be empty"));
                assert(
                    typeGuard<typeof mimGroups[number]>(
                        value,
                        id<readonly string[]>(mimGroups).includes(value),
                    ),
                    m(`Should be one of ${mimGroups.join(", ")}`),
                );

                return value;
            })(),
            "versionMin": (() => {
                const column = "version_min";

                const value = row[column];

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(value !== "", m("Can't be empty"));

                return value;
            })(),
            "versionMax": (() => {
                const column = "version_max";

                const value = row[column];

                if (value === "") {
                    return undefined;
                }

                return value;
            })(),
            ...(() => {
                const referentAndIsExpert = Array.from(
                    softwaresByReferent.entries(),
                )
                    .map(([referent, wraps]) =>
                        wraps.map(wrap => ({ referent, ...wrap })),
                    )
                    .flat()
                    .find(({ softwareName }) => softwareName === name);

                if (referentAndIsExpert === undefined) {
                    return {
                        "referentId": undefined,
                        "isReferentExpert": undefined,
                    };
                }

                const { referent, isReferentExpert } = referentAndIsExpert;

                return {
                    "referentId": referent.id,
                    isReferentExpert,
                };
            })(),
            "workshopUrl": (() => {
                const column = "atelier";

                const value = row[column];

                if (value === "") {
                    return undefined;
                }

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(value.startsWith("http"), m("It should be an url"));

                return value;
            })(),
            "testUrl": (() => {
                const column = "test";

                const value = row[column];

                if (value === "") {
                    return undefined;
                }

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(value.startsWith("http"), m("It should be an url"));

                return value;
            })(),
            "useCasesUrl": (() => {
                const column = "fiche";

                const value = row[column];

                if (value === "") {
                    return [];
                }

                const out = value.replace(/ /g, "").split(";");

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(
                    out.every(url => url.startsWith("http")),
                    m("Every entries should be urls"),
                );

                return out;
            })(),
        };

        softwareCsvRows.push(software);
    });

    softwareCsvRows.forEach(software => {
        const parentSoftwareName = parentSoftwareNameBySoftwareId.get(
            software.id,
        );

        if (parentSoftwareName === undefined) {
            return;
        }

        const parentSoftware = softwareCsvRows.find(({ name }) => {
            const t = (name: string) => name.toLowerCase().replace(/ /g, "");

            return t(name) === t(parentSoftwareName);
        });

        software.parentSoftware =
            parentSoftware === undefined
                ? {
                      "isKnown": false,
                      "softwareName": parentSoftwareName,
                  }
                : {
                      "isKnown": true,
                      "softwareId": parentSoftware.id,
                  };
    });

    const referentsStats = Array.from(softwaresByReferent.entries())
        .map(
            ([referent, softwareNamesAndIsReferentExpert]) =>
                [
                    referent,
                    softwareNamesAndIsReferentExpert.map(
                        ({ softwareName }) => softwareName,
                    ),
                ] as const,
        )
        .map(
            (() => {
                const allSoftwaresName = softwareCsvRows.map(
                    ({ name }) => name,
                );

                return ([referent, softwaresName]) =>
                    [
                        referent,
                        (() => {
                            const totalCount = softwaresName.length;

                            const unknownSoftwaresName = softwaresName.filter(
                                softwareName =>
                                    !allSoftwaresName.includes(softwareName),
                            );

                            return {
                                "softwaresCount":
                                    totalCount - unknownSoftwaresName.length,
                                "unknownSoftwares": unknownSoftwaresName,
                            };
                        })(),
                    ] as const;
            })(),
        )
        .map(([{ id, ...referent }, { softwaresCount, unknownSoftwares }]) => ({
            ...referent,
            softwaresCount,
            ...(unknownSoftwares.length === 0 ? {} : { unknownSoftwares }),
        }))
        .sort((a, b) => b.softwaresCount - a.softwaresCount);

    const servicesCsvRows: ServiceCsvRow[] = [];

    rawServiceCsvRow.forEach(row => {
        const common: ServiceCsvRow.Common = {
            "id": (() => {
                const column = "id";

                const value = row[column];

                const out = parseInt(value);

                const m = (reason: string) =>
                    creatAssertErrorMessage({ row, column, value, reason });

                assert(!isNaN(out), m("Must be an integer"));

                assert(
                    !servicesCsvRows.map(({ id }) => id).includes(out),
                    m(`There is another service with the same id`),
                );

                return out;
            })(),
            "agencyName": row["agency_name"],
            "publicSector": row["public_sector"],
            "agencyUrl": row["agency_url"],
            "serviceName": row["service_name"],
            "serviceUrl": row["service_url"],
            "description": row["description"],
            "publicationDate": row["publication_date"],
            "lastUpdateDate": row["last_update_date"],
            "signupScope": row["signup_scope"],
            "usageScope": row["usage_scope"],
            "signupValidationMethod": row["signup_validation_method"],
            "contentModerationMethod": row["content_moderation_method"],
        };

        const softwareId = (() => {
            const column = "software_sill_id";

            const value = row[column];

            if (value === "") {
                return undefined;
            }

            const out = parseInt(value);

            const m = (reason: string) =>
                creatAssertErrorMessage({ row, column, value, reason });

            assert(!isNaN(out), m("Must be an integer"));

            assert(
                softwareCsvRows.map(({ id }) => id).includes(out),
                m("This id does not correspond to a software"),
            );

            return out;
        })();

        servicesCsvRows.push(
            softwareId === undefined
                ? id<ServiceCsvRow.UnknownSoftware>({
                      ...common,
                      "softwareName": row["software_name"],
                      "comptoirDuLibreId": (() => {
                          const column = "software_comptoir_id";

                          const value = row[column];

                          if (value === "") {
                              return undefined;
                          }

                          const out = parseInt(value);

                          const m = (reason: string) =>
                              creatAssertErrorMessage({
                                  row,
                                  column,
                                  value,
                                  reason,
                              });

                          assert(!isNaN(out), m("Must be an integer"));

                          assert(
                              !softwareCsvRows
                                  .map(
                                      ({ comptoirDuLibreId }) =>
                                          comptoirDuLibreId,
                                  )
                                  .includes(out),
                              m(
                                  "This is a valid cdl id for a known software known, check the sill id",
                              ),
                          );

                          return out;
                      })(),
                  })
                : id<ServiceCsvRow.KnownSoftware>({
                      ...common,
                      softwareId,
                  }),
        );
    });

    return {
        softwareCsvRows,
        referentCsvRows,
        servicesCsvRows,
        referentsStats,
    };
}

function assertsCsv<Columns extends string>(
    csv: any[],
    columns: readonly Columns[],
): asserts csv is Record<Columns, string>[] {
    const { added, removed } = arrDiff(
        id<readonly string[]>(columns),
        Object.keys(csv[0]),
    );

    assert(
        removed.length === 0,
        `The following expected columns are missing from the CSV: ${removed.join(
            ", ",
        )}`,
    );
    assert(
        added.length === 0,
        `The following CSV columns are not expected: ${added.join(", ")}`,
    );
}

function creatAssertErrorMessage<Columns extends string>(params: {
    row: Record<Columns, string>;
    column: Columns;
    value: string;
    reason: string;
}) {
    const { row, column, value, reason } = params;
    return [
        `${JSON.stringify(value)} is not a valid "${column}": ${reason}.`,
        `Checkout the row: ${JSON.stringify(row)}`,
    ].join(" ");
}
