import { createBrowserRouter } from "react-router";
import { Layout } from "./components/Layout";
import { Landing } from "./components/Landing";
import { MergeWorkspace } from "./components/MergeWorkspace";
import { SplitWorkspace } from "./components/SplitWorkspace";
import { ConvertWorkspace } from "./components/ConvertWorkspace";
import { OrganizeWorkspace } from "./components/OrganizeWorkspace";
import { NotFound } from "./components/NotFound";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Layout,
    children: [
      { index: true, Component: Landing },
      { path: "merge", Component: MergeWorkspace },
      { path: "split", Component: SplitWorkspace },
      { path: "convert", Component: ConvertWorkspace },
      { path: "organize", Component: OrganizeWorkspace },
      { path: "*", Component: NotFound },
    ],
  },
]);
