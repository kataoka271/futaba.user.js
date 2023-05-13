// ==UserScript==
// @name         Futaba
// @namespace    https://github.com/kataoka271
// @version      0.0.18
// @description  Futaba
// @author       k_hir@hotmail.com
// @match        https://may.2chan.net/b/*
// @match        http://jun.2chan.net/jun/*
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
        const q_cattable = "table#cattable";
        const q_cattable_cells = "table#cattable td";
        const q_cattable_firstrow = "table#cattable tr:first-child td";
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
            constructor(column_count = 8) {
                this._table = $('<table border="1" align="center">').hide();
                this._tbody = $("<tbody>").appendTo(this._table);
                this._tr = $("<tr>").appendTo(this._tbody);
                this._item_count = 0;
                this._column_count = column_count;
            }
            append(elems) {
                elems.each((i, e) => {
                    if (this._item_count === 0) {
                        this._table.show();
                    }
                    else if (this._item_count % this._column_count === 0) {
                        this._tr = $("<tr>").appendTo(this._tbody);
                    }
                    this._tr.append($(e).clone(true));
                    this._item_count += 1;
                });
            }
            clear() {
                this._table.hide();
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
            constructor(finder, result, domain) {
                this._finder = finder;
                this._result = result;
                this._cat = new CatView({});
                this._oldcat = new CatView({});
                this.update();
                let timer;
                this._finder.on("input", () => {
                    clearTimeout(timer);
                    timer = setTimeout(() => this.update(), 500);
                });
                this._domain = domain;
            }
            update() {
                this._oldcat = new CatView(loadCatalog());
                this._cat = this._oldcat.filterExpiredItems();
                $(q_cattable_cells).each((i, elem) => {
                    this._cat.update(elem, this._oldcat, this._domain);
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
            reload(save) {
                $(q_cattable).load(location.href + " #cattable > tbody", () => {
                    if (save == null || save) {
                        this.save();
                    }
                    this.update();
                });
            }
        }
        class CatMode {
            constructor(domain) {
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
            onFocus(e) {
                if (e.target instanceof HTMLInputElement) {
                    e.target.select();
                }
            }
            onUpdate() {
                this.table.reload();
            }
            onSelect() {
                return;
            }
            onButtonClick() {
                this.table.reload();
            }
            onUnload() {
                this.table.save();
            }
            onKeyDown(e) {
                var _a;
                if (((_a = document.activeElement) === null || _a === void 0 ? void 0 : _a.tagName) === "INPUT") {
                    return;
                }
                if (e.key === "s") {
                    this.table.reload();
                }
                else if (e.key === "/") {
                    this.finder.trigger("focus");
                }
            }
            onTimer() {
                if (readClearUpdateFlag() === "1") {
                    this.table.update();
                }
            }
        }
        new CatMode(domain);
    };
    const onResMode = (domain) => {
        GM_addStyle(`\
table.resnew > tbody > tr > td.rtd {
  background-color: #fce0d6;
}
table.resnew > tbody > tr > td.rtd > .rsc {
  font-weight: bold;
}
body.filter-resnew div.thre table:not(.resnew),
body.filter-resnew #gallery > div:not(.resnew),
body.filter-resnew #image-view > .image-slider > div:not(.resnew),
body.filter-resnew #image-view > .image-thumbs > img:not(.resnew),
body.filter-images div.thre table:not(.resimg) {
  display: none;
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
#image-view > .image-slider > div > a > img {
  object-fit: contain;
  object-position: center;
  max-width: 100%;
  max-height: calc(100vh - 50px);
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
#image-view > .image-thumbs > img {
  background-color: black;
  flex-basis: 50px;
  flex-shrink: 0;
  object-fit: scale-down;
  object-position: center;
  width: 50px;
  height: 50px;
  border: 2px solid rgba(0, 0, 0, 0.9);
  box-sizing: border-box;
}
#image-view > .image-thumbs > img.active {
  border: 2px solid rgb(200, 0, 0);
}
#image-view > .image-number {
  background-color: rgba(200, 200, 200, 0.8);
  color: rgb(20, 20, 20);
  font-weight: bold;
  font-size: small;
  position: fixed;
  left: 0;
  top: 0;
  padding: 0.5em;
}

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
                const offset = 50 * i - (window.innerWidth - 50) / 2;
                if (offset < 0) {
                    $("#image-view > .image-thumbs").css("transform", "translate(0)");
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
                    return div.data("index", i).get(0);
                });
                this.thumbs = anchors.map((i, anchor) => {
                    var _a, _b;
                    const img = $('<img loading="lazy">').attr("src", (_a = $("img", anchor).attr("src")) !== null && _a !== void 0 ? _a : anchor.href);
                    if ((_b = anchor.closest("table")) === null || _b === void 0 ? void 0 : _b.classList.contains("resnew")) {
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
            destroy() {
                $("#gallery").show().trigger("focus");
                $("#image-view").remove();
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
                return div;
            }
            destroy() {
                $("#gallery-button").removeClass("enable");
                $("#gallery").remove();
                this.imageViewer.destroy();
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
        class Updater {
            constructor(key) {
                this._key = key;
            }
            onTimer(retry, param) {
                const cat = loadCatalog();
                const key = this._key;
                const res = $(q_res_resnum);
                const resnew = res.filter((i, e) => {
                    var _a;
                    const resnum = parseInt((_a = e.textContent) !== null && _a !== void 0 ? _a : "0");
                    const res = $(e).closest("table");
                    if (resnum > cat[key].readres) {
                        res.addClass("resnew");
                        return true;
                    }
                    else {
                        res.removeClass("resnew");
                        return false;
                    }
                });
                if (resnew.length > 0 && !(param === null || param === void 0 ? void 0 : param.preserve)) {
                    cat[key].res = res.length;
                    cat[key].readres = res.length;
                    const newcat = loadCatalog();
                    newcat[key] = cat[key];
                    saveCatalog(newcat, "1");
                }
                else if (retry > 0) {
                    setTimeout((retry, param) => this.onTimer(retry, param), 100, retry - 1, param);
                }
            }
            watch() {
                $(q_contres).on("click", (e, param) => {
                    setTimeout((retry, param) => this.onTimer(retry, param), 100, 10, param);
                });
            }
            update(param) {
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
                if (cat[key].offset > 0) {
                    window.scrollTo(0, cat[key].offset + window.innerHeight * 0.8);
                }
                saveCatalog(cat, "1");
                this.key = key;
                // install components
                this.updater = new Updater(key);
                this.updater.watch();
                this.autoScr = new AutoScroller();
                const select = new AutoUpdateSelection(this, ["OFF", 0], ["SCR", 0], // auto-scroll, no auto-update
                ["15s", 15], ["30s", 30], ["1min", 60]);
                const gallery = new Gallery();
                const treeview = new TreeView();
                const command = new Command(gallery, treeview);
                $("body").append(this.autoScr.status());
                $("body").append($('<div id="commands">').append(command.buttons(), " ", select.get()));
                $(window).on("keydown", (e) => this.onHotkey(e));
                $(window).on("unload", () => this.onUnload());
                $(q_thre).on("mouseover", (e) => this.onPlayVideo(e));
                $(q_thre).on("mouseout", (e) => this.onCloseVideo(e));
                $(q_thre).on("click", (e, suppress) => this.onClick(e, suppress));
            }
            seek(resnum) {
                var _a, _b;
                const res = $(q_res);
                document.body.scrollTo(0, (_b = (_a = res.eq(resnum).offset()) === null || _a === void 0 ? void 0 : _a.top) !== null && _b !== void 0 ? _b : 0);
            }
            onClick(e, suppress) {
                if (!suppress && e.target.tagName === "IMG" && e.target.parentElement.tagName === "A") {
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
                    this.updater.update();
                }
            }
            onUnload() {
                const newcat = loadCatalog();
                newcat[this.key].offset = scrollY;
                saveCatalog(newcat, "1");
            }
            onUpdate() {
                this.updater.update({ preserve: true });
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
    };
    GM_registerMenuCommand("履歴削除", () => {
        GM_deleteValue("cat");
        GM_deleteValue("update");
    });
    function main() {
        const mo = /^https?:\/\/(\w+)\./.exec(location.href);
        const domain = mo == null ? "" : mo[1];
        if (/futaba\.php\?mode=cat/.test(location.href)) {
            onCatMode(domain);
        }
        else {
            onResMode(domain);
        }
    }
    main();
})();
