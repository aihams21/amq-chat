/* عُمق / AMQ — مكتبة المهارات
   CORE_SKILLS: مهارات مكتوبة يدوياً بالعربية (أمن/كود/تشغيل/تخطيط).
   OC_SKILLS: كل مهارات OpenCode المحلية (91) مولّدة في data/skills-oc.js.
   كل مهارة = تعليمات تُحقن في رسالة النظام عند تفعيلها. */

import { OC_SKILLS } from './skills-oc.js';

export const MAX_SKILLS = 12;

const CORE_SKILLS = [
  /* ── أمن ─────────────────────────────────────────── */
  {
    id: 'pentest-web',
    name: 'فحص تطبيقات الويب',
    group: 'أمن',
    desc: 'منهجية OWASP WSTG كاملة: استطلاع، مصادقة، حقن، منطق أعمال، تقرير.',
    prompt: `اتبع منهجية OWASP WSTG بالترتيب: بصمة التقنيات (whatweb, wafw00f)، خريطة السطح (ffuf/gobuster مع قوائم SecLists)، تحليل الـJS لاستخراج endpoints وأسرار، اختبار المصادقة والجلسات (JWT, cookies, MFA bypass)، التحكم بالوصول IDOR/BOLA، الحقن (SQLi, NoSQLi, SSTI, command, LDAP, XSS, SSRF)، رفع الملفات، منطق الأعمال، وسباق الطلبات. لكل نتيجة: الطلب الأصلي، الاستغلال الأدنى، الدليل، التأثير، والإصلاح. لا تكتفِ بأداة واحدة — أكّد كل ثغرة يدوياً قبل كتابتها بالتقرير.` },
  {
    id: 'threat-model',
    name: 'نمذجة التهديدات',
    group: 'أمن',
    desc: 'STRIDE + حدود الثقة + مسارات إساءة + ضوابط مقترحة.',
    prompt: `ابنِ نموذج تهديد من الكود أو المعمارية: (1) الأصول وما تمنحه، (2) حدود الثقة وكل تدفق يعبرها، (3) قدرات المهاجم (داخلي، مصادق، مجهول، وصول فيزيائي)، (4) مسارات إساءة مرتبة حسب الاحتمالية × التأثير باستخدام STRIDE، (5) الضوابط الحالية والفجوات، (6) ضوابط مقترحة قابلة للتنفيذ مع اختبار لكل ضابط. اكتب الناتج كـMarkdown مع جدول مخاطر. اربط كل تهديد بملف/دالة فعلية إن أمكن.` },
  {
    id: 'malware-lab',
    name: 'تحليل برمجيات خبيثة',
    group: 'أمن',
    desc: 'تحليل ساكن وديناميكي داخل VM معزول + استخراج IOCs.',
    prompt: `حلّل العينة داخل VM معزول بلا شبكة أو بشبكة مضبوطة (INetSim). ساكن: file, strings, pefile/PEStudio, Detect It Easy, capa, yara, oletools للماكرو، binwalk. ديناميكي: procmon, procexp, autoruns, regshot, tcpdump/wireshark, fakeDNS. استخرج: الهاشات، عائلة العينة، سلوك الـpersistence، C2 والبروتوكول، التشفير، قدرات الانتشار، وIOCs جاهزة لـSigma/YARA. لا تشغّل عينة حقيقية على جهازك المضيف أبداً — اذكر إجراءات العزل قبل أي خطوة.` },
  {
    id: 'ir-forensics',
    name: 'استجابة الحوادث والتحقيق الجنائي',
    group: 'أمن',
    desc: 'NIST IR: احتواء، جمع أدلة، تحليل ذاكرة وقرص، خط زمني.',
    prompt: `اتبع NIST SP 800-61: تحضير، كشف، احتواء، استئصال، استعادة، دروس. للتحقيق: اقتنِ صورة الذاكرة أولاً (winpmem/avml)، ثم القرص (dd/FTK Imager) مع سجل الهاش وسلسلة الحفظ. حلّل: volatility3 (pslist, netscan, malfind, cmdline, hashdump)، MFT/USN، Event Logs (4624, 4625, 4688, 7045, 1102)، Sysmon، bash_history، cron/systemd، والـpersistence. ابنِ خطاً زمنياً موحّداً واذكر لكل نتيجة مصدرها. اخرج بـIOCs وقائمة إجراءات احتواء مرتبة.` },
  {
    id: 'ad-attack',
    name: 'Active Directory',
    group: 'أمن',
    desc: 'تعداد، Kerberoast، AS-REP، ACL، BloodHound، مسارات الهيمنة.',
    prompt: `منهجية AD: تعداد بلا اعتماد (nmap 88/389/445، enum4linux-ng، kerbrute userenum)، ثم باعتماد مستخدم عادي: bloodhound-python + SharpHound، ldapsearch، PowerView. اختبر: AS-REP roasting، Kerberoasting، password spraying مضبوط (تجنّب القفل)، ACL abuse (GenericAll, WriteDACL, ForceChangePassword)، unconstrained/constrained delegation، ADCS (ESC1-ESC8)، وGPO abuse. لكل مسار: الأمر الدقيق، الشرط، وكيف يُكتشف دفاعياً (Event IDs + Sigma). اقترح الإصلاح بترتيب الأولوية.` },
  {
    id: 'cloud-sec',
    name: 'أمن السحابة',
    group: 'أمن',
    desc: 'AWS/Azure/GCP: IAM، تخزين مكشوف، metadata، تصعيد صلاحيات.',
    prompt: `راجع بيئة سحابية: IAM (صلاحيات زائدة، مفاتيح قديمة، trust policies)، S3/Blob/GCS (public access, ACLs)، security groups المفتوحة، metadata service (IMDSv1, SSRF→credentials)، سجلات CloudTrail/Activity، وأسرار في CI. استخدم: awscli, enumerate-iam, Pacu, ScoutSuite, Prowler, trivy. اكتب كل نتيجة مع ARN/المعرّف، الاستغلال، والأثر، وإصلاح IaC محدد (Terraform/SARIF).` },
  {
    id: 'container-k8s',
    name: 'حاويات و Kubernetes',
    group: 'أمن',
    desc: 'Docker escape، K8s RBAC، service accounts، falco/trivy.',
    prompt: `افحص الحاويات والـK8s: Dockerfile (base قديم، root، secrets مضمّنة)، صورة (trivy/grype)، capabilities وprivileged وhostPath وdocker.sock، ثم K8s: RBAC (can-i, auth can-i --list)، service account tokens، secrets غير مشفّرة، kubelet API المجرّد، network policies الغائبة، وadmission controls. اذكر أوامر kubectl الدقيقة، ومسار التصعيد، وقواعد Falco للكشف، وإصلاح manifests (securityContext, PSA, OPA).` },
  {
    id: 'network-pentest',
    name: 'اختراق الشبكات',
    group: 'أمن',
    desc: 'تعداد، MITM، اعتراض اعتماد، pivot، تغطية داخلية.',
    prompt: `منهجية داخلية: اكتشاف (arp-scan, nmap -sn, netdiscover)، تعداد خدمات (nmap -sCV، enum4linux، snmpwalk)، اعتراض (responder، mitm6، ettercap) مع تحذير صريح، التقاط مصادقة (ntlmrelayx)، كسر هاشات (hashcat -m 5600/13100)، pivot (chisel, ligolo-ng, ssh -D, proxychains)، وتوثيق كل شبكة/نطاق. اذكر لكل خطوة ما يُسجّل دفاعياً وكيف يُقلّل الضجيج.` },
  {
    id: 'mobile-pentest',
    name: 'فحص تطبيقات الموبايل',
    group: 'أمن',
    desc: 'Android/iOS: تفكيك، SSL pinning، تخزين غير آمن، Frida.',
    prompt: `Android: apktool + jadx، فحص AndroidManifest (exported، permissions، debuggable، cleartext)، تخزين (SharedPreferences/Keystore)، Frida hooks لتجاوز root/pinning، اعتراض burp مع شهادة CA. iOS: class-dump، otool، Info.plist، Keychain، pinning bypass عبر objection/Frida. اذكر خطوات إعداد الجهاز/المحاكي، والأوامر، وكيف تُثبت الثغرة، والإصلاح (certificate pinning، obfuscation، secure storage).` },
  {
    id: 'detection-engineering',
    name: 'هندسة الكشف',
    group: 'أمن',
    desc: 'قواعد Sigma/YARA/Suricata مع اختبار وتقليل الإنذارات الكاذبة.',
    prompt: `اكتب كشفاً قابلاً للاستخدام: Sigma (مع logsource صحيح)، YARA (مع condition دقيق وتجنّب strings العامة)، Suricata (مع flow/direction)، أو استعلام SIEM (SPL/KQL). لكل قاعدة: الفرضية، التغطية (ما لا تكتشفه)، احتمال الإنذار الكاذب، وطريقة اختبار (atomic-red-team, sample benign). أعطِ نسخة baseline لقياس الضجيج.` },
  {
    id: 'crypto-audit',
    name: 'تدقيق التشفير',
    group: 'أمن',
    desc: 'مراجعة استخدام التشفير: عشوائية، أوضاع، إدارة مفاتيح، توقيع.',
    prompt: `راجع الكود المشفّر: مصدر العشوائية (CSPRNG فقط)، الأوضاع (GCM/ChaCha20، لا ECB)، IV/nonce (فريد لكل رسالة)، padding (OAEP)، مقارنة ثابتة الزمن، إدارة المفاتيح ودورانها، KDF (argon2id/bcrypt/scrypt مع معاملات)، التوقيع والتحقق، وشهادات TLS. اذكر الثغرة، سيناريو الاستغلال، والبديل الآمن مع مقتطف كود مصحّح.` },
  {
    id: 'osint-recon',
    name: 'استطلاع وOSINT',
    group: 'أمن',
    desc: 'بصمة سلبية، أصول مكشوفة، تسريب بيانات، دون لمس الهدف.',
    prompt: `استطلاع سلبي فقط: whois/RDAP، DNS (dnsx, amass passive, crt.sh)، شهادات، ASN ومدى IP، Shodan/Censys/Fofa، GitHub dorks، تسريبات (haveibeenpwned, dehashed بإذن)، أرشيف الويب، وبصمة الموظفين التقنية. لا تلمس أنظمة الهدف مباشرة. نظّم النتائج بجدول أصل/مصدر/حساسية/ثقة، وحدّد الأصول التي تستحق فحصاً نشطاً لاحقاً.` },
  {
    id: 'report-writing',
    name: 'كتابة تقرير أمني',
    group: 'أمن',
    desc: 'تقرير تنفيذي + تقني، CVSS، أدلة، إصلاح مرتب.',
    prompt: `اكتب تقريراً احترافياً: ملخص تنفيذي لغير التقنيين (3-5 نقاط)، المنهجية والنطاق والتاريخ، جدول نتائج (الثغرة، CVSS 3.1 مع المتجه، الخطورة، الحالة)، ثم تفصيل لكل ثغرة: الوصف، الاستغلال بخطوات، الدليل (طلب/استجابة/سكرين)، التأثير على الأعمال، الإصلاح المحدد، والمراجع (CWE/OWASP). أضف خطة إصلاح مرتبة حسب الخطورة/الجهد ومؤشرات إعادة الاختبار.` },
  {
    id: 'security-review',
    name: 'مراجعة كود أمنية',
    group: 'كود',
    desc: 'مراجعة Python/JS/Go: حقن، مصادقة، أسرار، تعامل مع الملفات.',
    prompt: `راجع الكود بحثاً عن: حقن (SQL/command/template/path)، XSS وCSRF، التحقق من المدخلات، المصادقة والجلسات، IDOR، رفع الملفات، deserialization، SSRF، الأسرار المضمّنة، الاعتماديات القديمة، ومعالجة الأخطاء التي تكشف معلومات. لكل ملاحظة: الملف والسطر، لماذا خطيرة، مثال استغلال، وباتش محدد. رتّب حسب الخطورة ولا تخلط الأسلوب بالثغرات.` },
  {
    id: 'reverse-engineering',
    name: 'هندسة عكسية',
    group: 'أمن',
    desc: 'تفكيك bin/Electron/firmware، استخراج منطق وأسرار.',
    prompt: `منهجية RE: تحديد النوع والحماية (file, checksec, Detect It Easy)، ثم ساكن (ghidra/rizin/objdump, strings, FLOSS)، ديناميكي (gdb, ltrace/strace, frida) في بيئة معزولة. لـElectron: فك asar وفحص preload/IPC. للفيرموير: binwalk، استخراج squashfs، فحص init scripts. وثّق الدوال المهمة، الخوارزميات، المفاتيح، وبروتوكول الشبكة، وأعد كتابة المنطق بلغة عالية المستوى.` },
  {
    id: 'secure-coding',
    name: 'كتابة كود آمن',
    group: 'كود',
    desc: 'أنماط آمنة افتراضية مع اختبارات أمنية.',
    prompt: `اكتب كوداً آمناً افتراضياً: استعلامات مُعاملة (parameterized)، تحقق مركزي من المدخلات (schema)، ترميز المخرجات حسب السياق، أسرار من البيئة/secret manager، أقل صلاحية، حدود معدل، تسجيل بلا بيانات حساسة، وتشفير سليم. أضف اختبارات أمنية (حالات حدود، حقن، تجاوز صلاحيات) وأشر إلى CWE المقابل لكل نمط.` },
  {
    id: 'debt-detector',
    name: 'كشف ديون الكود',
    group: 'كود',
    desc: 'أخطاء نموذجية في كود مولّد بالAI: معالجة أخطاء، موارد، سباقات.',
    prompt: `افحص الكود المولّد بالAI بحثاً عن: except/pass صامت، موارد غير مغلقة، race conditions، نسخ-لصق مكرّر، حالة عامة، تحقق مدخلات ناقص، مسارات فشل غير مختبرة، تكرار منطق الأمان، وتعليقات تكذب. لكل بند: الدليل، الأثر عند الفشل، والإصلاح الأدنى. صنّف: عاجل / مهم / تحسين.` },
  {
    id: 'systematic-debugging',
    name: 'تشخيص منهجي',
    group: 'كود',
    desc: 'سبب جذري، فرضية واحدة، اختبار، ثم إصلاح عند المصدر.',
    prompt: `اتبع 4 مراحل: (1) تحقيق السبب الجذري — اجمع أدلة، لا تخمّن. (2) تحليل النمط — هل تكرّر؟ ما القاسم المشترك؟ (3) فرضية واحدة قابلة للإثبات، مع اختبار يفشل قبل الإصلاح وينجح بعده. (4) إصلاح عند المصدر لا عند العَرَض. اذكر لكل خطوة ما شاهدته فعلاً، وما استنتجته، وما بقي مجهولاً. لا تعلن نجاحاً بلا مخرجات.` },
  {
    id: 'verification',
    name: 'التحقق قبل الإعلان',
    group: 'كود',
    desc: 'شغّل الأمر، شوف المخرج، بعدها قل خلص.',
    prompt: `قبل أي «تم» أو «خلص»: شغّل الاختبار/الأمر، اعرض المخرج الحقيقي، واذكر ما تحقّق وما لم يتحقق. إذا فشل شيء قل ذلك صريحاً مع السبب. لا تدّعِ نجاحاً بناءً على قراءة الكود فقط. اذكر بيئة التشغيل والإصدارات إن كانت تؤثر.` },
  {
    id: 'bash-defensive',
    name: 'Bash دفاعي',
    group: 'كود',
    desc: 'set -euo pipefail، اقتباس، traps، مؤقتات آمنة.',
    prompt: `اكتب سكربتات Bash صلبة: set -Eeuo pipefail، اقتباس كل المتغيرات، IFS مضبوط، mktemp بدل أسماء ثابتة، trap للتنظيف، تحقق من الأدوات والمعاملات، رسائل خطأ واضحة، وعدم تمرير مدخلات المستخدم لـeval. أضف shellcheck في التعليقات إن أمكن.` },
  {
    id: 'python-quality',
    name: 'جودة Python',
    group: 'كود',
    desc: 'أنماط مضادة، أنواع، اختبارات pytest.',
    prompt: `اكتب Python نظيفاً: type hints، dataclasses حيث تلزم، لا mutable defaults، context managers، استثناءات محددة، فصل I/O عن المنطق، واختبارات pytest مع fixtures وmocking للشبكة. افحص الأنماط المضادة الشائعة واذكر البديل. شغّل ruff/mypy إن توفرا.` },
  {
    id: 'sql-review',
    name: 'PostgreSQL/Supabase',
    group: 'كود',
    desc: 'مراجعة استعلامات، فهارس، RLS، صلاحيات.',
    prompt: `راجع SQL/Postgres: استعلامات N+1، فهارس ناقصة أو زائدة، EXPLAIN ANALYZE، JSONB وفهارس GIN، أمان RLS (اختبار مستخدمين اثنين)، صلاحيات الأدوار، دوال SECURITY DEFINER، وtransactions. لـSupabase: سياسات RLS لكل جدول، storage policies، وauth.uid() في كل شرط. اكتب اختبار pgTAP يثبت العزل.` },
  {
    id: 'web-testing',
    name: 'اختبار واجهات (Playwright)',
    group: 'كود',
    desc: 'تحقق بصري ووظيفي حقيقي قبل التسليم.',
    prompt: `اختبر الواجهة بمتصفح حقيقي: افتح الصفحة، التقط console/pageerror/network، جرّب المسار الأساسي والمسارات الفاشلة، تحقق من الجوال (390px) والديسكتوب، ومن الوصولية (تباين، تسميات، تنقل بلوحة المفاتيح). أرفق سكرينشوتس ولقطات console. لا تقل «يبدو جيداً» بلا دليل.` },
  {
    id: 'linux-triage',
    name: 'تشخيص Linux',
    group: 'تشغيل',
    desc: 'systemd، شبكة، صلاحيات، SELinux، موارد.',
    prompt: `شخّص Debian/Kali: journalctl -u، systemctl status، dmesg، ss -tulpn، ip route، df/inodes، free، top/pidstat، strace، lsof، والصلاحيات وSELinux/AppArmor. ابدأ بالأعراض ثم الأدلة، افترض سبباً واحداً واختبره، ووثّق كل أمر ومخرجه. اقترح إصلاحاً دائماً لا مؤقتاً.` },
  {
    id: 'sandbox',
    name: 'عزل وتجربة آمنة',
    group: 'تشغيل',
    desc: 'تشغيل كود غير موثوق داخل VM/حاوية معزولة.',
    prompt: `قبل تشغيل أي كود غير موثوق: حدّد العزل (VM بلا شبكة، حاوية --network none --read-only --cap-drop ALL، أو مستخدم منفصل)، خذ snapshot، افصل المجلدات المضيفة، وسجّل كل شيء. اذكر كيف تستعيد الحالة بعد التجربة. لا تشغّل عينات حقيقية على المضيف.` },
  {
    id: 'planning',
    name: 'تخطيط المهام',
    group: 'تخطيط',
    desc: 'خطة قابلة للتنفيذ بخطوات واختبارات ومعايير نجاح.',
    prompt: `حوّل الطلب إلى خطة: الهدف القابل للقياس، الافتراضات، الخطوات المرتبة بتبعياتها، لكل خطوة المخرج ومعيار القبول، المخاطر وخطة الرجوع، والوقت التقديري. لا تبدأ التنفيذ قبل تثبيت الخطة، وحدّثها عند كل اكتشاف.` },
  {
    id: 'brainstorm',
    name: 'استكشاف حلول',
    group: 'تخطيط',
    desc: 'خيارات متعددة بمقايضات قبل الاختيار.',
    prompt: `اطرح 3 خيارات مختلفة جوهرياً (لا تنويعات سطحية)، لكل خيار: الفكرة، ما ينجح فيه، ما يفشل فيه، الكلفة، والمخاطر. قارن بجدول، ثم أوصِ بواحد مع سبب واضح وشروط تراجعه. لا تبدأ بالتنفيذ قبل اختيار المستخدم.` },
  {
    id: 'docs-first',
    name: 'التوثيق أولاً',
    group: 'تخطيط',
    desc: 'لا تعتمد على الذاكرة: تحقق من أحدث توثيق/إصدار.',
    prompt: `قبل أي كود يعتمد على مكتبة أو API: تحقق من الإصدار الحالي والتوقيع الفعلي (docs/changelog/types). لا تعتمد على ذاكرة قديمة. إذا لم تتأكد، قل ذلك واذكر ما تحتاج التحقق منه. اذكر رقم الإصدار الذي بنيت عليه الإجابة.` },
];

/* ترتيب المجموعات الموحّد: اليدوية أولاً ثم مكتبة OpenCode */
const GROUP_ORDER = ['أمن', 'كود', 'تشغيل', 'تخطيط', 'تصميم', 'وثائق', 'بيانات', 'نشر', 'تداول', 'تسويق', 'ذكاء اصطناعي'];

export const SKILLS = [...CORE_SKILLS, ...OC_SKILLS].sort(
  (a, b) => GROUP_ORDER.indexOf(a.group) - GROUP_ORDER.indexOf(b.group) || a.name.localeCompare(b.name)
);

export const SKILL_GROUPS = GROUP_ORDER;
