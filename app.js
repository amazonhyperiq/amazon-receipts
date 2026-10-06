const $=id=>document.getElementById(id);
const months=["كانون الثاني - January","شباط - February","آذار - March","نيسان - April","أيار - May","حزيران - June","تموز - July","آب - August","أيلول - September","تشرين الأول - October","تشرين الثاني - November","كانون الأول - December"];
const monthShort=["كانون الثاني","شباط","آذار","نيسان","أيار","حزيران","تموز","آب","أيلول","تشرين الأول","تشرين الثاني","كانون الأول"];
const fmt=n=>Number(n||0).toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2});
const fmtIQD=n=>Number(n||0).toLocaleString("en-US",{maximumFractionDigits:2});
const esc=s=>String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[m]));
function wordsAr(value,currency){let n=Math.round(Number(value||0));if(!n)return currency==="USD"?"صفر دولار أمريكي فقط لا غير":"صفر دينار عراقي فقط لا غير";const ones=["","واحد","اثنان","ثلاثة","أربعة","خمسة","ستة","سبعة","ثمانية","تسعة"],teens=["عشرة","أحد عشر","اثنا عشر","ثلاثة عشر","أربعة عشر","خمسة عشر","ستة عشر","سبعة عشر","ثمانية عشر","تسعة عشر"],tens=["","","عشرون","ثلاثون","أربعون","خمسون","ستون","سبعون","ثمانون","تسعون"],scales=["","ألف","مليون","مليار","تريليون"];
function tri(x){let h=Math.floor(x/100),r=x%100,a=[];if(h)a.push(h===1?"مائة":h===2?"مائتان":ones[h]+" مائة");if(r){if(r<10)a.push(ones[r]);else if(r<20)a.push(teens[r-10]);else a.push(tens[Math.floor(r/10)]+(r%10?" و"+ones[r%10]:""));}return a.join(" و");}
let parts=[],i=0;while(n){let x=n%1000;if(x){let t=tri(x);if(i===1)t=x===1?"ألف":x===2?"ألفان":x>=3&&x<=10?tri(x)+" آلاف":t+" آلاف";else if(i===2)t=x===1?"مليون":x===2?"مليونان":x>=3&&x<=10?tri(x)+" ملايين":t+" مليون";else if(i===3)t=x===1?"مليار":x===2?"ملياران":x>=3&&x<=10?tri(x)+" مليارات":t+" مليار";parts.unshift(t)}n=Math.floor(n/1000);i++}let s=parts.join(" و");return s+(currency==="USD"?" دولار أمريكي فقط لا غير":" دينار عراقي فقط لا غير")}

