// ==UserScript==
// @name         Futaba
// @namespace    https://github.com/kataoka271
// @version      0.0.18
// @description  Futaba
// @author       k_hir@hotmail.com
// @match        https://may.2chan.net/b/*
// @match        http://jun.2chan.net/jun/*
// @updateURL    https://github.com/kataoka271/futaba.user.js/raw/master/dist/Futaba.user.js
// @downloadURL  https://github.com/kataoka271/futaba.user.js/raw/master/dist/Futaba.user.js
// @require      http://ajax.googleapis.com/ajax/libs/jquery/3.6.0/jquery.min.js
// @grant        GM_setValue
// @grant        GM_getValue
// @grant        GM_addStyle
// @grant        GM_registerMenuCommand
// @grant        GM_deleteValue
// @grant        GM_download
// ==/UserScript==
(function () {
    function getKey(domain, href) {
        const mo = /([0-9]+)\.htm$/.exec(href);
        if (mo != null) {
            return domain + "#" + mo[1];
        }
    }
    function loadCatalog() {
        return JSON.parse(GM_getValue("cat", "{}"));
    }
    function saveCatalog(cat, update) {
        GM_setValue("cat", JSON.stringify(cat));
        if (update) {
            GM_setValue("update", parseInt(GM_getValue("instance", "1")).toString());
        }
        else {
            GM_setValue("update", "0");
        }
    }
    function readClearUpdateFlag() {
        const update = parseInt(GM_getValue("update", "0"));
        if (update > 0) {
            GM_setValue("update", (update - 1).toString());
            return true;
        }
        else {
            return false;
        }
    }
    class AutoUpdateSelection {
        constructor(handler, ...options) {
            this._timer = 0;
            this._handler = handler;
            this._select = $('<select id="auto-update-interval">');
            for (const [name, value] of options) {
                this.addOption(name, value);
            }
            this._select.on("input", () => this.onInput());
        }
        get() {
            return this._select;
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
            const [, value] = this.getOption();
            console.log("auto-update:", new Date().toLocaleString());
            if (value <= 0) {
                return;
            }
            this._handler.onUpdate();
            this._timer = setTimeout(() => this.onTimer(), value * 1000);
        }
    }
    function onCatMode(domain) {
        GM_addStyle(`\
:root {
  --table-columns: 100;
}

body > a.select, body > b > a.select {
  font-weight: bold;
}

body > b {
  font-weight: normal;
}

#cattable, #findresult {
  border: 1px solid #800000;
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;
  align-items: stretch;
  justify-content: center;
  margin: auto;
  width: calc(var(--table-columns) * 67px);
}

#cattable > div.cell, #findresult > div.cell {
  border: 1px solid #800000;
  margin: 1px;
  display: flex;
  position: relative;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: flex-start;
  flex-grow: 0;
  flex-shrink: 0;
  flex-basis: 65px;
  box-sizing: border-box;
  width: 65px;
}

.resnum {
  margin-left: 2px;
  font-size: 70%;
}

.resup .resnum {
  color: #f02020;
}

.resdown .resnum {
  color: #2020f0;
}

.catup .resnum {
  color: #f02020;
}

.resup {
  background-color: #fce0d6;
}

.resdown {
  background-color: #cccccc;
}

.reseq {
  background-color: #cccccc;
}

.thrnew {
  background-color: #fce0d6;
}

#controller {
  text-align: center;
}

#controller > * {
  vertical-align: middle;
  box-sizing: border-box;
  height: 24px;
}

#controller > input[type="search"] {
  font-size: small;
}

#controller > input[type="number"] {
  font-size: small;
  width: 60px;
}

`);
        const instance = parseInt(GM_getValue("instance", "0")) + 1;
        GM_setValue("instance", instance.toString());
        console.log("cat-mode is running:", { domain: domain, instance: instance });
        const q_cattable = "#cattable";
        const q_cattable_cells = "#cattable div.cell";
        function urlRequest(option) {
            if (option == null) {
                return location.protocol + "//" + location.host + location.pathname + location.search + " #cattable > tbody";
            }
            else if (option === 0) {
                return location.protocol + "//" + location.host + location.pathname + "?mode=cat #cattable > tbody";
            }
            else {
                return location.protocol + "//" + location.host + location.pathname + `?mode=cat&sort=${option}` + " #cattable > tbody";
            }
        }
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
        class CatView {
            constructor(cat) {
                this._cat = cat;
            }
            save(update) {
                saveCatalog(this._cat, update);
            }
            get(key) {
                return this._cat[key];
            }
            update(content, oldcat, domain) {
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
                }
                else {
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
            render(content, oldcat, key) {
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
                        }
                        else if (resDiff < 0) {
                            this._cat[key].res = oldcat.get(key).readres;
                            $("font", content).text(this._cat[key].res);
                            $(content).addClass("reseq");
                        }
                        else {
                            $(content).addClass("reseq");
                        }
                    }
                    else if (oldcat.get(key).res >= 0) {
                        const catDiff = this._cat[key].res - oldcat.get(key).res;
                        if (catDiff > 0) {
                            resnum.text("+" + catDiff);
                            $(content).addClass("catup");
                        }
                    }
                }
                else {
                    // NEW
                    $(content).addClass("thrnew");
                }
            }
            findText(text) {
                const norm = normalizeText(text);
                return $(q_cattable_cells).filter((i, e) => {
                    if (!e.textContent) {
                        return false;
                    }
                    return normalizeText(e.textContent).includes(norm);
                });
            }
            findHist(domain) {
                return $(q_cattable_cells).filter((i, e) => {
                    var _a, _b;
                    const href = $("a", e).attr("href");
                    if (href == null) {
                        return false;
                    }
                    const key = getKey(domain, href);
                    if (key == null) {
                        return false;
                    }
                    return ((_b = (_a = this._cat[key]) === null || _a === void 0 ? void 0 : _a.readres) !== null && _b !== void 0 ? _b : 0) >= 0;
                });
            }
            filterExpiredItems() {
                const expireTime = 259200000; // 3days
                const now = Date.now();
                const cat = {};
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
            constructor() {
                this._table = $('<div id="findresult">').hide();
                this._item_count = 0;
            }
            append(elems) {
                elems.each((i, e) => {
                    if (i === 0) {
                        this._table.show();
                    }
                    this._table.append($(e).clone(true));
                    this._item_count += 1;
                });
            }
            clear() {
                this._table.hide();
                this._table.empty();
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
            constructor(finder, result, domain) {
                this._finder = finder;
                this._result = result;
                this._cat = new CatView({});
                this._oldcat = new CatView({});
                this.update();
                this._finder.on("input", () => this.onInput());
                this._domain = domain;
            }
            update() {
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
                }
                else {
                    this._result.append(this._cat.findHist(this._domain));
                }
                if (this._result.count() > 0) {
                    this._result.show();
                }
            }
            save() {
                this._cat.save();
            }
            onInput() {
                clearTimeout(this._timer);
                this._timer = setTimeout(() => this.update(), 500);
            }
        }
        function columnAdjuster() {
            const CELL_WIDTH = 67; // 65px (border-box width) + 2px (margin)
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
                .on("wheel", function (e) {
                if (!(this instanceof HTMLInputElement && e.originalEvent instanceof WheelEvent)) {
                    return;
                }
                if (e.originalEvent.deltaY < 0) {
                    this.stepUp();
                }
                else {
                    this.stepDown();
                }
                e.stopPropagation();
                e.preventDefault();
                $(this).trigger("input");
            }).trigger("input");
        }
        class CatMode {
            constructor(domain) {
                this.sortOption = {};
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
            transform() {
                $("#cattable").replaceWith($('<div id="cattable">').append($("#cattable td").map((i, e) => $('<div class="cell">')
                    .append($('<div class="inner-cell">').append($(e).contents()))
                    .get())));
            }
            overrideCatalogLinks() {
                $("body > a, body > b > a")
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
                    }
                    else {
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
            reload({ save, sort } = {}) {
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
            onFocus(e) {
                if (e.target instanceof HTMLInputElement) {
                    e.target.select();
                }
            }
            onUpdate() {
                this.reload({ save: false });
            }
            onSelect() {
                return;
            }
            onButtonClick() {
                this.reload();
            }
            onUnload() {
                this.table.save();
                GM_setValue("instance", (parseInt(GM_getValue("instance", "1")) - 1).toString());
            }
            onKeyDown(e) {
                var _a;
                if (((_a = document.activeElement) === null || _a === void 0 ? void 0 : _a.tagName) === "INPUT") {
                    return;
                }
                if (e.key === "s") {
                    this.reload();
                }
                else if (e.key === "/") {
                    this.finder.trigger("focus");
                }
            }
            onTimer() {
                if (readClearUpdateFlag()) {
                    this.table.update();
                }
            }
        }
        new CatMode(domain);
    }
    function onResMode(domain) {
        GM_addStyle(`\
table.resnew > tbody > tr > td.rtd {
  background-color: #fce0d6;
}

table.resnew > tbody > tr > td.rtd > .rsc {
  font-weight: bold;
}

body.filter-resnew div.thre table:not(.resnew) {
  display: none;
}

body.filter-resnew #gallery > div:not(.resnew) {
  display: none;
}

body.filter-resnew #image-view > .image-slider > div:not(.resnew),
body.filter-resnew #image-view > .image-thumbs > img:not(.resnew) {
  display: none;
}

body.filter-images div.thre table:not(.resimg) {
  display: none;
}

#auto-scroll-status {
  background-color: rgba(200, 200, 200, 0.8);
  color: #646464;
  font-size: 80%;
  position: fixed;
  bottom: 50px;
  right: 10px;
  z-index: 1000;
  display: inline-block;
  padding: 5px 10px;
  border-radius: 2px;
}

#commands {
  position: fixed;
  bottom: 10px;
  left: calc(100vw - 130px);
  z-index: 1000;
  text-align: center;
}

#commands > a {
  background-color: #c8c8c8;
  border: 2px outset #c8c8c8;
  color: #646464;
  cursor: pointer;
  display: block;
}

#commands > a:hover {
  color: #c80000;
}

#commands > a.enable {
  background-color: #969696;
  border-style: inset;
  color: #c80000;
}

#commands > a.enable:hover {
  color: #646464;
}

#commands > a.cornar-first {
  border-radius: 5px / 20% 20% 0 0;
}

#commands > a.cornar-last {
  border-radius: 5px / 0 0 20% 20%;
}

#commands #auto-update-interval {
  display: block;
  width: 100px;
  height: 25px;
}

#commands #goto-btn {
  padding: 2px;
}

#commands #goto-btn > a {
  background-color: #e6bebe;
  color: #960000;
  cursor: pointer;
  display: inline-block;
  font-weight: bold;
  opacity: 0.8;
}

#commands #goto-btn > a:hover {
  color: #c80000;
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
  color: #646464;
  font-size: 80%;
  background-color: #141414;
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

#gallery > div.saved > a::before {
  color: #139213;
  font-weight: bold;
  font-size: 14pt;
  content: "\u2714";
  position: absolute;
  left: 0;
  top: 0;
  background-color: #005000;
  width: 1.2em;
  height: 1.2em;
  opacity: 0.8;
}

#gallery > div.movie > div {
  z-index: 1000;
  position: absolute;
}

#gallery > div.movie > div > video {
  max-width: none !important;
  max-height: none !important;
  width: 250px;
  height: 250px;
}

#gallery > div.movie > a {
  border: 2px solid #960000;
}

#gallery > div.movie > a::before {
  color: #c8c8c8;
  font-weight: bold;
  font-size: 9pt;
  content: attr(data-ext);
  position: absolute;
  right: 0;
  top: 0;
  background-color: #960000;
}

#gallery > div.anime > a {
  border: 2px solid #005000;
}

#gallery > div.anime > a::before {
  color: #c8c8c8;
  font-weight: bold;
  font-size: 9pt;
  content: attr(data-ext);
  position: absolute;
  right: 0;
  top: 0;
  background-color: #005000;
}

#image-view {
  background-color: black;
  position: fixed;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

#image-view > .image-slider {
  display: flex;
  align-items: center;
  flex-direction: row;
  transition: all 300ms 0s ease;
  width: 100%;
  height: calc(100% - 50px);
}

#image-view > .image-slider > div {
  flex-basis: 100%;
  flex-shrink: 0;
  text-align: center;
}

#image-view > .image-slider > div > div {
  display: inline-block;
}

#image-view > .image-slider > div > div > video {
  object-fit: contain;
  object-position: center;
  max-width: calc(100% - 30px) !important;
  max-height: calc(100vh - 50px) !important;
}

#image-view > .image-slider > div > a {
  display: inline-block;
  position: relative;
}

#image-view > .image-slider > div > a > img {
  object-fit: contain;
  object-position: center;
  max-width: 100%;
  max-height: calc(100vh - 50px);
}

#image-view > .image-slider > div.saved > a::before {
  color: #139213;
  font-weight: bold;
  font-size: 14pt;
  content: "\u2714";
  position: absolute;
  left: 0;
  top: 0;
  background-color: #005000;
  width: 1.2em;
  height: 1.2em;
  opacity: 0.8;
}

#image-view > .image-thumbs {
  display: flex;
  align-items: center;
  flex-direction: row;
  width: 100%;
  height: 50px;
  position: fixed;
  left: 0;
  bottom: 0;
}

#image-view > .image-thumbs > div {
  background-color: black;
  flex-basis: 50px;
  flex-shrink: 0;
  width: 50px;
  height: 50px;
  border: 2px solid rgba(0, 0, 0, 0.9);
  box-sizing: border-box;
  position: relative;
}

#image-view > .image-thumbs > div > img {
  object-fit: scale-down;
  object-position: center;
  width: 100%;
  height: 100%;
}

#image-view > .image-thumbs > div.active {
  border: 2px solid #c80000;
}

#image-view > .image-thumbs > div.saved::before {
  color: #139213;
  font-weight: bold;
  font-size: 11pt;
  content: "\u2714";
  position: absolute;
  left: 0;
  top: 0;
  background-color: #005000;
  width: 1.2em;
  height: 1.2em;
  opacity: 0.8;
}

#image-view > .image-number {
  background-color: rgba(200, 200, 200, 0.8);
  color: #141414;
  font-weight: bold;
  font-size: small;
  position: fixed;
  left: 0;
  top: 0;
  padding: 0.5em;
}

#readmarker > span {
  vertical-align: middle;
  font-size: small;
  font-style: italic;
}

#readmarker > hr {
  display: inline-block;
  vertical-align: middle;
  width: 50%;
  border: 1px dashed #960000;
}

#downloading-popup {
  background-color: #141414;
  color: #969696;
  position: fixed;
  display: table;
  width: 10em;
  height: 3em;
  margin: auto;
  top: 0;
  left: 0;
  bottom: 0;
  right: 0;
  text-align: center;
  z-index: 2000;
  padding: 0.5em;
  opacity: 0.8;
}

#downloading-popup > span {
  display: table-cell;
  vertical-align: middle;
}

body.image-view-mode {
  margin: 0;
  height: 100%;
  overflow: hidden;
}

`);
        console.log("res-mode is running:", domain);
        const q_thre = "div.thre";
        const q_table = "div.thre > table";
        const q_res = "div.thre > table > tbody > tr > td.rtd";
        const q_res_resnum = "div.thre table > tbody > tr > td.rtd > span:first-child"; // support tree view mode
        const q_res_notnew = "div.thre table:not(.resnew)";
        const q_res_images = "div.thre table > tbody > tr > td.rtd a > img";
        const q_images = "div.thre table > tbody > tr > td.rtd a > img, div.thre > a > img";
        const q_maxres = "div.thre > span.maxres"; // tree view recovery point
        const q_contres = "#contres > a";
        class SavedList {
            constructor() {
                this.saved = JSON.parse(GM_getValue("saved", "{}"));
                const now = Date.now();
                for (const url in this.saved) {
                    if (this.saved[url] < now) {
                        delete this.saved[url];
                    }
                }
                this.save();
                console.log("SavedList:", this.saved);
            }
            save() {
                GM_setValue("saved", JSON.stringify(this.saved));
            }
            has(url) {
                return url in this.saved;
            }
            add(url) {
                this.saved[url] = Date.now() + 86400000; // 1 day
                this.save();
            }
        }
        const savedList = new SavedList();
        class ImageViewer {
            constructor() {
                this.images = $();
                this.thumbs = $();
                this.index = 0;
            }
            page(i) {
                const visible_images = this.images.filter(":visible");
                if (i >= visible_images.length) {
                    i = visible_images.length - 1;
                }
                else if (i < 0) {
                    i = 0;
                }
                $("#image-view > .image-slider > div > div > video").next().trigger("click");
                $("#image-view > .image-slider").css("transform", `translate(-${100 * i}%)`);
                const image = visible_images.eq(i);
                if (image.is(".movie")) {
                    image.find("a > img").trigger("click");
                }
                $("#image-view > .image-number").text(`${i + 1}/${visible_images.length}`);
                const offset = 50 * (i - Math.floor(window.innerWidth / 50 / 2) + 1);
                const m = 50 * (visible_images.length - Math.floor(window.innerWidth / 50) + 3);
                if (offset < 0) {
                    $("#image-view > .image-thumbs").css("transform", "translate(0)");
                }
                else if (offset > m) {
                    $("#image-view > .image-thumbs").css("transform", `translate(-${m}px)`);
                }
                else {
                    $("#image-view > .image-thumbs").css("transform", `translate(-${offset}px)`);
                }
                this.thumbs.removeClass("active");
                this.thumbs.filter(":visible").eq(i).addClass("active");
                this.index = i;
            }
            next() {
                this.page(this.index + 1);
            }
            prev() {
                this.page(this.index - 1);
            }
            onClose(e) {
                this.destroy();
                e.stopPropagation();
                e.preventDefault();
            }
            onKeyDown(e) {
                if (e.key === "ArrowLeft") {
                    this.prev();
                }
                else if (e.key === "ArrowRight") {
                    this.next();
                }
                else if (e.key === "Escape") {
                    this.destroy();
                }
                else if (e.key === "s") {
                    this.save();
                }
                else {
                    return;
                }
                e.stopPropagation();
                e.preventDefault();
            }
            onWheel(e) {
                if (!(e.originalEvent instanceof WheelEvent)) {
                    return;
                }
                if (e.originalEvent.deltaY < 0) {
                    this.prev();
                }
                else if (e.originalEvent.deltaY > 0) {
                    this.next();
                }
                e.stopPropagation();
                e.preventDefault();
            }
            show(image) {
                const anchors = $(q_images).parent();
                this.images = anchors.map((i, anchor) => {
                    var _a, _b;
                    const ext = anchor.href.split(".").slice(-1)[0].toLowerCase();
                    let div;
                    if (ext === "mp4" || ext === "webm") {
                        const img = $('<img loading="lazy">').attr("src", (_a = $("img", anchor).attr("src")) !== null && _a !== void 0 ? _a : anchor.href);
                        div = $('<div class="movie">').append($("<a>").attr("href", anchor.href).append(img));
                    }
                    else {
                        const img = $('<img loading="lazy">').attr("src", anchor.href);
                        div = $("<div>").append($("<a>").attr("href", anchor.href).append(img));
                    }
                    if ((_b = anchor.closest("table")) === null || _b === void 0 ? void 0 : _b.classList.contains("resnew")) {
                        div.addClass("resnew");
                    }
                    if (savedList.has(anchor.href)) {
                        div.addClass("saved");
                    }
                    return div.get(0);
                });
                this.thumbs = anchors.map((i, anchor) => {
                    var _a, _b;
                    const img = $("<div>").append($('<img loading="lazy">').attr("src", (_a = $("img", anchor).attr("src")) !== null && _a !== void 0 ? _a : anchor.href));
                    if ((_b = anchor.closest("table")) === null || _b === void 0 ? void 0 : _b.classList.contains("resnew")) {
                        img.addClass("resnew");
                    }
                    if (savedList.has(anchor.href)) {
                        img.addClass("saved");
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
                $("body").addClass("image-view-mode");
            }
            save() {
                const image = this.images.filter(":visible").eq(this.index);
                const thumb = this.thumbs.filter(":visible").eq(this.index);
                const url = image.find("a").attr("href");
                if (url == null) {
                    return;
                }
                const name = url.split("/").pop();
                if (name == null) {
                    return;
                }
                $('<div id="downloading-popup"><span>Downloading ...</span></div>')
                    .appendTo("body")
                    .fadeIn("fast")
                    .delay(800)
                    .fadeOut({
                    duration: "slow",
                    complete: function () {
                        var _a;
                        (_a = this.parentNode) === null || _a === void 0 ? void 0 : _a.removeChild(this);
                    },
                });
                GM_download({
                    url: url,
                    name: name,
                    headers: { Referer: location.href },
                    saveAs: false,
                    onerror: (e) => console.log(e),
                    onload: () => {
                        savedList.add(url);
                        image.addClass("saved");
                        thumb.addClass("saved");
                    },
                });
            }
            destroy() {
                $("#gallery").show().trigger("focus");
                $("#image-view").remove();
                $("body").removeClass("image-view-mode");
            }
        }
        class Gallery {
            constructor() {
                this.imageViewer = new ImageViewer();
            }
            create() {
                const anchors = $(q_images).parent();
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
                $("body").addClass("image-view-mode");
            }
            onClose(e) {
                this.destroy();
                e.stopPropagation();
                e.preventDefault();
            }
            onKeyDown(e) {
                if (e.key === "Escape" || e.key === "Esc") {
                    this.destroy();
                    e.stopPropagation();
                    e.preventDefault();
                }
            }
            onClick(e) {
                if (e.target instanceof HTMLImageElement && e.target.parentElement instanceof HTMLAnchorElement) {
                    this.imageViewer.show(e.target.parentElement);
                    e.stopPropagation();
                    e.preventDefault();
                }
                else if (e.target instanceof HTMLAnchorElement && e.target.firstElementChild instanceof HTMLImageElement) {
                    this.imageViewer.show(e.target);
                    e.stopPropagation();
                    e.preventDefault();
                }
            }
            quote(anchor) {
                const text = anchor
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
            }
            make(anchor) {
                var _a;
                const a = $(anchor);
                const ext = anchor.href.split(".").slice(-1)[0].toLowerCase();
                let div;
                if (ext === "mp4" || ext === "webm") {
                    div = $('<div class="movie">').append(a.clone().attr("data-ext", ext), this.quote(a));
                }
                else if (ext === "gif") {
                    div = $('<div class="anime">').append(a.clone().attr("data-ext", ext), this.quote(a));
                }
                else {
                    div = $("<div>").append(a.clone(), this.quote(a));
                }
                if ((_a = a.closest("table")) === null || _a === void 0 ? void 0 : _a.is(".resnew")) {
                    div.addClass("resnew");
                }
                if (savedList.has(anchor.href)) {
                    div.addClass("saved");
                }
                return div;
            }
            destroy() {
                $("#gallery-button").removeClass("enable");
                $("#gallery").remove();
                this.imageViewer.destroy();
                $("body").removeClass("image-view-mode");
            }
        }
        class TreeView {
            make() {
                let quotes = [];
                $(q_res_notnew).last().after($('<span id="resnew">'));
                $(q_table)
                    .toArray()
                    .reverse()
                    .forEach((table) => {
                    const mo = />([^>]+)$/.exec($("blockquote > font", table).last().text());
                    const text = $("blockquote, a, span", table).text();
                    let clone = null;
                    quotes = quotes.filter((item) => {
                        if (!text.includes(item.text)) {
                            return true;
                        }
                        if (!table.classList.contains("resnew") && item.resnew) {
                            if (clone == null) {
                                clone = $(table).clone(true).insertAfter("#resnew").addClass("clone");
                            }
                            $("blockquote", clone).first().after(item.res);
                        }
                        else {
                            $("blockquote", table).first().after(item.res);
                        }
                        return false;
                    });
                    if (mo != null) {
                        quotes.push({ text: mo[1], res: table, resnew: table.classList.contains("resnew") });
                    }
                });
            }
            flat() {
                const array = [];
                $(q_res_resnum).each((i, e) => {
                    const span = $(e);
                    const resnum = parseInt(span.text() || "0");
                    const table = span.closest("table");
                    if (table.hasClass("clone") || array[resnum] != null) {
                        table.remove();
                    }
                    else {
                        array[resnum] = table;
                    }
                });
                $(q_maxres).after(array);
                $("#resnew").remove();
            }
        }
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
                    this._status = $('<div id="auto-scroll-status">');
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
        class Command {
            constructor(gallery, treeview) {
                this.gallery = gallery;
                this.treeview = treeview;
            }
            buttons() {
                return $('<a class="cornar-first" id="gallery-button">画像一覧</a>')
                    .on("click", (e) => this.toggleGallery(e))
                    .add($("<a>画像</a>").on("click", (e) => this.filterImages(e)))
                    .add($("<a>新着</a>").on("click", (e) => this.filterResNew(e)))
                    .add($('<a class="cornar-last">ツリー表示</a>').on("click", (e) => this.toggleTreeView(e)));
            }
            toggleButton(e) {
                e.preventDefault();
                return $(e.target).toggleClass("enable").hasClass("enable");
            }
            toggleGallery(e) {
                if (this.toggleButton(e)) {
                    this.gallery.create();
                }
                else {
                    this.gallery.destroy();
                }
            }
            filterImages(e) {
                if (this.toggleButton(e)) {
                    $("body").addClass("filter-images");
                }
                else {
                    $("body").removeClass("filter-images");
                }
            }
            filterResNew(e) {
                if (this.toggleButton(e)) {
                    $("body").addClass("filter-resnew");
                }
                else {
                    $("body").removeClass("filter-resnew");
                }
            }
            toggleTreeView(e) {
                if (this.toggleButton(e)) {
                    this.treeview.make();
                }
                else {
                    this.treeview.flat();
                }
            }
        }
        class ReloadWatcher {
            constructor(key) {
                this._key = key;
            }
            onTimer(item, retry, param) {
                const res = $(q_res_resnum);
                const resnew = res.filter((i, e) => {
                    var _a;
                    const resnum = parseInt((_a = e.textContent) !== null && _a !== void 0 ? _a : "0");
                    const res = $(e).closest("table");
                    if (resnum > item.readres) {
                        res.addClass("resnew");
                        return true;
                    }
                    else {
                        res.removeClass("resnew");
                        return false;
                    }
                });
                if (resnew.length > 0 && !(param === null || param === void 0 ? void 0 : param.preserve)) {
                    item.res = res.length;
                    item.readres = res.length;
                    if (this._resMode != null) {
                        item.offset = this._resMode.getResNumFromScrollPosition();
                        this._resMode.insertReadMarker(item.offset);
                    }
                    const newcat = loadCatalog();
                    newcat[this._key] = item;
                    saveCatalog(newcat, true);
                }
                else if (retry > 0) {
                    setTimeout(this.onTimer.bind(this), 100, item, retry - 1, param);
                }
            }
            start(resMode) {
                $(q_contres).on("click", (e, param) => {
                    const cat = loadCatalog();
                    const item = cat[this._key];
                    if (this._resMode != null) {
                        this._resMode.insertReadMarker(this._resMode.getResNumFromScrollPosition());
                    }
                    setTimeout(this.onTimer.bind(this), 100, item, 10, param);
                });
                this._resMode = resMode;
            }
            trigger(param) {
                $(q_contres).trigger("click", param);
            }
        }
        class ResMode {
            constructor(key) {
                const cat = loadCatalog();
                const res = $(q_res).closest("table");
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
                // render marker
                res.removeClass("resnew");
                if (cat[key].readres >= 0) {
                    res.slice(cat[key].readres).addClass("resnew");
                }
                else {
                    res.addClass("resnew");
                }
                $(q_res_images).closest("table").addClass("resimg");
                // update readres
                cat[key].readres = res.length;
                // preserve pos
                const offset = cat[key].offset;
                if (offset > 0) {
                    this.setScrollPositionFromResNum(offset);
                    this.insertReadMarker(offset);
                }
                saveCatalog(cat, true);
                this.key = key;
                // install components
                this.watcher = new ReloadWatcher(key);
                this.watcher.start(this);
                this.autoScr = new AutoScroller();
                const select = new AutoUpdateSelection(this, ["OFF", 0], ["SCR", 0], // auto-scroll, no auto-update
                ["15s", 15], ["30s", 30], ["1min", 60]);
                const gallery = new Gallery();
                const treeview = new TreeView();
                const command = new Command(gallery, treeview);
                $("body").append(this.autoScr.status());
                const gotoBtn = $("<div id='goto-btn'>").append($("<a>▼新</a>").on("click", () => {
                    this.setScrollPositionFromResNum($(q_res_notnew).length + 1);
                }), $("<a>▼読</a>").on("click", () => {
                    const offset = $("#readmarker").offset();
                    if (offset != null) {
                        window.scrollTo(0, offset.top);
                    }
                }));
                $("body").append($('<div id="commands">').append(gotoBtn, command.buttons(), " ", select.get()));
                $(window).on("keydown", (e) => this.onHotkey(e));
                $(window).on("unload", () => this.onUnload());
                $(q_thre).on("mouseover", (e) => this.onPlayVideo(e));
                $(q_thre).on("mouseout", (e) => this.onCloseVideo(e));
                $(q_thre).on("click", (e, suppress) => this.onClick(e, suppress));
            }
            setScrollPositionFromResNum(resnum) {
                const offset = $(q_table).eq(resnum - 1).offset();
                if (offset == null) {
                    return;
                }
                window.scroll(0, offset.top);
            }
            getResNumFromScrollPosition() {
                return Math.max.apply(null, $(q_table).map((i, e) => {
                    const res = $(e);
                    const offset = res.offset();
                    const height = res.height();
                    if (offset != null && height != null && offset.top + height <= window.scrollY + window.innerHeight) {
                        return parseInt($("span:first-child", e).eq(0).text());
                    }
                }).get());
            }
            insertReadMarker(resnum) {
                $("#readmarker").remove();
                if (resnum <= 0) {
                    return;
                }
                // marker is not set when resnum equals to or over the last (i.e. resnum >= $(q_table).length)
                $(q_table).eq(resnum).before('<div id="readmarker"><span>ここまで読んだ</span> <hr> <span>ここまで読んだ</span></div>');
            }
            onClick(e, suppress) {
                if (suppress) {
                    return;
                }
                if (e.target.tagName === "A" && e.target.firstChild.tagName === "IMG") {
                    const imageViewer = new ImageViewer();
                    imageViewer.show(e.target);
                    e.preventDefault();
                    e.stopPropagation();
                }
                else if (e.target.tagName === "IMG" && e.target.parentElement.tagName === "A") {
                    const imageViewer = new ImageViewer();
                    imageViewer.show(e.target.parentElement);
                    e.preventDefault();
                    e.stopPropagation();
                }
            }
            onHotkey(e) {
                var _a;
                if (((_a = document.activeElement) === null || _a === void 0 ? void 0 : _a.tagName) === "INPUT") {
                    return;
                }
                const autoScr = this.autoScr;
                if (e.key === "a" && this.autoScr.tm / 2 >= 100) {
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
                else if (e.key === "s") {
                    this.watcher.trigger();
                }
            }
            onUnload() {
                const newcat = loadCatalog();
                newcat[this.key].offset = this.getResNumFromScrollPosition();
                saveCatalog(newcat, true);
            }
            onUpdate() {
                this.watcher.trigger({ preserve: true });
            }
            onSelect(text, value) {
                console.log("auto-scroll", text, value);
                if (text === "OFF") {
                    this.autoScr.stop();
                    this.autoScr.status("auto-scroll stopped");
                }
                else {
                    this.autoScr.start();
                    this.autoScr.status("auto-scroll started");
                }
            }
            onPlayVideo(e) {
                var _a;
                if (e.target.tagName === "IMG" && ((_a = e.target.parentElement) === null || _a === void 0 ? void 0 : _a.tagName) === "A") {
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
                    }
                    else if (ext === "gif") {
                        img.data("thumb", src).attr("src", href);
                        e.stopPropagation();
                    }
                }
            }
            onCloseVideo(e) {
                if (e.target.tagName === "DIV" || e.target.tagName === "TD") {
                    const video = $("video.extendWebm", e.target);
                    if (video.length > 0) {
                        video.next().trigger("click");
                        e.stopPropagation();
                    }
                }
                else if (e.target.tagName === "IMG") {
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
    }
    GM_registerMenuCommand("履歴削除", () => {
        GM_deleteValue("cat");
        GM_deleteValue("update");
    });
    function main() {
        const mo = /^https?:\/\/(\w+)\./.exec(location.href);
        const domain = mo == null ? "" : mo[1];
        if (/futaba\.php\?mode=cat\b/.test(location.href)) {
            onCatMode(domain);
        }
        else {
            onResMode(domain);
        }
    }
    main();
})();
