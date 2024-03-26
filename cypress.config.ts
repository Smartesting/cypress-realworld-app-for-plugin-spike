import path from "path";
import _ from "lodash";
import axios from "axios";
import dotenv from "dotenv";
import Promise from "bluebird";
import codeCoverageTask from "@cypress/code-coverage/task";
import { devServer } from "@cypress/vite-dev-server";
import { defineConfig } from "cypress";
import { mergeConfig, loadEnv } from "vite";
import fetch from "cross-fetch";

dotenv.config({ path: ".env.local" });
dotenv.config();

let awsConfig = {
  default: undefined,
};

try {
  awsConfig = require(path.join(__dirname, "./aws-exports-es5.js"));
} catch (e) {}

module.exports = defineConfig({
  projectId: "7s5okt",
  retries: {
    runMode: 2,
  },
  env: {
    apiUrl: "http://localhost:3001",
    mobileViewportWidthBreakpoint: 414,
    coverage: false,
    codeCoverage: {
      url: "http://localhost:3001/__coverage__",
      exclude: "cypress/**/*.*",
    },
    defaultPassword: process.env.SEED_DEFAULT_USER_PASSWORD,
    paginationPageSize: process.env.PAGINATION_PAGE_SIZE,

    // Auth0
    auth0_username: process.env.AUTH0_USERNAME,
    auth0_password: process.env.AUTH0_PASSWORD,
    auth0_domain: process.env.VITE_AUTH0_DOMAIN,

    // Okta
    okta_username: process.env.OKTA_USERNAME,
    okta_password: process.env.OKTA_PASSWORD,
    okta_domain: process.env.VITE_OKTA_DOMAIN,
    okta_client_id: process.env.VITE_OKTA_CLIENTID,
    okta_programmatic_login: process.env.OKTA_PROGRAMMATIC_LOGIN || false,

    // Amazon Cognito
    cognito_username: process.env.AWS_COGNITO_USERNAME,
    cognito_password: process.env.AWS_COGNITO_PASSWORD,
    cognito_domain: process.env.AWS_COGNITO_DOMAIN,
    cognito_programmatic_login: false,
    awsConfig: awsConfig.default,

    // Google
    googleRefreshToken: process.env.GOOGLE_REFRESH_TOKEN,
    googleClientId: process.env.VITE_GOOGLE_CLIENTID,
    googleClientSecret: process.env.VITE_GOOGLE_CLIENT_SECRET,
  },
  component: {
    devServer(devServerConfig) {
      const viteConfig = require("./vite.config.ts");
      const conf = {
        define: {
          "process.env": loadEnv("development", process.cwd(), "VITE"),
        },
        server: {
          /**
           * start the CT dev server on a different port than the full RWA
           * so users can switch between CT and E2E testing without having to
           * stop/start the RWA dev server.
           */
          port: 3002,
        },
      };

      const resolvedViteConfig = mergeConfig(viteConfig, conf);
      return devServer({
        ...devServerConfig,
        framework: "react",
        viteConfig: resolvedViteConfig,
      });
    },
    specPattern: "src/**/*.cy.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/component.ts",
    setupNodeEvents(on, config) {
      codeCoverageTask(on, config);
      return config;
    },
  },
  e2e: {
    baseUrl: "http://localhost:13000",
    specPattern: "cypress/tests/**/*.spec.{js,jsx,ts,tsx}",
    supportFile: "cypress/support/e2e.ts",
    viewportHeight: 1000,
    viewportWidth: 1280,
    experimentalRunAllSpecs: true,
    experimentalInteractiveRunEvents: true,
    setupNodeEvents(on, config) {
      const testDataApiEndpoint = `${config.env.apiUrl}/testData`;

      const queryDatabase = ({ entity, query }, callback) => {
        const fetchData = async (attrs) => {
          const { data } = await axios.get(`${testDataApiEndpoint}/${entity}`);
          return callback(data, attrs);
        };

        return Array.isArray(query) ? Promise.map(query, fetchData) : fetchData(query);
      };

      on("task", {
        async "db:seed"() {
          // seed database with test data
          const { data } = await axios.post(`${testDataApiEndpoint}/seed`);
          return data;
        },

        // fetch test data from a database (MySQL, PostgreSQL, etc...)
        "filter:database"(queryPayload) {
          return queryDatabase(queryPayload, (data, attrs) => _.filter(data.results, attrs));
        },
        "find:database"(queryPayload) {
          return queryDatabase(queryPayload, (data, attrs) => _.find(data.results, attrs));
        },
      });

      on("after:spec", (_, results) => {
        const authKey = "a380afbf-a641-4f18-8004-6b9f13b4a61c";
        const existingSessionId = "c07b6a8e-d3e3-4ee7-9172-2d04e5c8b15a";
        for (const test of results.tests) {
          fetch(
            `http://localhost:3000/api/tracking/${authKey}/session/${existingSessionId}/identifyTest`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                testName: test.title.slice(-1)[0],
                testPath: test.title.slice(0, -1).join(" / "),
                testDate: results.stats.startedAt,
                testDuration: test.duration,
                testStatus: test.state,
                sessionId: existingSessionId,
              }),
            }
          )
            .then((res) => res.json())
            .then((resJSON) => console.log(resJSON));
        }
      });

      codeCoverageTask(on, config);
      return config;
    },
  },
});
