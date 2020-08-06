const {
  p,
  div,
  i,
  label,
  text,
  text_attr,
  button,
  a,
  span
} = require("./tags");
const { contract, is } = require("contractis");
const renderLayout = require("./layout");
const { isdef, select_options, search_bar } = require("./helpers");
const mkShowIf = sIf =>
  Object.entries(sIf)
    .map(
      ([target, value]) =>
        `e.closest('.form-namespace').find('${target}').val()==='${value}'`
    )
    .join(" && ");

const isCheck = hdr => hdr.type && hdr.type.name === "Bool";
const isHoriz = formStyle => formStyle === "horiz";
const formRowWrap = (hdr, inner, error = "", fStyle, labelCols) =>
  div(
    {
      class: ["form-group", isHoriz(fStyle) && "row"],
      ...(hdr.showIf && {
        "data-show-if": mkShowIf(hdr.showIf)
      })
    },
    isCheck(hdr)
      ? div(
          {
            class:
              isHoriz(fStyle) &&
              `col-sm-${12 - labelCols} offset-md-${labelCols}`
          },
          div(
            { class: "form-check" },
            inner,
            label(
              { for: `input${text_attr(hdr.name)}`, class: "form-check-label" },
              text(hdr.label)
            ),
            text(error)
          )
        )
      : [
          label(
            {
              for: `input${text_attr(hdr.name)}`,
              class: isHoriz(fStyle) && `col-sm-${labelCols} col-form-label`
            },
            text(hdr.label)
          ),
          div(
            { class: isHoriz(fStyle) && `col-sm-${12 - labelCols}` },
            inner,
            text(error)
          )
        ],
    hdr.sublabel &&
      div(
        {
          class:
            isHoriz(fStyle) && `col-sm-${12 - labelCols} offset-md-${labelCols}`
        },
        i(text(hdr.sublabel))
      )
  );

const innerField = (v, errors, nameAdd = "") => hdr => {
  const name = hdr.name + nameAdd;
  const validClass = errors[name] ? "is-invalid" : "";
  switch (hdr.input_type) {
    case "fromtype":
      return displayEdit(
        hdr,
        name,
        v && isdef(v[hdr.name]) ? v[hdr.name] : hdr.default,
        validClass
      );
    case "hidden":
      return `<input type="hidden" class="form-control ${validClass} ${
        hdr.class
      }" name="${text_attr(name)}" ${
        v ? `value="${text_attr(v[hdr.name])}"` : ""
      }>`;
    case "select":
      const opts = select_options(v, hdr);
      return `<select class="form-control ${validClass} ${
        hdr.class
      }" name="${text_attr(name)}" id="input${text_attr(
        name
      )}">${opts}</select>`;
    case "file":
      return `${
        v[hdr.name] ? text(v[hdr.name]) : ""
      }<input type="file" class="form-control-file ${validClass} ${
        hdr.class
      }" name="${text_attr(name)}" id="input${text_attr(name)}">`;
    case "search":
      return search_bar(name, v && v[hdr.name]);
    default:
      const the_input = `<input type="${hdr.input_type}" class="form-control ${
        hdr.class
      }" name="${name}" id="input${text_attr(name)}" ${
        v && isdef(v[hdr.name]) ? `value="${text_attr(v[hdr.name])}"` : ""
      }>`;
      const inner = hdr.postText
        ? div(
            { class: "input-group" },
            the_input,
            div(
              { class: "input-group-append" },
              span(
                { class: "input-group-text", id: "basic-addon2" },
                hdr.postText
              )
            )
          )
        : the_input;
      return inner;
  }
};

const mkFormRow = (v, errors, formStyle, labelCols) => hdr =>
  hdr.isRepeat
    ? mkFormRowForRepeat(v, errors, formStyle, labelCols, hdr)
    : mkFormRowForField(v, errors, formStyle, labelCols)(hdr);

const mkFormRowForRepeat = (v, errors, formStyle, labelCols, hdr) => {
  const adder = a({ href: `javascript:add_repeater('${hdr.name}')` }, "Add");
  const icons = div(
    { class: "float-right" },
    span(
      { onclick: "rep_up(this)" },
      i({ class: "fa fa-arrow-up pull-right" })
    ),
    "&nbsp;",
    span({ onclick: "rep_del(this)" }, i({ class: "fa fa-times pull-right" })),
    "&nbsp;",
    span(
      { onclick: "rep_down(this)" },
      i({ class: "fa fa-arrow-down pull-right" })
    )
  );
  if (Array.isArray(v[hdr.name]) && v[hdr.name].length > 0) {
    return (
      div(
        { class: `repeats-${hdr.name}` },
        v[hdr.name].map((vi, ix) => {
          return div(
            { class: `form-repeat form-namespace repeat-${hdr.name}` },
            icons,
            hdr.fields.map(f => {
              return mkFormRowForField(
                vi,
                errors,
                formStyle,
                labelCols,
                "_" + ix
              )(f);
            })
          );
        })
      ) + adder
    );
  } else {
    return (
      div(
        { class: `repeats-${hdr.name}` },
        div(
          { class: `form-repeat form-namespace repeat-${hdr.name}` },
          icons,
          hdr.fields.map(f => {
            return mkFormRowForField(v, errors, formStyle, labelCols, "_0")(f);
          })
        )
      ) + adder
    );
  }
};

