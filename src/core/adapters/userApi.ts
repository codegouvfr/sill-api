import { createKeycloakAdminApiClient } from "../../tools/keycloakAdminApiClient";
import * as runExclusive from "run-exclusive";
import memoize from "memoizee";
import { UserApi } from "../ports/UserApi";

export type KeycloakUserApiParams = {
    url: string;
    adminPassword: string;
    realm: string;
    agencyNameAttributeName: string;
};

export function createKeycloakUserApi(params: KeycloakUserApiParams): UserApi {
    const { url, adminPassword, realm, agencyNameAttributeName } = params;

    const keycloakAdminApiClient = createKeycloakAdminApiClient({
        url,
        adminPassword,
        realm
    });

    const groupRef = runExclusive.createGroupRef();

    return {
        "updateUserEmail": runExclusive.build(groupRef, ({ userId, email }) =>
            keycloakAdminApiClient.updateUser({
                userId,
                "body": { email }
            })
        ),
        "updateUserAgencyName": runExclusive.build(groupRef, ({ userId, agencyName }) =>
            keycloakAdminApiClient.updateUser({
                userId,
                "body": { "attributes": { [agencyNameAttributeName]: agencyName } }
            })
        ),
        "getAllowedEmailRegexp": memoize(
            async () => {
                const attributes = await keycloakAdminApiClient.getUserProfileAttributes();

                let emailRegExpStr: string;

                try {
                    emailRegExpStr = (attributes.find(({ name }) => name === "email") as any).validations.pattern
                        .pattern;
                } catch {
                    throw new Error(`Can't extract RegExp from ${JSON.stringify(attributes)}`);
                }

                return emailRegExpStr;
            },
            {
                "promise": true,
                "maxAge": 5 * 60 * 1000
            }
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
                        max
                    });

                    users.forEach(user => {
                        let agencyName: string;

                        try {
                            agencyName = user.attributes["agencyName"][0].toLowerCase();
                        } catch {
                            console.log("Strange user: ", user);

                            return;
                        }

                        agencyNames.add(agencyName);
                    });

                    if (users.length < max) {
                        break;
                    }

                    first += max;
                }

                return Array.from(agencyNames);
            },
            {
                "promise": true,
                "maxAge": 60 * 60 * 1000
            }
        ),
        "getUserCount": memoize(
            async () => {
                let count = 0;

                let first = 0;

                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const max = 100;

                    const users = await keycloakAdminApiClient.getUsers({
                        first,
                        max
                    });

                    count += users.length;

                    if (users.length < max) {
                        break;
                    }

                    first += max;
                }

                return count;
            },
            {
                "promise": true,
                "maxAge": 60 * 60 * 1000
            }
        )
    };
}
