// ==UserScript==
// @name         Futaba
// @namespace    https://github.com/kataoka271
// @version      0.0.1
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
  type Catalog = { [key: string]: CatalogItem };

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

    class PickupTable {
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
        const href = $("a", this).attr("href");
        if (href == null) {
          return;
        }
        const key = getKey(domain, href);
        if (key == null) {
          return;
        }
        const item = {
          href: href,
          res: parseInt($("font", this).text()),
          readres: cat[key]?.readres ?? -1,
          title: $("small", this).text(),
          updateTime: Date.now(),
          offset: cat[key]?.offset ?? 0,
        };
        cat[key] = item;
        let elem = $("span.resnum", this).first();
        if (elem.length === 0) {
          elem = $('<span class="resnum">');
          $("font", this).after(elem);
        }
        $(this).removeClass("resup resdown reseq thrnew");
        if (oldcat[key] != null) {
          if (oldcat[key].readres >= 0) {
            const resDiff = item.res - oldcat[key].readres;
            if (resDiff > 0) {
              elem.text("+" + resDiff);
              $(this).addClass("resup");
            } else if (resDiff < 0) {
              elem.text(resDiff);
              $(this).addClass("resdown");
            } else {
              elem.text("");
              $(this).addClass("reseq");
            }
          } else {
            // No update
            elem.text("");
          }
        } else {
          // NEW
          elem.text("");
          $(this).addClass("thrnew");
        }
      });
      return cat;
    };

    class IncrementalFinder {
      _inputTime: number;
      _inputTimeout: number = 100;
      _timer: { set: boolean; id?: number };
      _pickup: PickupTable;

      constructor(pickup: PickupTable) {
        this._inputTime = Date.now();
        this._pickup = pickup;
        this._timer = { set: false };
      }

      execute(value: string, cat: Catalog) {
        if (this._timer.set) {
          clearTimeout(this._timer.id);
          this._timer.set = false;
        }
        if (Date.now() - this._inputTime > this._inputTimeout) {
          this._pickup.clear();
          if (value) {
            this._pickup.append(findItemsText(value));
          } else {
            this._pickup.append(findItemsHist(cat));
          }
        } else {
          this._timer.id = setTimeout(this.execute, this._inputTimeout, value, cat);
          this._timer.set = true;
        }
        this._inputTime = Date.now();
      }
    }

    const initialize = () => {
      let oldcat: Catalog = loadCatalog();
      let cat: Catalog = {};
      const pickup = new PickupTable();
      const finder = new IncrementalFinder(pickup);
      const input = $('<input type="search" placeholder="Search ...">').on("input", function () {
        if (!(this instanceof HTMLInputElement)) {
          return;
        }
        finder.execute(this.value, cat);
      });

      $("table#cattable")
        .before($("<p>"))
        .before($('<div style="text-align:center">').append(input))
        .before($("<p>"))
        .before(pickup.table())
        .before($("<p>"));

      cat = makeupTable(oldcat);
      pickup.clear();
      pickup.append(findItemsHist(cat));

      $(window).on("unload", () => {
        saveCatalog(cat);
      });

      $(window).on("keydown", (e) => {
        if (e.key === "r") {
          $("table#cattable").load(location.href + " #cattable > tbody", () => {
            saveCatalog(cat);
            oldcat = cat;
            cat = makeupTable(oldcat);
            pickup.clear();
            pickup.append(findItemsHist(cat));
          });
        }
      });

      setInterval(() => {
        if (readUpdate() === "1") {
          oldcat = loadCatalog();
          cat = makeupTable(oldcat);
          pickup.clear();
          pickup.append(findItemsHist(cat));
        }
      }, 2000);
    };

    initialize();
  }

  const onResMode = (domain: string) => {
    GM_addStyle(`\
.rtd.resnew { background-color: #FCE0D6; }
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
      cat[key].offset = 0;
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
    if (cat[key].readres > 0) {
      res.slice(cat[key].readres).addClass("resnew");
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
  };

  const mo = /^https?:\/\/(\w+)\./.exec(location.href);
  const domain: string = mo == null ? "" : mo[1];

  if (/futaba\.php\?mode=cat/.test(location.href)) {
    onCatMode(domain);
  } else {
    onResMode(domain);
  }
})();
