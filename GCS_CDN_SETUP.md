# 🚀 إعداد Google Cloud Storage + CDN لملفات Unity WebGL

## الهدف
تحميل ملفات Unity WebGL الكبيرة (50-100 MB) من GCS + Cloud CDN بدلاً من Cloud Run لتحسين الأداء وتقليل التكاليف.

## 📋 الخطوات

### الخطوة 1: إنشاء GCS Bucket

```bash
# Set variables
export GCS_BUCKET_NAME=metavr-assets
export PROJECT_ID=meta-478212

# Create bucket
gsutil mb -p $PROJECT_ID -c STANDARD -l us-central1 gs://$GCS_BUCKET_NAME/
```

أو من Google Cloud Console:
1. اذهب إلى **Storage** → **Buckets**
2. اضغط **Create bucket**
3. الاسم: `metavr-assets`
4. المنطقة: `us-central1`
5. Access control: **Uniform**

### الخطوة 2: رفع ملفات Unity

#### الطريقة 1: استخدام Script (موصى به)

```bash
# Set bucket name
export GCS_BUCKET_NAME=metavr-assets

# Run upload script
./upload-unity-to-gcs.sh
```

#### الطريقة 2: يدويًا

```bash
# Upload Build directory
gsutil -m cp -r vite-project/public/unity/npc/Build gs://metavr-assets/unity/npc/

# Set correct metadata for gzipped files
gsutil -h "Content-Encoding:gzip" -h "Content-Type:application/octet-stream" \
       cp vite-project/public/unity/npc/Build/yes.data.gz \
       gs://metavr-assets/unity/npc/Build/yes.data.gz

gsutil -h "Content-Encoding:gzip" -h "Content-Type:application/wasm" \
       cp vite-project/public/unity/npc/Build/yes.wasm.gz \
       gs://metavr-assets/unity/npc/Build/yes.wasm.gz
```

### الخطوة 3: تفعيل Public Access

```bash
# Make bucket publicly readable
gsutil iam ch allUsers:objectViewer gs://metavr-assets
```

أو من Console:
1. افتح الباكت `metavr-assets`
2. اذهب إلى **Permissions**
3. اضغط **Grant Access**
4. Principal: `allUsers`
5. Role: **Storage Object Viewer**
6. Save

### الخطوة 4: تفعيل Cloud CDN

#### الطريقة 1: من Console (أسهل)

1. اذهب إلى **Cloud CDN** في Console
2. اضغط **Create Origin**
3. اختر **Cloud Storage bucket**
4. اختر الباكت: `metavr-assets`
5. اضغط **Create**
6. بعد الإنشاء، اضغط **Enable CDN** على الباكت

#### الطريقة 2: من Command Line

```bash
# Create backend bucket
gcloud compute backend-buckets create metavr-assets-backend \
  --gcs-bucket-name=metavr-assets

# Create URL map
gcloud compute url-maps create metavr-assets-map \
  --default-backend-bucket=metavr-assets-backend

# Create HTTP(S) proxy
gcloud compute target-http-proxies create metavr-assets-proxy \
  --url-map=metavr-assets-map

# Create forwarding rule (for HTTP)
gcloud compute forwarding-rules create metavr-assets-forwarding-rule \
  --global \
  --target-http-proxy=metavr-assets-proxy \
  --ports=80

# Enable CDN
gcloud compute backend-buckets update metavr-assets-backend \
  --enable-cdn
```

**ملاحظة**: Cloud CDN يتطلب Load Balancer. إذا كنت تريد CDN فقط بدون Load Balancer، يمكنك استخدام GCS URLs مباشرة (أسرع وأرخص).

### الخطوة 5: تحديث nginx.conf

تم تحديث `nginx.conf` بالفعل لإضافة redirect rule:

```nginx
location /unity/npc/ {
    rewrite ^/unity/npc/(.*)$ https://storage.googleapis.com/metavr-assets/unity/npc/$1 redirect;
}
```

### الخطوة 6: Deploy

```bash
# Deploy to Cloud Run
gcloud run deploy metavr-frontend --source .
```

أو من GitHub Actions (سيتم تلقائيًا عند push).

## ✅ التحقق

### 1. تحقق من الملفات في GCS

```bash
# List files
gsutil ls -lh gs://metavr-assets/unity/npc/Build/

# Test public access
curl -I https://storage.googleapis.com/metavr-assets/unity/npc/Build/yes.data.gz
```

يجب أن ترى:
- `HTTP/1.1 200 OK`
- `Content-Encoding: gzip`
- `Content-Type: application/octet-stream`

### 2. تحقق من Redirect

```bash
# Test redirect from Cloud Run
curl -I https://YOUR-SERVICE.run.app/unity/npc/Build/yes.data.gz
```

يجب أن ترى:
- `HTTP/1.1 302 Found` (redirect)
- `Location: https://storage.googleapis.com/metavr-assets/unity/npc/Build/yes.data.gz`

### 3. تحقق في المتصفح

1. افتح صفحة Unity في المتصفح
2. افتح **DevTools** → **Network**
3. ابحث عن طلبات `yes.data.gz` أو `yes.wasm.gz`
4. يجب أن ترى:
   - Request URL: `https://YOUR-SERVICE.run.app/unity/npc/Build/yes.data.gz`
   - Final URL: `https://storage.googleapis.com/metavr-assets/unity/npc/Build/yes.data.gz`
   - Status: `200 OK`

## 💰 التكاليف

### بدون CDN (GCS مباشرة)
- Storage: ~$0.020/GB/month (60MB = $0.0012/month)
- Egress: $0.12/GB بعد أول 1GB مجانًا

### مع Cloud CDN
- Storage: نفس السعر
- Egress: $0.08/GB (أرخص بـ 33%)
- Cache hits: مجاني (ملفات مخزنة في CDN)

## 🎯 المميزات

✅ **سرعة عالية**: CDN يوزع الملفات من أقرب موقع جغرافي  
✅ **تقليل التكاليف**: أرخص من Cloud Run egress  
✅ **تقليل حجم Container**: لا حاجة لرفع ملفات Unity في Docker image  
✅ **موثوقية**: GCS + CDN أكثر استقرارًا من Cloud Run للملفات الكبيرة  
✅ **لا timeouts**: Cloud Run لا يضطر لخدمة ملفات 50-100 MB  

## 🔧 Troubleshooting

### الملفات لا تظهر في GCS

```bash
# Check if files exist
gsutil ls -r gs://metavr-assets/unity/npc/

# Check permissions
gsutil iam get gs://metavr-assets
```

### Redirect لا يعمل

1. تحقق من nginx.conf تم نسخه بشكل صحيح
2. تحقق من Cloud Run logs:
   ```bash
   gcloud run services logs read metavr-frontend --region us-central1
   ```

### CORS Errors

```bash
# Update CORS configuration
gsutil cors set cors.json gs://metavr-assets
```

## 📝 ملاحظات

- **Bucket name**: يمكنك تغيير `metavr-assets` إلى أي اسم تريده
- **Region**: استخدم نفس region الخاص بـ Cloud Run (`us-central1`) للأداء الأفضل
- **CDN**: اختياري - GCS URLs تعمل بشكل ممتاز بدون CDN أيضًا

