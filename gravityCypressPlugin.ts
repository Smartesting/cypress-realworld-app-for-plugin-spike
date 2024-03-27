import fetch from "cross-fetch";

export function gravityCypressPlugin(
  on: Cypress.PluginEvents,
  config: Cypress.PluginConfigOptions,
  authKey: string
) {
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
