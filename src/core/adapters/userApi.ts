import { createKeycloakAdminApiClient } from "../../tools/keycloakAdminApiClient";
import * as runExclusive from "run-exclusive";
import memoize from "memoizee";
import { UserApi } from "../ports/UserApi";

export type KeycloakUserApiParams = {
    url: string;
    adminPassword: string;
    realm: string;
    organizationUserProfileAttributeName: string;
};

export async function createKeycloakUserApi(params: KeycloakUserApiParams): Promise<UserApi> {
    const { url, adminPassword, realm, organizationUserProfileAttributeName } = params;

    const keycloakAdminApiClient = createKeycloakAdminApiClient({
        url,
        adminPassword,
        realm
    });

    const groupRef = runExclusive.createGroupRef();

    const userApi: UserApi = {
        "updateUserEmail": runExclusive.build(groupRef, ({ userId, email }) =>
            keycloakAdminApiClient.updateUser({
                userId,
                "body": { email }
            })
        ),
        "updateUserOrganization": runExclusive.build(groupRef, ({ userId, organization }) =>
            keycloakAdminApiClient.updateUser({
                userId,
                "body": { "attributes": { [organizationUserProfileAttributeName]: organization } }
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
                "maxAge": 5 * 60 * 1000,
                "preFetch": true
            }
        ),
        "getAllOrganizations": memoize(
            async () => {
                const organizations = new Set<string>();

                let first = 0;

                // eslint-disable-next-line no-constant-condition
                while (true) {
                    const max = 100;

                    const users = await keycloakAdminApiClient.getUsers({
                        first,
                        max
                    });

                    users.forEach(user => {
                        let organization: string;

                        try {
                            organization = user.attributes[organizationUserProfileAttributeName][0].toLowerCase();
                        } catch {
                            console.log("Strange user: ", user);

                            return;
                        }

                        organizations.add(organization);
                    });

                    if (users.length < max) {
                        break;
                    }

                    first += max;
                }

                return Array.from(organizations);
            },
            {
                "promise": true,
                "maxAge": 60 * 60 * 1000,
                "preFetch": true
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
                "maxAge": 60 * 60 * 1000,
                "preFetch": true
            }
        )
    };

    //NOTE: Preload data
    await Promise.all([userApi.getUserCount(), userApi.getAllOrganizations(), userApi.getAllowedEmailRegexp()]);

    return userApi;
}
