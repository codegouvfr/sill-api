import type { SoftwareCsvRow, ReferentCsvRow, ServiceCsvRow } from "./types";
import { exclude } from "tsafe/exclude";

function softwareCsvRowsToRawSoftwareCsvRows(params: {
    softwareCsvRows: SoftwareCsvRow[];
}): Record<SoftwareCsvRow.Column, string>[] {
    const { softwareCsvRows } = params;

    return softwareCsvRows.map(
        ({
            id,
            name,
            function: softwareFunction,
            referencedSinceTime,
            recommendationStatus,
            parentSoftware,
            isFromFrenchPublicService,
            isPresentInSupportContract,
            alikeSoftwares,
            wikidataId,
            comptoirDuLibreId,
            license,
            whereAndInWhatContextIsItUsed,
            catalogNumeriqueGouvFrId,
            useCasesUrl,
            workshopUrl,
            testUrl,
            mimGroup,
            versionMin,
            versionMax,
        }) => ({
            "ID": `${id}`,
            "nom": name,
            "fonction": softwareFunction,
            "annees": (() => {
                const thisYear = new Date().getFullYear();

                return new Array(
                    thisYear - new Date(referencedSinceTime).getFullYear(),
                )
                    .fill(NaN)
                    .map((_, i) => `${2022 - i}`)
                    .reverse()
                    .join(" ; ");
            })(),
            "statut": (() => {
                switch (recommendationStatus) {
                    case "in observation":
                        return "O";
                    case "recommended":
                        return "R";
                    case "no longer recommended":
                        return "FR";
                }
            })(),
            "parent":
                (parentSoftware === undefined
                    ? undefined
                    : parentSoftware.isKnown
                    ? softwareCsvRows.find(
                          ({ id }) => id === parentSoftware.softwareId,
                      )!.name
                    : parentSoftware.softwareName) ?? "",
            "public": isFromFrenchPublicService ? "Oui" : "",
            "support": isPresentInSupportContract ? "Oui" : "",
            "similaire-a": alikeSoftwares
                .map(softwareRef =>
                    !softwareRef.isKnown
                        ? softwareRef.softwareName
                        : softwareCsvRows.find(
                              ({ id }) => id === softwareRef.softwareId,
                          )!.name,
                )
                .join(" ; "),
            "wikidata": wikidataId ?? "",
            "comptoir-du-libre": `${comptoirDuLibreId}`,
            "licence": license,
            "contexte-usage": whereAndInWhatContextIsItUsed ?? "",
            "label": catalogNumeriqueGouvFrId ?? "",
            "fiche": useCasesUrl.join(" ; "),
            "atelier": workshopUrl ?? "",
            "test": testUrl ?? "",
            "groupe": mimGroup,
            "version_min": versionMin,
            "version_max": versionMax ?? "",
        }),
    );
}

function referentCsvRowsToRawReferentCsvRows(params: {
    referentCsvRows: ReferentCsvRow[];
    softwareCsvRows: SoftwareCsvRow[];
}): Record<ReferentCsvRow.Column, string>[] {
    const { referentCsvRows, softwareCsvRows } = params;

    return softwareCsvRows
        .map(software => {
            if (software.referentId === undefined) {
                return undefined;
            }

            const referent = referentCsvRows.find(
                ({ id }) => id === software.referentId,
            )!;

            return {
                "Logiciel": software.name,
                "Courriel": referent.email,
                "Courriel 2": referent.emailAlt ?? "",
                "Référent : expert technique ?": software.isReferentExpert
                    ? "Oui"
                    : "",
            };
        })
        .filter(exclude(undefined));
}

function serviceCsvRowsToRawServiceCsvRows(params: {
    serviceCsvRows: ServiceCsvRow[];
    softwareCsvRows: SoftwareCsvRow[];
}): Record<ServiceCsvRow.Column, string>[] {
    const { serviceCsvRows, softwareCsvRows } = params;

    return serviceCsvRows.map(
        ({
            id,
            agencyName,
            publicSector,
            agencyUrl,
            serviceName,
            serviceUrl,
            description,
            publicationDate,
            lastUpdateDate,
            signupScope,
            usageScope,
            signupValidationMethod,
            contentModerationMethod,
            ...rest
        }) => ({
            "id": `${id}`,
            "agency_name": agencyName,
            "public_sector": publicSector,
            "agency_url": agencyUrl,
            "service_name": serviceName,
            "service_url": serviceUrl,
            "description": description,
            "software_name":
                rest.softwareId === undefined
                    ? rest.softwareName
                    : softwareCsvRows.find(({ id }) => id === rest.softwareId)!
                          .name,
            "software_sill_id": `${rest.softwareId ?? ""}`,
            "software_comptoir_id": `${
                (rest.softwareId === undefined
                    ? rest.comptoirDuLibreId
                    : softwareCsvRows.find(({ id }) => id === rest.softwareId)!
                          .comptoirDuLibreId) ?? ""
            }`,
            "publication_date": publicationDate,
            "last_update_date": lastUpdateDate,
            "signup_scope": signupScope,
            "usage_scope": usageScope,
            "signup_validation_method": signupValidationMethod,
            "content_moderation_method": contentModerationMethod,
        }),
    );
}

export function modelToCsv(params: {
    softwareCsvRows: SoftwareCsvRow[];
    referentCsvRows: ReferentCsvRow[];
    serviceCsvRows: ServiceCsvRow[];
}): {
    rawSoftwareCsvRows: Record<SoftwareCsvRow.Column, string>[];
    rawReferentCsvRows: Record<ReferentCsvRow.Column, string>[];
    rawServiceCsvRows: Record<ServiceCsvRow.Column, string>[];
} {
    const { softwareCsvRows, referentCsvRows, serviceCsvRows } = params;

    return {
        "rawSoftwareCsvRows": softwareCsvRowsToRawSoftwareCsvRows({
            softwareCsvRows,
        }),
        "rawReferentCsvRows": referentCsvRowsToRawReferentCsvRows({
            referentCsvRows,
            softwareCsvRows,
        }),
        "rawServiceCsvRows": serviceCsvRowsToRawServiceCsvRows({
            serviceCsvRows,
            softwareCsvRows,
        }),
    };
}
