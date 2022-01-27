import { assert } from "tsafe/assert";
import type { Software, SoftwareRef, Referent } from "../types";
import { allUniq } from "evt/tools/reducers";
import { is } from "tsafe/is";
import { symToStr } from "tsafe/symToStr";
import { exclude } from "tsafe/exclude";

function validateSoftwaresAllUniq(params: { softwares: Software[] }): void {
    const { softwares } = params;

    assert(
        softwares.map(({ _id }) => _id).reduce(...allUniq()),
        `Not all ${symToStr({ softwares })} have an unique id`,
    );
}

const { validateAllSoftwareRefs } = (() => {
    function validateSoftwareRefIsValidReference(params: {
        softwareRef: SoftwareRef.Known;
        softwares: Software[];
    }): void {
        const { softwareRef, softwares } = params;

        const software = softwares.find(({ _id }) => softwareRef.softwareId === _id);

        assert(
            software !== undefined,
            `${softwareRef.softwareId} is not the id of a software present in the sill`,
        );
    }

    function validateAllSoftwareRefs(params: { softwares: Software[] }) {
        const { softwares } = params;

        softwares.forEach(software => {
            {
                const { parentSoftware } = software;

                const softwareRef = parentSoftware;

                if (softwareRef === undefined || !softwareRef.isKnown) {
                    return;
                }

                try {
                    validateSoftwareRefIsValidReference({
                        softwareRef,
                        softwares,
                    });
                } catch (error) {
                    assert(is<Error>(error));

                    throw new Error(`Error with ${symToStr({ parentSoftware })}: ${error.message}`);
                }
            }

            {
                const { alikeSoftwares } = software;

                alikeSoftwares.forEach(softwareRef => {
                    if (!softwareRef.isKnown) {
                        return;
                    }

                    try {
                        validateSoftwareRefIsValidReference({
                            softwareRef,
                            softwares,
                        });
                    } catch (error) {
                        assert(is<Error>(error));

                        throw new Error(`Error with ${symToStr({ alikeSoftwares })}: ${error.message}`);
                    }
                });
            }
        });
    }

    return { validateAllSoftwareRefs };
})();

function validateReferentsAllUnique(params: { referents: Referent[] }): void {
    const { referents } = params;

    assert(
        referents.map(({ id }) => id).reduce(...allUniq()),
        `Not all ${symToStr({ referents })} have an unique id`,
    );
}

function validateReferentsRef(params: { softwares: Software[]; referents: Referent[] }): void {
    const { softwares, referents } = params;

    softwares
        .map(({ referentId }) => (referentId === undefined ? undefined : referentId))
        .filter(exclude(undefined))
        .forEach(referentId =>
            assert(
                referents.find(({ id }) => referentId === id) !== undefined,
                `${symToStr({ referentId })} ${referentId} do not point to an actual referent`,
            ),
        );
}

export function validateAllRelations(params: { softwares: Software[]; referents: Referent[] }) {
    const { softwares, referents } = params;

    validateSoftwaresAllUniq({ softwares });
    validateAllSoftwareRefs({ softwares });
    validateReferentsAllUnique({ referents });
    validateReferentsRef({ softwares, referents });
}
