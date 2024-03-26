import React from "react";
import { createRoot } from "react-dom/client";
import { Router } from "react-router-dom";
import { createTheme, ThemeProvider } from "@material-ui/core";
import App from "./containers/App";
import { history } from "./utils/historyUtils";
import GravityCollector from "@smartesting/gravity-data-collector/dist";

const theme = createTheme({
  palette: {
    secondary: {
      main: "#fff",
    },
  },
});

GravityCollector.init({
  authKey: "a380afbf-a641-4f18-8004-6b9f13b4a61c",
  gravityServerUrl: "http://localhost:3000/",
});

const root = createRoot(document.getElementById("root")!);

root.render(
  <Router history={history}>
    <ThemeProvider theme={theme}>
      <App />
    </ThemeProvider>
  </Router>
);
