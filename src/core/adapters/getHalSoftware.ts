import memoize from "memoizee";
import fetch from "node-fetch";
import { ExternalSoftwareData, GetExternalSoftwareData } from "../ports/GetWikidataSoftware";
import { parseBibliographicFields } from "./parseBibliographicFields";

export const getHalSoftware: GetExternalSoftwareData = memoize(
    async halDocId => {
        const halRawSoftware = await fetchHalSoftwareById(halDocId).catch(error => {
            if (error instanceof HalFetchError) {
                if (error.status === 404 || error.status === undefined) {
                    return undefined;
                }
                throw error;
            }
        });

        if (halRawSoftware === undefined) return;

        if (halRawSoftware.docType_s !== "SOFTWARE") return;

        const bibliographicReferences = parseBibliographicFields(halRawSoftware.label_bibtex);
        const license = bibliographicReferences.license.join(", ");
        const developers = bibliographicReferences.author.map(author => ({
            id: author.toLowerCase().split(" ").join("-"),
            name: author
        }));

        const soft: ExternalSoftwareData = {
            externalId: halRawSoftware.docid,
            origin: "HAL",
            developers,
            label: {
                "en": halRawSoftware?.en_title_s?.[0] ?? "-",
                "fr": halRawSoftware?.fr_title_s?.[0] ?? halRawSoftware.en_title_s?.[0]
            },
            description: {
                "en": halRawSoftware?.en_abstract_s?.[0] ?? "-",
                "fr": halRawSoftware?.fr_abstract_s?.[0] ?? halRawSoftware.en_abstract_s?.[0]
            },
            documentationUrl: halRawSoftware.uri_s,
            isLibreSoftware: halRawSoftware.openAccess_bool,
            license,
            sourceUrl: bibliographicReferences.repository[0],
            websiteUrl: bibliographicReferences.url[0],
            framaLibreId: "",
            logoUrl: ""
        };

        console.log(soft);

        return soft;
    },
    {
        "promise": true,
        "maxAge": 3 * 3600 * 1000
    }
);

