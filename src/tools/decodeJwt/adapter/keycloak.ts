import type { CreateDecodeJwt } from "../port/CreateDecodeJwt";
import urlJoin from "url-join";
import fetch from "node-fetch";
import memoize from "memoizee";
import createKeycloakBacked from "keycloak-backend";
import { assert } from "tsafe/assert";
import { jwtContentToDecodedJwt } from "../tools/jwtContentToDecodedJwt";

export function createDecodeJwtKeycloakFactory(params: {
    url: string;
    realm: string;
    clientId: string;
}): { createDecodeJwt: CreateDecodeJwt } {
    const { url, realm, clientId } = params;

    const getKeycloakBackendVerifyOffline = memoize(
        async () => {
            const cert = await fetchKeycloakRealmPublicCert({ url, realm });

            const keycloakBackend = createKeycloakBacked({
                realm,
                "auth-server-url": url,
                "client_id": clientId,
            });

            function keycloakBackendVerifyOffline(params: {
                keycloakOidcAccessToken: string;
            }): Promise<{
                isExpired: () => boolean;
                content: Record<string, unknown>;
            }> {
                const { keycloakOidcAccessToken } = params;
                return keycloakBackend.jwt.verifyOffline(
                    keycloakOidcAccessToken,
                    cert,
                );
            }

            return { keycloakBackendVerifyOffline };
        },
        { "promise": true },
    );

    const createDecodeJwt: CreateDecodeJwt = ({ jwtClaims }) => {
        const decodeJwt: ReturnType<CreateDecodeJwt>["decodeJwt"] = async ({
            jwtToken,
        }) => {
            const { keycloakBackendVerifyOffline } =
                await getKeycloakBackendVerifyOffline();

            const token = await keycloakBackendVerifyOffline({
                "keycloakOidcAccessToken": jwtToken,
            });

            assert(!token.isExpired(), "Token is expired");

            return jwtContentToDecodedJwt({
                jwtClaims,
                "jwtPayload": token.content,
            });
        };

        return { decodeJwt };
    };

    return { createDecodeJwt };
}

async function fetchKeycloakRealmPublicCert(params: {
    url: string;
    realm: string;
}) {
    const { url, realm } = params;

    const obj = await fetch(
        urlJoin(url, "realms", realm, "protocol/openid-connect/certs"),
    ).then(res => res.json());

    return [
        "-----BEGIN CERTIFICATE-----",
        obj["keys"][0]["x5c"][0],
        "-----END CERTIFICATE-----",
    ].join("\n");
}
