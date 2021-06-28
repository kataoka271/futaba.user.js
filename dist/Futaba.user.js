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
        const makeupTable = (oldcat) => {
            const expireTime = 259200000; // 3days
            const now = Date.now();
            const cat = {};
            for (const key in oldcat) {
                const item = oldcat[key];
                if (now - item.updateTime < expireTime) {
                    cat[key] = item;
                }
            }
            $("table#cattable td").each(function () {
                var _a, _b, _c, _d;
                const href = $("a", this).attr("href");
                if (href == null) {
                    return;
                }
                const key = getKey(domain, href);
                if (key == null) {
                    return;
                }
                cat[key] = {
                    href: href,
                    res: parseInt($("font", this).text()),
                    readres: (_b = (_a = cat[key]) === null || _a === void 0 ? void 0 : _a.readres) !== null && _b !== void 0 ? _b : -1,
                    title: $("small", this).text(),
                    updateTime: Date.now(),
                    offset: (_d = (_c = cat[key]) === null || _c === void 0 ? void 0 : _c.offset) !== null && _d !== void 0 ? _d : 0,
                };
                let resnum = $("span.resnum", this).first();
                if (resnum.length === 0) {
                    resnum = $('<span class="resnum">');
                    $("font", this).after(resnum);
                }
                $(this).removeClass("resup reseq thrnew");
                if (oldcat[key] != null) {
                    if (oldcat[key].readres >= 0) {
                        const resDiff = cat[key].res - oldcat[key].readres;
                        if (resDiff > 0) {
                            resnum.text("+" + resDiff);
                            $(this).addClass("resup");
                        }
                        else if (resDiff < 0) {
                            cat[key].res = oldcat[key].readres;
                            resnum.text("");
                            $(this).addClass("reseq");
                        }
                        else {
                            resnum.text("");
                            $(this).addClass("reseq");
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
                    $(this).addClass("thrnew");
                }
            });
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
                    this._timer.id = setTimeout(() => { this.execute(func); }, this._inputTimeout);
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
                this._cat = makeupTable(this._oldcat);
                this._result.clear();
                const keyword = this._input.val();
                if (typeof keyword === "string" && keyword !== "") {
                    this._result.append(findItemsText(keyword));
                }
                else {
                    this._result.append(findItemsHist(this._cat));
                }
            }
            save() {
                saveCatalog(this._cat);
            }
        }
        const initialize = () => {
            const input = $('<input type="search" placeholder="Search ...">');
            const result = new FindResult();
            const table = new CatTable(input, result);
            $("table#cattable")
                .before($("<p>"))
                .before($('<div style="text-align:center">').append(input))
                .before($("<p>"))
                .before(result.table())
                .before($("<p>"));
            table.update();
            $(window).on("unload", () => {
                table.save();
            });
            $(window).on("keydown", (e) => {
                if (e.key === "r") {
                    $("table#cattable").load(location.href + " #cattable > tbody", () => {
                        table.save();
                        table.update();
                    });
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
        const cat = loadCatalog();
        const res = $("div.thre > table > tbody > tr > td.rtd");
        if (cat[key] != null) {
            cat[key].res = res.length;
            cat[key].updateTime = Date.now();
            cat[key].offset = 0;
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
        if (cat[key].readres > 0) {
            res.slice(cat[key].readres).addClass("resnew");
        }
        cat[key].readres = res.length;
        window.scrollTo(0, cat[key].offset);
        $(window).on("scroll", () => {
            cat[key].offset = window.scrollY;
        });
        $(window).on("unload", () => {
            const newcat = loadCatalog();
            newcat[key] = cat[key];
            saveCatalog(newcat, "1");
        });
        saveCatalog(cat, "1");
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