export class HalFetchError extends Error {
    constructor(public readonly status: number | undefined) {
        super(`Hal fetch error status: ${status}`);
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

type HalRawSoftware = {
    docid: string;
    label_s: string;
    citationRef_s: string;
    citationFull_s: string;
    label_bibtex: string;
    label_endnote: string;
    label_coins: string;
    openAccess_bool: boolean;
    domainAllCode_s: string[];
    level0_domain_s: string[];
    domain_s: string[];
    level1_domain_s: string[];
    fr_domainAllCodeLabel_fs?: string[];
    en_domainAllCodeLabel_fs?: string[];
    es_domainAllCodeLabel_fs: string[];
    eu_domainAllCodeLabel_fs: string[];
    primaryDomain_s: string;
    en_title_s?: string[];
    fr_title_s?: string[];
    title_s: string[];
    en_keyword_s?: string[];
    keyword_s: string[];
    fr_keyword_s?: string[];
    abstract_s: string[];
    en_abstract_s?: string[];
    fr_abstract_s?: string[];
    authIdFormPerson_s: string[];
    authIdForm_i: number[];
    authLastName_s: string[];
    authFirstName_s: string[];
    authMiddleName_s: string[];
    authFullName_s: string[];
    authLastNameFirstName_s: string[];
    authIdLastNameFirstName_fs: string[];
    authFullNameIdFormPerson_fs: string[];
    authAlphaLastNameFirstNameId_fs: string[];
    authIdFullName_fs: string[];
    authFullNameId_fs: string[];
    authQuality_s: string[];
    authFullNameFormIDPersonIDIDHal_fs: string[];
    authFullNamePersonIDIDHal_fs: string[];
    authIdHalFullName_fs: string[];
    authFullNameIdHal_fs: string[];
    authAlphaLastNameFirstNameIdHal_fs: string[];
    authLastNameFirstNameIdHalPersonid_fs: string[];
    authIdHasPrimaryStructure_fs: string[];
    structPrimaryHasAuthId_fs: string[];
    structPrimaryHasAuthIdHal_fs: string[];
    structPrimaryHasAlphaAuthId_fs: string[];
    structPrimaryHasAlphaAuthIdHal_fs: string[];
    structPrimaryHasAlphaAuthIdHalPersonid_fs: string[];
    authIdHasStructure_fs: string[];
    structHasAuthId_fs: string[];
    structHasAuthIdHal_fs: string[];
    structHasAuthIdHalPersonid_s: string[];
    structHasAlphaAuthId_fs: string[];
    structHasAlphaAuthIdHal_fs: string[];
    structHasAlphaAuthIdHalPersonid_fs: string[];
    instStructId_i: number[];
    instStructIdName_fs: string[];
    instStructNameId_fs: string[];
    instStructName_fs: string[];
    instStructName_s: string[];
    instStructAddress_s: string;
    instStructCountry_s: string;
    instStructType_s: string;
    instStructValid_s: string;
    structId_i: number[];
    structIdName_fs: string[];
    structNameId_fs: string[];
    structName_fs: string[];
    structName_s: string;
    structAddress_s: string;
    structCountry_s: string;
    structType_s: string;
    structValid_s: string;
    contributorId_i: number;
    contributorFullName_s: string;
    contributorIdFullName_fs: string;
    contributorFullNameId_fs: string;
    language_s: string[];
    halId_s: string;
    uri_s: string;
    version_i: number;
    status_i: number;
    instance_s: string;
    sid_i: number;
    submitType_s: string;
    docType_s: string;
    docSubType_s: string;
    oldDocType_s: string;
    thumbId_i: number;
    selfArchiving_bool: boolean;
    authorityInstitution_s: string[];
    reportType_s: string;
    inPress_bool: boolean;
    modifiedDate_tdate: string;
    modifiedDate_s: string;
    modifiedDateY_i: number;
    modifiedDateM_i: number;
    modifiedDateD_i: number;
    submittedDate_tdate: string;
    submittedDate_s: string;
    submittedDateY_i: number;
    submittedDateM_i: number;
    submittedDateD_i: number;
    releasedDate_tdate: string;
    releasedDate_s: string;
    releasedDateY_i: number;
    releasedDateM_i: number;
    releasedDateD_i: number;
    producedDate_tdate: string;
    producedDate_s: string;
    producedDateY_i: number;
    producedDateM_i: number;
    producedDateD_i: number;
    publicationDate_tdate: string;
    publicationDate_s: string;
    publicationDateY_i: number;
    publicationDateM_i: number;
    publicationDateD_i: number;
    owners_i: number[];
    collId_i: number[];
    collName_s: string[];
    collCode_s: string[];
    collCategory_s: string[];
    collIdName_fs: string[];
    collNameId_fs: string[];
    collCodeName_fs: string[];
    collCategoryCodeName_fs: string[];
    collNameCode_fs: string[];
    fileMain_s: string;
    files_s: string[];
    fileType_s: string[];
    _version_: bigint;
    dateLastIndexed_tdate: string;
    label_xml: string;
};

export async function fetchHalSoftwareById(halDocid: string): Promise<HalRawSoftware | undefined> {
    const res = await fetch(
        `https://api.archives-ouvertes.fr/search/?q=docid:${halDocid}&wt=json&fl=*&sort=docid%20asc`
    ).catch(() => undefined);

    console.log("Hal response status : ", res?.status);

    if (res === undefined) {
        throw new HalFetchError(undefined);
    }

    if (res.status === 429) {
        await new Promise(resolve => setTimeout(resolve, 100));
        return fetchHalSoftwareById(halDocid);
    }

    if (res.status === 404) {
        throw new HalFetchError(res.status);
    }

    const json = await res.json();

    return json.response.docs[0];
}
