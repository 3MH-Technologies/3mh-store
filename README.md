# متجر 3MH التقني — 3MH STORE

[![CI](https://github.com/3MH-Technologies/3mh-store/actions/workflows/ci.yml/badge.svg)](https://github.com/3MH-Technologies/3mh-store/actions/workflows/ci.yml)
[![License](https://img.shields.io/badge/license-Proprietary-blue.svg)](LICENSE)

سوق رقمي متكامل للمنتجات التقنية من تطوير **3MH TECHNOLOGIES**:
سكربتات وأكواد برمجية، أدوات أتمتة، كورسات تقنية، واشتراكات وتراخيص رقمية —
مع سلة مشتريات، بوابة دفع، تتبع طلب، فاتورة رقمية قابلة للطباعة، ولوحة تحكم مشرف.

- **الواجهة:** React 18 + Vite + TypeScript + Tailwind CSS + Lucide (RTL عربي كامل، خط Cairo/Tajawal)
- **الخادم:** Node خفيّ (`scripts/server.mjs`) + API موحّد (`server/api.mjs`) — قاعدة البيانات ملفات JSON على مستودع GitHub خاص عبر GitHub REST API (fetch أصلي، بلا مكتبات إضافية)
- **بوابة الدفع:** Plisio (عملات رقمية) — تتطلب `PLISIO_KEY`
- **الاستضافة المستهدفة:** Hugging Face Spaces (Docker / Node.js) — أو أي استضافة SPA

---

## 1. المتطلبات

- Node.js 20+
- مستودع GitHub **خاص** يُستخدم كقاعدة بيانات (يحتوي على `data/products.json` و `data/orders.json`)
- توكن GitHub بصلاحيات **Contents: Read & Write** على ذلك المستودع فقط (fine-grained token)
- مفتاح Plisio لتفعيل الدفع (بدونه تفشل عمليات الدفع)

## 2. الإعداد المحلي

```bash
cp .env.example .env
# املأ القيم داخل .env (انظر الجدول أدناه)
npm install
```

التطوير يحتاج **طرفين (terminalين)** — بدون خادم الـ API ستحصل على proxy errors من Vite:

```bash
# terminal 1 — خادم API على المنفذ 7860
npm run server

# terminal 2 — واجهة Vite على المنفذ 5173
npm run dev
```

> **ملاحظة:** `npm run dev` وحدها لا تكفي — الواجهة تمرّر طلبات `/api/*` عبر proxy
> إلى `http://localhost:7860` (انظر `vite.config.ts`)، فبدون `npm run server` ستظهر
> أخطاء proxy وتفشل الطلبات.

### المتغيرات المطلوبة

الخادم يقبل كل متغير باسمه المختصر وباسمه المقابل المبدأ بـ `VITE_`
(مثل `GITHUB_OWNER` أو `VITE_GITHUB_OWNER`) — استخدم الأسماء المختصرة للمفاتيح السرّية.

| المتغير | مطلوب | الوصف |
| --- | --- | --- |
| `GITHUB_OWNER` | ✔ | اسم المستخدم أو المنظمة المالكة لمستودع البيانات |
| `GITHUB_REPO` | ✔ | اسم مستودع قاعدة البيانات (يجب أن يكون خاصاً) |
| `GITHUB_BRANCH` | ✖ (‏`main`) | الفرع المستخدم |
| `GITHUB_TOKEN` | ✔ | توكن GitHub (Contents: Read & Write) على مستودع البيانات فقط |
| `API_SECRET` | ✔ | سر توقيع HMAC لتوقيع توكنات جلسات المشرف والعملاء. **بدونه** يولّد الخادم سراً عشوائياً لكل عملية تشغيل (مع تنبيه في السجل) وتُلغى كل الجلسات عند إعادة التشغيل — اضبطه دائماً في الإنتاج |
| `ADMIN_PIN` | ✔ | رقم دخول لوحة التحكم `/#/admin`. **لا يوجد افتراضي** — القيمة الفارغة تعني أن الخادم يرفض تسجيل دخول المشرف نهائياً |
| `ASSET_SECRET` | ✔ | مفتاح تشفير روابط تسليم الأصول AES-GCM — يجب أن يطابق المفتاح المستخدم عند توليد `products.json` |
| `PLISIO_KEY` | ✔ | مفتاح بوابة الدفع Plisio — **بدونه تفشل جميع عمليات إنشاء الفواتير والدفع** (يقبل أيضاً `PLISIO_API_KEY`) |
| `SITE_URL` | ✖ | العنوان الأساسي للمتجر، يُستخدم في روابط العودة من بوابة الدفع (افتراضي `https://3mh-store.pages.dev`) |
| `PORT` | ✖ (‏`7860`) | منفذ `scripts/server.mjs` |
| `VITE_API_BASE` | ✖ | تجاوز عنوان الـ API في المتصفح. الافتراضي: `https://3mh-store.pages.dev` لأسماء `*.hf.space`، ونفس النطاق المحلي لغير ذلك |

> **ملاحظة:** عند غياب بيانات GitHub يعمل المتجر بوضع العرض المحلي (قراءة فقط من
> `data/products.json` المضمّنة في البناء)، أما إنشاء الطلبات وإدارة لوحة التحكم
> فتتطلب ضبط المتغيرات.

### سكربتات مساعدة

| الأمر | الوظيفة |
| --- | --- |
| `npm run server` | خادم الإنتاج: يقدّم `dist/` ويعالج `/api/*` |
| `npm run db:init` | تهيئة/تحديث `data/*.json` في مستودع GitHub من النسخة المحلية |
| `npm run seed:assets` | تشفير حقول `access` في `data/products.json` (AES-GCM) |
| `npm run verify:assets` | التحقق من إمكانية فك تشفير كل الأصول بالمفتاح الحالي |

## 3. بيانات المتجر (data/)

- **`data/products.json`** — كتالوج المنتجات. روابط الأصول (`access`) مشفرة AES-GCM بمفتاح
  مشتق من `ASSET_SECRET` ولا تُفك شيفرتها إلا داخل الفاتورة بعد التحقق من الطلب.
- **`data/orders.json`** — سجل الطلبات (يُدار تلقائياً عبر المتجر ولوحة التحكم).

### إعادة توليد تشفير الأصول بعد تعديل المنتجات

اكتب المنتج الجديد مع حقل `access` بالصيغة النصية ثم شغّل:

```bash
npm run seed:assets
npm run verify:assets   # للتأكد أن كل الأصول قابلة للفك
```

## 4. النشر على Hugging Face Spaces

المتجر مُصمّم للنشر على Hugging Face Spaces كحاوية Docker من مرحلتين:

1. **Build:** `npm ci` ثم `vite build` لإنتاج `dist/`.
2. **Runtime:** خادم Node (`scripts/server.mjs`) يقدّم `dist/` و`/api/*`
   (`server/api.mjs`) على المنفذ 7860 — **أسرار الخادم تقرأ من متغيرات البيئة وقت
   التشغيل فقط ولا تُضمَّن أبداً في حزمة JavaScript**.

خطوات النشر:

1. أنشئ Space من نوع **Docker** (أو غيّر نوع الـ Space الحالي من Static إلى Docker).
2. ارفع الملفات إلى الـ Space (سيرفر Dockerfile جاهز في جذر المشروع).
3. أضف الأسرار في **Settings → Variables and secrets** (نفس متغيرات الجدول أعلاه):
   `GITHUB_OWNER` / `GITHUB_REPO` / `GITHUB_BRANCH` / `GITHUB_TOKEN` /
   `API_SECRET` / `ADMIN_PIN` / `ASSET_SECRET` / `PLISIO_KEY` / `SITE_URL`.

> **تحذير أمني:** استخدم دائماً `GITHUB_TOKEN` (اسم بدون `VITE_`) — فأي متغير يبدأ
> بـ `VITE_` يُقرأ وقت **البناء** وقد يُضمَّن في حزمة JS المنشورة. اضبط fine-grained
> token بصلاحية مستودع البيانات فقط، وأعد توليد الأصول المشفرة في حال تسريب
> `ASSET_SECRET`.

## 5. مسارات التطبيق

التطبيق يستخدم **HashRouter** — كل المسار يبدأ بـ `/#`:

| المسار | الوظيفة |
| --- | --- |
| `/#/` | الرئيسية: Hero، البحث الفوري، فلاتر الأقسام، شبكة المنتجات، نافذة تفاصيل المنتج |
| `/#/checkout` | إتمام الطلب: بيانات العميل ← مراجعة السلة ← إنشاء الطلب (تسجيل الدخول مطلوب) |
| `/#/auth` | تسجيل الدخول / إنشاء حساب عميل |
| `/#/pay/:orderId` | صفحة الدفع: زر فتح فاتورة Plisio + متابعة حالة الطلب لحظياً |
| `/#/track` , `/#/track/:id` | تتبع الطلب العام: حالة العملية، وبعد التحقق تظهر روابط الأصول |
| `/#/invoice/:id` | الفاتورة الرقمية القابلة للطباعة (PDF) — تفتح الروابط تلقائياً عند التحقق |
| `/#/payment-methods` | شرح طرق الدفع المدعومة |
| `/#/admin` | لوحة التحكم: إحصاءات، قائمة الطلبات، اعتماد/رفض الدفع (يُكتب في `orders.json`) |

## 6. سير عمل الدفع (Plisio)

1. العميل يضيف منتجات للسلة ويتابع إلى `/#/checkout` (**تسجيل الدخول مطلوب**) ويُنشئ الطلب بحالة `pending` في `data/orders.json`.
2. يُحوَّل إلى `/#/pay/:orderId` ويضغط **فتح صفحة الدفع** — يُنشئ الخادم فاتورة عبر **Plisio** (يتطلب `PLISIO_KEY`) ويُحوّل المتصفح إلى صفحة الدفع الرسمية لـ Plisio.
3. بعد الدفع يعيد Plisio المتصفح إلى `/#/pay/:orderId`، ويصل Webhook موقّعاً (`verify_hash`) إلى `/api/plisio/webhook`:
   - `completed` ← اعتماد تلقائي للطلب (`verified`)،
   - `expired` / `cancelled` / `error` ← رفض (`rejected`).
4. يبقى للمشرف فتحة يدوية للاعتماد/الرفض من `/#/admin` في أي حال.
5. بعد الاعتماد تكشف فاتورة العميل `/#/invoice/:id` روابط الأصول المشفرة + شارة التحقق.

## 7. التكامل المستمر (CI)

‏`.github/workflows/ci.yml` يعمل مع كل push/PR إلى `main`:
`npm ci` ← `npm run typecheck` ← `npm run build` على Node 20.

## الأمان

أبلغ عن أي ثغرة أمنية عبر تيليجرام: https://t.me/j49_c — انظر [SECURITY.md](SECURITY.md).

---

## الترخيص

هذا المشروع **برمجية مملوكة خاصة** لـ 3MH Technologies — لا يُسمح بنسخه أو توزيعه أو تعديله دون إذن كتابي مسبق. انظر [LICENSE](LICENSE) للتفاصيل الكاملة.

---

© 3MH Technologies — https://3mh.pages.dev/ — https://t.me/j49_c

© 2026 — تطوير وتصميم [3MH TECHNOLOGIES](https://3mh.pages.dev/ar/) — التواصل والدعم: تيليجرام [@j49_c](https://t.me/j49_c)
