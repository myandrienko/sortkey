import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { SortkeyDemo } from "./SortkeyDemo.tsx";
import "./main.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <SortkeyDemo />
  </StrictMode>
);
