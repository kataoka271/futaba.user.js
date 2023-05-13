// ==UserScript==
// @name         Futaba
// @namespace    https://github.com/kataoka271
// @version      0.0.18
// @description  Futaba
// @author       k_hir@hotmail.com
// @match        https://may.2chan.net/b/*
// @updateURL    https://github.com/kataoka271/userscripts/raw/master/dist/Futaba.user.js
// @require      http://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_deleteValue
// @grant        GM_download
// ==/UserScript==

(function () {
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

  const getKey = (domain: string, href: string): string | undefined => {
    const mo = /([0-9]+)\.htm$/.exec(href);
    if (mo != null) {
      return domain + "#" + mo[1];
    }
  };

  const loadCatalog = (): Catalog => {
    return JSON.parse(GM_getValue("cat", "{}"));
  };

  const saveCatalog = (cat: Catalog, update?: string): void => {
    GM_setValue("cat", JSON.stringify(cat));
    GM_setValue("update", update ?? "0");
  };

  const readClearUpdateFlag = (): string => {
    const update = GM_getValue("update", "0");
    GM_setValue("update", "0");
    return update;
  };

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

  const onCatMode = (domain: string): void => {
    GM_addStyle(`\
@@include("Futaba-cat.user.css")
`);

    const q_cattable = "table#cattable";
    const q_cattable_cells = "table#cattable td";
    const q_cattable_firstrow = "table#cattable tr:first-child td";

    function normalizeText(text: string): string {
      // prettier-ignore
      const kanaMap: { [name: string]: string } = {
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

    const findItemsText = (text: string): JQuery<HTMLElement> => {
      const text2 = normalizeText(text);
      return $(q_cattable_cells).filter((i, e) => {
        if (!e.textContent) {
          return false;
        }
        return normalizeText(e.textContent).includes(text2);
      });
    };

    const findItemsHist = (cat: Catalog, domain: string): JQuery<HTMLElement> => {
      return $(q_cattable_cells).filter((i, e) => {
        const href = $("a", e).attr("href");
        if (href != null) {
          const key = getKey(domain, href);
          if (key != null) {
            return (cat[key]?.readres ?? 0) >= 0;
          }
        }
        return false;
      });
    };

    const updateCat = (cat: Catalog, td: HTMLElement, oldcat: Catalog, domain: string) => {
      const a = $("a", td);
      const href = a.attr("href");
      if (href == null) {
        return;
      }
      const key = getKey(domain, href);
      if (key == null) {
        return;
      }
      a.attr("target", key);
      const res = parseInt($("font", td).text());
      const title = $("small", td).text();
      if (cat[key] != null) {
        cat[key] = {
          href: href,
          res: res,
          readres: cat[key].readres,
          title: title,
          updateTime: Date.now(),
          offset: cat[key].offset,
        };
      } else {
        cat[key] = {
          href: href,
          res: res,
          readres: -1,
          title: title,
          updateTime: Date.now(),
          offset: 0,
        };
      }
      let resnum = $("span.resnum", td).first();
      if (resnum.length === 0) {
        resnum = $('<span class="resnum">');
        $("font", td).after(resnum);
      }
      resnum.empty();
      $(td).removeClass("resup reseq thrnew catup");
      if (oldcat[key] != null) {
        if (oldcat[key].readres >= 0) {
          const resDiff = cat[key].res - oldcat[key].readres;
          if (resDiff > 0) {
            resnum.text("+" + resDiff);
            $(td).addClass("resup");
          } else if (resDiff < 0) {
            cat[key].res = oldcat[key].readres;
            $("font", td).text(cat[key].res);
            $(td).addClass("reseq");
          } else {
            $(td).addClass("reseq");
          }
        } else if (oldcat[key].res >= 0) {
          const catDiff = cat[key].res - oldcat[key].res;
          if (catDiff > 0) {
            resnum.text("+" + catDiff);
            $(td).addClass("catup");
          }
        }
      } else {
        // NEW
        $(td).addClass("thrnew");
      }
    };

    const filterNotExpiredItems = (oldcat: Catalog): Catalog => {
      const expireTime = 259200000; // 3days
      const now = Date.now();
      const cat: Catalog = {};
      for (const key in oldcat) {
        const item = oldcat[key];
        if (now - item.updateTime < expireTime) {
          cat[key] = item;
        }
      }
      return cat;
    };

    class FindResult {
      _table: JQuery<HTMLElement>;
      _tbody: JQuery<HTMLElement>;
      _tr: JQuery<HTMLElement>;
      _item_count: number;
      _column_count: number;

      constructor(column_count = 8) {
        this._table = $('<table border="1" align="center">').hide();
        this._tbody = $("<tbody>").appendTo(this._table);
        this._tr = $("<tr>").appendTo(this._tbody);
        this._item_count = 0;
        this._column_count = column_count;
      }

      append(elems: JQuery<HTMLElement>): void {
        elems.each((i, e) => {
          if (this._item_count === 0) {
            this._table.show();
          } else if (this._item_count % this._column_count === 0) {
            this._tr = $("<tr>").appendTo(this._tbody);
          }
          this._tr.append($(e).clone(true));
          this._item_count += 1;
        });
      }

      clear(): void {
        this._table.hide();
        this._tbody.empty();
        this._tr = $("<tr>").appendTo(this._tbody);
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
      _cat: Catalog;
      _oldcat: Catalog;
      _domain: string;

      constructor(finder: JQuery<HTMLElement>, result: FindResult, domain: string) {
        this._finder = finder;
        this._result = result;
        this._cat = {};
        this._oldcat = {};
        let timer: number;
        this._finder.on("input", () => {
          clearTimeout(timer);
          timer = setTimeout(() => this.update(), 500);
        });
        this._domain = domain;
      }

        this._oldcat = loadCatalog();
        this._cat = filterNotExpiredItems(this._oldcat);
      update(): void {
        $(q_cattable_cells).each((i, elem) => {
          updateCat(this._cat, elem, this._oldcat, this._domain);
        });
        this._result.hide();
        this._result.clear();
        const value = this._finder.val();
        if (typeof value === "string" && value !== "") {
          this._result.append(findItemsText(value));
        } else {
          this._result.append(findItemsHist(this._cat, this._domain));
        }
        if (this._result.count() > 0) {
          this._result.show();
        }
      }

        saveCatalog(this._cat);
      save(): void {
      }

      reload(save?: boolean): void {
        $(q_cattable).load(location.href + " #cattable > tbody", () => {
          if (save == null || save) {
            this.save();
          }
          this.update();
        });
      }
    }

    class CatMode {
      table: CatTable;
      finder: JQuery<HTMLElement>;

      constructor(domain: string) {
        const finder = $('<input type="search" placeholder="Search...">')
          .css("vertical-align", "middle")
          .on("focus", (e) => this.onFocus(e));
        const button = $('<input type="button" value="更新">').on("click", () => this.onButtonClick());
        const column_count = $(q_cattable_firstrow).length;
        const result = new FindResult(column_count);
        const table = new CatTable(finder, result, domain);
        const select = new AutoUpdateSelection(this, ["OFF", 0], ["30sec", 30], ["1min", 60], ["3min", 180]);
        const controller = $('<div id="controller">').append(finder, " ", button, " ", select.get());

        $(q_cattable).before($("<p>"), controller, $("<p>"), result.get(), $("<p>"));

        table.update();

        setInterval(() => this.onTimer(), 2000);
        $(window).on("keydown", (e) => this.onKeyDown(e));
        $(window).on("unload", () => this.onUnload());

        this.table = table;
        this.finder = finder;
      }

      onFocus(e: JQuery.TriggeredEvent): void {
        if (e.target instanceof HTMLInputElement) {
          e.target.select();
        }
      }

      onUpdate(): void {
        this.table.reload();
      }

      onSelect(): void {
        return;
      }

      onButtonClick(): void {
        this.table.reload();
      }

      onUnload(): void {
        this.table.save();
      }

      onKeyDown(e: JQuery.TriggeredEvent): void {
        if (document.activeElement?.tagName === "INPUT") {
          return;
        }
        if (e.key === "s") {
          this.table.reload();
        } else if (e.key === "/") {
          this.finder.trigger("focus");
        }
      }

      onTimer(): void {
        if (readClearUpdateFlag() === "1") {
          this.table.update();
        }
      }
    }

    new CatMode(domain);
  };

  const onResMode = (domain: string): void => {
    GM_addStyle(`\
@@include("Futaba-res.user.css")
`);

    const q_thre = "div.thre";
    const q_table = "div.thre > table";
    const q_res = "div.thre > table > tbody > tr > td.rtd";
    const q_res_resnum = "div.thre table > tbody > tr > td.rtd > span:first-child"; // support tree view mode
    const q_res_notnew = "div.thre table:not(.resnew)";
    const q_res_images = "div.thre table > tbody > tr > td.rtd a > img";
    const q_images = "div.thre table > tbody > tr > td.rtd a > img, div.thre > a > img";
    const q_maxres = "div.thre > span.maxres"; // tree view recovery point
    const q_contres = "#contres > a";

    class ImageViewer {
      images: JQuery<HTMLElement>;
      thumbs: JQuery<HTMLElement>;
      index: number;

      constructor() {
        this.images = $();
        this.thumbs = $();
        this.index = 0;
      }

      page(i: number): void {
        const visible_images = this.images.filter(":visible");
        if (i >= visible_images.length) {
          i = visible_images.length - 1;
        } else if (i < 0) {
          i = 0;
        }
        $("#image-view > .image-slider > div > div > video").next().trigger("click");
        $("#image-view > .image-slider").css("transform", `translate(-${100 * i}%)`);
        const image = visible_images.eq(i);
        if (image.is(".movie")) {
          image.find("a > img").trigger("click");
        }
        $("#image-view > .image-number").text(`${i + 1}/${visible_images.length}`);
        const offset = 50 * i - (window.innerWidth - 50) / 2;
        if (offset < 0) {
          $("#image-view > .image-thumbs").css("transform", "translate(0)");
        } else {
          $("#image-view > .image-thumbs").css("transform", `translate(-${offset}px)`);
        }
        this.thumbs.removeClass("active");
        this.thumbs.filter(":visible").eq(i).addClass("active");
        this.index = i;
      }

      next(): void {
        this.page(this.index + 1);
      }

      prev(): void {
        this.page(this.index - 1);
      }

      onClose(e: JQuery.TriggeredEvent): void {
        this.destroy();
        e.stopPropagation();
        e.preventDefault();
      }

      onKeyDown(e: JQuery.TriggeredEvent): void {
        if (e.key === "ArrowLeft") {
          this.prev();
        } else if (e.key === "ArrowRight") {
          this.next();
        } else if (e.key === "Escape") {
          this.destroy();
        } else if (e.key === "s") {
          const url = this.images.filter(":visible").eq(this.index).find("a").attr("href");
          if (url == null) {
            return;
          }
          const name = url.split("/").pop();
          if (name == null) {
            return;
          }
          GM_download({
            url: url,
            name: name,
            headers: { Referer: location.href },
            saveAs: false,
            onerror: (e) => console.log(e),
          });
        } else {
          return;
        }
        e.stopPropagation();
        e.preventDefault();
      }

      onWheel(e: JQuery.TriggeredEvent): void {
        if (!(e.originalEvent instanceof WheelEvent)) {
          return;
        }
        if (e.originalEvent.deltaY < 0) {
          this.prev();
        } else if (e.originalEvent.deltaY > 0) {
          this.next();
        }
        e.stopPropagation();
        e.preventDefault();
      }

      show(image: HTMLAnchorElement): void {
        const anchors = $<HTMLAnchorElement>(q_images).parent();
        this.images = anchors.map((i, anchor) => {
          const ext = anchor.href.split(".").slice(-1)[0].toLowerCase();
          let div: JQuery<HTMLElement>;
          if (ext === "mp4" || ext === "webm") {
            const img = $('<img loading="lazy">').attr("src", $("img", anchor).attr("src") ?? anchor.href);
            div = $('<div class="movie">').append($("<a>").attr("href", anchor.href).append(img));
          } else {
            const img = $('<img loading="lazy">').attr("src", anchor.href);
            div = $("<div>").append($("<a>").attr("href", anchor.href).append(img));
          }
          if (anchor.closest("table")?.classList.contains("resnew")) {
            div.addClass("resnew");
          }
          return div.data("index", i).get(0);
        });
        this.thumbs = anchors.map((i, anchor) => {
          const img = $('<img loading="lazy">').attr("src", $("img", anchor).attr("src") ?? anchor.href);
          if (anchor.closest("table")?.classList.contains("resnew")) {
            img.addClass("resnew");
          }
          return img.get(0);
        });
        this.index = 0;
        const viewer = $('<div id="image-view" tabindex="0">')
          .on("contextmenu", (e) => this.onClose(e))
          .on("keydown", (e) => this.onKeyDown(e))
          .on("wheel", (e) => this.onWheel(e))
          .append($('<div class="image-slider">').append(this.images))
          .append($('<div class="image-thumbs">').append(this.thumbs))
          .append($('<div class="image-number">'));
        $("#gallery").hide();
        $("body").append(viewer);
        $("#image-view").trigger("focus");
        $("#image-view > .image-slider").css("transition", "all 0s 0s ease");
        this.images
          .filter(":visible")
          .children("a")
          .each((i, e) => {
            if (e instanceof HTMLAnchorElement && e.href === image.href) {
              this.index = i;
              this.page(this.index);
            }
          });
        setTimeout(() => {
          $("#image-view > .image-slider").css("transition", "");
        }, 100);
      }

      destroy(): void {
        $("#gallery").show().trigger("focus");
        $("#image-view").remove();
      }
    }

    class Gallery {
      imageViewer: ImageViewer;

      constructor() {
        this.imageViewer = new ImageViewer();
      }

      create(): void {
        const anchors = $<HTMLAnchorElement>(q_images).parent();
        if (anchors.length === 0) {
          return;
        }
        $('<div id="gallery" tabindex="0">')
          .on("contextmenu", (e) => this.onClose(e))
          .on("keydown", (e) => this.onKeyDown(e))
          .on("click", (e) => this.onClick(e))
          .append(anchors.map((i, e) => this.make(e).get()))
          .appendTo("body")
          .trigger("focus");
      }

      onClose(e: JQuery.TriggeredEvent): void {
        this.destroy();
        e.stopPropagation();
        e.preventDefault();
      }

      onKeyDown(e: JQuery.TriggeredEvent): void {
        if (e.key === "Escape" || e.key === "Esc") {
          this.destroy();
          e.stopPropagation();
          e.preventDefault();
        }
      }

      onClick(e: JQuery.TriggeredEvent): void {
        if (!(e.target instanceof HTMLImageElement)) {
          return;
        }
        if (!(e.target.parentElement instanceof HTMLAnchorElement)) {
          return;
        }
        this.imageViewer.show(e.target.parentElement);
        e.stopPropagation();
        e.preventDefault();
      }

      quote(anchor: JQuery<HTMLElement>): JQuery<HTMLElement> {
        const text = anchor
          .next("blockquote")
          .text()
          .replace(/>[^\n]+\n?/, "");
        if (text === "ｷﾀ━━━(ﾟ∀ﾟ)━━━!!" || text.length === 0) {
          return $();
        } else if (text.length > 10) {
          return $("<span>")
            .text(text.slice(0, 7) + "...")
            .attr("title", text)
            .before("<br>");
        } else {
          return $("<span>").text(text).before("<br>");
        }
      }

      make(anchor: HTMLAnchorElement): JQuery<HTMLElement> {
        const a = $(anchor);
        const ext = anchor.href.split(".").slice(-1)[0].toLowerCase();
        let div;
        if (ext === "mp4" || ext === "webm") {
          div = $('<div class="movie">').append(a.clone().attr("data-ext", ext), this.quote(a));
        } else if (ext === "gif") {
          div = $('<div class="anime">').append(a.clone().attr("data-ext", ext), this.quote(a));
        } else {
          div = $("<div>").append(a.clone(), this.quote(a));
        }
        if (a.closest("table")?.is(".resnew")) {
          div.addClass("resnew");
        }
        return div;
      }

      destroy(): void {
        $("#gallery-button").removeClass("enable");
        $("#gallery").remove();
        this.imageViewer.destroy();
      }
    }

    class TreeView {
      make(): void {
        let quotes: { text: string; res: HTMLElement; resnew: boolean }[] = [];
        $(q_res_notnew).last().after($('<span id="resnew">'));
        $(q_table)
          .toArray()
          .reverse()
          .forEach((table) => {
            const mo = />([^>]+)$/.exec($("blockquote > font", table).last().text());
            const text = $("blockquote, a, span", table).text();
            let clone: JQuery<HTMLElement> | null = null;
            quotes = quotes.filter((item) => {
              if (!text.includes(item.text)) {
                return true;
              }
              if (!table.classList.contains("resnew") && item.resnew) {
                if (clone == null) {
                  clone = $(table).clone(true).insertAfter("#resnew").addClass("clone");
                }
                $("blockquote", clone).first().after(item.res);
              } else {
                $("blockquote", table).first().after(item.res);
              }
              return false;
            });
            if (mo != null) {
              quotes.push({ text: mo[1], res: table, resnew: table.classList.contains("resnew") });
            }
          });
      }

      flat(): void {
        const array: JQuery<HTMLElement>[] = [];
        $(q_res_resnum).each((i, e) => {
          const span = $(e);
          const resnum = parseInt(span.text() || "0");
          const table = span.closest("table");
          if (table.hasClass("clone") || array[resnum] != null) {
            table.remove();
          } else {
            array[resnum] = table;
          }
        });
        $(q_maxres).after(array);
        $("#resnew").remove();
      }
    }

    class AutoScroller {
      _timer: number;
      dx: number;
      dy: number;
      tm: number;
      _pause: boolean;
      _status?: JQuery<HTMLElement>;
      _toast?: number;

      constructor() {
        this._timer = 0;
        this.dx = 0;
        this.dy = 8;
        this.tm = 200;
        this._pause = false;
      }

      start(): void {
        if (this._timer > 0) {
          return;
        }
        this._pause = false;
        this._timer = setTimeout(() => this.onTimer(), this.tm);
      }

      onTimer(): void {
        if (!this._pause) {
          scrollBy({ left: this.dx, top: this.dy, behavior: "smooth" });
        }
        this._timer = setTimeout(() => this.onTimer(), this.tm);
      }

      stop(): void {
        clearTimeout(this._timer);
        this._pause = false;
        this._timer = 0;
      }

      pause(): void {
        this._pause = true;
      }

      resume(): void {
        this._pause = false;
      }

      status(text?: string, sticky?: boolean): JQuery<HTMLElement> {
        if (!this._status) {
          this._status = $('<div id="auto-scroll-status">');
        }
        clearTimeout(this._toast);
        if (text != null) {
          this._status.text(text).stop(true, false).fadeIn(0);
          if (!sticky) {
            this._toast = setTimeout(() => {
              if (this._status) this._status.fadeOut(2000);
            }, 3000);
          }
        } else {
          this._status.hide();
        }
        return this._status;
      }

      get paused(): boolean {
        return this._pause;
      }

      get running(): boolean {
        return this._timer > 0;
      }
    }

    class Command {
      gallery: Gallery;
      treeview: TreeView;

      constructor(gallery: Gallery, treeview: TreeView) {
        this.gallery = gallery;
        this.treeview = treeview;
      }

      buttons(): JQuery<HTMLElement> {
        return $('<a class="cornar-first" id="gallery-button">画像一覧</a>')
          .on("click", (e) => this.toggleGallery(e))
          .add($("<a>画像</a>").on("click", (e) => this.filterImages(e)))
          .add($("<a>新着</a>").on("click", (e) => this.filterResNew(e)))
          .add($('<a class="cornar-last">ツリー表示</a>').on("click", (e) => this.toggleTreeView(e)));
      }

      toggleButton(e: JQuery.TriggeredEvent): boolean {
        e.preventDefault();
        return $(e.target).toggleClass("enable").hasClass("enable");
      }

      toggleGallery(e: JQuery.TriggeredEvent): void {
        if (this.toggleButton(e)) {
          this.gallery.create();
        } else {
          this.gallery.destroy();
        }
      }

      filterImages(e: JQuery.TriggeredEvent): void {
        if (this.toggleButton(e)) {
          $("body").addClass("filter-images");
        } else {
          $("body").removeClass("filter-images");
        }
      }

      filterResNew(e: JQuery.TriggeredEvent): void {
        if (this.toggleButton(e)) {
          $("body").addClass("filter-resnew");
        } else {
          $("body").removeClass("filter-resnew");
        }
      }

      toggleTreeView(e: JQuery.TriggeredEvent): void {
        if (this.toggleButton(e)) {
          this.treeview.make();
        } else {
          this.treeview.flat();
        }
      }
    }

    type UpdateParam = { preserve: boolean };

    class Updater {
      _key: string;

      constructor(key: string) {
        this._key = key;
      }

      onTimer(retry: number, param?: UpdateParam): void {
        const cat = loadCatalog();
        const key = this._key;
        const res = $(q_res_resnum);
        const resnew = res.filter((i, e) => {
          const resnum = parseInt(e.textContent ?? "0");
          const res = $(e).closest("table");
          if (resnum > cat[key].readres) {
            res.addClass("resnew");
            return true;
          } else {
            res.removeClass("resnew");
            return false;
          }
        });
        if (resnew.length > 0 && !param?.preserve) {
          cat[key].res = res.length;
          cat[key].readres = res.length;
          const newcat = loadCatalog();
          newcat[key] = cat[key];
          saveCatalog(newcat, "1");
        } else if (retry > 0) {
          setTimeout((retry: number, param?: UpdateParam) => this.onTimer(retry, param), 100, retry - 1, param);
        }
      }

      watch(): void {
        $(q_contres).on("click", (e, param) => {
          setTimeout((retry: number, param?: UpdateParam) => this.onTimer(retry, param), 100, 10, param);
        });
      }

      update(param?: UpdateParam): void {
        $(q_contres).trigger("click", param);
      }
    }

    class ResMode {
      key: string;
      updater: Updater;
      autoScr: AutoScroller;

      constructor(key: string) {
        const cat = loadCatalog();
        const res = $(q_res).closest("table");
        if (cat[key] != null) {
          cat[key].res = res.length;
          cat[key].updateTime = Date.now();
        } else {
          cat[key] = {
            href: location.href.replace(/^https?:\/\/\w+\.2chan.net\/b\//, ""),
            res: res.length,
            readres: 0,
            title: document.title.replace(/ - ..*$/, ""),
            updateTime: Date.now(),
            offset: 0,
          };
        }
        // render marker
        res.removeClass("resnew");
        if (cat[key].readres >= 0) {
          res.slice(cat[key].readres).addClass("resnew");
        } else {
          res.addClass("resnew");
        }
        $(q_res_images).closest("table").addClass("resimg");
        // update readres
        cat[key].readres = res.length;
        // preserve pos
        if (cat[key].offset > 0) {
          window.scrollTo(0, cat[key].offset + window.innerHeight * 0.8);
        }
        saveCatalog(cat, "1");
        this.key = key;
        // install components
        this.updater = new Updater(key);
        this.updater.watch();
        this.autoScr = new AutoScroller();
        const select = new AutoUpdateSelection(
          this,
          ["OFF", 0],
          ["SCR", 0], // auto-scroll, no auto-update
          ["15s", 15],
          ["30s", 30],
          ["1min", 60]
        );
        const gallery = new Gallery();
        const treeview = new TreeView();
        const command = new Command(gallery, treeview);
        $("body").append(this.autoScr.status());
        $("body").append($('<div id="commands">').append(command.buttons(), " ", select.get()));
        $(window).on("keydown", (e) => this.onHotkey(e));
        $(window).on("unload", () => this.onUnload());
        $(q_thre).on("mouseover", (e) => this.onPlayVideo(e));
        $(q_thre).on("mouseout", (e) => this.onCloseVideo(e));
        $(q_thre).on("click", (e, suppress?) => this.onClick(e, suppress));
      }

      seek(resnum: number): void {
        const res = $(q_res);
        document.body.scrollTo(0, res.eq(resnum).offset()?.top ?? 0);
      }

      onClick(e: JQuery.TriggeredEvent, suppress?: boolean): void {
        if (!suppress && e.target.tagName === "IMG" && e.target.parentElement.tagName === "A") {
          const imageViewer = new ImageViewer();
          imageViewer.show(e.target.parentElement);
          e.preventDefault();
          e.stopPropagation();
        }
      }

      onHotkey(e: JQuery.TriggeredEvent): void {
        if (document.activeElement?.tagName === "INPUT") {
          return;
        }
        const autoScr = this.autoScr;
        if (e.key === "a" && this.autoScr.tm / 2 >= 100) {
          autoScr.tm /= 2;
          autoScr.status(`scroll speed up: tm=${autoScr.tm} dy=${autoScr.dy} dy/tm=${(autoScr.dy / autoScr.tm) * 1000}`);
        } else if (e.key === "A" && autoScr.tm * 2 < 180000) {
          autoScr.tm *= 2;
          autoScr.status(`scroll speed down: tm=${autoScr.tm} dy=${autoScr.dy} dy/tm=${(autoScr.dy / autoScr.tm) * 1000}`);
        } else if (e.key === "v" && autoScr.dy * 2 < 10000) {
          autoScr.dy *= 2;
          autoScr.status(`scroll volume up: tm=${autoScr.tm} dy=${autoScr.dy} dy/tm=${(autoScr.dy / autoScr.tm) * 1000}`);
        } else if (e.key === "V" && autoScr.dy / 2 >= 1) {
          autoScr.dy /= 2;
          autoScr.status(`scroll volume down: tm=${autoScr.tm} dy=${autoScr.dy} dy/tm=${(autoScr.dy / autoScr.tm) * 1000}`);
        } else if (e.key === "S" && autoScr.running) {
          if (!autoScr.paused) {
            autoScr.pause();
            autoScr.status("auto-scroll paused", true);
          } else {
            autoScr.resume();
            autoScr.status("auto-scroll started");
          }
        } else if (e.key === "s") {
          this.updater.update();
        }
      }

      onUnload(): void {
        const newcat = loadCatalog();
        newcat[this.key].offset = scrollY;
        saveCatalog(newcat, "1");
      }

      onUpdate(): void {
        this.updater.update({ preserve: true });
      }

      onSelect(text: string, value: number): void {
        console.log("auto-scroll", text, value);
        if (text === "OFF") {
          this.autoScr.stop();
          this.autoScr.status("auto-scroll stopped");
        } else {
          this.autoScr.start();
          this.autoScr.status("auto-scroll started");
        }
      }

      onPlayVideo(e: JQuery.TriggeredEvent): void {
        if (e.target.tagName === "IMG" && e.target.parentElement?.tagName === "A") {
          const img = $(e.target);
          const src = img.attr("src");
          const href = img.parent().attr("href");
          if (src == null || href == null) {
            return;
          }
          const ext = href.split(".").slice(-1)[0].toLowerCase();
          if (ext === "mp4" || ext === "webm") {
            img.trigger("click", true);
            e.stopPropagation();
          } else if (ext === "gif") {
            img.data("thumb", src).attr("src", href);
            e.stopPropagation();
          }
        }
      }

      onCloseVideo(e: JQuery.TriggeredEvent): void {
        if (e.target.tagName === "DIV" || e.target.tagName === "TD") {
          const video = $("video.extendWebm", e.target);
          if (video.length > 0) {
            video.next().trigger("click");
            e.stopPropagation();
          }
        } else if (e.target.tagName === "IMG") {
          const thumb = $(e.target).data("thumb");
          if (thumb != null) {
            $(e.target).attr("src", thumb).removeData("thumb");
            e.stopPropagation();
          }
        }
      }
    }

    if ($(q_thre).length === 0) {
      return; // thread is dead
    }
    const key = getKey(domain, location.href);
    if (key == null) {
      return;
    }
    new ResMode(key);
  };

  GM_registerMenuCommand("履歴削除", () => {
    GM_deleteValue("cat");
    GM_deleteValue("update");
  });

  function main(): void {
    const mo = /^https?:\/\/(\w+)\./.exec(location.href);
    const domain: string = mo == null ? "" : mo[1];

    if (/futaba\.php\?mode=cat/.test(location.href)) {
      onCatMode(domain);
    } else {
      onResMode(domain);
    }
  }

  main();
})();
