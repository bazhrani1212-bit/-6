const $ = (sel) => document.querySelector(sel);

const state = { grade: null, lesson: null, tab: "diagnostic" };
const LS_KEY = "SCI_ASSESS_1447_LATEST_V1";

/* ===== Storage ===== */
function loadStore(){
  try { return JSON.parse(localStorage.getItem(LS_KEY) || "{}"); }
  catch { return {}; }
}
function saveStore(obj){ localStorage.setItem(LS_KEY, JSON.stringify(obj)); }
function resetStore(){ localStorage.removeItem(LS_KEY); }

function lessonKey(gradeNum, lessonTitle){ return `g${gradeNum}::${lessonTitle}`; }

/* ===== UI ===== */
function renderGradesNav(){
  const nav = $("#gradesNav");
  nav.innerHTML = "";
  window.CURRICULUM_1447.grades.forEach(g => {
    const btn = document.createElement("button");
    btn.className = "grade-btn" + (state.grade?.grade === g.grade ? " active" : "");
    btn.innerHTML = `<span>📚 ${g.name}</span><span class="badge">${g.grade}</span>`;
    btn.onclick = () => {
      state.grade = g; state.lesson = null; state.tab = "diagnostic";
      updateHash(); render();
    };
    nav.appendChild(btn);
  });
}

function viewHome(){
  return `
    <div class="card">
      <div class="row">
        <span class="badge">✅ تشخيصي + تكويني = PDF A4 بأسئلة جاهزة تلقائيًا</span>
        <span class="badge">✅ ختامي = اختبار إلكتروني ذكي جاهز</span>
        <span class="badge">😊 تغذية راجعة + رموز</span>
      </div>
      <div class="hr"></div>
      <h2 style="margin:0 0 6px">اختاري الصف ثم الترم ثم الدرس</h2>
      <p class="note" style="margin:0">كل درس فيه 3 أنواع تقويم. يمكنك تعديل أي سؤال ثم حفظه.</p>
    </div>
  `;
}

function viewGrade(g){
  const termCards = g.terms.map(t => {
    const items = t.lessons.map(lsn => `
      <li class="item" data-lesson="${escapeHtml(lsn)}">
        <div class="title">
          <span class="t">${escapeHtml(lsn)}</span>
          <small>افتحي التقويم</small>
        </div>
      </li>
    `).join("");
    return `
      <div class="card">
        <div class="row" style="justify-content:space-between;align-items:center">
          <h2 style="margin:0;font-size:16px">${t.title}</h2>
          <span class="badge">عدد الدروس: ${t.lessons.length}</span>
        </div>
        <div class="hr"></div>
        <ul class="list">${items}</ul>
      </div>
    `;
  }).join("");
  return `<div class="grid2">${termCards}</div>`;
}

function viewLesson(g, lessonTitle){
  const tabs = [
    {id:"diagnostic", label:"🔎 تشخيصي (PDF)"},
    {id:"formative",  label:"🧩 تكويني (PDF)"},
    {id:"summative",  label:"📝 ختامي (إلكتروني)"}
  ];

  const tabsHtml = `
    <div class="tabs">
      ${tabs.map(t => `
        <button class="tab ${state.tab===t.id?"active":""}" data-tab="${t.id}">
          ${t.label}
        </button>
      `).join("")}
    </div>
  `;

  const body = state.tab === "summative"
    ? viewQuizEditor(g.grade, lessonTitle)
    : viewWorksheetEditor(g.grade, lessonTitle, state.tab);

  return `
    <div class="card">
      <div class="row" style="justify-content:space-between;align-items:center">
        <div>
          <div class="badge">${g.name}</div>
          <h2 style="margin:8px 0 0;font-size:18px">${escapeHtml(lessonTitle)}</h2>
        </div>
        <button class="btn ghost" id="btnBack">↩︎ الرجوع للدروس</button>
      </div>
      ${tabsHtml}
      <div class="hr"></div>
      ${body}
    </div>
  `;
}

