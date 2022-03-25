export type LocalizedString<Language extends string> =
    | string
    | Partial<Record<Language, string>>;
