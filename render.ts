/**
 * render.ts holds the page rendering functions for cold_ui.
 */
//import { DEFAULT_HANDLEBARS_CONFIG, TemplateEngine } from "./hbs.ts";
import { Handlebars, HandlebarsConfig } from "@danet/handlebars";

const DEFAULT_HANDLEBARS_CONFIG: HandlebarsConfig = {
  baseDir: "views",
  extname: ".hbs",
  layoutsDir: "layouts/",
  partialsDir: "partials/",
  cachePartials: true,
  defaultLayout: "",
  helpers: undefined,
  compilerOptions: undefined,
};

const handle = new Handlebars(DEFAULT_HANDLEBARS_CONFIG);

/**
 * renderJSON takes an object and returns it as JSON.
 *
 * @param {Object} page_object: the page object to apply to template
 * @returns {Promise<Response>} returns a response once everything is ready.
 */
export async function renderJSON(
  obj: { [k: string]: any },
  status?: number,
): Promise<Response> {
  let src: string = "";
  let statusNo: number = 0;
  if (status === undefined) {
    statusNo = 200;
  } else {
    if (isNaN(status)) {
      statusNo = 500;
    } else {
      statusNo = status as number;
    }
  }
  try {
    src = JSON.stringify(obj, null, 2);
  } catch (err) {
    return new Response(`${err}`, {
      status: 404,
      headers: { "content-type": "text/plain" },
    });
  }
  return new Response(src, {
    status: statusNo,
    headers: {
      "content-type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}

/**
 * renderPage takes a template path and a page object and returns a Response object.
 *
 * @param {string} template: this name of the template in the views folder
 * @param {Object} page_object: the page object to apply to template
 * @returns {Promise<Response>} returns a response once everything is ready.
 */
export async function renderPage(
  template: string,
  page_object: { [k: string]: string | object | boolean | undefined },
): Promise<Response> {
  let body: string = await handle.renderView(template, page_object);
  if (body !== undefined) {
    return new Response(body, {
      status: 200,
      headers: { "content-type": "text/html" },
    });
  }
  body =
    `<doctype html>\n<html lang="en">something went wrong, failed to render ${template}.</html>`;
  return new Response(body, {
    status: 501,
    headers: { "content-type": "text/html" },
  });
}

/**
 * makePage takes a template path and a page object and returns a Response object.
 *
 * @param {string} template: this name of the template in the views folder
 * @param {object} page_object: the page object to apply to template
 * @returns {Promise<string>} returns a string once everything is ready.
 */
export async function makePage(
  template: string,
  page_object: { [k: string]: string | object },
): Promise<string> {
  let body = await handle.renderView(template, page_object);
  if (body !== undefined) {
    return body;
  }
  return `<doctype html>\n<html lang="en">something went wrong, failed to render ${template}.</html>`;
}
