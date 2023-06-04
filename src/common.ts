interface Catalog {
  [key: string]: CatalogItem;
}

interface CatalogItem {
  href: string;
  res: number;
  readres: number;
  title: string;
  updateTime: number;
  offset: number;
}

function getKey(domain: string, href: string): string | undefined {
  const mo = /([0-9]+)\.htm$/.exec(href);
  if (mo != null) {
    return domain + "#" + mo[1];
  }
}

function loadCatalog(): Catalog {
  return JSON.parse(GM_getValue("cat", "{}"));
}

function saveCatalog(cat: Catalog, update?: boolean): void {
  GM_setValue("cat", JSON.stringify(cat));
  if (update) {
    GM_setValue("update", parseInt(GM_getValue("instance", "1")).toString());
  } else {
    GM_setValue("update", "0");
  }
}

function readClearUpdateFlag(): boolean {
  const update = parseInt(GM_getValue("update", "0"));
  if (update > 0) {
    GM_setValue("update", (update - 1).toString());
    return true;
  } else {
    return false;
  }
}

interface AutoUpdateEventHandler {
  onUpdate: () => void;
  onSelect: (text: string, value: number) => void;
}

class AutoUpdateSelection {
  _timer: number;
  _handler: AutoUpdateEventHandler;
  _select: JQuery<HTMLElement>;

  constructor(handler: AutoUpdateEventHandler, ...options: [string, number][]) {
    this._timer = 0;
    this._handler = handler;
    this._select = $('<select id="auto-update-interval">');
    for (const [name, value] of options) {
      this.addOption(name, value);
    }
    this._select.on("input", () => this.onInput());
  }

  get(): JQuery<HTMLElement> {
    return this._select;
  }

  addOption(name: string, value: number): void {
    this._select.append($("<option>").val(value).text(name));
  }

  getOption(): [string, number] {
    const option = $("option:checked", this._select);
    const text = option.text();
    const value = option.val();
    if (typeof value === "string" && value !== "") {
      return [text, parseInt(value)];
    }
    return ["", 0];
  }

  onInput(): void {
    clearTimeout(this._timer);
    const [text, value] = this.getOption();
    console.log("auto-update:", text, value);
    this._handler.onSelect(text, value);
    if (value <= 0) {
      return;
    }
    this._timer = setTimeout(() => this.onTimer(), value * 1000);
  }

  onTimer(): void {
    clearTimeout(this._timer);
    const [, value] = this.getOption();
    console.log("auto-update:", new Date().toLocaleString());
    if (value <= 0) {
      return;
    }
    this._handler.onUpdate();
    this._timer = setTimeout(() => this.onTimer(), value * 1000);
  }
}
