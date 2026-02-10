import { createBrowserRouter } from "react-router";
import { PrimarySearchPage } from "./pages/PrimarySearchPage";
import { SecondarySearchPage } from "./pages/SecondarySearchPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: PrimarySearchPage,
  },
  {
    path: "/advanced-search",
    Component: SecondarySearchPage,
  },
]);
