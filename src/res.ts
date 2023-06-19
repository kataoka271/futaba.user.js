function onResMode(domain: string): void {
  GM_addStyle(`\
@@include("../build/css/res.css")
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
    saved: { [url: string]: number; };

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

    save(): void {
      GM_setValue("saved", JSON.stringify(this.saved));
    }

    has(url: string): boolean {
      return url in this.saved;
    }

    add(url: string): void {
      this.saved[url] = Date.now() + 86400000; // 1 day
      this.save();
    }
  }

  const savedList = new SavedList();

  class ImageViewer {
    images: JQuery<HTMLElement>;
    thumbs: JQuery<HTMLElement>;
    index: number;

    constructor() {
      this.images = $();
      this.thumbs = $();
      this.index = 0;
    }

    page(i: number): void {
      const visible_images = this.images.filter(":visible");
      if (i >= visible_images.length) {
        i = visible_images.length - 1;
      } else if (i < 0) {
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
      } else if (offset > m) {
        $("#image-view > .image-thumbs").css("transform", `translate(-${m}px)`);
      } else {
        $("#image-view > .image-thumbs").css("transform", `translate(-${offset}px)`);
      }
      this.thumbs.removeClass("active");
      this.thumbs.filter(":visible").eq(i).addClass("active");
      this.index = i;
    }

    next(): void {
      this.page(this.index + 1);
    }

    prev(): void {
      this.page(this.index - 1);
    }

    onClose(e: JQuery.TriggeredEvent): void {
      this.destroy();
      e.stopPropagation();
      e.preventDefault();
    }

    onKeyDown(e: JQuery.TriggeredEvent): void {
      if (e.key === "ArrowLeft") {
        this.prev();
      } else if (e.key === "ArrowRight") {
        this.next();
      } else if (e.key === "Escape") {
        this.destroy();
      } else if (e.key === "s") {
        this.save();
      } else {
        return;
      }
      e.stopPropagation();
      e.preventDefault();
    }

    onWheel(e: JQuery.TriggeredEvent): void {
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
    }

    show(image: HTMLAnchorElement): void {
      const anchors = $<HTMLAnchorElement>(q_images).parent();
      this.images = anchors.map((i, anchor) => {
        const ext = anchor.href.split(".").slice(-1)[0].toLowerCase();
        let div: JQuery<HTMLElement>;
        if (ext === "mp4" || ext === "webm") {
          const img = $('<img loading="lazy">').attr("src", $("img", anchor).attr("src") ?? anchor.href);
          div = $('<div class="movie">').append($("<a>").attr("href", anchor.href).append(img));
        } else {
          const img = $('<img loading="lazy">').attr("src", anchor.href);
          div = $("<div>").append($("<a>").attr("href", anchor.href).append(img));
        }
        if (anchor.closest("table")?.classList.contains("resnew")) {
          div.addClass("resnew");
        }
        if (savedList.has(anchor.href)) {
          div.addClass("saved");
        }
        return div.get(0);
      });
      this.thumbs = anchors.map((i, anchor) => {
        const img = $("<div>").append($('<img loading="lazy">').attr("src", $("img", anchor).attr("src") ?? anchor.href));
        if (anchor.closest("table")?.classList.contains("resnew")) {
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

    save(): void {
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
            this.parentNode?.removeChild(this);
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

    destroy(): void {
      $("#gallery").show().trigger("focus");
      $("#image-view").remove();
      $("body").removeClass("image-view-mode");
    }
  }

  class Gallery {
    imageViewer: ImageViewer;

    constructor() {
      this.imageViewer = new ImageViewer();
    }

    create(): void {
      const anchors = $<HTMLAnchorElement>(q_images).parent();
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

    onClose(e: JQuery.TriggeredEvent): void {
      this.destroy();
      e.stopPropagation();
      e.preventDefault();
    }

    onKeyDown(e: JQuery.TriggeredEvent): void {
      if (e.key === "Escape" || e.key === "Esc") {
        this.destroy();
        e.stopPropagation();
        e.preventDefault();
      }
    }

    onClick(e: JQuery.TriggeredEvent): void {
      if (e.target instanceof HTMLImageElement && e.target.parentElement instanceof HTMLAnchorElement) {
        this.imageViewer.show(e.target.parentElement);
        e.stopPropagation();
        e.preventDefault();
      } else if (e.target instanceof HTMLAnchorElement && e.target.firstElementChild instanceof HTMLImageElement) {
        this.imageViewer.show(e.target);
        e.stopPropagation();
        e.preventDefault();
      }
    }

    quote(anchor: JQuery<HTMLElement>): JQuery<HTMLElement> {
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
    }

    make(anchor: HTMLAnchorElement): JQuery<HTMLElement> {
      const a = $(anchor);
      const ext = anchor.href.split(".").slice(-1)[0].toLowerCase();
      let div;
      if (ext === "mp4" || ext === "webm") {
        div = $('<div class="movie">').append(a.clone().attr("data-ext", ext), this.quote(a));
      } else if (ext === "gif") {
        div = $('<div class="anime">').append(a.clone().attr("data-ext", ext), this.quote(a));
      } else {
        div = $("<div>").append(a.clone(), this.quote(a));
      }
      if (a.closest("table")?.is(".resnew")) {
        div.addClass("resnew");
      }
      if (savedList.has(anchor.href)) {
        div.addClass("saved");
      }
      return div;
    }

    destroy(): void {
      $("#gallery-button").removeClass("enable");
      $("#gallery").remove();
      this.imageViewer.destroy();
      $("body").removeClass("image-view-mode");
    }
  }

  class TreeView {
    make(): void {
      let quotes: { text: string; res: HTMLElement; resnew: boolean; }[] = [];
      $(q_res_notnew).last().after($('<span id="resnew">'));
      $(q_table)
        .toArray()
        .reverse()
        .forEach((table) => {
          const mo = />([^>]+)$/.exec($("blockquote > font", table).last().text());
          const text = $("blockquote, a, span", table).text();
          let clone: JQuery<HTMLElement> | null = null;
          quotes = quotes.filter((item) => {
            if (!text.includes(item.text)) {
              return true;
            }
            if (!table.classList.contains("resnew") && item.resnew) {
              if (clone == null) {
                clone = $(table).clone(true).insertAfter("#resnew").addClass("clone");
              }
              $("blockquote", clone).first().after(item.res);
            } else {
              $("blockquote", table).first().after(item.res);
            }
            return false;
          });
          if (mo != null) {
            quotes.push({ text: mo[1], res: table, resnew: table.classList.contains("resnew") });
          }
        });
    }

    flat(): void {
      const array: JQuery<HTMLElement>[] = [];
      $(q_res_resnum).each((i, e) => {
        const span = $(e);
        const resnum = parseInt(span.text() || "0");
        const table = span.closest("table");
        if (table.hasClass("clone") || array[resnum] != null) {
          table.remove();
        } else {
          array[resnum] = table;
        }
      });
      $(q_maxres).after(array);
      $("#resnew").remove();
    }
  }

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

    start(): void {
      if (this._timer > 0) {
        return;
      }
      this._pause = false;
      this._timer = setTimeout(() => this.onTimer(), this.tm);
    }

    onTimer(): void {
      if (!this._pause) {
        scrollBy({ left: this.dx, top: this.dy, behavior: "smooth" });
      }
      this._timer = setTimeout(() => this.onTimer(), this.tm);
    }

    stop(): void {
      clearTimeout(this._timer);
      this._pause = false;
      this._timer = 0;
    }

    pause(): void {
      this._pause = true;
    }

    resume(): void {
      this._pause = false;
    }

    status(text?: string, sticky?: boolean): JQuery<HTMLElement> {
      if (!this._status) {
        this._status = $('<div id="auto-scroll-status">');
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

  class Command {
    gallery: Gallery;
    treeview: TreeView;

    constructor(gallery: Gallery, treeview: TreeView) {
      this.gallery = gallery;
      this.treeview = treeview;
    }

    buttons(): JQuery<HTMLElement> {
      return $('<a class="cornar-first" id="gallery-button">画像一覧</a>')
        .on("click", (e) => this.toggleGallery(e))
        .add($("<a>画像</a>").on("click", (e) => this.filterImages(e)))
        .add($("<a>新着</a>").on("click", (e) => this.filterResNew(e)))
        .add($('<a class="cornar-last">ツリー表示</a>').on("click", (e) => this.toggleTreeView(e)));
    }

    toggleButton(e: JQuery.TriggeredEvent): boolean {
      e.preventDefault();
      return $(e.target).toggleClass("enable").hasClass("enable");
    }

    toggleGallery(e: JQuery.TriggeredEvent): void {
      if (this.toggleButton(e)) {
        this.gallery.create();
      } else {
        this.gallery.destroy();
      }
    }

    filterImages(e: JQuery.TriggeredEvent): void {
      if (this.toggleButton(e)) {
        $("body").addClass("filter-images");
      } else {
        $("body").removeClass("filter-images");
      }
    }

    filterResNew(e: JQuery.TriggeredEvent): void {
      if (this.toggleButton(e)) {
        $("body").addClass("filter-resnew");
      } else {
        $("body").removeClass("filter-resnew");
      }
    }

    toggleTreeView(e: JQuery.TriggeredEvent): void {
      if (this.toggleButton(e)) {
        this.treeview.make();
      } else {
        this.treeview.flat();
      }
    }
  }

  interface UpdateParam {
    preserve: boolean;
  }

  class ReloadWatcher {
    _key: string;
    _resMode?: ResMode;

    constructor(key: string) {
      this._key = key;
    }

    onTimer(item: CatalogItem, retry: number, param?: UpdateParam): void {
      const res = $(q_res_resnum);
      const resnew = res.filter((i, e) => {
        const resnum = parseInt(e.textContent ?? "0");
        const res = $(e).closest("table");
        if (resnum > item.readres) {
          res.addClass("resnew");
          return true;
        } else {
          res.removeClass("resnew");
          return false;
        }
      });
      if (resnew.length > 0 && !param?.preserve) {
        item.res = res.length;
        item.readres = res.length;
        if (this._resMode != null) {
          item.offset = this._resMode.getResNumFromScrollPosition();
          this._resMode.insertReadMarker(item.offset);
        }
        const newcat = loadCatalog();
        newcat[this._key] = item;
        saveCatalog(newcat, true);
      } else if (retry > 0) {
        setTimeout(this.onTimer.bind(this), 100, item, retry - 1, param);
      }
    }

    start(resMode?: ResMode): void {
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

    trigger(param?: UpdateParam): void {
      $(q_contres).trigger("click", param);
    }
  }

  class ResMode {
    key: string;
    watcher: ReloadWatcher;
    autoScr: AutoScroller;

    constructor(key: string) {
      const cat = loadCatalog();
      const res = $(q_res).closest("table");
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
      // render marker
      res.removeClass("resnew");
      if (cat[key].readres >= 0) {
        res.slice(cat[key].readres).addClass("resnew");
      } else {
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
      const select = new AutoUpdateSelection(
        this,
        ["OFF", 0],
        ["SCR", 0], // auto-scroll, no auto-update
        ["15s", 15],
        ["30s", 30],
        ["1min", 60]
      );
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
      $(q_thre).on("click", (e, suppress?) => this.onClick(e, suppress));
    }

    setScrollPositionFromResNum(resnum: number): void {
      const offset = $(q_table).eq(resnum - 1).offset();
      if (offset == null) {
        return;
      }
      window.scroll(0, offset.top);
    }

    getResNumFromScrollPosition(): number {
      return Math.max.apply(null, $(q_table).map((i, e) => {
        const res = $(e);
        const offset = res.offset();
        const height = res.height();
        if (offset != null && height != null && offset.top + height <= window.scrollY + window.innerHeight) {
          return parseInt($("span:first-child", e).eq(0).text());
        }
      }).get());
    }

    insertReadMarker(resnum: number): void {
      $("#readmarker").remove();
      if (resnum <= 0) {
        return;
      }
      // marker is not set when resnum equals to or over the last (i.e. resnum >= $(q_table).length)
      $(q_table).eq(resnum).before('<div id="readmarker"><span>ここまで読んだ</span> <hr> <span>ここまで読んだ</span></div>');
    }

    onClick(e: JQuery.TriggeredEvent, suppress?: boolean): void {
      if (suppress) {
        return;
      }
      if (e.target.tagName === "A" && e.target.firstChild.tagName === "IMG") {
        const imageViewer = new ImageViewer();
        imageViewer.show(e.target);
        e.preventDefault();
        e.stopPropagation();
      } else if (e.target.tagName === "IMG" && e.target.parentElement.tagName === "A") {
        const imageViewer = new ImageViewer();
        imageViewer.show(e.target.parentElement);
        e.preventDefault();
        e.stopPropagation();
      }
    }

    onHotkey(e: JQuery.TriggeredEvent): void {
      if (document.activeElement?.tagName === "INPUT") {
        return;
      }
      const autoScr = this.autoScr;
      if (e.key === "a" && this.autoScr.tm / 2 >= 100) {
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
        this.watcher.trigger();
      }
    }

    onUnload(): void {
      const newcat = loadCatalog();
      newcat[this.key].offset = this.getResNumFromScrollPosition();
      saveCatalog(newcat, true);
    }

    onUpdate(): void {
      this.watcher.trigger({ preserve: true });
    }

    onSelect(text: string, value: number): void {
      console.log("auto-scroll", text, value);
      if (text === "OFF") {
        this.autoScr.stop();
        this.autoScr.status("auto-scroll stopped");
      } else {
        this.autoScr.start();
        this.autoScr.status("auto-scroll started");
      }
    }

    onPlayVideo(e: JQuery.TriggeredEvent): void {
      if (e.target.tagName === "IMG" && e.target.parentElement?.tagName === "A") {
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
        } else if (ext === "gif") {
          img.data("thumb", src).attr("src", href);
          e.stopPropagation();
        }
      }
    }

    onCloseVideo(e: JQuery.TriggeredEvent): void {
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
