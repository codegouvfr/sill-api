import { createKeycloakAdminApiClient } from "../../tools/keycloakAdminApiClient";
import * as runExclusive from "run-exclusive";
import memoize from "memoizee";
import { UserApi } from "../ports/UserApi";

export function createKeycloakUserApi(params: {
    url: string;
    adminPassword: string;
    realm: string;
}): UserApi {
    const { url, adminPassword, realm } = params;

    const keycloakAdminApiClient = createKeycloakAdminApiClient({
        url,
        adminPassword,
        realm,
    });

    const groupRef = runExclusive.createGroupRef();

    return {
        "updateUserEmail": runExclusive.build(groupRef, ({ userId, email }) =>
            keycloakAdminApiClient.updateUser({
                userId,
                "body": { email },
            }),
        ),
        "updateUserAgencyName": runExclusive.build(
            groupRef,
            ({ userId, agencyName }) =>
                keycloakAdminApiClient.updateUser({
                    userId,
                    "body": { "attributes": { agencyName } },
                }),
        ),
        "getAllowedEmailRegexp": memoize(
            async () => {
                const attributes =
                    await keycloakAdminApiClient.getUserProfileAttributes();

                let emailRegExpStr: string;

                try {
                    emailRegExpStr = (
                        attributes.find(({ name }) => name === "email") as any
                    ).validations.pattern.pattern;
                } catch {
                    throw new Error(
                        `Can't extract RegExp from ${JSON.stringify(
                            attributes,
                        )}`,
                    );
                }

                return emailRegExpStr;
            },
            {
                "promise": true,
                "maxAge": 60 * 5 * 1000, //5 seconds
            },
        ),
    };
}
