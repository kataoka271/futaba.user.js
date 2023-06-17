GM_registerMenuCommand("履歴削除", () => {
  GM_deleteValue("cat");
  GM_deleteValue("update");
});

function main(): void {
  const mo = /^https?:\/\/(\w+)\./.exec(location.href);
  const domain: string = mo == null ? "" : mo[1];

  if (/futaba\.php\?mode=cat\b/.test(location.href)) {
    onCatMode(domain);
  } else {
    onResMode(domain);
  }
}

main();
