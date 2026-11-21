import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";
import "./workspace-members.css";
import "./motion.css";
import "./theme.css";
import "./profile-photo.css";

createRoot(document.getElementById("root")!).render(<App />);
