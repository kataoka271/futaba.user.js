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
            this._select = $('<select id="auto-update-interval">');
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
            const button = $('<input type="button" value="更新">').on("click", () => {
                table.reload();
            });
            const column_count = $("table#cattable tr:first-child td").length;
            const result = new FindResult(column_count);
            const table = new CatTable(finder, result);
            const select = new AutoUpdateSelect({
                onUpdate: () => table.reload(false),
                onSelect: () => ({}),
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
        class ImageViewer {
            constructor() {
                this.images = $();
                this.thumbs = $();
                this.index = 0;
            }
            page(i) {
                if (0 <= i && i < this.images.length) {
                    $("#image-view > .image-slider > div > div > video").next().trigger("click");
                    $(`#image-view > .image-slider > div:nth-child(${i + 1}).movie > a > img`).trigger("click");
                    $("#image-view > .image-slider").css("transform", `translate(-${100 * i}%)`);
                    $("#image-view > .image-number").text(`${i + 1}/${this.images.length}`);
                    const offset = 50 * i - (window.innerWidth - 50) / 2;
                    if (offset < 0) {
                        $("#image-view > .image-thumbs").css("transform", "translate(0)");
                    }
                    else {
                        $("#image-view > .image-thumbs").css("transform", `translate(-${offset}px)`);
                    }
                    this.thumbs.removeClass("active");
                    this.thumbs.eq(i).addClass("active");
                }
                else {
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
            onDblClick(e) {
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
                const anchors = $("div.thre > a > img, div.thre > table > tbody > tr > td.rtd a > img:visible").parent();
                this.images = anchors.map((i, anchor) => {
                    var _a;
                    const ext = anchor.href.split(".").slice(-1)[0].toLowerCase();
                    if (ext === "mp4" || ext === "webm") {
                        const img = $("<img>").attr("src", (_a = $("img", anchor).attr("src")) !== null && _a !== void 0 ? _a : anchor.href);
                        return $('<div class="movie">').append($("<a>").attr("href", anchor.href).append(img)).get(0);
                    }
                    else {
                        const img = $("<img>").attr("src", anchor.href);
                        return $("<div>").append($("<a>").attr("href", anchor.href).append(img)).get(0);
                    }
                });
                this.thumbs = anchors.map((i, anchor) => {
                    var _a;
                    const img = $("<img>").attr("src", (_a = $("img", anchor).attr("src")) !== null && _a !== void 0 ? _a : anchor.href);
                    return img.get(0);
                });
                this.index = 0;
                const viewer = $('<div id="image-view" tabindex="0">')
                    .on("dblclick", (e) => this.onDblClick(e))
                    .on("keydown", (e) => this.onKeyDown(e))
                    .on("wheel", (e) => this.onWheel(e))
                    .append($('<div class="image-slider">').append(this.images))
                    .append($('<div class="image-thumbs">').append(this.thumbs))
                    .append($('<div class="image-number">'));
                $("#gallery").css("display", "none");
                $("body").append(viewer);
                $("#image-view").trigger("focus");
                $("#image-view > .image-slider").css("transition", "all 0s 0s ease");
                this.images.children("a").each((i, e) => {
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
                $("#gallery").css("display", "");
                $("#gallery").trigger("focus");
                $("div#image-view").remove();
            }
        }
        class Gallery {
            constructor() {
                this.imageViewer = new ImageViewer();
            }
            create() {
                const anchors = $("div.thre > a > img, div.thre > table > tbody > tr > td.rtd a > img:visible").parent();
                if (anchors.length === 0) {
                    return;
                }
                $('<div id="gallery" tabindex="0">')
                    .on("dblclick", (e) => this.onDblClick(e))
                    .on("keydown", (e) => this.onKeyDown(e))
                    .on("click", (e) => this.onClick(e))
                    .append(anchors.map((i, e) => this.make(e)))
                    .appendTo("body")
                    .trigger("focus");
            }
            onDblClick(e) {
                if (e.target.tagName === "DIV") {
                    this.destroy();
                    e.stopPropagation();
                    e.preventDefault();
                }
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
                const a = $(anchor);
                const ext = anchor.href.split(".").slice(-1)[0].toLowerCase();
                if (ext === "mp4" || ext === "webm") {
                    return $("<div>").addClass("movie").append(a.clone().attr("data-ext", ext), this.quote(a)).get(0);
                }
                else if (ext === "gif") {
                    return $("<div>").addClass("anime").append(a.clone().attr("data-ext", ext), this.quote(a)).get(0);
                }
                else {
                    return $("<div>").append(a.clone(), this.quote(a)).get(0);
                }
            }
            destroy() {
                $("#gallery-button").removeClass("enable");
                $("#gallery").remove();
                this.imageViewer.destroy();
            }
        }
        class TreeView {
            make() {
                let quoteList = [];
                $("div.thre > table > tbody > tr > td.rtd:not(.resnew)").last().parent().parent().parent().after($('<span id="resnew">'));
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
            }
            flat() {
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
                return [
                    $('<a class="cornar-first" id="gallery-button">画像一覧</a>').on("click", (e) => this.toggleGallery(e)),
                    $("<a>画像</a>").on("click", (e) => this.filterImages(e)),
                    $("<a>新着</a>").on("click", (e) => this.filterResNew(e)),
                    $('<a class="cornar-last">ツリー表示</a>').on("click", (e) => this.toggleTreeView(e)),
                ];
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
                    $("div.thre > table > tbody > tr > td.rtd")
                        .filter((i, e) => $("img", e).length === 0)
                        .closest("table")
                        .css("display", "none");
                }
                else {
                    $("div.thre > table > tbody > tr > td.rtd")
                        .filter((i, e) => $("img", e).length === 0)
                        .closest("table")
                        .css("display", "");
                }
            }
            filterResNew(e) {
                if (this.toggleButton(e)) {
                    $("div.thre > table > tbody > tr > td.rtd")
                        .filter((i, e) => !$(e).hasClass("resnew"))
                        .closest("table")
                        .css("display", "none");
                }
                else {
                    $("div.thre > table > tbody > tr > td.rtd")
                        .filter((i, e) => !$(e).hasClass("resnew"))
                        .closest("table")
                        .css("display", "");
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
                const res = $("div.thre table > tbody > tr > td.rtd > span:first-child");
                const resnew = res.filter((i, e) => {
                    var _a;
                    const resnum = parseInt((_a = e.textContent) !== null && _a !== void 0 ? _a : "0");
                    const res = $(e).parent();
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
                $("#contres > a").on("click", (e, param) => {
                    setTimeout((retry, param) => this.onTimer(retry, param), 100, 10, param);
                });
            }
            update(param) {
                $("#contres > a").trigger("click", param);
            }
        }
        class ResMode {
            constructor(key) {
                const cat = loadCatalog();
                const res = $("div.thre > table > tbody > tr > td.rtd");
                if (cat[key] != null) {
                    cat[key].res = res.length;
                    cat[key].updateTime = Date.now();
                    cat[key].readres = res.length;
                }
                else {
                    cat[key] = {
                        href: location.href.replace(/^https?:\/\/\w+\.2chan.net\/b\//, ""),
                        res: res.length,
                        readres: res.length,
                        title: document.title.replace(/ - ..*$/, ""),
                        updateTime: Date.now(),
                        offset: 0,
                    };
                }
                saveCatalog(cat, "1");
                // render marker
                res.removeClass("resnew");
                if (cat[key].readres >= 0) {
                    res.slice(cat[key].readres).addClass("resnew");
                }
                else {
                    res.addClass("resnew");
                }
                // preserve pos
                if (cat[key].offset > 0) {
                    window.scrollTo(0, cat[key].offset + window.innerHeight * 0.8);
                }
                this.key = key;
                // install components
                this.updater = new Updater(key);
                this.updater.watch();
                this.autoScr = new AutoScroller();
                const select = new AutoUpdateSelect(this, ["OFF", 0], ["SCR", 0], // auto-scroll, no auto-update
                ["15s", 15], ["30s", 30], ["1min", 60]);
                const gallery = new Gallery();
                const treeview = new TreeView();
                const command = new Command(gallery, treeview);
                $("body").append(this.autoScr.status());
                $("body").append($('<div id="commands">').append(command.buttons(), " ", select.get()));
                $(window).on("keydown", (e) => this.onHotkey(e));
                $(window).on("unload", () => this.onUnload());
                $("div.thre").on("mouseover", (e) => this.onPlayVideo(e));
                $("div.thre").on("mouseout", (e) => this.onCloseVideo(e));
                $("div.thre").on("click", (e, suppress) => this.onClick(e, suppress));
            }
            seek(resno) {
                var _a, _b;
                const res = $("div.thre > table > tbody > tr > td.rtd");
                document.body.scrollTo(0, (_b = (_a = res.eq(resno).offset()) === null || _a === void 0 ? void 0 : _a.top) !== null && _b !== void 0 ? _b : 0);
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
        if ($("div.thre").length === 0) {
            return; // thread is dead
        }
        const key = getKey(domain, location.href);
        if (key == null) {
            return;
        }
        new ResMode(key);
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
