// ==UserScript==
// @name         Futaba
// @namespace    https://github.com/kataoka271
// @version      0.0.3
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
    const getKey = (domain, href) => {
        const mo = /([0-9]+)\.htm$/.exec(href);
        if (mo != null) {
            return domain + "#" + mo[1];
        }
    };
    const loadCatalog = () => {
        return JSON.parse(GM_getValue("cat", "{}"));
    };
    const saveCatalog = (cat, update) => {
        GM_setValue("cat", JSON.stringify(cat));
        GM_setValue("update", update !== null && update !== void 0 ? update : "0");
    };
    const readUpdate = () => {
        const update = GM_getValue("update", "0");
        GM_setValue("update", "0");
        return update;
    };
    GM_registerMenuCommand("履歴削除", () => {
        GM_deleteValue("cat");
        GM_deleteValue("update");
    });
    const onCatMode = (domain) => {
        GM_addStyle(`\
.resnum { margin-left: 2px; font-size: 70%; }
td.resup .resnum { color: #F02020; }
td.resup { background-color: #FCE0D6; }
td.resdown .resnum { color: #2020F0; }
td.resdown { background-color: #CCCCCC; }
td.reseq { background-color: #CCCCCC; }
td.thrnew { background-color: #FCE0D6; }
`);
        const findItemsText = (text) => {
            return $("table#cattable td").filter((i, e) => {
                var _a, _b;
                return (_b = (_a = e.textContent) === null || _a === void 0 ? void 0 : _a.includes(text)) !== null && _b !== void 0 ? _b : false;
            });
        };
        const findItemsHist = (cat) => {
            return $("table#cattable td").filter((i, e) => {
                var _a, _b;
                const href = $("a", e).attr("href");
                if (href != null) {
                    const key = getKey(domain, href);
                    if (key != null) {
                        return ((_b = (_a = cat[key]) === null || _a === void 0 ? void 0 : _a.readres) !== null && _b !== void 0 ? _b : 0) >= 0;
                    }
                }
                return false;
            });
        };
        const updateCat = (cat, td, oldcat) => {
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
            }
            else {
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
            $(td).removeClass("resup reseq thrnew");
            if (oldcat[key] != null) {
                if (oldcat[key].readres >= 0) {
                    const resDiff = cat[key].res - oldcat[key].readres;
                    if (resDiff > 0) {
                        resnum.text("+" + resDiff);
                        $(td).addClass("resup");
                    }
                    else if (resDiff < 0) {
                        cat[key].res = oldcat[key].readres;
                        resnum.text("");
                        $("font", td).text(cat[key].res);
                        $(td).addClass("reseq");
                    }
                    else {
                        resnum.text("");
                        $(td).addClass("reseq");
                    }
                }
                else {
                    // No update
                    resnum.text("");
                }
            }
            else {
                // NEW
                resnum.text("");
                $(td).addClass("thrnew");
            }
        };
        const filterNotExpiredItems = (oldcat) => {
            const expireTime = 259200000; // 3days
            const now = Date.now();
            const cat = {};
            for (const key in oldcat) {
                const item = oldcat[key];
                if (now - item.updateTime < expireTime) {
                    cat[key] = item;
                }
            }
            return cat;
        };
        class FindResult {
            constructor() {
                this._table = $('<table border="1" align="center">').css("display", "none");
                this._tbody = $("<tbody>").appendTo(this._table);
                this._tr = $("<tr>").appendTo(this._tbody);
                this._count = 0;
            }
            append(elems) {
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
            table() {
                return this._table;
            }
            count() {
                return this._count;
            }
        }
        class Protect {
            constructor(timeout) {
                this._inputTimeout = timeout;
                this._inputTime = Date.now();
                this._timer = { set: false };
            }
            execute(func) {
                if (this._timer.set) {
                    clearTimeout(this._timer.id);
                    this._timer.set = false;
                }
                if (Date.now() - this._inputTime > this._inputTimeout) {
                    func();
                }
                else {
                    this._timer.id = setTimeout(() => {
                        this.execute(func);
                    }, this._inputTimeout);
                    this._timer.set = true;
                }
                this._inputTime = Date.now();
            }
        }
        class CatTable {
            constructor(input, result) {
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
                this._cat = filterNotExpiredItems(this._oldcat);
                $("table#cattable td").each((i, elem) => {
                    updateCat(this._cat, elem, this._oldcat);
                });
                this._result.table().hide();
                this._result.clear();
                const keyword = this._input.val();
                if (typeof keyword === "string" && keyword !== "") {
                    this._result.append(findItemsText(keyword));
                }
                else {
                    this._result.append(findItemsHist(this._cat));
                }
                if (this._result.count() > 0) {
                    this._result.table().show();
                }
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
            const input = $('<input type="search" placeholder="Search...">').css("vertical-align", "middle");
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
    const onResMode = (domain) => {
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
  z-index: 1000;
}
#commands a {
  background-color: rgb(200, 200, 200);
  border: 2px outset rgb(200, 200, 200);
  color: rgb(100, 100, 100);
  font-size: 90%;
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
  overflow-y: auto;
  text-align: center;
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
        const toggleButton = (e) => {
            e.preventDefault();
            return $(e.target).toggleClass("enable").is(".enable");
        };
        const ancestor = (td) => {
            return td.parent().parent().parent();
        };
        const galleryCreate = () => {
            const img = $("div.thre > table > tbody > tr > td.rtd a > img:visible");
            if (img.length === 0) {
                return;
            }
            $("body")
                .css("overflow-y", "hidden")
                .append($("<div id='gallery'>")
                .append(img.parent().clone())
                .on("click", (e) => {
                if (e.target.tagName === "DIV") {
                    galleryDestroy();
                }
            }))
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
            let quoteList = [];
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
                    }
                    else {
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
            const array = [];
            $("div.thre > table td.rtd > span:first-child").each((i, span) => {
                var _a, _b, _c;
                const table = (_c = (_b = (_a = span.parentNode) === null || _a === void 0 ? void 0 : _a.parentNode) === null || _b === void 0 ? void 0 : _b.parentNode) === null || _c === void 0 ? void 0 : _c.parentNode;
                if (table != null && table instanceof HTMLElement && span.textContent != null) {
                    array[parseInt(span.textContent)] = table;
                }
            });
            $("div.thre > span.maxres").after(array);
        };
        const makeCommands = () => {
            $("body").append($("<div id='commands'>").append($("<a id='gallery-button'>")
                .text("画像一覧")
                .on("click", (e) => {
                if (toggleButton(e)) {
                    galleryCreate();
                }
                else {
                    galleryDestroy();
                }
            }), $("<a>")
                .text("画像")
                .on("click", (e) => {
                if (toggleButton(e)) {
                    const res = $("div.thre > table > tbody > tr > td.rtd");
                    ancestor(res.filter((i, e) => $("img", e).length === 0)).css("display", "none");
                }
                else {
                    const res = $("div.thre > table > tbody > tr > td.rtd");
                    ancestor(res.filter((i, e) => $("img", e).length === 0)).css("display", "");
                }
            }), $("<a>")
                .text("新着")
                .on("click", (e) => {
                if (toggleButton(e)) {
                    const res = $("div.thre > table > tbody > tr > td.rtd");
                    ancestor(res.filter((i, e) => !$(e).is(".resnew"))).css("display", "none");
                }
                else {
                    const res = $("div.thre > table > tbody > tr > td.rtd");
                    ancestor(res.filter((i, e) => !$(e).is(".resnew"))).css("display", "");
                }
            }), $("<a>")
                .text("ツリー表示")
                .on("click", (e) => {
                if (toggleButton(e)) {
                    makeTreeView();
                }
                else {
                    makeFlatView();
                }
            })));
        };
        const getCurrentRes = () => {
            return parseInt($("div.thre table")
                .filter((i, e) => {
                const offset = $(e).offset();
                if (offset == null) {
                    return false;
                }
                return offset.top + e.clientHeight < window.scrollY + window.innerHeight;
            })
                .last()
                .find("tbody > tr > td.rtd > span:first-child")
                .text());
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
            const cat = loadCatalog();
            const res = $("div.thre > table > tbody > tr > td.rtd");
            if (cat[key] != null) {
                cat[key].res = res.length;
                cat[key].updateTime = Date.now();
            }
            else {
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
            }
            else {
                res.addClass("resnew");
            }
            cat[key].readres = res.length;
            saveCatalog(cat, "1");
            window.scrollTo(0, cat[key].offset);
            $(window).on("scroll", () => {
                cat[key].offset = window.scrollY;
            });
            $(window).on("unload", () => {
                const newcat = loadCatalog();
                newcat[key] = cat[key];
                saveCatalog(newcat, "1");
            });
            let timer = { set: false };
            const checkAndUpdate = (count) => {
                timer.set = false;
                const res = $("div.thre table > tbody > tr > td.rtd > span:first-child");
                if (res.length === cat[key].readres) {
                    if (count != null && count > 0) {
                        timer = { set: true, id: setTimeout(checkAndUpdate, 1000, count - 1) };
                    }
                    return;
                }
                res.parent().removeClass("resnew");
                res
                    .filter((i, e) => {
                    return e.textContent != null && parseInt(e.textContent) > cat[key].readres;
                })
                    .parent()
                    .addClass("resnew");
                cat[key].res = res.length;
                cat[key].readres = res.length;
                const newcat = loadCatalog();
                newcat[key] = cat[key];
                saveCatalog(newcat, "1");
            };
            $("#contres > a").on("click", () => {
                if (timer.set) {
                    return;
                }
                timer = { set: true, id: setTimeout(checkAndUpdate, 2000, 2) };
            });
            makeCommands();
        };
        initialize();
    };
    const mo = /^https?:\/\/(\w+)\./.exec(location.href);
    const domain = mo == null ? "" : mo[1];
    if (/futaba\.php\?mode=cat/.test(location.href)) {
        onCatMode(domain);
    }
    else {
        onResMode(domain);
    }
})();
