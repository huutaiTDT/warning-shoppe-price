/** @format */

import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import weekday from "dayjs/plugin/weekday";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";

dayjs.extend(weekday);
dayjs.extend(localeData);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