const displayEdit = (hdr, name, v, extracls) => {
  var fieldview;
  if (hdr.fieldview && hdr.type.fieldviews[hdr.fieldview])
    fieldview = hdr.type.fieldviews[hdr.fieldview];
  else {
    //first isedit fieldview
    fieldview = Object.entries(hdr.type.fieldviews).find(
      ([nm, fv]) => fv.isEdit
    )[1];
  }
  return fieldview.run(
    name,
    v,
    hdr.attributes,
    extracls + " " + hdr.class,
    hdr.required
  );
};

const mkFormRowForField = (
  v,
  errors,
  formStyle,
  labelCols,
  nameAdd = ""
) => hdr => {
  const name = hdr.name + nameAdd;
  const errorFeedback = errors[name]
    ? `<div class="invalid-feedback">${text(errors[name])}</div>`
    : "";
  if (hdr.input_type === "hidden") {
    return innerField(v, errors, nameAdd)(hdr);
  } else
    return formRowWrap(
      hdr,
      innerField(v, errors, nameAdd)(hdr),
      errorFeedback,
      formStyle,
      labelCols
    );
};

const renderFormLayout = form => {
  const blockDispatch = {
    field(segment) {
      const field = form.fields.find(f => f.name === segment.field_name);
      if (field && field.input_type !== "hidden")
        return innerField(form.values, form.errors)(field);
      else return "";
    },
    action({ action_name }) {
      return `<button type="submit" class="btn btn-primary">${text(
        form.submitLabel || "Save"
      )}</button>`;
    }
  };
  return renderLayout({ blockDispatch, layout: form.layout });
};

const renderForm = (form, csrfToken) => {
  if (form.isStateForm) {
    form.class += " px-4 py-3";
    form.formStyle = "vert";
    var collapsedSummary = "";
    Object.entries(form.values).forEach(([k, v]) => {
      if (k[0] !== "_") collapsedSummary += `${text(k)}:${text_attr(v)} `;
    });
    return div(
      { class: "dropdown" },
      button(
        {
          class: "btn btn-secondary dropdown-toggle",
          type: "button",
          id: "dropdownMenuButton",
          "data-toggle": "dropdown",
          "aria-haspopup": "true",
          "aria-expanded": "false"
        },
        collapsedSummary || "Search filter"
      ),

      div(
        { class: "dropdown-menu", "aria-labelledby": "dropdownMenuButton" },
        mkForm(form, csrfToken, form.errors)
      )
    );
  } else if (form.layout) return mkFormWithLayout(form, csrfToken);
  else return mkForm(form, csrfToken, form.errors);
};

const mkFormWithLayout = (form, csrfToken) => {
  const hasFile = form.fields.some(f => f.input_type === "file");
  const csrfField = `<input type="hidden" name="_csrf" value="${csrfToken}">`;
  const top = `<form action="${form.action}" class="form-namespace ${
    form.class
  }" method="${form.methodGET ? "get" : "post"}" ${
    hasFile ? 'encType="multipart/form-data"' : ""
  }>`;
  const blurbp = form.blurb ? p(text(form.blurb)) : "";
  const hiddens = form.fields
    .filter(f => f.input_type === "hidden")
    .map(f => innerField(form.values, form.errors)(f))
    .join("");
  return (
    blurbp + top + csrfField + hiddens + renderFormLayout(form) + "</form>"
  );
};

const mkForm = (form, csrfToken, errors = {}) => {
  const hasFile = form.fields.some(f => f.input_type === "file");
  const csrfField =
    csrfToken === false
      ? ""
      : `<input type="hidden" name="_csrf" value="${csrfToken}">`;
  const top = `<form action="${form.action}" class="form-namespace ${
    form.isStateForm ? "stateForm" : ""
  } ${form.class}" method="${form.methodGET ? "get" : "post"}" ${
    hasFile ? 'encType="multipart/form-data"' : ""
  }>`;
  //console.log(hdrs);
  const flds = form.fields
    .map(
      mkFormRow(
        form.values,
        errors,
        form.formStyle,
        typeof form.labelCols === "undefined" ? 2 : form.labelCols
      )
    )
    .join("");
  const blurbp = form.blurb ? p(text(form.blurb)) : "";
  const bot = `<div class="form-group row">
  <div class="col-sm-12">
    <button type="submit" class="btn ${form.submitButtonClass ||
      "btn-primary"}">${text(form.submitLabel || "Save")}</button>
  </div>
</div>`;
  return (
    blurbp +
    top +
    csrfField +
    flds +
    (form.noSubmitButton ? "" : bot) +
    "</form>"
  );
};

module.exports = contract(
  is.fun([is.class("Form"), is.or(is.str, is.eq(false))], is.str),
  renderForm
);