const SUPABASE_URL="https://vvexorzjkpwduykinwsw.supabase.co";
const SUPABASE_KEY="sb_publishable_RoMHq19grLJWNu95uPSwug_XwiKt2bB";
const db=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY);
let dbReady=false; let saveTimer=null; let loadingDb=false; let currentMonthId=null;
function dbToast(msg){console.log(msg)}
function debounceSave(){clearTimeout(saveTimer);saveTimer=setTimeout(()=>saveCurrentMonth(),700)}
async function loadBeneficiaries(){
  const {data,error}=await db.from("building_beneficiaries").select("id,name,unit,units").eq("is_active",true).order("created_at",{ascending:true});
  if(error) throw error;
  const tb=$("beneficiaryEditor").querySelector("tbody"); tb.innerHTML="";
  (data||[]).forEach(b=>addBeneficiary(b.name,b.unit,b.units,b.id,false));
  if(!(data||[]).length) addBeneficiary("","","1",crypto.randomUUID(),false);
}
async function ensureMonth(){
  const year=Number($("exYear").value), month=Number($("exMonth").value);
  let {data,error}=await db.from("building_expense_months").select("id,report_no,note").eq("year",year).eq("month",month).maybeSingle();
  if(error) throw error;
  if(!data){const r=await db.from("building_expense_months").insert({year,month,report_no:"1",note:""}).select("id,report_no,note").single();if(r.error)throw r.error;data=r.data}
  currentMonthId=data.id; $("exReportNo").value=data.report_no||"1"; $("expenseNote").value=data.note||""; return data.id;
}
async function loadMonthExpenses(){
  if(!currentMonthId) return;
  const {data,error}=await db.from("building_expenses").select("id,name,type,beneficiary_id,amount,details,note,sort_order").eq("month_id",currentMonthId).order("sort_order",{ascending:true}).order("created_at",{ascending:true});
  if(error) throw error; const tb=$("expenseEditor").querySelector("tbody"); tb.innerHTML="";
  (data||[]).forEach(x=>{
    const idx=[...$("beneficiaryEditor").querySelectorAll("tbody tr")].findIndex(r=>r.dataset.id===x.beneficiary_id);
    addExpenseRow(x.name,x.amount,x.details,x.note,x.type,idx>=0?String(idx):"",x.id,false);
  });
  if(!(data||[]).length) addExpenseRow("","","","","عام","",crypto.randomUUID(),false);
}
async function loadFromDB(){
  loadingDb=true; try{await loadBeneficiaries();await ensureMonth();await loadMonthExpenses();calcExpenses();dbReady=true;console.log("Amazon receipts database loaded");}
  catch(e){console.error(e);alert("تعذر تحميل البيانات المحفوظة من قاعدة البيانات: "+(e.message||e));}
  finally{loadingDb=false}
}
async function saveCurrentMonth(){
  if(!dbReady||loadingDb||!currentMonthId)return;
  try{
    const beneficiaryRows=[...$("beneficiaryEditor").querySelectorAll("tbody tr")];
    const keep=[];
    for(let i=0;i<beneficiaryRows.length;i++){
      const r=beneficiaryRows[i]; const id=r.dataset.id||crypto.randomUUID(); r.dataset.id=id;
      const payload={id,name:r.querySelector(".bn-name").value.trim(),unit:r.querySelector(".bn-unit").value.trim(),units:Number(r.querySelector(".bn-units").value||0)||0,is_active:true};
      if(!payload.name) continue; const {error}=await db.from("building_beneficiaries").upsert(payload,{onConflict:"id"}); if(error)throw error; keep.push(id);
    }
    if(keep.length){const {data:all}=await db.from("building_beneficiaries").select("id");const remove=(all||[]).map(x=>x.id).filter(id=>!keep.includes(id));if(remove.length)await db.from("building_beneficiaries").update({is_active:false}).in("id",remove)}
    const {error:me}=await db.from("building_expense_months").update({report_no:$("exReportNo").value||"1",note:$("expenseNote").value||"",updated_at:new Date().toISOString()}).eq("id",currentMonthId);if(me)throw me;
    await db.from("building_expenses").delete().eq("month_id",currentMonthId);
    const benRows=[...$("beneficiaryEditor").querySelectorAll("tbody tr")];
    const expenses=expenseData().map((x,i)=>({month_id:currentMonthId,name:x.name.trim(),type:x.type,beneficiary_id:x.type==="خاص"?benRows[Number(x.beneficiaryIndex)]?.dataset.id:null,amount:x.amt,details:x.det,note:x.note,sort_order:i})).filter(x=>x.name||x.amount||x.details||x.note);
    if(expenses.length){const {error:ee}=await db.from("building_expenses").insert(expenses);if(ee)throw ee}
    localStorage.setItem("rentReceiptNo",localStorage.getItem("rentReceiptNo")||"1000");
  }catch(e){console.error(e);alert("لم يتم حفظ البيانات: "+(e.message||e))}
}
async function saveRentReceipt(){
  if(!validateRent())return;
  try{const {data:no,error:nerr}=await db.rpc("next_rent_receipt_no");if(nerr)throw nerr;const receiptNo=Number(no);$("rentNo").value=receiptNo;
    const payload={receipt_no:receiptNo,receipt_date:$("rentDate").value||new Date().toISOString().slice(0,10),po:$("po").value||"",v_no:$("vNo").value||"",tenant:$("tenant").value.trim(),tenant_phone:$("tenantPhone").value||"",floor:$("floor").value||"",rent_year:Number($("rentYear").value),from_month:Number($("rentFromMonth").value),to_month:Number($("rentToMonth").value),annual_rent:Number($("annualRent").value||0),currency:$("currency").value,rate:Number($("rate").value||0),pay_method:$("payMethod").value,description:$("rentDesc").value||"",note:$("rentNote").value||""};
    const {error}=await db.from("rent_receipts").insert(payload);if(error)throw error;localStorage.setItem("rentReceiptNo",String(receiptNo));alert("تم حفظ إيصال الإيجار رقم "+receiptNo+" بنجاح");renderRent();
  }catch(e){console.error(e);alert("تعذر حفظ إيصال الإيجار: "+(e.message||e))}
}
function showPage(p){document.querySelectorAll(".page").forEach(x=>x.classList.remove("active"));$(p).classList.add("active");document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===p))}
document.querySelectorAll(".nav-btn").forEach(b=>b.onclick=()=>showPage(b.dataset.page));
const now=new Date();const currentYear=now.getFullYear(),currentMonth=now.getMonth();
months.forEach((m,i)=>{
  $("exMonth").insertAdjacentHTML("beforeend",`<option value="${i}">${m}</option>`);
  $("rentFromMonth").insertAdjacentHTML("beforeend",`<option value="${i}">${m}</option>`);
  $("rentToMonth").insertAdjacentHTML("beforeend",`<option value="${i}">${m}</option>`);
});
$("exYear").value=currentYear;$("exMonth").value=currentMonth;$("rentYear").value=currentYear;$("rentFromMonth").value=currentMonth;$("rentToMonth").value=currentMonth;
function beneficiaryOptions(selected=""){
  const rows=[...document.querySelectorAll("#beneficiaryEditor tbody tr")];
  return rows.map((r,i)=>{
    const id=String(i);
    const name=r.querySelector(".bn-name").value.trim()||`المستفيد ${i+1}`;
    return `<option value="${id}" ${String(selected)===id?"selected":""}>${esc(name)}</option>`;
  }).join("");
}
function refreshExpenseBeneficiarySelects(){
  document.querySelectorAll("#expenseEditor tbody tr").forEach(r=>{
    const sel=r.querySelector(".en-beneficiary");
    if(!sel) return;
    const old=sel.value;
    sel.innerHTML=`<option value="">اختر المستفيد</option>${beneficiaryOptions(old)}`;
    sel.disabled=r.querySelector(".en-type").value!=="خاص";
    if(old && ![...sel.options].some(o=>o.value===old)) sel.value="";
  });
}
function addExpenseRow(name="",amount="",details="",note="",type="عام",beneficiary="",id="",autoSave=true){
  const tb=$("expenseEditor").querySelector("tbody");
  tb.insertAdjacentHTML("beforeend",`<tr>
    <td></td>
    <td><input class="en-name" value="${esc(name)}"></td>
    <td><select class="en-type"><option value="عام" ${type!=="خاص"?"selected":""}>عام — على جميع المستفيدين</option><option value="خاص" ${type==="خاص"?"selected":""}>خاص — لمستفيد واحد</option></select></td>
    <td><select class="en-beneficiary"><option value="">اختر المستفيد</option>${beneficiaryOptions(beneficiary)}</select></td>
    <td><input class="en-amt" type="number" min="0" step="0.01" value="${esc(amount)}"></td>
    <td><input class="en-det" value="${esc(details)}"></td>
    <td><input class="en-note" value="${esc(note)}"></td>
    <td><button class="del">حذف</button></td>
  </tr>`);
  const r=tb.lastElementChild;
  if(id) r.dataset.id=id; else r.dataset.id=crypto.randomUUID();
  const typeSel=r.querySelector(".en-type"), benSel=r.querySelector(".en-beneficiary");
  const sync=()=>{benSel.disabled=typeSel.value!=="خاص";if(typeSel.value!=="خاص")benSel.value="";calcExpenses()};
  typeSel.onchange=sync;benSel.onchange=calcExpenses;
  r.querySelector(".del").onclick=()=>{r.remove();renumber("expenseEditor");calcExpenses()};
  r.querySelectorAll("input").forEach(x=>x.oninput=calcExpenses);
  sync();renumber("expenseEditor");calcExpenses(); if(autoSave)debounceSave();
}
function renumber(id){document.querySelectorAll(`#${id} tbody tr`).forEach((r,i)=>r.cells[0].textContent=i+1)}
function addBeneficiary(name="",unit="",units="1",id="",autoSave=true){
  const tb=$("beneficiaryEditor").querySelector("tbody");
  tb.insertAdjacentHTML("beforeend",`<tr><td></td><td><input class="bn-name" value="${esc(name)}"></td><td><input class="bn-unit" value="${esc(unit)}"></td><td><input class="bn-units" type="number" min="0.5" step="0.5" value="${esc(units)}"></td><td class="share">0</td><td class="shareWords">—</td><td class="editor-signature"></td><td><button class="receipt-btn">طباعة الوصل</button></td><td><button class="del">حذف</button></td></tr>`);
  const r=tb.lastElementChild;
  r.dataset.id=id||crypto.randomUUID();
  r.querySelector(".del").onclick=()=>{r.remove();renumber("beneficiaryEditor");refreshExpenseBeneficiarySelects();calcExpenses();debounceSave()};
  r.querySelector(".receipt-btn").onclick=()=>openExpenseReceipt(r);
  const unitInput=r.querySelector(".bn-units");
  unitInput.addEventListener("change",()=>{let v=Math.max(0.5,Math.round(Number(unitInput.value||0.5)*2)/2);unitInput.value=v;calcExpenses()});
  r.querySelectorAll("input").forEach(x=>x.oninput=()=>{refreshExpenseBeneficiarySelects();calcExpenses();debounceSave()});
  renumber("beneficiaryEditor");refreshExpenseBeneficiarySelects();calcBeneficiaries(); if(autoSave)debounceSave();
}
function expenseData(){return [...document.querySelectorAll("#expenseEditor tbody tr")].map(r=>({
  name:r.querySelector(".en-name").value,
  type:r.querySelector(".en-type").value,
  beneficiaryIndex:r.querySelector(".en-beneficiary").value,
  amt:Number(r.querySelector(".en-amt").value||0),
  det:r.querySelector(".en-det").value,
  note:r.querySelector(".en-note").value
}))}
function expenseTotals(){
  const data=expenseData();
  const generalTotal=data.filter(x=>x.type!=="خاص").reduce((s,x)=>s+x.amt,0);
  const privateTotal=data.filter(x=>x.type==="خاص").reduce((s,x)=>s+x.amt,0);
  const overallTotal=generalTotal+privateTotal;
  return {data,generalTotal,privateTotal,overallTotal};
}
function calcBeneficiaries(){
  const {data,generalTotal}=expenseTotals();
  const rows=[...document.querySelectorAll("#beneficiaryEditor tbody tr")];
  const units=rows.reduce((s,r)=>s+Math.max(0,Number(r.querySelector(".bn-units").value||0)),0);
  rows.forEach((r,i)=>{
    const u=Math.max(0,Number(r.querySelector(".bn-units").value||0));
    const generalShare=units?generalTotal*u/units:0;
    const privateExpenses=data.filter(x=>x.type==="خاص"&&String(x.beneficiaryIndex)===String(i));
    const privateTotal=privateExpenses.reduce((s,x)=>s+x.amt,0);
    const share=generalShare+privateTotal;
    r.dataset.generalShare=String(generalShare);
    r.dataset.privateTotal=String(privateTotal);
    r.dataset.privateItems=JSON.stringify(privateExpenses);
    r.querySelector(".share").textContent=fmtIQD(share)+" د.ع";
    r.querySelector(".shareWords").textContent=wordsAr(share,"IQD");
  });
  renderExpense();
}
function calcExpenses(){const {generalTotal,privateTotal}=expenseTotals();$("expenseTotal").textContent=fmtIQD(generalTotal)+" د.ع عام | "+fmtIQD(privateTotal)+" د.ع خاص";calcBeneficiaries()}
function renderExpense(){
  const {data,generalTotal,privateTotal}=expenseTotals();
  const rows=data.map((x,i)=>`<tr><td>${i+1}</td><td>${esc(x.name)}</td><td>${esc(x.type)}</td><td>${x.type==="خاص"?esc((document.querySelectorAll("#beneficiaryEditor tbody tr")[Number(x.beneficiaryIndex)]?.querySelector(".bn-name")?.value)||"—"):"—"}</td><td>${fmtIQD(x.amt)}</td><td>${esc(x.det)}</td><td>${esc(x.note)}</td></tr>`).join("");
  const bs=[...document.querySelectorAll("#beneficiaryEditor tbody tr")].map(r=>`<tr><td>${esc(r.querySelector(".bn-name").value)}</td><td>${esc(r.querySelector(".bn-unit").value)}</td><td>${esc(r.querySelector(".bn-units").value)}</td><td>${r.querySelector(".share").textContent}</td><td>${esc(r.querySelector(".shareWords").textContent)}</td><td class="signature-cell">&nbsp;</td></tr>`).join("");
  $("expensePreview").innerHTML=`<div class="report-shell"><div class="report-header"><div class="ar"><h1>شركة المجموعة الدولية</h1><h2>للتجهيزات الزراعية والإنتاج الحيواني</h2></div><img src="logo.png" alt="IG"><div class="en"><h1>INTERNATIONAL GROUP</h1><h2>OF AGRICULTURAL EQUIPMENT<br>AND LIVESTOCK PRODUCTION</h2></div></div><div class="report-title"><h1>مصاريف بناية أمزون</h1><div class="en">AMAZON BUILDING — MONTHLY EXPENSE REPORT</div></div><div class="report-body"><div class="meta-grid"><div class="cell"><div class="lbl">السنة</div><div class="val">${esc($("exYear").value)}</div></div><div class="cell"><div class="lbl">الشهر</div><div class="val">${esc($("exMonth").selectedOptions[0].text)}</div></div><div class="cell"><div class="lbl">رقم التقرير</div><div class="val">${esc($("exReportNo").value)}</div></div><div class="cell"><div class="lbl">عدد الوحدات الكلي</div><div class="val">${[...document.querySelectorAll(".bn-units")].reduce((s,x)=>s+Number(x.value||0),0)}</div></div></div><div class="section-ribbon">تفاصيل المصاريف والخدمات <span class="en">Expense &amp; Services Details</span></div><table class="styled-table"><thead><tr><th>#</th><th>جهة المصروف / الخدمة</th><th>النوع</th><th>المستفيد الخاص</th><th>المبلغ (د.ع)</th><th>التفاصيل</th><th>الملاحظات</th></tr></thead><tbody>${rows}</tbody></table><div class="report-total"><span>مجموع المصاريف العامة</span><span>${fmtIQD(generalTotal)} د.ع</span><span>مجموع المصاريف الخاصة</span><span>${fmtIQD(privateTotal)} د.ع</span></div><div class="section-ribbon">حصص المستفيدين <span class="en">Beneficiary Shares</span></div><table class="styled-table"><thead><tr><th>المستفيد</th><th>الوحدة / الطابق</th><th>الوحدات</th><th>الحصة النهائية</th><th>المبلغ كتابةً</th><th>توقيع المستلم</th></tr></thead><tbody>${bs}</tbody></table><div class="report-note">${esc($("expenseNote").value||"")}</div></div><div class="report-footer">شركة المجموعة الدولية للتجهيزات الزراعية والإنتاج الحيواني — INTERNATIONAL GROUP OF AGRICULTURAL EQUIPMENT AND LIVESTOCK PRODUCTION</div></div>`
}
function buildExpenseReceipt(row,no){
  const {generalTotal}=expenseTotals();
  const rows=[...document.querySelectorAll("#beneficiaryEditor tbody tr")];
  const units=rows.reduce((s,r)=>s+Number(r.querySelector(".bn-units").value||0),0);
  const u=Number(row.querySelector(".bn-units").value||0);
  const generalShare=Number(row.dataset.generalShare||0);
  const privateItems=JSON.parse(row.dataset.privateItems||"[]");
  const privateTotal=Number(row.dataset.privateTotal||0);
  const share=generalShare+privateTotal;
  const privateHtml=privateItems.length?`<div class="private-summary"><div class="private-title">المصاريف الخاصة بالمستفيد</div>${privateItems.map(x=>`<div class="private-line"><span>${esc(x.name||"مصروف خاص")}</span><strong>${fmtIQD(x.amt)} د.ع</strong></div>`).join("")}<div class="private-line total"><span>مجموع المصاريف الخاصة</span><strong>${fmtIQD(privateTotal)} د.ع</strong></div></div>`:`<div class="private-summary"><div class="private-title">المصاريف الخاصة بالمستفيد</div><div class="private-line"><span>لا توجد</span><strong>0 د.ع</strong></div></div>`;
  return `<div class="receipt-shell"><div class="receipt-top"><div class="head-side ar"><h1>شركة المجموعة الدولية</h1><h2>للتجهيزات الزراعية والإنتاج الحيواني</h2></div><div class="logo-center"><img src="logo.png" alt="IG"></div><div class="head-side en"><h1>INTERNATIONAL GROUP</h1><h2>OF AGRICULTURAL EQUIPMENT<br>AND LIVESTOCK PRODUCTION</h2></div></div><div class="title-ribbon"><h1>إيصال قبض مصاريف بناية أمزون</h1><div class="en">EXPENSE PAYMENT RECEIPT</div></div><div class="receipt-body"><div class="meta-grid"><div class="cell"><div class="lbl">رقم الإيصال / Receipt No.</div><div class="val">${no}</div></div><div class="cell"><div class="lbl">التاريخ / Date</div><div class="val">${formatDate(new Date())}</div></div><div class="cell"><div class="lbl">السنة / Year</div><div class="val">${esc($("exYear").value)}</div></div><div class="cell"><div class="lbl">الشهر / Month</div><div class="val">${esc($("exMonth").selectedOptions[0].text)}</div></div><div class="cell"><div class="lbl">اسم المستفيد</div><div class="val">${esc(row.querySelector(".bn-name").value)}</div></div><div class="cell"><div class="lbl">الوحدة / الطابق</div><div class="val">${esc(row.querySelector(".bn-unit").value)}</div></div></div><div class="section-ribbon">تفاصيل الاستحقاق <span class="en">Payment Details</span></div><table class="styled-table"><tr><th>مجموع المصاريف العامة</th><td>${fmtIQD(generalTotal)} د.ع</td></tr><tr><th>عدد وحدات المستفيد</th><td>${u}</td></tr><tr><th>مجموع الوحدات</th><td>${units}</td></tr><tr><th>الحصة العامة للمستفيد</th><td>${fmtIQD(generalShare)} د.ع</td></tr></table>${privateHtml}<div class="amount-banner"><div class="label">المجموع النهائي المستحق</div><div class="value">${fmtIQD(share)} د.ع</div></div><div class="amount-banner"><div class="label">المبلغ كتابةً</div><div class="value">${wordsAr(share,"IQD")}</div></div><div class="red-note-print">${esc($("expenseNote").value||"")}</div><div class="sign-row"><div class="sign">توقيع المستفيد<br>Beneficiary Signature</div><div class="sign">توقيع الإدارة<br>Management Signature</div></div></div><div class="receipt-footer"><div class="f"><strong>للاستعلام / Contact</strong><br>________________</div><div class="f"><strong>شركة المجموعة الدولية</strong><br>للتجهيزات الزراعية والإنتاج الحيواني</div><div class="f"><strong>INTERNATIONAL GROUP</strong><br>OF AGRICULTURAL EQUIPMENT AND LIVESTOCK PRODUCTION</div></div></div>`;
}
function openExpenseReceipt(row){
  calcBeneficiaries();
  const {generalTotal}=expenseTotals();
  window.__expenseOverallTotal=generalTotal;
  const no=nextNumber("expenseReceiptNo");
  $("expenseReceiptPreview").dataset.no=no;
  $("expenseReceiptPreview").innerHTML=buildExpenseReceipt(row,no);
  printOnly("expenseReceiptPreview",true);
}
function printAllExpenseReceipts(){
  calcBeneficiaries();
  const rows=[...document.querySelectorAll("#beneficiaryEditor tbody tr")];
  if(!rows.length){alert("أضف مستفيدًا واحدًا على الأقل قبل طباعة الإيصالات.");return;}
  const startNo=nextNumber("expenseReceiptNo");
  let no=startNo;
  $("allExpenseReceiptsPreview").innerHTML=rows.map((row,i)=>{
    const html=buildExpenseReceipt(row,no);
    no++;
    return `<div class="individual-receipt-page">${html}</div>`;
  }).join("");
  $("allExpenseReceiptsPreview").dataset.lastNo=no-1;
  document.querySelectorAll(".paper").forEach(x=>x.classList.remove("print-target"));
  const el=$("allExpenseReceiptsPreview");
  el.classList.add("print-target");
  setTimeout(()=>{
    window.print();
    localStorage.setItem("expenseReceiptNo",String(no-1));
    setTimeout(()=>el.classList.remove("print-target"),500);
  },50);
}
function renderRent(){
  const annual=Number($("annualRent").value||0);
  const from=Number($("rentFromMonth").value||0);
  const to=Number($("rentToMonth").value||0);
  const monthsDue=to>=from?to-from+1:0;
  const due=annual*monthsDue/12;
  const cur=$("currency").value;
  const rate=Number($("rate").value||0);
  const amount=cur==="USD"?due:due*rate;
  $("annualDisplay").textContent=fmt(annual)+" USD";
  $("dueUsd").textContent=fmt(due)+" USD";
  $("paidDisplay").textContent=cur==="USD"?fmt(due)+" USD":fmtIQD(amount)+" د.ع";
  $("amountWords").textContent=wordsAr(amount,cur);
  $("rateWrap").style.display=cur==="IQD"?"block":"none";
  const fromText=$("rentFromMonth").selectedOptions[0]?.text||"—";
  const toText=$("rentToMonth").selectedOptions[0]?.text||"—";
  const periodText=monthsDue?`${fromText} → ${toText}`:`${fromText} → ${toText} (فترة غير صحيحة)`;
  $("rentPreview").innerHTML=`<div class="receipt-shell"><div class="receipt-top"><div class="head-side ar"><h1>شركة المجموعة الدولية</h1><h2>للتجهيزات الزراعية والإنتاج الحيواني</h2></div><div class="logo-center"><img src="logo.png" alt="IG"></div><div class="head-side en"><h1>INTERNATIONAL GROUP</h1><h2>OF AGRICULTURAL EQUIPMENT<br>AND LIVESTOCK PRODUCTION</h2></div></div><div class="title-ribbon"><h1>وصل قبض إيجار</h1><div class="en">RENT PAYMENT RECEIPT</div></div><div class="receipt-body"><div class="serial-pair"><div class="serial"><span>#PO</span>${esc($("po").value)}</div><div class="serial"><span>#V</span>${esc($("vNo").value)}</div></div><div class="meta-grid"><div class="cell"><div class="lbl">رقم الوصل / Receipt No.</div><div class="val">${esc($("rentNo").value)}</div></div><div class="cell"><div class="lbl">التاريخ / Date</div><div class="val">${formatDate($("rentDate").value)}</div></div><div class="cell"><div class="lbl">اسم المستأجر / Tenant</div><div class="val">${esc($("tenant").value)}</div></div><div class="cell"><div class="lbl">رقم الهاتف / Phone</div><div class="val">${esc($("tenantPhone").value)}</div></div><div class="cell"><div class="lbl">الطابق / الوحدة</div><div class="val">${esc($("floor").value)}</div></div><div class="cell"><div class="lbl">السنة / Year</div><div class="val">${esc($("rentYear").value)}</div></div><div class="cell"><div class="lbl">فترة الإيجار / Rent Period</div><div class="val">${esc(periodText)}</div></div><div class="cell"><div class="lbl">عدد الأشهر / Months</div><div class="val">${monthsDue||0}</div></div><div class="cell"><div class="lbl">طريقة الدفع / Payment</div><div class="val">${esc($("payMethod").value)}</div></div></div><div class="section-ribbon">تفاصيل الإيجار <span class="en">Rent Payment Details</span></div><table class="styled-table"><tr><th>قيمة الإيجار السنوي (USD)</th><td>${fmt(annual)} USD</td></tr><tr><th>فترة الاستحقاق</th><td>${esc(periodText)}</td></tr><tr><th>عدد أشهر الاستحقاق</th><td>${monthsDue||0} شهر</td></tr><tr><th>الدفعة المستحقة بالدولار</th><td>${fmt(due)} USD</td></tr>${cur==="IQD"?`<tr><th>سعر الصرف</th><td>${fmtIQD(rate)} د.ع / USD</td></tr>`:""}<tr><th>المبلغ المقبوض</th><td>${cur==="USD"?fmt(due)+" USD":fmtIQD(amount)+" د.ع"}</td></tr></table><div class="amount-banner"><div class="label">المبلغ كتابةً</div><div class="value">${wordsAr(amount,cur)}</div></div><div class="section-ribbon">البيان <span class="en">Description</span></div><table class="styled-table"><tr><td>${esc($("rentDesc").value||"—")}</td></tr></table><div class="red-note-print">${esc($("rentNote").value||"")}</div><div class="sign-row"><div class="sign">توقيع المستأجر<br>Tenant Signature</div><div class="sign">توقيع الإدارة<br>Management Signature</div></div></div><div class="receipt-footer"><div class="f"><strong>للاستعلام</strong><br>________________</div><div class="f"><strong>شركة المجموعة الدولية</strong><br>للتجهيزات الزراعية والإنتاج الحيواني</div><div class="f"><strong>INTERNATIONAL GROUP</strong><br>OF AGRICULTURAL EQUIPMENT AND LIVESTOCK PRODUCTION</div></div></div>`
}

