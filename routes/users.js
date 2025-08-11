const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');            // ✅ 추가
const User = require('../models/User');

// 유틸
const pick = (obj, keys) =>
  keys.reduce((acc, k) => (obj[k] !== undefined ? (acc[k] = obj[k], acc) : acc), {});

const toPublicUser = (u) => {
  if (!u) return null;
  const { passwordHash, __v, ...rest } = u;
  return rest;
};

const parseTags = (s) =>
  (s || '')
    .split(/[,#\s]+/)          // 쉼표/공백/# 구분
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => (t.startsWith('#') ? t : `#${t}`));

/** -------------------- 회원가입 -------------------- */
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
 *             required: [name, gender, userid, password, country, language, age, interestTag]
 *             properties:
 *               name: { type: string }
 *               gender: { type: integer, enum: [0,1] }
 *               userid: { type: string }
 *               password: { type: string, format: password }
 *               country: { type: string }
 *               language: { type: string }
 *               nationality: { type: string }
 *               age: { type: integer }
 *               interestTag: { type: string, description: "예: #festival,#food" }
 *     responses:
 *       201: { description: 가입 성공 }
 *       409: { description: 이미 존재하는 userid }
 *       400: { description: 유효성 오류 }
 */
router.post('/signup', async (req, res, next) => {
  try {
    const { name, gender, userid, password, country, language, nationality, age, interestTag } = req.body || {};

    if (!userid || !password) {
      return res.status(400).json({ error: 'userid와 password는 필수입니다.' });
    }

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
      nationality,
      age,
      interestTags: parseTags(interestTag),
      status: 'active',
    });

    return res.status(201).json(toPublicUser(user.toObject()));
  } catch (e) {
    next(e);
  }
});

/** -------------------- 로그인 (POST 권장) -------------------- */
/**
 * @openapi
 * /api/users/login:
 *   post:
 *     tags: [Users]
 *     summary: 로그인
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [userid, password]
 *             properties:
 *               userid: { type: string }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: 로그인 성공
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ok: { type: boolean }
 *                 user: { $ref: '#/components/schemas/User' }
 *       401: { description: 불일치 }
 */
router.post('/login', async (req, res, next) => {
  try {
    const { userid, password } = req.body || {};
    const user = await User.findOne({ userid }).lean();
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: '아이디 또는 비밀번호가 올바르지 않습니다.' });

    return res.json({ ok: true, user: toPublicUser(user) });
  } catch (e) { next(e); }
});
