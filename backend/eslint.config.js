import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["dist/**", "node_modules/**"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // Legacy code uses these widely; surfaced as warnings until cleaned up.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "no-console": "warn",
      "preserve-caught-error": "warn",
    },
  },
  {
    files: ["*.js"],
    languageOptions: { globals: { process: "readonly" } },
  },
  {
    files: ["tests/**/*.ts"],
    rules: { "no-console": "off" },
  },
);