/* ===== Worksheets ===== */
function getWorksheet(gradeNum, lessonTitle, kind){
  const store = loadStore();
  const k = lessonKey(gradeNum, lessonTitle);
  if(store[k]?.[kind]) return store[k][kind];

  return (kind === "diagnostic")
    ? window.ASSESS_GEN.makeDiagnosticWorksheet(gradeNum, lessonTitle)
    : window.ASSESS_GEN.makeFormativeWorksheet(gradeNum, lessonTitle);
}

function viewWorksheetEditor(gradeNum, lessonTitle, kind){
  const ws = getWorksheet(gradeNum, lessonTitle, kind);

  const activitiesHtml = (ws.activities||[]).map((a, idx) => `
    <div class="field">
      <label>بند ${idx+1} (جاهز — يمكنك تعديله)</label>
      <div class="row" style="gap:8px;align-items:flex-start">
        <input type="text" value="${escapeAttr(a.icon)}" data-aicon="${idx}" style="max-width:140px" />
        <textarea data-atext="${idx}">${escapeHtml(a.text)}</textarea>
      </div>
    </div>
  `).join("");

  return `
    <div class="row">
      <button class="btn ok" id="btnSaveWs">💾 حفظ</button>
      <button class="btn" id="btnPdf">🖨️ حفظ PDF (A4)</button>
      <button class="btn ghost" id="btnAddItem">➕ إضافة بند</button>
    </div>

    <div class="field">
      <label>عنوان الورقة</label>
      <input type="text" id="wsHeader" value="${escapeAttr(ws.header)}" />
    </div>

    <div class="field">
      <label>ملاحظات المعلمة</label>
      <textarea id="wsNotes">${escapeHtml(ws.teacherNotes)}</textarea>
    </div>

    ${activitiesHtml}

    <div class="note">✅ تم توليد أسئلة جاهزة تلقائيًا لهذا الدرس. عدّلي إذا رغبتِ ثم احفظي.</div>
  `;
}

function collectWorksheetFromUI(){
  const header = $("#wsHeader").value.trim();
  const teacherNotes = $("#wsNotes").value.trim();
  const icons = [...document.querySelectorAll("[data-aicon]")].map(el => el.value.trim());
  const texts = [...document.querySelectorAll("[data-atext]")].map(el => el.value.trim());
  const activities = texts.map((t,i)=>({ icon: icons[i] || "✍️", text: t || "" }));
  return { header, teacherNotes, activities };
}

function openPrint(gradeName, lessonTitle, kind, ws){
  const title = kind === "diagnostic" ? "تقويم تشخيصي" : "تقويم تكويني";
  $("#printArea").innerHTML = `
    <div style="font-family:Tahoma, Arial; direction:rtl">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div>
          <h2 style="margin:0 0 6px">${escapeHtml(ws.header || title)}</h2>
          <div style="color:#444;font-size:12px;line-height:1.6">
            <div><b>الصف:</b> ${escapeHtml(gradeName)}</div>
            <div><b>الدرس:</b> ${escapeHtml(lessonTitle)}</div>
            <div><b>النوع:</b> ${title}</div>
          </div>
        </div>
        <div style="text-align:left;color:#666;font-size:12px;line-height:1.8">
          <div>التاريخ: ____________</div>
          <div>اسم الطالبة: ____________</div>
          <div>الشعبة: ____________</div>
        </div>
      </div>

      <hr style="margin:12px 0"/>

      <div style="margin-bottom:10px">
        <b>ملاحظات المعلمة:</b>
        <div style="margin-top:6px;white-space:pre-wrap">${escapeHtml(ws.teacherNotes || "")}</div>
      </div>

      <hr style="margin:12px 0"/>

      <ol style="padding-right:18px">
        ${(ws.activities||[]).map(a => `
          <li style="margin:10px 0">
            <div style="display:flex;gap:10px;align-items:flex-start">
              <div style="min-width:28px">${escapeHtml(a.icon || "✍️")}</div>
              <div style="white-space:pre-wrap">${escapeHtml(a.text || "")}</div>
            </div>
            <div style="margin-top:10px;border:1px dashed #bbb;border-radius:10px;min-height:30px"></div>
          </li>
        `).join("")}
      </ol>

      <div style="margin-top:14px;display:flex;justify-content:space-between;font-size:12px;color:#555">
        <div>✅ تغذية راجعة: 😊 ممتاز | 🙂 جيد | 💡 يحتاج دعم</div>
        <div>توقيع المعلمة: ____________</div>
      </div>
    </div>
  `;
  $("#printOverlay").classList.remove("hidden");
  $("#printOverlay").setAttribute("aria-hidden","false");
}

