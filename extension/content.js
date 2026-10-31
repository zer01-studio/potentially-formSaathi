(() => {
  if (window.__formSaathiLoaded) return;
  window.__formSaathiLoaded = true;

  const SKIP_INPUT_TYPES = new Set([
    "hidden",
    "submit",
    "button",
    "reset",
    "file",
    "image",
    "password",
    "range",
    "color",
  ]);

  const registry = new Map();

  function textOf(element) {
    return (element?.textContent || "").replace(/\s+/g, " ").trim();
  }

  function cleanLabel(value) {
    return (value || "")
      .replace(/\s+/g, " ")
      .replace(/\s*[:*]\s*$/, "")
      .trim()
      .slice(0, 200);
  }

  function isVisible(element) {
    const rect = element.getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return false;
    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;
    if (element.closest('[aria-hidden="true"]')) return false;
    return true;
  }

  function labelFor(element) {
    const labelledBy = element.getAttribute("aria-labelledby");
    if (labelledBy) {
      const text = labelledBy
        .split(/\s+/)
        .map((id) => textOf(document.getElementById(id)))
        .filter(Boolean)
        .join(" ");
      if (text) return cleanLabel(text);
    }

    if (element.labels && element.labels.length > 0) {
      const text = [...element.labels].map(textOf).filter(Boolean).join(" ");
      if (text) return cleanLabel(text);
    }

    const aria = element.getAttribute("aria-label");
    if (aria) return cleanLabel(aria);

    const wrapping = element.closest("label");
    if (wrapping) return cleanLabel(textOf(wrapping));

    const fieldset = element.closest("fieldset");
    if (fieldset) {
      const legend = fieldset.querySelector("legend");
      if (legend) return cleanLabel(textOf(legend));
    }

    return "";
  }

  function helpFor(element) {
    const describedBy = element.getAttribute("aria-describedby");
    if (!describedBy) return "";
    return cleanLabel(
      describedBy
        .split(/\s+/)
        .map((id) => textOf(document.getElementById(id)))
        .filter(Boolean)
        .join(" "),
    ).slice(0, 300);
  }

  function inputTypeFor(element) {
    if (element.tagName === "TEXTAREA") return "textarea";
    if (element.tagName === "SELECT") return "select";
    const type = (element.getAttribute("type") || "text").toLowerCase();
    if (type === "email" || type === "tel" || type === "date" || type === "number") {
      return type;
    }
    if (type === "radio") return "radio";
    if (type === "checkbox") return "checkbox";
    return "text";
  }

  function register(inputType, elements) {
    const id = `fs-${registry.size + 1}`;
    registry.set(id, { inputType, elements });
    return id;
  }

  function describeControl(element, seenRadios) {
    const type = inputTypeFor(element);
    const name = element.getAttribute("name") || "";

    if (type === "radio") {
      if (!name || seenRadios.has(name)) return null;
      seenRadios.add(name);
      const scope = element.form || document;
      const group = [...scope.querySelectorAll(`input[type="radio"][name="${CSS.escape(name)}"]`)].filter(
        (radio) => !radio.disabled,
      );
      if (group.length === 0) return null;
      const first = group[0];
      const fieldset = first.closest("fieldset");
      const legend = fieldset ? fieldset.querySelector("legend") : null;
      return {
        id: register("radio", group),
        label: legend ? cleanLabel(textOf(legend)) : labelFor(first) || name,
        name,
        inputType: "radio",
        required: group.some((radio) => radio.required),
        options: group.map((radio) => cleanLabel(labelFor(radio) || radio.value)).filter(Boolean),
        helpText: helpFor(first) || undefined,
        autocomplete: first.getAttribute("autocomplete") || undefined,
        placeholder: undefined,
        currentValue: group.find((radio) => radio.checked)?.value || "",
      };
    }

    if (type === "checkbox") {
      return {
        id: register("checkbox", [element]),
        label: labelFor(element) || name,
        name,
        inputType: "checkbox",
        required: element.required,
        options: undefined,
        helpText: helpFor(element) || undefined,
        autocomplete: element.getAttribute("autocomplete") || undefined,
        placeholder: undefined,
        currentValue: element.checked ? "checked" : "",
      };
    }

    const options =
      type === "select"
        ? [...element.options]
            .filter((option) => option.value !== "")
            .map((option) => option.text.trim())
            .filter(Boolean)
        : undefined;

    return {
      id: register(type, [element]),
      label: labelFor(element) || element.getAttribute("placeholder") || name,
      name,
      inputType: type,
      required: element.required,
      options,
      helpText: helpFor(element) || undefined,
      autocomplete: element.getAttribute("autocomplete") || undefined,
      placeholder: element.getAttribute("placeholder") || undefined,
      currentValue: element.value,
    };
  }

  function scanPage() {
    registry.clear();
    const seenRadios = new Set();
    const fields = [];

    const elements = document.querySelectorAll("input, select, textarea");
    for (const element of elements) {
      if (element.tagName === "INPUT") {
        const type = (element.getAttribute("type") || "text").toLowerCase();
        if (SKIP_INPUT_TYPES.has(type)) continue;
      }
      if (element.disabled || element.readOnly) continue;
      if (!isVisible(element)) continue;

      const descriptor = describeControl(element, seenRadios);
      if (!descriptor) continue;
      if (!descriptor.label && !descriptor.name) continue;
      fields.push(descriptor);
      if (fields.length >= 40) break;
    }

    return {
      ok: true,
      title: document.title.slice(0, 200),
      url: location.href.slice(0, 2048),
      fields,
    };
  }

  function normalize(value) {
    return (value || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, " ")
      .trim();
  }

  function toIsoDate(value) {
    const numeric = /^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/.exec(value.trim());
    if (!numeric) return null;
    const [, a, b, year] = numeric;
    const day = Number(a);
    const month = Number(b);
    if (month > 12 && day <= 12) {
      return `${year}-${String(day).padStart(2, "0")}-${String(month).padStart(2, "0")}`;
    }
    return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  }

  function nativeSet(element, value) {
    const proto =
      element.tagName === "TEXTAREA"
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, "value")?.set;
    if (setter) setter.call(element, value);
    else element.value = value;
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function highlight(element) {
    let style = document.getElementById("fs-highlight-style");
    if (!style) {
      style = document.createElement("style");
      style.id = "fs-highlight-style";
      style.textContent =
        "[data-fs-filled]{outline:2px solid #0f4c3f !important;outline-offset:2px !important;transition:outline-color .2s ease}";
      document.head.appendChild(style);
    }
    element.setAttribute("data-fs-filled", "true");
    element.scrollIntoView({ block: "center", behavior: "smooth" });
  }

  function fillOne(entry, rawValue) {
    const value = String(rawValue ?? "").trim();
    if (!value) return "missing";
    const { inputType, elements } = entry;

    if (inputType === "select") {
      const select = elements[0];
      const wanted = normalize(value);
      const option =
        [...select.options].find((item) => normalize(item.value) === wanted) ||
        [...select.options].find((item) => normalize(item.text) === wanted) ||
        [...select.options].find((item) => normalize(item.text).includes(wanted));
      if (!option) return "no_option";
      select.value = option.value;
      select.dispatchEvent(new Event("change", { bubbles: true }));
      highlight(select);
      return "filled";
    }

    if (inputType === "radio") {
      const wanted = normalize(value);
      const radio =
        elements.find((item) => normalize(item.value) === wanted) ||
        elements.find((item) => normalize(labelFor(item)) === wanted);
      if (!radio) return "no_option";
      radio.click();
      highlight(radio);
      return "filled";
    }

    if (inputType === "checkbox") {
      const truthy = /^(yes|true|1|checked|on|y|agree)$/i.test(value);
      elements[0].checked = truthy;
      elements[0].dispatchEvent(new Event("change", { bubbles: true }));
      highlight(elements[0]);
      return "filled";
    }

    const element = elements[0];
    let nextValue = value;
    if (element.type === "date") {
      const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? value : toIsoDate(value);
      if (!iso) return "bad_date";
      nextValue = iso;
    }

    nativeSet(element, nextValue);
    highlight(element);
    return "filled";
  }

  function fillPage(values) {
    const report = [];
    for (const [id, value] of Object.entries(values || {})) {
      const entry = registry.get(id);
      if (!entry) {
        report.push({ id, status: "not_found" });
        continue;
      }
      try {
        report.push({ id, status: fillOne(entry, value) });
      } catch (error) {
        report.push({ id, status: "error", detail: String(error).slice(0, 120) });
      }
    }
    return { ok: true, report };
  }

  function clearHighlights() {
    for (const element of document.querySelectorAll("[data-fs-filled]")) {
      element.removeAttribute("data-fs-filled");
    }
    return { ok: true };
  }

  if (typeof chrome === "undefined" || !chrome.runtime?.onMessage) return;

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    try {
      if (message?.type === "fs:ping") {
        sendResponse({ ok: true });
        return false;
      }
      if (message?.type === "fs:scan") {
        sendResponse(scanPage());
        return false;
      }
      if (message?.type === "fs:fill") {
        sendResponse(fillPage(message.values));
        return false;
      }
      if (message?.type === "fs:clear") {
        sendResponse(clearHighlights());
        return false;
      }
    } catch (error) {
      sendResponse({ ok: false, error: String(error).slice(0, 200) });
    }
    return false;
  });
})();
