#!/usr/bin/env node

const path = require("path");

let ESLint;
try {
  ({ ESLint } = require("eslint"));
} catch (error) {
  console.error("Unable to load ESLint. Run this from the frontend package with dependencies installed.");
  console.error(error.message);
  process.exit(1);
}

const rootDir = path.resolve(__dirname, "..");

const filesToCheck = process.argv.slice(2);
const defaultFiles = [
  "src/App.jsx",
  "src/utils/tohiPick.js",
  "src/theme/tohiTheme.js",
];

async function main() {
  const eslint = new ESLint({
    cwd: rootDir,
    useEslintrc: false,
    errorOnUnmatchedPattern: false,
    overrideConfig: {
      env: {
        browser: true,
        es2021: true,
        node: true,
        jest: true,
      },
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
      rules: {
        "no-undef": "error",
      },
      globals: {
        google: "readonly",
      },
    },
  });

  const results = await eslint.lintFiles(filesToCheck.length ? filesToCheck : defaultFiles);
  const failures = [];

  results.forEach((result) => {
    result.messages
      .filter((message) => message.ruleId === "no-undef")
      .forEach((message) => {
        failures.push({
          filePath: path.relative(rootDir, result.filePath),
          line: message.line,
          column: message.column,
          message: message.message,
        });
      });
  });

  if (failures.length) {
    console.error("Undefined variable check failed:");
    failures.forEach((failure) => {
      console.error(
        `- ${failure.filePath}:${failure.line}:${failure.column} ${failure.message}`
      );
    });
    process.exit(1);
  }

  console.log(
    `Undefined variable check passed for ${filesToCheck.length ? filesToCheck.length : defaultFiles.length} file(s).`
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