/* ===== Quiz (Summative) ===== */
function getSummativeQuiz(gradeNum, lessonTitle){
  const store = loadStore();
  const k = lessonKey(gradeNum, lessonTitle);
  return store[k]?.summative || window.ASSESS_GEN.makeSummativeQuiz(gradeNum, lessonTitle);
}

function viewQuizEditor(gradeNum, lessonTitle){
  const quiz = getSummativeQuiz(gradeNum, lessonTitle);

  const qHtml = (quiz.questions||[]).map((q, idx) => {
    const head = `
      <div class="row" style="justify-content:space-between;align-items:center">
        <div class="badge">سؤال ${idx+1}</div>
        <div class="badge">مهارة: ${escapeHtml(q.skill||"—")}</div>
      </div>
      <div class="field">
        <label>نص السؤال (جاهز — يمكنك تعديله)</label>
        <textarea data-qprompt="${idx}">${escapeHtml(q.prompt||"")}</textarea>
      </div>
    `;

    if(q.type==="tf"){
      return `
        <div class="card" style="margin:10px 0; background: rgba(16,26,51,.25)">
          ${head}
          <div class="field">
            <label>الإجابة الصحيحة</label>
            <select data-qtf="${idx}">
              <option value="true" ${q.correctTF===true?"selected":""}>صحيحة</option>
              <option value="false" ${q.correctTF===false?"selected":""}>خاطئة</option>
            </select>
          </div>
          <div class="grid2">
            <div class="field"><label>تغذية عند الصحيح</label><input type="text" data-qfc="${idx}" value="${escapeAttr(q.feedbackCorrect||"أحسنتِ ✅")}" /></div>
            <div class="field"><label>تغذية عند الخطأ</label><input type="text" data-qfw="${idx}" value="${escapeAttr(q.feedbackWrong||"راجعي الفكرة 💡")}" /></div>
          </div>
        </div>
      `;
    }

    if(q.type==="short"){
      const kw = Array.isArray(q.keywords) ? q.keywords.join(", ") : "";
      return `
        <div class="card" style="margin:10px 0; background: rgba(16,26,51,.25)">
          ${head}
          <div class="field">
            <label>كلمات مفتاحية للتصحيح (اختياري)</label>
            <input type="text" data-qkw="${idx}" value="${escapeAttr(kw)}" />
          </div>
          <div class="grid2">
            <div class="field"><label>تغذية عند القبول</label><input type="text" data-qfc="${idx}" value="${escapeAttr(q.feedbackCorrect||"إجابة موفقة 🎯✅")}" /></div>
            <div class="field"><label>تغذية عند عدم التطابق</label><input type="text" data-qfw="${idx}" value="${escapeAttr(q.feedbackWrong||"حاولي ذكر مفاهيم أساسية 🙂")}" /></div>
          </div>
        </div>
      `;
    }

    const opts = (q.options||["","","",""]).slice(0,4);
    return `
      <div class="card" style="margin:10px 0; background: rgba(16,26,51,.25)">
        ${head}
        <div class="field">
          <label>الخيارات (4)</label>
          <div class="grid2">
            ${opts.map((op,i)=>`<input type="text" data-qopt="${idx}:${i}" value="${escapeAttr(op)}" />`).join("")}
          </div>
        </div>
        <div class="field">
          <label>رقم الإجابة الصحيحة (1-4)</label>
          <input type="text" data-qcorrect="${idx}" value="${escapeAttr(String((q.correct??0)+1))}" />
        </div>
        <div class="grid2">
          <div class="field"><label>تغذية عند الصحيح</label><input type="text" data-qfc="${idx}" value="${escapeAttr(q.feedbackCorrect||"أحسنتِ ✅🌟")}" /></div>
          <div class="field"><label>تغذية عند الخطأ</label><input type="text" data-qfw="${idx}" value="${escapeAttr(q.feedbackWrong||"راجعي الفكرة 🙂🔁")}" /></div>
        </div>
      </div>
    `;
  }).join("");

  return `
    <div class="row">
      <button class="btn ok" id="btnSaveQuiz">💾 حفظ الاختبار</button>
      <button class="btn" id="btnStartQuiz">▶️ بدء الاختبار (وضع الطالبة)</button>
    </div>
    <div class="field"><label>عنوان الاختبار</label><input type="text" id="quizTitle" value="${escapeAttr(quiz.title||"")}" /></div>
    <div class="field"><label>تعليمات</label><textarea id="quizIntro">${escapeHtml(quiz.intro||"")}</textarea></div>
    ${qHtml}
    <div id="quizRunner" class="card hidden" style="margin-top:12px; background: rgba(10,16,32,.35)"></div>
  `;
}

