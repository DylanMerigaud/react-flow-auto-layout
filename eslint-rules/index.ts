// Relative import here on purpose: jiti loads this from disk to build the ESLint
// config.
import { noEmdashInText } from "./no-emdash-in-text";

/** The package's custom ESLint rules, exposed as a flat-config plugin. */
export const customRules = {
  rules: {
    "no-emdash-in-text": noEmdashInText,
  },
};
