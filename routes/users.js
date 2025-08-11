// routes/users.js
const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User'); // ← 스키마가 passwordHash, interestTags 등을 포함해야 함

/* -------------------- utils -------------------- */
const toPublicUser = (u) => {
  if (!u) return null;
  const { passwordHash, __v, ...rest } = u;
  return rest;
};

const parseTags = (raw) => {
  if (Array.isArray(raw)) return raw.filter(Boolean).map(t => (t.startsWith('#') ? t : `#${t}`));
  return String(raw || '')
    .split(/[,#\s]+/)
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => (t.startsWith('#') ? t : `#${t}`));
};



/* -------------------- 전체 조회 -------------------- */
// routes/users.js 중 일부

/**
 * @openapi
 * /api/users/all:
 *   get:
 *     tags: [Users]
 *     summary: 모든 사용자 조회 (비밀번호는 반환하지 않음)
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 items:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       name:        { type: string }
 *                       gender:      { type: integer, enum: [0,1] }
 *                       userid:      { type: string }
 *                       country:     { type: string }
 *                       language:    { type: string }
 *                       nationality: { type: string }
 *                       age:         { type: integer }
 *                       interestTag: { type: string, description: "#festival,#food" }
 *                 total: { type: integer }
 */
router.get('/all', async (req, res, next) => {
    try {
      const cond = { deletedAt: { $exists: false } };
      const users = await User.find(cond).lean();
  
      const items = users.map(u => ({
        name:        u.name ?? '',
        gender:      u.gender ?? null,
        userid:      u.userid,
        country:     u.country ?? '',
        language:    u.language ?? '',
        nationality: u.nationality ?? '',
        age:         typeof u.age === 'number' ? u.age : null,
        // 배열로 저장된 interestTags를 요청 형식에 맞춰 문자열로 변환
        interestTag: Array.isArray(u.interestTags) ? u.interestTags.join(',') : (u.interestTag || ''),
        // password/passwordHash는 절대 반환하지 않음
      }));
  
      res.json({ items, total: items.length });
    } catch (e) { next(e); }
  });

/* -------------------- 회원가입 -------------------- */
/**
 * @openapi
 * /api/users/signup:
 *   post:
 *     tags: [Users]
 *     summary: 회원가입
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, gender, userid, password, country, language, nationality, age, interestTag]
 *             properties:
 *               name:         { type: string,  example: "윤지" }
 *               gender:       { type: integer, enum: [0,1], example: 1 }   # 0: 남자, 1: 여자
 *               userid:       { type: string,  example: "yunji2002" }
 *               password:     { type: string,  format: password, example: "pw1234!" }
 *               country:      { type: string,  example: "Korea" }
 *               language:     { type: string,  example: "Korean" }
 *               nationality:  { type: string,  example: "Korean" }
 *               age:          { type: integer, example: 23 }
 *               interestTag:  { type: string,  example: "#festival,#food" }
 *           examples:
 *             기본:
 *               summary: 기본 회원가입 예시
 *               value:
 *                 name: "윤지"
 *                 gender: 1
 *                 userid: "yunji2002"
 *                 password: "pw1234!"
 *                 country: "Korea"
 *                 language: "Korean"
 *                 age: 23
 *                 interestTag: "#festival,#food"
 *     responses:
 *       201:
 *         description: 가입 성공
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       409: { description: 이미 존재하는 userid }
 *       400: { description: 유효성 오류 }
 */

 
router.post('/signup', async (req, res, next) => {
  try {
    const { name, gender, userid, password, country, language, nationality, age, interestTag } = req.body || {};

    if (!userid || !password) return res.status(400).json({ error: 'userid와 password는 필수입니다.' });
    if (!(gender === 0 || gender === 1)) return res.status(400).json({ error: 'gender는 0 또는 1이어야 합니다.' });

    const exists = await User.findOne({ userid }).lean();
    if (exists) return res.status(409).json({ error: '이미 존재하는 userid 입니다.' });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await User.create({
      userid,
      passwordHash,
      name,
      gender,
      country,
      language,
    
      age,
      interestTags: parseTags(interestTag),
      status: 'active',
    });

    res.status(201).json(toPublicUser(user.toObject()));
  } catch (e) { next(e); }
});

/* -------------------- 로그인(POST) -------------------- */
/**
 * @openapi
 * /api/users/login:
 *   post:
 *     tags: [Users]
 *     summary: 로그인 (POST)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userid, password]
 *             properties:
 *               userid:   "yunji2002"
 *               password: "yunjiPassword1234"
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok:   { type: boolean }
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: 불일치 }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { userid, password } = req.body || {};
    const user = await User.findOne({ userid }).lean();
    if (!user || !user.passwordHash) return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });

    res.json({ ok: true, user: toPublicUser(user) });
  } catch (e) { next(e); }
});

module.exports = router;
