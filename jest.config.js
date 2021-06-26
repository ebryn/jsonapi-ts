const baseUnitTest = {
  moduleFileExtensions: ["ts", "js"],
  transform: {
    "^.+\\.(ts)$": "ts-jest"
  },
  displayName: "unit",
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.test.json"
    }
  },
  testMatch: ["<rootDir>/tests/test-suite/unit/**/?(*.)+(spec|test).ts"],
};

module.exports = {
  globalSetup: "<rootDir>/tests/test-suite/globalSetup.ts",
  moduleFileExtensions: ["ts", "js"],
  reporters: ["default", "jest-junit"],
  projects: [
    baseUnitTest,
    {
      ...baseUnitTest,
      displayName: "acceptance - camelCase",
      globals: {
        TEST_SUITE: "test_camelCase",
        "ts-jest": {
          tsconfig: "tsconfig.test.json"
        }
      },
      testMatch: ["<rootDir>/tests/test-suite/acceptance/**/?(*.)+(spec|test).ts"],
      setupFilesAfterEnv: ["trace-unhandled/register", "<rootDir>/tests/test-suite/setup.ts"]
    },
    {
      ...baseUnitTest,
      displayName: "acceptance - snake_case",
      globals: {
        TEST_SUITE: "test_snake_case",
        "ts-jest": {
          tsconfig: "tsconfig.test.json"
        }
      },
      testMatch: ["<rootDir>/tests/test-suite/acceptance/**/?(*.)+(spec|test).ts"],
      setupFilesAfterEnv: ["trace-unhandled/register", "<rootDir>/tests/test-suite/setup.ts"]
    }
  ]
};
