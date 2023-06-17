function onCatMode(domain: string): void {
  GM_addStyle(`\
@@include("../build/css/cat.css")
`);

  const instance = parseInt(GM_getValue("instance", "0")) + 1;
  GM_setValue("instance", instance.toString());

  console.log("cat-mode is running:", { domain: domain, instance: instance });

  const q_cattable = "#cattable";
  const q_cattable_cells = "#cattable div.cell";

  function urlRequest(option?: number): string {
    if (option == null) {
      return location.protocol + "//" + location.host + location.pathname + location.search + " #cattable > tbody";
    } else if (option === 0) {
      return location.protocol + "//" + location.host + location.pathname + "?mode=cat #cattable > tbody";
    } else {
      return location.protocol + "//" + location.host + location.pathname + `?mode=cat&sort=${option}` + " #cattable > tbody";
    }
  }

  function normalizeText(text: string): string {
    // prettier-ignore
    const kanaMap: { [name: string]: string; } = {
      ｶﾞ: "ガ", ｷﾞ: "ギ", ｸﾞ: "グ", ｹﾞ: "ゲ", ｺﾞ: "ゴ", ｻﾞ: "ザ", ｼﾞ: "ジ", ｽﾞ: "ズ", ｾﾞ: "ゼ", ｿﾞ: "ゾ",
      ﾀﾞ: "ダ", ﾁﾞ: "ヂ", ﾂﾞ: "ヅ", ﾃﾞ: "デ", ﾄﾞ: "ド", ﾊﾞ: "バ", ﾋﾞ: "ビ", ﾌﾞ: "ブ", ﾍﾞ: "ベ", ﾎﾞ: "ボ",
      ﾊﾟ: "パ", ﾋﾟ: "ピ", ﾌﾟ: "プ", ﾍﾟ: "ペ", ﾎﾟ: "ポ", ｳﾞ: "ヴ", ﾜﾞ: "ヷ", ｦﾞ: "ヺ",
      ｱ: "ア", ｲ: "イ", ｳ: "ウ", ｴ: "エ", ｵ: "オ", ｶ: "カ", ｷ: "キ", ｸ: "ク", ｹ: "ケ", ｺ: "コ",
      ｻ: "サ", ｼ: "シ", ｽ: "ス", ｾ: "セ", ｿ: "ソ", ﾀ: "タ", ﾁ: "チ", ﾂ: "ツ", ﾃ: "テ", ﾄ: "ト",
      ﾅ: "ナ", ﾆ: "ニ", ﾇ: "ヌ", ﾈ: "ネ", ﾉ: "ノ", ﾊ: "ハ", ﾋ: "ヒ", ﾌ: "フ", ﾍ: "ヘ", ﾎ: "ホ",
      ﾏ: "マ", ﾐ: "ミ", ﾑ: "ム", ﾒ: "メ", ﾓ: "モ", ﾔ: "ヤ", ﾕ: "ユ", ﾖ: "ヨ",
      ﾗ: "ラ", ﾘ: "リ", ﾙ: "ル", ﾚ: "レ", ﾛ: "ロ", ﾜ: "ワ", ｦ: "ヲ", ﾝ: "ン",
      ｧ: "ア", ｨ: "イ", ｩ: "ウ", ｪ: "エ", ｫ: "オ", ｯ: "ツ", ｬ: "ヤ", ｭ: "ユ", ｮ: "ヨ",
      "｡": "。", "､": "、", ｰ: "ー", "｢": "「", "｣": "」", "･": "・",
      //ぁ: "あ", ぃ: "い", ぅ: "う", ぇ: "え", ぉ: "お", っ: "つ", ゃ: "や", ゅ: "ゆ", ょ: "よ", ゎ: "わ",
      ァ: "ア", ィ: "イ", ゥ: "ウ", ェ: "エ", ォ: "オ", ッ: "ツ", ャ: "ヤ", ュ: "ユ", ョ: "ヨ", ヮ: "ワ",
      ヵ: "カ", ヶ: "ケ",
    };
    const reg = new RegExp("(" + Object.keys(kanaMap).join("|") + ")", "g");
    return text
      .replace(/[！-～]/g, (s) => String.fromCharCode(s.charCodeAt(0) - 0xfee0)) // 全角英数字→半角英数字
      .toLowerCase() // 大文字英数字→小文字英数字
      .replace(/[\u3041-\u3096]/g, (s) => String.fromCharCode(s.charCodeAt(0) + 0x60)) // ひらがな→カタカナ
      .replace(reg, (s) => kanaMap[s]) // 半角カナ→全角カナ、小書きカナ→大文字カナ
      .replace(/ﾞ/g, "゛")
      .replace(/ﾟ/g, "゜");
  }

  class CatView {
    _cat: Catalog;

    constructor(cat: Catalog) {
      this._cat = cat;
    }

    save(update?: boolean): void {
      saveCatalog(this._cat, update);
    }

    get(key: string): CatalogItem {
      return this._cat[key];
    }

    update(content: HTMLElement, oldcat: CatView, domain: string): void {
      const a = $("a", content);
      const href = a.attr("href");
      if (href == null) {
        return;
      }
      const key = getKey(domain, href);
      if (key == null) {
        return;
      }
      a.attr("target", key);
      const res = parseInt($("font", content).text());
      const title = $("small", content).text();
      if (this._cat[key] != null) {
        this._cat[key] = {
          href: href,
          res: res,
          readres: this._cat[key].readres,
          title: title,
          updateTime: Date.now(),
          offset: this._cat[key].offset,
        };
      } else {
        this._cat[key] = {
          href: href,
          res: res,
          readres: -1,
          title: title,
          updateTime: Date.now(),
          offset: 0,
        };
      }
      this.render(content, oldcat, key);
    }

    render(content: HTMLElement, oldcat: CatView, key: string): void {
      let resnum = $("span.resnum", content).first();
      if (resnum.length === 0) {
        resnum = $('<span class="resnum">');
        $("font", content).after(resnum);
      }
      resnum.empty();
      $(content).removeClass("resup reseq thrnew catup");
      if (oldcat.get(key) != null) {
        if (oldcat.get(key).readres >= 0) {
          const resDiff = this._cat[key].res - oldcat.get(key).readres;
          if (resDiff > 0) {
            resnum.text("+" + resDiff);
            $(content).addClass("resup");
          } else if (resDiff < 0) {
            this._cat[key].res = oldcat.get(key).readres;
            $("font", content).text(this._cat[key].res);
            $(content).addClass("reseq");
          } else {
            $(content).addClass("reseq");
          }
        } else if (oldcat.get(key).res >= 0) {
          const catDiff = this._cat[key].res - oldcat.get(key).res;
          if (catDiff > 0) {
            resnum.text("+" + catDiff);
            $(content).addClass("catup");
          }
        }
      } else {
        // NEW
        $(content).addClass("thrnew");
      }
    }

    findText(text: string): JQuery<HTMLElement> {
      const norm = normalizeText(text);
      return $(q_cattable_cells).filter((i, e) => {
        if (!e.textContent) {
          return false;
        }
        return normalizeText(e.textContent).includes(norm);
      });
    }

    findHist(domain: string): JQuery<HTMLElement> {
      return $(q_cattable_cells).filter((i, e) => {
        const href = $("a", e).attr("href");
        if (href == null) {
          return false;
        }
        const key = getKey(domain, href);
        if (key == null) {
          return false;
        }
        return (this._cat[key]?.readres ?? 0) >= 0;
      });
    }

    filterExpiredItems(): CatView {
      const expireTime = 259200000; // 3days
      const now = Date.now();
      const cat: Catalog = {};
      for (const key in this._cat) {
        const item = this._cat[key];
        if (now - item.updateTime < expireTime) {
          cat[key] = item;
        }
      }
      return new CatView(cat);
    }
  }

  class FindResult {
    _table: JQuery<HTMLElement>;
    _item_count: number;

    constructor() {
      this._table = $('<div id="findresult">').hide();
      this._item_count = 0;
    }

    append(elems: JQuery<HTMLElement>): void {
      elems.each((i, e) => {
        if (i === 0) {
          this._table.show();
        }
        this._table.append($(e).clone(true));
        this._item_count += 1;
      });
    }

    clear(): void {
      this._table.hide();
      this._table.empty();
      this._item_count = 0;
    }

    get(): JQuery<HTMLElement> {
      return this._table;
    }

    count(): number {
      return this._item_count;
    }

    show(): void {
      this._table.show();
    }

    hide(): void {
      this._table.hide();
    }
  }

  class CatTable {
    _finder: JQuery<HTMLElement>;
    _result: FindResult;
    _cat: CatView;
    _oldcat: CatView;
    _domain: string;
    _timer?: number;

    constructor(finder: JQuery<HTMLElement>, result: FindResult, domain: string) {
      this._finder = finder;
      this._result = result;
      this._cat = new CatView({});
      this._oldcat = new CatView({});
      this.update();
      this._finder.on("input", () => this.onInput());
      this._domain = domain;
    }

    update(): void {
      this._oldcat = new CatView(loadCatalog());
      this._cat = this._oldcat.filterExpiredItems();
      $(q_cattable_cells).each((i, cell) => {
        this._cat.update(cell, this._oldcat, this._domain);
      });
      this._result.hide();
      this._result.clear();
      const value = this._finder.val();
      if (typeof value === "string" && value !== "") {
        this._result.append(this._cat.findText(value));
      } else {
        this._result.append(this._cat.findHist(this._domain));
      }
      if (this._result.count() > 0) {
        this._result.show();
      }
    }

    save(): void {
      this._cat.save();
    }

    onInput(): void {
      clearTimeout(this._timer);
      this._timer = setTimeout(() => this.update(), 500);
    }
  }

  function columnAdjuster(): JQuery<HTMLElement> {
    const CELL_WIDTH = 67;  // 65px (border-box width) + 2px (margin)
    const re = /\bcxyl=(\d+)(x\d+x\d+x\d+x\d+)\b/;
    const mo = re.exec(document.cookie);
    const initValue = mo != null ? mo[1] : "100";
    return $(`<input id="column-adjust" type="number" value="${initValue}" step="1" max="100" min="1">`)
      .on("input", function () {
        if (!(this instanceof HTMLInputElement)) {
          return;
        }
        const input = parseInt(this.value);
        const columns = Math.min(Math.floor(document.body.clientWidth / CELL_WIDTH), input);
        if (input !== columns) {
          this.value = columns.toString();
        }
        const mo = re.exec(document.cookie);
        if (mo != null) {
          document.cookie.split("; ").filter(e => !e.startsWith("cxyl=")).forEach(e => { document.cookie = e; });
          document.cookie = `cxyl=${columns}${mo[2]}`;
        }
        document.documentElement.style.setProperty("--table-columns", columns + "");
      })
      .on("wheel", function (e: JQuery.TriggeredEvent) {
        if (!(this instanceof HTMLInputElement && e.originalEvent instanceof WheelEvent)) {
          return;
        }
        if (e.originalEvent.deltaY < 0) {
          this.stepUp();
        } else {
          this.stepDown();
        }
        e.stopPropagation();
        e.preventDefault();
        $(this).trigger("input");
      }).trigger("input");
  }

  class CatMode {
    table: CatTable;
    finder: JQuery<HTMLElement>;
    sortOption: { value?: number; } = {};

    constructor(domain: string) {
      this.transform();
      this.overrideCatalogLinks();

      const finder = $('<input type="search" placeholder="Search...">')
        .css("vertical-align", "middle")
        .on("focus", (e) => this.onFocus(e));
      const button = $('<input type="button" value="更新">').on("click", () => this.onButtonClick());
      const result = new FindResult();
      const table = new CatTable(finder, result, domain);
      const select = new AutoUpdateSelection(this, ["OFF", 0], ["30sec", 30], ["1min", 60], ["3min", 180]);
      const controller = $('<div id="controller">').append(finder, " ", button, " ", select.get(), " ", columnAdjuster());

      $(q_cattable).before($("<p>"), controller, $("<p>"), result.get(), $("<p>"));

      table.update();

      setInterval(() => this.onTimer(), 2000);
      $(window).on("keydown", (e) => this.onKeyDown(e));
      $(window).on("unload", () => this.onUnload());

      this.table = table;
      this.finder = finder;
    }

    transform(): void {
      $("#cattable").replaceWith(
        $('<div id="cattable">').append(
          $("#cattable td").map((i, e) =>
            $('<div class="cell">')
              .append($('<div class="inner-cell">').append($(e).contents()))
              .get()
          )
        )
      );
    }

    overrideCatalogLinks(): void {
      $<HTMLAnchorElement>("body > a, body > b > a")
        .filter((i, a) => /\?mode=cat/.test(a.href))
        .each((i, a) => {
          if (a.href === location.href) {
            a.classList.add("select");
          }
          const mo = /\?mode=cat&sort=(\d+)/.exec(a.href);
          if (mo == null) {
            $(a).on("click", (e) => {
              $("body > a, body > b > a").removeClass("select");
              e.target.classList.add("select");
              e.stopPropagation();
              e.preventDefault();
              this.reload({ save: false, sort: 0 });
            });
          } else {
            $(a).on("click", (e) => {
              $("body > a, body > b > a").removeClass("select");
              e.target.classList.add("select");
              e.stopPropagation();
              e.preventDefault();
              this.reload({ save: false, sort: parseInt(mo[1]) });
            });
          }
        });
    }

    reload({ save, sort }: { save?: boolean; sort?: number; } = {}): void {
      if (sort != null) {
        this.sortOption = { value: sort };
      }
      $(q_cattable).load(urlRequest(this.sortOption.value), () => {
        if (save == null || save) {
          this.table.save();
        }
        this.transform();
        this.table.update();
      });
    }

    onFocus(e: JQuery.TriggeredEvent): void {
      if (e.target instanceof HTMLInputElement) {
        e.target.select();
      }
    }

    onUpdate(): void {
      this.reload({ save: false });
    }

    onSelect(): void {
      return;
    }

    onButtonClick(): void {
      this.reload();
    }

    onUnload(): void {
      this.table.save();
      GM_setValue("instance", (parseInt(GM_getValue("instance", "1")) - 1).toString());
    }

    onKeyDown(e: JQuery.TriggeredEvent): void {
      if (document.activeElement?.tagName === "INPUT") {
        return;
      }
      if (e.key === "s") {
        this.reload();
      } else if (e.key === "/") {
        this.finder.trigger("focus");
      }
    }

    onTimer(): void {
      if (readClearUpdateFlag()) {
        this.table.update();
      }
    }
  }

  new CatMode(domain);
}
