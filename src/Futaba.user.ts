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

  const getKey = (domain: string, href: string) => {
    const mo = /([0-9]+)\.htm$/.exec(href);
    if (mo != null) {
      return domain + "#" + mo[1];
    }
  };

  const loadCatalog = (): Catalog => {
    return JSON.parse(GM_getValue("cat", "{}"));
  };

  const saveCatalog = (cat: Catalog, update?: string) => {
    GM_setValue("cat", JSON.stringify(cat));
    GM_setValue("update", update ?? "0");
  };

  const readClearUpdateFlag = (): string => {
    const update = GM_getValue("update", "0");
    GM_setValue("update", "0");
    return update;
  };

  type AutoUpdateEventHandler = { onUpdate: () => void; onSelect: (text: string, value: number) => void };

  class AutoUpdateSelect {
    _timer: number;
    _handler: AutoUpdateEventHandler;
    _select: JQuery<HTMLElement>;

    constructor(handler: AutoUpdateEventHandler, ...options: [string, number][]) {
      this._timer = 0;
      this._handler = handler;
      this._select = $("<select id='auto-update-interval'>");
      for (const [name, value] of options) {
        this.addOption(name, value);
      }
      this._select.on("input", () => this.onInput());
    }

    get(): HTMLElement {
      return this._select.get(0);
    }

    addOption(name: string, value: number) {
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

    onInput() {
      clearTimeout(this._timer);
      const [text, value] = this.getOption();
      console.log("auto-update:", text, value);
      this._handler.onSelect(text, value);
      if (value <= 0) {
        return;
      }
      this._timer = setTimeout(() => this.onTimer(), value * 1000);
    }

    onTimer() {
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

  GM_registerMenuCommand("履歴削除", () => {
    GM_deleteValue("cat");
    GM_deleteValue("update");
  });

  const onCatMode = (domain: string) => {
    GM_addStyle(`\
@@include("Futaba-cat.user.css")
`);

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
      return $("table#cattable td").filter((i, e) => {
        if (!e.textContent) {
          return false;
        }
        return normalizeText(e.textContent).includes(text2);
      });
    };

    const findItemsHist = (cat: Catalog): JQuery<HTMLElement> => {
      return $("table#cattable td").filter((i, e) => {
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

    const updateCat = (cat: Catalog, td: HTMLElement, oldcat: Catalog) => {
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
        this._table = $('<table border="1" align="center">').css("display", "none");
        this._tbody = $("<tbody>").appendTo(this._table);
        this._tr = $("<tr>").appendTo(this._tbody);
        this._item_count = 0;
        this._column_count = column_count;
      }

      append(elems: JQuery<HTMLElement>) {
        elems.each((i, e) => {
          if (this._item_count === 0) {
            this._table.css("display", "");
          }
          this._item_count += 1;
          if (this._item_count % this._column_count === 0) {
            this._tr = $("<tr>").appendTo(this._tbody);
          }
          this._tr.append($(e).clone(true));
        });
      }

      clear() {
        this._table.css("display", "none");
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

      show() {
        this._table.show();
      }

      hide() {
        this._table.hide();
      }
    }

    class CatTable {
      _finder: JQuery<HTMLElement>;
      _result: FindResult;
      _cat: Catalog;
      _oldcat: Catalog;

      constructor(finder: JQuery<HTMLElement>, result: FindResult) {
        this._finder = finder;
        this._result = result;
        this._cat = {};
        this._oldcat = {};
        let timer: number;
        this._finder.on("input", () => {
          clearTimeout(timer);
          timer = setTimeout(() => this.update(), 500);
        });
      }

      update() {
        this._oldcat = loadCatalog();
        this._cat = filterNotExpiredItems(this._oldcat);
        $("table#cattable td").each((i, elem) => {
          updateCat(this._cat, elem, this._oldcat);
        });
        this._result.hide();
        this._result.clear();
        const value = this._finder.val();
        if (typeof value === "string" && value !== "") {
          this._result.append(findItemsText(value));
        } else {
          this._result.append(findItemsHist(this._cat));
        }
        if (this._result.count() > 0) {
          this._result.show();
        }
      }

      save() {
        saveCatalog(this._cat);
      }

      reload(save?: boolean) {
        $("table#cattable").load(location.href + " #cattable > tbody", () => {
          if (save == null || save) {
            this.save();
          }
          this.update();
        });
      }
    }

    const initialize = () => {
      const finder = $('<input type="search" placeholder="Search...">')
        .css("vertical-align", "middle")
        .on("focus", (e) => {
          if (e.target instanceof HTMLInputElement) {
            e.target.select();
          }
        });
      const button = $("<input type='button' value='更新'>").on("click", () => {
        table.reload();
      });
      const column_count = $("table#cattable tr:first-child td").length;
      const result = new FindResult(column_count);
      const table = new CatTable(finder, result);
      const select = new AutoUpdateSelect(
        {
          onUpdate: () => table.reload(false),
          onSelect: () => ({}),
        },
        ["OFF", 0],
        ["30sec", 30],
        ["1min", 60],
        ["3min", 180]
      );

      $("table#cattable").before($("<p>"), $('<div id="controller">').append(finder, " ", button, " ", select.get()), $("<p>"), result.get(), $("<p>"));

      table.update();

      $(window).on("unload", () => {
        table.save();
      });

      $(window).on("keydown", (e) => {
        if (document.activeElement?.tagName === "INPUT") {
          return;
        }
        if (e.key === "s") {
          table.reload();
        } else if (e.key === "/") {
          finder.trigger("focus");
        }
      });

      setInterval(() => {
        if (readClearUpdateFlag() === "1") {
          table.update();
        }
      }, 2000);
    };

    initialize();
  };

  const onResMode = (domain: string) => {
    GM_addStyle(`\
@@include("Futaba-res.user.css")
`);

    class ImageViewer {
      images: JQuery<HTMLAnchorElement>;
      index: number;

      constructor(anchors: JQuery<HTMLAnchorElement>) {
        this.images = anchors.map((i, e) => {
          const a = e.cloneNode(true) as HTMLAnchorElement;
          const img = a.querySelector<HTMLImageElement>("img");
          if (img == null) {
            return;
          }
          const ext = a.href.split(".").slice(-1)[0].toLowerCase();
          if (ext !== "mp4" && ext !== "webm") {
            img.src = a.href;
            img.removeAttribute("width");
            img.removeAttribute("height");
          }
          return a;
        });
        this.index = 0;
      }

      page(i: number) {
        if (0 <= i && i < this.images.length) {
          $("#image-view > .image-slider").css("transform", `translate(calc(-100% * ${i}))`);
          $("#image-view > .image-number").text(`${i + 1}/${this.images.length}`);
        } else {
          console.error("illegal page number", i);
        }
      }

      next() {
        if (this.index < this.images.length - 1) {
          this.index++;
          this.page(this.index);
        }
      }

      prev() {
        if (0 < this.index) {
          this.index--;
          this.page(this.index);
        }
      }

      show(image: HTMLAnchorElement) {
        const slider = $('<div class="image-slider">')
          .on("dblclick", (e) => {
            this.destroy();
            e.stopPropagation();
            e.preventDefault();
          })
          .append(this.images);
        const number = $('<div class="image-number">');
        const viewer = $('<div id="image-view">')
          .on("keydown", (e) => {
            if (e.key === "ArrowLeft") {
              this.prev();
            } else if (e.key === "ArrowRight") {
              this.next();
            } else if (e.key === "Escape") {
              this.destroy();
            }
            e.stopPropagation();
            e.preventDefault();
          })
          .on("dblclick", (e) => {
            this.destroy();
            e.stopPropagation();
            e.preventDefault();
          })
          .on("click", (e) => {
            if (e.offsetX < e.target.clientWidth / 4) {
              this.prev();
            } else if (e.offsetX > e.target.clientWidth * 3 / 4) {
              this.next();
            }
            e.stopPropagation();
            e.preventDefault();
          })
          .on("wheel", (e) => {
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
          })
          .append(slider)
          .append(number);
        $("#gallery").css("display", "none");
        $("body").append(viewer);
        this.images.each((i, e) => {
          if (e.href === image.href) {
            this.index = i;
            this.page(this.index);
          }
        });
      }

      destroy() {
        $("#gallery").css("display", "");
        $("div#image-view").remove();
      }
    }

    const toggleButton = (e: JQuery.TriggeredEvent) => {
      e.preventDefault();
      return $(e.target).toggleClass("enable").hasClass("enable");
    };

    const ancestor = (td: JQuery<HTMLElement>): JQuery<HTMLElement> => {
      return td.parent().parent().parent();
    };

    const galleryCreate = () => {
      const anchors = $<HTMLAnchorElement>("div.thre > table > tbody > tr > td.rtd a > img:visible").parent();
      if (anchors.length === 0) {
        return;
      }
      const imageViewer = new ImageViewer(anchors);
      const gallery = $("<div id='gallery' tabindex='0'>")
        .on("dblclick", (e) => {
          if (e.target.tagName === "DIV") {
            galleryDestroy();
            imageViewer.destroy();
            e.stopPropagation();
            e.preventDefault();
          }
        })
        .on("keydown", (e) => {
          if (e.key === "Escape" || e.key === "Esc") {
            galleryDestroy();
            e.stopPropagation();
            e.preventDefault();
          }
        })
        .on("click", (e) => {
          if (!(e.target instanceof HTMLImageElement)) {
            return;
          }
          if (!(e.target.parentElement instanceof HTMLAnchorElement)) {
            return;
          }
          imageViewer.show(e.target.parentElement);
          e.stopPropagation();
          e.preventDefault();
        });
      const quote = (anchor: JQuery<HTMLElement>): JQuery<HTMLElement> => {
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
      };
      const make = (index: number, anchor: HTMLAnchorElement): HTMLElement => {
        const a = $(anchor);
        const ext = anchor.href.split(".").slice(-1)[0].toLowerCase();
        if (ext === "mp4" || ext === "webm") {
          return $("<div>").addClass("movie").append(a.clone().attr("data-ext", ext), quote(a)).get(0);
        } else if (ext === "gif") {
          return $("<div>").addClass("anime").append(a.clone().attr("data-ext", ext), quote(a)).get(0);
        } else {
          return $("<div>").append(a.clone(), quote(a)).get(0);
        }
      };
      $("body").append(gallery.append(anchors.map(make)));
      $("#gallery").trigger("focus");
    };

    const galleryDestroy = () => {
      $("#gallery-button").removeClass("enable");
      $("#gallery").remove();
    };

    const makeTreeView = () => {
      let quoteList: { quot: string; elem: HTMLElement; resnew: boolean }[] = [];
      $("div.thre > table > tbody > tr > td.rtd:not(.resnew)").last().parent().parent().parent().after($("<span id='resnew'>"));
      $($("div.thre > table").get().reverse()).each((i, table) => {
        const td = $("td.rtd", table).first();
        const text = $("blockquote, a, span", td)
          .contents()
          .filter((i, e) => {
            return e.nodeType === Node.TEXT_NODE && e instanceof Text && e.data !== "";
          })
          .text();
        const quote = $("blockquote > font", td).last(); // should get quote before nodes are added
        let tdCloned: JQuery<HTMLElement> | null = null;
        quoteList = quoteList.filter((item) => {
          if (!text.includes(item.quot)) {
            return true;
          } else {
            if (!td.hasClass("resnew") && item.resnew) {
              if (tdCloned == null) {
                tdCloned = $("td.rtd", $(table).clone(true).insertAfter("span#resnew").addClass("cloned")).first();
              }
              tdCloned.children("blockquote").first().after(item.elem);
            } else {
              td.children("blockquote").first().after(item.elem);
            }
            return false;
          }
        });
        if (quote.length > 0) {
          const mo = />([^>]+)$/.exec(quote.text());
          if (mo != null) {
            quoteList.push({ quot: mo[1], elem: table, resnew: td.hasClass("resnew") }); // remove ">" appeared at the first of quote string
          }
        }
      });
    };

    const makeFlatView = () => {
      const array: JQuery<HTMLElement>[] = [];
      $("div.thre table > tbody > tr > td.rtd > span:first-child").each((i, e) => {
        const span = $(e);
        const resnum = parseInt(span.text() || "0");
        const table = span.parent().parent().parent().parent();
        if (table.hasClass("cloned") || array[resnum] != null) {
          table.remove();
        } else {
          array[resnum] = table;
        }
      });
      $("div.thre > span.maxres").after(array);
      $("span#resnew").remove();
    };

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

      start() {
        if (this._timer > 0) {
          return;
        }
        this._pause = false;
        this._timer = setTimeout(() => this.onTimer(), this.tm);
      }

      onTimer() {
        if (!this._pause) {
          scrollBy({ left: this.dx, top: this.dy, behavior: "smooth" });
        }
        this._timer = setTimeout(() => this.onTimer(), this.tm);
      }

      stop() {
        clearTimeout(this._timer);
        this._pause = false;
        this._timer = 0;
      }

      pause() {
        this._pause = true;
      }

      resume() {
        this._pause = false;
      }

      status(text?: string, sticky?: boolean): JQuery<HTMLElement> {
        if (!this._status) {
          this._status = $("<div id='auto-scroll-status'>");
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

    const addCommands = (autoScr: AutoScroller) => {
      $("body").append(
        $("<div id='commands'>").append(
          $("<a class='cornar-first' id='gallery-button'>")
            .text("画像一覧")
            .on("click", (e) => {
              if (toggleButton(e)) {
                galleryCreate();
              } else {
                galleryDestroy();
              }
            }),
          $("<a>")
            .text("画像")
            .on("click", (e) => {
              if (toggleButton(e)) {
                const res = $("div.thre > table > tbody > tr > td.rtd");
                ancestor(res.filter((i, e) => $("img", e).length === 0)).css("display", "none");
              } else {
                const res = $("div.thre > table > tbody > tr > td.rtd");
                ancestor(res.filter((i, e) => $("img", e).length === 0)).css("display", "");
              }
            }),
          $("<a>")
            .text("新着")
            .on("click", (e) => {
              if (toggleButton(e)) {
                const res = $("div.thre > table > tbody > tr > td.rtd");
                ancestor(res.filter((i, e) => !$(e).hasClass("resnew"))).css("display", "none");
              } else {
                const res = $("div.thre > table > tbody > tr > td.rtd");
                ancestor(res.filter((i, e) => !$(e).hasClass("resnew"))).css("display", "");
              }
            }),
          $("<a class='cornar-last'>")
            .text("ツリー表示")
            .on("click", (e) => {
              if (toggleButton(e)) {
                makeTreeView();
              } else {
                makeFlatView();
              }
            }),
          " ",
          new AutoUpdateSelect(
            {
              onUpdate: () => $("#contres > a").trigger("click", { ignore: true }),
              onSelect: (text, value) => {
                console.log("auto-scroll", text, value);
                if (text === "OFF") {
                  autoScr.stop();
                  autoScr.status("auto-scroll stopped");
                } else {
                  autoScr.start();
                  autoScr.status("auto-scroll started");
                }
              },
            },
            ["OFF", 0],
            ["SCR", 0], // auto-scroll, no auto-update
            ["15s", 15],
            ["30s", 30],
            ["1min", 60]
          ).get()
        )
      );
    };

    type WatcherParam = { ignore: boolean };

    class Watcher {
      _cat: Catalog;
      _key: string;

      constructor(cat: Catalog, key: string) {
        this._cat = cat;
        this._key = key;
      }

      onTimer(retry: number, param?: WatcherParam) {
        const res = $("div.thre table > tbody > tr > td.rtd > span:first-child");
        const resnew = res.filter((i, e) => {
          const resnum = parseInt(e.textContent ?? "0");
          const res = $(e).parent();
          if (resnum > this._cat[this._key].readres) {
            res.addClass("resnew");
            return true;
          } else {
            res.removeClass("resnew");
            return false;
          }
        });
        if (resnew.length > 0 && !param?.ignore) {
          this._cat[this._key].res = res.length;
          this._cat[this._key].readres = res.length;
          const newcat: Catalog = loadCatalog();
          newcat[this._key] = this._cat[this._key];
          saveCatalog(newcat, "1");
        } else if (retry > 0) {
          setTimeout((retry: number, param?: WatcherParam) => this.onTimer(retry, param), 100, retry - 1, param);
        }
      }

      start() {
        $("#contres > a").on("click", (e, param) => {
          setTimeout((retry: number, param?: WatcherParam) => this.onTimer(retry, param), 100, 10, param);
        });
      }
    }

    const addHotkeys = (autoScr: AutoScroller) => {
      $(window).on("keydown", (e) => {
        if (document.activeElement?.tagName === "INPUT") {
          return;
        }
        if (e.key === "a" && autoScr.tm / 2 >= 100) {
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
          $("#contres > a").trigger("click");
        }
      });
    };

    const initialize = () => {
      const root = $("div.thre");
      if (root.length === 0) {
        return; // thread is dead
      }
      const key = getKey(domain, location.href);
      if (key == null) {
        return;
      }
      const cat: Catalog = loadCatalog();
      const res = $("div.thre > table > tbody > tr > td.rtd");

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

      res.removeClass("resnew");
      if (cat[key].readres >= 0) {
        res.slice(cat[key].readres).addClass("resnew");
      } else {
        res.addClass("resnew");
      }
      cat[key].readres = res.length;

      saveCatalog(cat, "1");

      if (cat[key].offset > 0) {
        window.scrollTo(0, cat[key].offset + window.innerHeight * 0.8);
      }

      $(window).on("scroll", () => {
        cat[key].offset = window.scrollY;
      });

      $(window).on("unload", () => {
        const newcat: Catalog = loadCatalog();
        newcat[key] = cat[key];
        saveCatalog(newcat, "1");
      });

      $("div.thre > a > img, div.thre > table > tbody > tr > td.rtd a > img").on("mouseenter", (e) => {
        const img = $(e.target);
        const src = img.attr("src");
        const href = img.parent().attr("href");
        if (src == null || href == null) {
          return;
        }
        const ext = href.split(".").slice(-1)[0].toLowerCase();
        if (ext === "mp4" || ext === "webm") {
          img.trigger("click");
        } else if (ext === "gif") {
          img.data("thumb", src).attr("src", href);
        }
      });
      $("div.thre").on("mouseout", (e) => {
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
      });

      const autoScr = new AutoScroller();

      $("body").append(autoScr.status());
      addCommands(autoScr);
      addHotkeys(autoScr);
      new Watcher(cat, key).start();
    };

    initialize();
  };

  const mo = /^https?:\/\/(\w+)\./.exec(location.href);
  const domain: string = mo == null ? "" : mo[1];

  if (/futaba\.php\?mode=cat/.test(location.href)) {
    onCatMode(domain);
  } else {
    onResMode(domain);
  }
})();
