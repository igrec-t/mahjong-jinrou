// @ts-check
import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";

/** サーバー内部（秘密情報を扱いうる）モジュール */
const SERVER_INTERNAL_MODULES = [
  "**/game/**", "**/rooms/**", "**/secretRules/**", "**/scoring/**", "**/werewolf/**",
  "**/voting/**", "**/phases/**", "**/server/**", "**/views/**", "**/sandbox/**",
];

export default defineConfig(
  { ignores: ["dist/", "coverage/", "node_modules/"] },
  js.configs.recommended,
  tseslint.configs.strictTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      // 空の catch によるエラー握り潰しを禁止する（CLAUDE.md ルール20）
      "no-empty": ["error", { allowEmptyCatch: false }],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
    },
  },
  {
    files: ["**/*.js"],
    extends: [tseslint.configs.disableTypeChecked],
  },
  {
    // CPU はサーバー内部状態を参照してはいけない（master-prompt 12.4）
    files: ["src/cpu/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: SERVER_INTERNAL_MODULES,
          message: "CPU は createCpuView の結果（shared/ の型）だけを参照する。",
        }],
      }],
    },
  },
  {
    // クライアントは shared/ だけを参照する（master-prompt 17）
    files: ["src/client/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [{
          group: [...SERVER_INTERNAL_MODULES, "**/cpu/**", "**/mahjong/**", "**/assist/**"],
          message: "クライアントから import できるのは src/shared/ だけ。",
        }],
      }],
    },
  },
);
