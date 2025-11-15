# 🚀 تفعيل Cloud CDN لتحسين أداء Unity WebGL

## الهدف
تفعيل Cloud CDN على GCS bucket لتحسين سرعة تحميل ملفات Unity WebGL بشكل كبير.

## 📋 الخطوات

### الطريقة 1: من Google Cloud Console (الأسهل)

#### الخطوة 1: إنشاء Backend Bucket

1. اذهب إلى **Cloud Load Balancing** → **Backend services**
2. اضغط **Create Backend Service**
3. اختر **Backend type**: **Cloud Storage bucket**
4. **Name**: `metavr-assets-backend`
5. **Bucket**: اختر `metavr-assets`
6. اضغط **Create**

#### الخطوة 2: إنشاء URL Map

1. اذهب إلى **Cloud Load Balancing** → **URL maps**
2. اضغط **Create URL Map**
3. **Name**: `metavr-assets-map`
4. **Default backend**: اختر `metavr-assets-backend`
5. اضغط **Create**

#### الخطوة 3: إنشاء HTTP(S) Proxy

1. اذهب إلى **Cloud Load Balancing** → **Proxies**
2. اضغط **Create Proxy**
3. **Name**: `metavr-assets-proxy`
4. **Type**: **HTTP(S)**
5. **URL map**: اختر `metavr-assets-map`
6. اضغط **Create**

#### الخطوة 4: إنشاء Forwarding Rule

1. اذهب إلى **Cloud Load Balancing** → **Forwarding rules**
2. اضغط **Create Forwarding Rule**
3. **Name**: `metavr-assets-forwarding-rule`
4. **Type**: **HTTP**
5. **IP version**: **IPv4**
6. **Target proxy**: اختر `metavr-assets-proxy`
7. **Port**: **80**
8. اضغط **Create**

#### الخطوة 5: تفعيل Cloud CDN

1. اذهب إلى **Cloud Load Balancing** → **Backend services**
2. اختر `metavr-assets-backend`
3. اضغط **Edit**
4. في قسم **Cloud CDN**:
   - ✅ **Enable Cloud CDN**
   - **Cache mode**: **CACHE_ALL_STATIC**
   - **Default TTL**: **3600** (1 hour)
   - **Max TTL**: **86400** (1 day)
5. اضغط **Save**

### الطريقة 2: من Command Line

```bash
# Set variables
PROJECT_ID=meta-478212
BUCKET_NAME=metavr-assets
BACKEND_NAME=metavr-assets-backend
URL_MAP_NAME=metavr-assets-map
PROXY_NAME=metavr-assets-proxy
FORWARDING_RULE_NAME=metavr-assets-forwarding-rule

# 1. Create backend bucket
gcloud compute backend-buckets create $BACKEND_NAME \
  --gcs-bucket-name=$BUCKET_NAME \
  --project=$PROJECT_ID

# 2. Enable Cloud CDN on backend
gcloud compute backend-buckets update $BACKEND_NAME \
  --enable-cdn \
  --project=$PROJECT_ID

# 3. Create URL map
gcloud compute url-maps create $URL_MAP_NAME \
  --default-backend-bucket=$BACKEND_NAME \
  --project=$PROJECT_ID

# 4. Create HTTP proxy
gcloud compute target-http-proxies create $PROXY_NAME \
  --url-map=$URL_MAP_NAME \
  --project=$PROJECT_ID

# 5. Create forwarding rule (requires static IP)
# First, reserve a static IP
gcloud compute addresses create metavr-assets-ip \
  --global \
  --project=$PROJECT_ID

# Get the IP address
IP_ADDRESS=$(gcloud compute addresses describe metavr-assets-ip \
  --global \
  --format="value(address)" \
  --project=$PROJECT_ID)

# Create forwarding rule
gcloud compute forwarding-rules create $FORWARDING_RULE_NAME \
  --global \
  --target-http-proxy=$PROXY_NAME \
  --address=$IP_ADDRESS \
  --ports=80 \
  --project=$PROJECT_ID

echo "✅ Cloud CDN enabled!"
echo "🌐 CDN URL: http://$IP_ADDRESS/unity/npc/"
echo ""
echo "📝 Update nginx.conf redirect to use CDN URL instead of direct GCS URL"
```

## 🔄 تحديث nginx.conf لاستخدام CDN

بعد تفعيل CDN، يمكنك تحديث nginx.conf لاستخدام CDN URL بدلاً من GCS المباشر:

```nginx
location /unity/npc/ {
    # Use CDN URL instead of direct GCS
    rewrite ^/unity/npc/(.*)$ http://YOUR-STATIC-IP/unity/npc/$1 redirect;
}
```

**أو** استخدم custom domain مع CDN (موصى به):

```nginx
location /unity/npc/ {
    # Use custom domain with CDN
    rewrite ^/unity/npc/(.*)$ https://cdn.yourdomain.com/unity/npc/$1 redirect;
}
```

## ⚡ تحسينات الأداء

### 1. Cache Headers في GCS

تأكد من أن الملفات في GCS لديها cache headers صحيحة:

```bash
# Set cache control on all Unity files
gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  gs://metavr-assets/unity/npc/Build/*.gz

gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  gs://metavr-assets/unity/npc/Build/*.js

gsutil -m setmeta -h "Cache-Control:public, max-age=31536000, immutable" \
  gs://metavr-assets/unity/npc/TemplateData/*
```