function collectQuizFromUI(){
  const title = $("#quizTitle").value.trim();
  const intro = $("#quizIntro").value.trim();

  const prompts = [...document.querySelectorAll("[data-qprompt]")];
  const questions = [];

  for(let i=0;i<prompts.length;i++){
    const prompt = prompts[i].value.trim();
    const tfSel = document.querySelector(`[data-qtf="${i}"]`);
    const kwInp = document.querySelector(`[data-qkw="${i}"]`);

    const fc = (document.querySelector(`[data-qfc="${i}"]`)?.value || "").trim();
    const fw = (document.querySelector(`[data-qfw="${i}"]`)?.value || "").trim();

    if(tfSel){
      questions.push({ type:"tf", skill:"فهم", prompt, correctTF: tfSel.value==="true", feedbackCorrect: fc, feedbackWrong: fw });
    } else if(kwInp){
      const keywords = kwInp.value.split(",").map(s=>s.trim()).filter(Boolean);
      questions.push({ type:"short", skill:"تحليل", prompt, keywords, feedbackCorrect: fc, feedbackWrong: fw });
    } else {
      const opts = [0,1,2,3].map(j => (document.querySelector(`[data-qopt="${i}:${j}"]`)?.value || "").trim());
      let corr = parseInt((document.querySelector(`[data-qcorrect="${i}"]`)?.value || "1").trim(),10);
      if(!Number.isFinite(corr) || corr<1 || corr>4) corr=1;
      questions.push({ type:"mcq", skill:"فهم", prompt, options: opts, correct: corr-1, feedbackCorrect: fc, feedbackWrong: fw });
    }
  }
  return { title, intro, questions };
}

