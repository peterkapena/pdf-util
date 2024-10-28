import { createBrowserRouter } from "react-router-dom";
import { ROUTES } from "./common";
import Home from "../routes/Home";

export const router = createBrowserRouter([
  {
    path: ROUTES.HOME,
    element: <Home />,
  },
]);
