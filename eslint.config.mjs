import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  ...compat.extends("next/core-web-vitals", "next/typescript"),
  {
    ignores: [
      "node_modules/**",
      ".next/**",
      "out/**",
      "build/**",
      "next-env.d.ts",
      // Deno-based Supabase functions use remote imports and Deno globals; exclude them from
      // the Next/TypeScript ESLint pipeline to avoid false positives during local lint/build.
      "supabase/functions/**",
    ],
  },
];

export default eslintConfig;
