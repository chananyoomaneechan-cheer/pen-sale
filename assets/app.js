/* ====== ตั้งค่า ====== */
// วาง URL ของ Apps Script Web App (ที่ลงท้ายด้วย /exec) ระหว่างเครื่องหมายคำพูด
// ถ้าเว้นว่าง เว็บจะอ่านข้อมูลตัวอย่างจากโฟลเดอร์ sheet-csv/ (ใช้ดูตัวอย่างก่อนติดตั้งจริง)
const API_URL = "https://script.google.com/macros/s/AKfycbw8qkDR4CC9qZ2xXpOzAr3vllFufrFp7EMgoGA-9ld5mhwJlbp2HnScxyMaeT56Mod3-A/exec";
const IMG_DIR = "images/";
/* ===================== */

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s == null ? "" : s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const baht = n => Number(n).toLocaleString("th-TH") + " บาท";

function parseCSV(t) {
  t = t.replace(/^﻿/, "");
  const rows = []; let row = [], f = "", q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) { if (c === '"') { if (t[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; }
    else if (c === '"') q = true;
    else if (c === ",") { row.push(f); f = ""; }
    else if (c === "\n" || c === "\r") { if (c === "\r" && t[i + 1] === "\n") i++; row.push(f); rows.push(row); row = []; f = ""; }
    else f += c;
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows.filter(r => r.some(x => x !== ""));
}

let _data;
async function loadData() {
  if (_data) return _data;
  let products = [], settings = {};
  if (API_URL) {
    const r = await fetch(API_URL);
    if (!r.ok) throw new Error("โหลดข้อมูลไม่สำเร็จ");
    const j = await r.json();
    products = j.products || []; settings = j.settings || {};
  } else {
    const [p, s] = await Promise.all([fetch("sheet-csv/products.csv"), fetch("sheet-csv/settings.csv")]);
    if (!p.ok || !s.ok) throw new Error("ไม่พบข้อมูลตัวอย่าง");
    const pr = parseCSV(await p.text()), h = pr.shift();
    products = pr.map(r => Object.fromEntries(h.map((k, i) => [k, r[i] || ""])));
    parseCSV(await s.text()).slice(1).forEach(r => settings[r[0]] = r[1]);
  }
  products = products
    .filter(p => String(p.status).trim() === "แสดง" && p.id)
    .map(p => ({
      ...p,
      price: Number(p.price) || 0,
      stock: Number(p.stock) || 0,
      features: String(p.features || "").split("|").map(x => x.trim()).filter(Boolean),
      images: [p.image_main, p.image_2].map(x => String(x || "").trim()).filter(Boolean)
    }));
  return (_data = { products, settings });
}

function chrome(s, active) {
  const name = esc(s.shop_name || "PEN");
  $("#hdr").outerHTML = `<header class="hdr"><div class="wrap"><a class="logo" href="index.html">${name}</a>
  <nav class="nav"><a href="collection.html" class="${active === "c" ? "on" : ""}">คอลเลกชัน</a><a href="order.html" class="${active === "o" ? "on" : ""}">สั่งซื้อ / ติดต่อ</a></nav></div></header>`;
  const line = s.line_id ? `LINE: ${esc(s.line_id)}` : "", ph = s.phone ? ` · โทร ${esc(s.phone)}` : "";
  $("#ftr").outerHTML = `<footer class="ftr"><div class="wrap"><span class="logo">${name}</span>${line}${ph}<br><small>© ${new Date().getFullYear()} สงวนลิขสิทธิ์</small></div></footer>`;
}

function card(p) {
  const out = p.stock <= 0;
  return `<a class="card fade" href="product.html?id=${encodeURIComponent(p.id)}">
  ${out ? '<span class="tag">หมดชั่วคราว</span>' : ""}
  <div class="ph"><img src="${IMG_DIR}${esc(p.images[0] || "")}" alt="${esc(p.name)}" loading="lazy"></div>
  <div class="bd"><span class="nm">${esc(p.name)}</span><span class="tp">${esc(p.type)}</span><span class="pr">${baht(p.price)}</span></div></a>`;
}

const lineUrl = id => "https://line.me/R/ti/p/" + encodeURIComponent(id || "");
function fail(el, e) { el.innerHTML = `<div class="state">โหลดข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง<br><small>${esc(e.message)}</small></div>`; }
