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
                "maxAge": 5 * 60 * 1000,
            },
        ),
        "getAgencyNames": memoize(
            async () => {
                const agencyNames = new Set<string>();

                let first = 0;

                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const max = 100;

                    const users = await keycloakAdminApiClient.getUsers({
                        first,
                        max,
                    });

                    users.forEach(user =>
                        agencyNames.add(
                            user.attributes["agencyName"][0].toLowerCase(),
                        ),
                    );

                    if (users.length < max) {
                        break;
                    }

                    first += max;
                }

                return Array.from(agencyNames);
            },
            {
                "promise": true,
                "maxAge": 60 * 60 * 1000,
            },
        ),
    };
}
