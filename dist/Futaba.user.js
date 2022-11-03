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
    const readClearUpdateFlag = () => {
        const update = GM_getValue("update", "0");
        GM_setValue("update", "0");
        return update;
    };
    class AutoUpdateSelect {
        constructor(handler, ...options) {
            this._timer = 0;
            this._handler = handler;
            this._select = $("<select id='auto-update-interval'>");
            for (const [name, value] of options) {
                this.addOption(name, value);
            }
            this._select.on("input", () => this.onInput());
        }
        get() {
            return this._select.get(0);
        }
        addOption(name, value) {
            this._select.append($("<option>").val(value).text(name));
        }
        getOption() {
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
            const [text, value] = this.getOption();
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
    const onCatMode = (domain) => {
        GM_addStyle(`\
.resnum {
  margin-left: 2px;
  font-size: 70%;
}
td.resup .resnum {
  color: #f02020;
}
td.resup {
  background-color: #fce0d6;
}
td.resdown .resnum {
  color: #2020f0;
}
td.resdown {
  background-color: #cccccc;
}
td.reseq {
  background-color: #cccccc;
}
td.thrnew {
  background-color: #fce0d6;
}
td.catup .resnum {
  color: #f02020;
}
#controller {
  text-align: center;
}
#controller > * {
  vertical-align: middle;
}
#controller > input[type="search"] {
  font-size: small;
}

`);
        function normalizeText(text) {
            // prettier-ignore
            const kanaMap = {
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
        const findItemsText = (text) => {
            const text2 = normalizeText(text);
            return $("table#cattable td").filter((i, e) => {
                if (!e.textContent) {
                    return false;
                }
                return normalizeText(e.textContent).includes(text2);
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
            resnum.empty();
            $(td).removeClass("resup reseq thrnew catup");
            if (oldcat[key] != null) {
                if (oldcat[key].readres >= 0) {
                    const resDiff = cat[key].res - oldcat[key].readres;
                    if (resDiff > 0) {
                        resnum.text("+" + resDiff);
                        $(td).addClass("resup");
                    }
                    else if (resDiff < 0) {
                        cat[key].res = oldcat[key].readres;
                        $("font", td).text(cat[key].res);
                        $(td).addClass("reseq");
                    }
                    else {
                        $(td).addClass("reseq");
                    }
                }
                else if (oldcat[key].res >= 0) {
                    const catDiff = cat[key].res - oldcat[key].res;
                    if (catDiff > 0) {
                        resnum.text("+" + catDiff);
                        $(td).addClass("catup");
                    }
                }
            }
            else {
                // NEW
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
            constructor(column_count = 8) {
                this._table = $('<table border="1" align="center">').css("display", "none");
                this._tbody = $("<tbody>").appendTo(this._table);
                this._tr = $("<tr>").appendTo(this._tbody);
                this._item_count = 0;
                this._column_count = column_count;
            }
            append(elems) {
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
            get() {
                return this._table;
            }
            count() {
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
            constructor(finder, result) {
                this._finder = finder;
                this._result = result;
                this._cat = {};
                this._oldcat = {};
                let timer;
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
                }
                else {
                    this._result.append(findItemsHist(this._cat));
                }
                if (this._result.count() > 0) {
                    this._result.show();
                }
            }
            save() {
                saveCatalog(this._cat);
            }
            reload(save) {
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
            const select = new AutoUpdateSelect({
                onUpdate: () => table.reload(false),
                onSelect: () => { },
            }, ["OFF", 0], ["30sec", 30], ["1min", 60], ["3min", 180]);
            $("table#cattable").before($("<p>"), $('<div id="controller">').append(finder, " ", button, " ", select.get()), $("<p>"), result.get(), $("<p>"));
            table.update();
            $(window).on("unload", () => {
                table.save();
            });
            $(window).on("keydown", (e) => {
                var _a;
                if (((_a = document.activeElement) === null || _a === void 0 ? void 0 : _a.tagName) === "INPUT") {
                    return;
                }
                if (e.key === "s") {
                    table.reload();
                }
                else if (e.key === "/") {
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
    const onResMode = (domain) => {
        GM_addStyle(`\
.rtd.resnew {
  background-color: #fce0d6;
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
#commands a.cornar-first {
  border-radius: 5px / 20% 0 0 20%;
}
#commands a.cornar-last {
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
  background-color: rgba(0, 0, 0, 0.9);
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  text-align: center;
  overflow-y: scroll;
}
#gallery > div {
  display: inline-block;
  vertical-align: top;
  color: rgb(100, 100, 100);
  font-size: 80%;
  background-color: rgb(20, 20, 20);
  width: 250px;
  height: calc(250px + 1.5em);
  margin: 1em;
}
#gallery > div > a {
  display: inline-block;
  width: 250px;
  height: 250px;
  position: relative;
}
#gallery > div > a > img {
  margin: 0;
  width: 250px;
  height: 250px;
  object-fit: contain;
  object-position: 50% 50%;
}
#auto-scroll-status {
  background-color: rgba(200, 200, 200, 0.8);
  color: rgb(100, 100, 100);
  font-size: 80%;
  position: fixed;
  bottom: 50px;
  right: 10px;
  z-index: 1000;
  display: inline-block;
  padding: 5px 10px;
  border-radius: 2px;
}
#auto-update-interval {
  display: inline-block;
}
#gallery > div.movie > div {
  z-index: 1000;
  position: absolute;
}
#gallery > div.movie > div > video {
  max-width: 250px !important;
  max-height: 250px !important;
  width: 250px;
  height: 250px;
}
#gallery > div.movie > a::before,
#gallery > div.anime > a::before {
  color: rgb(200, 200, 200);
  font-weight: bold;
  font-size: 9pt;
  content: attr(data-ext);
  position: absolute;
  right: 0;
  top: 0;
}
#gallery > div.movie > a {
  border: 2px solid rgb(150, 0, 0);
}
#gallery > div.movie > a::before {
  background-color: rgb(150, 0, 0);
}
#gallery > div.anime > a {
  border: 2px solid rgb(0, 80, 0);
}
#gallery > div.anime > a::before {
  background-color: rgb(0, 80, 0);
}

`);
        const toggleButton = (e) => {
            e.preventDefault();
            return $(e.target).toggleClass("enable").hasClass("enable");
        };
        const ancestor = (td) => {
            return td.parent().parent().parent();
        };
        const galleryCreate = () => {
            const images = $("div.thre > table > tbody > tr > td.rtd a > img:visible");
            if (images.length === 0) {
                return;
            }
            const gallery = $("<div id='gallery' tabindex='0'>")
                .on("dblclick", (e) => {
                if (e.target.tagName === "DIV") {
                    galleryDestroy();
                }
            })
                .on("keydown", (e) => {
                if (e.key === "Escape" || e.key === "Esc") {
                    galleryDestroy();
                }
            });
            const quote = (anchor) => {
                const text = $(anchor)
                    .next("blockquote")
                    .text()
                    .replace(/>[^\n]+\n?/, "");
                if (text === "ｷﾀ━━━(ﾟ∀ﾟ)━━━!!" || text.length === 0) {
                    return $();
                }
                else if (text.length > 10) {
                    return $("<span>")
                        .text(text.slice(0, 7) + "...")
                        .attr("title", text)
                        .before("<br>");
                }
                else {
                    return $("<span>").text(text).before("<br>");
                }
            };
            const make = (index, anchor) => {
                var _a;
                const ext = (_a = anchor.getAttribute("href")) === null || _a === void 0 ? void 0 : _a.split(".").slice(-1)[0].toLowerCase();
                if (ext === "mp4" || ext === "webm") {
                    return $("<div>").addClass("movie").append($(anchor).clone().attr("data-ext", ext), quote(anchor)).get(0);
                }
                else if (ext == "gif") {
                    return $("<div>").addClass("anime").append($(anchor).clone().attr("data-ext", ext), quote(anchor)).get(0);
                }
                else {
                    return $("<div>").append($(anchor).clone(), quote(anchor)).get(0);
                }
            };
            $("body").append(gallery.append(images.parent().map(make)));
            $("#gallery").trigger("focus");
        };
        const galleryDestroy = () => {
            $("#gallery-button").removeClass("enable");
            $("#gallery").remove();
        };
        const makeTreeView = () => {
            let quoteList = [];
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
                let tdCloned = null;
                quoteList = quoteList.filter((item) => {
                    if (!text.includes(item.quot)) {
                        return true;
                    }
                    else {
                        if (!td.hasClass("resnew") && item.resnew) {
                            if (tdCloned == null) {
                                tdCloned = $("td.rtd", $(table).clone(true).insertAfter("span#resnew").addClass("cloned")).first();
                            }
                            tdCloned.children("blockquote").first().after(item.elem);
                        }
                        else {
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
            const array = [];
            $("div.thre table > tbody > tr > td.rtd > span:first-child").each((i, e) => {
                const span = $(e);
                const resnum = parseInt(span.text() || "0");
                const table = span.parent().parent().parent().parent();
                if (table.hasClass("cloned") || array[resnum] != null) {
                    table.remove();
                }
                else {
                    array[resnum] = table;
                }
            });
            $("div.thre > span.maxres").after(array);
            $("span#resnew").remove();
        };
        class AutoScroller {
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
            status(text, sticky) {
                if (!this._status) {
                    this._status = $("<div id='auto-scroll-status'>");
                }
                clearTimeout(this._toast);
                if (text != null) {
                    this._status.text(text).stop(true, false).fadeIn(0);
                    if (!sticky) {
                        this._toast = setTimeout(() => {
                            if (this._status)
                                this._status.fadeOut(2000);
                        }, 3000);
                    }
                }
                else {
                    this._status.hide();
                }
                return this._status;
            }
            get paused() {
                return this._pause;
            }
            get running() {
                return this._timer > 0;
            }
        }
        const addCommands = (autoScr) => {
            $("body").append($("<div id='commands'>").append($("<a class='cornar-first' id='gallery-button'>")
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
                    ancestor(res.filter((i, e) => !$(e).hasClass("resnew"))).css("display", "none");
                }
                else {
                    const res = $("div.thre > table > tbody > tr > td.rtd");
                    ancestor(res.filter((i, e) => !$(e).hasClass("resnew"))).css("display", "");
                }
            }), $("<a class='cornar-last'>")
                .text("ツリー表示")
                .on("click", (e) => {
                if (toggleButton(e)) {
                    makeTreeView();
                }
                else {
                    makeFlatView();
                }
            }), " ", new AutoUpdateSelect({
                onUpdate: () => $("#contres > a").trigger("click", { ignore: true }),
                onSelect: (text, value) => {
                    console.log("auto-scroll", text, value);
                    if (text === "OFF") {
                        autoScr.stop();
                        autoScr.status("auto-scroll stopped");
                    }
                    else {
                        autoScr.start();
                        autoScr.status("auto-scroll started");
                    }
                },
            }, ["OFF", 0], ["SCR", 0], // auto-scroll, no auto-update
            ["15s", 15], ["30s", 30], ["1min", 60]).get()));
        };
        class Watcher {
            constructor(cat, key) {
                this._cat = cat;
                this._key = key;
            }
            onTimer(retry, param) {
                const res = $("div.thre table > tbody > tr > td.rtd > span:first-child");
                const resnew = res.filter((i, e) => {
                    var _a;
                    const resnum = parseInt((_a = e.textContent) !== null && _a !== void 0 ? _a : "0");
                    const res = $(e).parent();
                    if (resnum > this._cat[this._key].readres) {
                        res.addClass("resnew");
                        return true;
                    }
                    else {
                        res.removeClass("resnew");
                        return false;
                    }
                });
                if (resnew.length > 0 && !(param === null || param === void 0 ? void 0 : param.ignore)) {
                    this._cat[this._key].res = res.length;
                    this._cat[this._key].readres = res.length;
                    const newcat = loadCatalog();
                    newcat[this._key] = this._cat[this._key];
                    saveCatalog(newcat, "1");
                }
                else if (retry > 0) {
                    setTimeout((retry, param) => this.onTimer(retry, param), 100, retry - 1, param);
                }
            }
            start() {
                $("#contres > a").on("click", (e, param) => {
                    setTimeout((retry, param) => this.onTimer(retry, param), 100, 10, param);
                });
            }
        }
        const addHotkeys = (autoScr) => {
            $(window).on("keydown", (e) => {
                var _a;
                if (((_a = document.activeElement) === null || _a === void 0 ? void 0 : _a.tagName) === "INPUT") {
                    return;
                }
                if (e.key === "a" && autoScr.tm / 2 >= 100) {
                    autoScr.tm /= 2;
                    autoScr.status(`scroll speed up: tm=${autoScr.tm} dy=${autoScr.dy} dy/tm=${(autoScr.dy / autoScr.tm) * 1000}`);
                }
                else if (e.key === "A" && autoScr.tm * 2 < 180000) {
                    autoScr.tm *= 2;
                    autoScr.status(`scroll speed down: tm=${autoScr.tm} dy=${autoScr.dy} dy/tm=${(autoScr.dy / autoScr.tm) * 1000}`);
                }
                else if (e.key === "v" && autoScr.dy * 2 < 10000) {
                    autoScr.dy *= 2;
                    autoScr.status(`scroll volume up: tm=${autoScr.tm} dy=${autoScr.dy} dy/tm=${(autoScr.dy / autoScr.tm) * 1000}`);
                }
                else if (e.key === "V" && autoScr.dy / 2 >= 1) {
                    autoScr.dy /= 2;
                    autoScr.status(`scroll volume down: tm=${autoScr.tm} dy=${autoScr.dy} dy/tm=${(autoScr.dy / autoScr.tm) * 1000}`);
                }
                else if (e.key === "S" && autoScr.running) {
                    if (!autoScr.paused) {
                        autoScr.pause();
                        autoScr.status("auto-scroll paused", true);
                    }
                    else {
                        autoScr.resume();
                        autoScr.status("auto-scroll started");
                    }
                }
                else if (e.key == "s") {
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
            if (cat[key].offset > 0) {
                window.scrollTo(0, cat[key].offset + window.innerHeight * 0.8);
            }
            $(window).on("scroll", () => {
                cat[key].offset = window.scrollY;
            });
            $(window).on("unload", () => {
                const newcat = loadCatalog();
                newcat[key] = cat[key];
                saveCatalog(newcat, "1");
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
    const domain = mo == null ? "" : mo[1];
    if (/futaba\.php\?mode=cat/.test(location.href)) {
        onCatMode(domain);
    }
    else {
        onResMode(domain);
    }
})();
