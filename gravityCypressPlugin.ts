import fetch from "cross-fetch";
import GravityCollector from "@smartesting/gravity-data-collector/dist";

export function gravityCypressPlugin(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  authKey: string | undefined
) {
  on("task", {
    "gravity:getAuthKey": () => {
      return authKey ?? null;
    },
    "gravity:teardown": () => {},
  });

  on("after:spec", (_, results) => {
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
}

export function setupGravity() {
  cy.task("gravity:getAuthKey").then((authKey) => {

    cy.window().then((win) => {
      function installCollector() {
        if (!assertIsString(authKey)) return;

        GravityCollector.init({
          authKey,
          requestInterval: 500,
          gravityServerUrl: "http://localhost:3000/",
          window: win,
        });
      }

      function waitForPageToLoad() {
        const url = win.document.URL;
        if (url === undefined || url.startsWith("about:")) {
          setTimeout(waitForPageToLoad, 50);
        } else {
          installCollector();
        }
      }

      waitForPageToLoad();
    });
  });
}

function assertIsString(toBeDetermined: unknown): toBeDetermined is string {
  return typeof toBeDetermined === "string";
}

export function teardownGravity() {}
