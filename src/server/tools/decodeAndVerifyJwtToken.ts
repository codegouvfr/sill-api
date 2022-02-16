import fetch from "node-fetch";
import urlJoin from "url-join";
import memoize from "memoizee";
import createKeycloakBacked from "keycloak-backend";

//https://lists.jboss.org/pipermail/keycloak-user/2018-June/014306.html

export function decodeAndVerifyKeycloakOidcAccessTokenFactory(params: {
    keycloakUrl: string;
    keycloakRealm: string;
    keycloakClientId: string;
}) {
    const { keycloakUrl, keycloakRealm, keycloakClientId } = params;

    const getKeycloakBackendVerifyOffline = memoize(
        async () => {
            const cert = await fetchKeycloakRealmPublicCert({
                keycloakRealm,
                keycloakUrl,
            });

            const keycloakBackend = createKeycloakBacked({
                "realm": keycloakRealm,
                "auth-server-url": keycloakUrl,
                "client_id": keycloakClientId,
            });

            function keycloakBackendVerifyOffline(params: {
                keycloakOidcAccessToken: string;
            }): Promise<Record<string, unknown>> {
                const { keycloakOidcAccessToken } = params;
                return keycloakBackend.jwt.verifyOffline(keycloakOidcAccessToken, cert);
            }

            return { keycloakBackendVerifyOffline };
        },
        { "promise": true },
    );

    async function decodeAndVerifyKeycloakOidcAccessToken(params: { keycloakOidcAccessToken: string }) {
        const { keycloakOidcAccessToken } = params;

        const { keycloakBackendVerifyOffline } = await getKeycloakBackendVerifyOffline();

        return keycloakBackendVerifyOffline({ keycloakOidcAccessToken });
    }

    return { decodeAndVerifyKeycloakOidcAccessToken };
}

async function fetchKeycloakRealmPublicCert(params: { keycloakUrl: string; keycloakRealm: string }) {
    const { keycloakUrl, keycloakRealm } = params;

    const obj = await fetch(
        urlJoin(keycloakUrl, "auth/realms", keycloakRealm, "protocol/openid-connect/certs"),
    ).then(res => res.json());

    return ["-----BEGIN CERTIFICATE-----", obj["keys"][0]["x5c"][0], "-----END CERTIFICATE-----"].join(
        "\n",
    );
}