function runQuiz(quiz){
  const runner = $("#quizRunner");
  runner.classList.remove("hidden");

  let idx=0, score=0;
  const emojiByPct = (p)=> p>=90?"🏆🎯":p>=70?"😊👏":p>=60?"🙂📌":"💡💪";

  const done = ()=>{
    const total = quiz.questions.length;
    const pct = total ? Math.round(score/total*100) : 0;
    runner.innerHTML = `
      <h3 style="margin:0 0 8px">انتهى الاختبار ${emojiByPct(pct)}</h3>
      <p class="note" style="margin:0">درجتك: <b>${score}</b> من <b>${total}</b> — <b>${pct}%</b></p>
      <div class="hr"></div>
      <button class="btn" id="btnRestart">🔁 إعادة</button>
    `;
    $("#btnRestart").onclick = ()=>{ idx=0; score=0; show(); };
  };

  const show = ()=>{
    const q = quiz.questions[idx];
    if(!q) return done();

    const head = `
      <div class="row" style="justify-content:space-between;align-items:center">
        <div class="badge">سؤال ${idx+1} / ${quiz.questions.length}</div>
        <div class="badge">مهارة: ${escapeHtml(q.skill||"—")}</div>
      </div>
      <h3 style="margin:10px 0 6px">${escapeHtml(q.prompt||"")}</h3>
    `;

    if(q.type==="tf"){
      runner.innerHTML = `
        ${head}
        <div class="row">
          <button class="btn" data-ans="true">صحيحة</button>
          <button class="btn" data-ans="false">خاطئة</button>
        </div>
        <div id="fb" class="note" style="margin-top:10px"></div>
      `;
      runner.querySelectorAll("[data-ans]").forEach(b=>{
        b.onclick = ()=>{
          const ans = b.getAttribute("data-ans")==="true";
          const ok = ans===q.correctTF;
          if(ok) score++;
          $("#fb").textContent = ok ? (q.feedbackCorrect||"أحسنتِ ✅") : (q.feedbackWrong||"راجعي الفكرة 💡");
          setTimeout(()=>{ idx++; show(); }, 900);
        };
      });
      return;
    }

    if(q.type==="short"){
      runner.innerHTML = `
        ${head}
        <div class="field"><label>اكتبي إجابتك</label><textarea id="shortAns"></textarea></div>
        <div class="row">
          <button class="btn ok" id="btnCheckShort">تحقق ✅</button>
          <button class="btn ghost" id="btnSkipShort">تخطي ↩️</button>
        </div>
        <div id="fb" class="note" style="margin-top:10px"></div>
      `;
      $("#btnCheckShort").onclick = ()=>{
        const ans = ($("#shortAns").value||"").trim().toLowerCase();
        const kws = (q.keywords||[]).map(x=>String(x).toLowerCase()).filter(Boolean);
        if(!kws.length){
          $("#fb").textContent = "تم استلام الإجابة ✅ (تقييم ذاتي/معلمة) 🙂";
          setTimeout(()=>{ idx++; show(); }, 1100);
          return;
        }
        const ok = ans.length>0 && kws.some(k=>ans.includes(k));
        if(ok) score++;
        $("#fb").textContent = ok ? (q.feedbackCorrect||"إجابة موفقة 🎯✅") : (q.feedbackWrong||"حاولي ذكر كلمات أساسية 🙂");
        setTimeout(()=>{ idx++; show(); }, 1100);
      };
      $("#btnSkipShort").onclick = ()=>{ idx++; show(); };
      return;
    }

    const opts = (q.options&&q.options.length)?q.options:["أ","ب","ج","د"];
    runner.innerHTML = `
      ${head}
      <div class="list">
        ${opts.slice(0,4).map((op,i)=>`
          <button class="item" style="text-align:right" data-opt="${i}">${escapeHtml(op||`خيار ${i+1}`)}</button>
        `).join("")}
      </div>
      <div id="fb" class="note" style="margin-top:10px"></div>
    `;
    runner.querySelectorAll("[data-opt]").forEach(b=>{
      b.onclick = ()=>{
        const pick = parseInt(b.getAttribute("data-opt"),10);
        const ok = pick===q.correct;
        if(ok) score++;
        $("#fb").textContent = ok ? (q.feedbackCorrect||"أحسنتِ ✅🌟") : (q.feedbackWrong||"راجعي الفكرة 🙂🔁");
        setTimeout(()=>{ idx++; show(); }, 900);
      };
    });
  };

  show();
}

/* ===== Routing & Events ===== */
function bindHandlers(){
  $("#btnHome").onclick = ()=>{ state.grade=null; state.lesson=null; state.tab="diagnostic"; updateHash(); render(); };
  $("#btnReset").onclick = ()=>{
    if(confirm("مسح كل التعديلات المحفوظة على هذا المتصفح؟")){
      resetStore(); alert("تم المسح ✅"); render();
    }
  };
  $("#btnPrintNow").onclick = ()=>window.print();
  $("#btnClosePrint").onclick = ()=>{
    $("#printOverlay").classList.add("hidden");
    $("#printOverlay").setAttribute("aria-hidden","true");
  };
  window.addEventListener("hashchange", ()=>{ readHash(); render(); });
}

