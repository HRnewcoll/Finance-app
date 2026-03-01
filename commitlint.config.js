// Commitlint configuration for conventional commits
// Docs: https://commitlint.js.org/
// Install: npm install --save-dev @commitlint/cli @commitlint/config-conventional

/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Enforce conventional commit types
    "type-enum": [
      2,
      "always",
      [
        "feat",     // New feature
        "fix",      // Bug fix
        "docs",     // Documentation only
        "style",    // Formatting, missing semi-colons, etc.
        "refactor", // Code change that neither fixes a bug nor adds a feature
        "perf",     // Performance improvement
        "test",     // Adding or correcting tests
        "build",    // Changes that affect build system or external deps
        "ci",       // Changes to CI configuration files and scripts
        "chore",    // Other changes that don't modify src or test files
        "revert",   // Reverts a previous commit
      ],
    ],
    // Subject must be lowercase
    "subject-case": [2, "always", "lower-case"],
    // Subject cannot end with period
    "subject-full-stop": [2, "never", "."],
    // Subject must not be empty
    "subject-empty": [2, "never"],
    // Type must not be empty
    "type-empty": [2, "never"],
    // Body must have a blank line before it
    "body-leading-blank": [1, "always"],
    // Footer must have a blank line before it
    "footer-leading-blank": [1, "always"],
    // Header max length
    "header-max-length": [2, "always", 100],
    // Scope is optional but must be lowercase if present
    "scope-case": [2, "always", "lower-case"],
  },
  // Prompt configuration for interactive commit message creation
  prompt: {
    questions: {
      type: {
        description: "Select the type of change you are committing",
      },
      scope: {
        description:
          "What is the scope of this change? (e.g. component or file name)",
      },
      subject: {
        description: "Write a short, imperative tense description of the change",
      },
      body: {
        description: "Provide a longer description of the change (optional)",
      },
      isBreaking: {
        description: "Are there any breaking changes?",
      },
      breakingBody: {
        description:
          "A breaking change commit requires a body. Please enter a longer description of the commit itself",
      },
      breaking: {
        description: "Describe the breaking changes",
      },
      isIssueAffected: {
        description: "Does this change affect any open issues?",
      },
      issuesBody: {
        description:
          "If issues are closed, the commit requires a body. Please enter a longer description of the commit itself",
      },
      issues: {
        description: 'Add issue references (e.g. "fix #123", "re #123")',
      },
    },
  },
};
