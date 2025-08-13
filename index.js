import express from 'express';
import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();
const app = express();

// /api/movies 라우트
app.get('/api/movies', async (req, res) => {
    try {
      const { movieNm, openStartDt, openEndDt } = req.query;
      const params = new URLSearchParams({
        key: process.env.KOBIS_API_KEY,
        movieNm: movieNm || '',
        openStartDt: openStartDt || '',
        openEndDt: openEndDt || '',
      });
  
      const url = `http://www.kobis.or.kr/kobisopenapi/webservice/rest/movie/searchMovieList.json?${params}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
  
      const movies = data.movieListResult.movieList.map(m => ({
        code: m.movieCd,
        name: m.movieNm,
        nameEn: m.movieNmEn,
        openDate: m.openDt,
        genre: m.genreAlt,
        directors: m.directors?.map(d => d.peopleNm).join(', ') || '',
        nations: m.nationAlt,
      }));
  
      res.json(movies);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  app.listen(4000, () => console.log('Server running on port 4000'));