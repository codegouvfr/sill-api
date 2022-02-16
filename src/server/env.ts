import { str, envsafe, url, makeValidator, InvalidEnvError } from "envsafe";

export const env = envsafe({
    "KEYCLOAK_URL": makeValidator<string>(input => {
        url()._parse(input);

        if (input.endsWith("auth")) {
            throw new InvalidEnvError(
                `Please remove the /auth at the end of ${input}`,
            );
        }

        return input;
    })({
        "desc": "Url of the keycloak server",
        "example": "https://auth.lab.sspcloud.fr",
        "devDefault": "https://auth.lab.sspcloud.fr",
        "allowEmpty": false,
    }),
    "KEYCLOAK_REALM": str({
        "allowEmpty": false,
        "devDefault": "sspcloud",
        "desc": "Name of the realm",
    }),
    "KEYCLOAK_CLIENT_ID": str({
        "allowEmpty": false,
        "devDefault": "sill",
    }),
});

console.log(env);
