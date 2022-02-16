import type {
    Software,
    CsvSoftwareColumn,
    Referent,
    CsvReferentColumn,
    Service,
    CsvServiceColumn,
} from "./types";
import { exclude } from "tsafe/exclude";

export function softwaresToParsedCsv(params: {
    softwares: Software[];
}): Record<CsvSoftwareColumn, string>[] {
    const { softwares } = params;

    return softwares.map(
        ({
            _id,
            _name,
            _function,
            __referencedSinceTime,
            recommendationStatus,
            parentSoftware,
            isFromFrenchPublicService,
            isPresentInSupportContract,
            alikeSoftwares,
            wikidataId,
            comptoirDuLibreId,
            _license,
            whereAndInWhatContextIsItUsed,
            catalogNumeriqueGouvFrId,
            useCasesUrl,
            workshopUrl,
            testUrl,
            mimGroup,
            __versionMin,
            versionMax,
        }) => ({
            "ID": `${_id}`,
            "nom": _name,
            "fonction": _function,
            "annees": (() => {
                const thisYear = new Date().getFullYear();

                return new Array(thisYear - new Date(__referencedSinceTime).getFullYear())
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
                    ? softwares.find(({ _id }) => _id === parentSoftware.softwareId)!._name
                    : parentSoftware.softwareName) ?? "",
            "public": isFromFrenchPublicService ? "Oui" : "",
            "support": isPresentInSupportContract ? "Oui" : "",
            "similaire-a": alikeSoftwares
                .map(softwareRef =>
                    !softwareRef.isKnown
                        ? softwareRef.softwareName
                        : softwares.find(({ _id }) => _id === softwareRef.softwareId)!._name,
                )
                .join(" ; "),
            "wikidata": wikidataId ?? "",
            "comptoir-du-libre": `${comptoirDuLibreId}`,
            "licence": _license,
            "contexte-usage": whereAndInWhatContextIsItUsed ?? "",
            "label": catalogNumeriqueGouvFrId ?? "",
            "fiche": useCasesUrl.join(" ; "),
            "atelier": workshopUrl ?? "",
            "test": testUrl ?? "",
            "groupe": mimGroup,
            "version_min": __versionMin,
            "version_max": versionMax ?? "",
        }),
    );
}

export function referentsToParsedCsv(params: {
    referents: Referent[];
    softwares: Software[];
}): Record<CsvReferentColumn, string>[] {
    const { referents, softwares } = params;

    return softwares
        .map(software => {
            if (software.referentId === undefined) {
                return undefined;
            }

            const referent = referents.find(({ id }) => id === software.referentId)!;

            return {
                "Logiciel": software._name,
                "Courriel": referent.email,
                "Courriel 2": referent.emailAlt ?? "",
                "Référent : expert technique ?": software.isReferentExpert ? "Oui" : "",
            };
        })
        .filter(exclude(undefined));
}

export function servicesToParsedCsv(params: {
    services: Service[];
    softwares: Software[];
}): Record<CsvServiceColumn, string>[] {
    const { services, softwares } = params;

    return services.map(
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
                    : softwares.find(({ _id }) => _id === rest.softwareId)!._name,
            "software_sill_id": `${rest.softwareId ?? ""}`,
            "software_comptoir_id": `${
                (rest.softwareId === undefined
                    ? rest.comptoirDuLibreId
                    : softwares.find(({ _id }) => _id === rest.softwareId)!.comptoirDuLibreId) ?? ""
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
