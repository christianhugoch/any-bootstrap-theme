const Router = require("express-promise-router");
const { setTenant, isAdmin, error_catcher } = require("./utils.js");
const { mkTable, renderForm, link, post_btn } = require("@saltcorn/markup");
const { getState } = require("@saltcorn/data/db/state");
const Table = require("@saltcorn/data/models/table");
const Form = require("@saltcorn/data/models/form");
const View = require("@saltcorn/data/models/view");
const Field = require("@saltcorn/data/models/field");
const Plugin = require("@saltcorn/data/models/plugin");
const Page = require("@saltcorn/data/models/page");
const load_plugins = require("../load_plugins");

const { is_pack } = require("@saltcorn/data/contracts");
const { contract, is } = require("contractis");
const {
  table_pack,
  view_pack,
  plugin_pack,
  page_pack,
  install_pack,
  fetch_pack_by_name
} = require("@saltcorn/data/models/pack");
const { h5, pre, code } = require("@saltcorn/markup/tags");

const router = new Router();
module.exports = router;

router.get(
  "/create/",
  setTenant,
  isAdmin,
  error_catcher(async (req, res) => {
    const tables = await Table.find({});
    const tableFields = tables.map(t => ({
      label: `${t.name} table`,
      name: `table.${t.name}`,
      type: "Bool"
    }));
    const views = await View.find({});
    const viewFields = views.map(t => ({
      label: `${t.name} view`,
      name: `view.${t.name}`,
      type: "Bool"
    }));
    const plugins = await Plugin.find({});
    const pluginFields = plugins.map(t => ({
      label: `${t.name} plugin`,
      name: `plugin.${t.name}`,
      type: "Bool"
    }));
    const pages = await Page.find({});
    const pageFields = pages.map(t => ({
      label: `${t.name} page`,
      name: `page.${t.name}`,
      type: "Bool"
    }));
    res.sendWrap(
      `Create Pack`,
      renderForm(
        new Form({
          action: "/packs/create",
          fields: [
            ...tableFields,
            ...viewFields,
            ...pluginFields,
            ...pageFields
          ]
        }),
        req.csrfToken()
      )
    );
  })
);

router.post(
  "/create",
  setTenant,
  isAdmin,
  error_catcher(async (req, res) => {
    var pack = { tables: [], views: [], plugins: [], pages: [] };
    for (const k of Object.keys(req.body)) {
      const [type, name] = k.split(".");
      switch (type) {
        case "table":
          pack.tables.push(await table_pack(name));
          break;
        case "view":
          pack.views.push(await view_pack(name));
          break;
        case "plugin":
          pack.plugins.push(await plugin_pack(name));
          break;
        case "page":
          pack.pages.push(await page_pack(name));
          break;

        default:
          break;
      }
    }
    res.sendWrap(
      `Pack`,
      pre({ class: "wsprewrap" }, code(JSON.stringify(pack)))
    );
  })
);

const install_pack_form = () =>
  new Form({
    action: "/packs/install",
    fields: [
      {
        name: "pack",
        type: "String",
        fieldview: "textarea"
      }
    ]
  });

router.get(
  "/install",
  setTenant,
  isAdmin,
  error_catcher(async (req, res) => {
    res.sendWrap(
      `Install Pack`,
      renderForm(install_pack_form(), req.csrfToken())
    );
  })
);

router.post(
  "/install",
  setTenant,
  isAdmin,
  error_catcher(async (req, res) => {
    var pack, error;
    try {
      pack = JSON.parse(req.body.pack);
    } catch (e) {
      error = e.message;
    }
    if (!error && !is_pack.check(pack)) {
      error = "Not a valid pack";
    }
    if (error) {
      const form = install_pack_form();
      form.values = { pack: req.body.pack };
      req.flash("error", error);
      res.sendWrap(`Install Pack`, renderForm(form, req.csrfToken()));
    } else {
      await install_pack(pack, undefined, p =>
        load_plugins.loadAndSaveNewPlugin(p)
      );

      res.redirect(`/`);
    }
  })
);

router.post(
  "/install-named/:name",
  setTenant,
  isAdmin,
  error_catcher(async (req, res) => {
    const { name } = req.params;

    const pack = await fetch_pack_by_name(name);
    //console.log(pack)
    await install_pack(pack.pack, name, p =>
      load_plugins.loadAndSaveNewPlugin(p)
    );

    res.redirect(`/`);
  })
);