function formatDate(v){if(!v)return"";const d=v instanceof Date?v:new Date(v+"T00:00:00");return `${String(d.getDate()).padStart(2,"0")}/${String(d.getMonth()+1).padStart(2,"0")}/${d.getFullYear()}`}
function nextNumber(key){return Number(localStorage.getItem(key)||"1000")+1}
function commitNumber(key,no){localStorage.setItem(key,String(no))}
function printOnly(id,commit=true){document.querySelectorAll(".paper").forEach(x=>x.classList.remove("print-target"));const el=$(id);el.classList.add("print-target");const key=id==="rentPreview"?"rentReceiptNo":"expenseReceiptNo";if(commit&&el.dataset.no)commitNumber(key,Number(el.dataset.no));setTimeout(()=>{window.print();setTimeout(()=>el.classList.remove("print-target"),500)},50)}
function printReport(){renderExpense();printOnly("expensePreview",false)}
function validateRent(){const annual=Number($("annualRent").value||0),rate=Number($("rate").value||0),from=Number($("rentFromMonth").value||0),to=Number($("rentToMonth").value||0);if(!$("tenant").value.trim()){alert("يرجى إدخال اسم المستأجر / الجهة");return false}if(!annual){alert("يرجى إدخال قيمة الإيجار السنوي");return false}if(to<from){alert("يرجى اختيار شهر النهاية مساويًا أو بعد شهر البداية");return false}if($("currency").value==="IQD"&&!rate){alert("عند الدفع بالدينار يجب إدخال سعر الصرف");return false}return true}

