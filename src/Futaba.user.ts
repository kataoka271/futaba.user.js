// ==UserScript==
// @name         Futaba
// @namespace    https://github.com/kataoka271
// @version      0.0.2
// @description  Futaba
// @author       k_hir@hotmail.com
// @match        https://may.2chan.net/b/*
// @updateURL    https://github.com/kataoka271/userscripts/blob/master/dist/Futaba.user.js
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

  GM_registerMenuCommand("履歴削除", () => {
    GM_deleteValue("cat");
    GM_deleteValue("update");
  });

  const onCatMode = (domain: string) => {
    GM_addStyle(`\
.resnum { margin-left: 2px; font-size: 70%; }
td.resup .resnum { color: #F02020; }
td.resup { background-color: #FCE0D6; }
td.resdown .resnum { color: #2020F0; }
td.resdown { background-color: #CCCCCC; }
td.reseq { background-color: #CCCCCC; }
td.thrnew { background-color: #FCE0D6; }
`);

    const findItemsText = (text: string): JQuery<HTMLElement> => {
      return $("table#cattable td").filter((i, e) => {
        return e.textContent?.includes(text) ?? false;
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

    const updateCat = (td: HTMLElement, cat: Catalog, oldcat: Catalog) => {
      const href = $("a", td).attr("href");
      if (href == null) {
        return;
      }
      const key = getKey(domain, href);
      if (key == null) {
        return;
      }
      cat[key] = {
        href: href,
        res: parseInt($("font", td).text()),
        readres: cat[key]?.readres ?? -1,
        title: $("small", td).text(),
        updateTime: Date.now(),
        offset: cat[key]?.offset ?? 0,
      };
      let resnum = $("span.resnum", td).first();
      if (resnum.length === 0) {
        resnum = $('<span class="resnum">');
        $("font", td).after(resnum);
      }
      $(td).removeClass("resup reseq thrnew");
      if (oldcat[key] != null) {
        if (oldcat[key].readres >= 0) {
          const resDiff = cat[key].res - oldcat[key].readres;
          if (resDiff > 0) {
            resnum.text("+" + resDiff);
            $(td).addClass("resup");
          } else if (resDiff < 0) {
            cat[key].res = oldcat[key].readres;
            resnum.text("");
            $(td).addClass("reseq");
          } else {
            resnum.text("");
            $(td).addClass("reseq");
          }
        } else {
          // No update
          resnum.text("");
        }
      } else {
        // NEW
        resnum.text("");
        $(td).addClass("thrnew");
      }
    };

    const makeupTable = (oldcat: Catalog): Catalog => {
      const expireTime = 259200000; // 3days
      const now = Date.now();
      const cat: Catalog = {};
      for (const key in oldcat) {
        const item = oldcat[key];
        if (now - item.updateTime < expireTime) {
          cat[key] = item;
        }
      }
      $("table#cattable td").each(function () {
        updateCat(this, cat, oldcat);
      });
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
    }

    class Protect {
      _inputTimeout: number;
      _inputTime: number;
      _timer: { set: boolean; id?: number };

      constructor(timeout: number) {
        this._inputTimeout = timeout;
        this._inputTime = Date.now();
        this._timer = { set: false };
      }

      execute(func: () => void) {
        if (this._timer.set) {
          clearTimeout(this._timer.id);
          this._timer.set = false;
        }
        if (Date.now() - this._inputTime > this._inputTimeout) {
          func();
        } else {
          this._timer.id = setTimeout(() => {
            this.execute(func);
          }, this._inputTimeout);
          this._timer.set = true;
        }
        this._inputTime = Date.now();
      }
    }

    class CatTable {
      _input: JQuery<HTMLElement>;
      _result: FindResult;
      _cat: Catalog;
      _oldcat: Catalog;
      _protect: Protect;

      constructor(input: JQuery<HTMLElement>, result: FindResult) {
        this._input = input;
        this._result = result;
        this._cat = {};
        this._oldcat = {};
        this._protect = new Protect(500);
        this._input.on("input", () => {
          this._protect.execute(() => {
            this.update();
          });
        });
      }

      update() {
        this._oldcat = loadCatalog();
        this._cat = makeupTable(this._oldcat);
        this._result.table().hide();
        this._result.clear();
        const keyword = this._input.val();
        if (typeof keyword === "string" && keyword !== "") {
          this._result.append(findItemsText(keyword));
        } else {
          this._result.append(findItemsHist(this._cat));
        }
        this._result.table().show();
      }

      save() {
        saveCatalog(this._cat);
      }

      reload() {
        $("table#cattable").load(location.href + " #cattable > tbody", () => {
          this.save();
          this.update();
        });
      }
    }

    const initialize = () => {
      const input = $('<input type="search" placeholder="Search ...">').css("vertical-align", "middle");
      const button = $("<input type='button' value='更新'>").on("click", () => {
        table.reload();
      });
      const result = new FindResult();
      const table = new CatTable(input, result);

      $("table#cattable")
        .before($("<p>"))
        .before($('<div style="text-align:center">').append(input).append(" ").append(button))
        .before($("<p>"))
        .before(result.table())
        .before($("<p>"));

      table.update();

      $(window).on("unload", () => {
        table.save();
      });

      $(window).on("keydown", (e) => {
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
.rtd.resnew {
  background-color: #FCE0D6;
}
.rtd.resnew > .rsc {
  font-weight: bold;
}
#commands {
  position: fixed;
  bottom: 10px;
  right: 10px;
}
#commands a {
  background-color: rgb(200, 200, 200);
  border: 2px outset rgb(200, 200, 200);
  color: rgb(100, 100, 100);
  font-size: 100%;
  padding: 0.2em 0.85em;
  cursor: pointer;
  display: inline-block;
}
#commands a:hover {
  color: rgb(200, 0, 0);
}
#commands a:first-child {
  border-radius: 5px / 20% 0 0 20%;
}
#commands a:last-child {
  border-radius: 5px / 0 20% 20% 0;
}
#commands a.enable {
  background-color: rgb(150, 150, 150);
  border-style: inset;
  color: rgb(200, 0, 0);
}
#commands a.enable:hover {
  color: rgb(100, 100, 100);
}
#gallery {
  position: fixed;
  background-color: rgba(0, 0, 0, 0.7);
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  overflow-y: scroll;
}
#gallery > a {
  display: inline-block;
}
#gallery > a > img {
  margin: 0;
  width: auto;
  height: 300px;
}
`);

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

    window.scrollTo(0, cat[key].offset);

    $(window).on("scroll", () => {
      cat[key].offset = window.scrollY;
    });

    $(window).on("unload", () => {
      const newcat: Catalog = loadCatalog();
      newcat[key] = cat[key];
      saveCatalog(newcat, "1");
    });

    saveCatalog(cat, "1");

    const hasImage = (td: HTMLElement): boolean => {
      return $("img", td).length > 0;
    };
    const ancestor = (td: JQuery<HTMLElement>): JQuery<HTMLElement> => {
      return td.parent().parent().parent();
    };

    $("body").append(
      $("<div id='commands'>").append(
        $("<a>")
          .text("画像一覧")
          .on("click", (e) => {
            e.preventDefault();
            const img = $("div.thre > table > tbody > tr > td.rtd a > img");
            const gallery = $("<div id='gallery'>").append(img.parent().clone());
            $("body").css("overflow-y", "hidden").append(gallery);
            gallery.on("click", (e) => {
              if (e.target.tagName === "DIV") {
                e.target.parentNode?.removeChild(e.target);
                $("body").css("overflow-y", "scroll");
              }
            });
            gallery.get(0).focus();
          }),
        $("<a>")
          .text("画像")
          .on("click", (e) => {
            e.preventDefault();
            if ($(e.target).toggleClass("enable").is(".enable")) {
              const res = $("div.thre > table > tbody > tr > td.rtd");
              ancestor(res.filter((i, e) => !hasImage(e))).css("display", "none");
            } else {
              const res = $("div.thre > table > tbody > tr > td.rtd");
              ancestor(res.filter((i, e) => !hasImage(e))).css("display", "");
            }
          }),
        $("<a>")
          .text("新着")
          .on("click", (e) => {
            e.preventDefault();
            if ($(e.target).toggleClass("enable").is(".enable")) {
              const res = $("div.thre > table > tbody > tr > td.rtd");
              ancestor(res.filter((i, e) => !$(e).hasClass("resnew"))).css("display", "none");
            } else {
              const res = $("div.thre > table > tbody > tr > td.rtd");
              ancestor(res.filter((i, e) => !$(e).hasClass("resnew"))).css("display", "");
            }
          }),
        $("<a>")
          .text("ツリー表示")
          .on("click", (e) => {
            e.preventDefault();
            if ($(e.target).toggleClass("enable").is(".enable")) {
              makeTreeView();
            } else {
              makeFlatView();
            }
          })
      )
    );

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
  };

  const mo = /^https?:\/\/(\w+)\./.exec(location.href);
  const domain: string = mo == null ? "" : mo[1];

  if (/futaba\.php\?mode=cat/.test(location.href)) {
    onCatMode(domain);
  } else {
    onResMode(domain);
  }
})();
