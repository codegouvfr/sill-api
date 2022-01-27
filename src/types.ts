// https://git.sr.ht/~etalab/sill
export type Software = {
    id: number;
    name: string;
    function: string;
    referencedSinceTime: number;
    recommendationStatus: RecommendationStatus;
    parentSoftware?: SoftwareRef;
    isFromFrenchPublicService: boolean;
    isPresentInSupportContract: boolean;
    alikeSoftwares: SoftwareRef[];
    wikidataId?: string;
    //Example https://comptoir-du-libre.org/en/softwares/461 -> 461
    /* cspell: disable-next-line */
    comptoirDuLibreOrgId?: number;
    // https://spdx.org/licenses/
    // https://www.data.gouv.fr/fr/pages/legal/licences/
    license: Licenses;
    whereAndInWhatContextIsItUsed?: string;
    //Lien vers catalogue.numerique.gouv.fr
    /* cspell: disable-next-line */
    catalogNumeriqueGouvFrId?: string;
    mimGroup: MimGroup;
    versionMin: string;
    versionMax?: string;
    referentId: number;
    isReferentExpert: boolean;
};

export type Referent = {
    id: number;
    email: string;
    emailAlt?: string;
};

export type SoftwareRef = SoftwareRef.Known | SoftwareRef.Unknown;
export namespace SoftwareRef {
    export type Known = {
        isKnown: true;
        softwareId: number;
    };

    export type Unknown = {
        isKnown: false;
        softwareName: string;
    };
}

export const recommendationStatuses = [
    "recommended",
    "in observation",
    "no longer recommended",
] as const;

export type RecommendationStatus = typeof recommendationStatuses[number];

export const licenses = [
    "LGPL-2.0-only",
    "EPL-2.0",
    "GPL-2.0-only",
    "GPL-3.0-only",
    "Apache-2.0",
    "AGPL-3.0",
    "MIT",
    "AGPL-3.0-or-later",
    "LGPL-3.0, GPL-3.0, MPL-2.0",
    "N/A",
    "LGPL-2.1-only",
    "BSD-3-Clause",
    "MPL-2.0",
    "GPL-2.0-only / LGPL-2.0-only",
    "GPL-2.0",
    "LGPL-2.0",
    "GPL-3.0",
    "CPL-1.0",
    "CECILL-B",
    "MPL 2.0 et EPL 1.0",
    "EPL-1.0",
    "GPL V2.0",
    "LGPL-2.1, LGPL-2.0,  LGPL-3.0",
    "GPL-2.0-or-later",
    "LGPL-v2.1",
    "BSD-2-Clause",
    "X11",
    "Artistic-2.0",
    "GPL-3.0-or-later",
    "OLDAP-2.8",
    "LGPL-3.0-only",
    "IPL-1.0, EPL-2.0",
    "PostgreSQL",
    "CPA",
    "AGPL-3.0-only",
    "EUPL-1.1",
    "BSD-3.0",
    "CC-BY-SA-4.0",
    "LGPL-2.1",
    "AGPL-3",
    "GPL-3",
    "CECILL-2.1",
    "MPL-2.0, GPL-3.0, LGPL-3.0, CECILL-2.1",
    "LGPL-3.0",
    "Zimbra-1.3",
    "GPL-2.0, LGPL-3.0",
    "GPL-2.0+",
    "GPL-2.0, LGPL-2, MPL-1.1",
    "MIT, LGPL-3, AGPL-3",
    "GPL-3.0+",
    "GPL-2.0, LGPL-2.0",
] as const;

export type Licenses = typeof licenses[number];

export const mimGroups = ["MIMO", "MIMDEV", "MIMPROD", "MIMDEVOPS"] as const;

export type MimGroup = typeof mimGroups[number];