function updateHash(){
  if(!state.grade){ location.hash="#/"; return; }
  const g = state.grade.grade;
  const l = state.lesson ? encodeURIComponent(state.lesson) : "";
  const t = state.tab || "diagnostic";
  location.hash = l ? `#/g/${g}/l/${l}/t/${t}` : `#/g/${g}`;
}

function readHash(){
  const h = location.hash || "#/";
  const parts = h.replace("#/","").split("/").filter(Boolean);
  state.grade=null; state.lesson=null; state.tab="diagnostic";

  if(parts[0]==="g" && parts[1]){
    const gnum = parseInt(parts[1],10);
    const g = window.CURRICULUM_1447.grades.find(x=>x.grade===gnum);
    if(g) state.grade=g;

    const li = parts.indexOf("l");
    if(li!==-1 && parts[li+1]) state.lesson = decodeURIComponent(parts[li+1]);

    const ti = parts.indexOf("t");
    if(ti!==-1 && parts[ti+1]) state.tab = parts[ti+1];
  }
}

function render(){
  renderGradesNav();
  const view = $("#view");

  if(!state.grade){ view.innerHTML=viewHome(); return; }

  if(!state.lesson){
    view.innerHTML = viewGrade(state.grade);
    view.querySelectorAll("[data-lesson]").forEach(li=>{
      li.onclick = ()=>{
        state.lesson = li.getAttribute("data-lesson");
        state.tab="diagnostic";
        updateHash(); render();
      };
    });
    return;
  }

  view.innerHTML = viewLesson(state.grade, state.lesson);

  $("#btnBack").onclick = ()=>{ state.lesson=null; state.tab="diagnostic"; updateHash(); render(); };
  view.querySelectorAll("[data-tab]").forEach(b=>{
    b.onclick = ()=>{ state.tab=b.getAttribute("data-tab"); updateHash(); render(); };
  });

  if(state.tab !== "summative"){
    $("#btnAddItem").onclick = ()=>{
      const kind = state.tab;
      const store = loadStore();
      const k = lessonKey(state.grade.grade, state.lesson);
      const ws = getWorksheet(state.grade.grade, state.lesson, kind);
      ws.activities.push({ icon:"✍️", text:"بند إضافي…" });
      store[k]=store[k]||{}; store[k][kind]=ws;
      saveStore(store); render();
    };

    $("#btnSaveWs").onclick = ()=>{
      const kind = state.tab;
      const ws = collectWorksheetFromUI();
      const store = loadStore();
      const k = lessonKey(state.grade.grade, state.lesson);
      store[k]=store[k]||{}; store[k][kind]=ws;
      saveStore(store); alert("تم الحفظ ✅");
    };

    $("#btnPdf").onclick = ()=>{
      const kind = state.tab;
      const ws = collectWorksheetFromUI();
      openPrint(state.grade.name, state.lesson, kind, ws);
    };
  } else {
    $("#btnSaveQuiz").onclick = ()=>{
      const qz = collectQuizFromUI();
      const store = loadStore();
      const k = lessonKey(state.grade.grade, state.lesson);
      store[k]=store[k]||{}; store[k].summative=qz;
      saveStore(store); alert("تم حفظ الاختبار ✅");
    };

    $("#btnStartQuiz").onclick = ()=>{
      const qz = collectQuizFromUI();
      runQuiz(qz);
      $("#quizRunner").scrollIntoView({behavior:"smooth", block:"start"});
    };
  }
}

/* ===== Helpers ===== */
function escapeHtml(str){
  return String(str ?? "")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
}
function escapeAttr(str){ return escapeHtml(str).replaceAll("\n"," "); }

/* ===== Init ===== */
function init(){ bindHandlers(); readHash(); render(); }
init();
