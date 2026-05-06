import ReactDOMServer from "react-dom/server";
import { StaticRouter } from "react-router";
import { ColorTagApp } from "./color-tag-app.js";

interface IRenderProps { path: string; }

export const render = async ({ path }: IRenderProps) => {
  return ReactDOMServer.renderToString(
    <StaticRouter location={path}>
      <ColorTagApp />
    </StaticRouter>
  );
};