### 2. CDN Cache Settings

في Backend Bucket settings:
- **Cache mode**: `CACHE_ALL_STATIC`
- **Default TTL**: `3600` (1 hour)
- **Max TTL**: `86400` (1 day)
- **Client TTL**: `3600` (1 hour)

### 3. Compression

تأكد من أن الملفات مضغوطة:
- ✅ `.data.gz` - مضغوط
- ✅ `.wasm.gz` - مضغوط
- ✅ `.js.gz` - مضغوط

CDN سيخدم الملفات المضغوطة تلقائيًا.

## 📊 النتائج المتوقعة

### بدون CDN
- Latency: 200-500ms (حسب الموقع)
- Throughput: محدود بـ GCS backend
- Cost: $0.12/GB egress

### مع CDN
- Latency: 20-50ms (من أقرب edge location)
- Throughput: أعلى بكثير
- Cost: $0.08/GB egress (أرخص 33%)
- Cache hits: مجاني (ملفات مخزنة في CDN)

## 🔍 التحقق من CDN

### 1. تحقق من Cache Headers

```bash
curl -I https://storage.googleapis.com/metavr-assets/unity/npc/Build/yes.data.gz
```

يجب أن ترى:
- `X-Cache: HIT` (ملف في CDN cache)
- `X-Cache: MISS` (ملف غير موجود في cache، سيتم تخزينه)

### 2. تحقق من السرعة

استخدم أدوات مثل:
- [WebPageTest](https://www.webpagetest.org/)
- [GTmetrix](https://gtmetrix.com/)
- Chrome DevTools → Network tab

### 3. مراقبة CDN

في Google Cloud Console:
- **Cloud CDN** → **Cache invalidation**
- **Cloud CDN** → **Metrics** (لرؤية cache hit ratio)

## 🎯 أفضل الممارسات

1. **استخدم Split WebGL Build** في Unity:
   - Player Settings → Publishing Settings → Split WebGL Build → ON
   - يقلل initial load time

2. **Lazy Loading**:
   - حمّل الملفات الكبيرة عند الحاجة فقط
   - استخدم preload للملفات المهمة

3. **Cache Strategy**:
   - ملفات Unity: `immutable` (لا تتغير)
   - HTML: `no-cache` (يتم تحديثه)

4. **Monitor Performance**:
   - راقب CDN cache hit ratio
   - راقب latency من مواقع مختلفة

## 💰 التكاليف

### Cloud CDN Pricing
- **Cache egress**: $0.08/GB (أرخص من GCS المباشر)
- **Cache fill**: $0.12/GB (عند cache miss)
- **Cache invalidation**: $0.05/invalidation

### التوفير المتوقع
- **بدون CDN**: $0.12/GB × 100GB = $12
- **مع CDN** (80% cache hit): $0.08/GB × 20GB + $0.12/GB × 80GB = $11.20
- **مع CDN** (95% cache hit): $0.08/GB × 5GB + $0.12/GB × 95GB = $11.80

**ملاحظة**: CDN يوفر تكاليف أقل مع زيادة cache hit ratio.

## 🆘 Troubleshooting

### CDN لا يعمل

1. تحقق من أن Backend Bucket مفعّل CDN:
   ```bash
   gcloud compute backend-buckets describe $BACKEND_NAME
   ```

2. تحقق من Forwarding Rule:
   ```bash
   gcloud compute forwarding-rules describe $FORWARDING_RULE_NAME --global
   ```

3. تحقق من الـ IP:
   ```bash
   gcloud compute addresses list --global
   ```

### Cache لا يعمل

1. تحقق من Cache-Control headers:
   ```bash
   curl -I https://storage.googleapis.com/metavr-assets/unity/npc/Build/yes.data.gz
   ```

2. تحقق من CDN settings:
   - Cache mode يجب أن يكون `CACHE_ALL_STATIC`
   - TTL يجب أن يكون > 0

### Invalidations

لإزالة ملفات من CDN cache:

```bash
# Invalidate specific file
gcloud compute url-maps invalidate-cdn-cache $URL_MAP_NAME \
  --path="/unity/npc/Build/yes.data.gz"

# Invalidate all Unity files
gcloud compute url-maps invalidate-cdn-cache $URL_MAP_NAME \
  --path="/unity/npc/*"
```

## ✅ Checklist

- [ ] Backend Bucket تم إنشاؤه
- [ ] Cloud CDN مفعّل على Backend Bucket
- [ ] URL Map تم إنشاؤه
- [ ] HTTP Proxy تم إنشاؤه
- [ ] Forwarding Rule تم إنشاؤه
- [ ] Static IP محجوز
- [ ] Cache headers مضبوطة على الملفات
- [ ] nginx.conf محدّث (اختياري)
- [ ] تم اختبار CDN
- [ ] تم مراقبة الأداء

---

**ملاحظة**: Cloud CDN يتطلب Load Balancer، مما يعني تكلفة إضافية (~$18/month للـ Load Balancer). إذا كان الميزانية محدودة، يمكنك استخدام GCS URLs مباشرة (أسرع من Cloud Run لكن أبطأ من CDN).

