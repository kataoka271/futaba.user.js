// ==UserScript==
// @name         Futaba
// @namespace    https://github.com/kataoka271
// @version      0.0.13
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

  const readUpdate = (): string => {
    const update = GM_getValue("update", "0");
    GM_setValue("update", "0");
    return update;
  };

  const timeFormat = (date: Date): string => {
    const year = date.getFullYear().toString();
    const month = date.getMonth().toString().padStart(2, "0");
    const day = date.getDay().toString().padStart(2, "0");
    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    return year + "/" + month + "/" + day + " " + hours + ":" + minutes + ":" + seconds;
  };

  type AutoUpdateEventHandler = { onUpdate?: (interval: number) => void; onSelect?: (option: [string, number]) => void };

  const autoUpdateInput = (handler: AutoUpdateEventHandler, ...options: [string, number][]) => {
    let timer: number;
    const onTimer = (first: boolean) => {
      const value = $("#auto-update-interval").val();
      clearTimeout(timer);
      if (typeof value === "string") {
        const interval = parseInt(value) * 1000;
        if (interval > 0) {
          timer = setTimeout(onTimer, interval);
          if (!first) {
            if (handler.onUpdate) {
              handler.onUpdate(interval);
            }
            console.log("auto-update", timeFormat(new Date()));
          }
        }
      } else {
        $("#auto-update-interval").val(0);
      }
    };
    const choice = $("<select id='auto-update-interval'>");
    for (const [name, value] of options) {
      choice.append($("<option>").val(value).text(name));
    }
    choice.on("input", function () {
      onTimer(true);
      if (handler.onSelect) {
        const value = $(this).val();
        if (typeof value === "string") {
          handler.onSelect([$("option:checked", this).text(), parseInt(value)]);
        }
      }
    });
    return $("<div>").css("display", "inline-block").append(choice);
  };

  GM_registerMenuCommand("履歴削除", () => {
    GM_deleteValue("cat");
    GM_deleteValue("update");
  });

  const onCatMode = (domain: string) => {
    GM_addStyle(`\
@@include("Futaba-cat.user.css")
`);

    function normalize(text: string): string {
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
      const text2 = normalize(text);
      return $("table#cattable td").filter((i, e) => {
        if (!e.textContent) {
          return false;
        }
        return normalize(e.textContent).includes(text2);
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
      const href = $("a", td).attr("href");
      if (href == null) {
        return;
      }
      const key = getKey(domain, href);
      if (key == null) {
        return;
      }
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
      _count: number;

      constructor() {
        this._table = $('<table border="1" align="center">').css("display", "none");
        this._tbody = $("<tbody>").appendTo(this._table);
        this._tr = $("<tr>").appendTo(this._tbody);
        this._count = 0;
      }

      append(elems: JQuery<HTMLElement>) {
        elems.each((i, e) => {
          if (this._count === 0) {
            this._table.css("display", "");
          }
          this._count += 1;
          if (this._count % 8 === 0) {
            this._tr = $("<tr>").appendTo(this._tbody);
          }
          this._tr.append($(e).clone(true));
        });
      }

      clear() {
        this._table.css("display", "none");
        this._tbody.empty();
        this._tr = $("<tr>").appendTo(this._tbody);
        this._count = 0;
      }

      table(): JQuery<HTMLElement> {
        return this._table;
      }

      count(): number {
        return this._count;
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
        const keyword = this._finder.val();
        if (typeof keyword === "string" && keyword !== "") {
          this._result.append(findItemsText(keyword));
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
      const finder = $('<input type="search" placeholder="Search...">').css("vertical-align", "middle");
      const button = $("<input type='button' value='更新'>").on("click", () => {
        table.reload();
      });
      const result = new FindResult();
      const table = new CatTable(finder, result);
      const select = autoUpdateInput({ onUpdate: () => table.reload(false) }, ["OFF", 0], ["30sec", 30], ["1min", 60], ["3min", 180]);

      $("table#cattable").before(
        $("<p>"),
        $('<div style="text-align:center">').append(finder, " ", button, " ", select),
        $("<p>"),
        result.table(),
        $("<p>")
      );

      table.update();

      $(window).on("unload", () => {
        table.save();
      });

      $(window).on("keydown", (e) => {
        if (document.activeElement?.tagName === "INPUT") {
          return;
        }
        if (e.key === "r") {
          table.reload();
        }
      });

      setInterval(() => {
        if (readUpdate() === "1") {
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

    const toggleButton = (e: JQuery.TriggeredEvent) => {
      e.preventDefault();
      return $(e.target).toggleClass("enable").is(".enable");
    };

    const ancestor = (td: JQuery<HTMLElement>): JQuery<HTMLElement> => {
      return td.parent().parent().parent();
    };

    const galleryCreate = () => {
      const img = $("div.thre > table > tbody > tr > td.rtd a > img:visible");
      if (img.length === 0) {
        return;
      }
      $("body")
        .css("overflow-y", "hidden")
        .append(
          $("<div id='gallery'>")
            .append(img.parent().clone())
            .on("dblclick", (e) => {
              if (e.target.tagName === "DIV") {
                galleryDestroy();
              }
            })
        )
        .on("keydown", (e) => {
          if (e.key === "Escape" || e.key === "Esc") {
            galleryDestroy();
          }
        });
    };

    const galleryDestroy = () => {
      $("#gallery-button").removeClass("enable");
      $("#gallery").remove();
      $("body").css("overflow-y", "auto");
    };

    const makeTreeView = () => {
      let quoteList: { q: string; e: HTMLElement }[] = [];
      const res = $("div.thre > table");
      for (let i = res.length - 1; i >= 0; i--) {
        const table = res[i];
        const td = $("td.rtd", table).first();
        const text = $("blockquote, a, span", td)
          .contents()
          .filter((i, e) => {
            return e.nodeType === 3 && e instanceof Text && e.data !== "";
          })
          .text();
        const quote = $("blockquote > font", td).last();
        quoteList = quoteList.filter((item) => {
          if (!text.includes(item.q)) {
            return true;
          } else {
            td.append(item.e);
            return false;
          }
        });
        if (quote.length > 0) {
          const mo = />([^>]+)$/.exec(quote.text());
          if (mo != null) {
            quoteList.unshift({ q: mo[1], e: table }); // remove ">" appeared at the first of quote string
          }
        }
      }
    };

    const makeFlatView = () => {
      const array: HTMLElement[] = [];
      $("div.thre > table td.rtd > span:first-child").each((i, span) => {
        const table = span.parentNode?.parentNode?.parentNode?.parentNode;
        if (table != null && table instanceof HTMLElement && span.textContent != null) {
          array[parseInt(span.textContent)] = table;
        }
      });
      $("div.thre > span.maxres").after(array);
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
                ancestor(res.filter((i, e) => !$(e).is(".resnew"))).css("display", "none");
              } else {
                const res = $("div.thre > table > tbody > tr > td.rtd");
                ancestor(res.filter((i, e) => !$(e).is(".resnew"))).css("display", "");
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
          autoUpdateInput(
            {
              onUpdate: () => $("#contres > a").trigger("click"),
              onSelect: (option) => {
                console.log("auto-update:", option);
                if (option[0] === "OFF") {
                  autoScr.stop();
                  autoScr.status();
                } else {
                  autoScr.start();
                  autoScr.status("auto-scroll started");
                }
              },
            },
            ["OFF", 0],
            ["Auto", 0],
            ["15sec", 15],
            ["30sec", 30],
            ["1min", 60]
          )
        )
      );
    };

    const watchUpdate = (cat: Catalog, key: string) => {
      const observer = new MutationObserver((mutationsList, observer) => {
        const added: HTMLElement[] = [];
        for (const mutation of mutationsList) {
          if (mutation.type === "childList") {
            mutation.addedNodes.forEach((e) => {
              if (e instanceof HTMLTableElement) {
                added.push(e);
              }
            });
          }
        }
        if (added.length > 0) {
          console.log(added.length + " res is added");
          const res = $("div.thre table > tbody > tr > td.rtd");
          res.removeClass("resnew");
          $(added).find("tbody > tr > td.rtd").addClass("resnew");
          cat[key].res = res.length;
          cat[key].readres = res.length;
          const newcat: Catalog = loadCatalog();
          newcat[key] = cat[key];
          saveCatalog(newcat, "1");
        }
      });
      observer.observe($("div.thre").get(0), { childList: true });
    };

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
        } else if (e.key === "s" && autoScr.running) {
          if (!autoScr.paused) {
            autoScr.pause();
            autoScr.status("auto-scroll paused", true);
          } else {
            autoScr.resume();
            autoScr.status("auto-scroll started");
          }
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

      const autoScr = new AutoScroller();

      $("body").append(autoScr.status());
      addCommands(autoScr);
      addHotkeys(autoScr);
      watchUpdate(cat, key);
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
