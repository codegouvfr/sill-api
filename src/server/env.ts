import {
    str,
    envsafe,
    url,
    num,
    makeValidator,
    InvalidEnvError,
} from "envsafe";

export const env = envsafe({
    "NODE_ENV": str({
        "devDefault": "development",
        "choices": ["development", "production"],
    }),
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
    "GITHUB_PERSONAL_ACCESS_TOKEN": str({
        "allowEmpty": false,
    }),
    "PORT": num({
        "allowEmpty": true,
        "devDefault": 8080,
        "default": 80,
    }),
});