function newRent(){const current=Number($("rentNo").value||1000);commitNumber("rentReceiptNo",current);$("rentNo").value=current+1;$("rentDate").value=new Date().toISOString().slice(0,10);$("po").value="";$("vNo").value="";$("tenant").value="";$("tenantPhone").value="";$("floor").value="";$("annualRent").value="";$("rate").value="";$("rentDesc").value="";$("rentNote").value="";renderRent()}
$("addExpense").onclick=()=>addExpenseRow();
$("addBeneficiary").onclick=()=>addBeneficiary();
["exYear","exMonth"].forEach(id=>$(id).addEventListener("change",async()=>{if(!dbReady)return;try{loadingDb=true;await ensureMonth();await loadMonthExpenses();calcExpenses()}catch(e){alert("تعذر تحميل الشهر: "+e.message)}finally{loadingDb=false}}));
["exReportNo","expenseNote"].forEach(id=>$(id).addEventListener("input",()=>{calcExpenses();debounceSave()}));
$("saveExpenseData").onclick=async()=>{await saveCurrentMonth();alert("تم حفظ بيانات المصاريف والمستأجرين بنجاح");};
$("printExpense").onclick=printReport;$ ("pdfExpense").onclick=printReport;$ ("printAllReceipts").onclick=printAllExpenseReceipts;
["rentNo","rentDate","po","vNo","tenant","tenantPhone","floor","rentYear","rentFromMonth","rentToMonth","annualRent","currency","rate","payMethod","rentDesc","rentNote"].forEach(id=>$(id).addEventListener("input",renderRent));
$("currency").addEventListener("change",renderRent);$("rentFromMonth").addEventListener("change",renderRent);$("rentToMonth").addEventListener("change",renderRent);
$("saveRentData").onclick=saveRentReceipt;
$("printRent").onclick=async()=>{if(validateRent()){renderRent();if(dbReady)await saveRentReceipt();printOnly("rentPreview",true)}};
$("pdfRent").onclick=async()=>{if(validateRent()){renderRent();if(dbReady)await saveRentReceipt();printOnly("rentPreview",true)}};
$("rentNo").value="";$ ("rentDate").value=new Date().toISOString().slice(0,10);
renderRent();
loadFromDB();
