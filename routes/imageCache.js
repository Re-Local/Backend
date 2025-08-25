// routes/imageCache.js
const express = require('express');
const { S3Client, HeadObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
const fetch = global.fetch || ((...a) => import('node-fetch').then(({default:f}) => f(...a)));
const router = express.Router();

const s3 = new S3Client({ region: process.env.AWS_REGION });
const BUCKET = process.env.S3_BUCKET;

router.get('/', async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('Missing url');

  const key = `img/${crypto.createHash('sha1').update(url).digest('hex')}`;
  try {
    // 이미 있으면 S3 서명없는 공개 URL로 리다이렉트(또는 프록시)
    await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return res.redirect(302, `${process.env.CDN_BASE}/${key}`); // CloudFront 등
  } catch {}

  // 없으면 가져와서 업로드
  const r = await fetch(url, { redirect: 'follow', headers: { 'User-Agent': 'Mozilla/5.0' } });
  if (!r.ok) return res.status(r.status).send(`Upstream ${r.status}`);
  const buf = Buffer.from(await r.arrayBuffer());
  const ct = r.headers.get('content-type') || 'image/jpeg';

  await s3.send(new PutObjectCommand({
    Bucket: BUCKET, Key: key, Body: buf, ContentType: ct, ACL: 'public-read'
  }));

  return res.redirect(302, `${process.env.CDN_BASE}/${key}`);
});

module.exports = router;
