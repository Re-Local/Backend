// routes/users.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User'); // ✅ 모델 존재해야 합니다

/** -------------------- 유틸 -------------------- */
const pick = (obj, keys) =>
  keys.reduce((acc, k) => (obj[k] !== undefined ? (acc[k] = obj[k], acc) : acc), {});

/** -------------------- 핑 -------------------- */
/**
 * @openapi
 * /api/users/ping:
 *   get:
 *     tags: [Users]
 *     summary: Users 라우터 헬스체크
 *     responses:
 *       200:
 *         description: OK
 */
router.get('/ping', (req, res) => {
  res.json({ ok: true, route: 'users' });
});

/** -------------------- 목록 -------------------- */
/**
 * @openapi
 * /api/users:
 *   get:
 *     tags: [Users]
 *     summary: 사용자 목록 조회 (페이징/검색)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *         description: 이름/이메일 부분검색
 *     responses:
 *       200:
 *         description: 목록
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/User'
 *                 page: { type: integer }
 *                 limit: { type: integer }
 *                 total: { type: integer }
 */
router.get('/', async (req, res, next) => {
  try {
    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const q = (req.query.q || '').trim();

    const cond = { deletedAt: { $exists: false } };
    if (q) {
      cond.$or = [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } },
        { nickname: { $regex: q, $options: 'i' } },
      ];
    }

    const [items, total] = await Promise.all([
      User.find(cond).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      User.countDocuments(cond),
    ]);

    res.json({ items, page, limit, total });
  } catch (e) { next(e); }
});

/** -------------------- 생성/업서트 -------------------- */
/**
 * @openapi
 * /api/users:
 *   post:
 *     tags: [Users]
 *     summary: 사용자 생성/업서트 (이메일 또는 소셜 provider 기준)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email: { type: string, format: email }
 *               name: { type: string }
 *               nickname: { type: string }
 *               profileImageUrl: { type: string }
 *               provider: { type: string, enum: [kakao, google, apple] }
 *               providerUserId: { type: string }
 *     responses:
 *       201:
 *         description: 생성/업서트 결과
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 */
router.post('/', async (req, res, next) => {
  try {
    const { email, name, nickname, profileImageUrl, provider, providerUserId } = req.body;

    if (!email && !(provider && providerUserId)) {
      return res.status(400).json({ error: 'email 또는 (provider + providerUserId) 중 하나는 필요합니다.' });
    }

    const query = email
      ? { email }
      : { providers: { $elemMatch: { provider, providerUserId } } };

    const baseSet = pick({ email, name, nickname, profileImageUrl }, ['email', 'name', 'nickname', 'profileImageUrl']);
    const update = {
      $setOnInsert: { role: 'user', status: 'active' },
      $set: baseSet,
      ...(provider && providerUserId
        ? { $addToSet: { providers: { provider, providerUserId, connectedAt: new Date() } } }
        : {}),
    };

    const user = await User.findOneAndUpdate(query, update, {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true,
    }).lean();

    res.status(201).json(user);
  } catch (e) { next(e); }
});

/** -------------------- 단건 조회 -------------------- */
/**
 * @openapi
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: 사용자 단건 조회
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/User' }
 *       404: { description: Not Found }
 */
router.get('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'invalid id' });
    const user = await User.findById(req.params.id).lean();
    if (!user || user.deletedAt) return res.status(404).json({ error: 'not found' });
    res.json(user);
  } catch (e) { next(e); }
});

/** -------------------- 수정 -------------------- */
/**
 * @openapi
 * /api/users/{id}:
 *   patch:
 *     tags: [Users]
 *     summary: 사용자 정보 수정
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name: { type: string }
 *               nickname: { type: string }
 *               profileImageUrl: { type: string }
 *               locale: { type: string }
 *               timeZone: { type: string }
 *               status: { type: string, enum: [active, inactive, blocked, deleted] }
 *               region:
 *                 type: object
 *                 properties:
 *                   city: { type: string }
 *                   district: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *       404:
 *         description: Not Found
 */
router.patch('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'invalid id' });

    const allowed = ['name', 'nickname', 'profileImageUrl', 'locale', 'timeZone', 'status', 'region'];
    const update = pick(req.body || {}, allowed);

    const user = await User.findByIdAndUpdate(req.params.id, update, { new: true }).lean();
    if (!user) return res.status(404).json({ error: 'not found' });
    res.json(user);
  } catch (e) { next(e); }
});

/** -------------------- 삭제(소프트) -------------------- */
/**
 * @openapi
 * /api/users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: 사용자 소프트 삭제
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       204: { description: No Content }
 *       404: { description: Not Found }
 */
router.delete('/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ error: 'invalid id' });

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { status: 'deleted', deletedAt: new Date() },
      { new: true }
    ).lean();

    if (!user) return res.status(404).json({ error: 'not found' });
    return res.status(204).send();
  } catch (e) { next(e); }
});

module.exports = router;
